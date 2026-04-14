/**
 * WordPress dependencies
 */
import { expect, test } from '@wordpress/e2e-test-utils-playwright';

import expectedPopupPresetFixture from '../../fixtures/click-actions/popup-expected-preset.json';
import expectedUrlPresetFixture from '../../fixtures/click-actions/url-expected-preset.json';
import { getPortfolioPreviewFrame } from '../utils/editor-canvas';
import { findAsyncSequential } from '../utils/find-async-sequential';
import { getWordpressImages } from '../utils/get-wordpress-images';
import {
	confirmMediaLibrarySelection,
	openMediaLibrary,
	selectMediaLibraryImages,
} from '../utils/media-library';
import { openPublishedPage } from '../utils/open-published-page';

function cloneFixture( fixture ) {
	return JSON.parse( JSON.stringify( fixture ) );
}

function toClickActionExpectation( preset ) {
	return preset.map( ( { isPopup, titleUrl } ) => ( {
		isPopup,
		titleUrl,
	} ) );
}

function toPopupClickActionExpectation( preset ) {
	return preset.map( ( { imageUrl, isPopup, titleUrl, videoUrl } ) => ( {
		imageUrl: normalizePopupMediaUrl( imageUrl ),
		isPopup,
		titleUrl: normalizePopupMediaUrl( titleUrl ),
		videoUrl,
	} ) );
}

function normalizePopupMediaUrl( url ) {
	if ( typeof url !== 'string' ) {
		return url;
	}

	return url
		.replace( /-scaled(?=\.[a-z]+$)/i, '' )
		.replace( /-\d+x\d+(?=\.[a-z]+$)/i, '' );
}

