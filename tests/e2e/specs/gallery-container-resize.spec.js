/**
 * A gallery whose container changes width while the window keeps its size.
 *
 * Page builders do this after the gallery has already laid itself out:
 * Elementor's "Stretch Section" widens its section by script, and a tab or a
 * sidebar can do the same. Nothing tells the window it resized, so a layout
 * that only listens to the window keeps the positions it measured at the old
 * width, and the rows overlap.
 */
import { expect, test } from '@wordpress/e2e-test-utils-playwright';

import { getFixturePath } from '../utils/fixture-path';
import { getPluginSlug } from '../utils/plugin-slug';

const BOX = 'e2e-resize-box';
const NARROW = 400;
const WIDE = 800;
const IMAGES_COUNT = 6;

const LEGACY_ITEM = '.vp-portfolio__item-wrap';
const LOOP_ITEM =
	'ul.wp-block-visual-portfolio-item-template > .wp-block-visual-portfolio-item-template__item';

/**
 * Markup of a gallery inside a box of a fixed width.
 *
 * @param {string} gallery - serialized gallery block.
 * @return {string} page content.
 */
function inBox(gallery) {
	return `<div id="${BOX}" style="width: ${NARROW}px">${gallery}</div>`;
}

/**
 * Markup of a gallery block.
 *
 * @param {Object} attributes - block attributes.
 * @return {string} serialized block.
 */
function getLegacyMarkup(attributes) {
	return `<!-- wp:visual-portfolio/block ${JSON.stringify(attributes)} /-->`;
}

/**
 * Markup of a loop around an item template.
 *
 * @param {Object} loop   - loop attributes.
 * @param {Object} layout - item template attributes.
 * @return {string} serialized blocks.
 */
function getLoopMarkup(loop, layout) {
	return [
		`<!-- wp:visual-portfolio/loop ${JSON.stringify(loop)} -->`,
		'<div class="wp-block-visual-portfolio-loop vp-block-loop">',
		`<!-- wp:visual-portfolio/item-template ${JSON.stringify(layout)} -->`,
		'<!-- wp:visual-portfolio/item-image {"clickAction":"url"} /-->',
		'<!-- /wp:visual-portfolio/item-template -->',
		'</div>',
		'<!-- /wp:visual-portfolio/loop -->',
	].join('');
}

/**
 * Item boxes relative to the box, and the width of the box.
 *
 * @param {import('@playwright/test').Page} page     - page under test.
 * @param {string}                          selector - item selector.
 * @return {Promise<Object>} `{ width, items }`.
 */
function measure(page, selector) {
	return page.evaluate(
		({ box, item }) => {
			const container = document.getElementById(box);
			const origin = container.getBoundingClientRect();

			return {
				width: Math.round(origin.width),
				items: [...container.querySelectorAll(item)].map((node) => {
					const rect = node.getBoundingClientRect();

					return {
						left: rect.left - origin.left,
						top: rect.top - origin.top,
						right: rect.right - origin.left,
						bottom: rect.bottom - origin.top,
					};
				}),
			};
		},
		{ box: BOX, item: selector }
	);
}

/**
 * Pairs of items whose boxes cover each other.
 *
 * @param {Array} items - item boxes.
 * @return {Array} `[i, j]` per overlapping pair.
 */
function getOverlaps(items) {
	const overlaps = [];

	items.forEach((a, i) => {
		items.slice(i + 1).forEach((b, offset) => {
			const x = Math.min(a.right, b.right) - Math.max(a.left, b.left);
			const y = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);

			if (x > 1 && y > 1) {
				overlaps.push([i, i + 1 + offset]);
			}
		});
	});

	return overlaps;
}

/**
 * Lay the gallery out at the narrow width, widen its box without resizing the
 * window, and read the layout it ends up with.
 *
 * @param {import('@playwright/test').Page} page     - page under test.
 * @param {string}                          link     - page URL.
 * @param {string}                          selector - item selector.
 * @return {Promise<Object>} `{ overlaps, right, width }` after the widening.
 */
