/**
 * Gallery Item Template: layouts, item blocks and the Interactivity layer.
 *
 * The item template resolves its items on every request, and the front end
 * replaces them in place, so everything here is asserted against the rendered
 * page - what the editor stored proves almost nothing about either.
 */
import { expect, test } from '@wordpress/e2e-test-utils-playwright';
import { createRegularPosts } from '../utils/create-posts';
import { getEditorCanvas } from '../utils/editor-canvas';
import { getFixturePath } from '../utils/fixture-path';
import { getLoopParam } from '../utils/loop-query-params';
import { openPublishedPage } from '../utils/open-published-page';
import { getPluginSlug } from '../utils/plugin-slug';

const PER_PAGE = 3;
const POSTS_COUNT = 6;
const IMAGES_COUNT = 3;
const COLUMNS = 4;
const GAP = '2rem';
const CATEGORIES = ['Template Nature', 'Template City'];
const MANAGER_TITLE = 'Manager edited title';
const MANAGER_CATEGORY = 'Manager Category';

const LIST = 'ul.wp-block-visual-portfolio-item-template';
const ITEM = '.wp-block-visual-portfolio-item-template__item';
const TITLE = '.wp-block-visual-portfolio-item-title';
const LOAD_MORE = '.vp-block-loop-pagination-trigger';

const DEFAULT_ITEM_BLOCKS = [
	{
		name: 'visual-portfolio/item-image',
		attributes: { aspectRatio: '1', clickAction: 'url' },
	},
	{
		name: 'visual-portfolio/item-title',
		attributes: {
			style: { typography: { textAlign: 'center' } },
			isLink: true,
		},
	},
];

/**
 * Build a Gallery Loop around an item template.
 *
 * @param {Object}  [options]             - loop options.
 * @param {Object}  [options.query]       - content source attributes of the loop.
 * @param {number}  [options.perPage]     - items per page.
 * @param {Object}  [options.layout]      - item template attributes.
 * @param {Array}   [options.itemBlocks]  - blocks rendered inside every item.
 * @param {Array}   [options.pagination]  - inner blocks of the pagination block.
 * @param {boolean} [options.withFilter]  - whether to add the filter block.
 * @return {Object} block payload for `editor.insertBlock()`.
 */
function getLoopBlock({
	query,
	perPage = PER_PAGE,
	layout = {},
	itemBlocks = DEFAULT_ITEM_BLOCKS,
	pagination = [],
	withFilter = false,
} = {}) {
	const innerBlocks = [];

	if (withFilter) {
		innerBlocks.push({ name: 'visual-portfolio/loop-filter' });
	}

	innerBlocks.push({
		name: 'visual-portfolio/item-template',
		attributes: layout,
		innerBlocks: itemBlocks,
	});

	if (pagination.length) {
		innerBlocks.push({
			name: 'visual-portfolio/loop-pagination',
			innerBlocks: pagination,
		});
	}

	return {
		name: 'visual-portfolio/loop',
		attributes: {
			baseQuery: { perPage, maxPages: 1 },
			...query,
		},
		innerBlocks,
	};
}

/**
 * Read the filter items the editor fetched into the loop.
 *
 * @param {Array} blocks - editor blocks.
 * @return {Array} filter item blocks.
 */
function getFilterItems(blocks) {
	const loop = blocks.find((block) => 'visual-portfolio/loop' === block.name);
	const filter = loop?.innerBlocks?.find(
		(block) => 'visual-portfolio/loop-filter' === block.name
	);

	return filter?.innerBlocks ?? [];
}

/**
 * How many of the given posts each of the spec's categories holds.
 *
 * Counted from the posts themselves rather than from the term count, which also
 * counts anything a previous run failed to clean up.
 *
 * @param {Object} requestUtils - REST utils.
 * @param {Array}  posts        - posts created by this spec.
 * @return {Promise<Object>} category name to number of posts.
 */
