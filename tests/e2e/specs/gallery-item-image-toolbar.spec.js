/**
 * Gallery Item Image: the media tools of the block toolbar.
 *
 * The image of a Media item is cropped and replaced from the toolbar, the way
 * the core Image block's is. Both write to the gallery the loop carries, so
 * the loop's attributes are what is asserted; the item catches up with them
 * through the endpoint, which is checked once on the canvas.
 */
import { expect, test } from '@wordpress/e2e-test-utils-playwright';
import { createRegularPosts } from '../utils/create-posts';
import { getEditorCanvas } from '../utils/editor-canvas';
import { getFixturePath } from '../utils/fixture-path';
import {
	confirmMediaLibrarySelection,
	openMediaLibrary,
	selectMediaLibraryImages,
} from '../utils/media-library';
import { getPluginSlug } from '../utils/plugin-slug';

const ITEM = '.wp-block-visual-portfolio-item-template__item';
const PREVIEW = '.wp-block-visual-portfolio-item-template__preview';
// The one item whose blocks are edited; every other item is a preview of them.
const EDITED_ITEM = `${ITEM}:visible:not(:has(${PREVIEW}))`;
const ITEM_IMAGE = '[data-type="visual-portfolio/item-image"]';
const CROP_AREA = '.wp-block-image__crop-area';

const TITLE = 'Toolbar image';
const CATEGORY = 'Toolbar Category';

/**
 * A Gallery Loop over the given images, one image block per item.
 *
 * @param {Object} query - content source attributes of the loop.
 * @return {Object} block payload for `editor.insertBlock()`.
 */
function getLoopBlock(query) {
	return {
		name: 'visual-portfolio/loop',
		attributes: {
			baseQuery: { perPage: 6, maxPages: 1 },
			...query,
		},
		innerBlocks: [
			{
				name: 'visual-portfolio/item-template',
				attributes: {
					layoutType: 'grid',
					layoutColumnsMode: 'manual',
					layoutColumnCount: 3,
				},
				innerBlocks: [
					{
						name: 'visual-portfolio/item-image',
						attributes: { aspectRatio: '1' },
					},
				],
			},
		],
	};
}

/**
 * Every URL an attachment is served at, the sizes included.
 *
 * @param {Object} attachment - REST attachment.
 * @return {Array} URLs.
 */
function getAttachmentUrls(attachment) {
	return [
		attachment.source_url,
		...Object.values(attachment.media_details?.sizes || {}).map(
			(size) => size.source_url
		),
	];
}

/**
 * URL of the picture the item being edited shows.
 *
 * @param {import('@playwright/test').FrameLocator} canvas - editor canvas.
 * @return {Promise<string|null>} `src` of the image.
 */
function getShownImageUrl(canvas) {
	return canvas
		.locator(`${EDITED_ITEM} ${ITEM_IMAGE} img`)
		.getAttribute('src');
}

