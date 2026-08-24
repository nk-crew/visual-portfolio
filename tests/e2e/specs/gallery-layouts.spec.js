/**
 * Gallery Item Template: the layouts that are more than a grid.
 *
 * Tiles, justified and carousel are asserted against the rendered page, and
 * mostly against geometry - a layout is what the boxes ended up doing, and no
 * attribute or class proves that on its own.
 *
 * Pages are published straight through REST rather than built in the editor:
 * every test here is about the front end, and one of them runs with JavaScript
 * switched off, where the editor could not have built anything.
 */
import { expect, test } from '@wordpress/e2e-test-utils-playwright';
import { getEditorCanvas } from '../utils/editor-canvas';
import { getFixturePath } from '../utils/fixture-path';
import { getPluginSlug } from '../utils/plugin-slug';

const LIST = 'ul.wp-block-visual-portfolio-item-template';
const ITEM = '.wp-block-visual-portfolio-item-template__item';
const NAV = '.wp-block-visual-portfolio-item-template__carousel-nav';
// The arrows live in the frame around the list rather than in the nav under
// it: the list scrolls, and an arrow beside it has to stay put.
const FRAME = '.wp-block-visual-portfolio-item-template__carousel-frame';
const DOT = '.wp-block-visual-portfolio-item-template__carousel-dot';
const NEXT_ARROW =
	'.wp-block-visual-portfolio-item-template__carousel-arrow--next';
const LOAD_MORE = '.vp-block-loop-pagination-load-more';

const IMAGES_COUNT = 6;

// Two columns, then a tile twice as wide and twice as tall, then two more - the
// shape that proves spans, packing and the repeat of the pattern at once.
const TILES = '3|1,1|2,1|1,1|2,0.5|1,1|';

/**
 * Block markup of a loop around an item template.
 *
 * @param {Object} options            - loop options.
 * @param {string} options.blockId    - id the loop resolves its query with.
 * @param {Array}  options.images     - images of the source.
 * @param {Object} options.layout     - item template attributes.
 * @param {number} [options.perPage]  - items per page.
 * @param {Array}  [options.controls] - inner blocks of the pagination block.
 * @param {number} [options.queryId]  - id the URL parameters of the loop are named after.
 * @return {string} serialized blocks.
 */
function getLoopMarkup({
	blockId,
	images,
	layout,
	perPage = IMAGES_COUNT,
	controls = [],
	queryId = 1,
}) {
	const loop = {
		block_id: blockId,
		queryId,
		queryType: 'images',
		baseQuery: { perPage, maxPages: 0 },
		imagesQuery: { images },
	};

	const pagination = controls.length
		? `<!-- wp:visual-portfolio/loop-pagination -->${controls
				.map((name) => `<!-- wp:visual-portfolio/${name} /-->`)
				.join('')}<!-- /wp:visual-portfolio/loop-pagination -->`
		: '';

	return [
		`<!-- wp:visual-portfolio/loop ${JSON.stringify(loop)} -->`,
		'<div class="wp-block-visual-portfolio-loop vp-block-loop">',
		`<!-- wp:visual-portfolio/item-template ${JSON.stringify(layout)} -->`,
		// No aspect ratio on the image: justified measures the proportions of
		// the file, and an image forced into a square would be laid out to one
		// shape and drawn in another.
		'<!-- wp:visual-portfolio/item-image {"clickAction":"url"} /-->',
		'<!-- /wp:visual-portfolio/item-template -->',
		pagination,
		'</div>',
		'<!-- /wp:visual-portfolio/loop -->',
	].join('');
}

/**
 * Geometry of the items of a list.
 *
 * @param {import('@playwright/test').Page} page - page under test.
 * @return {Promise<Array>} `{ x, y, width, height, position }` per item.
 */
function getItemBoxes(page) {
	return page.locator(`${LIST} > ${ITEM}`).evaluateAll((nodes) =>
		nodes.map((node) => {
			const rect = node.getBoundingClientRect();
			const list = node.parentElement.getBoundingClientRect();

			return {
				x: Math.round(rect.x - list.x),
				y: Math.round(rect.y - list.y),
				width: Math.round(rect.width),
				height: Math.round(rect.height),
				position: window.getComputedStyle(node).position,

				// The box the layout gave the item, before any transform an
				// effect paints it with.
				layoutWidth: node.offsetWidth,
			};
		})
	);
}

