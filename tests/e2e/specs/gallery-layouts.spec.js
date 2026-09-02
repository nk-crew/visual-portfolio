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
});
