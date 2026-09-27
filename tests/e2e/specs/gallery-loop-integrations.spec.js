/**
 * Gallery Loop: what it takes from and gives to the rest of the editor and the
 * page - the block names the server translated, the core blocks it replaces,
 * and the events a script answers the loads of a loop through.
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

	// From the keyboard: on a wide block the toolbar can sit under the
	// admin menu, which takes a pointer click.
	await page
		.getByRole('toolbar', { name: 'Block tools' })
		.getByRole('button', { name: from, exact: true })
		.press('Enter');
	await page.getByRole('menuitem', { name: LOOP_TITLE }).press('Enter');
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

	test('the editor starts the settings of an extension as an object', async ({
		admin,
		page,
	}) => {
		await admin.createNewPost({
			postType: 'page',
			showWelcomeGuide: false,
			legacyCanvas: true,
		});

		// Keyed by name, so a failure names the block.
		const defaults = await page.evaluate(() =>
			Object.fromEntries(
				window.wp.blocks
					.getBlockTypes()
					.filter(
						({ name, attributes }) =>
							name.startsWith('visual-portfolio/') &&
							attributes.extensions
					)
					.map(({ name, attributes }) => [
						name,
						Array.isArray(attributes.extensions.default)
							? 'array'
							: typeof attributes.extensions.default,
					])
			)
		);

		expect(defaults['visual-portfolio/item-template']).toBe('object');
		expect(
			Object.entries(defaults).filter(([, type]) => 'object' !== type)
		).toEqual([]);
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
			attributes: {
				columns: 2,
				linkTo: 'media',
				caption: 'Gallery caption',
				className: 'is-e2e-gallery',
				anchor: 'e2e-gallery',
				style: { spacing: { blockGap: { top: '7px', left: '9px' } } },
			},
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

		const [loop, caption] = await editor.getBlocks();

		expect(caption).toMatchObject({
			name: 'core/paragraph',
			attributes: { content: 'Gallery caption' },
		});

		expect(loop.name).toBe('visual-portfolio/loop');
		expect(loop.attributes).toMatchObject({
			queryType: 'images',
			className: 'is-e2e-gallery',
			anchor: 'e2e-gallery',
		});
		// The loop turns off only its generated class; the one a user types
		// is saved on the wrapper.
		expect(await editor.getEditedPostContent()).toMatch(
			/<div class="vp-block-loop is-e2e-gallery" id="e2e-gallery">/
		);
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
			style: { spacing: { blockGap: { top: '7px', left: '9px' } } },
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

	test('a gallery carries an image from outside the library by its address', async ({
		admin,
		editor,
		page,
	}) => {
		const outside = 'https://example.com/outside.jpg';

		await admin.createNewPost({
			postType: 'page',
			showWelcomeGuide: false,
			legacyCanvas: true,
		});

		await editor.insertBlock({
			name: 'core/gallery',
			attributes: { linkTo: 'media' },
			innerBlocks: [
				{
					name: 'core/image',
					attributes: { id: images[0].id, url: images[0].url },
				},
				{
					name: 'core/image',
					attributes: {
						url: outside,
						alt: 'Outside alt',
						caption: 'Outside caption',
						// The size it is shown at, not the size of the picture.
						width: '120px',
						height: '80px',
					},
				},
			],
		});

		await transformToLoop(page, editor, 'Gallery');

		const [loop] = await editor.getBlocks();
		const [inLibrary, outsideImage] = loop.attributes.imagesQuery.images;

		expect(inLibrary.id).toBe(images[0].id);
		expect(outsideImage).toEqual({
			imgUrl: outside,
			imgThumbnailUrl: outside,
			title: 'Outside caption',
			alt: 'Outside alt',
		});
		expect(loop.innerBlocks[0].innerBlocks[0].attributes.clickAction).toBe(
			'popup'
		);
	});

	test('a gallery whose images link elsewhere keeps the links beside the lightbox', async ({
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
			attributes: { linkTo: 'none' },
			innerBlocks: [
				{
					name: 'core/image',
					attributes: {
						id: images[0].id,
						url: images[0].url,
						linkDestination: 'custom',
						href: 'https://example.com/elsewhere/',
					},
				},
				{
					name: 'core/image',
					attributes: { id: images[1].id, url: images[1].url },
				},
			],
		});

		await transformToLoop(page, editor, 'Gallery');

		const [loop] = await editor.getBlocks();

		expect(
			loop.attributes.imagesQuery.images.map(({ id, url }) => ({
				id,
				url,
			}))
		).toEqual([
			{ id: images[0].id, url: 'https://example.com/elsewhere/' },
			{ id: images[1].id, url: undefined },
		]);
		expect(loop.innerBlocks[0].innerBlocks[0].attributes.clickAction).toBe(
			'url-or-popup'
		);
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
				selectedAuthor: 1,
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
			postsQuery: {
				source: 'post',
				order: 'asc',
				orderBy: 'title',
				authors: [1],
				sticky: 'ignore',
			},
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
		expect(template.innerBlocks[0].attributes.sizeSlug).toBe('thumbnail');
		expect(template.innerBlocks[4].attributes).toMatchObject({
			source: 'excerpt',
			excerptLength: 20,
		});
	});

	test('a core query of picked posts keeps them, and one the loop cannot say is not offered', async ({
		admin,
		page,
	}) => {
		await admin.createNewPost({
			postType: 'page',
			showWelcomeGuide: false,
			legacyCanvas: true,
		});

		// The transform asks the editor's post types, loaded on demand.
		await page.evaluate(() =>
			window.wp.data.resolveSelect('core').getPostTypes({ per_page: -1 })
		);

		const switchQuery = (query) =>
			page.evaluate((attributes) => {
				const block = window.wp.blocks.createBlock('core/query', {
					query: attributes,
				});
				const switched = window.wp.blocks.switchToBlockType(
					block,
					'visual-portfolio/loop'
				);

				return switched ? switched[0].attributes.postsQuery : null;
			}, query);

		expect(
			await switchQuery({
				postType: 'post',
				include: [12, 7],
				orderBy: 'include',
			})
		).toMatchObject({ source: 'ids', ids: [12, 7], orderBy: 'post__in' });

		// Two categories OR'd with a tag AND'd: a loop joins all its terms
		// one way, so it cannot say this.
		expect(
			await switchQuery({
				postType: 'post',
				taxQuery: { include: { category: [1, 2], post_tag: [3] } },
			})
		).toBe(null);

		expect(
			await switchQuery({
				postType: 'post',
				taxQuery: { include: { category: [1], post_tag: [3] } },
			})
		).toMatchObject({ taxonomies: [1, 3], taxonomiesRelation: 'and' });
	});

	test('a core query loop becomes a loop of posts', async ({
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
			name: 'core/query',
			attributes: {
				queryId: 5,
				query: {
					perPage: 4,
					pages: 0,
					offset: 1,
					postType: 'post',
					order: 'asc',
					orderBy: 'title',
					author: '1',
					search: 'blog',
					exclude: [],
					sticky: 'exclude',
					inherit: false,
					taxQuery: { include: { category: [1] } },
					format: [],
				},
			},
			innerBlocks: [
				{
					name: 'core/post-template',
					attributes: { layout: { type: 'grid', columnCount: 3 } },
					innerBlocks: [
						{
							name: 'core/post-featured-image',
							attributes: {
								isLink: true,
								aspectRatio: '4/3',
								sizeSlug: 'medium',
							},
						},
						{
							name: 'core/post-title',
							attributes: { level: 4, isLink: true },
						},
						{ name: 'core/post-date' },
						{
							name: 'core/post-excerpt',
							attributes: { excerptLength: 20 },
						},
						{ name: 'core/post-time-to-read' },
						// No counterpart in a loop.
						{ name: 'core/post-content' },
					],
				},
				{
					name: 'core/query-pagination',
					innerBlocks: [
						{ name: 'core/query-pagination-previous' },
						{ name: 'core/query-pagination-numbers' },
						{ name: 'core/query-pagination-next' },
					],
				},
			],
		});

		await transformToLoop(page, editor, 'Query Loop');

		const [loop] = await editor.getBlocks();

		expect(loop.name).toBe('visual-portfolio/loop');
		expect(loop.attributes).toMatchObject({
			queryType: 'posts',
			baseQuery: { perPage: 4, maxPagesLimit: 0 },
			postsQuery: {
				source: 'post',
				order: 'asc',
				orderBy: 'title',
				offset: 1,
				authors: [1],
				sticky: 'exclude',
				keyword: 'blog',
				taxonomies: [1],
			},
		});

		const [template, pagination] = loop.innerBlocks;

		expect(template.name).toBe('visual-portfolio/item-template');
		expect(template.attributes).toMatchObject({
			layoutType: 'grid',
			layoutColumnsMode: 'manual',
			layoutColumnCount: 3,
		});
		expect(template.innerBlocks.map(({ name }) => name)).toEqual([
			'visual-portfolio/item-image',
			'visual-portfolio/item-title',
			'visual-portfolio/item-date',
			'visual-portfolio/item-description',
			'visual-portfolio/item-meta',
		]);
		expect(template.innerBlocks[4].attributes.metaType).toBe(
			'reading-time'
		);
		expect(template.innerBlocks[0].attributes).toMatchObject({
			clickAction: 'url',
			aspectRatio: '4/3',
			sizeSlug: 'medium',
		});
		expect(template.innerBlocks[1].attributes).toMatchObject({
			clickAction: 'url',
			level: 4,
		});
		expect(template.innerBlocks[3].attributes).toMatchObject({
			source: 'excerpt',
			excerptLength: 20,
		});

		expect(pagination.name).toBe('visual-portfolio/loop-pagination');
		expect(pagination.innerBlocks.map(({ name }) => name)).toEqual([
			'visual-portfolio/loop-pagination-previous',
			'visual-portfolio/loop-pagination-numbers',
			'visual-portfolio/loop-pagination-next',
		]);
	});

	const NUMBERS =
		'<!-- wp:visual-portfolio/loop-pagination --><!-- wp:visual-portfolio/loop-pagination-numbers /--><!-- /wp:visual-portfolio/loop-pagination -->';
	const TRIGGER =
		'<!-- wp:visual-portfolio/loop-pagination --><!-- wp:visual-portfolio/loop-pagination-trigger /--><!-- /wp:visual-portfolio/loop-pagination -->';

	/**
	 * Answer every `vp-loop-request` on the page the way `mode` says, and keep
	 * every `vp-loop-loaded` in `window.__vpLoaded`.
	 *
	 * Runs in the page before its scripts, so it cannot see anything of the
	 * spec. An answered page has its item titles changed from `Item` to
	 * `Answered`, which tells it apart from one the loop loaded itself.
	 *
	 * @param {string} mode - `answer`, `late` (the second page answers after
	 *                      2 s), `hang`, `reject` or `null`.
	 */
	function respond(mode) {
		window.__vpLoaded = [];

		window.document.addEventListener('vp-loop-loaded', ({ detail }) => {
			window.__vpLoaded.push({
				purpose: detail.purpose,
				page: new window.URL(detail.href).searchParams.get('vp-1-page'),
			});
		});

		window.document.addEventListener('vp-loop-request', ({ detail }) => {
			const answered = () =>
				window
					.fetch(detail.href)
					.then((response) => response.text())
					.then((html) =>
						html.replace(/Item ([A-F])/g, 'Answered $1')
					);

			if ('hang' === mode) {
				detail.respondWith(new Promise(() => {}));
			} else if ('reject' === mode) {
				detail.respondWith(Promise.reject(new Error('No page')));
			} else if ('null' === mode) {
				detail.respondWith(null);
			} else if (
				'late' === mode &&
				'2' ===
					new window.URL(detail.href).searchParams.get('vp-1-page')
			) {
				detail.respondWith(
					new Promise((resolve) => {
						window.setTimeout(resolve, 2000);
					})
						.then(answered)
						.finally(() => {
							window.__vpLateDone = true;
						})
				);
			} else {
				detail.respondWith(answered());
			}
		});
	}

	/**
	 * Publish a page holding one loop of the images, answer its loads the way
	 * `mode` says, and open it.
	 *
	 * @param {Object} requestUtils - REST utils.
	 * @param {Object} page         - Playwright page.
	 * @param {string} title        - page title.
	 * @param {string} controls     - serialized control blocks after the items.
	 * @param {string} mode         - how `respond()` answers.
	 */
	async function publishAnsweredLoop(
		requestUtils,
		page,
		title,
		controls,
		mode
	) {
		const loop = {
			block_id: 'e2e-events',
			queryId: 1,
			queryType: 'images',
			baseQuery: { perPage: PER_PAGE, maxPages: 0 },
			imagesQuery: {
				images: images.map(({ id }, index) => ({
					id,
					title: `Item ${String.fromCharCode(65 + index)}`,
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

		await page.addInitScript(respond, mode);
		await page.goto(created.link, { waitUntil: 'load' });

		// A full page load would take the mark with it.
		await page.evaluate(() => {
			window.__vpSameDocument = true;
		});
	}

	test('a navigation takes the page a script answered with', async ({
		page,
		requestUtils,
	}) => {
		await publishAnsweredLoop(
			requestUtils,
			page,
			'Integrations - answered navigation',
			NUMBERS,
			'answer'
		);

		await page
			.locator(`${LOOP} .vp-block-loop-pagination-numbers a`, {
				hasText: '2',
			})
			.click();
		await expect(page.locator(`${LOOP} ${ITEM} ${TITLE}`)).toHaveText([
			'Answered C',
			'Answered D',
		]);

		expect(new URL(page.url()).searchParams.get('vp-1-page')).toBe('2');
		expect(await page.evaluate(() => window.__vpSameDocument)).toBe(true);
		await expect
			.poll(() => page.evaluate(() => window.__vpLoaded))
			.toEqual([{ purpose: 'navigate', page: '2' }]);
	});

	test('a later click wins over an earlier answer still on its way', async ({
		page,
		requestUtils,
	}) => {
		await publishAnsweredLoop(
			requestUtils,
			page,
			'Integrations - answered late',
			NUMBERS,
			'late'
		);

		const numbers = page.locator(
			`${LOOP} .vp-block-loop-pagination-numbers a`
		);

		await numbers.filter({ hasText: '2' }).click();
		await numbers.filter({ hasText: '3' }).click();

		await expect(page.locator(`${LOOP} ${ITEM} ${TITLE}`)).toHaveText([
			'Answered E',
			'Answered F',
		]);

		await expect
			.poll(() => page.evaluate(() => window.__vpLateDone))
			.toBe(true);
		// Room for a late navigation to land.
		await page.waitForTimeout(500);

		await expect(page.locator(`${LOOP} ${ITEM} ${TITLE}`)).toHaveText([
			'Answered E',
			'Answered F',
		]);
		expect(new URL(page.url()).searchParams.get('vp-1-page')).toBe('3');
	});

	test('an answer that never comes loads the address in full', async ({
		page,
		requestUtils,
	}) => {
		test.setTimeout(60000);

		await publishAnsweredLoop(
			requestUtils,
			page,
			'Integrations - answer that hangs',
			NUMBERS,
			'hang'
		);

		await page
			.locator(`${LOOP} .vp-block-loop-pagination-numbers a`, {
				hasText: '2',
			})
			.click();

		await page.waitForURL(/vp-1-page=2/, { timeout: 20000 });
		await expect(page.locator(`${LOOP} ${ITEM} ${TITLE}`)).toHaveText([
			'Item C',
			'Item D',
		]);
		expect(await page.evaluate(() => window.__vpSameDocument)).toBe(
			undefined
		);
	});

	for (const mode of ['reject', 'null']) {
		test(`a navigation answered with ${mode} loads the page itself`, async ({
			page,
			requestUtils,
		}) => {
			await publishAnsweredLoop(
				requestUtils,
				page,
				`Integrations - answered with ${mode}`,
				NUMBERS,
				mode
			);

			await page
				.locator(`${LOOP} .vp-block-loop-pagination-numbers a`, {
					hasText: '2',
				})
				.click();
			await expect(page.locator(`${LOOP} ${ITEM} ${TITLE}`)).toHaveText([
				'Item C',
				'Item D',
			]);

			expect(await page.evaluate(() => window.__vpSameDocument)).toBe(
				true
			);
		});
	}

	test('a load more does not wait on an answer that hangs', async ({
		page,
		requestUtils,
	}) => {
		test.setTimeout(60000);

		await publishAnsweredLoop(
			requestUtils,
			page,
			'Integrations - load more answer that hangs',
			TRIGGER,
			'hang'
		);

		await page.locator('.vp-block-loop-pagination-trigger').click();
		await expect(page.locator(`${LOOP} ${ITEM} ${TITLE}`)).toHaveText(
			['Item A', 'Item B', 'Item C', 'Item D'],
			{ timeout: 20000 }
		);
		expect(await page.evaluate(() => window.__vpSameDocument)).toBe(true);
	});

	test('a load more takes the page a script answered with', async ({
		page,
		requestUtils,
	}) => {
		await publishAnsweredLoop(
			requestUtils,
			page,
			'Integrations - answered load more',
			TRIGGER,
			'answer'
		);

		await page.locator('.vp-block-loop-pagination-trigger').click();
		await expect(page.locator(`${LOOP} ${ITEM} ${TITLE}`)).toHaveText([
			'Item A',
			'Item B',
			'Answered C',
			'Answered D',
		]);

		await expect
			.poll(() => page.evaluate(() => window.__vpLoaded))
			.toEqual([{ purpose: 'append', page: '2' }]);
	});
});