test.describe('Gallery Item Image toolbar', () => {
	let image;
	let spare;
	let third;
	let fourth;
	let postIds = [];

	test.beforeAll(async ({ requestUtils }) => {
		await requestUtils.activatePlugin(getPluginSlug());

		// Uploaded rather than reused: the crop is measured against the file,
		// and the replacement has to be an image the gallery does not hold.
		image = await requestUtils.uploadMedia(
			getFixturePath('image-800x600.png')
		);
		spare = await requestUtils.uploadMedia(
			getFixturePath('image-300x200.jpeg')
		);
		third = await requestUtils.uploadMedia(
			getFixturePath('image-1600x1200.jpeg')
		);
		fourth = await requestUtils.uploadMedia(
			getFixturePath('image-800x1200.webp')
		);
		postIds = await createRegularPosts({ requestUtils, count: 1 });
	});

	test.afterAll(async ({ requestUtils }) => {
		await requestUtils.deleteAllPages();
		await Promise.all(
			postIds.map((id) =>
				requestUtils.rest({
					path: `/wp/v2/posts/${id}`,
					method: 'DELETE',
					params: { force: true },
				})
			)
		);
	});

	/**
	 * The gallery of the one loop on the page.
	 *
	 * @param {Object} editor - editor fixture.
	 * @return {Promise<Array>} images of `imagesQuery`.
	 */
	async function getGallery(editor) {
		const blocks = await editor.getBlocks();
		const loop = blocks.find(
			(block) => 'visual-portfolio/loop' === block.name
		);

		return loop?.attributes?.imagesQuery?.images ?? [];
	}

	/**
	 * The attachments the preview shows, in the order it shows them.
	 *
	 * @param {import('@playwright/test').FrameLocator} canvas      - editor canvas.
	 * @param {Array}                                   attachments - REST attachments the gallery holds.
	 * @return {Promise<Array>} attachment ids.
	 */
	async function getShownOrder(canvas, attachments) {
		const sources = await canvas
			.locator(`${ITEM}:visible ${ITEM_IMAGE} img`)
			.evaluateAll((images) =>
				images.map((img) => img.getAttribute('src'))
			);

		return sources.map(
			(source) =>
				attachments.find((attachment) =>
					getAttachmentUrls(attachment).includes(source)
				)?.id
		);
	}

	/**
	 * Hold every request for the items of a loop until released, so what the
	 * preview shows meanwhile is its own doing.
	 *
	 * @param {import('@playwright/test').Page} page - page.
	 * @return {Promise<Function>} releases the held requests and stops holding.
	 */
	async function holdLoopItems(page) {
		const held = [];
		const matcher = (url) => url.href.includes('get_loop_items');
		const handler = (route) => held.push(route);

		await page.route(matcher, handler);

		return async () => {
			await page.unroute(matcher, handler);
			await Promise.all(held.map((route) => route.continue()));
		};
	}

	/**
	 * Make the item at `index` the edited one and select its image block.
	 *
	 * @param {Object}                                  editor - editor fixture.
	 * @param {import('@playwright/test').FrameLocator} canvas - editor canvas.
	 * @param {number}                                  index  - place of the item.
	 */
	async function selectItemImage(editor, canvas, index) {
		const item = canvas.locator(`${ITEM}:visible`).nth(index);

		if ((await item.locator(PREVIEW).count()) > 0) {
			await item.locator(PREVIEW).click();
		}

		await editor.selectBlocks(
			canvas.locator(`${EDITED_ITEM} ${ITEM_IMAGE}`)
		);
	}

	test('moves a Media image from the toolbar before the server answers, one undo step a click', async ({
		page,
		admin,
		editor,
		pageUtils,
	}) => {
		await admin.createNewPost({
			title: 'Gallery Item Image toolbar - move',
			postType: 'page',
			showWelcomeGuide: false,
			legacyCanvas: true,
		});

		const attachments = [image, spare, third, fourth];

		await editor.insertBlock(
			getLoopBlock({
				queryType: 'images',
				imagesQuery: {
					images: attachments.map(({ id }) => ({ id })),
				},
			})
		);

		const canvas = getEditorCanvas(page, editor);

		await expect
			.poll(() => getShownOrder(canvas, attachments))
			.toEqual([image.id, spare.id, third.id, fourth.id]);

		await selectItemImage(editor, canvas, 1);

		const toolbar = page.getByRole('toolbar', { name: 'Block tools' });

		// The edited item is the node that has to survive the server's answer.
		await canvas.locator(EDITED_ITEM).evaluate((item) => {
			item.dataset.e2eMoved = 'true';
		});

		const release = await holdLoopItems(page);

		await toolbar.getByRole('button', { name: 'Move right' }).click();

		expect((await getGallery(editor)).map(({ id }) => id)).toEqual([
			image.id,
			third.id,
			spare.id,
			fourth.id,
		]);
		await expect
			.poll(() => getShownOrder(canvas, attachments))
			.toEqual([image.id, third.id, spare.id, fourth.id]);

		// Two more, both read off the gallery the click before left.
		await toolbar.getByRole('button', { name: 'Move right' }).click();
		await expect(
			toolbar.getByRole('button', { name: 'Move right' })
		).toBeDisabled();
		await toolbar.getByRole('button', { name: 'Move left' }).click();

		await expect
			.poll(() => getShownOrder(canvas, attachments))
			.toEqual([image.id, third.id, spare.id, fourth.id]);

		const answered = page.waitForResponse(
			(response) =>
				response.url().includes('get_loop_items') &&
				JSON.stringify([image.id, third.id, spare.id, fourth.id]) ===
					JSON.stringify(
						response
							.request()
							.postDataJSON()
							.imagesQuery.images.map(({ id }) => id)
					)
		);

		await release();
		await answered;

		// The answer confirms the order rather than redrawing it.
		await expect
			.poll(() => getShownOrder(canvas, attachments))
			.toEqual([image.id, third.id, spare.id, fourth.id]);
		await expect(canvas.locator('[data-e2e-moved]')).toHaveCount(1);
		expect(getAttachmentUrls(spare)).toContain(
			await canvas
				.locator(`[data-e2e-moved] ${ITEM_IMAGE} img`)
				.getAttribute('src')
		);

		// Every click is its own step.
		await pageUtils.pressKeys('primary+z');

		await expect
			.poll(async () => (await getGallery(editor)).map(({ id }) => id))
			.toEqual([image.id, third.id, fourth.id, spare.id]);
	});

	test('moves along a descending gallery the way it is shown', async ({
		page,
		admin,
		editor,
	}) => {
		await admin.createNewPost({
			title: 'Gallery Item Image toolbar - descending',
			postType: 'page',
			showWelcomeGuide: false,
			legacyCanvas: true,
		});

		const attachments = [image, spare, third];

		await editor.insertBlock(
			getLoopBlock({
				queryType: 'images',
				imagesQuery: {
					images: attachments.map(({ id }) => ({ id })),
					order: 'desc',
				},
			})
		);

		const canvas = getEditorCanvas(page, editor);

		await expect
			.poll(() => getShownOrder(canvas, attachments))
			.toEqual([third.id, spare.id, image.id]);

		await selectItemImage(editor, canvas, 0);

		const toolbar = page.getByRole('toolbar', { name: 'Block tools' });

		await expect(
			toolbar.getByRole('button', { name: 'Move left' })
		).toBeDisabled();

		await toolbar.getByRole('button', { name: 'Move right' }).click();

		expect((await getGallery(editor)).map(({ id }) => id)).toEqual([
			image.id,
			third.id,
			spare.id,
		]);
		await expect
			.poll(() => getShownOrder(canvas, attachments))
			.toEqual([spare.id, third.id, image.id]);

		// The first item is edited without being picked, and still goes
		// along with its image.
		expect(getAttachmentUrls(third)).toContain(
			await getShownImageUrl(canvas)
		);
	});

	test('stops at the last image the preview shows', async ({
		page,
		admin,
		editor,
	}) => {
		await admin.createNewPost({
			title: 'Gallery Item Image toolbar - page edge',
			postType: 'page',
			showWelcomeGuide: false,
			legacyCanvas: true,
		});

		const loop = getLoopBlock({
			queryType: 'images',
			imagesQuery: {
				images: [image, spare, third].map(({ id }) => ({ id })),
			},
		});

		loop.attributes.baseQuery = { perPage: 2, maxPages: 1 };

		await editor.insertBlock(loop);

		const canvas = getEditorCanvas(page, editor);

		await expect
			.poll(() => getShownOrder(canvas, [image, spare, third]))
			.toEqual([image.id, spare.id]);

		await selectItemImage(editor, canvas, 1);

		// One more step would move the image being edited out of sight, and
		// the next image into its block.
		await expect(
			page
				.getByRole('toolbar', { name: 'Block tools' })
				.getByRole('button', { name: 'Move right' })
		).toBeDisabled();
	});

	test('removes a Media image from the gallery from the options menu', async ({
		page,
		admin,
		editor,
	}) => {
		await admin.createNewPost({
			title: 'Gallery Item Image toolbar - remove',
			postType: 'page',
			showWelcomeGuide: false,
			legacyCanvas: true,
		});

		const attachments = [image, spare, third];

		await editor.insertBlock(
			getLoopBlock({
				queryType: 'images',
				imagesQuery: {
					images: attachments.map(({ id }) => ({
						id,
						title: `${TITLE} ${id}`,
					})),
				},
			})
		);

		const canvas = getEditorCanvas(page, editor);

		await expect
			.poll(() => getShownOrder(canvas, attachments))
			.toEqual([image.id, spare.id, third.id]);

		await selectItemImage(editor, canvas, 1);

		const release = await holdLoopItems(page);

		await editor.clickBlockOptionsMenuItem('Remove from gallery');

		// The other entries keep everything typed into them.
		expect(await getGallery(editor)).toEqual([
			{ id: image.id, title: `${TITLE} ${image.id}` },
			{ id: third.id, title: `${TITLE} ${third.id}` },
		]);
		await expect
			.poll(() => getShownOrder(canvas, attachments))
			.toEqual([image.id, third.id]);

		await release();
	});

	test('offers no arrows for a sorted gallery, and the removal still', async ({
		page,
		admin,
		editor,
	}) => {
		await admin.createNewPost({
			title: 'Gallery Item Image toolbar - sorted',
			postType: 'page',
			showWelcomeGuide: false,
			legacyCanvas: true,
		});

		await editor.insertBlock(
			getLoopBlock({
				queryType: 'images',
				imagesQuery: {
					images: [{ id: image.id }, { id: spare.id }],
					orderBy: 'title',
				},
			})
		);

		const canvas = getEditorCanvas(page, editor);

		await expect(canvas.locator(`${ITEM}:visible`)).toHaveCount(2);

		await selectItemImage(editor, canvas, 0);

		const toolbar = page.getByRole('toolbar', { name: 'Block tools' });

		await expect(
			toolbar.getByRole('button', { name: 'On click' })
		).toBeVisible();
		await expect(
			toolbar.getByRole('button', { name: 'Move right' })
		).toHaveCount(0);

		await editor.clickBlockOptionsMenuItem('Remove from gallery');

		await expect
			.poll(async () => (await getGallery(editor)).length)
			.toBe(1);
	});

	test('leaves an image the gallery holds twice alone', async ({
		page,
		admin,
		editor,
	}) => {
		await admin.createNewPost({
			title: 'Gallery Item Image toolbar - repeated',
			postType: 'page',
			showWelcomeGuide: false,
			legacyCanvas: true,
		});

		await editor.insertBlock(
			getLoopBlock({
				queryType: 'images',
				imagesQuery: {
					images: [
						{ id: image.id, title: 'First' },
						{ id: spare.id },
						{ id: image.id, title: 'Second' },
					],
				},
			})
		);

		const canvas = getEditorCanvas(page, editor);

		await expect
			.poll(() => getShownOrder(canvas, [image, spare]))
			.toEqual([image.id, spare.id, image.id]);

		await selectItemImage(editor, canvas, 2);

		const toolbar = page.getByRole('toolbar', { name: 'Block tools' });

		// Either entry could be the one the item shows, and the wrong one
		// would lose what was typed into it.
		await expect(
			toolbar.getByRole('button', { name: 'On click' })
		).toBeVisible();
		await expect(
			toolbar.getByRole('button', { name: 'Move left' })
		).toHaveCount(0);

		await toolbar.getByRole('button', { name: 'Options' }).click();

		await expect(
			page.getByRole('menuitem', { name: 'Remove from gallery' })
		).toHaveCount(0);
	});

	test.describe('with motion allowed', () => {
		test.use({ contextOptions: { reducedMotion: 'no-preference' } });

		test('lays a justified gallery out again and slides the moved items', async ({
			page,
			admin,
			editor,
		}) => {
			await admin.createNewPost({
				title: 'Gallery Item Image toolbar - justified',
				postType: 'page',
				showWelcomeGuide: false,
				legacyCanvas: true,
			});

			const attachments = [image, fourth, third, spare];
			const loop = getLoopBlock({
				queryType: 'images',
				imagesQuery: {
					images: attachments.map(({ id }) => ({ id })),
				},
			});

			loop.innerBlocks[0].attributes.layoutType = 'justified';
			loop.innerBlocks[0].innerBlocks[0].attributes = {};

			await editor.insertBlock(loop);

			const canvas = getEditorCanvas(page, editor);

			await expect
				.poll(() => getShownOrder(canvas, attachments))
				.toEqual(attachments.map(({ id }) => id));

			await selectItemImage(editor, canvas, 0);

			const getBox = () =>
				canvas.locator(`${EDITED_ITEM}`).evaluate((item) => {
					const { left, top } = item.getBoundingClientRect();

					return { left: Math.round(left), top: Math.round(top) };
				});
			const before = await getBox();

			// Every inline transform an item is given on the way, which the
			// slide sets and clears within a few frames.
			await canvas
				.locator(ITEM)
				.first()
				.evaluate((item) => {
					const list = item.parentElement;

					list.dataset.e2eSlides = '0';
					new list.ownerDocument.defaultView.MutationObserver(
						(records) => {
							if (
								records.some((record) =>
									record.target.style?.transform?.includes(
										'translate'
									)
								)
							) {
								list.dataset.e2eSlides = String(
									Number(list.dataset.e2eSlides) + 1
								);
							}
						}
					).observe(list, {
						attributes: true,
						attributeFilter: ['style'],
						subtree: true,
					});
				});

			const release = await holdLoopItems(page);

			await page
				.getByRole('toolbar', { name: 'Block tools' })
				.getByRole('button', { name: 'Move right' })
				.click();

			await expect
				.poll(() => getShownOrder(canvas, attachments))
				.toEqual([fourth.id, image.id, third.id, spare.id]);

			// The measured layout places the item where its new turn is, not
			// where the node stood, before the server has said anything.
			await expect.poll(getBox).not.toEqual(before);
			await expect(
				canvas.locator('[data-e2e-slides]')
			).not.toHaveAttribute('data-e2e-slides', '0');

			await release();
		});
	});

	test('moves the image of an Item Cover too', async ({
		page,
		admin,
		editor,
	}) => {
		await admin.createNewPost({
			title: 'Gallery Item Image toolbar - cover',
			postType: 'page',
			showWelcomeGuide: false,
			legacyCanvas: true,
		});

		const loop = getLoopBlock({
			queryType: 'images',
			imagesQuery: {
				images: [{ id: image.id }, { id: spare.id }],
			},
		});

		loop.innerBlocks[0].innerBlocks = [
			{ name: 'visual-portfolio/item-cover' },
		];

		await editor.insertBlock(loop);

		const canvas = getEditorCanvas(page, editor);

		await expect(canvas.locator(`${ITEM}:visible`)).toHaveCount(2);

		await editor.selectBlocks(
			canvas
				.locator(
					`${EDITED_ITEM} [data-type="visual-portfolio/item-cover"]`
				)
				.first()
		);

		await page
			.getByRole('toolbar', { name: 'Block tools' })
			.getByRole('button', { name: 'Move right' })
			.click();

		expect((await getGallery(editor)).map(({ id }) => id)).toEqual([
			spare.id,
			image.id,
		]);
	});

	test('crops the image of a Media item into a new attachment, and undoes it', async ({
		page,
		admin,
		editor,
		requestUtils,
	}) => {
		await admin.createNewPost({
			title: 'Gallery Item Image toolbar - crop',
			postType: 'page',
			showWelcomeGuide: false,
			legacyCanvas: true,
		});

		// The second of two, so that the crop is seen to land on the entry of
		// its own item and the editing to stay there.
		const original = {
			id: image.id,
			imgUrl: image.source_url,
			imgThumbnailUrl: image.source_url,
			title: TITLE,
			categories: [CATEGORY],
		};

		await editor.insertBlock(
			getLoopBlock({
				queryType: 'images',
				imagesQuery: { images: [{ id: spare.id }, original] },
			})
		);

		const canvas = getEditorCanvas(page, editor);

		await expect(canvas.locator(`${ITEM}:visible`)).toHaveCount(2);

		// A click on a preview makes its item the edited one.
		await canvas.locator(`${ITEM}:visible`).nth(1).locator(PREVIEW).click();
		await expect
			.poll(async () =>
				getAttachmentUrls(image).includes(
					await getShownImageUrl(canvas)
				)
			)
			.toBe(true);

		await editor.selectBlocks(
			canvas.locator(`${EDITED_ITEM} ${ITEM_IMAGE}`)
		);

		const toolbar = page.getByRole('toolbar', { name: 'Block tools' });
		const cropButton = toolbar.getByRole('button', { name: 'Crop' });

		// The button waits for the picture to be measured.
		await expect(cropButton).toBeEnabled();
		await cropButton.click();

		// The cropper takes the place of the picture, and its tools the place
		// of the block's own.
		await expect(canvas.locator(CROP_AREA)).toBeVisible();
		await expect(
			toolbar.getByRole('button', { name: 'Zoom' })
		).toBeVisible();
		await expect(
			toolbar.getByRole('button', { name: 'Rotate' })
		).toBeVisible();
		await expect(cropButton).toBeHidden();
		await expect(
			toolbar.getByRole('button', { name: 'Replace' })
		).toBeHidden();

		await toolbar.getByRole('button', { name: 'Aspect Ratio' }).click();
		await page.getByRole('menuitemradio', { name: /Square/ }).click();
		await toolbar
			.getByRole('button', { name: 'Apply', exact: true })
			.click();

		// The crop is saved as a new attachment, and the entry moves over to it
		// with everything typed into it.
		await expect
			.poll(async () => (await getGallery(editor))[1]?.id)
			.not.toBe(image.id);

		const [untouched, entry] = await getGallery(editor);

		expect(untouched).toEqual({ id: spare.id });
		expect(entry).toMatchObject({ title: TITLE, categories: [CATEGORY] });
		expect(entry).not.toHaveProperty('imgUrl');

		const cropped = await requestUtils.rest({
			path: `/wp/v2/media/${entry.id}`,
		});

		// The crop is sent as percentages of the picture and rounded to whole
		// pixels by the server, so square within a pixel.
		const { width, height } = cropped.media_details;

		expect(Math.abs(width - height)).toBeLessThanOrEqual(1);
		expect(width).toBeLessThan(image.media_details.width);

		// The item shows the result once the endpoint answers - a new item to
		// the endpoint, in the place of the old one - and the editing stays
		// with it rather than falling back to the first item.
		await expect(canvas.locator(CROP_AREA)).toBeHidden();
		await expect
			.poll(async () =>
				getAttachmentUrls(cropped).includes(
					await getShownImageUrl(canvas)
				)
			)
			.toBe(true);
		await expect(cropButton).toBeEnabled();

		// The snackbar offers to undo the crop: the entry goes back to the
		// original attachment, the URLs it carried included.
		await page
			.locator('.components-snackbar')
			.getByRole('button', { name: 'Undo' })
			.click();

		await expect
			.poll(async () => (await getGallery(editor))[1])
			.toEqual(original);
	});

	test('replaces the image of a Media item from the media library', async ({
		page,
		admin,
		editor,
	}) => {
		await admin.createNewPost({
			title: 'Gallery Item Image toolbar - replace',
			postType: 'page',
			showWelcomeGuide: false,
			legacyCanvas: true,
		});

		await editor.insertBlock(
			getLoopBlock({
				queryType: 'images',
				imagesQuery: {
					images: [{ id: image.id, categories: [CATEGORY] }],
				},
			})
		);

		const canvas = getEditorCanvas(page, editor);

		await expect(canvas.locator(`${ITEM}:visible`)).toHaveCount(1);

		await editor.selectBlocks(canvas.locator(ITEM_IMAGE).first());

		const toolbar = page.getByRole('toolbar', { name: 'Block tools' });

		await toolbar.getByRole('button', { name: 'Replace' }).click();
		await page
			.getByRole('menuitem', { name: 'Open Media Library' })
			.click();
		await openMediaLibrary(page);
		await selectMediaLibraryImages(page, [spare.id]);
		await confirmMediaLibrarySelection(page);

		// The same replacement the gallery manager makes: the file and what
		// the library knows of it, over an entry that keeps the rest.
		await expect
			.poll(async () => (await getGallery(editor))[0])
			.toMatchObject({
				id: spare.id,
				imgUrl: spare.source_url,
				categories: [CATEGORY],
			});

		await expect
			.poll(async () =>
				getAttachmentUrls(spare).includes(
					await getShownImageUrl(canvas)
				)
			)
			.toBe(true);
	});

	test('replaces the image of a Media item with an upload', async ({
		page,
		admin,
		editor,
	}) => {
		await admin.createNewPost({
			title: 'Gallery Item Image toolbar - upload',
			postType: 'page',
			showWelcomeGuide: false,
			legacyCanvas: true,
		});

		await editor.insertBlock(
			getLoopBlock({
				queryType: 'images',
				imagesQuery: {
					images: [{ id: image.id, categories: [CATEGORY] }],
				},
			})
		);

		const canvas = getEditorCanvas(page, editor);

		await expect(canvas.locator(`${ITEM}:visible`)).toHaveCount(1);

		await editor.selectBlocks(canvas.locator(ITEM_IMAGE).first());

		const toolbar = page.getByRole('toolbar', { name: 'Block tools' });

		await toolbar.getByRole('button', { name: 'Replace' }).click();
		await page
			.locator(
				'.block-editor-media-replace-flow__options input[type="file"]'
			)
			.setInputFiles(getFixturePath('image-2000x2000.jpeg'));

		// An upload answers with the REST record rather than a media frame
		// item, and before the sizes are cut: the entry gets the file for a
		// thumbnail, and plain text for the fields the record wraps.
		await expect
			.poll(async () => (await getGallery(editor))[0])
			.toMatchObject({
				categories: [CATEGORY],
				imgUrl: expect.stringContaining('image-2000x2000'),
				imgThumbnailUrl: expect.stringContaining('image-2000x2000'),
				title: expect.stringContaining('image-2000x2000'),
			});

		const [entry] = await getGallery(editor);

		expect(entry.id).not.toBe(image.id);
		expect(entry).not.toHaveProperty('description');
	});

	test('offers neither tool for the image of a post', async ({
		page,
		admin,
		editor,
	}) => {
		await admin.createNewPost({
			title: 'Gallery Item Image toolbar - posts',
			postType: 'page',
			showWelcomeGuide: false,
			legacyCanvas: true,
		});

		await editor.insertBlock(
			getLoopBlock({
				queryType: 'posts',
				postsQuery: { source: 'ids', ids: postIds },
			})
		);

		const canvas = getEditorCanvas(page, editor);

		await expect(canvas.locator(`${ITEM}:visible`)).toHaveCount(1);
		await expect(
			canvas.locator(`${ITEM}:visible ${ITEM_IMAGE} img`).first()
		).toBeVisible();

		await editor.selectBlocks(canvas.locator(ITEM_IMAGE).first());

		const toolbar = page.getByRole('toolbar', { name: 'Block tools' });

		// The featured image belongs to the post, so the toolbar holds the
		// link setting and nothing of the media tools.
		await expect(
			toolbar.getByRole('button', { name: 'On click' })
		).toBeVisible();
		await expect(toolbar.getByRole('button', { name: 'Crop' })).toHaveCount(
			0
		);
		await expect(
			toolbar.getByRole('button', { name: 'Replace' })
		).toHaveCount(0);
		await expect(
			toolbar.getByRole('button', { name: 'Move right' })
		).toHaveCount(0);

		await toolbar.getByRole('button', { name: 'Options' }).click();

		await expect(
			page.getByRole('menuitem', { name: 'Remove from gallery' })
		).toHaveCount(0);
	});
});
