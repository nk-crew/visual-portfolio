/**
 * Gallery Loop: images of the Media source that are not in the Media Library.
 *
 * An image inserted from a URL is stored with its address and no attachment
 * id. The manager adds it, draws it, and moves it into the library on request;
 * the page renders it from the address.
 */
import { expect, test } from '@wordpress/e2e-test-utils-playwright';

import { getFixturePath } from '../utils/fixture-path';
import { openPublishedPage } from '../utils/open-published-page';
import { getPluginSlug } from '../utils/plugin-slug';

const LIST = 'ul.wp-block-visual-portfolio-item-template';
const ITEM = '.wp-block-visual-portfolio-item-template__item';
const MANAGER = '.vpf-gallery-manager';
const TILE = '.vpf-gallery-manager__item';

/**
 * A Gallery Loop of the given images, with an item image in every item.
 *
 * @param {Array} images - `imagesQuery.images` of the loop.
 * @return {Object} block payload for `editor.insertBlock()`.
 */
function getLoopBlock(images) {
	return {
		name: 'visual-portfolio/loop',
		attributes: {
			queryType: 'images',
			baseQuery: { perPage: -1 },
			imagesQuery: { images },
		},
		innerBlocks: [
			{
				name: 'visual-portfolio/item-template',
				innerBlocks: [{ name: 'visual-portfolio/item-image' }],
			},
		],
	};
}

/**
 * The images the loop stores.
 *
 * @param {Object} editor - editor utils.
 * @return {Promise<Array>} `imagesQuery.images` of the first loop.
 */
async function getStoredImages(editor) {
	const blocks = await editor.getBlocks();
	const loop = blocks.find((block) => 'visual-portfolio/loop' === block.name);

	return loop?.attributes?.imagesQuery?.images ?? [];
}

test.describe('Gallery Loop external images', () => {
	// An image the browser can load from this site, standing in for one
	// elsewhere: what makes an entry external is that it has no id.
	let image;

	test.beforeAll(async ({ requestUtils }) => {
		await requestUtils.activatePlugin(getPluginSlug());

		image = await requestUtils.uploadMedia(
			getFixturePath('image-800x600.png')
		);
	});

	test.afterAll(async ({ requestUtils }) => {
		await requestUtils.deleteAllPages();
	});

	test.beforeEach(async ({ admin }) => {
		await admin.createNewPost({
			postType: 'page',
			showWelcomeGuide: false,
			legacyCanvas: true,
		});
	});

	test('an image inserted from a URL is added and rendered', async ({
		editor,
		page,
	}) => {
		const url = `${image.source_url}?external`;

		await editor.insertBlock(getLoopBlock([{ id: image.id }]));
		await editor.openDocumentSettingsSidebar();

		const manager = page.locator(MANAGER);

		await manager.getByRole('button', { name: 'Insert from URL' }).click();
		await page.getByPlaceholder('Paste or type URL').fill(url);
		await page.getByRole('button', { name: 'Apply' }).click();

		await expect(manager.locator(TILE)).toHaveCount(2);

		// The size is read off the picture, as nothing in the library knows it.
		await expect
			.poll(async () => (await getStoredImages(editor))[1])
			.toEqual({
				imgUrl: url,
				imgThumbnailUrl: url,
				width: image.media_details.width,
				height: image.media_details.height,
			});

		// The same address is not added twice.
		await manager.getByRole('button', { name: 'Insert from URL' }).click();
		await page.getByPlaceholder('Paste or type URL').fill(url);
		await page.getByRole('button', { name: 'Apply' }).click();
		await expect(manager.locator(TILE)).toHaveCount(2);

		await editor.publishPost();

		const frontend = await openPublishedPage(page);
		const picture = frontend
			.locator(`${LIST} ${ITEM}`)
			.last()
			.locator('img');

		await picture.scrollIntoViewIfNeeded();
		await expect(picture).toHaveAttribute('src', url);
		await expect(picture).toHaveAttribute(
			'width',
			String(image.media_details.width)
		);
	});

	test('an image from a URL moves into the Media Library and keeps its settings', async ({
		editor,
		page,
		requestUtils,
	}) => {
		const url = 'https://example.com/outside/photo.png';

		await editor.insertBlock(
			getLoopBlock([
				{
					imgUrl: url,
					imgThumbnailUrl: url,
					width: 800,
					height: 600,
					title: 'Kept title',
					alt: 'Kept alt',
					categories: ['Kept'],
					url: 'https://example.com/elsewhere/',
					focalPoint: { x: 0.2, y: 0.3 },
				},
			])
		);
		await editor.openDocumentSettingsSidebar();

		// The server fetches the file itself, and it refuses an address on
		// this machine, so the answer is an upload of the same picture.
		const uploaded = await requestUtils.uploadMedia(
			getFixturePath('image-800x600.png')
		);
		let requested;

		await page.route(
			(address) =>
				decodeURIComponent(address.href).includes('/wp/v2/media'),
			async (route) => {
				const request = route.request();

				if ('POST' !== request.method()) {
					return route.continue();
				}

				requested = request.postDataJSON();

				return route.fulfill({ json: uploaded, status: 201 });
			}
		);

		await page
			.locator(`${MANAGER} ${TILE} .vpf-gallery-manager__preview`)
			.click();

		const drawer = page.getByRole('dialog', { name: 'Image Settings' });

		await drawer
			.getByRole('button', { name: 'Upload to Media Library' })
			.click();

		await expect
			.poll(async () => (await getStoredImages(editor))[0]?.id)
			.toBe(uploaded.id);

		expect(requested).toMatchObject({ url });

		const [entry] = await getStoredImages(editor);

		expect(entry).toMatchObject({
			id: uploaded.id,
			imgUrl: uploaded.source_url,
			title: 'Kept title',
			alt: 'Kept alt',
			categories: ['Kept'],
			url: 'https://example.com/elsewhere/',
			focalPoint: { x: 0.2, y: 0.3 },
		});
		expect(entry.width).toBeUndefined();
		expect(entry.height).toBeUndefined();

		// An attachment has nothing more to upload.
		await expect(
			drawer.getByRole('button', { name: 'Upload to Media Library' })
		).toHaveCount(0);
	});

	test('a video entry is drawn as a video', async ({ editor, page }) => {
		// A video entry stores the address of the video where an image entry
		// stores its picture, and the tile reads nothing else, so an id no
		// attachment has stands in for the video's.
		const video = 'https://example.com/clip.mp4';

		await editor.insertBlock(
			getLoopBlock([
				{ id: image.id },
				{
					id: image.id + 1000000,
					imgUrl: video,
					imgThumbnailUrl: video,
					format: 'video',
				},
			])
		);
		await editor.openDocumentSettingsSidebar();

		const tiles = page.locator(`${MANAGER} ${TILE}`);

		await expect(tiles).toHaveCount(2);
		await expect(tiles.nth(0).locator('img')).toHaveCount(1);
		await expect(tiles.nth(1).locator(`video[src="${video}"]`)).toHaveCount(
			1
		);
		await expect(tiles.nth(1).locator('img')).toHaveCount(0);
	});
});