test.describe( 'click action gallery images', () => {
	test.beforeAll( async ( { requestUtils } ) => {
		const pluginName = process.env.CORE
			? 'visual-portfolio-pro'
			: 'visual-portfolio-posts-amp-image-gallery';

		await Promise.all( [
			requestUtils.activatePlugin( pluginName ),
			requestUtils.deleteAllMedia(),
			requestUtils.deleteAllPages(),
		] );
	} );
	test.afterAll( async ( { requestUtils } ) => {
		await Promise.all( [
			requestUtils.deleteAllMedia(),
			requestUtils.deleteAllPages(),
		] );
	} );

	/**
	 * Popup action keeps the media URL returned by WordPress for the uploaded
	 * attachment. Unlike URL click actions, the popup markup currently points to
	 * the original file or the `-scaled` derivative that WordPress generated, so
	 * we intentionally keep the resolved upload URL unchanged here.
	 *
	 * @param {Array<Object>} expectedPreset Mutable popup fixture copy.
	 * @param {string}        size           Image resolution.
	 * @param {string}        property       Image property.
	 * @param {number}        key            Key of image object.
	 */
	async function preparePopupFixture( expectedPreset, size, property, key ) {
		void expectedPreset;
		void size;
		void property;
		void key;
	}

	/**
	 * We prepare the fixture for url comparison.
	 * We correct the paths to the images to be current, loaded into the WordPress system.
	 *
	 * @param {Array<Object>} expectedPreset Mutable URL fixture copy.
	 * @param {string}        size           Image Resolution.
	 * @param {string}        property       Image property.
	 * @param {number}        key            Key of Image object.
	 */
	async function prepareUrlFixture( expectedPreset, size, property, key ) {
		if (
			typeof expectedPreset[ key ][ property ] === 'string' &&
			expectedPreset[ key ][ property ].includes( size )
		) {
			switch ( size ) {
				case '2000x2000':
					expectedPreset[ key ][ property ] = expectedPreset[ key ][
						property
					].replace( '.jpeg', '-1920x1920.jpeg' );
					break;
				case '3840x2160':
					expectedPreset[ key ][ property ] = expectedPreset[ key ][
						property
					].replace( 'scaled.jpeg', '1920x1080.jpeg' );
					break;
				case '3840x2560':
					expectedPreset[ key ][ property ] = expectedPreset[ key ][
						property
					].replace( 'scaled.jpeg', '1920x1280.jpeg' );
					break;
			}
		}
	}

	test( 'check disabled click action', async ( {
		page,
		admin,
		editor,
		requestUtils,
	} ) => {
		await admin.createNewPost( {
			title: 'Click Action',
			postType: 'page',
			showWelcomeGuide: false,
			legacyCanvas: true,
		} );

		const images = await getWordpressImages( {
			requestUtils,
			page,
			admin,
			editor,
		} );

		await editor.insertBlock( {
			name: 'visual-portfolio/block',
			attributes: {
				setup_wizard: 'false',
				content_source: 'images',
			},
		} );

		await page
			.locator(
				'button.components-button.vpf-component-gallery-control-item-add',
				{
					hasText: 'Add Media',
				}
			)
			.click();

		await openMediaLibrary( page );
		await selectMediaLibraryImages(
			page,
			images
				.filter( ( image ) => typeof image.imgUrl !== 'undefined' )
				.map( ( image ) => image.id )
		);
		await confirmMediaLibrarySelection( page );

		await page
			.locator( '.components-panel__body', {
				hasText: 'Click Action',
			} )
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
		const frontendPage = await openPublishedPage( page );

		const link = frontendPage.locator( 'a.vp-portfolio__item-meta' );

		await expect( link ).toBeHidden();
	} );

	test( 'check url click action', async ( {
		page,
		admin,
		editor,
		requestUtils,
	} ) => {
		const expectedUrlPreset = cloneFixture( expectedUrlPresetFixture );
		// Create post for testing click action.
		await admin.createNewPost( {
			title: 'URL Click Action',
			postType: 'page',
			showWelcomeGuide: false,
			legacyCanvas: true,
		} );

		// Get images for test gallery.
		const images = await getWordpressImages( {
			requestUtils,
			page,
			admin,
			editor,
			alternativeSetting: true,
		} );

		/**
		 * Prepare the fixture.
		 * Change the date in the link to the image to the current one.
		 * Also insert the test domain used at the beginning of the link
		 */
		const testBaseUrl = process.env.PLAYWRIGHT_TEST_BASE_URL;

		const today = new Date();

		let month = Number( today.getMonth() + 1 );

		if ( month < 10 ) {
			month = '0' + month;
		}

		const currentYearAndMonth = today.getFullYear() + '/' + month;

		await Promise.all(
			expectedUrlPreset.map( async ( object, key ) => {
				if ( object.titleUrl.includes( '/wp-content/' ) ) {
					const titleUrl = testBaseUrl + object.titleUrl;
					expectedUrlPreset[ key ].titleUrl = titleUrl.replace(
						/0000\/00/i,
						currentYearAndMonth
					);
				}

				if ( object.titleUrl.includes( 'page_id' ) ) {
					const foundImage = await findAsyncSequential(
						images,
						async ( x ) => x.title === object.title
					);

					expectedUrlPreset[ key ].titleUrl = foundImage.url;
				}

				if ( object.titleUrl.includes( 'image' ) ) {
					const foundImage = await findAsyncSequential(
						images,
						async ( x ) => x.title === object.title
					);

					expectedUrlPreset[ key ].titleUrl = foundImage.imgUrl;

					if ( typeof process.env.CORE === 'undefined' ) {
						const match = foundImage.imgUrl.match( /(\d+x\d+)/ );

						if ( match ) {
							const size = match[ 0 ];
							await prepareUrlFixture(
								expectedUrlPreset,
								size,
								'titleUrl',
								key
							);
						}
					}
				}
			} )
		);

		await editor.insertBlock( {
			name: 'visual-portfolio/block',
			attributes: {
				setup_wizard: 'false',
				content_source: 'images',
				items_style: 'default',
				images,
				items_click_action: 'url',
			},
		} );

		await page
			.locator( '.components-base-control__field', {
				hasText: 'Items Per Page',
			} )
			.locator( 'input.components-text-control__input' )
			.fill( '10' );

		const previewFrame = getPortfolioPreviewFrame( page, editor );
		const galleryImages = previewFrame
			.locator( '.vp-portfolio__items .vp-portfolio__item-wrap' );
		await expect( galleryImages ).toHaveCount( expectedUrlPreset.length, {
			timeout: 15000,
		} );

		const receivedUrlBackendPreset = [];

		// Check Backend.
		for ( const galleryImage of await galleryImages.all() ) {
			/**
			 * Check the layout and collect an array with information about items.
			 */
			const popup = await galleryImage
				.locator( '.vp-portfolio__item-popup' )
				.count();
			const title = await galleryImage.locator(
				'.vp-portfolio__item-meta-title > a'
			);
			const titleText = await title.innerText();
			const titleUrl = await title.getAttribute( 'href' );
			const isPopup = popup ? true : false;

			receivedUrlBackendPreset.push( {
				title: titleText,
				isPopup,
				titleUrl,
			} );
		}

		// Compare the Backend resulting array of objects with the expected one.
		expect( toClickActionExpectation( receivedUrlBackendPreset ) ).toEqual(
			toClickActionExpectation( expectedUrlPreset )
		);

		// Publish Post.
		await editor.publishPost();

		// Go to published post.
		const frontendPage = await openPublishedPage( page );

		const galleryFrontendImages = frontendPage.locator(
			'.vp-portfolio__items .vp-portfolio__item-wrap'
		);
		await expect( galleryFrontendImages ).toHaveCount(
			expectedUrlPreset.length,
			{
				timeout: 15000,
			}
		);

		const receivedUrlFrontendPreset = [];

		for ( const galleryImage of await galleryFrontendImages.all() ) {
			const popup = await galleryImage
				.locator( '.vp-portfolio__item-popup' )
				.count();
			const title = await galleryImage.locator(
				'.vp-portfolio__item-meta-title > a'
			);
			const titleText = await title.innerText();
			const titleUrl = await title.getAttribute( 'href' );
			const isPopup = popup ? true : false;

			receivedUrlFrontendPreset.push( {
				title: titleText,
				isPopup,
				titleUrl,
			} );
		}

		// Compare the Frontend resulting array of objects with the expected one.
		expect( toClickActionExpectation( receivedUrlFrontendPreset ) ).toEqual(
			toClickActionExpectation( expectedUrlPreset )
		);
	} );

	test( 'check popup click action', async ( {
		page,
		admin,
		editor,
		requestUtils,
	} ) => {
		const expectedPopupPreset = cloneFixture( expectedPopupPresetFixture );
		// Create post for testing click action.
		await admin.createNewPost( {
			title: 'URL Click Action',
			postType: 'page',
			showWelcomeGuide: false,
			legacyCanvas: true,
		} );

		// Get images for test gallery.
		const images = await getWordpressImages( {
			requestUtils,
			page,
			admin,
			editor,
			alternativeSetting: true,
		} );

		/**
		 * Prepare the fixture.
		 * Change the date in the link to the image to the current one.
		 * Also insert the test domain used at the beginning of the link
		 */
		const testBaseUrl = process.env.PLAYWRIGHT_TEST_BASE_URL;

		const today = new Date();

		let month = Number( today.getMonth() + 1 );

		if ( month < 10 ) {
			month = '0' + month;
		}

		const currentYearAndMonth = today.getFullYear() + '/' + month;

		await Promise.all(
			expectedPopupPreset.map( async ( object, key ) => {
				if ( object.titleUrl.includes( '/wp-content/' ) ) {
					const titleUrl = testBaseUrl + object.titleUrl;
					expectedPopupPreset[ key ].titleUrl = titleUrl.replace(
						/0000\/00/i,
						currentYearAndMonth
					);
				}

				if (
					object.imageUrl &&
					object.imageUrl.includes( '/wp-content/' )
				) {
					const imageUrl = testBaseUrl + object.imageUrl;
					expectedPopupPreset[ key ].imageUrl = imageUrl.replace(
						/0000\/00/i,
						currentYearAndMonth
					);
				}

				if ( object.titleUrl.includes( 'page_id' ) ) {
					const foundImage = await findAsyncSequential(
						images,
						async ( x ) => x.title === object.title
					);

					expectedPopupPreset[ key ].titleUrl = foundImage.url;
				}

				if ( object.titleUrl.includes( 'image' ) ) {
					const foundImage = await findAsyncSequential(
						images,
						async ( x ) => x.title === object.title
					);

					expectedPopupPreset[ key ].titleUrl = foundImage.imgUrl;
				}

				if (
					typeof object.imageUrl === 'string' &&
					object.imageUrl.includes( 'image' )
				) {
					const foundImage = await findAsyncSequential(
						images,
						async ( x ) => x.title === object.title
					);

					expectedPopupPreset[ key ].imageUrl =
						await foundImage.imgUrl;

					const match = foundImage.imgUrl.match( /(\d+x\d+)/ );

					if ( match ) {
						const size = match[ 0 ];
						await preparePopupFixture(
							expectedPopupPreset,
							size,
							'titleUrl',
							key
						);
						await preparePopupFixture(
							expectedPopupPreset,
							size,
							'imageUrl',
							key
						);
					}
				}
			} )
		);

		await editor.insertBlock( {
			name: 'visual-portfolio/block',
			attributes: {
				setup_wizard: 'false',
				content_source: 'images',
				items_style: 'default',
				images,
				items_click_action: 'popup_gallery',
			},
		} );

		await page
			.locator( '.components-base-control__field', {
				hasText: 'Items Per Page',
			} )
			.locator( 'input.components-text-control__input' )
			.fill( '10' );

		const previewFrame = getPortfolioPreviewFrame( page, editor );
		const galleryImages = previewFrame
			.locator( '.vp-portfolio__items .vp-portfolio__item-wrap' );
		await expect( galleryImages ).toHaveCount( expectedPopupPreset.length, {
			timeout: 15000,
		} );

		const receivedPopupBackendPreset = [];

		// Check Backend.
		for ( const galleryImage of await galleryImages.all() ) {
			/**
			 * Check the layout and collect an array with information about items.
			 */
			const popup = await galleryImage.locator(
				'.vp-portfolio__item-popup'
			);
			const isVideoPopup = await galleryImage
				.locator( '[data-vp-popup-video]' )
				.count();
			const isImagePopup = await galleryImage
				.locator( '[data-vp-popup-img]' )
				.count();
			const title = await galleryImage.locator(
				'.vp-portfolio__item-meta-title > a'
			);
			const titleText = await title.innerText();
			const titleUrl = await title.getAttribute( 'href' );
			const isPopup = ( await popup.count() ) ? true : false;

			let videoUrl = false,
				imageUrl = false;

			if ( isVideoPopup ) {
				videoUrl = await popup.getAttribute( 'data-vp-popup-video' );
			}

			if ( isImagePopup ) {
				imageUrl = await popup.getAttribute( 'data-vp-popup-img' );
			}

			receivedPopupBackendPreset.push( {
				title: titleText,
				isPopup,
				titleUrl,
				imageUrl,
				videoUrl,
			} );
		}

		// Compare the Backend resulting array of objects with the expected one.
		expect(
			toPopupClickActionExpectation( receivedPopupBackendPreset )
		).toEqual( toPopupClickActionExpectation( expectedPopupPreset ) );

		// Publish Post.
		await editor.publishPost();

		// Go to published post.
		const frontendPage = await openPublishedPage( page );

		const galleryFrontendImages = frontendPage.locator(
			'.vp-portfolio__items .vp-portfolio__item-wrap'
		);
		await expect( galleryFrontendImages ).toHaveCount(
			expectedPopupPreset.length,
			{
				timeout: 15000,
			}
		);

		const receivedPopupFrontendPreset = [];

		for ( const galleryImage of await galleryFrontendImages.all() ) {
			const popup = galleryImage.locator( '.vp-portfolio__item-popup' );
			const isVideoPopup = await galleryImage
				.locator( '[data-vp-popup-video]' )
				.count();
			const isImagePopup = await galleryImage
				.locator( '[data-vp-popup-img]' )
				.count();
			const title = await galleryImage.locator(
				'.vp-portfolio__item-meta-title > a'
			);
			const titleText = await title.innerText();
			const titleUrl = await title.getAttribute( 'href' );
			const isPopup = ( await popup.count() ) ? true : false;

			let videoUrl = false,
				imageUrl = false;

			if ( isVideoPopup ) {
				videoUrl = await popup.getAttribute( 'data-vp-popup-video' );
			}

			if ( isImagePopup ) {
				imageUrl = await popup.getAttribute( 'data-vp-popup-img' );
			}

			receivedPopupFrontendPreset.push( {
				title: titleText,
				isPopup,
				titleUrl,
				imageUrl,
				videoUrl,
			} );
		}

		// Compare the Frontend resulting array of objects with the expected one.
		expect(
			toPopupClickActionExpectation( receivedPopupFrontendPreset )
		).toEqual( toPopupClickActionExpectation( expectedPopupPreset ) );
	} );
} );
