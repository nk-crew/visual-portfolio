/**
 * WordPress dependencies
 */
import { expect, test } from '@wordpress/e2e-test-utils-playwright';

import { findAsyncSequential } from '../utils/find-async-sequential';
import { getWordpressImages } from '../utils/get-wordpress-images';

/**
 * TODO: The test needs to be redone in the future.
 * Currently, saved layouts cannot be modified using Gutenberg methods
 * Because the block on the layout page is hardcoded,
 * Preventing the addition of other blocks.
 */
test.describe('click action gallery images (saved layout)', () => {
	test.beforeAll(async ({ requestUtils }) => {
		const pluginName = process.env.CORE
			? 'visual-portfolio-pro'
			: 'visual-portfolio-posts-amp-image-gallery';

		await Promise.all([
			requestUtils.activatePlugin(pluginName),
			requestUtils.deleteAllMedia(),
			requestUtils.deleteAllPages(),
		]);
	});
	test.afterAll(async ({ requestUtils }) => {
		await Promise.all([
			requestUtils.deleteAllMedia(),
			requestUtils.deleteAllPages(),
		]);
	});

	async function createSavedLayoutWithImages(
		page,
		admin,
		editor,
		requestUtils,
		alternativeSetting = false
	) {
		await admin.visitAdminPage('edit.php');

		const images = await getWordpressImages({
			requestUtils,
			page,
			admin,
			editor,
			alternativeSetting,
		});

		await admin.createNewPost({
			title: 'Test Saved Layout',
			postType: 'vp_lists',
			showWelcomeGuide: false,
			legacyCanvas: true,
		});

		await page
			.locator(
				'button.components-button.vpf-component-icon-selector-item',
				{
					hasText: 'Images',
				}
			)
			.click();

		await page
			.locator('button#menu-item-browse', {
				hasText: 'Media Library',
			})
			.click();

		await page.waitForTimeout(500);

		const imageList = await page.locator(
			'ul.attachments.ui-sortable.ui-sortable-disabled li.attachment[role="checkbox"]'
		);

		for (const image of await imageList.elementHandles()) {
			if (
				typeof images.find(
					async (x) => x.id === (await image.getAttribute('data-id'))
				).imgUrl !== 'undefined'
			) {
				await image.click();
			}
		}

		await page
			.locator('button.button.media-button.media-button-select', {
				hasText: 'Select',
			})
			.click();

		await page
			.locator('button.components-button.is-primary', {
				hasText: 'Continue',
			})
			.click();

		await page
			.locator(
				'button.components-button.vpf-component-icon-selector-item',
				{
					hasText: 'Classic',
				}
			)
			.click();

		await page
			.locator('button.components-button.is-primary', {
				hasText: 'Continue',
			})
			.click();

		await page
			.locator('button.components-button.is-primary', {
				hasText: 'Continue',
			})
			.click();

		await page
			.locator('.components-base-control__field', {
				hasText: 'Items Per Page',
			})
			.locator('input.components-text-control__input')
			.fill('10');

		const galleryControlItems = page.locator(
			'.vpf-component-gallery-control-items .vpf-component-gallery-control-item'
		);

		for (const item of await galleryControlItems.elementHandles()) {
			await item.click();

			const itemDescription = await page
				.locator('.components-base-control__field', {
					hasText: 'Description',
				})
				.locator('textarea.components-textarea-control__input')
				.innerHTML();

			const foundImage = await findAsyncSequential(
				images,
				async (x) => x.description === itemDescription
			);

			if (typeof foundImage !== 'undefined') {
				await page
					.locator(
						'.vpf-component-gallery-control-item-modal .components-base-control__field',
						{
							hasText: 'Title',
						}
					)
					.locator('input.components-text-control__input')
					.fill(foundImage.title);

				if (typeof foundImage.format !== 'undefined') {
					await page
						.locator(
							'.vpf-component-gallery-control-item-modal .components-base-control__field',
							{
								hasText: 'Format',
							}
						)
						.locator('.vpf-component-select')
						.click();

					await page
						.locator('.vpf-component-select-option-label', {
							hasText: foundImage.format,
						})
						.click();

					if (
						foundImage.format === 'standard' &&
						typeof foundImage.url !== 'undefined'
					) {
						await page
							.getByRole('textbox', { name: 'URL', exact: true })
							.fill(foundImage.url);
					}

					if (
						foundImage.format === 'video' &&
						typeof foundImage.video_url !== 'undefined'
					) {
						await page
							.locator(
								'.vpf-component-gallery-control-item-modal .components-base-control__field',
								{
									hasText: 'Video URL',
								}
							)
							.locator('input.components-text-control__input')
							.fill(foundImage.video_url);
					}
				}
			}

			await page.getByLabel('Close', { exact: true }).click();
		}

		// Publish Post.
		await editor.publishPost();

		let postID = await page.locator('input[name="post_ID"]').inputValue();
		postID = typeof postID === 'string' ? parseInt(postID, 10) : null;

		const postLink = page.url();

		return { postID, postLink, images };
	}

	test('check disabled click action (saved layout)', async ({
		page,
		admin,
		editor,
		requestUtils,
	}) => {
		const { postID, postLink } = await createSavedLayoutWithImages(
			page,
			admin,
			editor,
			requestUtils
		);

		await page.goto(postLink);

		await page
			.locator('.components-panel__body', {
				hasText: 'Click Action',
			})
			.click();

		await page
			.locator(
				'button.components-button.vpf-component-icon-selector-item',
				{
					hasText: 'Disabled',
				}
			)
			.click();

		// Save Layout.
		await page
			.locator('button.components-button.editor-post-publish-button', {
				hasText: 'Save',
			})
			.first()
			.click();

		await admin.createNewPost({
			title: 'Click Action (with saved layout)',
			postType: 'page',
			showWelcomeGuide: false,
			legacyCanvas: true,
		});

		await editor.insertBlock({
			name: 'visual-portfolio/saved',
			attributes: { id: String(postID) },
		});

		await page.waitForTimeout(500);

		// Publish Post.
		await editor.publishPost();

		// Go to published post.
		await page
			.locator('.components-button', {
				hasText: 'View Page',
			})
			.first()
			.click();

		const link = page.locator('a.vp-portfolio__item-meta');

		await expect(link).toBeHidden();
	});
});
