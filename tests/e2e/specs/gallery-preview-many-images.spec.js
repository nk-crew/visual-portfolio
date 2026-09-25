/**
 * Block editor preview of a Media source gallery with a few hundred images.
 *
 * Every image used to reach the preview as several POST fields, and past PHP's
 * `max_input_vars` (1000 by default) the attributes after `images` were dropped.
 */
import { expect, test } from '@wordpress/e2e-test-utils-playwright';

import {
	getEditorCanvas,
	getPortfolioPreviewFrame,
} from '../utils/editor-canvas';
import { getPluginSlug } from '../utils/plugin-slug';
import { waitForPortfolioPreview } from '../utils/portfolio-preview';

/**
 * A Media source block with more image fields than `max_input_vars` allows.
 *
 * @param {Object} attributes - attributes to add.
 * @return {Object} block payload for `editor.insertBlock()`.
 */
function getManyImagesBlock(attributes = {}) {
	const images = Array.from({ length: 400 }, (value, i) => ({
		imgUrl: `https://example.com/image-${i}.png`,
		imgThumbnailUrl: `https://example.com/image-${i}.png`,
		title: `Image ${i}`,
	}));

	return {
		name: 'visual-portfolio/block',
		attributes: {
			block_id: 'e2e-many-images',
			content_source: 'images',
			images,
			...attributes,
		},
	};
}

test.describe('preview of a gallery with many images', () => {
	test.beforeEach(async ({ requestUtils }) => {
		await requestUtils.activatePlugin(getPluginSlug());
	});

	test.afterEach(async ({ requestUtils }) => {
		await requestUtils.deleteAllPosts();
	});

	test('keeps the settings that follow the images', async ({
		admin,
		editor,
		page,
	}) => {
		await admin.createNewPost();
		await editor.insertBlock(getManyImagesBlock({ items_count: 3 }));

		await waitForPortfolioPreview(page, { editor });

		await expect(
			getPortfolioPreviewFrame(page, editor).locator(
				'.vp-portfolio__item-wrap'
			)
		).toHaveCount(3);
	});

	test('survives a preview request the server rejects', async ({
		admin,
		editor,
		page,
	}) => {
		// A host that rejects the request serves its own error page, without the
		// isolation header the editor's frame needs, so the editor cannot read it.
		await page.route(/[?&]vp_preview=/, (route) =>
			route.request().method() === 'POST'
				? route.fulfill({
						status: 403,
						contentType: 'text/html',
						body: '<h1>Forbidden</h1>',
					})
				: route.continue()
		);

		await admin.createNewPost();
		await editor.insertBlock(getManyImagesBlock());

		const canvas = getEditorCanvas(page, editor);

		await expect(
			canvas.locator('.visual-portfolio-gutenberg-preview-loading')
		).toHaveCount(0);

		// A setting applied without a reload, which used to read the frame's window.
		await page.evaluate(() => {
			const { select, dispatch } = window.wp.data;
			const block = select('core/block-editor')
				.getBlocks()
				.find(({ name }) => name === 'visual-portfolio/block');

			dispatch('core/block-editor').updateBlockAttributes(
				block.clientId,
				{ items_gap: 33 }
			);
		});

		await expect(canvas.locator('[title="vp-preview"]')).toBeVisible();
		await expect(
			canvas.getByText('This block has encountered an error')
		).toHaveCount(0);
	});
});