test.describe('Gallery Item Template layouts', () => {
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

		// Justified reads the proportions of the images, so the layouts need
		// real ones rather than whatever a previous spec left behind.
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
	 * Publish a page holding one loop and open it.
	 *
	 * @param {Object} requestUtils - REST utils.
	 * @param {Object} page         - Playwright page.
	 * @param {Object} options      - see `getLoopMarkup()`, plus a title.
	 * @return {Promise<string>} URL of the published page.
	 */
	async function publishLoop(requestUtils, page, options) {
		const created = await requestUtils.rest({
			path: '/wp/v2/pages',
			method: 'POST',
			data: {
				title: options.title,
				status: 'publish',
				content: getLoopMarkup(options),
			},
		});

		pageIds.push(created.id);

		await page.goto(created.link, { waitUntil: 'domcontentloaded' });

		return created.link;
	}

	/**
	 * Publish a page holding several loops and open it.
	 *
	 * @param {Object} requestUtils - REST utils.
	 * @param {Object} page         - Playwright page.
	 * @param {string} title        - title of the page.
	 * @param {Array}  loops        - one options object per loop, see `getLoopMarkup()`.
	 * @return {Promise<string>} URL of the published page.
	 */
	async function publishLoops(requestUtils, page, title, loops) {
		const created = await requestUtils.rest({
			path: '/wp/v2/pages',
			method: 'POST',
			data: {
				title,
				status: 'publish',
				content: loops.map(getLoopMarkup).join(''),
			},
		});

		pageIds.push(created.id);

		await page.goto(created.link, { waitUntil: 'domcontentloaded' });

		return created.link;
	}

	test('tiles places every item the way the notation describes it', async ({
		page,
		requestUtils,
	}) => {
		await publishLoop(requestUtils, page, {
			title: 'Layouts - tiles',
			blockId: 'e2e-tiles',
			images,
			layout: {
				layoutType: 'tiles',
				layoutTiles: TILES,
				style: { spacing: { blockGap: '0px' } },
			},
		});

		const list = page.locator(LIST);

		await expect(list).toHaveClass(/vp-layout-tiles/);
		// The rules are scoped by a class derived from the pattern, so two
		// galleries describing the same tiles share one rule set.
		await expect(list).toHaveClass(/vp-tiles-[0-9a-f]{10}/);

		const boxes = await getItemBoxes(page);
		const unit = boxes[0].width;

		// A zero gap makes every number a whole multiple of a column, so the
		// notation can be read straight off the geometry.
		expect(boxes).toHaveLength(IMAGES_COUNT);
		expect(boxes[0]).toMatchObject({ x: 0, y: 0 });
		expect(boxes[0].height).toBeCloseTo(unit, -1);

		// `2,1` - two columns wide and, being twice as wide, twice as tall.
		expect(boxes[1].width).toBeCloseTo(unit * 2, -1);
		expect(boxes[1].height).toBeCloseTo(unit * 2, -1);
		expect(boxes[1].y).toBe(0);

		// The third tile falls into the hole the first one left rather than
		// starting a row of its own.
		expect(boxes[2].x).toBe(0);
		expect(boxes[2].y).toBeCloseTo(unit, -1);

		// `2,0.5` - two columns wide and half of that tall.
		expect(boxes[3].width).toBeCloseTo(unit * 2, -1);
		expect(boxes[3].height).toBeCloseTo(unit, -1);
	});

	test('tiles collapse to one column on a phone', async ({
		page,
		requestUtils,
	}) => {
		await publishLoop(requestUtils, page, {
			title: 'Layouts - tiles narrow',
			blockId: 'e2e-tiles-narrow',
			images,
			layout: {
				layoutType: 'tiles',
				layoutTiles: TILES,
				style: { spacing: { blockGap: '0px' } },
			},
		});

		await page.setViewportSize({ width: 390, height: 900 });

		const columns = await page
			.locator(LIST)
			.evaluate((node) =>
				window
					.getComputedStyle(node)
					.getPropertyValue('--vp-layout-current-columns')
					.trim()
			);

		// The notation names three columns, and this test used to hold it to
		// three at every width. The legacy gallery stacked its tiles instead,
		// and three columns on a phone is three thumbnails a hundred pixels
		// wide, so the count now follows the screen like every other layout.
		expect(columns).toBe('1');

		const boxes = await getItemBoxes(page);

		// A tile wider than the grid is capped at the grid, so the one that
		// spans two of three columns is no wider than the one that spans one.
		expect(boxes[1].width).toBeCloseTo(boxes[0].width, -1);
	});

	test('justified lays the items into rows, and again after a load more', async ({
		page,
		requestUtils,
	}) => {
		await publishLoop(requestUtils, page, {
			title: 'Layouts - justified',
			blockId: 'e2e-justified',
			images,
			perPage: 3,
			layout: {
				layoutType: 'justified',
				justifiedRowHeight: 200,
				style: { spacing: { blockGap: '10px' } },
			},
			controls: ['loop-pagination-load-more'],
		});

		const list = page.locator(LIST);

		await expect(list).toHaveClass(/vp-layout-justified/);
		// Added by the module, and what tells the stylesheet to stop growing the
		// items itself - the library sizes them from here on.
		await expect(list).toHaveClass(/vp-has-script/);

		// The library takes the items out of the flow to place them, which is
		// the only thing that says it ran rather than that CSS wrapped them.
		await expect
			.poll(
				async () =>
					(await getItemBoxes(page)).every(
						(item) => 'absolute' === item.position
					),
				{ timeout: 20000 }
			)
			.toBe(true);

		const rows = await getItemBoxes(page);

		// Every item of a row shares its height, and the row is near the height
		// that was asked for - never exactly, that is what justifying means.
		const firstRow = rows.filter((item) => item.y === rows[0].y);

		expect(firstRow.length).toBeGreaterThan(1);
		firstRow.forEach((item) => {
			// Row heights are fractional - a pixel of rounding between
			// neighbours is the library being exact, not being wrong.
			expect(Math.abs(item.height - firstRow[0].height)).toBeLessThan(2);
		});
		expect(firstRow[0].height).toBeGreaterThan(100);
		expect(firstRow[0].height).toBeLessThan(400);

		await page.locator(LOAD_MORE).click();
		await expect(page.locator(`${LIST} > ${ITEM}`)).toHaveCount(
			IMAGES_COUNT
		);

		// The appended items are laid out too: the list watches itself, because
		// the append is made by the loop store, which knows nothing about it.
		await expect
			.poll(
				async () =>
					(await getItemBoxes(page)).every(
						(item) => 'absolute' === item.position
					),
				{ timeout: 20000 }
			)
			.toBe(true);
	});

	test('carousel scrolls, snaps, takes the keyboard and moves with its controls', async ({
		page,
		requestUtils,
	}) => {
		await publishLoop(requestUtils, page, {
			title: 'Layouts - carousel',
			blockId: 'e2e-carousel',
			images,
			layout: {
				layoutType: 'carousel',
				layoutColumnsMode: 'manual',
				layoutColumnCount: 3,
				style: { spacing: { blockGap: '10px' } },
				carouselShowArrows: true,
				carouselIndicator: 'dots',
			},
		});

		const list = page.locator(LIST);

		await expect(list).toHaveClass(/vp-layout-carousel/);
		await expect(list).toHaveAttribute('tabindex', '0');

		const style = await list.evaluate((node) => {
			const computed = window.getComputedStyle(node);
			const item = node.querySelector(
				'.wp-block-visual-portfolio-item-template__item'
			);

			return {
				overflowX: computed.overflowX,
				snap: computed.scrollSnapType,
				itemSnap: window.getComputedStyle(item).scrollSnapAlign,
				overflows: node.scrollWidth > node.clientWidth,
			};
		});

		// The scroll container is the carousel. Everything else is decoration.
		expect(style).toEqual({
			overflowX: 'auto',
			snap: 'x mandatory',
			itemSnap: 'start',
			overflows: true,
		});

		// Focus and the arrow keys are the browser's, and they are what a
		// visitor without a mouse uses. The key is pressed again on every poll:
		// the first one can land while the images are still settling the layout,
		// and a scroll container that has just been resized keeps its offset.
		await expect
			.poll(
				async () => {
					await list.focus();
					await page.keyboard.press('ArrowRight');

					return list.evaluate((node) => node.scrollLeft);
				},
				{ timeout: 10000 }
			)
			.toBeGreaterThan(0);

		await page.locator(`${NAV} ${DOT}`).first().click();
		await expect
			.poll(async () => list.evaluate((node) => node.scrollLeft), {
				timeout: 10000,
			})
			.toBe(0);

		await page.locator(`${FRAME} ${NEXT_ARROW}`).click();
		await expect
			.poll(async () => list.evaluate((node) => node.scrollLeft), {
				timeout: 10000,
			})
			.toBeGreaterThan(0);

		// The dot of the slide the carousel came to rest on is the current one.
		await expect
			.poll(async () =>
				page
					.locator(`${NAV} ${DOT}[aria-current="true"]`)
					.first()
					.getAttribute('data-vp-slide')
			)
			.not.toBe('0');
	});

	test('coverflow leaves the carousel alone where it is not understood', async ({
		page,
		requestUtils,
	}) => {
		const layout = {
			layoutType: 'carousel',
			layoutColumnsMode: 'manual',
			layoutColumnCount: 3,
			style: { spacing: { blockGap: '10px' } },
			carouselShowArrows: false,
		};

		await publishLoop(requestUtils, page, {
			title: 'Layouts - carousel plain',
			blockId: 'e2e-carousel-plain',
			images,
			layout,
		});

		const plain = await getItemBoxes(page);

		await publishLoop(requestUtils, page, {
			title: 'Layouts - carousel coverflow',
			blockId: 'e2e-carousel-coverflow',
			images,
			layout: { ...layout, carouselEffect: 'coverflow' },
		});

		await expect(page.locator(LIST)).toHaveClass(/vp-carousel-coverflow/);

		// The effect is a scroll driven animation over the boxes the layout
		// already made, so the layout is the same either way - which is also
		// what a browser without the timeline is left with. The painted boxes
		// are not compared: turning a slide in perspective is the effect.
		const coverflow = await getItemBoxes(page);

		expect(coverflow.map((item) => item.layoutWidth)).toEqual(
			plain.map((item) => item.layoutWidth)
		);
	});

	test.describe('without JavaScript', () => {
		test.use({ javaScriptEnabled: false });

		test('a carousel still scrolls and hides the controls it cannot drive', async ({
			page,
			requestUtils,
		}) => {
			await publishLoop(requestUtils, page, {
				title: 'Layouts - carousel no js',
				blockId: 'e2e-carousel-nojs',
				images,
				layout: {
					layoutType: 'carousel',
					layoutColumnsMode: 'manual',
					layoutColumnCount: 3,
					style: { spacing: { blockGap: '10px' } },
					carouselShowArrows: true,
					carouselIndicator: 'dots',
				},
			});

			const list = page.locator(LIST);

			await expect(list).toHaveClass(/vp-layout-carousel/);
			// Never added, because nothing added it: the controls move the
			// scroll container through an API with nobody to call it.
			await expect(list).not.toHaveClass(/vp-has-script/);
			await expect(page.locator(NAV)).toBeHidden();

			// The carousel itself is untouched - a scroll container that swipes
			// and takes the keyboard on its own.
			expect(
				await list.evaluate((node) => ({
					overflowX: window.getComputedStyle(node).overflowX,
					overflows: node.scrollWidth > node.clientWidth,
				}))
			).toEqual({ overflowX: 'auto', overflows: true });
		});
	});

	test('a load more lays out its own loop and leaves the one beside it alone', async ({
		page,
		requestUtils,
	}) => {
		await publishLoops(
			requestUtils,
			page,
			'Layouts - masonry beside carousel',
			[
				{
					blockId: 'e2e-mixed-masonry',
					queryId: 1,
					images,
					layout: {
						layoutType: 'masonry',
						layoutColumnsMode: 'manual',
						layoutColumnCount: 2,
					},
				},
				{
					blockId: 'e2e-mixed-carousel',
					queryId: 2,
					images,
					perPage: 3,
					layout: {
						layoutType: 'carousel',
						layoutColumnsMode: 'manual',
						layoutColumnCount: 3,
						style: { spacing: { blockGap: '10px' } },
					},
					controls: ['loop-pagination-load-more'],
				},
			]
		);

		const masonry = page.locator(LIST).first();
		const carousel = page.locator(LIST).nth(1);

		await expect(masonry).toHaveClass(/vp-layout-masonry/);
		await expect(carousel).toHaveClass(/vp-layout-carousel/);

		// Masonry positions what it lays out, which is also what puts the
		// library on the page - the reason the carousel below is in danger at
		// all.
		await expect
			.poll(
				async () =>
					masonry
						.locator(ITEM)
						.evaluateAll((nodes) =>
							nodes.every(
								(node) =>
									'absolute' ===
									window.getComputedStyle(node).position
							)
						),
				{ timeout: 20000 }
			)
			.toBe(true);

		await page.locator(LOAD_MORE).click();
		await expect(carousel.locator(ITEM)).toHaveCount(IMAGES_COUNT);

		// The loop that loaded is a carousel, and a carousel is a row of items
		// in the flow. Laying it out again means laying out a carousel, not
		// reaching for the engine the loop above it happens to have loaded.
		const positioned = await carousel
			.locator(ITEM)
			.evaluateAll((nodes) =>
				nodes.some(
					(node) =>
						'absolute' === window.getComputedStyle(node).position
				)
			);

		expect(positioned).toBe(false);
		// Masonry writes the height of the container it took over.
		expect(await carousel.evaluate((node) => node.style.height)).toBe('');
	});

	test('masonry leaves the layout to the browser where Grid Lanes exists', async ({
		page,
		requestUtils,
	}) => {
		// Grid Lanes is behind a flag in the engine these tests run on, so the
		// support answer is the one thing that has to be staged. Everything
		// after it is the code deciding for itself.
		await page.addInitScript(() => {
			const supports = window.CSS.supports.bind(window.CSS);

			window.CSS.supports = (...args) =>
				'display' === args[0] && 'grid-lanes' === args[1]
					? true
					: supports(...args);
		});

		await publishLoop(requestUtils, page, {
			title: 'Layouts - masonry native',
			blockId: 'e2e-masonry-native',
			images,
			layout: {
				layoutType: 'masonry',
				layoutColumnsMode: 'manual',
				layoutColumnCount: 2,
			},
		});

		const list = page.locator(LIST);

		await expect(list).toHaveClass(/vp-layout-masonry-native/);
		// The class the family store starts Masonry from is gone, so it never
		// does - and the items stay in the flow the stylesheet put them in.
		await expect(list).not.toHaveClass(/vp-layout-masonry(\s|$)/);

		await page.waitForTimeout(2000);

		const boxes = await getItemBoxes(page);

		expect(boxes.every((item) => 'absolute' !== item.position)).toBe(true);
	});

	test('a region swap keeps the layout it navigated with', async ({
		page,
		requestUtils,
	}) => {
		await publishLoop(requestUtils, page, {
			title: 'Layouts - tiles paged',
			blockId: 'e2e-tiles-paged',
			images,
			perPage: 3,
			layout: {
				layoutType: 'tiles',
				layoutTiles: TILES,
				style: { spacing: { blockGap: '0px' } },
			},
			controls: ['loop-pagination-numbers'],
		});

		const list = page.locator(LIST);
		const before = await getItemBoxes(page);

		await page
			.locator('.vp-block-loop-pagination-numbers a')
			.filter({ hasText: '2' })
			.first()
			.click();

		await expect(page).toHaveURL(/vp-\d+-page=2/);

		// The swapped in region is a fresh server render, so the layout has to
		// come back with it - class, scoped rules and all.
		await expect(list).toHaveClass(/vp-layout-tiles/);
		await expect(list).toHaveClass(/vp-tiles-[0-9a-f]{10}/);

		const after = await getItemBoxes(page);

		expect(after[0].width).toBe(before[0].width);
		expect(after[1].width).toBeCloseTo(after[0].width * 2, -1);
	});

	test('the editor draws the layout the moment it is picked', async ({
		page,
		admin,
		editor,
	}) => {
		await admin.createNewPost({
			title: 'Layouts - editor',
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
					attributes: { layoutType: 'grid' },
					innerBlocks: [
						{
							name: 'visual-portfolio/item-image',
							attributes: { aspectRatio: '1' },
						},
					],
				},
			],
		});

		const canvas = getEditorCanvas(page, editor);
		const list = canvas.locator(LIST);

		await expect(list).toHaveClass(/vp-layout-grid/);

		await editor.selectBlocks(
			canvas.locator('[data-type="visual-portfolio/item-template"]')
		);
		await editor.openDocumentSettingsSidebar();

		await page
			.getByRole('combobox', { name: 'Type' })
			.selectOption('tiles');

		// The preview is the same items rearranged - the endpoint is not asked
		// again, and the pattern is applied straight to the boxes.
		await expect(list).toHaveClass(/vp-layout-tiles/);

		// The default pattern is a plain three column grid of squares, so the
		// picker has to be able to change it. Every preset is drawn from the
		// notation it stands for and named after it.
		await expect(page.locator('.vp-tiles-preset')).not.toHaveCount(0);
		await page.locator(`.vp-tiles-preset[aria-label="${TILES}"]`).click();

		// The editable item is shadowed by a hidden preview of itself, so the
		// second tile of the pattern is the third node in the list.
		await expect(list.locator(ITEM).nth(2)).toHaveCSS(
			'grid-column-start',
			'span 2'
		);
	});
});
