/**
 * WordPress dependencies
 */
import { expect, test } from '@wordpress/e2e-test-utils-playwright';

/**
 * Test Images
 */
import imageFixtures from '../../fixtures/images.json';
import { findAsyncSequential } from '../utils/find-async-sequential';
import { getWordpressImages } from '../utils/get-wordpress-images';

test.describe('added images to saved layout', () => {
	test.beforeEach(async ({ requestUtils }) => {
		const pluginName = process.env.CORE
			? 'visual-portfolio-pro'
			: 'visual-portfolio-posts-amp-image-gallery';
		await requestUtils.activatePlugin(pluginName);
		await requestUtils.deleteAllMedia();
		await requestUtils.deleteAllPages();
	});
	test.afterEach(async ({ requestUtils }) => {
		await requestUtils.deleteAllMedia();
		await requestUtils.deleteAllPages();
	});

	/**
	 * We create a gallery block and add pictures to it manually or automatically.
	 *
	 * @param {RequestUtils} requestUtils       Playwright utilities for interacting with the WordPress REST API.
	 * @param {Page}         page               Provides methods to interact with a single tab in a Browser, or an extension background page in Chromium.
	 * @param {Admin}        admin              End to end test utilities for WordPress admin’s user interface.
	 * @param {Editor}       editor             End to end test utilities for the WordPress Block Editor.
	 * @param {boolean}      alternativeSetting Flag for setting alternative meta settings for test images.
	 * @param                checkImageSettings
	 * @return {{images: {format: string, video_url: string, url: string}[]}}
	 */
	async function generateGalleryBeforeEachTest(
		requestUtils,
		page,
		admin,
		editor,
		alternativeSetting = false,
		checkImageSettings = false
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
			title: 'Test Adding Images to Saved Layout',
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

				const imageID = await image.getAttribute('data-id');

				const foundImage = await findAsyncSequential(
					images,
					async (x) => x.id === Number(imageID)
				);

				const foundFixture = await findAsyncSequential(
					imageFixtures,
					async (x) => x.description === foundImage.description
				);

				if (typeof (await foundFixture) !== 'undefined') {
					await page
						.locator('#attachment-details-alt-text')
						.fill(foundFixture.alt);

					await page
						.locator('#attachment-details-caption')
						.fill(foundFixture.caption);

					await page
						.locator('#attachment-details-description')
						.fill(foundFixture.description);
				}
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

		if (checkImageSettings) {
			await page
				.locator(
					'button.components-button.components-panel__body-toggle',
					{
						hasText: 'Skin',
					}
				)
				.click();

			await page
				.locator(
					'button.components-button.components-navigator-button',
					{
						hasText: 'Caption',
					}
				)
				.click();

			await page
				.locator(
					'button.components-button.vpf-component-collapse-control-toggle',
					{
						hasText: 'Elements',
					}
				)
				.click();

			await page
				.getByRole('checkbox', { name: 'Display Excerpt' })
				.check();
		}

		await page.waitForTimeout(500);

		// Check images on backend editor.
		for (const image of await images) {
			await expect(
				page
					.frameLocator('[title="vp-preview"]')
					.locator('.wp-image-' + image.id)
			).toBeVisible();
		}

		// Publish Post.
		await editor.publishPost();

		let postID = await page.locator('input[name="post_ID"]').inputValue();
		postID = typeof postID === 'string' ? parseInt(postID, 10) : null;

		return { postID, images };
	}

	test('added images to a saved layout manually', async ({
		page,
		admin,
		editor,
		requestUtils,
	}) => {
		const { images, postID } = await generateGalleryBeforeEachTest(
			requestUtils,
			page,
			admin,
			editor
		);

		await admin.createNewPost({
			title: 'Test Saved Layout',
			postType: 'page',
			showWelcomeGuide: false,
			legacyCanvas: true,
		});

		await editor.insertBlock({
			name: 'visual-portfolio/saved',
			attributes: { id: String(postID) },
		});

		await page.waitForTimeout(500);

		// Check images on backend editor.
		for (const image of images) {
			await expect(
				page.frame('vpf-preview-1').locator('.wp-image-' + image.id)
			).toBeVisible();
		}

		// Publish Post.
		await editor.publishPost();

		// Go to published post.
		await page
			.locator('.components-button', {
				hasText: 'View Page',
			})
			.first()
			.click();

		// Check images on frontend.
		for (const image of await images) {
			await expect(page.locator('.wp-image-' + image.id)).toBeVisible();
		}
	});

	test('checking image settings on saved layout', async ({
		page,
		admin,
		editor,
		requestUtils,
	}) => {
		const { images, postID } = await generateGalleryBeforeEachTest(
			requestUtils,
			page,
			admin,
			editor,
			false,
			true
		);

		await admin.createNewPost({
			title: 'Test Saved Layout (image settings)',
			postType: 'page',
			showWelcomeGuide: false,
			legacyCanvas: true,
		});

		await editor.insertBlock({
			name: 'visual-portfolio/saved',
			attributes: { id: String(postID) },
		});

		await page.waitForTimeout(500);

		// Check images on backend editor.
		for (const image of images) {
			const imageContainer = page
				.frame('vpf-preview-1')
				.locator('.wp-image-' + image.id);
			await expect(imageContainer).toBeVisible();

			await expect(
				page
					.frame('vpf-preview-1')
					.locator('.vp-portfolio__item-meta-excerpt', {
						hasText: image.description,
					})
			).toBeVisible();

			const foundFixture = await findAsyncSequential(
				imageFixtures,
				async (x) => x.description === image.description
			);

			await expect(
				page.frame('vpf-preview-1').getByAltText(foundFixture.alt)
			).toBeVisible();
		}

		// Publish Post.
		await editor.publishPost();

		// Go to published post.
		await page
			.locator('.components-button', {
				hasText: 'View Page',
			})
			.first()
			.click();

		// Check images on frontend.
		for (const image of images) {
			await expect(page.locator('.wp-image-' + image.id)).toBeVisible();

			const itemContainer = page
				.locator('.vp-portfolio__item')
				.filter({ has: page.locator('.wp-image-' + image.id) });

			await expect(itemContainer).toBeVisible();

			const descriptionText = itemContainer.locator(
				'.vp-portfolio__item-meta-excerpt div'
			);

			await expect(descriptionText).toHaveText(image.description);

			const foundFixture = await findAsyncSequential(
				imageFixtures,
				async (x) => x.description === image.description
			);

			await expect(page.getByAltText(foundFixture.alt)).toBeVisible();
		}
	});

	test('checking alternative image settings on saved layout', async ({
		page,
		admin,
		editor,
		requestUtils,
	}) => {
		const currentPage = page.url();

		await admin.createNewPost({
			title: 'Sample Test Page',
			postType: 'page',
			content: 'Test content',
			showWelcomeGuide: false,
			legacyCanvas: true,
		});

		// Publish Post.
		await editor.publishPost();

		// Go to published post.
		await page
			.locator('.components-button', {
				hasText: 'View Page',
			})
			.first()
			.click();

		const postLink = page.url();

		await page.goto(currentPage);

		const { images, postID } = await generateGalleryBeforeEachTest(
			requestUtils,
			page,
			admin,
			editor,
			false,
			true
		);

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

			const foundFixture = await findAsyncSequential(
				imageFixtures,
				async (x) => x.description === itemDescription
			);

			const foundFixtureIndex = imageFixtures.indexOf(foundFixture);

			imageFixtures[foundFixtureIndex].id = foundImage.id;

			if (typeof foundFixture.imageSettings !== 'undefined') {
				await page
					.locator(
						'.vpf-component-gallery-control-item-modal .components-base-control__field',
						{
							hasText: 'Title',
						}
					)
					.locator('input.components-text-control__input')
					.fill(foundFixture.imageSettings.title);

				await page
					.locator(
						'.vpf-component-gallery-control-item-modal .components-base-control__field',
						{
							hasText: 'Description',
						}
					)
					.locator('textarea.components-textarea-control__input')
					.fill(foundFixture.imageSettings.description);

				if (typeof foundFixture.imageSettings.format !== 'undefined') {
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
							hasText: foundFixture.imageSettings.format,
						})
						.click();

					if (
						foundFixture.imageSettings.format === 'standard' &&
						typeof foundFixture.imageSettings.url !== 'undefined'
					) {
						foundFixture.imageSettings.url =
							foundFixture.imageSettings.url === 'postLink'
								? postLink
								: foundFixture.imageSettings.url;

						await page
							.getByRole('textbox', { name: 'URL', exact: true })
							.fill(foundFixture.imageSettings.url);
					}

					if (
						foundFixture.imageSettings.format === 'video' &&
						typeof foundFixture.imageSettings.videoUrl !==
							'undefined'
					) {
						await page
							.locator(
								'.vpf-component-gallery-control-item-modal .components-base-control__field',
								{
									hasText: 'Video URL',
								}
							)
							.locator('input.components-text-control__input')
							.fill(foundFixture.imageSettings.videoUrl);
					}
				}
			}

			await page.getByLabel('Close', { exact: true }).click();
		}

		// Check image attributes on backend editor.
		for (const image of imageFixtures) {
			const imageContainer = page
				.frameLocator('[title="vp-preview"]')
				.locator('.wp-image-' + image.id);
			await expect(imageContainer).toBeVisible();

			if (typeof image.imageSettings !== 'undefined') {
				await expect(
					page
						.frameLocator('[title="vp-preview"]')
						.locator('.vp-portfolio__item-meta-excerpt', {
							hasText: image.imageSettings.description,
						})
				).toBeVisible();

				await expect(
					page
						.frameLocator('[title="vp-preview"]')
						.locator('.vp-portfolio__item-meta-title > a', {
							hasText: image.imageSettings.title,
						})
				).toBeVisible();

				if (typeof image.imageSettings.format !== 'undefined') {
					const format = image.imageSettings.format;
					if (
						format === 'standard' &&
						typeof image.imageSettings.url !== 'undefined'
					) {
						await expect(
							page
								.frameLocator('[title="vp-preview"]')
								.locator('.vp-portfolio__item-meta-title > a', {
									hasText: image.imageSettings.title,
								})
						).toHaveAttribute('href', image.imageSettings.url);

						await expect(
							page
								.frameLocator('[title="vp-preview"]')
								.getByRole('link', { name: image.alt })
						).toHaveAttribute('href', image.imageSettings.url);
					}

					if (
						format === 'video' &&
						typeof image.imageSettings.videoUrl !== 'undefined'
					) {
						await expect(
							page
								.frameLocator('[title="vp-preview"]')
								.locator('.vp-portfolio__item-meta-title > a', {
									hasText: image.imageSettings.title,
								})
						).toHaveAttribute('href', image.imageSettings.videoUrl);

						await expect(
							page
								.frameLocator('[title="vp-preview"]')
								.getByRole('link', { name: image.alt })
						).toHaveAttribute('href', image.imageSettings.videoUrl);
					}
				}
			} else {
				await expect(
					page
						.frameLocator('[title="vp-preview"]')
						.locator('.vp-portfolio__item-meta-excerpt', {
							hasText: image.description,
						})
				).toBeVisible();
			}

			await expect(
				page
					.frameLocator('[title="vp-preview"]')
					.getByAltText(image.alt)
			).toBeVisible();
		}

		// Save Layout.
		await page
			.locator('button.components-button.editor-post-publish-button', {
				hasText: 'Save',
			})
			.first()
			.click();

		await admin.createNewPost({
			title: 'Test Saved Layout (alternative image settings)',
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

		// Check image attributes on frontend.
		for (const image of imageFixtures) {
			await expect(page.locator('.wp-image-' + image.id)).toBeVisible();

			const itemContainer = page
				.locator('.vp-portfolio__item')
				.filter({ has: page.locator('.wp-image-' + image.id) });

			await expect(itemContainer).toBeVisible();

			if (typeof image.imageSettings !== 'undefined') {
				await expect(
					page.locator('.vp-portfolio__item-meta-excerpt', {
						hasText: image.imageSettings.description,
					})
				).toBeVisible();

				await expect(
					page.locator('.vp-portfolio__item-meta-title > a', {
						hasText: image.imageSettings.title,
					})
				).toBeVisible();

				if (typeof image.imageSettings.format !== 'undefined') {
					const format = image.imageSettings.format;
					if (
						format === 'standard' &&
						typeof image.imageSettings.url !== 'undefined'
					) {
						await expect(
							page.locator('.vp-portfolio__item-meta-title > a', {
								hasText: image.imageSettings.title,
							})
						).toHaveAttribute('href', image.imageSettings.url);

						await expect(
							page.getByRole('link', { name: image.alt })
						).toHaveAttribute('href', image.imageSettings.url);
					}

					if (
						format === 'video' &&
						typeof image.imageSettings.videoUrl !== 'undefined'
					) {
						await expect(
							page.locator('.vp-portfolio__item-meta-title > a', {
								hasText: image.imageSettings.title,
							})
						).toHaveAttribute('href', image.imageSettings.videoUrl);

						await expect(
							page.getByRole('link', { name: image.alt })
						).toHaveAttribute('href', image.imageSettings.videoUrl);
					}
				}
			} else {
				await expect(
					page.locator('.vp-portfolio__item-meta-excerpt', {
						hasText: image.description,
					})
				).toBeVisible();
			}

			await expect(page.getByAltText(image.alt)).toBeVisible();
		}
	});
});