async function getCategorySizes(requestUtils, posts) {
	const sizes = {};

	for (const name of CATEGORIES) {
		const slug = name.toLowerCase().replace(/\s+/g, '-');
		const terms = await requestUtils.rest({
			path: '/wp/v2/categories',
			params: { slug },
		});

		if (terms?.length) {
			sizes[name] = posts.filter((post) =>
				post.categories.includes(terms[0].id)
			).length;
		}
	}

	return sizes;
}

/**
 * Attachments for the images source.
 *
 * @param {Object} requestUtils - REST utils.
 * @param {number} count        - how many images are needed.
 * @return {Promise<Array>} image items of an `imagesQuery`.
 */
async function getGalleryImages(requestUtils, count) {
	const media = await requestUtils.rest({
		path: '/wp/v2/media',
		params: {
			per_page: count,
			media_type: 'image',
			orderby: 'id',
			order: 'desc',
		},
	});

	const images = media.map((item) => ({
		id: item.id,
		title: item.title?.rendered ?? '',
	}));

	// The featured images of the posts above cover this on a normal run, so
	// nothing is uploaded twice. A library that has none is still worth testing.
	while (images.length < count) {
		const uploaded = await requestUtils.uploadMedia(
			getFixturePath('image-800x600.png')
		);

		images.push({ id: uploaded.id, title: uploaded.title?.rendered ?? '' });
	}

	return images;
}

/**
 * Inline positions Masonry wrote on the items.
 *
 * @param {import('@playwright/test').Locator} items - item locator.
 * @return {Promise<Array>} `{ position, top }` of every item.
 */
function getItemPositions(items) {
	return items.evaluateAll((nodes) =>
		nodes.map((node) => ({
			position: window.getComputedStyle(node).position,
			top: Number.parseFloat(node.style.top) || 0,
		}))
	);
}

