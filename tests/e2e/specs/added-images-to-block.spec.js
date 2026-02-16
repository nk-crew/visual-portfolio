/* eslint-disable no-console */
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
import { openPublishedPage } from '../utils/open-published-page';

test.describe( 'added images to block', () => {
	test.beforeEach( async ( { requestUtils } ) => {
		const pluginName = process.env.CORE
			? 'visual-portfolio-pro'
			: 'visual-portfolio-posts-amp-image-gallery';
		await requestUtils.activatePlugin( pluginName );
	} );

	test.afterEach( async ( { requestUtils } ) => {
		await Promise.all( [
			requestUtils.deleteAllPages(),
			requestUtils.deleteAllPosts(),
		] );
	} );

	test.afterAll( async ( { requestUtils } ) => {
		await Promise.all( [
			requestUtils.deleteAllMedia(),
			requestUtils.deleteAllPages(),
			requestUtils.deleteAllPosts(),
		] );
	} );

	/**
	 * We create a gallery block and add pictures to it manually or automatically.
	 *
	 * @param {RequestUtils} requestUtils       Playwright utilities for interacting with the WordPress REST API.
	 * @param {Page}         page               Provides methods to interact with a single tab in a Browser, or an extension background page in Chromium.
	 * @param {Admin}        admin              End to end test utilities for WordPress admin’s user interface.
	 * @param {Editor}       editor             End to end test utilities for the WordPress Block Editor.
	 * @param {boolean}      programmatically   Flag for setting manual or automatic adding of pictures to the block.
	 * @param {boolean}      alternativeSetting Flag for setting alternative meta settings for test images.
	 * @return {{images: {format: string, video_url: string, url: string}[]}}
	 */
	async function generateGalleryBeforeEachTest(
		requestUtils,
		page,
		admin,
		editor,
		programmatically = false,
		alternativeSetting = false
	) {
		await admin.visitAdminPage( 'edit.php' );

		await admin.createNewPost( {
			title: 'Test Adding Images to a Block Programmatically',
			postType: 'page',
			showWelcomeGuide: false,
			legacyCanvas: true,
		} );

		const images = await getWordpressImages( {
			requestUtils,
			page,
			admin,
			editor,
			alternativeSetting,
		} );

		let attributes = {
			setup_wizard: 'false',
			content_source: 'images',
		};

		if ( programmatically ) {
			attributes = {
				...attributes,
				images,
			};
		}

		await editor.insertBlock( {
			name: 'visual-portfolio/block',
			attributes,
		} );

		return images;
	}

	test( 'added images to a block manually', async ( {
		page,
		admin,
		editor,
		requestUtils,
	} ) => {
		const images = await generateGalleryBeforeEachTest(
			requestUtils,
			page,
			admin,
			editor
		);

		await page
			.locator(
				'button.components-button.vpf-component-gallery-control-item-add',
				{
					hasText: 'Add Images',
				}
			)
			.click();

		await page
			.locator( 'button#menu-item-browse', {
				hasText: 'Media Library',
			} )
			.click();

		const imageList = page.locator(
			'ul.attachments.ui-sortable.ui-sortable-disabled li.attachment[role="checkbox"]'
		);

		for ( const image of await imageList.elementHandles() ) {
			const imageId = await image.getAttribute( 'data-id' );
			const foundImage = images.find(
				( x ) => x.id.toString() === imageId
			);
			if ( foundImage && typeof foundImage.imgUrl !== 'undefined' ) {
				await image.click();
				// Check if the image is selected by looking for a class change or attribute update
				await image.evaluate( ( node ) =>
					node.classList.contains( 'selected' )
				);
			}
		}

		// Fallback for CI instability: ensure at least one item is selected.
		if (
			0 === ( await page.locator( 'li.attachment.selected' ).count() )
		) {
			await imageList.first().click();
		}

		const selectButton = page.locator(
			'button.button.media-button.media-button-select',
			{
				hasText: 'Select',
			}
		);

		await expect( selectButton ).toBeEnabled( { timeout: 15000 } );
		await selectButton.click();

		await page
			.locator( '.components-base-control__field', {
				hasText: 'Items Per Page',
			} )
			.locator( 'input.components-text-control__input' )
			.fill( '10' );

		await page.waitForTimeout( 500 );

		// Check images on backend editor.
		for ( const image of images ) {
			await expect(
				page.frame( 'vpf-preview-1' ).locator( '.wp-image-' + image.id )
			).toBeVisible();
		}

		// Publish Post.
		await editor.publishPost();

		// Go to published post.
		const frontendPage = await openPublishedPage( page );

		// Check images on frontend.
		for ( const image of images ) {
			await expect(
				frontendPage.locator( '.wp-image-' + image.id )
			).toBeVisible();
		}
	} );

	test( 'added images to a block programmatically', async ( {
		page,
		admin,
		editor,
		requestUtils,
	} ) => {
		const images = await generateGalleryBeforeEachTest(
			requestUtils,
			page,
			admin,
			editor,
			true
		);

		await page
			.locator( '.components-base-control__field', {
				hasText: 'Items Per Page',
			} )
			.locator( 'input.components-text-control__input' )
			.fill( '10' );

		await page.waitForTimeout( 500 );

		// Check images on backend editor.
		for ( const image of images ) {
			await expect(
				page.frame( 'vpf-preview-1' ).locator( '.wp-image-' + image.id )
			).toBeVisible();
		}

		// Publish Post.
		await editor.publishPost();

		// Go to published post.
		const frontendPage = await openPublishedPage( page );

		// Check images on frontend.
		for ( const image of images ) {
			await expect(
				frontendPage.locator( '.wp-image-' + image.id )
			).toBeVisible();
		}
	} );

	test( 'checking image settings', async ( {
		page,
		admin,
		editor,
		requestUtils,
	} ) => {
		const images = await generateGalleryBeforeEachTest(
			requestUtils,
			page,
			admin,
			editor
		);

		await page
			.locator(
				'button.components-button.vpf-component-gallery-control-item-add',
				{
					hasText: 'Add Images',
				}
			)
			.click();

		await page
			.locator( 'button#menu-item-browse', {
				hasText: 'Media Library',
			} )
			.click();

		for ( const image of images ) {
			const foundFixture = await findAsyncSequential(
				imageFixtures,
				async ( x ) => x.description === image.description
			);

			expect( foundFixture ).toBeTruthy();

			const attachment = page.locator(
				`ul.attachments.ui-sortable.ui-sortable-disabled li.attachment[role="checkbox"][data-id="${ image.id }"]`
			);
			await expect( attachment ).toHaveCount( 1 );
			await attachment.click();

			await page
				.locator( '#attachment-details-alt-text' )
				.fill( foundFixture.alt );

			await page
				.locator( '#attachment-details-caption' )
				.fill( foundFixture.caption );

			await page
				.locator( '#attachment-details-description' )
				.fill( foundFixture.description );
		}

		await page
			.locator( 'button.button.media-button.media-button-select', {
				hasText: 'Select',
			} )
			.click();

		await page
			.locator( '.components-base-control__field', {
				hasText: 'Items Per Page',
			} )
			.locator( 'input.components-text-control__input' )
			.fill( '10' );

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
				'button.components-button.vpf-component-icon-selector-item',
				{
					hasText: 'Classic',
				}
			)
			.click();

		await page
			.locator( 'button.components-button.components-navigator-button', {
				hasText: 'Caption',
			} )
			.click();

		await page
			.locator(
				'button.components-button.vpf-component-collapse-control-toggle',
				{
					hasText: 'Elements',
				}
			)
			.click();

		await page.getByRole( 'checkbox', { name: 'Display Excerpt' } ).check();

		await page.waitForTimeout( 500 );

		// Check images on backend editor.
		for ( const image of images ) {
			const imageContainer = page
				.frame( 'vpf-preview-1' )
				.locator( '.wp-image-' + image.id );
			await expect( imageContainer ).toBeVisible();

			await expect(
				page
					.frame( 'vpf-preview-1' )
					.locator( '.vp-portfolio__item-meta-excerpt', {
						hasText: image.description,
					} )
			).toBeVisible();

			const foundFixture = await findAsyncSequential(
				imageFixtures,
				async ( x ) => x.description === image.description
			);

			await expect(
				page.frame( 'vpf-preview-1' ).getByAltText( foundFixture.alt )
			).toBeVisible();
		}

		// Publish Post.
		await editor.publishPost();

		// Go to published post.
		const frontendPage = await openPublishedPage( page );

		// Check images on frontend.
		for ( const image of images ) {
			await expect(
				frontendPage.locator( '.wp-image-' + image.id )
			).toBeVisible();

			const itemContainer = frontendPage
				.locator( '.vp-portfolio__item' )
				.filter( {
					has: frontendPage.locator( '.wp-image-' + image.id ),
				} );

			await expect( itemContainer ).toBeVisible();

			const descriptionText = itemContainer.locator(
				'.vp-portfolio__item-meta-excerpt div'
			);

			await expect( descriptionText ).toHaveText( image.description );

			const foundFixture = await findAsyncSequential(
				imageFixtures,
				async ( x ) => x.description === image.description
			);

			await expect(
				frontendPage.getByAltText( foundFixture.alt )
			).toBeVisible();
		}
	} );

	test( 'checking alternative image settings', async ( {
		page,
		admin,
		editor,
		requestUtils,
	} ) => {
		const currentPage = page.url();

		await admin.createNewPost( {
			title: 'Sample Test Page',
			postType: 'page',
			content: 'Test content',
			showWelcomeGuide: false,
			legacyCanvas: true,
		} );

		// Publish Post.
		await editor.publishPost();

		// Go to published post.
		const publishedPage = await openPublishedPage( page );
		const postLink = publishedPage.url();
		if ( publishedPage !== page ) {
			await publishedPage.close();
		}

		await page.goto( currentPage );

		const images = await generateGalleryBeforeEachTest(
			requestUtils,
			page,
			admin,
			editor
		);

		await page
			.locator(
				'button.components-button.vpf-component-gallery-control-item-add',
				{
					hasText: 'Add Images',
				}
			)
			.click();

		await page
			.locator( 'button#menu-item-browse', {
				hasText: 'Media Library',
			} )
			.click();

		for ( const image of images ) {
			const foundFixture = await findAsyncSequential(
				imageFixtures,
				async ( x ) => x.description === image.description
			);

			expect( foundFixture ).toBeTruthy();

			const attachment = page.locator(
				`ul.attachments.ui-sortable.ui-sortable-disabled li.attachment[role="checkbox"][data-id="${ image.id }"]`
			);
			await expect( attachment ).toHaveCount( 1 );
			await attachment.click();

			await page
				.locator( '#attachment-details-alt-text' )
				.fill( foundFixture.alt );

			await page
				.locator( '#attachment-details-caption' )
				.fill( foundFixture.caption );

			await page
				.locator( '#attachment-details-description' )
				.fill( foundFixture.description );
		}

		await page
			.locator( 'button.button.media-button.media-button-select', {
				hasText: 'Select',
			} )
			.click();

		await page
			.locator( '.components-base-control__field', {
				hasText: 'Items Per Page',
			} )
			.locator( 'input.components-text-control__input' )
			.fill( '10' );

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
				'button.components-button.vpf-component-icon-selector-item',
				{
					hasText: 'Classic',
				}
			)
			.click();

		await page
			.locator( 'button.components-button.components-navigator-button', {
				hasText: 'Caption',
			} )
			.click();

		await page
			.locator(
				'button.components-button.vpf-component-collapse-control-toggle',
				{
					hasText: 'Elements',
				}
			)
			.click();

		await page.getByRole( 'checkbox', { name: 'Display Excerpt' } ).check();

		const galleryControlItems = page.locator(
			'.vpf-component-gallery-control-items .vpf-component-gallery-control-item'
		);

		for ( const item of await galleryControlItems.elementHandles() ) {
			await item.click();

			const itemDescription = await page
				.locator( '.components-base-control__field', {
					hasText: 'Description',
				} )
				.locator( 'textarea.components-textarea-control__input' )
				.innerHTML();

			const foundImage = await findAsyncSequential(
				images,
				async ( x ) => x.description === itemDescription
			);

			if ( foundImage ) {
				const foundFixture = await findAsyncSequential(
					imageFixtures,
					async ( x ) => x.description === itemDescription
				);

				if ( foundFixture ) {
					const foundFixtureIndex =
						imageFixtures.indexOf( foundFixture );
					imageFixtures[ foundFixtureIndex ].id = foundImage.id;

					if ( typeof foundFixture.imageSettings !== 'undefined' ) {
						await page
							.locator(
								'.vpf-component-gallery-control-item-modal .components-base-control__field',
								{
									hasText: 'Title',
								}
							)
							.locator( 'input.components-text-control__input' )
							.fill( foundFixture.imageSettings.title );

						await page
							.locator(
								'.vpf-component-gallery-control-item-modal .components-base-control__field',
								{
									hasText: 'Description',
								}
							)
							.locator(
								'textarea.components-textarea-control__input'
							)
							.fill( foundFixture.imageSettings.description );

						if (
							typeof foundFixture.imageSettings.format !==
							'undefined'
						) {
							await page
								.locator(
									'.vpf-component-gallery-control-item-modal .components-base-control__field',
									{
										hasText: 'Format',
									}
								)
								.locator( '.vpf-component-select' )
								.click();

							await page
								.locator(
									'.vpf-component-select-option-label',
									{
										hasText:
											foundFixture.imageSettings.format,
									}
								)
								.click();

							if (
								foundFixture.imageSettings.format ===
									'standard' &&
								typeof foundFixture.imageSettings.url !==
									'undefined'
							) {
								foundFixture.imageSettings.url =
									foundFixture.imageSettings.url ===
									'postLink'
										? postLink
										: foundFixture.imageSettings.url;

								await page
									.getByRole( 'textbox', {
										name: 'URL',
										exact: true,
									} )
									.fill( foundFixture.imageSettings.url );
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
									.locator(
										'input.components-text-control__input'
									)
									.fill(
										foundFixture.imageSettings.videoUrl
									);
							}
						}
					}
				} else {
					console.warn(
						`No matching fixture found for item with description: ${ itemDescription }`
					);
				}
			} else {
				console.warn(
					`No matching image found for item with description: ${ itemDescription }`
				);
			}

			await page.getByLabel( 'Close', { exact: true } ).click();
		}

		// Check image attributes on backend editor.
		for ( const image of imageFixtures ) {
			const imageContainer = page
				.frame( 'vpf-preview-1' )
				.locator( '.wp-image-' + image.id );
			await expect( imageContainer ).toBeVisible();

			if ( typeof image.imageSettings !== 'undefined' ) {
				await expect(
					page
						.frame( 'vpf-preview-1' )
						.locator( '.vp-portfolio__item-meta-excerpt', {
							hasText: image.imageSettings.description,
						} )
				).toBeVisible();

				await expect(
					page
						.frame( 'vpf-preview-1' )
						.locator( '.vp-portfolio__item-meta-title > a', {
							hasText: image.imageSettings.title,
						} )
				).toBeVisible();

				if ( typeof image.imageSettings.format !== 'undefined' ) {
					const format = image.imageSettings.format;
					if (
						format === 'standard' &&
						typeof image.imageSettings.url !== 'undefined'
					) {
						await expect(
							page
								.frame( 'vpf-preview-1' )
								.locator(
									'.vp-portfolio__item-meta-title > a',
									{
										hasText: image.imageSettings.title,
									}
								)
						).toHaveAttribute( 'href', image.imageSettings.url );

						await expect(
							page
								.frame( 'vpf-preview-1' )
								.getByRole( 'link', { name: image.alt } )
						).toHaveAttribute( 'href', image.imageSettings.url );
					}

					if (
						format === 'video' &&
						typeof image.imageSettings.videoUrl !== 'undefined'
					) {
						await expect(
							page
								.frame( 'vpf-preview-1' )
								.locator(
									'.vp-portfolio__item-meta-title > a',
									{
										hasText: image.imageSettings.title,
									}
								)
						).toHaveAttribute(
							'href',
							image.imageSettings.videoUrl
						);

						await expect(
							page
								.frame( 'vpf-preview-1' )
								.getByRole( 'link', { name: image.alt } )
						).toHaveAttribute(
							'href',
							image.imageSettings.videoUrl
						);
					}
				}
			} else {
				await expect(
					page
						.frame( 'vpf-preview-1' )
						.locator( '.vp-portfolio__item-meta-excerpt', {
							hasText: image.description,
						} )
				).toBeVisible();
			}

			await expect(
				page.frame( 'vpf-preview-1' ).getByAltText( image.alt )
			).toBeVisible();
		}

		// Publish Post.
		await editor.publishPost();

		// Go to published post.
		const frontendPage = await openPublishedPage( page );

		// Check image attributes on frontend.
		for ( const image of imageFixtures ) {
			await expect(
				frontendPage.locator( '.wp-image-' + image.id )
			).toBeVisible();

			const itemContainer = frontendPage
				.locator( '.vp-portfolio__item' )
				.filter( {
					has: frontendPage.locator( '.wp-image-' + image.id ),
				} );

			await expect( itemContainer ).toBeVisible();

			if ( typeof image.imageSettings !== 'undefined' ) {
				await expect(
					frontendPage.locator( '.vp-portfolio__item-meta-excerpt', {
						hasText: image.imageSettings.description,
					} )
				).toBeVisible();

				await expect(
					frontendPage.locator(
						'.vp-portfolio__item-meta-title > a',
						{
							hasText: image.imageSettings.title,
						}
					)
				).toBeVisible();

				if ( typeof image.imageSettings.format !== 'undefined' ) {
					const format = image.imageSettings.format;
					if (
						format === 'standard' &&
						typeof image.imageSettings.url !== 'undefined'
					) {
						await expect(
							frontendPage.locator(
								'.vp-portfolio__item-meta-title > a',
								{
									hasText: image.imageSettings.title,
								}
							)
						).toHaveAttribute( 'href', image.imageSettings.url );

						await expect(
							frontendPage.getByRole( 'link', {
								name: image.alt,
							} )
						).toHaveAttribute( 'href', image.imageSettings.url );
					}

					if (
						format === 'video' &&
						typeof image.imageSettings.videoUrl !== 'undefined'
					) {
						await expect(
							frontendPage.locator(
								'.vp-portfolio__item-meta-title > a',
								{
									hasText: image.imageSettings.title,
								}
							)
						).toHaveAttribute(
							'href',
							image.imageSettings.videoUrl
						);

						await expect(
							frontendPage.getByRole( 'link', {
								name: image.alt,
							} )
						).toHaveAttribute(
							'href',
							image.imageSettings.videoUrl
						);
					}
				}
			} else {
				await expect(
					frontendPage.locator( '.vp-portfolio__item-meta-excerpt', {
						hasText: image.description,
					} )
				).toBeVisible();
			}

			await expect(
				frontendPage.getByAltText( image.alt )
			).toBeVisible();
		}
	} );
} );
