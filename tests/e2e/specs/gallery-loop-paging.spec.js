/**
 * Gallery Loop: what the front end does between pages.
 *
 * Infinite scroll, the end of the list, Back after a Load More, the layout of
 * a swapped page, a click with a modifier and the loading state. All of it is
 * the work of the loop store, so every assertion is made on the published page.
 *
 * Pages are published straight through REST: nothing here is about the editor.
 */
import { expect, test } from '@wordpress/e2e-test-utils-playwright';

import { getFixturePath } from '../utils/fixture-path';
import { getLoopParam } from '../utils/loop-query-params';
import { getPluginSlug } from '../utils/plugin-slug';

const LOOP = '.vp-block-loop';
const LIST = 'ul.wp-block-visual-portfolio-item-template';
const ITEM = '.wp-block-visual-portfolio-item-template__item';
const TITLE = '.wp-block-visual-portfolio-item-title';
const TRIGGER = '.vp-block-loop-pagination-trigger';
const END = '.vp-block-loop-pagination-end';
const NUMBERS = '.vp-block-loop-pagination-numbers';
const LIVE_REGION = '.wp-block-visual-portfolio-item-template__live-region';

const IMAGES_COUNT = 12;

// Pushes the loop well past the first screen and the 300px an infinite trigger
// looks ahead by, so nothing can load before the visitor scrolls.
const SPACER =
	'<!-- wp:spacer {"height":"3000px"} --><div style="height:3000px" aria-hidden="true" class="wp-block-spacer"></div><!-- /wp:spacer -->';

const END_OF_LIST =
	'<!-- wp:visual-portfolio/loop-pagination-end --><!-- wp:paragraph --><p>That is all.</p><!-- /wp:paragraph --><!-- /wp:visual-portfolio/loop-pagination-end -->';

/**
 * Serialized markup of one block.
 *
 * @param {string} name         - block name without the namespace.
 * @param {Object} [attributes] - block attributes.
 * @return {string} serialized block.
 */
function getBlock(name, attributes) {
	return attributes
		? `<!-- wp:visual-portfolio/${name} ${JSON.stringify(attributes)} /-->`
		: `<!-- wp:visual-portfolio/${name} /-->`;
}

/**
 * Serialized markup of one loop of images.
 *
 * @param {Object}   options              - loop options.
 * @param {string}   options.blockId      - id the router finds the loop by.
 * @param {Array}    options.images       - images of the source.
 * @param {number}   options.perPage      - items per page.
 * @param {Object}   [options.layout]     - item template attributes.
 * @param {boolean}  [options.withImage]  - show the picture of every item.
 * @param {string[]} [options.before]     - serialized blocks above the items.
 * @param {string[]} [options.pagination] - serialized blocks of the pagination.
 * @return {string} serialized blocks.
 */
function getLoopMarkup({
	blockId,
	images,
	perPage,
	layout = {},
	withImage = false,
	before = [],
	pagination = [],
}) {
	const loop = {
		block_id: blockId,
		queryId: 1,
		queryType: 'images',
		baseQuery: { perPage, maxPages: 0 },
		imagesQuery: { images, orderBy: 'default' },
	};

	return [
		`<!-- wp:visual-portfolio/loop ${JSON.stringify(loop)} -->`,
		'<div class="wp-block-visual-portfolio-loop vp-block-loop">',
		before.join(''),
		`<!-- wp:visual-portfolio/item-template ${JSON.stringify(layout)} -->`,
		withImage ? getBlock('item-image', { clickAction: 'none' }) : '',
		getBlock('item-title'),
		'<!-- /wp:visual-portfolio/item-template -->',
		pagination.length
			? `<!-- wp:visual-portfolio/loop-pagination -->${pagination.join('')}<!-- /wp:visual-portfolio/loop-pagination -->`
			: '',
		'</div>',
		'<!-- /wp:visual-portfolio/loop -->',
	].join('');
}

/**
 * Titles currently rendered by the loop.
 *
 * @param {import('@playwright/test').Page} page - page under test.
 * @return {Promise<string[]>} item titles.
 */
