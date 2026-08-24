/**
 * Gallery Item Cover: where the content ends up, and how it gets there.
 *
 * A cover paints its text on the picture, and the only proof of that is
 * geometry - no class says where a box landed. The hover effects are the same
 * kind of claim: what makes an emerging panel an emerging one is that it is at
 * the foot of the card and no taller than its own text, and what makes a flying
 * one fly is the side it rests on when the pointer leaves.
 */
import { expect, test } from '@wordpress/e2e-test-utils-playwright';

import { getFixturePath } from '../utils/fixture-path';
import { getPluginSlug } from '../utils/plugin-slug';

const COVER = '.wp-block-visual-portfolio-item-cover';
const MEDIA = '.wp-block-visual-portfolio-item-cover__media';
const IMAGE = '.wp-block-visual-portfolio-item-cover__image-background';
const INNER = '.wp-block-visual-portfolio-item-cover__inner';
const HOVER_OVERLAY = '.wp-block-visual-portfolio-item-cover__overlay--hover';

/**
 * Serialized markup of a loop of covers.
 *
 * @param {Array}  images     - images of the source.
 * @param {Object} coverAttrs - attributes of the cover.
 * @return {string} serialized blocks.
 */
function getMarkup(images, coverAttrs) {
	const loop = {
		block_id: 'e2e-cover',
		queryId: 1,
		queryType: 'images',
		baseQuery: { perPage: images.length },
		imagesQuery: { images },
	};

	return [
		`<!-- wp:visual-portfolio/loop ${JSON.stringify(loop)} -->`,
		'<div class="wp-block-visual-portfolio-loop vp-block-loop">',
		'<!-- wp:visual-portfolio/item-template {"layoutColumns":3} -->',
		`<!-- wp:visual-portfolio/item-cover ${JSON.stringify(coverAttrs)} -->`,
		'<!-- wp:visual-portfolio/item-title /-->',
		'<!-- wp:visual-portfolio/item-date /-->',
		'<!-- /wp:visual-portfolio/item-cover -->',
		'<!-- /wp:visual-portfolio/item-template -->',
		'</div>',
		'<!-- /wp:visual-portfolio/loop -->',
	].join('');
}

