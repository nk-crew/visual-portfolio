/**
 * External dependencies
 */
const path = require( 'path' );

/**
 * Test Images
 */
import imagePaths from '../../fixtures/images.json';

/**
 *
 * @param {RequestUtils} requestUtils       Playwright utilities for interacting with the WordPress REST API.
 * @param {Page}         page               Provides methods to interact with a single tab in a Browser, or an extension background page in Chromium.
 * @param {Admin}        admin              End to end test utilities for WordPress admin’s user interface.
 * @param {Editor}       editor             End to end test utilities for the WordPress Block Editor.
 * @param {boolean}      alternativeSetting Set alternative meta settings for test images.
 * @param {boolean}      usingInPro         Set if using in pro plugin.
 * @param {boolean}      alwaysUpload       Always upload new media files instead of reusing existing by slug.
 * @return {{images: {id: number, imgUrl: string, imgThumbnailUrl: string, title: string, description: string, format: string, video_url: string, url: string}[]}}
 */
export async function getWordpressImages( {
	requestUtils,
	page,
	admin,
	editor,
	alternativeSetting = false,
	usingInPro = false,
	alwaysUpload = false,
} ) {
	let images = [];
	let postLink = '';

	if ( alternativeSetting ) {
		const currentPage = page.url();

		// Create a post for a image that has a link to an internal WordPress post.
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
		await page
			.locator( '.components-button', {
				hasText: 'View Page',
			} )
			.first()
			.click();

		// Remember the link to the post for future use inside the meta image.
		postLink = page.url();

		await page.goto( currentPage );
	}

	const imagePath =
		process.env.CORE || usingInPro
			? 'core-plugin/tests/fixtures/'
			: 'tests/fixtures/';

	async function uploadMediaWithRetry( filepath, retries = 5 ) {
		for ( let attempt = 1; attempt <= retries; attempt++ ) {
			try {
				return await requestUtils.uploadMedia( filepath );
			} catch ( error ) {
				if ( attempt === retries ) {
					throw error; // Re-throw the error if all attempts fail
				}
				// Wait before retrying
				await new Promise( ( resolve ) =>
					setTimeout( resolve, 1000 * attempt )
				);
			}
		}
	}

	async function fetchMediaList() {
		return await requestUtils.rest( {
			path: '/wp/v2/media',
			params: {
				per_page: 100,
			},
		} );
	}

	function removeFileExtension( filename ) {
		return filename.replace( /\.[^/.]+$/, '' );
	}

	// Function to check if an image already exists and return its details
	async function getExistingMediaDetails( filename ) {
		const existingMedia = await fetchMediaList();
		return existingMedia.find(
			( media ) => media.slug === removeFileExtension( filename )
		);
	}

	images = await Promise.all(
		imagePaths.map( async ( object ) => {
			const filepath = path.join( imagePath, object.filename );

			let media;

			if ( alwaysUpload ) {
				media = await uploadMediaWithRetry( filepath );
			} else {
				// Check if the image already exists and retrieve its details.
				media = await getExistingMediaDetails( object.filename );

				// If the image doesn't exist, upload it.
				if ( ! media ) {
					media = await uploadMediaWithRetry( filepath );
				}
			}

			const periodIndex = object.filename.indexOf( '.' );

			let image = {};

			// We collect all the meta data of the image and write it to an array.
			let title =
				periodIndex !== -1
					? object.filename.substring( 0, periodIndex )
					: object.filename;

			let description = object.description;

			title = object.title !== 'undefined' ? object.title : title;

			if ( alternativeSetting ) {
				title =
					typeof object.imageSettings !== 'undefined'
						? object.imageSettings.title
						: title;
				description =
					typeof object.imageSettings !== 'undefined'
						? object.imageSettings.description
						: description;
			}

			image = {
				id: media.id,
				imgUrl: media.source_url,
				imgThumbnailUrl: media.source_url,
				title,
				description,
			};

			if ( alternativeSetting ) {
				const format =
					typeof object.imageSettings !== 'undefined' &&
					typeof object.imageSettings.format !== 'undefined'
						? object.imageSettings.format
						: false;
				if ( format ) {
					image.format = format;
				}

				const videoUrl =
					typeof object.imageSettings !== 'undefined' &&
					typeof object.imageSettings.format !== 'undefined' &&
					object.imageSettings.format === 'video' &&
					typeof object.imageSettings.videoUrl !== 'undefined'
						? object.imageSettings.videoUrl
						: false;
				if ( videoUrl ) {
					image.video_url = videoUrl;
				}

				let url =
					typeof object.imageSettings !== 'undefined' &&
					typeof object.imageSettings.format !== 'undefined' &&
					object.imageSettings.format === 'standard' &&
					typeof object.imageSettings.url !== 'undefined' &&
					object.imageSettings.url !== 'postLink'
						? object.imageSettings.url
						: false;
				if ( url ) {
					image.url = url;
				}

				url =
					typeof object.imageSettings !== 'undefined' &&
					typeof object.imageSettings.format !== 'undefined' &&
					object.imageSettings.format === 'standard' &&
					typeof object.imageSettings.url !== 'undefined' &&
					object.imageSettings.url === 'postLink'
						? postLink
						: url;

				if ( url ) {
					image.url = url;
				}
			}

			return image;
		} )
	);

	return images;
}