function getTitles(page) {
	return page.locator(`${ITEM} ${TITLE}`).allInnerTexts();
}

/**
 * Bring the trigger to the bottom of the screen, if it is still there.
 *
 * @param {import('@playwright/test').Page} page - page under test.
 */
function scrollToTrigger(page) {
	return page.evaluate((selector) => {
		document.querySelector(selector)?.scrollIntoView({ block: 'end' });
	}, TRIGGER);
}

/**
 * Geometry of the items of the list, relative to it.
 *
 * @param {import('@playwright/test').Page} page - page under test.
 * @return {Promise<Object>} `{ width, height, items }`, each item as
 *                           `{ x, y, width, height, position, ratio }`, the
 *                           ratio being the one of the image it holds.
 */
function getLayout(page) {
	return page.locator(LIST).evaluate((list, itemSelector) => {
		const box = list.getBoundingClientRect();
		const style = window.getComputedStyle(list);

		return {
			width:
				list.clientWidth -
				parseFloat(style.paddingLeft) -
				parseFloat(style.paddingRight),
			height: box.height,
			items: Array.from(list.querySelectorAll(itemSelector)).map(
				(item) => {
					const rect = item.getBoundingClientRect();
					const image = item.querySelector('img');

					return {
						x: rect.x - box.x,
						y: rect.y - box.y,
						width: rect.width,
						height: rect.height,
						position: window.getComputedStyle(item).position,
						ratio: image
							? image.getAttribute('width') /
								image.getAttribute('height')
							: null,
					};
				}
			),
		};
	}, ITEM);
}

/**
 * Whether two boxes share more than a pixel of area.
 *
 * @param {Object} a - box.
 * @param {Object} b - box.
 * @return {boolean} overlap.
 */
function overlaps(a, b) {
	return (
		Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > 1 &&
		Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y) > 1
	);
}

/**
 * Whether Masonry has placed every item: taken out of the flow, apart from
 * each other and inside the height it gave the list.
 *
 * @param {Object} layout - see `getLayout()`.
 * @return {boolean} placed.
 */
function isMasonryPlaced(layout) {
	const { items, height } = layout;

	return (
		items.length > 1 &&
		items.every((item) => 'absolute' === item.position) &&
		items.every((item, index) =>
			items.slice(index + 1).every((other) => !overlaps(item, other))
		) &&
		items.every((item) => item.y + item.height <= height + 1)
	);
}

/**
 * Whether justified has laid the items into rows that each fill the width of
 * the list, the last one aside, with one height per row, and every item as
 * wide as its own image asks for at that height.
 *
 * @param {Object} layout - see `getLayout()`.
 * @return {boolean} laid out.
 */
function isJustifiedPlaced(layout) {
	const { items, width } = layout;

	if (!items.every((item) => 'absolute' === item.position)) {
		return false;
	}

	const rows = [];

	items.forEach((item) => {
		const row = rows.find((current) => Math.abs(current.y - item.y) < 2);

		if (row) {
			row.items.push(item);
		} else {
			rows.push({ y: item.y, items: [item] });
		}
	});

	if (rows.length < 2) {
		return false;
	}

	// The title under a picture adds the same height to every item of a row,
	// so width over the ratio of the image is the height of the picture, one
	// per row.
	const isProportional = ({ items: rowItems }) =>
		rowItems.every(
			(item) =>
				Math.abs(
					item.width / item.ratio -
						rowItems[0].width / rowItems[0].ratio
				) < 3
		);

	if (!rows.every(isProportional)) {
		return false;
	}

	return rows.slice(0, -1).every(({ items: rowItems }) => {
		const left = Math.min(...rowItems.map((item) => item.x));
		const right = Math.max(...rowItems.map((item) => item.x + item.width));

		return (
			rowItems.length > 1 &&
			Math.abs(left) < 2 &&
			Math.abs(right - width) < 3 &&
			rowItems.every(
				(item) => Math.abs(item.height - rowItems[0].height) < 2
			)
		);
	});
}