async function widenAfterLayout(page, link, selector) {
	await openSettled(page, link, selector);

	const before = await measure(page, selector);

	expect(getOverlaps(before.items)).toEqual([]);

	await page.evaluate(
		({ box, width }) => {
			document.getElementById(box).style.width = `${width}px`;
		},
		{ box: BOX, width: WIDE }
	);

	// Longer than any layout transition here.
	await page.waitForTimeout(1500);

	const after = await measure(page, selector);

	return {
		width: after.width,
		overlaps: getOverlaps(after.items),
		right: Math.round(Math.max(...after.items.map((item) => item.right))),
	};
}

/**
 * Open a page and wait until the gallery in the box has laid out its images.
 *
 * @param {import('@playwright/test').Page} page     - page under test.
 * @param {string}                          link     - page URL.
 * @param {string}                          selector - item selector.
 */
async function openSettled(page, link, selector) {
	await page.goto(link);

	// Settled at the narrow width: every image in, and the items placed.
	await expect
		.poll(
			async () => {
				const { items } = await measure(page, selector);

				return (
					items.length === IMAGES_COUNT &&
					(await page.evaluate(
						(box) =>
							[...document.querySelectorAll(`#${box} img`)].every(
								(img) => img.complete
							),
						BOX
					))
				);
			},
			{ timeout: 20000 }
		)
		.toBe(true);
	await page.waitForTimeout(1000);
}

