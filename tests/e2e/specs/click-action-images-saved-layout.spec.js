/**
 * WordPress dependencies
 */
import { expect, test } from '@wordpress/e2e-test-utils-playwright';
import { createLegacySavedLayout } from '../utils/create-legacy-saved-layout';
import { getEditorCanvas } from '../utils/editor-canvas';
import { findAsyncSequential } from '../utils/find-async-sequential';
import { getWordpressImages } from '../utils/get-wordpress-images';
import {
	confirmMediaLibrarySelection,
	openMediaLibrary,
	selectMediaLibraryImages,
} from '../utils/media-library';
import { openPublishedPage } from '../utils/open-published-page';
import { getPluginSlug } from '../utils/plugin-slug';
import { waitForPortfolioPreview } from '../utils/portfolio-preview';

function getRestRoute(url) {
	return url.searchParams.get('rest_route') || url.pathname;
}

function isLayoutSettingsRoute(url) {
	return getRestRoute(url).endsWith('/visual-portfolio/v1/update_layout/');
}

function waitForLayoutPostSave(page, postID) {
	return page.waitForResponse(
		(response) =>
			response.request().method() === 'POST' &&
			getRestRoute(new URL(response.url())).endsWith(
				`/wp/v2/vp_lists/${postID}`
			)
	);
}

function getSaveButton(page) {
	return page
		.getByRole('region', { name: 'Editor top bar' })
		.getByRole('button', { name: 'Save', exact: true });
}

/**
 * TODO: The test needs to be redone in the future.
 * Currently, saved layouts cannot be modified using Gutenberg methods
 * Because the block on the layout page is hardcoded,
 * Preventing the addition of other blocks.
 */
test.describe('click action gallery images (saved layout)', () => {
	test.beforeAll(async ({ requestUtils }) => {
		const pluginName = getPluginSlug();

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
		const images = await getWordpressImages({
			requestUtils,
			page,
			admin,
			editor,
			alternativeSetting,
		});

		await createLegacySavedLayout(admin, editor, {
			title: 'Test Saved Layout',
		});

		const canvas = getEditorCanvas(page, editor);

		await canvas
			.locator(
				'button.components-button.vpf-component-icon-selector-item',
				{
					hasText: 'Media',
				}
			)
			.click();

		await openMediaLibrary(page);
		await selectMediaLibraryImages(
			page,
			images
				.filter((image) => typeof image.imgUrl !== 'undefined')
				.map((image) => image.id)
		);
		await confirmMediaLibrarySelection(page);

		await canvas
			.locator('button.components-button.is-primary', {
				hasText: 'Continue',
			})
			.click();

		await canvas
			.locator(
				'button.components-button.vpf-component-icon-selector-item',
				{
					hasText: 'Classic',
				}
			)
			.click();

		await canvas
			.locator('button.components-button.is-primary', {
				hasText: 'Continue',
			})
			.click();

		await canvas
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
		const { postID, postLink, images } = await createSavedLayoutWithImages(
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

		const layoutSave = Promise.withResolvers();
		await page.route(
			isLayoutSettingsRoute,
			async (route) => {
				await layoutSave.promise;
				await route.continue();
			},
			{ times: 1 }
		);

		try {
			const [saved] = await Promise.all([
				waitForLayoutPostSave(page, postID),
				getSaveButton(page).click(),
			]);
			expect(saved.ok()).toBe(true);
			await page.waitForFunction(
				(id) =>
					!window.wp.data
						.select('core')
						.isSavingEntityRecord('postType', 'vp_lists', id),
				postID
			);
			expect(
				await page.evaluate(() =>
					window.wp.data.select('core/editor').isSavingPost()
				)
			).toBe(true);
		} finally {
			layoutSave.resolve();
		}

		await page.waitForFunction(
			() => !window.wp.data.select('core/editor').isSavingPost()
		);

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

		await waitForPortfolioPreview(page, { editor });

		// Publish Post.
		await editor.publishPost();

		// Go to published post.
		const frontendPage = await openPublishedPage(page);

		await expect(
			frontendPage.locator('.vp-portfolio__item-wrap')
		).toHaveCount(images.filter((image) => image.imgUrl).length);
		const link = frontendPage.locator('a.vp-portfolio__item-meta');

		await expect(link).toBeHidden();
	});

	test('keeps later edits pending and retries a failed save', async ({
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
			.getByRole('button', { name: 'Click Action', exact: true })
			.click();
		const clickAction = (name) =>
			page
				.locator('button.vpf-component-icon-selector-item')
				.getByText(name, {
					exact: true,
				});
		await clickAction('Disabled').click();

		const saveButton = getSaveButton(page);
		const isLayoutWrite = (response) =>
			isLayoutSettingsRoute(new URL(response.url()));
		const coreRequest = Promise.withResolvers();
		const coreSave = Promise.withResolvers();
		await page.route(
			(url) => getRestRoute(url).endsWith(`/wp/v2/vp_lists/${postID}`),
			async (route) => {
				coreRequest.resolve();
				await coreSave.promise;
				await route.continue();
			},
			{ times: 1 }
		);

		const settingsSaved = page.waitForResponse(isLayoutWrite);
		try {
			await saveButton.click();
			await coreRequest.promise;
			await clickAction('URL').click();
		} finally {
			coreSave.resolve();
		}
		const first = await settingsSaved;
		expect(first.ok()).toBe(true);
		expect(first.request().postDataJSON().data.vp_items_click_action).toBe(
			'false'
		);
		await expect(saveButton).toBeEnabled();

		await page.route(
			isLayoutSettingsRoute,
			(route) =>
				route.fulfill({
					status: 500,
					json: {
						code: 'layout_save_failed',
						message: 'The layout settings could not be saved.',
					},
				}),
			{ times: 1 }
		);
		await saveButton.click();
		await expect(
			page.getByText('The layout settings could not be saved.').first()
		).toBeVisible();
		await expect(saveButton).toBeEnabled();

		const [retry] = await Promise.all([
			page.waitForResponse(isLayoutWrite),
			saveButton.click(),
		]);
		expect(retry.ok()).toBe(true);
		expect(retry.request().postDataJSON().data.vp_items_click_action).toBe(
			'url'
		);
		await expect(
			page
				.getByRole('button', { name: 'Dismiss this notice' })
				.filter({ hasText: 'updated' })
		).toBeVisible();

		let settingsWrites = 0;
		await page.route(isLayoutSettingsRoute, async (route) => {
			settingsWrites++;
			await route.fulfill({ status: 500 });
		});
		const title = 'Renamed Legacy Layout';
		await getEditorCanvas(page, editor)
			.getByRole('textbox', { name: 'Add title' })
			.fill(title);
		const [renamed] = await Promise.all([
			waitForLayoutPostSave(page, postID),
			saveButton.click(),
		]);
		expect(renamed.ok()).toBe(true);
		expect((await renamed.json()).title.rendered).toBe(title);
		await page.waitForFunction(
			() => !window.wp.data.select('core/editor').isSavingPost()
		);
		expect(settingsWrites).toBe(0);
	});
});