test.describe('Gallery Item Template', () => {
	// Resetting the site is `global-setup.js`'s job. This spec works with
	// whatever else is published and cleans up only what it created.
	let createdPostIds = [];
	let createdPosts = [];
	let categorySizes = {};
	let images = [];

	// Every loop below queries these posts by id. Other specs leave posts
	// behind, and a source of "all posts" would make both the item counts and
	// the page count depend on them.
	let postsSource = {};

	test.beforeAll(async ({ requestUtils }) => {
		await requestUtils.activatePlugin(getPluginSlug());

		createdPostIds = await createRegularPosts({
			requestUtils,
			count: POSTS_COUNT,
			categories: CATEGORIES,
		});

		createdPosts = await requestUtils.rest({
			path: '/wp/v2/posts',
			params: {
				include: createdPostIds.join(','),
				orderby: 'date',
				order: 'desc',
				per_page: 100,
			},
		});

		categorySizes = await getCategorySizes(requestUtils, createdPosts);
		images = await getGalleryImages(requestUtils, IMAGES_COUNT);

		postsSource = {
			queryType: 'posts',
			postsQuery: {
				source: 'ids',
				ids: createdPostIds,
				order: 'desc',
				orderBy: 'post_date',
			},
		};
	});

	test.afterAll(async ({ requestUtils }) => {
		await requestUtils.deleteAllPages();

		await Promise.all(
			createdPostIds.map((id) =>
				requestUtils.rest({
					path: `/wp/v2/posts/${id}`,
					method: 'DELETE',
					params: { force: true },
				})
			)
		);
	});

	test('grid renders one page of items and carries the layout variables', async ({
		page,
		admin,
		editor,
	}) => {
		await admin.createNewPost({
			title: 'Gallery Item Template - grid',
			postType: 'page',
			showWelcomeGuide: false,
			legacyCanvas: true,
		});

		// The block shape of the `gallery-grid-classic` pattern, over posts.
		await editor.insertBlock(
			getLoopBlock({
				query: postsSource,
				layout: {
					layoutType: 'grid',
					layoutColumnsMode: 'manual',
					layoutColumnCount: COLUMNS,
					style: { spacing: { blockGap: GAP } },
				},
			})
		);
		await editor.publishPost();

		const frontend = await openPublishedPage(page);
		const list = frontend.locator(LIST);
		const items = list.locator(ITEM);

		await expect(list).toHaveClass(/vp-layout-grid/);
		await expect(items).toHaveCount(PER_PAGE);

		// The variables are a public contract - themes and Pro breakpoints
		// override the layout by redeclaring them - so they are read back the
		// way a stylesheet sees them, and checked against what CSS made of them.
		const layout = await list.evaluate((node) => {
			const style = window.getComputedStyle(node);

			return {
				columns: style.getPropertyValue('--vp-layout-columns').trim(),
				gap: style.getPropertyValue('--vp-layout-gap').trim(),
				tracks: style.gridTemplateColumns.split(' ').length,
			};
		});

		expect(layout).toEqual({
			columns: String(COLUMNS),
			gap: GAP,
			tracks: COLUMNS,
		});

		// Every item rendered the blocks of the template with its own data.
		await expect(
			items.locator('.wp-block-visual-portfolio-item-image img')
		).toHaveCount(PER_PAGE);

		const titles = await items.locator(TITLE).allInnerTexts();

		expect(titles).toHaveLength(PER_PAGE);
		titles.forEach((title) => {
			expect(createdPosts.map((post) => post.title.rendered)).toContain(
				title.trim()
			);
		});
	});

	test('paged navigation swaps the items without loading the page again', async ({
		page,
		admin,
		editor,
	}) => {
		await admin.createNewPost({
			title: 'Gallery Item Template - paged',
			postType: 'page',
			showWelcomeGuide: false,
			legacyCanvas: true,
		});

		await editor.insertBlock(
			getLoopBlock({
				query: postsSource,
				pagination: [
					{ name: 'visual-portfolio/loop-pagination-numbers' },
				],
			})
		);
		await editor.publishPost();

		const frontend = await openPublishedPage(page);
		const titles = frontend.locator(`${LIST} ${ITEM} ${TITLE}`);

		await expect(titles).toHaveCount(PER_PAGE);

		const firstPage = await titles.allInnerTexts();

		// The whole point of the Interactivity layer: a reload would answer with
		// the right items too, and would wipe this.
		await frontend.evaluate(() => {
			window.vpNavigationCanary = 'alive';
		});

		await frontend
			.locator('.vp-block-loop-pagination-numbers a[aria-label="Page 2"]')
			.click();

		// The page lives in the parameter of this loop, not in a global one.
		await expect.poll(() => getLoopParam(frontend.url(), 'page')).toBe('2');

		await expect.poll(() => titles.allInnerTexts()).not.toEqual(firstPage);

		expect(await frontend.evaluate(() => window.vpNavigationCanary)).toBe(
			'alive'
		);

		// The region came back from one server render, so the second page holds
		// the rest of the posts rather than a reshuffle of the first.
		const secondPage = await titles.allInnerTexts();

		expect(
			secondPage.filter((title) => firstPage.includes(title))
		).toHaveLength(0);
	});

	test('load more appends the next page instead of replacing it', async ({
		page,
		admin,
		editor,
	}) => {
		await admin.createNewPost({
			title: 'Gallery Item Template - load more',
			postType: 'page',
			showWelcomeGuide: false,
			legacyCanvas: true,
		});

		await editor.insertBlock(
			getLoopBlock({
				query: postsSource,
				pagination: [
					{ name: 'visual-portfolio/loop-pagination-trigger' },
				],
			})
		);
		await editor.publishPost();

		const frontend = await openPublishedPage(page);
		const items = frontend.locator(`${LIST} ${ITEM}`);
		const titles = frontend.locator(`${LIST} ${ITEM} ${TITLE}`);
		const loadMore = frontend.locator(LOAD_MORE);

		await expect(items).toHaveCount(PER_PAGE);

		const firstPage = await titles.allInnerTexts();

		await loadMore.click();

		await expect(items).toHaveCount(POSTS_COUNT);

		// The items already on the page were left where they were - this is the
		// one control that edits the list instead of letting the router replace it.
		expect((await titles.allInnerTexts()).slice(0, PER_PAGE)).toEqual(
			firstPage
		);

		// Everything is loaded, so there is nothing left to click.
		await expect(loadMore).toHaveCount(0);
	});

	test('a filter click narrows the items and marks the category active', async ({
		page,
		admin,
		editor,
	}) => {
		await admin.createNewPost({
			title: 'Gallery Item Template - filter',
			postType: 'page',
			showWelcomeGuide: false,
			legacyCanvas: true,
		});

		await editor.insertBlock(
			getLoopBlock({
				query: postsSource,
				perPage: POSTS_COUNT,
				withFilter: true,
			})
		);

		// The filter fetches its items from the REST API, and publishing before
		// they arrive would save a filter with nothing in it.
		await expect
			.poll(async () => getFilterItems(await editor.getBlocks()).length, {
				timeout: 20000,
			})
			.toBe(CATEGORIES.length + 1);

		await editor.publishPost();

		const frontend = await openPublishedPage(page);
		const items = frontend.locator(`${LIST} ${ITEM}`);

		await expect(items).toHaveCount(POSTS_COUNT);

		const category = frontend
			.locator('a.vp-block-loop-filter-item')
			.first();
		const label = (await category.innerText()).trim();

		expect(categorySizes[label]).toBeGreaterThan(0);
		expect(categorySizes[label]).toBeLessThan(POSTS_COUNT);

		await category.click();

		await expect(
			frontend.locator('span.vp-block-loop-filter-item.is-active')
		).toHaveText(label);

		await expect(items).toHaveCount(categorySizes[label]);
	});

	test('masonry positions the items and again after a load more', async ({
		page,
		admin,
		editor,
	}) => {
		await admin.createNewPost({
			title: 'Gallery Item Template - masonry',
			postType: 'page',
			showWelcomeGuide: false,
			legacyCanvas: true,
		});

		await editor.insertBlock(
			getLoopBlock({
				query: postsSource,
				layout: {
					layoutType: 'masonry',
					layoutColumnsMode: 'manual',
					layoutColumnCount: 2,
				},
				pagination: [
					{ name: 'visual-portfolio/loop-pagination-trigger' },
				],
			})
		);
		await editor.publishPost();

		const frontend = await openPublishedPage(page);
		const list = frontend.locator(LIST);
		const items = list.locator(ITEM);

		await expect(list).toHaveClass(/vp-layout-masonry/);
		await expect(items).toHaveCount(PER_PAGE);

		// CSS alone leaves the items in the flow; only the layout callback takes
		// them out of it. Images are measured first, so this settles late.
		await expect
			.poll(
				async () =>
					(await getItemPositions(items)).every(
						(item) => 'absolute' === item.position
					),
				{ timeout: 20000 }
			)
			.toBe(true);

		// Two columns and three items: one of them had to go into a second row.
		const positioned = await getItemPositions(items);

		expect(positioned.some((item) => item.top > 0)).toBe(true);

		const heightBefore = await list.evaluate((node) => node.style.height);

		await frontend.locator(LOAD_MORE).click();

		await expect(items).toHaveCount(POSTS_COUNT);

		// The appended items are laid out too, and the container grew to hold
		// them - Masonry writes both, so neither survives a missed relayout.
		await expect
			.poll(
				async () =>
					(await getItemPositions(items)).every(
						(item) => 'absolute' === item.position
					),
				{ timeout: 20000 }
			)
			.toBe(true);

		await expect
			.poll(async () =>
				Number.parseFloat(
					await list.evaluate((node) => node.style.height)
				)
			)
			.toBeGreaterThan(Number.parseFloat(heightBefore));
	});

	test('the images source renders in the editor preview and on the front end', async ({
		page,
		admin,
		editor,
	}) => {
		await admin.createNewPost({
			title: 'Gallery Item Template - images',
			postType: 'page',
			showWelcomeGuide: false,
			legacyCanvas: true,
		});

		// The preview resolves its items through the same pipeline the front end
		// renders, so the request itself is part of what is being tested.
		const itemsRequest = page.waitForResponse(
			(response) =>
				response.url().includes('get_loop_items') &&
				'POST' === response.request().method()
		);

		await editor.insertBlock(
			getLoopBlock({
				query: {
					queryType: 'images',
					imagesQuery: { images },
				},
				perPage: IMAGES_COUNT,
			})
		);

		const payload = await (await itemsRequest).json();

		expect(payload.response.items).toHaveLength(IMAGES_COUNT);

		// One item is editable and the rest are previews of it; the copy that
		// stands in for the editable one is the only hidden node.
		await expect(
			getEditorCanvas(page, editor).locator(`${LIST} ${ITEM}:visible`)
		).toHaveCount(IMAGES_COUNT);

		await editor.publishPost();

		const frontend = await openPublishedPage(page);

		await expect(frontend.locator(`${LIST} ${ITEM}`)).toHaveCount(
			IMAGES_COUNT
		);

		for (const image of images) {
			await expect(
				frontend.locator(`${LIST} img.wp-image-${image.id}`)
			).toHaveCount(1);
		}
	});

	test('the gallery manager reorders and edits images from the inspector', async ({
		page,
		admin,
		editor,
	}) => {
		await admin.createNewPost({
			title: 'Gallery Item Template - gallery manager',
			postType: 'page',
			showWelcomeGuide: false,
			legacyCanvas: true,
		});

		// Attachment ids and nothing else, the way a pattern ships a gallery -
		// the manager has to resolve the thumbnails on its own.
		await editor.insertBlock(
			getLoopBlock({
				query: {
					queryType: 'images',
					imagesQuery: { images: images.map(({ id }) => ({ id })) },
				},
				perPage: IMAGES_COUNT,
				itemBlocks: [{ name: 'visual-portfolio/item-title' }],
			})
		);

		await editor.openDocumentSettingsSidebar();

		const manager = page.locator('.vpf-gallery-manager');
		const tiles = manager.locator('.vpf-gallery-manager__item');

		await expect(tiles).toHaveCount(IMAGES_COUNT);
		await expect(tiles.locator('img')).toHaveCount(IMAGES_COUNT);

		const getImagesQuery = async () => {
			const blocks = await editor.getBlocks();
			const loop = blocks.find(
				(block) => 'visual-portfolio/loop' === block.name
			);

			return loop?.attributes?.imagesQuery ?? {};
		};

		// The preview resolves through a request that writes `maxPages` back on
		// the block; letting it land keeps it from re-rendering mid-gesture.
		await expect(
			getEditorCanvas(page, editor).locator(`${LIST} ${ITEM}:visible`)
		).toHaveCount(IMAGES_COUNT);

		// Reordering has to work without a mouse: the keyboard sensor picks the
		// image up on Space and moves it with the arrow keys. The grid is
		// centred first - a drag that starts against the edge of the sidebar
		// scrolls it, and the sensor measures the grid before that.
		const announcement = page.locator('[id^="DndLiveRegion"]');
		const handle = manager.locator('.vpf-gallery-manager__drag').first();
		await handle.evaluate((node) =>
			node.scrollIntoView({ block: 'center' })
		);
		await handle.focus();
		await page.keyboard.press('Space');

		// The announcement is what says the image is up and the grid measured;
		// before that the arrow keys have nothing to move it to.
		await expect(announcement).toContainText('position 1');

		await page.keyboard.press('ArrowRight');
		await expect(announcement).toContainText('position 2');

		await page.keyboard.press('Space');

		await expect
			.poll(async () =>
				(await getImagesQuery()).images.map((image) => image.id)
			)
			.toEqual([images[1].id, images[0].id, images[2].id]);

		// The drawer writes to the image it was opened on, and the categories of
		// the images are what the filter block reads off the loop.
		await tiles.first().locator('.vpf-gallery-manager__preview').click();

		const drawer = page.getByRole('dialog', { name: 'Image Settings' });

		await drawer.getByLabel('Title', { exact: true }).fill(MANAGER_TITLE);
		await drawer
			.getByRole('combobox', { name: 'Categories' })
			.fill(MANAGER_CATEGORY);
		await drawer
			.getByRole('combobox', { name: 'Categories' })
			.press('Enter');
		await drawer.getByRole('button', { name: 'Close' }).click();

		await expect
			.poll(async () => {
				const query = await getImagesQuery();

				return {
					title: query.images[0]?.title,
					categories: query.categories,
				};
			})
			.toEqual({ title: MANAGER_TITLE, categories: [MANAGER_CATEGORY] });

		await editor.publishPost();

		const frontend = await openPublishedPage(page);

		await expect(
			frontend.locator(`${LIST} ${ITEM}`).first().locator(TITLE)
		).toHaveText(MANAGER_TITLE);
	});

	test('item date and item read more render inside every item', async ({
		page,
		admin,
		editor,
	}) => {
		await admin.createNewPost({
			title: 'Gallery Item Template - date and read more',
			postType: 'page',
			showWelcomeGuide: false,
			legacyCanvas: true,
		});

		await editor.insertBlock(
			getLoopBlock({
				query: postsSource,
				itemBlocks: [
					{
						name: 'visual-portfolio/item-title',
						attributes: { isLink: true },
					},
					{
						name: 'visual-portfolio/item-date',
						attributes: { isLink: true },
					},
					{
						name: 'visual-portfolio/item-read-more',
						attributes: {
							text: 'Open the item',
							showArrow: true,
						},
					},
				],
			})
		);
		await editor.publishPost();

		const frontend = await openPublishedPage(page);
		const items = frontend.locator(`${LIST} ${ITEM}`);
		const dates = frontend.locator(
			'.wp-block-visual-portfolio-item-date time'
		);
		const readMore = frontend.locator(
			'.wp-block-visual-portfolio-item-read-more a'
		);

		await expect(items).toHaveCount(PER_PAGE);
		await expect(dates).toHaveCount(PER_PAGE);
		await expect(readMore).toHaveCount(PER_PAGE);

		// The date block prints both a machine stamp and the site's format. The
		// stamp is paired with the title of the same item rather than with the
		// position of the post in the query, so it proves the block read the
		// context of its own item.
		const rendered = await items.evaluateAll((nodes) =>
			nodes.map((node) => ({
				title:
					node
						.querySelector('.wp-block-visual-portfolio-item-title')
						?.innerText.trim() ?? '',
				stamp:
					node
						.querySelector(
							'.wp-block-visual-portfolio-item-date time'
						)
						?.getAttribute('datetime') ?? '',
				text:
					node
						.querySelector(
							'.wp-block-visual-portfolio-item-date time'
						)
						?.innerText.trim() ?? '',
			}))
		);

		rendered.forEach(({ title, stamp, text }) => {
			const post = createdPosts.find(
				(item) => item.title.rendered === title
			);

			expect(post).toBeDefined();
			expect(stamp).toContain(post.date);
			expect(text).not.toBe('');
		});

		await expect(readMore.first()).toContainText('Open the item');
		await expect(
			readMore.first().locator('span[aria-hidden="true"]')
		).toHaveCount(1);

		// Both blocks link at the item itself, the same place the title does.
		const first = items.first();
		const itemUrl = await first.locator(`${TITLE} a`).getAttribute('href');

		expect(
			await first
				.locator('.wp-block-visual-portfolio-item-date a')
				.getAttribute('href')
		).toBe(itemUrl);
		expect(
			await first
				.locator('.wp-block-visual-portfolio-item-read-more a')
				.getAttribute('href')
		).toBe(itemUrl);
	});
});
