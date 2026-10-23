/**
 * Media Settings panel of the classic block's Images source.
 *
 * A gallery can arrive holding nothing but attachment ids: from a pattern, from
 * PHP, or from another editor. The front end and the preview render it by id,
 * so the panel has to show the same images rather than empty grey squares.
 */
import { expect, test } from '@wordpress/e2e-test-utils-playwright';

import { getFixturePath } from '../utils/fixture-path';
import { getPluginSlug } from '../utils/plugin-slug';

const ITEM_BUTTON = '.vpf-component-gallery-control-item-button';

test.describe('media settings panel', () => {
	let images = [];

	test.beforeAll(async ({ requestUtils }) => {
		await requestUtils.activatePlugin(getPluginSlug());

		images = await Promise.all(
			['image-1920x1080.jpeg', 'image-2000x2000.jpeg'].map((file) =>
				requestUtils.uploadMedia(getFixturePath(file))
			)
		);
	});

	test.afterAll(async ({ requestUtils }) => {
		await Promise.all([
			requestUtils.deleteAllMedia(),
			requestUtils.deleteAllPosts(),
		]);
	});

	test.beforeEach(async ({ admin, page }) => {
		await admin.createNewPost({
			postType: 'page',
			showWelcomeGuide: false,
			legacyCanvas: true,
		});
		// A block inserted before the editor finishes its setup is dropped.
		await page.waitForFunction(() =>
			window.wp.data.select('core/editor').__unstableIsEditorReady()
		);
	});

	test('shows images of a gallery saved with ids only', async ({
		page,
		editor,
	}) => {
		await editor.insertBlock({
			name: 'visual-portfolio/block',
			attributes: {
				setup_wizard: 'false',
				content_source: 'images',
				images: images.map(({ id }) => ({ id })),
			},
		});

		const thumbnails = page.locator(`${ITEM_BUTTON} img`);

		await expect(thumbnails).toHaveCount(images.length);

		for (const thumbnail of await thumbnails.all()) {
			await expect(thumbnail).toHaveAttribute('src', /\S/);
			await expect
				.poll(() => thumbnail.evaluate((img) => img.naturalWidth))
				.toBeGreaterThan(0);
		}

		// The items had an inner shadow drawn over every thumbnail.
		const shadows = await page
			.locator(ITEM_BUTTON)
			.evaluateAll((buttons) =>
				buttons.map(
					(button) => getComputedStyle(button, '::before').boxShadow
				)
			);

		expect(shadows).toEqual(images.map(() => 'none'));
	});

	test('keeps the focal point toggle clear of the featured image', async ({
		page,
		editor,
	}) => {
		await page.evaluate(
			(id) =>
				window.wp.data
					.dispatch('core/editor')
					.editPost({ featured_media: id }),
			images[0].id
		);
		await editor.openDocumentSettingsSidebar();

		// WordPress 7.2 draws the featured image with the DataForm media field,
		// a dashed frame around the image; older versions with their own panel.
		const featuredImage = page
			.locator(
				'fieldset.media-edit[data-field-id="featured_media"], .editor-post-featured-image'
			)
			.first();
		const toggle = page.locator(
			'.vpf-component-focal-point-control__toggle'
		);

		await expect(featuredImage.locator('img')).toBeVisible();
		await expect(toggle).toBeVisible();

		const imageBox = await featuredImage.boundingBox();
		const toggleBox = await toggle.boundingBox();

		expect(toggleBox.y).toBeGreaterThanOrEqual(
			imageBox.y + imageBox.height
		);
	});
});