test.describe('Gallery Item Cover placement', () => {
	let images = [];
	let pageIds = [];

	test.beforeAll(async ({ requestUtils }) => {
		await requestUtils.activatePlugin(getPluginSlug());

		const uploaded = await requestUtils.uploadMedia(
			getFixturePath('image-800x600.png')
		);

		images = [{ id: uploaded.id, title: 'Cover item' }];
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
	 * Publish a page of covers and open it.
	 *
	 * @param {Object} requestUtils - REST utils.
	 * @param {Object} page         - Playwright page.
	 * @param {string} title        - page title.
	 * @param {Object} coverAttrs   - attributes of the cover.
	 * @return {Promise<void>} resolves once the page is open.
	 */
	async function publish(requestUtils, page, title, coverAttrs) {
		const created = await requestUtils.rest({
			path: '/wp/v2/pages',
			method: 'POST',
			data: {
				title,
				status: 'publish',
				content: getMarkup(images, coverAttrs),
			},
		});

		pageIds.push(created.id);

		await page.goto(created.link, { waitUntil: 'load' });
	}

	/**
	 * Boxes of a cover and of the parts inside it.
	 *
	 * @param {Object} cover - locator of the cover.
	 * @return {Promise<Object>} boxes, keyed by part.
	 */
	function readBoxes(cover) {
		return cover.evaluate(
			(node, selectors) => {
				const box = (part) => {
					if (!part) {
						return null;
					}

					const rect = part.getBoundingClientRect();

					return {
						width: Math.round(rect.width),
						height: Math.round(rect.height),
						top: Math.round(rect.top),
						bottom: Math.round(rect.bottom),
					};
				};

				return {
					cover: box(node),
					media: box(node.querySelector(selectors.media)),
					image: box(node.querySelector(selectors.image)),
					inner: box(node.querySelector(selectors.inner)),
					overlay: box(node.querySelector(selectors.overlay)),
				};
			},
			{
				media: MEDIA,
				image: IMAGE,
				inner: INNER,
				overlay: HOVER_OVERLAY,
			}
		);
	}

	/**
	 * Publish a page of covers and measure the first one.
	 *
	 * @param {Object} requestUtils - REST utils.
	 * @param {Object} page         - Playwright page.
	 * @param {string} title        - page title.
	 * @param {Object} coverAttrs   - attributes of the cover.
	 * @return {Promise<Object>} boxes of the cover and of its parts.
	 */
	async function measure(requestUtils, page, title, coverAttrs) {
		await publish(requestUtils, page, title, coverAttrs);

		return readBoxes(page.locator(COVER).first());
	}

	test('over the image, the content sits on top of the picture', async ({
		page,
		requestUtils,
	}) => {
		const boxes = await measure(requestUtils, page, 'Cover - over', {
			showContent: 'always',
		});

		// The picture fills the whole cover, and the content is drawn over it.
		expect(boxes.media.height).toBe(boxes.cover.height);
		expect(boxes.inner.top).toBeGreaterThanOrEqual(boxes.media.top);
		expect(boxes.inner.bottom).toBeLessThanOrEqual(boxes.media.bottom);

		// A ratio of one, by default.
		expect(boxes.cover.height).toBe(boxes.cover.width);
	});

	test('emerge puts the panel at the foot of the card, overlay and all', async ({
		page,
		requestUtils,
	}) => {
		await publish(requestUtils, page, 'Cover - emerge', {
			effect: 'emerge',
			hoverDimRatio: 60,
			customHoverOverlayColor: '#000000',
		});

		const cover = page.locator(COVER).first();

		await cover.hover();

		// Settled, so that the panel is measured where it arrived.
		await page.waitForTimeout(500);

		const boxes = await readBoxes(cover);

		// A panel, not a surface: as wide as the card, only as tall as what it
		// holds, and resting on the bottom edge with the picture still showing
		// above it.
		expect(boxes.inner.width).toBe(boxes.cover.width);
		expect(Math.abs(boxes.inner.bottom - boxes.cover.bottom)).toBeLessThan(
			2
		);
		expect(boxes.inner.top - boxes.cover.top).toBeGreaterThan(
			boxes.cover.height / 4
		);

		// The overlay is the background of that panel, so it covers what the
		// panel covers and nothing more.
		expect(boxes.overlay).toEqual(boxes.inner);
	});

	test('fly leaves through the edge the pointer crossed, without fading', async ({
		page,
		requestUtils,
	}) => {
		await publish(requestUtils, page, 'Cover - fly', {
			effect: 'fly',
			hoverDimRatio: 60,
			customHoverOverlayColor: '#000000',
		});

		const cover = page.locator(COVER).first();
		const inner = cover.locator(INNER);
		const overlay = cover.locator(HOVER_OVERLAY);

		// Armed by the script module, which is the only thing that hides the
		// content of a flying cover.
		await expect(cover).toHaveAttribute('data-vp-fly', 'true');

		const rect = await cover.boundingBox();

		/**
		 * Enter through one edge and leave through another.
		 *
		 * The pointer is walked rather than teleported: the effect reads the
		 * segment between the last two positions, and a single jump into the
		 * middle of the card has no segment to read.
		 *
		 * @param {Object} from - point outside the card to enter from.
		 * @param {Object} to   - point outside the card to leave through.
		 * @return {Promise<string>} inline transform the panel came to rest at.
		 */
		async function walk(from, to) {
			await page.mouse.move(from.x, from.y);
			await page.mouse.move(
				rect.x + rect.width / 2,
				rect.y + rect.height / 2
			);
			await page.mouse.move(to.x, to.y);

			return inner.evaluate((node) => node.style.transform);
		}

		const outLeft = { x: rect.x - 30, y: rect.y + rect.height / 2 };
		const outRight = {
			x: rect.x + rect.width + 30,
			y: rect.y + rect.height / 2,
		};
		const outTop = { x: rect.x + rect.width / 2, y: rect.y - 30 };

		expect(await walk(outLeft, outRight)).toContain('translateX(100.1%)');
		expect(await walk(outRight, outLeft)).toContain('translateX(-100.1%)');
		expect(await walk(outLeft, outTop)).toContain('translateY(-100.1%)');

		// Nothing fades on the way: the panel is somewhere else, not dimmer.
		await page.mouse.move(outLeft.x, outLeft.y);
		await page.mouse.move(
			rect.x + rect.width / 2,
			rect.y + rect.height / 2
		);
		await page.waitForTimeout(500);

		await expect(inner).toHaveCSS('opacity', '1');
		await expect(overlay).toHaveCSS('opacity', '0.6');
	});
});
