/**
 * WordPress dependencies
 */
import { expect, test } from '@wordpress/e2e-test-utils-playwright';

import expectedPopupPreset from '../../fixtures/click-actions/popup-expected-preset.json';
import expectedUrlPreset from '../../fixtures/click-actions/url-expected-preset.json';
import { findAsyncSequential } from '../utils/find-async-sequential';
import { getWordpressImages } from '../utils/get-wordpress-images';

test.describe('click action gallery images', () => {
	test.beforeAll(async ({ requestUtils }) => {
		await requestUtils.activatePlugin(
			'visual-portfolio-posts-amp-image-gallery'
		);
		await requestUtils.deleteAllMedia();
		await requestUtils.deleteAllPages();
	});
	test.afterAll(async ({ requestUtils }) => {
		await requestUtils.deleteAllMedia();
		await requestUtils.deleteAllPages();
	});

	async function preparePopupFixture(size, property, key) {
		if (
			typeof expectedPopupPreset[key][property] === 'string' &&
			expectedPopupPreset[key][property].includes(size)
		) {
			switch (size) {
				case '2000x2000':
					expectedPopupPreset[key][property] = expectedPopupPreset[
						key
					][property].replace('.jpeg', '-1920x1920.jpeg');
					break;
				case '3840x2160':
					expectedPopupPreset[key][property] = expectedPopupPreset[
						key
					][property].replace('scaled.jpeg', '1920x1080.jpeg');
					break;
				case '3840x2560':
					expectedPopupPreset[key][property] = expectedPopupPreset[
						key
					][property].replace('scaled.jpeg', '1920x1280.jpeg');
					break;
			}
		}
	}

	async function prepareUrlFixture(size, property, key) {
		if (
			typeof expectedUrlPreset[key][property] === 'string' &&
			expectedUrlPreset[key][property].includes(size)
		) {
			switch (size) {
				case '2000x2000':
					expectedUrlPreset[key][property] = expectedUrlPreset[key][
						property
					].replace('.jpeg', '-1920x1920.jpeg');
					break;
				case '3840x2160':
					expectedUrlPreset[key][property] = expectedUrlPreset[key][
						property
					].replace('scaled.jpeg', '1920x1080.jpeg');
					break;
				case '3840x2560':
					expectedUrlPreset[key][property] = expectedUrlPreset[key][
						property
					].replace('scaled.jpeg', '1920x1280.jpeg');
					break;
			}
		}
	}

	test('check disabled click action', async ({
		page,
		admin,
		editor,
		requestUtils,
	}) => {
		await admin.createNewPost({
			title: 'Click Action',
			postType: 'page',
			showWelcomeGuide: false,
			legacyCanvas: true,
		});

		const images = await getWordpressImages({
			requestUtils,
			page,
			admin,
			editor,
		});

		await editor.insertBlock({
			name: 'visual-portfolio/block',
			attributes: {
				setup_wizard: 'false',
				content_source: 'images',
			},
		});

		await page
			.locator(
				'button.components-button.vpf-component-gallery-control-item-add',
				{
					hasText: 'Add Images',
				}
			)
			.click();

		await page
			.locator('button#menu-item-browse', {
				hasText: 'Media Library',
			})
			.click();

		const imageList = page.locator(
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

	test('check url click action', async ({
		page,
		admin,
		editor,
		requestUtils,
	}) => {
		// Create post for testing click action.
		await admin.createNewPost({
			title: 'URL Click Action',
			postType: 'page',
			showWelcomeGuide: false,
			legacyCanvas: true,
		});

		// Get images for test gallery.
		const images = await getWordpressImages({
			requestUtils,
			page,
			admin,
			editor,
			alternativeSetting: true,
		});

		/**
		 * Prepare the fixture.
		 * Change the date in the link to the image to the current one.
		 * Also insert the test domain used at the beginning of the link
		 */
		const testBaseUrl = process.env.PLAYWRIGHT_TEST_BASE_URL;

		const today = new Date();

		let month = Number(today.getMonth() + 1);

		if (month < 10) {
			month = '0' + month;
		}

		const currentYearAndMonth = today.getFullYear() + '/' + month;

		expectedUrlPreset.map(async (object, key) => {
			if (object.titleUrl.includes('/wp-content/')) {
				const titleUrl = testBaseUrl + object.titleUrl;
				expectedUrlPreset[key].titleUrl = titleUrl.replace(
					/0000\/00/i,
					currentYearAndMonth
				);
			}

			if (object.titleUrl.includes('page_id')) {
				const foundImage = await findAsyncSequential(
					images,
					async (x) => x.title === object.title
				);

				expectedUrlPreset[key].titleUrl = foundImage.url;
			}

			if (object.titleUrl.includes('image')) {
				const foundImage = await findAsyncSequential(
					images,
					async (x) => x.title === object.title
				);

				expectedUrlPreset[key].titleUrl = foundImage.imgUrl;

				const match = foundImage.imgUrl.match(/(\d+x\d+)/);

				if (match) {
					const size = match[0];
					await prepareUrlFixture(size, 'titleUrl', key);
				}
			}
		});

		await editor.insertBlock({
			name: 'visual-portfolio/block',
			attributes: {
				setup_wizard: 'false',
				content_source: 'images',
				items_style: 'default',
				images,
				items_click_action: 'url',
			},
		});

		await page
			.locator('.components-base-control__field', {
				hasText: 'Items Per Page',
			})
			.locator('input.components-text-control__input')
			.fill('10');

		await page.waitForTimeout(2000);

		const galleryImages = page
			.frame('vpf-preview-1')
			.locator('.vp-portfolio__items .vp-portfolio__item-wrap');

		const receivedUrlBackendPreset = [];

		// Check Backend.
		for (const galleryImage of await galleryImages.all()) {
			/**
			 * Check the layout and collect an array with information about items.
			 */
			const popup = await galleryImage
				.locator('.vp-portfolio__item-popup')
				.count();
			const title = galleryImage.locator(
				'.vp-portfolio__item-meta-title > a'
			);
			const titleText = await title.innerText();
			const titleUrl = await title.getAttribute('href');
			const isPopup = popup ? true : false;

			receivedUrlBackendPreset.push({
				title: titleText,
				isPopup,
				titleUrl,
			});
		}

		// Compare the Backend resulting array of objects with the expected one.
		expect(receivedUrlBackendPreset).toEqual(expectedUrlPreset);

		// Publish Post.
		await editor.publishPost();

		// Go to published post.
		await page
			.locator('.components-button', {
				hasText: 'View Page',
			})
			.first()
			.click();

		// Check Frontend.
		const galleryFrontendImages = page.locator(
			'.vp-portfolio__items .vp-portfolio__item-wrap'
		);

		const receivedUrlFrontendPreset = [];

		for (const galleryImage of await galleryFrontendImages.all()) {
			const popup = await galleryImage
				.locator('.vp-portfolio__item-popup')
				.count();
			const title = galleryImage.locator(
				'.vp-portfolio__item-meta-title > a'
			);
			const titleText = await title.innerText();
			const titleUrl = await title.getAttribute('href');
			const isPopup = popup ? true : false;

			receivedUrlFrontendPreset.push({
				title: titleText,
				isPopup,
				titleUrl,
			});
		}

		// Compare the Frontend resulting array of objects with the expected one.
		expect(receivedUrlFrontendPreset).toEqual(expectedUrlPreset);
	});

	test('check popup click action', async ({
		page,
		admin,
		editor,
		requestUtils,
	}) => {
		// Create post for testing click action.
		await admin.createNewPost({
			title: 'URL Click Action',
			postType: 'page',
			showWelcomeGuide: false,
			legacyCanvas: true,
		});

		// Get images for test gallery.
		const images = await getWordpressImages({
			requestUtils,
			page,
			admin,
			editor,
			alternativeSetting: true,
		});

		/**
		 * Prepare the fixture.
		 * Change the date in the link to the image to the current one.
		 * Also insert the test domain used at the beginning of the link
		 */
		const testBaseUrl = process.env.PLAYWRIGHT_TEST_BASE_URL;

		const today = new Date();

		let month = Number(today.getMonth() + 1);

		if (month < 10) {
			month = '0' + month;
		}

		const currentYearAndMonth = today.getFullYear() + '/' + month;

		expectedPopupPreset.map(async (object, key) => {
			if (object.titleUrl.includes('/wp-content/')) {
				const titleUrl = testBaseUrl + object.titleUrl;
				expectedPopupPreset[key].titleUrl = titleUrl.replace(
					/0000\/00/i,
					currentYearAndMonth
				);
			}

			if (object.imageUrl && object.imageUrl.includes('/wp-content/')) {
				const imageUrl = testBaseUrl + object.imageUrl;
				expectedPopupPreset[key].imageUrl = imageUrl.replace(
					/0000\/00/i,
					currentYearAndMonth
				);
			}

			if (object.titleUrl.includes('page_id')) {
				const foundImage = await findAsyncSequential(
					images,
					async (x) => x.title === object.title
				);

				expectedPopupPreset[key].titleUrl = foundImage.url;
			}

			if (object.titleUrl.includes('image')) {
				const foundImage = await findAsyncSequential(
					images,
					async (x) => x.title === object.title
				);

				expectedPopupPreset[key].titleUrl = foundImage.imgUrl;
			}

			if (
				typeof object.imageUrl === 'string' &&
				object.imageUrl.includes('image')
			) {
				const foundImage = await findAsyncSequential(
					images,
					async (x) => x.title === object.title
				);

				expectedPopupPreset[key].imageUrl = foundImage.imgUrl;

				const match = foundImage.imgUrl.match(/(\d+x\d+)/);

				if (match) {
					const size = match[0];
					await preparePopupFixture(size, 'titleUrl', key);
					await preparePopupFixture(size, 'imageUrl', key);
				}
			}
		});

		await editor.insertBlock({
			name: 'visual-portfolio/block',
			attributes: {
				setup_wizard: 'false',
				content_source: 'images',
				items_style: 'default',
				images,
				items_click_action: 'popup_gallery',
			},
		});

		await page
			.locator('.components-base-control__field', {
				hasText: 'Items Per Page',
			})
			.locator('input.components-text-control__input')
			.fill('10');

		await page.waitForTimeout(3000);

		const galleryImages = page
			.frame('vpf-preview-1')
			.locator('.vp-portfolio__items .vp-portfolio__item-wrap');

		const receivedPopupBackendPreset = [];

		// Check Backend.
		for (const galleryImage of await galleryImages.all()) {
			/**
			 * Check the layout and collect an array with information about items.
			 */
			const popup = galleryImage.locator('.vp-portfolio__item-popup');
			const isVideoPopup = await galleryImage
				.locator('[data-vp-popup-video]')
				.count();
			const isImagePopup = await galleryImage
				.locator('[data-vp-popup-img]')
				.count();
			const title = galleryImage.locator(
				'.vp-portfolio__item-meta-title > a'
			);
			const titleText = await title.innerText();
			const titleUrl = await title.getAttribute('href');
			const isPopup = (await popup.count()) ? true : false;

			let videoUrl = false,
				imageUrl = false;

			if (isVideoPopup) {
				videoUrl = await popup.getAttribute('data-vp-popup-video');
			}

			if (isImagePopup) {
				imageUrl = await popup.getAttribute('data-vp-popup-img');
			}

			receivedPopupBackendPreset.push({
				title: titleText,
				isPopup,
				titleUrl,
				imageUrl,
				videoUrl,
			});
		}

		// Compare the Backend resulting array of objects with the expected one.
		expect(receivedPopupBackendPreset).toEqual(expectedPopupPreset);

		// Publish Post.
		await editor.publishPost();

		// Go to published post.
		await page
			.locator('.components-button', {
				hasText: 'View Page',
			})
			.first()
			.click();

		// Check Frontend.
		const galleryFrontendImages = page.locator(
			'.vp-portfolio__items .vp-portfolio__item-wrap'
		);

		const receivedPopupFrontendPreset = [];

		for (const galleryImage of await galleryFrontendImages.all()) {
			const popup = galleryImage.locator('.vp-portfolio__item-popup');
			const isVideoPopup = await galleryImage
				.locator('[data-vp-popup-video]')
				.count();
			const isImagePopup = await galleryImage
				.locator('[data-vp-popup-img]')
				.count();
			const title = galleryImage.locator(
				'.vp-portfolio__item-meta-title > a'
			);
			const titleText = await title.innerText();
			const titleUrl = await title.getAttribute('href');
			const isPopup = (await popup.count()) ? true : false;

			let videoUrl = false,
				imageUrl = false;

			if (isVideoPopup) {
				videoUrl = await popup.getAttribute('data-vp-popup-video');
			}

			if (isImagePopup) {
				imageUrl = await popup.getAttribute('data-vp-popup-img');
			}

			receivedPopupFrontendPreset.push({
				title: titleText,
				isPopup,
				titleUrl,
				imageUrl,
				videoUrl,
			});
		}

		// Compare the Frontend resulting array of objects with the expected one.
		expect(receivedPopupFrontendPreset).toEqual(expectedPopupPreset);
	});
});