test.describe('Gallery inside a container that changes width', () => {
	let images = [];
	const pageIds = [];

	test.beforeAll(async ({ requestUtils }) => {
		await requestUtils.activatePlugin(getPluginSlug());

		for (let i = 0; i < IMAGES_COUNT; i += 1) {
			const uploaded = await requestUtils.uploadMedia(
				getFixturePath('image-800x600.png')
			);

			images.push({ id: uploaded.id });
		}
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
			...images.map(({ id }) =>
				requestUtils.rest({
					path: `/wp/v2/media/${id}`,
					method: 'DELETE',
					params: { force: true },
				})
			),
		]);

		images = [];
	});

	/**
	 * Publish a page and return its URL.
	 *
	 * @param {Object} requestUtils - REST utils.
	 * @param {string} title        - page title.
	 * @param {string} content      - page content.
	 * @return {Promise<string>} page URL.
	 */
	async function publish(requestUtils, title, content) {
		const created = await requestUtils.rest({
			path: '/wp/v2/pages',
			method: 'POST',
			data: { title, status: 'publish', content },
		});

		pageIds.push(created.id);

		return created.link;
	}

	[
		{ layout: 'masonry', masonry_columns: 2 },
		{ layout: 'grid', grid_columns: 2 },
		{ layout: 'tiles', tiles_type: '2|1,1|' },
		{ layout: 'justified', justified_row_height: 150 },
	].forEach((settings) => {
		test(`Visual Portfolio block lays out ${settings.layout} again at the new width`, async ({
			page,
			requestUtils,
		}) => {
			const link = await publish(
				requestUtils,
				`Container resize - legacy ${settings.layout}`,
				inBox(
					getLegacyMarkup({
						block_id: `e2eResize${settings.layout}`,
						content_source: 'images',
						images,
						items_count: -1,
						items_gap: 20,
						items_style: 'default',
						items_click_action: 'url',
						...settings,
					})
				)
			);

			const result = await widenAfterLayout(page, link, LEGACY_ITEM);

			expect(result.width).toBe(WIDE);
			expect(result.overlaps).toEqual([]);
			// The items reach across the new width, not the old one.
			expect(result.right).toBeGreaterThan(WIDE - 30);
		});
	});

	test('Visual Portfolio block keeps its layout while its container is hidden', async ({
		page,
		requestUtils,
	}) => {
		const hiddenBox = 'e2e-hidden-box';
		const gallery = (blockId) =>
			getLegacyMarkup({
				block_id: blockId,
				content_source: 'images',
				images,
				items_count: -1,
				items_gap: 20,
				layout: 'masonry',
				masonry_columns: 2,
			});
		const link = await publish(
			requestUtils,
			'Container resize - legacy hidden',
			inBox(gallery('e2eResizeWidened')) +
				`<div id="${hiddenBox}" style="width: ${NARROW}px">${gallery('e2eResizeHidden')}</div>`
		);

		await openSettled(page, link, LEGACY_ITEM);

		const getHeight = () =>
			page.evaluate(
				(box) =>
					document.querySelector(`#${box} .vp-portfolio__items`)
						.offsetHeight,
				hiddenBox
			);
		const height = await getHeight();

		// A closed tab or accordion reads 0 wide, and the gallery beside it
		// changes width meanwhile.
		await page.evaluate(
			({ box, hidden, width }) => {
				document.getElementById(hidden).style.display = 'none';
				document.getElementById(box).style.width = `${width}px`;
			},
			{ box: BOX, hidden: hiddenBox, width: WIDE }
		);
		await page.waitForTimeout(1000);

		// Read on the first frame after showing it, before any transition.
		const shown = await page.evaluate(
			(box) =>
				new Promise((resolve) => {
					document.getElementById(box).style.display = '';
					window.requestAnimationFrame(() =>
						resolve(
							document.querySelector(
								`#${box} .vp-portfolio__items`
							).offsetHeight
						)
					);
				}),
			hiddenBox
		);

		expect(height).toBeGreaterThan(0);
		expect(shown).toBe(height);
		expect(await getHeight()).toBe(height);
	});

	test('a stretched Visual Portfolio block widens without a page error', async ({
		page,
		requestUtils,
	}) => {
		await page.addInitScript(() => {
			window.e2eErrors = [];
			window.addEventListener('error', (event) =>
				window.e2eErrors.push(String(event.message))
			);
		});

		const link = await publish(
			requestUtils,
			'Container resize - legacy stretch',
			inBox(
				getLegacyMarkup({
					block_id: 'e2eResizeStretch',
					content_source: 'images',
					images,
					items_count: -1,
					items_gap: 20,
					layout: 'masonry',
					masonry_columns: 2,
					stretch: true,
				})
			)
		);

		const result = await widenAfterLayout(page, link, LEGACY_ITEM);

		expect(result.overlaps).toEqual([]);
		expect(await page.evaluate(() => window.e2eErrors)).toEqual([]);
	});

	[
		{ layoutType: 'masonry', layoutColumnCount: 2 },
		{ layoutType: 'grid', layoutColumnCount: 2 },
		{ layoutType: 'tiles', layoutTiles: '2|1,1|' },
		{ layoutType: 'justified', justifiedRowHeight: 150 },
	].forEach((layout) => {
		test(`Gallery Loop lays out ${layout.layoutType} again at the new width`, async ({
			page,
			requestUtils,
		}) => {
			const link = await publish(
				requestUtils,
				`Container resize - loop ${layout.layoutType}`,
				inBox(
					getLoopMarkup(
						{
							block_id: `e2e-resize-${layout.layoutType}`,
							queryId: 1,
							queryType: 'images',
							baseQuery: { perPage: IMAGES_COUNT, maxPages: 0 },
							imagesQuery: { images },
						},
						{
							layoutColumnsMode: 'manual',
							style: { spacing: { blockGap: '20px' } },
							...layout,
						}
					)
				)
			);

			const result = await widenAfterLayout(page, link, LOOP_ITEM);

			expect(result.width).toBe(WIDE);
			expect(result.overlaps).toEqual([]);
			expect(result.right).toBeGreaterThan(WIDE - 30);
		});
	});
});
