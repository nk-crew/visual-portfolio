/**
 * Gallery Loop: what it takes from and gives to the rest of the editor and the
 * page - the block names the server translated, the core blocks it replaces,
 * and the pages it fetches before the visitor asks for them.
 */
import { expect, test } from '@wordpress/e2e-test-utils-playwright';

import { getFixturePath } from '../utils/fixture-path';
import { getPluginSlug } from '../utils/plugin-slug';

const LOOP = '.vp-block-loop';
const ITEM = '.wp-block-visual-portfolio-item-template__item';
const TITLE = '.wp-block-visual-portfolio-item-title';
const LOOP_TITLE = 'Gallery Loop (Experimental)';

const PER_PAGE = 2;
const IMAGES_COUNT = 6;

/**
 * Turn a core block into a Gallery Loop through the block toolbar.
 *
 * @param {Object} page   - Playwright page.
 * @param {Object} editor - editor utils.
 * @param {string} from   - title of the selected core block.
 */
async function transformToLoop(page, editor, from) {
	await editor.showBlockToolbar();
	await page
		.getByRole('toolbar', { name: 'Block tools' })
		.getByRole('button', { name: from, exact: true })
		.click();
	await page.getByRole('menuitem', { name: LOOP_TITLE }).click();
}

test.describe('Gallery Loop integrations', () => {
	let images = [];
	let pageIds = [];

	test.beforeAll(async ({ requestUtils }) => {
		await requestUtils.activatePlugin(getPluginSlug());

		const media = await requestUtils.rest({
			path: '/wp/v2/media',
			params: {
				per_page: IMAGES_COUNT,
				media_type: 'image',
				orderby: 'id',
				order: 'desc',
			},
		});

		images = media.map((item) => ({ id: item.id, url: item.source_url }));

		while (images.length < IMAGES_COUNT) {
			const uploaded = await requestUtils.uploadMedia(
				getFixturePath('image-800x600.png')
			);

			images.push({ id: uploaded.id, url: uploaded.source_url });
		}
	});

	test.afterAll(async ({ requestUtils }) => {
		await Promise.all(
			pageIds.map((id) =>
				requestUtils.rest({
					path: `/wp/v2/pages/${id}`,
					method: 'DELETE',
					params: { force: true },
				})
			)
		);

		pageIds = [];
	});

	test('the editor names the blocks the way the server does', async ({
		admin,
		page,
	}) => {
		// Stands in for a translated site: the server hands the editor its own
		// definition of the blocks, and whatever it says is what the editor has
		// to show.
		await page.route('**/wp-admin/post-new.php*', async (route) => {
			const response = await route.fetch();
			const body = (await response.text())
				.split(`"title":"${LOOP_TITLE}"`)
				.join('"title":"Galerie-Schleife"')
				.split('"title":"Gallery Item Title (Experimental)"')
				.join('"title":"Galerie-Titel"');

			await route.fulfill({ response, body });
		});

		await admin.createNewPost({
			postType: 'page',
			showWelcomeGuide: false,
			legacyCanvas: true,
		});

		expect(
			await page.evaluate(() =>
				['visual-portfolio/loop', 'visual-portfolio/item-title'].map(
					(name) => window.wp.blocks.getBlockType(name).title
				)
			)
		).toEqual(['Galerie-Schleife', 'Galerie-Titel']);
	});

	test('a core gallery becomes a loop of its images', async ({
		admin,
		editor,
		page,
	}) => {
		await admin.createNewPost({
			postType: 'page',
			showWelcomeGuide: false,
			legacyCanvas: true,
		});

		await editor.insertBlock({
			name: 'core/gallery',
			attributes: { columns: 2, linkTo: 'media' },
			innerBlocks: images.slice(0, 2).map((image, index) => ({
				name: 'core/image',
				attributes: {
					id: image.id,
					url: image.url,
					alt: `Alt ${index + 1}`,
					caption: `Caption ${index + 1}`,
				},
			})),
		});

		await transformToLoop(page, editor, 'Gallery');

		const [loop] = await editor.getBlocks();

		expect(loop.name).toBe('visual-portfolio/loop');
		expect(loop.attributes.queryType).toBe('images');
		expect(
			loop.attributes.imagesQuery.images.map(({ id, title, alt }) => ({
				id,
				title,
				alt,
			}))
		).toEqual([
			{ id: images[0].id, title: 'Caption 1', alt: 'Alt 1' },
			{ id: images[1].id, title: 'Caption 2', alt: 'Alt 2' },
		]);

		const [template] = loop.innerBlocks;

		expect(template.name).toBe('visual-portfolio/item-template');
		expect(template.attributes).toMatchObject({
			layoutType: 'grid',
			layoutColumnsMode: 'manual',
			layoutColumnCount: 2,
		});
		expect(
			template.innerBlocks.map(({ name, attributes }) => [
				name,
				attributes.clickAction,
			])
		).toEqual([
			['visual-portfolio/item-image', 'popup'],
			['visual-portfolio/item-title', undefined],
		]);
	});

	test('core latest posts become a loop of posts', async ({
		admin,
		editor,
		page,
	}) => {
		await admin.createNewPost({
			postType: 'page',
			showWelcomeGuide: false,
			legacyCanvas: true,
		});

		await editor.insertBlock({
			name: 'core/latest-posts',
			attributes: {
				postsToShow: 4,
				layout: { type: 'grid', columnCount: 2 },
				order: 'asc',
				orderBy: 'title',
				displayFeaturedImage: true,
				displayAuthor: true,
				displayPostDate: true,
				displayPostContent: true,
				excerptLength: 20,
			},
		});

		await transformToLoop(page, editor, 'Latest Posts');

		const [loop] = await editor.getBlocks();

		expect(loop.name).toBe('visual-portfolio/loop');
		expect(loop.attributes).toMatchObject({
			queryType: 'posts',
			baseQuery: { perPage: 4 },
			postsQuery: { source: 'post', order: 'asc', orderBy: 'title' },
		});

		const [template] = loop.innerBlocks;

		expect(template.attributes).toMatchObject({
			layoutType: 'grid',
			layoutColumnsMode: 'manual',
			layoutColumnCount: 2,
		});
		expect(template.innerBlocks.map(({ name }) => name)).toEqual([
			'visual-portfolio/item-image',
			'visual-portfolio/item-title',
			'visual-portfolio/item-author',
			'visual-portfolio/item-date',
			'visual-portfolio/item-description',
		]);
		expect(template.innerBlocks[4].attributes).toMatchObject({
			source: 'excerpt',
			excerptLength: 20,
		});
	});

	/**
	 * Publish a page holding one loop of the images, with prefetching turned
	 * on, and open it.
	 *
	 * The switch is a PHP filter and this environment loads no plugin that
	 * flips it, so the page is served with the attribute the filter adds to the
	 * loop wrapper - on every request, the router's included.
	 *
	 * @param {Object} requestUtils - REST utils.
	 * @param {Object} page         - Playwright page.
	 * @param {string} title        - page title.
	 * @param {string} controls     - serialized control blocks after the items.
	 */
	async function publishPrefetchingLoop(requestUtils, page, title, controls) {
		const loop = {
			block_id: 'e2e-prefetch',
			queryId: 1,
			queryType: 'images',
			baseQuery: { perPage: PER_PAGE, maxPages: 0 },
			imagesQuery: {
				images: images.map(({ id }, index) => ({
					id,
					title: `Prefetch ${String.fromCharCode(65 + index)}`,
				})),
				orderBy: 'default',
			},
		};

		const created = await requestUtils.rest({
			path: '/wp/v2/pages',
			method: 'POST',
			data: {
				title,
				status: 'publish',
				content: [
					`<!-- wp:visual-portfolio/loop ${JSON.stringify(loop)} -->`,
					'<div class="wp-block-visual-portfolio-loop vp-block-loop">',
					'<!-- wp:visual-portfolio/item-template -->',
					'<!-- wp:visual-portfolio/item-title /-->',
					'<!-- /wp:visual-portfolio/item-template -->',
					controls,
					'</div>',
					'<!-- /wp:visual-portfolio/loop -->',
				].join(''),
			},
		});

		pageIds.push(created.id);

		const { pathname } = new URL(created.link);
		const region = 'data-wp-router-region="vp-loop-e2e-prefetch"';

		await page.route(
			(url) => url.pathname === pathname,
			async (route) => {
				const response = await route.fetch();
				const body = (await response.text()).replace(
					region,
					`${region} data-wp-init---prefetch="callbacks.initPrefetch"`
				);

				await route.fulfill({ response, body });
			}
		);

		await page.goto(created.link, { waitUntil: 'load' });

		// A full page load would take the mark with it.
		await page.evaluate(() => {
			window.__vpSameDocument = true;
		});
	}

	/**
	 * Count the requests the page makes for a page of the loop.
	 *
	 * @param {Object} page   - Playwright page.
	 * @param {string} number - page number.
	 * @return {Function} Current count.
	 */
	function countRequests(page, number) {
		let count = 0;

		page.on('request', (request) => {
			if (
				number === new URL(request.url()).searchParams.get('vp-1-page')
			) {
				count += 1;
			}
		});

		return () => count;
	}

	test('a pagination link pointed at is fetched once, before the click', async ({
		page,
		requestUtils,
	}) => {
		const requests = countRequests(page, '2');

		await publishPrefetchingLoop(
			requestUtils,
			page,
			'Integrations - prefetch a link',
			'<!-- wp:visual-portfolio/loop-pagination --><!-- wp:visual-portfolio/loop-pagination-numbers /--><!-- /wp:visual-portfolio/loop-pagination -->'
		);

		const link = page.locator(
			`${LOOP} .vp-block-loop-pagination-numbers a`,
			{
				hasText: '2',
			}
		);

		expect(requests()).toBe(0);

		await link.hover();
		await expect.poll(requests).toBe(1);

		await link.click();
		await expect(page.locator(`${LOOP} ${ITEM} ${TITLE}`)).toHaveText([
			'Prefetch C',
			'Prefetch D',
		]);

		expect(requests()).toBe(1);
		expect(await page.evaluate(() => window.__vpSameDocument)).toBe(true);
	});

	test('the next page of a load more is fetched ahead and used', async ({
		page,
		requestUtils,
	}) => {
		const secondPage = countRequests(page, '2');
		const thirdPage = countRequests(page, '3');

		await publishPrefetchingLoop(
			requestUtils,
			page,
			'Integrations - prefetch the next page',
			'<!-- wp:visual-portfolio/loop-pagination --><!-- wp:visual-portfolio/loop-pagination-trigger /--><!-- /wp:visual-portfolio/loop-pagination -->'
		);

		await expect.poll(secondPage).toBe(1);

		await page.locator('.vp-block-loop-pagination-trigger').click();
		await expect(page.locator(`${LOOP} ${ITEM} ${TITLE}`)).toHaveText([
			'Prefetch A',
			'Prefetch B',
			'Prefetch C',
			'Prefetch D',
		]);

		expect(secondPage()).toBe(1);

		// And the page after it, once the items are in.
		await expect.poll(thirdPage).toBe(1);
		expect(await page.evaluate(() => window.__vpSameDocument)).toBe(true);
	});
});
