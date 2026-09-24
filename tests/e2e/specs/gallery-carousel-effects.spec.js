/**
 * Gallery Item Template: the carousel effects, and the timelines kept by hand
 * where the browser has none.
 *
 * Every effect is a scroll driven animation. Firefox and Safari before 26
 * have no timeline to play one on, so the plugin keeps the timelines by hand
 * there, on the page and in the editor preview - for its own effects and for
 * any an install adds.
 */

/**
 * WordPress dependencies
 */
import { expect, test } from '@wordpress/e2e-test-utils-playwright';

/**
 * Internal dependencies
 */
import { getEditorCanvas } from '../utils/editor-canvas';
import { getFixturePath } from '../utils/fixture-path';
import { getPluginSlug } from '../utils/plugin-slug';

const LIST = 'ul.wp-block-visual-portfolio-item-template';

const IMAGES_COUNT = 6;

test.describe('Carousel effects', () => {
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

		images = media.map((item) => ({ id: item.id }));

		while (images.length < IMAGES_COUNT) {
			const uploaded = await requestUtils.uploadMedia(
				getFixturePath('image-800x600.png')
			);

			images.push({ id: uploaded.id });
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

	/**
	 * Publish a page holding one loop, and open it.
	 *
	 * @param {Object} requestUtils - REST utils.
	 * @param {Object} page         - Playwright page.
	 * @param {Object} options      - `title`, `blockId`, `images`, `layout`.
	 * @return {Promise<string>} link of the page.
	 */
	async function publishLoop(requestUtils, page, { title, blockId, layout }) {
		const loop = {
			block_id: blockId,
			queryId: 1,
			queryType: 'images',
			baseQuery: { perPage: IMAGES_COUNT, maxPages: 0 },
			imagesQuery: { images },
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
					`<!-- wp:visual-portfolio/item-template ${JSON.stringify(layout)} -->`,
					'<!-- wp:visual-portfolio/item-image /-->',
					'<!-- /wp:visual-portfolio/item-template -->',
					'</div>',
					'<!-- /wp:visual-portfolio/loop -->',
				].join(''),
			},
		});

		pageIds.push(created.id);

		await page.goto(created.link, { waitUntil: 'domcontentloaded' });

		return created.link;
	}

	test('a fade carousel shows one slide over the width', async ({
		page,
		requestUtils,
	}) => {
		await publishLoop(requestUtils, page, {
			title: 'Carousel effects - fade',
			blockId: 'e2e-fade',
			layout: {
				layoutType: 'carousel',
				layoutColumnsMode: 'manual',
				layoutColumnCount: 3,
				carouselEffect: 'fade',
			},
		});

		const list = page.locator(LIST);

		await expect(list).toHaveClass(/vp-carousel-fade/);

		// The effect owns the width, so the count of three is not applied.
		const widths = await list.evaluate((node) => [
			node.clientWidth,
			node
				.querySelector('.wp-block-visual-portfolio-item-template__item')
				.getBoundingClientRect().width,
		]);

		expect(Math.round(widths[1])).toBe(Math.round(widths[0]));

		// The suite runs with reduced motion, and a visitor who asked for it
		// gets the plain carousel under the fade.
		expect(
			await list
				.locator('.wp-block-visual-portfolio-item-template__card')
				.first()
				.evaluate((card) => window.getComputedStyle(card).animationName)
		).toBe('none');
	});

	test('a visitor who asked for less motion gets the plain carousel', async ({
		page,
		requestUtils,
	}) => {
		// The suite asks for less motion.
		await publishLoop(requestUtils, page, {
			title: 'Carousel effects - coverflow, less motion',
			blockId: 'e2e-coverflow-reduced',
			layout: {
				layoutType: 'carousel',
				layoutColumnsMode: 'manual',
				layoutColumnCount: 3,
				carouselEffect: 'coverflow',
			},
		});

		const list = page.locator(LIST);

		await expect(list).toHaveClass(/vp-carousel-coverflow/);

		// No turn, and no card twice the width of its slide.
		expect(
			await list.evaluate((node) => {
				const slide = node.querySelector(
					'.wp-block-visual-portfolio-item-template__slide'
				);

				return [
					window.getComputedStyle(slide.firstElementChild)
						.animationName,
					slide.offsetWidth === slide.parentElement.offsetWidth,
				];
			})
		).toEqual(['none', true]);
	});

	// Chromium measures an RTL list's view timelines from the wrong end, so
	// the module keeps them there too, and the cards are turned the other
	// way.
	test.describe('an effect under RTL', () => {
		test.use({
			contextOptions: {
				reducedMotion: 'no-preference',
				strictSelectors: true,
			},
		});

		test('rests the card on show over its own slide', async ({
			page,
			requestUtils,
		}) => {
			await page.addInitScript(() => {
				document.addEventListener('readystatechange', () => {
					document.documentElement.dir = 'rtl';
				});
			});

			await publishLoop(requestUtils, page, {
				title: 'Carousel effects - fade under RTL',
				blockId: 'e2e-fade-rtl',
				layout: {
					layoutType: 'carousel',
					carouselEffect: 'fade',
				},
			});

			const list = page.locator(LIST);

			await expect(list).toHaveClass(/vp-carousel-scripted/);

			// At rest the first card is shown over the frame, and the next
			// waits hidden, the way LTR draws them.
			await expect
				.poll(() =>
					list.evaluate((node) => {
						const frame = node.getBoundingClientRect();

						return Array.from(
							node.querySelectorAll(
								'.wp-block-visual-portfolio-item-template__card'
							),
							(card) => {
								const box = card.getBoundingClientRect();

								return `${Math.round(frame.right - box.right)} ${window.getComputedStyle(card).visibility}`;
							}
						).slice(0, 2);
					})
				)
				.toEqual(['0 visible', '0 hidden']);
		});
	});

	// The module keeps the timelines of an effect where the browser has none
	// - Firefox, Safari before 26 - and the browser here has them, so the
	// question the module asks of `CSS.supports` is answered for it before
	// the page loads. What the stylesheet then makes of the numbers is
	// Firefox's to show; what is checked here is the numbers. The suite runs
	// with reduced motion, and a visitor who asked for that is left the plain
	// carousel, so this runs without it.
	test.describe('an effect where the browser has no timelines', () => {
		test.use({
			contextOptions: {
				reducedMotion: 'no-preference',
				strictSelectors: true,
			},
		});

		test('the module writes where every slide is, and keeps it written', async ({
			page,
			requestUtils,
		}) => {
			await page.addInitScript(() => {
				const supports = window.CSS.supports.bind(window.CSS);

				window.CSS.supports = (...args) =>
					!String(args[0]).includes('animation-timeline') &&
					supports(...args);
			});

			await publishLoop(requestUtils, page, {
				title: 'Carousel effects - scripted timelines',
				blockId: 'e2e-scripted-timelines',
				images,
				layout: {
					layoutType: 'carousel',
					layoutColumnsMode: 'manual',
					layoutColumnCount: 2,
					carouselEffect: 'slideshow',
				},
			});

			const list = page.locator(LIST);

			// The mark the scripted rules apply to.
			await expect(list).toHaveClass(/vp-carousel-scripted/);

			// How far through `cover` each slide is: from its first edge
			// entering the frame at 0 to its last edge leaving at 1. A
			// slideshow shows one slide over the frame, so at rest the first
			// is halfway through, the next is waiting at the edge, and the
			// one after that is a whole slide off.
			const covered = () =>
				list.evaluate((node) =>
					Array.from(
						node.querySelectorAll(
							'.wp-block-visual-portfolio-item-template__item'
						),
						(item) =>
							parseFloat(
								item.style.getPropertyValue(
									'--vp-carousel-cover'
								)
							)
					).slice(0, 3)
				);

			await expect
				.poll(covered, { timeout: 10000 })
				.toEqual([0.5, 0, -0.5]);

			// Scrolled a slide on, every number moves a half with it.
			await list.evaluate((node) => {
				node.scrollTo({ left: node.clientWidth, behavior: 'instant' });
			});

			await expect.poll(covered, { timeout: 10000 }).toEqual([1, 0.5, 0]);
		});

		test('the module starts once less motion is no longer asked for', async ({
			page,
			requestUtils,
		}) => {
			await page.addInitScript(() => {
				const supports = window.CSS.supports.bind(window.CSS);

				window.CSS.supports = (...args) =>
					!String(args[0]).includes('animation-timeline') &&
					supports(...args);
			});
			await page.emulateMedia({ reducedMotion: 'reduce' });

			await publishLoop(requestUtils, page, {
				title: 'Carousel effects - motion switched on',
				blockId: 'e2e-motion-switch',
				layout: {
					layoutType: 'carousel',
					carouselEffect: 'slideshow',
				},
			});

			const list = page.locator(LIST);

			await expect(list).toHaveClass(/vp-has-script/);
			await expect(list).not.toHaveClass(/vp-carousel-scripted/);

			// The visitor switches the setting off without leaving the page.
			await page.emulateMedia({ reducedMotion: 'no-preference' });

			await expect(list).toHaveClass(/vp-carousel-scripted/);
		});

		test('the editor preview keeps them the same way', async ({
			page,
			admin,
			editor,
		}) => {
			await page.addInitScript(() => {
				const supports = window.CSS.supports.bind(window.CSS);

				window.CSS.supports = (...args) =>
					!String(args[0]).includes('animation-timeline') &&
					supports(...args);
			});

			await admin.createNewPost({
				title: 'Carousel effects - scripted timelines in the editor',
				postType: 'page',
				showWelcomeGuide: false,
				legacyCanvas: true,
			});

			await editor.insertBlock({
				name: 'visual-portfolio/loop',
				attributes: {
					baseQuery: { perPage: IMAGES_COUNT, maxPages: 1 },
					queryType: 'images',
					imagesQuery: { images },
				},
				innerBlocks: [
					{
						name: 'visual-portfolio/item-template',
						attributes: {
							layoutType: 'carousel',
							carouselEffect: 'slideshow',
						},
						innerBlocks: [{ name: 'visual-portfolio/item-image' }],
					},
				],
			});

			const list = getEditorCanvas(page, editor).locator(LIST);

			await expect(list).toHaveClass(/vp-carousel-scripted/);
			await expect
				.poll(
					() =>
						list.evaluate((node) =>
							node
								.querySelector(
									'.wp-block-visual-portfolio-item-template__item'
								)
								.style.getPropertyValue('--vp-carousel-cover')
						),
					{ timeout: 10000 }
				)
				.toBe('0.5000');

			// Selecting a block inside rewrites the class of the list, and the
			// mark is put back.
			const [template] = (await editor.getBlocks({ full: true }))[0]
				.innerBlocks;

			await page.evaluate((id) => {
				window.wp.data.dispatch('core/block-editor').selectBlock(id);
			}, template.innerBlocks[0].clientId);

			await expect(list).toHaveClass(/has-child-selected/);
			await expect(list).toHaveClass(/vp-carousel-scripted/);

			// Switched off, the effect takes its numbers with it: the preview
			// is a plain carousel again, the way the page would be.
			await page.evaluate((id) => {
				window.wp.data
					.dispatch('core/block-editor')
					.updateBlockAttributes(id, { carouselEffect: 'none' });
			}, template.clientId);

			await expect(list).not.toHaveClass(/vp-carousel-scripted/);
		});
	});
});
