/**
 * Gallery Loop: the transform from the legacy Visual Portfolio block and the
 * Saved Layout block.
 */
import { expect, test } from '@wordpress/e2e-test-utils-playwright';

import { createRegularPosts } from '../utils/create-posts';
import { getFixturePath } from '../utils/fixture-path';
import { getPluginSlug } from '../utils/plugin-slug';

const LOOP_TITLE = 'Gallery Loop (Experimental)';
const LEGACY_TITLE = '.vp-portfolio__item-meta-title';
const LOOP_TITLE_SELECTOR =
	'.wp-block-visual-portfolio-item-template__item .wp-block-visual-portfolio-item-title';

// A posts gallery as the legacy wizard leaves it, with every setting the
// transform has an answer for that is not a default.
const POSTS_GALLERY = {
	block_id: 'legacyposts',
	content_source: 'post-based',
	posts_source: 'post',
	posts_order_by: 'title',
	posts_order_direction: 'asc',
	items_count: 3,
	layout: 'grid',
	grid_columns: 3,
	items_style: 'fade',
	items_style_fade__show_categories: true,
	layout_elements: {
		top: { elements: ['filter'], align: 'center' },
		items: { elements: ['items'] },
		bottom: { elements: ['pagination'], align: 'center' },
	},
	pagination: 'load-more',
};

/**
 * The legacy block converted the way the block switcher converts it, as the
 * names and attributes of the blocks it gives.
 *
 * @param {Object} page       - Playwright page.
 * @param {Object} attributes - legacy block attributes.
 * @param {string} from       - name of the block to convert.
 * @return {Promise<Object|null>} block tree, or null when not offered.
 */
function switchLegacy(page, attributes, from = 'visual-portfolio/block') {
	return page.evaluate(
		([name, legacy]) => {
			const tree = ({
				name: blockName,
				attributes: attrs,
				innerBlocks,
			}) => ({
				name: blockName,
				attributes: attrs,
				innerBlocks: innerBlocks.map(tree),
			});
			const switched = window.wp.blocks.switchToBlockType(
				window.wp.blocks.createBlock(name, legacy),
				'visual-portfolio/loop'
			);

			return switched ? tree(switched[0]) : null;
		},
		[from, attributes]
	);
}

/**
 * Every block of a tree, depth first.
 *
 * @param {Object} block - block tree.
 * @return {Array} blocks.
 */
function flatten(block) {
	return [block, ...block.innerBlocks.flatMap(flatten)];
}

/**
 * The first block of a name in a tree.
 *
 * @param {Object} block - block tree.
 * @param {string} name  - block name without the namespace.
 * @return {Object|undefined} block.
 */
function find(block, name) {
	return flatten(block).find(
		(item) => `visual-portfolio/${name}` === item.name
	);
}

