/**
 * Gallery Item Cover: where the content ends up.
 *
 * A cover paints its text on the picture, and the only proof of that is
 * geometry - no class says where a box landed.
 */
import { expect, test } from '@wordpress/e2e-test-utils-playwright';

import { getFixturePath } from '../utils/fixture-path';
import { getPluginSlug } from '../utils/plugin-slug';

const COVER = '.wp-block-visual-portfolio-item-cover';
const MEDIA = '.wp-block-visual-portfolio-item-cover__media';
const IMAGE = '.wp-block-visual-portfolio-item-cover__image-background';
const INNER = '.wp-block-visual-portfolio-item-cover__inner';

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
	 * Publish a page of covers and measure the first one.
	 *
	 * @param {Object} requestUtils - REST utils.
	 * @param {Object} page         - Playwright page.
	 * @param {string} title        - page title.
	 * @param {Object} coverAttrs   - attributes of the cover.
	 * @return {Promise<Object>} boxes of the cover, its media and its content.
	 */
	async function measure(requestUtils, page, title, coverAttrs) {
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

		return page
			.locator(COVER)
			.first()
			.evaluate(
				(cover, selectors) => {
					const box = (node) => {
						const rect = node.getBoundingClientRect();

						return {
							width: Math.round(rect.width),
							height: Math.round(rect.height),
							top: Math.round(rect.top),
							bottom: Math.round(rect.bottom),
						};
					};

					return {
						cover: box(cover),
						media: box(cover.querySelector(selectors.media)),
						image: box(cover.querySelector(selectors.image)),
						inner: box(cover.querySelector(selectors.inner)),
					};
				},
				{ media: MEDIA, image: IMAGE, inner: INNER }
			);
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
});
