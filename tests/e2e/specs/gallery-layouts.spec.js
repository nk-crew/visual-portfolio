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
// What a carousel is steered with is a set of blocks beside the gallery rather
// than markup inside it, so the loop is the box everything about a running
// carousel is published on - and the box a control is looked for in.
const CAROUSEL = '.vp-block-loop';
const NAV = '.vp-block-loop-carousel-nav';
const FRAME = '.wp-block-visual-portfolio-item-template__carousel-frame';
const DOT = '.vp-block-loop-carousel-dot';
const PREV_ARROW = '.vp-block-loop-carousel-previous';
const NEXT_ARROW = '.vp-block-loop-carousel-next';
const LOAD_MORE = '.vp-block-loop-pagination-trigger';

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
 * @param {Array}  [options.carousel] - carousel controls, `name` or `[name, attributes]`.
 * @param {boolean} [options.carouselOverlay] - put the controls inside the item template, over the slides.
 * @param {number} [options.queryId]  - id the URL parameters of the loop are named after.
 * @return {string} serialized blocks.
 */
function getLoopMarkup({
	blockId,
	images,
	layout,
	perPage = IMAGES_COUNT,
	controls = [],
	carousel = [],
	carouselOverlay = false,
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

	// The controls of a carousel are blocks of their own, and this row is only
	// the usual place to keep them: beside the item template they sit below
	// the gallery, and inside it they are laid over the slides.
	const carouselNav = carousel.length
		? `<!-- wp:visual-portfolio/loop-carousel-nav -->${carousel
				.map((control) => {
					const [name, attributes] = Array.isArray(control)
						? control
						: [control, null];

					return attributes
						? `<!-- wp:visual-portfolio/${name} ${JSON.stringify(attributes)} /-->`
						: `<!-- wp:visual-portfolio/${name} /-->`;
				})
				.join('')}<!-- /wp:visual-portfolio/loop-carousel-nav -->`
		: '';

	return [
		`<!-- wp:visual-portfolio/loop ${JSON.stringify(loop)} -->`,
		'<div class="wp-block-visual-portfolio-loop vp-block-loop">',
		`<!-- wp:visual-portfolio/item-template ${JSON.stringify(layout)} -->`,
		// No aspect ratio on the image: justified measures the proportions of
		// the file, and an image forced into a square would be laid out to one
		// shape and drawn in another.
		'<!-- wp:visual-portfolio/item-image {"clickAction":"url"} /-->',
		carouselOverlay ? carouselNav : '',
		'<!-- /wp:visual-portfolio/item-template -->',
		carouselOverlay ? '' : carouselNav,
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

/**
 * Wait until a carousel has come to rest.
 *
 * A scroll asked for while the browser is running one of its own - the snap it
 * runs after an arrow key, the glide it gives a smooth scroll - leaves the
 * carousel a few pixels short of wherever it was sent, so a test that presses
 * something while one is still settling reads a position nobody asked for.
 *
 * @param {import('@playwright/test').Locator} list - the carousel.
 */
async function settle(list) {
	let before = null;

	await expect
		.poll(
			async () => {
				const now = await list.evaluate((node) =>
					Math.round(node.scrollLeft)
				);
				const still = now === before;

				before = now;

				return still;
			},
			{ timeout: 10000 }
		)
		.toBe(true);
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
			controls: ['loop-pagination-trigger'],
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
			},
			carousel: [
				'loop-carousel-previous',
				'loop-carousel-indicator',
				'loop-carousel-next',
			],
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

		// And the carousel is left to come to rest before it is asked to go
		// anywhere else. The poll above stops at the first reading above zero,
		// which is a frame in the middle of the snap the browser runs itself
		// after an arrow key - and a scroll asked for while the browser is
		// running one of its own leaves the carousel a few pixels short of
		// wherever it was sent.
		await settle(list);

		await page.locator(`${NAV} ${DOT}`).first().click();
		await expect
			.poll(async () => list.evaluate((node) => node.scrollLeft), {
				timeout: 10000,
			})
			.toBe(0);

		// The arrows are blocks beside the gallery rather than markup inside
		// it - the frame holds the list and nothing else.
		await expect(page.locator(`${FRAME} ${NEXT_ARROW}`)).toHaveCount(0);

		await page.locator(NEXT_ARROW).click();
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

	test('a centred carousel rests every slide in the middle, the first and the last included', async ({
		page,
		requestUtils,
	}) => {
		await publishLoop(requestUtils, page, {
			title: 'Layouts - carousel centred',
			blockId: 'e2e-carousel-centred',
			images,
			layout: {
				layoutType: 'carousel',
				layoutColumnsMode: 'manual',
				layoutColumnCount: 3,
				carouselSnapAlign: 'center',
			},
			carousel: [
				'loop-carousel-previous',
				'loop-carousel-indicator',
				'loop-carousel-next',
			],
		});

		const list = page.locator(LIST);
		const dots = page.locator(`${NAV} ${DOT}`);

		await expect(dots).toHaveCount(IMAGES_COUNT);

		// Padded so that the first slide sits in the middle: the list starts
		// at the first slide's resting place, and every slide after it has one
		// of its own. Without the padding the first slides all rested at the
		// start, and a press on the arrow - or on the second dot - went
		// nowhere.
		const centred = async (index) =>
			list.evaluate((node, slide) => {
				const item = node.children[slide].getBoundingClientRect();
				const box = node.getBoundingClientRect();

				return Math.abs(
					item.left + item.width / 2 - (box.left + box.width / 2)
				);
			}, index);

		expect(await centred(0)).toBeLessThan(2);

		await page.locator(NEXT_ARROW).click();
		await expect.poll(() => centred(1), { timeout: 10000 }).toBeLessThan(2);
		await expect(dots.nth(1)).toHaveAttribute('aria-current', 'true');

		// Back to the start, and the second dot is a place of its own.
		await page.locator(PREV_ARROW).click();
		await expect.poll(() => centred(0), { timeout: 10000 }).toBeLessThan(2);

		await dots.nth(1).click();
		await expect.poll(() => centred(1), { timeout: 10000 }).toBeLessThan(2);
	});

	test('a repeating carousel keeps the gap at its seam', async ({
		page,
		requestUtils,
	}) => {
		await publishLoop(requestUtils, page, {
			title: 'Layouts - carousel repeat',
			blockId: 'e2e-carousel-repeat',
			images,
			layout: {
				layoutType: 'carousel',
				layoutColumnsMode: 'manual',
				layoutColumnCount: 3,
				carouselRepeat: true,
			},
			carousel: ['loop-carousel-next'],
		});

		const list = page.locator(LIST);

		// The loop is the library's: as the carousel nears its end it moves
		// the first slides round to the far end, and the seam is where the
		// last slide meets the first one again. Measured in the frame the
		// scroll lands in - the snap pulls the carousel back to a slide right
		// after, and the library lays the loop out again for wherever it
		// rests.
		// The library that carries the loop is fetched by the module, and a
		// cold cache takes its time.
		await expect(list).toHaveAttribute('has-repeat', 'true', {
			timeout: 15000,
		});

		const seam = () =>
			list.evaluate(async (node) => {
				node.scrollLeft = node.scrollWidth - node.clientWidth - 100;

				await new Promise((resolve) =>
					window.requestAnimationFrame(() =>
						window.requestAnimationFrame(resolve)
					)
				);

				const items = Array.from(node.children);
				const first = items[0];
				const last = items[items.length - 1];

				if (!(parseFloat(first.style.translate) > 0)) {
					return null;
				}

				return {
					gap: parseFloat(window.getComputedStyle(node).gap),
					seam:
						first.getBoundingClientRect().left -
						last.getBoundingClientRect().right,
				};
			});

		let measured = null;

		await expect
			.poll(
				async () => {
					measured = await seam();

					return measured;
				},
				{ timeout: 10000 }
			)
			.not.toBeNull();

		// One gap, the same one the slides keep between themselves.
		expect(measured.seam).toBeCloseTo(measured.gap, 0);
	});

	test('a repeating carousel steps round its seam and its dots name every slide', async ({
		page,
		requestUtils,
	}) => {
		await publishLoop(requestUtils, page, {
			title: 'Layouts - carousel repeat steps',
			blockId: 'e2e-carousel-repeat-steps',
			images,
			layout: {
				layoutType: 'carousel',
				layoutColumnsMode: 'manual',
				layoutColumnCount: 2,
				carouselRepeat: true,
			},
			carousel: [
				'loop-carousel-previous',
				'loop-carousel-indicator',
				'loop-carousel-next',
			],
		});

		const list = page.locator(LIST);
		const dots = page.locator(`${NAV} ${DOT}`);

		// The library that carries the loop is fetched by the module, and a
		// cold cache takes its time.
		await expect(list).toHaveAttribute('has-repeat', 'true', {
			timeout: 15000,
		});
		await expect(dots).toHaveCount(IMAGES_COUNT);

		// The slide the carousel rests on, read the way the module reads it:
		// the position on a clock one period long, one step per slide.
		const resting = () =>
			list.evaluate((node) => {
				const items = node.children;
				const step = items[1].offsetLeft - items[0].offsetLeft;
				const period = items.length * step;
				// The first slide rests where the padding puts it.
				const origin = parseFloat(
					window.getComputedStyle(node).paddingInlineStart
				);
				const position =
					(((node.scrollLeft - origin) % period) + period) % period;

				return Math.round(position / step) % items.length;
			});

		// Opened on the first slide, drawn flush with the frame.
		await expect.poll(resting, { timeout: 10000 }).toBe(0);
		await expect
			.poll(
				() =>
					list.evaluate((node) =>
						Math.round(
							node.children[0].getBoundingClientRect().left -
								node.parentElement.getBoundingClientRect().left
						)
					),
				{ timeout: 10000 }
			)
			.toBe(0);

		const current = () =>
			dots.evaluateAll((nodes) =>
				nodes.findIndex(
					(dot) => 'true' === dot.getAttribute('aria-current')
				)
			);

		// The last two slides are places of their own - a dot for either of
		// them goes there and stays there.
		for (const index of [IMAGES_COUNT - 2, IMAGES_COUNT - 1]) {
			await dots.nth(index).click();
			await expect.poll(resting, { timeout: 10000 }).toBe(index);
			await expect.poll(current, { timeout: 10000 }).toBe(index);
		}

		// And the arrow steps on past the last slide to the first, across
		// the seam where the library wraps the scroll round.
		await page.locator(NEXT_ARROW).click();
		await expect.poll(resting, { timeout: 10000 }).toBe(0);
		await expect.poll(current, { timeout: 10000 }).toBe(0);

		await page.locator(NEXT_ARROW).click();
		await expect.poll(resting, { timeout: 10000 }).toBe(1);

		// Back across it the other way.
		await page.locator(PREV_ARROW).click();
		await page.locator(PREV_ARROW).click();
		await expect.poll(resting, { timeout: 10000 }).toBe(IMAGES_COUNT - 1);
		await expect.poll(current, { timeout: 10000 }).toBe(IMAGES_COUNT - 1);
	});

	test('a narrow screen draws the column count it was given', async ({
		page,
		requestUtils,
	}) => {
		await publishLoop(requestUtils, page, {
			title: 'Layouts - responsive columns',
			blockId: 'e2e-responsive-columns',
			images,
			layout: {
				layoutType: 'grid',
				layoutColumnsMode: 'manual',
				layoutColumnCount: 4,
				layoutColumnCountTablet: 3,
				layoutColumnCountMobile: 2,
			},
		});

		const list = page.locator(LIST);
		// How many items sit on the first row, which is the column count as a
		// visitor sees it.
		const columns = () =>
			list.evaluate((node) => {
				const items = Array.from(node.children);
				const top = items[0].getBoundingClientRect().top;

				return items.filter(
					(item) =>
						Math.abs(item.getBoundingClientRect().top - top) < 2
				).length;
			});

		await page.setViewportSize({ width: 1280, height: 900 });
		await expect.poll(columns, { timeout: 10000 }).toBe(4);

		// A tablet is 992px and narrower. Without a count of its own the
		// ladder would have stepped this down to three anyway, so the phone is
		// what proves the setting: the ladder gives one column there.
		await page.setViewportSize({ width: 900, height: 900 });
		await expect.poll(columns, { timeout: 10000 }).toBe(3);

		await page.setViewportSize({ width: 500, height: 900 });
		await expect.poll(columns, { timeout: 10000 }).toBe(2);
	});

	test('a carousel can be steered by its thumbnails', async ({
		page,
		requestUtils,
	}) => {
		await publishLoop(requestUtils, page, {
			title: 'Layouts - carousel thumbnails',
			blockId: 'e2e-carousel-thumbnails',
			images,
			layout: {
				layoutType: 'carousel',
				layoutColumnsMode: 'manual',
				layoutColumnCount: 2,
			},
			carousel: ['loop-carousel-next', 'loop-carousel-thumbnails'],
		});

		const list = page.locator(LIST);
		const thumbs = page.locator('.vp-block-loop-carousel-thumb');
		const current = () =>
			thumbs.evaluateAll((nodes) =>
				nodes.findIndex(
					(thumb) => 'true' === thumb.getAttribute('aria-current')
				)
			);

		// One per slide, in the order the slides are in.
		await expect(thumbs).toHaveCount(IMAGES_COUNT);
		await expect.poll(current, { timeout: 10000 }).toBe(0);

		// A press on a thumbnail takes the carousel to its slide.
		await thumbs.nth(3).click();
		await expect.poll(current, { timeout: 10000 }).toBe(3);
		await expect
			.poll(() => list.evaluate((node) => node.scrollLeft), {
				timeout: 10000,
			})
			.toBeGreaterThan(0);

		// And the carousel moved by its arrow lights the thumbnail it lands on.
		await page.locator(NEXT_ARROW).click();
		await expect.poll(current, { timeout: 10000 }).toBe(4);
	});

	test('the progress bar can be dragged and steered by the keyboard', async ({
		page,
		requestUtils,
	}) => {
		await publishLoop(requestUtils, page, {
			title: 'Layouts - carousel scrub',
			blockId: 'e2e-carousel-scrub',
			images,
			layout: {
				layoutType: 'carousel',
				layoutColumnsMode: 'manual',
				layoutColumnCount: 2,
			},
			carousel: [['loop-carousel-indicator', { indicator: 'progress' }]],
		});

		const list = page.locator(LIST);
		const bar = page.locator('.vp-block-loop-carousel-indicator--progress');
		const position = () => list.evaluate((node) => node.scrollLeft);

		// A bar that can be taken hold of is a slider and not a progress bar:
		// nothing would offer a visitor the arrow keys of a progress bar.
		await expect(bar).toHaveAttribute('role', 'slider');
		await expect(bar).toHaveAttribute('tabindex', '0');
		await expect(bar).toHaveAttribute(
			'aria-valuetext',
			`Slide 1 of ${IMAGES_COUNT}`
		);

		// Dragged to the far end, the carousel goes with it.
		const box = await bar.boundingBox();

		await page.mouse.move(box.x + 4, box.y + box.height / 2);
		await page.mouse.down();
		await page.mouse.move(box.x + box.width - 2, box.y + box.height / 2, {
			steps: 8,
		});
		await page.mouse.up();

		await expect.poll(position, { timeout: 10000 }).toBeGreaterThan(0);

		// Let go, the carousel rests on a slide rather than between two.
		await expect
			.poll(
				() =>
					list.evaluate((node) => {
						const items = node.children;
						const step = items[1].offsetLeft - items[0].offsetLeft;

						return Math.abs(node.scrollLeft % step) < 2;
					}),
				{ timeout: 10000 }
			)
			.toBe(true);

		// And the keyboard steps it, which is the whole point of the role.
		await page.keyboard.press('Home');
		await expect.poll(position, { timeout: 10000 }).toBe(0);

		await bar.focus();
		await page.keyboard.press('ArrowRight');
		await expect.poll(position, { timeout: 10000 }).toBeGreaterThan(0);
	});

	test('a carousel that moves on its own can be stopped', async ({
		page,
		requestUtils,
	}) => {
		// Playwright asks for less motion by default, and a carousel that was
		// asked for less motion never runs on its own.
		await page.emulateMedia({ reducedMotion: 'no-preference' });

		await publishLoop(requestUtils, page, {
			title: 'Layouts - carousel autoplay stop',
			blockId: 'e2e-carousel-autoplay-stop',
			images,
			layout: {
				layoutType: 'carousel',
				layoutColumnsMode: 'manual',
				layoutColumnCount: 2,
				carouselAutoplay: true,
				carouselAutoplayDelay: 2,
			},
			carousel: ['loop-carousel-autoplay', 'loop-carousel-indicator'],
		});

		const list = page.locator(LIST);
		const button = page.locator('.vp-block-loop-carousel-autoplay');
		const position = () => list.evaluate((node) => node.scrollLeft);

		// A carousel with autoplay wakes the button, the way a carousel wakes
		// an arrow.
		await expect(button).toBeVisible();
		await expect(button).toHaveAttribute('aria-pressed', 'false');

		// Pressed is stopped: the button holds the carousel down, and says so.
		await button.click();
		await expect(button).toHaveAttribute('aria-pressed', 'true');

		// And the indicator stops drawing a wait: a half filled pill on a
		// stopped carousel is a countdown that never ends.
		const fill = page.locator(
			'.vp-block-loop-carousel-dot-worm .vp-block-loop-carousel-dot-progress'
		);

		await expect
			.poll(
				() =>
					fill.evaluate((node) => node.getBoundingClientRect().width),
				{ timeout: 10000 }
			)
			.toBe(0);

		// The pointer is off the carousel and a whole delay has passed, and it
		// has still not moved.
		await page.mouse.move(0, 0);
		await page.waitForTimeout(2600);
		await expect.poll(position, { timeout: 1000 }).toBe(0);

		// A script releasing a hold of its own does not undo it. The Pro
		// lightbox holds autoplay while it is open and releases it on close,
		// and a carousel the visitor stopped must stay stopped through that.
		await list.dispatchEvent('vp-carousel-autoplay', {
			detail: { playing: true },
		});
		await page.waitForTimeout(2600);
		await expect.poll(position, { timeout: 1000 }).toBe(0);
		await expect(button).toHaveAttribute('aria-pressed', 'true');

		// And pressing it again lets the carousel run on.
		await button.click();
		await expect(button).toHaveAttribute('aria-pressed', 'false');
		await page.mouse.move(0, 0);
		await expect.poll(position, { timeout: 10000 }).toBeGreaterThan(0);
	});

	test('a play and pause button beside a carousel that never runs stays hidden', async ({
		page,
		requestUtils,
	}) => {
		await page.emulateMedia({ reducedMotion: 'no-preference' });

		await publishLoop(requestUtils, page, {
			title: 'Layouts - carousel autoplay absent',
			blockId: 'e2e-carousel-autoplay-absent',
			images,
			layout: {
				layoutType: 'carousel',
				layoutColumnsMode: 'manual',
				layoutColumnCount: 2,
			},
			carousel: ['loop-carousel-next', 'loop-carousel-autoplay'],
		});

		// The arrow wakes, because there is a carousel to move.
		await expect(page.locator(NEXT_ARROW)).toBeVisible();

		// The button does not: there is no autoplay for it to stop, and a
		// control that cannot do anything stays out of the way.
		await expect(
			page.locator('.vp-block-loop-carousel-autoplay')
		).toBeHidden();
	});

	test('an arrow can move a whole frame', async ({ page, requestUtils }) => {
		await publishLoop(requestUtils, page, {
			title: 'Layouts - carousel group step',
			blockId: 'e2e-carousel-group-step',
			images,
			layout: {
				layoutType: 'carousel',
				layoutColumnsMode: 'manual',
				layoutColumnCount: 2,
				carouselSlidesPerGroup: 2,
			},
			carousel: [
				'loop-carousel-previous',
				'loop-carousel-indicator',
				'loop-carousel-next',
			],
		});

		const dots = page.locator(`${NAV} ${DOT}`);
		const next = page.locator(NEXT_ARROW);
		const prev = page.locator(PREV_ARROW);
		const current = () =>
			dots.evaluateAll((nodes) =>
				nodes.findIndex(
					(dot) => 'true' === dot.getAttribute('aria-current')
				)
			);

		// A dot per frame rather than per slide: the slides in between are
		// scrolled past, and a dot for one of them would do nothing.
		await expect(dots).toHaveCount(IMAGES_COUNT / 2);
		await expect.poll(current, { timeout: 10000 }).toBe(0);

		// A swipe comes to rest where an arrow leaves the carousel: only the
		// slides that begin a frame are places it may stop at, and the last
		// slide, which is the end of the carousel whatever the step is.
		await expect
			.poll(
				() =>
					page
						.locator(`${LIST} > ${ITEM}`)
						.evaluateAll((nodes) =>
							nodes.map((node) =>
								node.classList.contains('vp-carousel-no-snap')
									? '-'
									: 'S'
							)
						),
				{ timeout: 10000 }
			)
			.toEqual(['S', '-', 'S', '-', 'S', 'S']);

		// Two slides a press rather than one, which is one frame along.
		await next.click();
		await expect.poll(current, { timeout: 10000 }).toBe(1);

		await next.click();
		await expect.poll(current, { timeout: 10000 }).toBe(2);
		await expect(next).toBeDisabled();

		// And back the same way.
		await prev.click();
		await expect.poll(current, { timeout: 10000 }).toBe(1);
	});

	test('an indicator names the frames a carousel steps between', async ({
		page,
		requestUtils,
	}) => {
		await publishLoop(requestUtils, page, {
			title: 'Layouts - carousel grouped dots',
			blockId: 'e2e-carousel-grouped-dots',
			images,
			layout: {
				layoutType: 'carousel',
				layoutColumnsMode: 'manual',
				layoutColumnCount: 2,
				carouselSlidesPerGroup: 2,
			},
			carousel: ['loop-carousel-indicator'],
		});

		const list = page.locator(LIST);
		const dots = page.locator(`${NAV} ${DOT}`);

		// Three frames of two slides, so three dots - one per place the
		// carousel can come to rest. A dot for a slide it scrolls past is a
		// dot that does nothing when pressed.
		await expect(dots).toHaveCount(IMAGES_COUNT / 2);
		await expect
			.poll(
				() =>
					dots.evaluateAll((nodes) =>
						nodes.map((dot) => dot.dataset.vpSlide)
					),
				{ timeout: 10000 }
			)
			.toEqual(['0', '2', '4']);

		// And each of them takes the carousel to its frame.
		await dots.nth(1).click();
		await expect
			.poll(() => list.evaluate((node) => node.scrollLeft), {
				timeout: 10000,
			})
			.toBeGreaterThan(0);
		await expect
			.poll(
				() =>
					dots.evaluateAll((nodes) =>
						nodes.findIndex(
							(dot) => 'true' === dot.getAttribute('aria-current')
						)
					),
				{ timeout: 10000 }
			)
			.toBe(1);
	});

	test('a step wider than the carousel still reaches its end', async ({
		page,
		requestUtils,
	}) => {
		await publishLoop(requestUtils, page, {
			title: 'Layouts - carousel group clamp',
			blockId: 'e2e-carousel-group-clamp',
			images,
			layout: {
				layoutType: 'carousel',
				layoutColumnsMode: 'manual',
				layoutColumnCount: 2,
				// A step wider than there are slides to take: asking for a
				// slide off the end used to be refused outright, and the arrow
				// did nothing at all.
				carouselSlidesPerGroup: 6,
			},
			carousel: ['loop-carousel-previous', 'loop-carousel-next'],
		});

		const list = page.locator(LIST);
		const next = page.locator(NEXT_ARROW);
		const prev = page.locator(PREV_ARROW);
		const atEnd = () =>
			list.evaluate(
				(node) =>
					node.scrollLeft >= node.scrollWidth - node.clientWidth - 1
			);

		await expect(prev).toBeDisabled();

		await next.click();
		await expect.poll(atEnd, { timeout: 10000 }).toBe(true);
		await expect(next).toBeDisabled();

		await prev.click();
		await expect
			.poll(() => list.evaluate((node) => node.scrollLeft), {
				timeout: 10000,
			})
			.toBe(0);
	});

	test('a counter names the slide on screen and how many there are', async ({
		page,
		requestUtils,
	}) => {
		await publishLoop(requestUtils, page, {
			title: 'Layouts - carousel counter',
			blockId: 'e2e-carousel-counter',
			images,
			layout: {
				layoutType: 'carousel',
				layoutColumnsMode: 'manual',
				layoutColumnCount: 2,
			},
			carousel: [
				'loop-carousel-previous',
				['loop-carousel-indicator', { indicator: 'counter' }],
				'loop-carousel-next',
			],
		});

		const counter = page.locator(
			`${NAV} .vp-block-loop-carousel-indicator--counter`
		);
		const current = counter.locator(
			'.vp-block-loop-carousel-counter-current'
		);

		// Counted from one, the way a visitor counts.
		await expect(current).toHaveText('1');
		await expect(
			counter.locator('.vp-block-loop-carousel-counter-total')
		).toHaveText(String(IMAGES_COUNT));

		await page.locator(NEXT_ARROW).click();
		await expect(current).toHaveText('2');

		await page.locator(PREV_ARROW).click();
		await expect(current).toHaveText('1');
	});

	test('the pill of an indicator crawls from one dot to the next', async ({
		page,
		requestUtils,
	}) => {
		await publishLoop(requestUtils, page, {
			title: 'Layouts - carousel worm',
			blockId: 'e2e-carousel-worm',
			images,
			layout: {
				layoutType: 'carousel',
				layoutColumnsMode: 'manual',
				layoutColumnCount: 2,
			},
			carousel: [
				'loop-carousel-previous',
				'loop-carousel-indicator',
				'loop-carousel-next',
			],
		});

		const dots = page.locator(`${NAV} ${DOT}`);
		const worm = page.locator('.vp-block-loop-carousel-dot-worm');

		await expect(dots).toHaveCount(IMAGES_COUNT);

		// One pill for the row, and it is out of the reach of a pointer and a
		// screen reader: the dot underneath is the button.
		await expect(worm).toHaveCount(1);
		await expect(worm).toHaveAttribute('aria-hidden', 'true');

		const at = () =>
			worm.evaluate((node) => ({
				left: Math.round(parseFloat(node.style.insetInlineStart) || 0),
				width: Math.round(parseFloat(node.style.width) || 0),
			}));

		// It rests in the middle of the first slot: a 14px slot with an 18px
		// pill in it, drawn inside the 6px the row keeps at either end for
		// the dots to step aside into.
		await expect.poll(at, { timeout: 10000 }).toEqual({
			left: 4,
			width: 18,
		});

		// The row is exactly as wide with the first slide showing as with any
		// other - every slide keeps a slot of the same width, so a row centred
		// under a gallery does not slide from side to side as the carousel
		// moves. What makes room for the pill is the dots either side of it
		// stepping aside, which is a move and not a layout.
		const row = page.locator(
			`${NAV} .vp-block-loop-carousel-indicator--dots`
		);
		const spread = () =>
			row.evaluate((node) =>
				Math.round(node.getBoundingClientRect().width)
			);
		const before = await spread();

		// Where the dots have come to rest, from the middle of one to the
		// middle of the next.
		const gaps = () =>
			dots.evaluateAll((nodes) => {
				const centres = nodes.map((dot) => {
					const box = dot.getBoundingClientRect();

					return box.left + box.width / 2;
				});

				return centres
					.slice(1)
					.map((centre, index) =>
						Math.round(centre - centres[index])
					);
			});

		// And the pill moves along the row rather than being redrawn at the
		// far end of it.
		await page.locator(NEXT_ARROW).click();
		await expect
			.poll(async () => (await at()).left, { timeout: 10000 })
			.toBe(18);
		await expect
			.poll(async () => (await at()).width, { timeout: 10000 })
			.toBe(18);
		await expect.poll(spread, { timeout: 10000 }).toBe(before);

		// The dots either side of the pill have stood back to let it in: the
		// gap they leave it is a slot and the six pixels it is wider by, and
		// every other pair of dots is a plain slot apart.
		await expect
			.poll(async () => (await gaps()).slice(0, 2), { timeout: 10000 })
			.toEqual([20, 20]);
		await expect
			.poll(async () => (await gaps()).slice(2), { timeout: 10000 })
			.toEqual(Array.from({ length: IMAGES_COUNT - 3 }, () => 14));

		await page.locator(PREV_ARROW).click();
		await expect
			.poll(async () => (await at()).left, { timeout: 10000 })
			.toBe(4);
		await expect.poll(spread, { timeout: 10000 }).toBe(before);
	});

	test('a crawl interrupted carries on rather than jumping', async ({
		page,
		requestUtils,
	}) => {
		// The pill only crawls for a visitor who has not asked for less
		// motion; Playwright asks for less by default.
		await page.emulateMedia({ reducedMotion: 'no-preference' });

		await publishLoop(requestUtils, page, {
			title: 'Layouts - carousel worm interrupted',
			blockId: 'e2e-carousel-worm-interrupted',
			images,
			layout: {
				layoutType: 'carousel',
				layoutColumnsMode: 'manual',
				layoutColumnCount: 2,
			},
			carousel: ['loop-carousel-indicator', 'loop-carousel-next'],
		});

		const worm = page.locator('.vp-block-loop-carousel-dot-worm');

		await expect(worm).toHaveCount(1);

		// Two steps in quick succession, which is what a swipe does, with the
		// pill watched as it is drawn.
		await page.locator(NEXT_ARROW).click();
		await page.waitForTimeout(100);

		const watching = worm.evaluate(async (node) => {
			const seen = [];

			for (let i = 0; i < 14; i += 1) {
				const box = node.getBoundingClientRect();

				seen.push([box.left, box.width]);
				await new Promise((settle) => {
					window.requestAnimationFrame(() =>
						window.setTimeout(settle, 24)
					);
				});
			}

			return seen;
		});

		await page.locator(NEXT_ARROW).click();

		const seen = await watching;
		const steps = seen
			.slice(1)
			.map(([at], index) => Math.abs(at - seen[index][0]));

		// One dot is 14px along from the next. A crawl that carried on covers
		// that in steps of a pixel or two; one that began again at the far end
		// crossed most of it between two frames.
		expect(Math.max(...steps)).toBeLessThan(9);

		// And it stretches while it travels rather than sliding along at the
		// width of a dot: the edge in front leaves first and the one behind
		// follows, so a pill in motion spans the ground between two dots.
		const widths = seen.map(([, width]) => width);

		expect(Math.max(...widths)).toBeGreaterThan(24);

		// Stretching once and not once per slide. A pill that gathered itself
		// between the two steps and stretched again would grow, shrink and
		// grow - which is the pulsing a swipe used to show.
		const turns = widths
			.slice(1)
			.map((width, index) => Math.sign(Math.round(width - widths[index])))
			.filter(Boolean)
			.reduce(
				(count, way, index, ways) =>
					index && way !== ways[index - 1] ? count + 1 : count,
				0
			);

		expect(turns).toBeLessThanOrEqual(1);
	});

	test('the pill sits on its dot inside a box that is padded', async ({
		page,
		requestUtils,
	}) => {
		await publishLoop(requestUtils, page, {
			title: 'Layouts - carousel filled dots',
			blockId: 'e2e-carousel-filled-dots',
			images,
			layout: {
				layoutType: 'carousel',
				layoutColumnsMode: 'manual',
				layoutColumnCount: 2,
			},
			carousel: [
				['loop-carousel-indicator', { className: 'is-style-filled' }],
				'loop-carousel-next',
			],
		});

		const row = page.locator(
			`${NAV} .vp-block-loop-carousel-indicator--dots`
		);

		await expect(row).toHaveClass(/is-style-filled/);

		// The pill is placed against the box the row sits in, and this box
		// keeps a padding for itself - so the pill has to be placed inside it
		// rather than a padding to the left of the dot it names.
		const offset = () =>
			row.evaluate((node) => {
				const worm = node.querySelector(
					'.vp-block-loop-carousel-dot-worm'
				);
				const dot = node.querySelector(
					'.vp-block-loop-carousel-dot[aria-current="true"]'
				);

				if (!worm || !dot) {
					return null;
				}

				const pill = worm.getBoundingClientRect();
				const mark = dot.getBoundingClientRect();

				return Math.round(
					pill.left + pill.width / 2 - (mark.left + mark.width / 2)
				);
			});

		await expect.poll(offset, { timeout: 10000 }).toBe(0);

		await page.locator(NEXT_ARROW).click();
		await expect.poll(offset, { timeout: 10000 }).toBe(0);
	});

	test('an indicator given a window slides its dots under it', async ({
		page,
		requestUtils,
	}) => {
		await publishLoop(requestUtils, page, {
			title: 'Layouts - carousel dot window',
			blockId: 'e2e-carousel-dot-window',
			images,
			layout: {
				layoutType: 'carousel',
				layoutColumnsMode: 'manual',
				layoutColumnCount: 2,
			},
			carousel: [
				'loop-carousel-previous',
				['loop-carousel-indicator', { maxDots: 3 }],
				'loop-carousel-next',
			],
		});

		const dots = page.locator(`${NAV} ${DOT}`);
		const indicator = page.locator(
			`${NAV} .vp-block-loop-carousel-indicator--dots`
		);

		// Every slide keeps a dot of its own: the window only moves them, so
		// each one is still a button naming a slide and still reachable by
		// keyboard.
		await expect(dots).toHaveCount(IMAGES_COUNT);
		await expect(indicator).toHaveClass(/is-collapsed/);

		const shift = () =>
			indicator.evaluate((node) =>
				Math.round(
					parseFloat(
						node.style.getPropertyValue('--vp-carousel-dots-shift')
					) || 0
				)
			);

		// How many dots are drawn full size, which is the window itself.
		const whole = () =>
			dots.evaluateAll(
				(nodes) =>
					nodes.filter(
						(dot) =>
							!dot.classList.contains('is-edge') &&
							!dot.classList.contains('is-edge-far')
					).length
			);

		// At the start the row is flush: there are no slides before the first
		// one, so nothing shrinks on that side and nothing has moved.
		await expect.poll(shift, { timeout: 10000 }).toBe(0);
		await expect.poll(whole, { timeout: 10000 }).toBeLessThan(IMAGES_COUNT);

		// Every dot the window shows is a full sized target, however small the
		// mark drawn in it: the ones at the edge are what a visitor reaches
		// for to go further, and shrinking the button with the mark left them
		// too small to press.
		await expect
			.poll(
				() =>
					dots.evaluateAll((nodes) =>
						nodes
							.map((dot) =>
								Math.round(dot.getBoundingClientRect().width)
							)
							.filter(Boolean)
					),
				{ timeout: 10000 }
			)
			.toEqual(Array.from({ length: IMAGES_COUNT }, () => 14));

		// The pill is drawn over every dot, the one it names included. A dot
		// carries a translate, which puts it in the pill's own painting layer
		// and after it in the markup, so without saying otherwise the marks
		// are drawn on top of it - and while autoplay runs the pill is the
		// wait running down, which is the one thing in the row a visitor is
		// watching.
		await expect
			.poll(
				() =>
					indicator.evaluate((node) => [
						window.getComputedStyle(
							node.querySelector(
								'.vp-block-loop-carousel-dot-worm'
							)
						).zIndex,
						window.getComputedStyle(
							node.querySelector(
								'.vp-block-loop-carousel-dot[aria-current="true"]'
							)
						).zIndex,
					]),
				{ timeout: 10000 }
			)
			.toEqual(['2', '1']);

		// And pressing one moves the carousel. The row used to slide under the
		// pointer as the dot took focus, which took the dot out from under it
		// between pressing and letting go, so the press never became a click.
		const list = page.locator(LIST);
		const at = () => list.evaluate((node) => Math.round(node.scrollLeft));

		await dots.nth(2).click();
		await expect.poll(at, { timeout: 10000 }).toBeGreaterThan(0);

		const further = await at();

		await dots.nth(1).click();
		await expect.poll(at, { timeout: 10000 }).toBeLessThan(further);

		// A dot the window has moved past is clipped, so a pointer cannot
		// reach it - but it is still a button in the page, and tabbing to it
		// brings it back under the window rather than drawing a focus ring on
		// something nobody can see.
		const last = dots.nth(IMAGES_COUNT - 1);

		// Through the keyboard, which is the only way the row moves for a
		// focus: a press gives a dot focus too, and moving the row then would
		// take it out from under the pointer.
		await page.keyboard.press('Tab');
		await last.focus();
		await expect
			.poll(
				() =>
					last.evaluate((dot) =>
						dot.classList.contains('is-edge-far')
					),
				{ timeout: 10000 }
			)
			.toBe(false);
		await expect.poll(shift, { timeout: 10000 }).toBeLessThan(0);

		// And from there it works like any other dot.
		await page.keyboard.press('Enter');
		await expect
			.poll(() => last.getAttribute('aria-current'), { timeout: 10000 })
			.toBe('true');
	});

	test('autoplay runs only while the carousel is on screen', async ({
		page,
		requestUtils,
	}) => {
		await page.emulateMedia({ reducedMotion: 'no-preference' });

		// Pushed below the fold by a tall spacer.
		const created = await requestUtils.rest({
			path: '/wp/v2/pages',
			method: 'POST',
			data: {
				title: 'Layouts - carousel autoplay off screen',
				status: 'publish',
				content:
					'<!-- wp:spacer {"height":"3000px"} --><div style="height:3000px" aria-hidden="true" class="wp-block-spacer"></div><!-- /wp:spacer -->' +
					getLoopMarkup({
						blockId: 'e2e-carousel-autoplay-offscreen',
						images,
						layout: {
							layoutType: 'carousel',
							layoutColumnsMode: 'manual',
							layoutColumnCount: 3,
							carouselAutoplay: true,
							carouselAutoplayDelay: 2,
						},
						carousel: ['loop-carousel-indicator'],
					}),
			},
		});

		pageIds.push(created.id);

		await page.goto(created.link, { waitUntil: 'domcontentloaded' });

		const carousel = page.locator(CAROUSEL);
		const list = page.locator(LIST);

		await expect(carousel).toHaveClass(/vp-carousel-is-playing/);

		// Out of sight, the clock does not run: longer than a delay later
		// the carousel is still on its first slide.
		await page.waitForTimeout(3000);
		expect(await list.evaluate((node) => node.scrollLeft)).toBe(0);

		// Scrolled into view, it runs on.
		await list.scrollIntoViewIfNeeded();
		await expect
			.poll(async () => list.evaluate((node) => node.scrollLeft), {
				timeout: 10000,
			})
			.toBeGreaterThan(0);
	});

	test('a carousel with no block spacing still lays its slides out', async ({
		page,
		requestUtils,
	}) => {
		await publishLoop(requestUtils, page, {
			title: 'Layouts - carousel no gap',
			blockId: 'e2e-carousel-no-gap',
			images,
			layout: {
				layoutType: 'carousel',
				layoutColumnsMode: 'manual',
				layoutColumnCount: 3,
				carouselRepeat: true,
				// None in the block spacing control is a bare zero.
				style: { spacing: { blockGap: '0' } },
			},
			carousel: ['loop-carousel-next'],
		});

		const list = page.locator(LIST);

		await expect(list).toHaveClass(/vp-layout-carousel/);

		// A zero with a unit: a bare one is a number, and a slide width worked
		// out from it in a `calc()` was invalid, which left the slides their
		// own size.
		await expect(list).toHaveAttribute('style', /--vp-layout-gap:\s*0px/);

		const [frame, first, second] = await Promise.all([
			page.locator(FRAME).boundingBox(),
			list.locator(ITEM).nth(0).boundingBox(),
			list.locator(ITEM).nth(1).boundingBox(),
		]);

		expect(first.width).toBeCloseTo(frame.width / 3, 0);
		expect(second.x).toBeCloseTo(first.x + first.width, 0);
	});

	test('controls inside the item template are laid over the slides', async ({
		page,
		requestUtils,
	}) => {
		await publishLoop(requestUtils, page, {
			title: 'Layouts - carousel overlay',
			blockId: 'e2e-carousel-overlay',
			images,
			layout: {
				layoutType: 'carousel',
				layoutColumnsMode: 'manual',
				layoutColumnCount: 3,
			},
			carousel: ['loop-carousel-previous', 'loop-carousel-next'],
			carouselOverlay: true,
		});

		const list = page.locator(LIST);
		const next = page.locator(NEXT_ARROW);

		// Rendered once, inside the frame and after the list - not once per
		// item, which is what a block inside the template otherwise is.
		await expect(page.locator(`${FRAME} > ${NAV}`)).toHaveCount(1);
		await expect(page.locator(`${LIST} ${NAV}`)).toHaveCount(0);

		const [frame, prevBox, nextBox] = await Promise.all([
			page.locator(FRAME).boundingBox(),
			page.locator(PREV_ARROW).boundingBox(),
			next.boundingBox(),
		]);

		// Inside the box the slides scroll in, one at either edge of it and
		// both level with its middle.
		expect(prevBox.x).toBeGreaterThanOrEqual(frame.x);
		expect(nextBox.x + nextBox.width).toBeLessThanOrEqual(
			frame.x + frame.width
		);
		expect(nextBox.x).toBeGreaterThan(prevBox.x + prevBox.width);
		expect(prevBox.y + prevBox.height / 2).toBeCloseTo(
			frame.y + frame.height / 2,
			-1
		);

		// And an arrow over the slides still moves them.
		await next.click();
		await expect
			.poll(async () => list.evaluate((node) => node.scrollLeft), {
				timeout: 10000,
			})
			.toBeGreaterThan(0);
	});

	test('autoplay holds its countdown while the pointer rests on the carousel', async ({
		page,
		requestUtils,
	}) => {
		// The suite asks for less motion, and a carousel never runs itself for
		// a visitor who did.
		await page.emulateMedia({ reducedMotion: 'no-preference' });

		await publishLoop(requestUtils, page, {
			title: 'Layouts - carousel autoplay',
			blockId: 'e2e-carousel-autoplay',
			images,
			layout: {
				layoutType: 'carousel',
				layoutColumnsMode: 'manual',
				layoutColumnCount: 3,
				carouselAutoplay: true,
				carouselAutoplayDelay: 2,
			},
			carousel: ['loop-carousel-indicator'],
		});

		const carousel = page.locator(CAROUSEL);

		await expect(carousel).toHaveClass(/vp-carousel-is-playing/);

		const box = await carousel.boundingBox();

		// Every frame of the wait, with the slide it was taken on. Asserting on
		// the shape of the countdown rather than on where it got to by a given
		// moment is what keeps this from being a race.
		const taken = carousel.evaluate(
			(node) =>
				new Promise((resolve) => {
					const list = node.querySelector('ul');
					const frames = [];
					const step = () => {
						frames.push([
							parseFloat(
								node.style.getPropertyValue(
									'--vp-carousel-autoplay-progress'
								)
							) || 0,
							Math.round(list.scrollLeft),
						]);

						if (frames.length < 150) {
							window.requestAnimationFrame(step);
						} else {
							resolve(frames);
						}
					};

					window.requestAnimationFrame(step);
				})
		);

		await page.waitForTimeout(500);
		await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
		await page.waitForTimeout(700);
		await page.mouse.move(1, 1);

		const frames = await taken;

		// The countdown stood still for a while, which is the pause.
		expect(
			frames.filter(
				(frame, index) => index > 0 && frame[0] === frames[index - 1][0]
			).length
		).toBeGreaterThan(10);

		// And it never turned back on a slide it was already counting down -
		// the only place it starts over is the moment it runs out, which is
		// also the moment it moves on.
		const rewound = frames.filter(
			(frame, index) =>
				index > 0 &&
				frame[1] === frames[index - 1][1] &&
				frames[index - 1][0] < 90 &&
				frame[0] < frames[index - 1][0] - 0.5
		);

		expect(rewound).toEqual([]);
	});

	test('a wait starts again on the slide the carousel is moved to', async ({
		page,
		requestUtils,
	}) => {
		await page.emulateMedia({ reducedMotion: 'no-preference' });

		await publishLoop(requestUtils, page, {
			title: 'Layouts - carousel autoplay restart',
			blockId: 'e2e-carousel-autoplay-restart',
			images,
			layout: {
				layoutType: 'carousel',
				layoutColumnsMode: 'manual',
				layoutColumnCount: 2,
				carouselAutoplay: true,
				carouselAutoplayDelay: 4,
			},
			carousel: ['loop-carousel-indicator'],
		});

		const carousel = page.locator(CAROUSEL);
		const list = page.locator(LIST);

		await expect(carousel).toHaveClass(/vp-carousel-is-playing/);

		const countdown = () =>
			carousel.evaluate(
				(node) =>
					parseFloat(
						node.style.getPropertyValue(
							'--vp-carousel-autoplay-progress'
						)
					) || 0
			);

		// The pointer is off the carousel, so the wait runs.
		await page.mouse.move(1, 1);
		await expect.poll(countdown, { timeout: 10000 }).toBeGreaterThan(20);

		// Moved the way a swipe moves it - the scroll itself, with no arrow
		// pressed and no dot. A press says what it did and is listened for;
		// a swipe says nothing, and the wait used to go on running down from
		// where it had got to, so a slide a visitor had just swiped to could
		// be taken away from them a moment later.
		await list.evaluate((node) => {
			node.scrollTo({
				left: node.scrollLeft + node.clientWidth,
				behavior: 'instant',
			});
		});

		// The slide it landed on is owed the whole of a wait.
		await expect.poll(countdown, { timeout: 2000 }).toBeLessThan(10);
	});

	test('coverflow overhangs its neighbours and still snaps a card at a time', async ({
		page,
		requestUtils,
	}) => {
		await publishLoop(requestUtils, page, {
			title: 'Layouts - carousel coverflow',
			blockId: 'e2e-carousel-coverflow',
			images,
			layout: {
				layoutType: 'carousel',
				layoutColumnsMode: 'manual',
				layoutColumnCount: 3,
				style: { spacing: { blockGap: '10px' } },
				carouselEffect: 'coverflow',
			},
			carousel: ['loop-carousel-previous', 'loop-carousel-next'],
		});

		await expect(page.locator(LIST)).toHaveClass(/vp-carousel-coverflow/);

		const boxes = await getItemBoxes(page);

		// Every box the carousel counts in is the same, and it is half a card:
		// what overhangs the neighbours is the slide inside it, which is what
		// makes a cover flow read as a stack rather than as a tilted row.
		expect(new Set(boxes.map((item) => item.layoutWidth)).size).toBe(1);

		const geometry = await page.locator(LIST).evaluate((list) => {
			const item = list.querySelector(
				'.wp-block-visual-portfolio-item-template__item'
			);
			const slide = list.querySelector(
				'.wp-block-visual-portfolio-item-template__slide'
			);

			return {
				slide: slide.offsetWidth / item.offsetWidth,
				// The list is narrowed to one box and padded with the rest, so
				// the first card can come to the middle like any other.
				centred:
					Math.abs(
						item.offsetLeft +
							item.offsetWidth / 2 -
							list.clientWidth / 2
					) < 2,
			};
		});

		expect(geometry).toEqual({ slide: 2, centred: true });
	});

	test('the arrows step one slide a press, however fast they are pressed', async ({
		page,
		requestUtils,
	}) => {
		await publishLoop(requestUtils, page, {
			title: 'Layouts - carousel stepping',
			blockId: 'e2e-carousel-stepping',
			images,
			layout: {
				layoutType: 'carousel',
				layoutColumnsMode: 'manual',
				layoutColumnCount: 3,
				// The effect turns the slides in perspective. Slide positions
				// are read from the layout for exactly this reason: measured
				// from the painted boxes, the arrows of a cover flow answer
				// with a position the carousel is already at, and pressing them
				// does nothing at all.
				carouselEffect: 'coverflow',
			},
			carousel: ['loop-carousel-previous', 'loop-carousel-next'],
		});

		const list = page.locator(LIST);
		const step = await list.evaluate(
			(node) =>
				node.querySelector(
					'.wp-block-visual-portfolio-item-template__item'
				).offsetWidth
		);

		// Three presses inside the travel of one, which is where a carousel
		// that counts from wherever the animation happens to be loses them.
		for (let press = 0; press < 3; press++) {
			// eslint-disable-next-line no-await-in-loop
			await page.locator(NEXT_ARROW).click({ delay: 0 });
		}

		await expect
			.poll(async () => list.evaluate((node) => node.scrollLeft), {
				timeout: 10000,
			})
			.toBeGreaterThan(step * 2.5);
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
				},
				carousel: [
					'loop-carousel-previous',
					'loop-carousel-indicator',
					'loop-carousel-next',
				],
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
					controls: ['loop-pagination-trigger'],
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

	test('a slide whose blocks fill it is drawn the same whether it is selected', async ({
		page,
		admin,
		editor,
		requestUtils,
	}) => {
		// Titles the items actually have: an empty one is not rendered at all,
		// and the picture would take the whole slide for a reason of its own.
		const titled = [];

		for (const image of images) {
			titled.push({ ...image, title: 'Slide title' });
		}

		await admin.createNewPost({
			title: 'Layouts - editor stretch height',
			postType: 'page',
			showWelcomeGuide: false,
			legacyCanvas: true,
		});

		await editor.insertBlock({
			name: 'visual-portfolio/loop',
			attributes: {
				baseQuery: { perPage: IMAGES_COUNT, maxPages: 1 },
				queryType: 'images',
				imagesQuery: { images: titled },
			},
			innerBlocks: [
				{
					name: 'visual-portfolio/item-template',
					attributes: {
						layoutType: 'carousel',
						layoutColumnsMode: 'manual',
						layoutColumnCount: 3,
						carouselStretchSlides: true,
						carouselSlideHeight: '320px',
					},
					innerBlocks: [
						{
							name: 'visual-portfolio/item-image',
							attributes: { aspectRatio: '4/3' },
						},
						{ name: 'visual-portfolio/item-title' },
					],
				},
			],
		});

		const canvas = getEditorCanvas(page, editor);
		const pictures = canvas.locator(
			`${LIST} .wp-block-visual-portfolio-item-image`
		);

		// The editor keeps a hidden twin of the item being edited beside the
		// drawn ones, so only the boxes with a height are the ones on screen.
		const heights = () =>
			pictures.evaluateAll((nodes) =>
				nodes
					.map((node) =>
						Math.round(node.getBoundingClientRect().height)
					)
					.filter(Boolean)
			);

		await expect
			.poll(async () => (await heights()).length, { timeout: 20000 })
			.toBe(IMAGES_COUNT);

		const drawn = await heights();

		// The slide being edited is drawn from its blocks and the rest from a
		// read-only copy, and the copy has to fill the slide the same way -
		// otherwise a picture changed size the moment its slide was clicked.
		expect(new Set(drawn).size).toBe(1);

		// And each of them leaves the title its room rather than taking the
		// whole 320px slide.
		expect(drawn[0]).toBeLessThan(320);
		expect(drawn[0]).toBeGreaterThan(0);
	});

	test('the columns control answers for the screen the editor is previewing', async ({
		page,
		admin,
		editor,
	}) => {
		await admin.createNewPost({
			title: 'Layouts - responsive control',
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
						layoutType: 'grid',
						layoutColumnsMode: 'manual',
						layoutColumnCount: 4,
					},
					innerBlocks: [{ name: 'visual-portfolio/item-image' }],
				},
			],
		});

		const canvas = getEditorCanvas(page, editor);

		await editor.selectBlocks(
			canvas.locator('[data-type="visual-portfolio/item-template"]')
		);
		await editor.openDocumentSettingsSidebar();

		const columns = page.getByRole('slider', { name: 'Columns' });

		// The desktop count, which is what the block was given.
		await expect(columns).toHaveValue('4');

		// Switching the preview switches what the control answers for: there
		// is one answer to what the gallery looks like on a phone, and it is
		// the editor's own switcher rather than a second set of tabs.
		await page.getByRole('button', { name: 'View', exact: true }).click();
		await page.getByRole('menuitemradio', { name: 'Tablet' }).click();

		await expect(columns).toHaveValue('0');

		await columns.fill('2');

		await expect
			.poll(
				() =>
					editor
						.getBlocks()
						.then(
							(blocks) =>
								blocks[0].innerBlocks[0].attributes
									.layoutColumnCountTablet
						),
				{ timeout: 10000 }
			)
			.toBe(2);

		// And the desktop count was left where it was.
		const blocks = await editor.getBlocks();

		expect(blocks[0].innerBlocks[0].attributes.layoutColumnCount).toBe(4);
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

		// The layout is a block variation, switched in the row of icons the
		// editor draws above the settings.
		await page.getByRole('radio', { name: 'Transform to Tiles' }).click();

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

	test('the editor lays a control inside the item template over the slides', async ({
		page,
		admin,
		editor,
	}) => {
		await admin.createNewPost({
			title: 'Layouts - editor overlay',
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
						layoutColumnsMode: 'manual',
						layoutColumnCount: 3,
					},
					innerBlocks: [
						{
							name: 'visual-portfolio/item-image',
							attributes: { aspectRatio: '1' },
						},
						{
							name: 'visual-portfolio/loop-carousel-nav',
							innerBlocks: [
								{
									name: 'visual-portfolio/loop-carousel-previous',
								},
								{ name: 'visual-portfolio/loop-carousel-next' },
							],
						},
					],
				},
			],
		});

		const canvas = getEditorCanvas(page, editor);
		const list = canvas.locator(LIST);
		const nav = canvas.locator(NAV);

		await expect(list).toHaveClass(/vp-layout-carousel/);

		// Drawn once, by the item being edited: the read-only copies of the
		// item show the item and nothing else.
		await expect(nav).toHaveCount(1);

		// And laid over the frame rather than inside the slide: the same box,
		// with an arrow at either edge of it.
		const [frame, navBox, prevBox, nextBox] = await Promise.all([
			canvas.locator(FRAME).boundingBox(),
			nav.boundingBox(),
			canvas.locator(PREV_ARROW).boundingBox(),
			canvas.locator(NEXT_ARROW).boundingBox(),
		]);

		expect(navBox.x).toBeCloseTo(frame.x, 0);
		expect(navBox.width).toBeCloseTo(frame.width, 0);
		expect(navBox.height).toBeCloseTo(frame.height, 0);
		expect(prevBox.x).toBeGreaterThanOrEqual(frame.x);
		expect(nextBox.x + nextBox.width).toBeLessThanOrEqual(
			frame.x + frame.width + 1
		);
		expect(nextBox.x).toBeGreaterThan(frame.x + frame.width / 2);
	});

	// An effect that spreads one slide over the width of the gallery owns that
	// width. Cover flow is the other kind - the count is how many cards fit
	// across it - and the control follows which of the two the effect is.
	for (const [effect, offered, columns] of [
		['coverflow', true, '3'],
		['slideshow', false, '1'],
	]) {
		test(`the columns control ${offered ? 'stays for' : 'steps aside for'} ${effect}`, async ({
			page,
			admin,
			editor,
		}) => {
			await admin.createNewPost({
				title: `Layouts - columns ${effect}`,
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
							layoutColumnsMode: 'manual',
							layoutColumnCount: 3,
							carouselEffect: effect,
						},
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

			await editor.selectBlocks(
				canvas.locator('[data-type="visual-portfolio/item-template"]')
			);
			await editor.openDocumentSettingsSidebar();

			const control = page
				.locator('.interface-interface-skeleton__sidebar')
				.getByText('Columns', { exact: true });

			await (offered
				? expect(control).toBeVisible()
				: expect(control).toBeHidden());

			// And the preview is drawn the way the page will be drawn, which is
			// the same count the render callback resolves.
			await expect
				.poll(async () =>
					canvas
						.locator(LIST)
						.evaluate((node) =>
							node.style.getPropertyValue('--vp-layout-columns')
						)
				)
				.toBe(columns);
		});
	}

	// An install adds an effect with a name on each side and a stylesheet,
	// which is what the test plugin does without the stylesheet. The schema
	// the server sends the editor is widened to the name, and that is the
	// schema the editor has to keep: parsed against the bundled list instead,
	// the value is dropped the moment the page is opened, and gone at the
	// next save.
	test('an effect an install adds survives the editor', async ({
		page,
		admin,
		editor,
		requestUtils,
	}) => {
		await requestUtils.activatePlugin('vpf-test-carousel-effect');

		await admin.createNewPost({
			title: 'Layouts - added effect',
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
						carouselEffect: 'acme-flip',
					},
					innerBlocks: [
						{
							name: 'visual-portfolio/item-image',
							attributes: { aspectRatio: '1' },
						},
					],
				},
			],
		});

		const postId = await editor.publishPost();

		pageIds.push(postId);

		// Opened again, the page is parsed from its markup, which is where
		// the schema is applied.
		await admin.editPost(postId);

		await expect
			.poll(async () => {
				const blocks = await editor.getBlocks();

				return blocks[0]?.innerBlocks[0]?.attributes.carouselEffect;
			})
			.toBe('acme-flip');

		// The control names it too, from the option the install added.
		const canvas = getEditorCanvas(page, editor);

		await editor.selectBlocks(
			canvas.locator('[data-type="visual-portfolio/item-template"]')
		);
		await editor.openDocumentSettingsSidebar();

		await expect(
			page.getByRole('combobox', { name: 'Effect' })
		).toHaveValue('acme-flip');

		// And the page is drawn with it, which is the class the stylesheet of
		// the install would hang its animations on.
		const { link } = await requestUtils.rest({
			path: `/wp/v2/pages/${postId}`,
		});

		await page.goto(link, { waitUntil: 'domcontentloaded' });

		await expect(page.locator(LIST)).toHaveClass(/vp-carousel-acme-flip/);
	});
});