test.describe('Gallery Loop from the legacy block', () => {
	let images = [];
	let postIds = [];
	let pageIds = [];
	let layoutId = 0;

	test.beforeAll(async ({ requestUtils }) => {
		await requestUtils.activatePlugin(getPluginSlug());

		postIds = await createRegularPosts({
			requestUtils,
			count: 5,
			categories: ['Legacy Transform'],
		});

		for (let i = 0; i < 3; i++) {
			const uploaded = await requestUtils.uploadMedia(
				getFixturePath('image-800x600.png')
			);

			images.push({
				id: uploaded.id,
				imgUrl: uploaded.source_url,
				imgThumbnailUrl: uploaded.source_url,
				title: `Legacy image ${i + 1}`,
			});
		}

		const layout = await requestUtils.rest({
			path: '/wp/v2/vp_lists',
			method: 'POST',
			data: { title: 'Legacy transform layout', status: 'publish' },
		});

		layoutId = layout.id;

		await requestUtils.rest({
			path: '/visual-portfolio/v1/update_layout/',
			method: 'POST',
			data: {
				post_id: layoutId,
				data: {
					vp_content_source: 'images',
					vp_images: images,
					vp_layout: 'masonry',
					vp_masonry_columns: '4',
					vp_items_style: 'default',
					vp_items_click_action: 'popup_gallery',
				},
			},
		});
	});

	test.afterAll(async ({ requestUtils }) => {
		await Promise.all([
			...pageIds.map((id) =>
				requestUtils.rest({
					path: `/wp/v2/pages/${id}`,
					method: 'DELETE',
					params: { force: true },
				})
			),
			...postIds.map((id) =>
				requestUtils.rest({
					path: `/wp/v2/posts/${id}`,
					method: 'DELETE',
					params: { force: true },
				})
			),
			...images.map(({ id }) =>
				requestUtils.rest({
					path: `/wp/v2/media/${id}`,
					method: 'DELETE',
					params: { force: true },
				})
			),
			layoutId &&
				requestUtils.rest({
					path: `/wp/v2/vp_lists/${layoutId}`,
					method: 'DELETE',
					params: { force: true },
				}),
		]);

		images = [];
		postIds = [];
		pageIds = [];
		layoutId = 0;
	});

	test.beforeEach(async ({ admin }) => {
		await admin.createNewPost({
			postType: 'page',
			showWelcomeGuide: false,
			legacyCanvas: true,
		});
	});

	test('a posts gallery shows the same posts on the page, with its filter and Load More', async ({
		editor,
		page,
		requestUtils,
	}) => {
		const legacyPage = await requestUtils.createPage({
			title: 'Legacy posts gallery',
			status: 'publish',
			content: `<!-- wp:visual-portfolio/block ${JSON.stringify(POSTS_GALLERY)} /-->`,
		});

		pageIds.push(legacyPage.id);

		await editor.insertBlock({
			name: 'visual-portfolio/block',
			attributes: POSTS_GALLERY,
		});
		await editor.showBlockToolbar();
		await page
			.getByRole('toolbar', { name: 'Block tools' })
			.getByRole('button', { name: 'Visual Portfolio', exact: true })
			.press('Enter');

		// The switcher previews the loop while the entry has focus, and the
		// preview leaves the post alone.
		await page.getByRole('menuitem', { name: LOOP_TITLE }).focus();
		expect(await editor.getBlocks()).toMatchObject([
			{ name: 'visual-portfolio/block' },
		]);

		await page.getByRole('menuitem', { name: LOOP_TITLE }).press('Enter');

		const [loop] = await editor.getBlocks();

		expect(loop.name).toBe('visual-portfolio/loop');
		expect(find(loop, 'item-template').attributes).toMatchObject({
			layoutType: 'grid',
			layoutColumnCount: 3,
		});
		expect(find(loop, 'item-cover').attributes).toMatchObject({
			effect: 'fade',
			showContent: 'hover',
			clickAction: 'url',
		});
		expect(
			find(loop, 'item-cover').innerBlocks.map(({ name }) => name)
		).toEqual([
			'visual-portfolio/item-categories',
			'visual-portfolio/item-title',
		]);

		// One undo brings the legacy block back as it was.
		await page.keyboard.press('ControlOrMeta+z');
		await expect
			.poll(() => editor.getBlocks())
			.toMatchObject([
				{
					name: 'visual-portfolio/block',
					attributes: { items_style: 'fade', grid_columns: 3 },
				},
			]);
		await page.keyboard.press('ControlOrMeta+Shift+z');
		await expect
			.poll(async () => (await editor.getBlocks())[0].name)
			.toBe('visual-portfolio/loop');

		const loopPage = await requestUtils.createPage({
			title: 'Converted posts gallery',
			status: 'publish',
			content: await page.evaluate(() =>
				window.wp.blocks.serialize(
					window.wp.data.select('core/block-editor').getBlocks()
				)
			),
		});

		pageIds.push(loopPage.id);

		await page.goto(legacyPage.link);
		const legacyTitles = await page.locator(LEGACY_TITLE).allTextContents();

		await page.goto(loopPage.link);
		await expect(page.locator(LOOP_TITLE_SELECTOR)).toHaveText(
			legacyTitles.map((title) => title.trim())
		);
		expect(legacyTitles).toHaveLength(3);
		await expect(page.locator('.vp-block-loop-filter')).toBeVisible();
		await expect(
			page.getByRole('link', { name: 'Load More' })
		).toBeVisible();
	});

	test('an images gallery keeps its images, its masonry and its lightbox', async ({
		page,
	}) => {
		const loop = await switchLegacy(page, {
			block_id: 'legacyimages',
			content_source: 'images',
			images,
			items_count: -1,
			layout: 'masonry',
			masonry_columns: 4,
			items_style: 'default',
			items_click_action: 'popup_gallery',
		});

		expect(loop.attributes).toMatchObject({
			queryType: 'images',
			baseQuery: { perPage: -1 },
			imagesQuery: {
				images: images.map(({ id, title }) => ({ id, title })),
			},
		});
		expect(find(loop, 'item-template').attributes).toMatchObject({
			layoutType: 'masonry',
			layoutColumnCount: 4,
		});
		expect(find(loop, 'item-image').attributes.clickAction).toBe('popup');
	});

	test('an image with a link of its own keeps it beside the lightbox', async ({
		page,
	}) => {
		const loop = await switchLegacy(page, {
			block_id: 'legacylinked',
			content_source: 'images',
			images: [{ ...images[0], url: 'https://example.com/' }, images[1]],
			items_style: 'default',
			items_click_action: 'popup_gallery',
		});

		expect(find(loop, 'item-image').attributes.clickAction).toBe(
			'url-or-popup'
		);
	});

	test('a block saved with its defaults alone converts as a tiles gallery with the fade skin', async ({
		page,
	}) => {
		const loop = await switchLegacy(page, {
			block_id: 'legacydefaults',
			content_source: 'post-based',
		});

		expect(loop.attributes).toMatchObject({
			queryType: 'posts',
			baseQuery: { perPage: 6 },
			postsQuery: { source: 'portfolio', orderBy: 'post_date' },
		});
		expect(find(loop, 'item-template').attributes).toMatchObject({
			layoutType: 'tiles',
			layoutTiles: '3|1,1|',
		});
		// The Fade skin's stylesheet paints an opaque black on hover.
		expect(find(loop, 'item-cover').attributes).toMatchObject({
			effect: 'fade',
			customHoverOverlayColor: '#000',
			hoverDimRatio: 100,
		});
	});

	test('a skin the free plugin does not style keeps the cover overlay', async ({
		page,
	}) => {
		test.skip(!!process.env.CORE, 'Pro maps Caption Move itself');

		const loop = await switchLegacy(page, {
			block_id: 'legacycaptionmove',
			content_source: 'post-based',
			items_style: 'caption-move',
		});
		const cover = find(loop, 'item-cover').attributes;

		expect(cover.effect).toBe('caption-move');
		expect(cover.customHoverOverlayColor).toBeUndefined();
	});

	test('filter, sort and search share the row above the items', async ({
		page,
	}) => {
		const loop = await switchLegacy(page, {
			block_id: 'legacytoprow',
			content_source: 'post-based',
			layout_elements: {
				top: {
					elements: ['filter', 'sort', 'search'],
					align: 'between',
				},
				items: { elements: ['items'] },
				bottom: { elements: [], align: 'center' },
			},
		});
		const [row] = loop.innerBlocks;

		expect(row.name).toBe('core/group');
		expect(row.attributes.layout.justifyContent).toBe('space-between');
		expect(row.innerBlocks.map(({ name }) => name)).toEqual([
			'visual-portfolio/loop-filter',
			'visual-portfolio/loop-sort',
			'visual-portfolio/loop-search',
		]);
	});

	test('a filter with no label for All has no All item', async ({ page }) => {
		const loop = await switchLegacy(page, {
			block_id: 'legacynoall',
			content_source: 'post-based',
			filter_text_all: '',
			layout_elements: {
				top: { elements: ['filter'], align: 'left' },
				items: { elements: ['items'] },
				bottom: { elements: [], align: 'center' },
			},
		});
		const filter = find(loop, 'loop-filter');

		expect(filter.attributes.showAllItem).toBe(false);
		expect(filter.innerBlocks).toEqual([]);
	});

	test('a tiles pattern carries over as it is', async ({ page }) => {
		const loop = await switchLegacy(page, {
			block_id: 'legacytiles',
			content_source: 'post-based',
			layout: 'tiles',
			tiles_type: '3|1,1|2,0.5|1,1|1,2|1,1|',
		});

		expect(find(loop, 'item-template').attributes.layoutTiles).toBe(
			'3|1,1|2,0.5|1,1|1,2|1,1|'
		);
	});

	test('a slider becomes a carousel with its arrows, dots and autoplay', async ({
		page,
	}) => {
		const loop = await switchLegacy(page, {
			block_id: 'legacyslider',
			content_source: 'post-based',
			layout: 'slider',
			slider_effect: 'coverflow',
			slider_autoplay: 1,
			slider_loop: true,
			slider_bullets: true,
			slider_items_height_type: 'static',
			slider_items_height_static: 420,
		});
		const template = find(loop, 'item-template');

		expect(template.attributes).toMatchObject({
			layoutType: 'carousel',
			carouselEffect: 'coverflow',
			carouselRepeat: true,
			carouselSnapAlign: 'center',
			carouselAutoplay: true,
			// Below the carousel's shortest delay.
			carouselAutoplayDelay: 2,
			carouselSlideHeight: '420px',
		});
		expect(find(template, 'loop-carousel-previous')).toBeTruthy();
		expect(find(template, 'loop-carousel-next')).toBeTruthy();
		expect(find(loop, 'loop-carousel-indicator')).toBeTruthy();
	});

	test('custom CSS becomes the custom CSS of the loop', async ({ page }) => {
		const loop = await switchLegacy(page, {
			block_id: 'legacycss',
			content_source: 'post-based',
			custom_css: encodeURIComponent('selector { outline: 1px solid; }'),
		});

		expect(loop.attributes.style.css).toBe('& { outline: 1px solid; }');
	});

	test('a block with no source yet, or one the loop has no source for, is not offered', async ({
		page,
	}) => {
		expect(
			await switchLegacy(page, {
				block_id: 'legacyempty',
				content_source: '',
			})
		).toBe(null);
		expect(
			await switchLegacy(page, {
				block_id: 'legacysocial',
				content_source: 'social-stream',
			})
		).toBe(
			// Pro registers the source, and the transform with it.
			(await page.evaluate(() => !!window.VPGutenbergVariables.pro))
				? expect.anything()
				: null
		);
	});

	test('an extension gets every legacy setting and decides the result', async ({
		page,
	}) => {
		const result = await page.evaluate(() => {
			let received = null;

			window.wp.hooks.addFilter(
				'vpf.loopLegacyTransform',
				'vpf-e2e/legacy-transform',
				(loop, legacy) => {
					received = legacy;
					return window.wp.blocks.createBlock(
						'visual-portfolio/loop',
						{
							...loop.attributes,
							queryType: 'images',
						}
					);
				}
			);

			const switched = window.wp.blocks.switchToBlockType(
				window.wp.blocks.createBlock('visual-portfolio/block', {
					block_id: 'legacyfilter',
					content_source: 'post-based',
				}),
				'visual-portfolio/loop'
			);

			window.wp.hooks.removeFilter(
				'vpf.loopLegacyTransform',
				'vpf-e2e/legacy-transform'
			);

			return {
				queryType: switched[0].attributes.queryType,
				itemsStyle: received?.items_style,
			};
		});

		expect(result).toEqual({ queryType: 'images', itemsStyle: 'fade' });
	});

	test('a Saved Layout block offers Gallery Loop in the block switcher', async ({
		editor,
		page,
	}) => {
		// Inserted unselected: the settings load when the block mounts, not
		// when it is selected, since the switcher caches what it offers.
		await page.evaluate((id) => {
			const { dispatch } = window.wp.data;

			dispatch('core/block-editor').insertBlock(
				window.wp.blocks.createBlock('visual-portfolio/saved', { id }),
				undefined,
				undefined,
				false
			);
		}, String(layoutId));
		await page.waitForFunction(
			(id) =>
				window.wp.data
					.select('visual-portfolio')
					.hasFinishedResolution('getLayoutOptions', [id]),
			String(layoutId)
		);
		await editor.selectBlocks(
			editor.canvas.locator('[data-type="visual-portfolio/saved"]')
		);
		await editor.showBlockToolbar();
		await page
			.getByRole('toolbar', { name: 'Block tools' })
			.getByRole('button', {
				name: 'Visual Portfolio Saved Layout',
				exact: true,
			})
			.press('Enter');
		await page.getByRole('menuitem', { name: LOOP_TITLE }).press('Enter');

		await expect
			.poll(async () => (await editor.getBlocks())[0].name)
			.toBe('visual-portfolio/loop');
	});

	test('a Saved Layout block converts the layout into the post, and a missing one is not offered', async ({
		page,
	}) => {
		const loadOptions = (id) =>
			page.evaluate(
				(layout) =>
					window.wp.data
						.resolveSelect('visual-portfolio')
						.getLayoutOptions(layout),
				id
			);

		await loadOptions(String(layoutId));

		const loop = await switchLegacy(
			page,
			{ id: String(layoutId), align: 'wide' },
			'visual-portfolio/saved'
		);

		expect(loop.attributes).toMatchObject({
			align: 'wide',
			queryType: 'images',
			imagesQuery: { images: images.map(({ id }) => ({ id })) },
		});
		expect(find(loop, 'item-template').attributes).toMatchObject({
			layoutType: 'masonry',
			layoutColumnCount: 4,
		});
		expect(find(loop, 'item-image').attributes.clickAction).toBe('popup');

		await loadOptions('999999');

		expect(
			await switchLegacy(page, { id: '999999' }, 'visual-portfolio/saved')
		).toBe(null);
	});
});
