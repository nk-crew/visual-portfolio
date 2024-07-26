/**
 * External dependencies
 */
const path = require('path');

/**
 * Test Images
 */
import imagePaths from '../../fixtures/images.json';

export async function getWordpressImages({
	requestUtils,
	page,
	admin,
	editor,
	alternativeSetting = false,
}) {
	let images = [];
	let postLink = '';

	if (alternativeSetting) {
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

		postLink = page.url();

		await page.goto(currentPage);
	}

	images = await Promise.all(
		imagePaths.map(async (object) => {
			const filepath = path.join('tests/fixtures/', object.filename);
			const media = await requestUtils.uploadMedia(filepath);

			const periodIndex = object.filename.indexOf('.');

			let image = {};

			let title =
				periodIndex !== -1
					? object.filename.substring(0, periodIndex)
					: object.filename;

			let description = object.description;

			title = object.title !== 'undefined' ? object.title : title;

			if (alternativeSetting) {
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

			if (alternativeSetting) {
				const format =
					typeof object.imageSettings !== 'undefined' &&
					typeof object.imageSettings.format !== 'undefined'
						? object.imageSettings.format
						: false;
				if (format) {
					image.format = format;
				}

				const videoUrl =
					typeof object.imageSettings !== 'undefined' &&
					typeof object.imageSettings.format !== 'undefined' &&
					object.imageSettings.format === 'video' &&
					typeof object.imageSettings.videoUrl !== 'undefined'
						? object.imageSettings.videoUrl
						: false;
				if (videoUrl) {
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
				if (url) {
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

				if (url) {
					image.url = url;
				}
			}

			return image;
		})
	);

	return images;
}