test.describe('Gallery Loop paging', () => {
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

		// Titles a test can read back, and a category for every other image.
		images = images.map((image, index) => ({
			...image,
			title: `Paging ${String.fromCharCode(65 + index)}`,
			categories: [index % 2 ? 'Odd' : 'Even'],
		}));
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
	 * Publish a page and open it.
	 *
	 * @param {Object} requestUtils - REST utils.
	 * @param {Object} page         - Playwright page.
	 * @param {string} title        - page title.
	 * @param {string} content      - serialized blocks.
	 * @return {Promise<string>} URL of the page.
	 */
	async function publish(requestUtils, page, title, content) {
		const created = await requestUtils.rest({
			path: '/wp/v2/pages',
			method: 'POST',
			data: { title, status: 'publish', content },
		});

		pageIds.push(created.id);

		await page.goto(created.link, { waitUntil: 'load' });

		return created.link;
	}

	/**
	 * Write the data attributes an extension gives an infinite trigger into
	 * the page as it is served, before the store reads them.
	 *
	 * Free prints none of them; Pro does, from its own settings.
	 *
	 * @param {Object} page  - Playwright page.
	 * @param {Object} attrs - attributes, name => value.
	 */
	async function setInfiniteData(page, attrs) {
		const extra = Object.entries(attrs)
			.map(([name, value]) => `${name}="${value}"`)
			.join(' ');

		await page.route('**/*', async (route) => {
			if ('document' !== route.request().resourceType()) {
				return route.fallback();
			}

			const response = await route.fetch();
			const body = (await response.text()).replace(
				'data-wp-init="callbacks.observeInfinite"',
				`data-wp-init="callbacks.observeInfinite" ${extra}`
			);

			return route.fulfill({ response, body });
		});
	}

	/**
	 * A loop of pictures two to a row, so every page pushes the trigger a
	 * screen further down.
	 *
	 * @param {string}   blockId    - id of the loop.
	 * @param {string[]} pagination - serialized blocks of the pagination.
	 * @return {string} serialized blocks.
	 */
	function getInfiniteLoop(blockId, pagination) {
		return getLoopMarkup({
			blockId,
			images,
			perPage: 2,
			withImage: true,
			layout: {
				layoutType: 'grid',
				layoutColumnsMode: 'manual',
				layoutColumnCount: 2,
			},
			pagination,
		});
	}

	test.describe('infinite scroll', () => {
		const INFINITE = getBlock('loop-pagination-trigger', {
			triggerType: 'infinite',
		});

		test('loads the next pages as the trigger comes into view', async ({
			page,
			requestUtils,
		}) => {
			await publish(
				requestUtils,
				page,
				'Paging - infinite',
				SPACER + getInfiniteLoop('e2e-paging-infinite', [INFINITE])
			);

			const items = page.locator(ITEM);

			// Out of sight, nothing is fetched.
			await page.waitForTimeout(1500);
			await expect(items).toHaveCount(2);

			await expect
				.poll(
					async () => {
						await scrollToTrigger(page);

						return items.count();
					},
					{ timeout: 30000 }
				)
				.toBe(IMAGES_COUNT);

			await expect(page.locator(TRIGGER)).toHaveCount(0);
		});

		test('stops after every so many pages until the trigger is clicked', async ({
			page,
			requestUtils,
		}) => {
			await setInfiniteData(page, {
				'data-vp-infinite-every-page': 2,
				'data-vp-infinite-threshold': 0,
			});
			await publish(
				requestUtils,
				page,
				'Paging - infinite every page',
				SPACER +
					getInfiniteLoop('e2e-paging-infinite-every', [INFINITE])
			);

			const items = page.locator(ITEM);

			await expect
				.poll(
					async () => {
						await scrollToTrigger(page);

						return items.count();
					},
					{ timeout: 20000 }
				)
				.toBe(6);

			// Two pages loaded by scrolling, and the third is left to the
			// visitor however long they keep the trigger in view.
			for (let i = 0; i < 4; i++) {
				await scrollToTrigger(page);
				await page.waitForTimeout(500);
			}

			await expect(items).toHaveCount(6);

			// The page the click asked for, and the ones the scrolling that
			// resumed may already have added under it.
			await page.locator(TRIGGER).click();
			await expect.poll(() => items.count()).toBeGreaterThanOrEqual(8);

			// The click let the scrolling go on.
			await expect
				.poll(
					async () => {
						await scrollToTrigger(page);

						return items.count();
					},
					{ timeout: 20000 }
				)
				.toBe(IMAGES_COUNT);
		});

		test('started as a Load More, waits for the first click', async ({
			page,
			requestUtils,
		}) => {
			await setInfiniteData(page, {
				'data-vp-infinite-startup-load-more': 'true',
			});
			await publish(
				requestUtils,
				page,
				'Paging - infinite from a click',
				getInfiniteLoop('e2e-paging-infinite-startup', [INFINITE])
			);

			const items = page.locator(ITEM);

			await scrollToTrigger(page);
			await expect(page.locator(TRIGGER)).toBeInViewport();
			await page.waitForTimeout(1500);
			await expect(items).toHaveCount(2);

			await page.locator(TRIGGER).click();
			await expect.poll(() => items.count()).toBeGreaterThanOrEqual(4);

			await expect
				.poll(
					async () => {
						await scrollToTrigger(page);

						return items.count();
					},
					{ timeout: 30000 }
				)
				.toBe(IMAGES_COUNT);
		});
	});

	test('the end of the list shows once Load More reaches the last page', async ({
		page,
		requestUtils,
	}) => {
		await publish(
			requestUtils,
			page,
			'Paging - end of list',
			getLoopMarkup({
				blockId: 'e2e-paging-end',
				images,
				perPage: 4,
				pagination: [getBlock('loop-pagination-trigger'), END_OF_LIST],
			})
		);

		const items = page.locator(ITEM);
		const end = page.locator(END);

		await expect(end).toHaveCount(1);
		await expect(end).toBeHidden();

		await page.locator(TRIGGER).click();
		await expect(items).toHaveCount(8);
		await expect(end).toBeHidden();

		await page.locator(TRIGGER).click();
		await expect(items).toHaveCount(IMAGES_COUNT);
		await expect(end).toBeVisible();
		await expect(end).toHaveText('That is all.');
		await expect(page.locator(TRIGGER)).toHaveCount(0);
	});

	test('a load more adds no copy of a lazy image that loads at once', async ({
		page,
		requestUtils,
	}) => {
		await publish(
			requestUtils,
			page,
			'Paging - no noscript copies',
			getLoopMarkup({
				blockId: 'e2e-paging-noscript',
				images,
				perPage: 4,
				// One column, so the items past the first row load lazily.
				layout: { layoutColumnsMode: 'manual', layoutColumnCount: 1 },
				withImage: true,
				pagination: [getBlock('loop-pagination-trigger')],
			})
		);

		// The page as served holds no-JavaScript copies of its lazy images.
		expect(await page.locator(`${LOOP} noscript`).count()).toBeGreaterThan(
			0
		);

		await page.locator(TRIGGER).click();
		await expect(page.locator(ITEM)).toHaveCount(8);

		// Those of the page fetched are dropped, not parsed into images.
		await expect(page.locator(`${LOOP} noscript img`)).toHaveCount(0);
	});

	test.describe('Back after a Load More', () => {
		/**
		 * Publish a loop of two to a page, with a filter above it and a Load
		 * More under it, and read what its first page shows.
		 *
		 * @param {Object} requestUtils - REST utils.
		 * @param {Object} page         - Playwright page.
		 * @param {string} title        - page title.
		 * @return {Promise<Object>} `{ titles, href }` of the first page.
		 */
		async function publishFiltered(requestUtils, page, title) {
			await publish(
				requestUtils,
				page,
				title,
				getLoopMarkup({
					blockId: 'e2e-paging-back',
					images,
					perPage: 2,
					before: [getBlock('loop-filter')],
					pagination: [getBlock('loop-pagination-trigger')],
				})
			);

			await expect(page.locator(ITEM)).toHaveCount(2);

			return {
				titles: await getTitles(page),
				href: await page.locator(TRIGGER).getAttribute('href'),
			};
		}

		/**
		 * The loop shows exactly its first page again.
		 *
		 * @param {Object} page  - Playwright page.
		 * @param {Object} first - see `publishFiltered()`.
		 */
		async function expectFirstPage(page, first) {
			await expect
				.poll(() => getLoopParam(page.url(), 'filter'))
				.toBe(null);
			await expect(page.locator(ITEM)).toHaveCount(2);
			expect(await getTitles(page)).toEqual(first.titles);
			await expect(page.locator(TRIGGER)).toHaveCount(1);
			await expect(page.locator(TRIGGER)).toHaveAttribute(
				'href',
				first.href
			);
		}

		test('Load More, then a filter, then Back', async ({
			page,
			requestUtils,
		}) => {
			const first = await publishFiltered(
				requestUtils,
				page,
				'Paging - back after load more then filter'
			);

			await page.locator(TRIGGER).click();
			await expect(page.locator(ITEM)).toHaveCount(4);

			await page
				.locator('a.vp-block-loop-filter-item', { hasText: 'Odd' })
				.click();
			await expect
				.poll(() => getLoopParam(page.url(), 'filter'))
				.not.toBe(null);
			await expect(page.locator(ITEM)).toHaveCount(2);

			await page.goBack();

			await expectFirstPage(page, first);
		});

		test('a filter, then Load More, then Back', async ({
			page,
			requestUtils,
		}) => {
			const first = await publishFiltered(
				requestUtils,
				page,
				'Paging - back after filter then load more'
			);

			await page
				.locator('a.vp-block-loop-filter-item', { hasText: 'Odd' })
				.click();
			await expect
				.poll(() => getLoopParam(page.url(), 'filter'))
				.not.toBe(null);
			await expect(page.locator(TRIGGER)).toHaveCount(1);

			await page.locator(TRIGGER).click();
			await expect(page.locator(ITEM)).toHaveCount(4);

			await page.goBack();

			await expectFirstPage(page, first);
		});
	});

	test.describe('layout after a swap', () => {
		// Wide pictures on the first page and tall ones on the second. Boxes
		// left where the first page put them would then no longer fit what
		// they hold, so a layout that did not run again shows.
		const WIDE = ['image-800x600.png', 'image-1920x1080.jpeg'];
		const TALL = ['image-600x1920.jpeg', 'image-800x1200.webp'];

		let wide = [];
		let tall = [];
		let uploadedIds = [];

		test.beforeAll(async ({ requestUtils }) => {
			const upload = (names) =>
				Promise.all(
					names.map((name) =>
						requestUtils.uploadMedia(getFixturePath(name))
					)
				);

			wide = await upload(WIDE);
			tall = await upload(TALL);
			uploadedIds = [...wide, ...tall].map(({ id }) => id);
		});

		test.afterAll(async ({ requestUtils }) => {
			await Promise.all(
				uploadedIds.map((id) =>
					requestUtils.rest({
						path: `/wp/v2/media/${id}`,
						method: 'DELETE',
						params: { force: true },
					})
				)
			);
		});

		/**
		 * A page of wide pictures, then a page of tall ones.
		 *
		 * @param {number} perPage - items per page.
		 * @return {Array} images of the source.
		 */
		function getSwapImages(perPage) {
			return [wide, tall].flatMap((media, page) =>
				Array.from({ length: perPage }, (_, index) => ({
					id: media[index % media.length].id,
					title: `Swap ${page + 1}.${index + 1}`,
				}))
			);
		}

		/**
		 * Go to the second page by its number.
		 *
		 * @param {Object}   page   - Playwright page.
		 * @param {string[]} before - titles of the first page.
		 */
		async function goToSecondPage(page, before) {
			await page
				.locator(`${NUMBERS} a`)
				.filter({ hasText: '2' })
				.first()
				.click();

			await expect.poll(() => getLoopParam(page.url(), 'page')).toBe('2');
			await expect.poll(() => getTitles(page)).not.toEqual(before);
		}

		test('masonry places the items of the new page apart', async ({
			page,
			requestUtils,
		}) => {
			await publish(
				requestUtils,
				page,
				'Paging - masonry swap',
				getLoopMarkup({
					blockId: 'e2e-paging-masonry',
					images: getSwapImages(4),
					perPage: 4,
					withImage: true,
					layout: {
						layoutType: 'masonry',
						layoutColumnsMode: 'manual',
						layoutColumnCount: 2,
					},
					pagination: [getBlock('loop-pagination-numbers')],
				})
			);

			await expect
				.poll(async () => isMasonryPlaced(await getLayout(page)), {
					timeout: 20000,
				})
				.toBe(true);

			await goToSecondPage(page, await getTitles(page));

			await expect
				.poll(async () => isMasonryPlaced(await getLayout(page)), {
					timeout: 20000,
				})
				.toBe(true);
		});

		test('justified fills the rows of the new page', async ({
			page,
			requestUtils,
		}) => {
			await publish(
				requestUtils,
				page,
				'Paging - justified swap',
				getLoopMarkup({
					blockId: 'e2e-paging-justified',
					images: getSwapImages(8),
					perPage: 8,
					withImage: true,
					layout: {
						layoutType: 'justified',
						justifiedRowHeight: 400,
						style: { spacing: { blockGap: '10px' } },
					},
					pagination: [getBlock('loop-pagination-numbers')],
				})
			);

			await expect
				.poll(async () => isJustifiedPlaced(await getLayout(page)), {
					timeout: 20000,
				})
				.toBe(true);

			await goToSecondPage(page, await getTitles(page));

			await expect
				.poll(async () => isJustifiedPlaced(await getLayout(page)), {
					timeout: 20000,
				})
				.toBe(true);
		});
	});

	test.describe('a click with a modifier', () => {
		/**
		 * Publish a loop with page numbers and a Load More.
		 *
		 * @param {Object} requestUtils - REST utils.
		 * @param {Object} page         - Playwright page.
		 * @param {string} title        - page title.
		 * @return {Promise} settles once the page is open.
		 */
		function publishPaged(requestUtils, page, title) {
			return publish(
				requestUtils,
				page,
				title,
				getLoopMarkup({
					blockId: 'e2e-paging-modifier',
					images,
					perPage: 2,
					pagination: [
						getBlock('loop-pagination-numbers'),
						getBlock('loop-pagination-trigger'),
					],
				})
			);
		}

		/**
		 * Click with the platform's new tab modifier and return the tab.
		 *
		 * @param {Object} page    - Playwright page.
		 * @param {Object} control - locator of the control.
		 * @return {Promise<Object>} page that opened.
		 */
		async function clickIntoNewTab(page, control) {
			const opened = page.context().waitForEvent('page');

			await control.click({ modifiers: ['ControlOrMeta'] });

			const tab = await opened;

			// The tab opens blank and is sent to the address after.
			await tab.waitForURL(
				(url) => '2' === getLoopParam(url.href, 'page')
			);

			return tab;
		}

		test('a page link opens in a new tab and leaves the loop alone', async ({
			page,
			requestUtils,
		}) => {
			// A page fetched ahead on hover is allowed, Pro turns that on, so
			// only the loop itself is watched.
			await publishPaged(
				requestUtils,
				page,
				'Paging - modifier on a page link'
			);
			const url = page.url();
			const titles = await getTitles(page);

			const tab = await clickIntoNewTab(
				page,
				page.locator(`${NUMBERS} a`).filter({ hasText: '2' }).first()
			);

			await tab.close();

			expect(page.url()).toBe(url);
			expect(await getTitles(page)).toEqual(titles);
		});

		test('Load More opens its page in a new tab and appends nothing', async ({
			page,
			requestUtils,
		}) => {
			await publishPaged(
				requestUtils,
				page,
				'Paging - modifier on load more'
			);
			const href = await page.locator(TRIGGER).getAttribute('href');

			const tab = await clickIntoNewTab(page, page.locator(TRIGGER));

			await tab.close();

			await expect(page.locator(ITEM)).toHaveCount(2);
			await expect(page.locator(TRIGGER)).toHaveAttribute('href', href);
		});
	});

	test.describe('loading state', () => {
		/**
		 * Hold the requests the page makes for the second page of the loop.
		 *
		 * @param {Object} page - Playwright page.
		 * @return {Promise<Object>} `{ requested, release }`: a promise of the
		 *                           first held request, and the release.
		 */
		async function holdSecondPage(page) {
			let release;
			const held = new Promise((resolve) => {
				release = resolve;
			});
			const requested = page.waitForRequest(
				(request) =>
					'fetch' === request.resourceType() &&
					'2' === getLoopParam(request.url(), 'page')
			);

			await page.route(
				(url) => '2' === getLoopParam(url.href, 'page'),
				async (route) => {
					if ('fetch' !== route.request().resourceType()) {
						return route.fallback();
					}

					await held;

					return route.fallback();
				}
			);

			return { requested, release };
		}

		test('Load More marks the loop busy and announces the items', async ({
			page,
			requestUtils,
		}) => {
			await publish(
				requestUtils,
				page,
				'Paging - loading load more',
				getLoopMarkup({
					blockId: 'e2e-paging-loading-more',
					images,
					perPage: 2,
					pagination: [getBlock('loop-pagination-trigger')],
				})
			);

			const { requested, release } = await holdSecondPage(page);

			await page.locator(TRIGGER).click();
			await requested;

			await expect(page.locator(LOOP)).toHaveClass(/\bvp-is-loading\b/);
			await expect(page.locator(LIST)).toHaveAttribute(
				'aria-busy',
				'true'
			);
			await expect(page.locator(LIVE_REGION)).toHaveText('');

			release();

			await expect(page.locator(ITEM)).toHaveCount(4);
			await expect(page.locator(LOOP)).not.toHaveClass(
				/\bvp-is-loading\b/
			);
			await expect(page.locator(LIST)).not.toHaveAttribute(
				'aria-busy',
				'true'
			);
			await expect(page.locator(LIVE_REGION)).toHaveText(
				'Gallery items updated.'
			);
		});

		test('a page link marks the loop busy until the page is swapped in', async ({
			page,
			requestUtils,
		}) => {
			await publish(
				requestUtils,
				page,
				'Paging - loading page link',
				getLoopMarkup({
					blockId: 'e2e-paging-loading-link',
					images,
					perPage: 2,
					pagination: [getBlock('loop-pagination-numbers')],
				})
			);

			const before = await getTitles(page);
			const { requested, release } = await holdSecondPage(page);

			await page
				.locator(`${NUMBERS} a`)
				.filter({ hasText: '2' })
				.first()
				.click();
			await requested;

			await expect(page.locator(LOOP)).toHaveClass(/\bvp-is-loading\b/);
			await expect(page.locator(LIST)).toHaveAttribute(
				'aria-busy',
				'true'
			);

			release();

			await expect.poll(() => getLoopParam(page.url(), 'page')).toBe('2');
			await expect.poll(() => getTitles(page)).not.toEqual(before);
			await expect(page.locator(LOOP)).not.toHaveClass(
				/\bvp-is-loading\b/
			);
			await expect(page.locator(LIST)).not.toHaveAttribute(
				'aria-busy',
				'true'
			);
		});
	});

	test('a Load More a script pressed stays on the page when its page fails', async ({
		page,
		requestUtils,
	}) => {
		const url = await publish(
			requestUtils,
			page,
			'Paging - scripted load more fails',
			getLoopMarkup({
				blockId: 'e2e-paging-scripted',
				images,
				perPage: 2,
				pagination: [getBlock('loop-pagination-trigger')],
			})
		);
		const first = await getTitles(page);
		const isSecondPage = (address) =>
			'2' === getLoopParam(address.href, 'page');
		const fail = (route) =>
			'fetch' === route.request().resourceType()
				? route.fulfill({ status: 500, body: '' })
				: route.fallback();

		await page.route(isSecondPage, fail);

		const failed = page.waitForResponse(
			(response) =>
				500 === response.status() &&
				'2' === getLoopParam(response.url(), 'page')
		);

		// The way the lightbox of Pro asks for the slides of the next page.
		await page.locator(TRIGGER).evaluate((trigger) => trigger.click());
		await failed;
		await expect(page.locator(LOOP)).not.toHaveClass(/\bvp-is-loading\b/);

		await page.unroute(isSecondPage, fail);

		// Still the page it was, with a trigger that works.
		await page.locator(TRIGGER).click();
		await expect(page.locator(ITEM)).toHaveCount(4);
		expect(page.url()).toBe(url);
		expect((await getTitles(page)).slice(0, 2)).toEqual(first);
	});

	test('Back after a cleared search returns to the search', async ({
		page,
		requestUtils,
	}) => {
		const created = await requestUtils.rest({
			path: '/wp/v2/pages',
			method: 'POST',
			data: { title: 'Paging - cleared search', status: 'publish' },
		});

		pageIds.push(created.id);

		// Free prints no search field until an extension runs the search, so
		// the page carries the form the block prints, which is all the store
		// navigates by. The server ignores the term.
		const form = [
			'<form role="search" method="get" action="/" class="vp-block-loop-search" data-wp-interactive="visual-portfolio/loop" data-wp-on--submit="actions.search">',
			`<input type="hidden" name="page_id" value="${created.id}">`,
			'<label>Search <input type="search" class="vp-block-loop-search__input" name="vp-1-search" value="" data-wp-on--input="actions.search"></label>',
			'</form>',
		].join('');

		await requestUtils.rest({
			path: `/wp/v2/pages/${created.id}`,
			method: 'POST',
			data: {
				content: getLoopMarkup({
					blockId: 'e2e-paging-search',
					images,
					perPage: 2,
					before: [`<!-- wp:html -->${form}<!-- /wp:html -->`],
				}),
			},
		});

		await page.goto(created.link, { waitUntil: 'load' });

		const input = page.locator('.vp-block-loop-search__input');
		const getSearch = () => getLoopParam(page.url(), 'search');

		await input.fill('Pa');
		await expect.poll(getSearch).toBe('Pa');
		await input.fill('Pag');
		await expect.poll(getSearch).toBe('Pag');
		await input.fill('');
		await expect.poll(getSearch).toBe(null);

		await page.goBack();

		await expect.poll(getSearch).toBe('Pag');
	});

	test('a search erased before it lands leaves the page unsearched', async ({
		page,
		requestUtils,
	}) => {
		const created = await requestUtils.rest({
			path: '/wp/v2/pages',
			method: 'POST',
			data: { title: 'Paging - erased search', status: 'publish' },
		});

		pageIds.push(created.id);

		// The form the search block prints, as in the test above.
		const form = [
			'<form role="search" method="get" action="/" class="vp-block-loop-search" data-wp-interactive="visual-portfolio/loop" data-wp-on--submit="actions.search">',
			`<input type="hidden" name="page_id" value="${created.id}">`,
			'<label>Search <input type="search" class="vp-block-loop-search__input" name="vp-1-search" value="" data-wp-on--input="actions.search"></label>',
			'</form>',
		].join('');

		await requestUtils.rest({
			path: `/wp/v2/pages/${created.id}`,
			method: 'POST',
			data: {
				content: getLoopMarkup({
					blockId: 'e2e-paging-erased-search',
					images,
					perPage: 2,
					before: [`<!-- wp:html -->${form}<!-- /wp:html -->`],
				}),
			},
		});

		await page.goto(created.link, { waitUntil: 'load' });

		const input = page.locator('.vp-block-loop-search__input');
		const isSearch = (url) => 'Pa' === getLoopParam(url, 'search');

		let release;
		const held = new Promise((resolve) => {
			release = resolve;
		});
		const requested = page.waitForRequest(
			(request) =>
				'fetch' === request.resourceType() && isSearch(request.url())
		);

		await page.route(
			(url) => isSearch(url.href),
			async (route) => {
				if ('fetch' === route.request().resourceType()) {
					await held;
				}

				return route.fallback();
			}
		);

		await input.fill('Pa');
		await requested;

		const landed = page.waitForResponse((response) =>
			isSearch(response.url())
		);

		await input.fill('');

		// Past the pause the store waits for before it searches.
		await page.waitForTimeout(1000);

		release();
		await landed;

		await expect(page.locator(LOOP)).not.toHaveClass(/\bvp-is-loading\b/);
		expect(getLoopParam(page.url(), 'search')).toBe(null);
		await expect(input).toHaveValue('');
	});
});
