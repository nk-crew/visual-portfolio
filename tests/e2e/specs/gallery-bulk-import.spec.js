import { readFile } from 'node:fs/promises';
import { expect, test } from '@wordpress/e2e-test-utils-playwright';

import { getFixturePath } from '../utils/fixture-path';
import { getPluginSlug } from '../utils/plugin-slug';

const SHOOT_TITLES = ['IMG_1', 'IMG_2', 'IMG_9', 'IMG_10', 'фото 1'];

const SHOOT_FILES = [
	'IMG_1.png',
	'IMG_10.jpeg',
	'IMG_2.jpeg',
	'IMG_9.jpeg',
	'notes.txt',
	'Вложенная/фото 1.jpeg',
];

function isMediaUpload(request) {
	return (
		'POST' === request.method() &&
		/wp\/v2\/media(?:$|[?&])/.test(decodeURIComponent(request.url()))
	);
}

async function getGalleryTitles(editor) {
	const [loop] = await editor.getBlocks();

	return (loop?.attributes.imagesQuery?.images || []).map(
		({ title }) => title
	);
}

async function expectGallery(editor, titles) {
	await expect
		.poll(() => getGalleryTitles(editor), { timeout: 30000 })
		.toEqual(titles);
}

/**
 * Pick the fixture folder through the Import menu of the first step.
 *
 * @param {Object} page   - Playwright page.
 * @param {Object} canvas - editor canvas.
 */
async function pickShootFolder(page, canvas) {
	await canvas
		.locator('.vpf-loop-start')
		.getByRole('button', { name: 'Import', exact: true })
		.click();

	const chooser = page.waitForEvent('filechooser');

	await page.getByRole('menuitem', { name: 'Upload folder' }).click();
	await (await chooser).setFiles(getFixturePath('bulk-import/shoot'));
}

/**
 * Hold the media uploads until released, to see how many run at once.
 *
 * @param {Object} page - Playwright page.
 * @return {Promise<Object>} `{ pending, release }`.
 */
async function holdUploads(page) {
	const pending = [];
	let isHeld = true;

	await page.route(
		(url) => /wp\/v2\/media(?:$|[?&])/.test(decodeURIComponent(url.href)),
		(route) => {
			if (!isMediaUpload(route.request()) || !isHeld) {
				return route.continue();
			}

			pending.push(route);
		}
	);

	return {
		pending,
		release: () => {
			isHeld = false;

			return Promise.all(
				pending
					.splice(0)
					.reverse()
					.map((route) => route.continue())
			);
		},
	};
}

test.describe('Gallery Loop bulk import', () => {
	test.beforeAll(async ({ requestUtils }) => {
		await requestUtils.activatePlugin(getPluginSlug());
	});

	test.afterEach(async ({ requestUtils }) => {
		await requestUtils.deleteAllMedia();
	});

	test.beforeEach(async ({ admin, editor }) => {
		await admin.createNewPost({
			title: 'Gallery Loop - bulk import',
			postType: 'page',
			showWelcomeGuide: false,
			legacyCanvas: true,
		});

		await editor.insertBlock({ name: 'visual-portfolio/loop' });
	});

	test('a folder uploads three files at a time, in the order of their names', async ({
		editor,
		page,
	}) => {
		const uploads = await holdUploads(page);

		await pickShootFolder(page, editor.canvas);

		await expect.poll(() => uploads.pending.length).toBe(3);
		await page.waitForTimeout(1000);
		expect(uploads.pending).toHaveLength(3);

		const isLeavingGuarded = () =>
			page.evaluate(() => {
				const event = new Event('beforeunload', { cancelable: true });

				window.dispatchEvent(event);

				return event.defaultPrevented;
			});

		expect(await isLeavingGuarded()).toBe(true);

		await uploads.release();

		await expectGallery(editor, SHOOT_TITLES);
		expect(await isLeavingGuarded()).toBe(false);
		await expect(
			editor.canvas.locator('.vpf-gallery-import[role="status"]')
		).toContainText('5 files added. 1 unsupported file skipped.');
	});

	test('a dropped folder brings the files of its subfolders', async ({
		editor,
		page,
	}) => {
		const files = await Promise.all(
			SHOOT_FILES.map(async (path) => ({
				path,
				bytes: Array.from(
					await readFile(getFixturePath(`bulk-import/shoot/${path}`))
				),
			}))
		);

		// A browser cannot be told to drag a folder, so the drop is built from
		// the file system entries a real one carries.
		await editor.canvas
			.locator('.vpf-loop-start .components-drop-zone')
			.evaluate((zone, entries) => {
				const toFile = ({ path, bytes }) =>
					new File([new Uint8Array(bytes)], path.split('/').pop());

				const directory = (fullPath, children) => ({
					isFile: false,
					isDirectory: true,
					fullPath,
					createReader: () => {
						let isRead = false;

						return {
							readEntries: (resolve) => {
								resolve(isRead ? [] : children);
								isRead = true;
							},
						};
					},
				});
				const file = (entry, fullPath) => ({
					isFile: true,
					isDirectory: false,
					fullPath,
					file: (resolve) => resolve(toFile(entry)),
				});

				const nested = entries.filter(({ path }) => path.includes('/'));
				const root = directory('/shoot', [
					...entries
						.filter(({ path }) => !path.includes('/'))
						.map((entry) => file(entry, `/shoot/${entry.path}`)),
					file({ path: '.DS_Store', bytes: [0] }, '/shoot/.DS_Store'),
					directory(
						'/shoot/Вложенная',
						nested.map((entry) =>
							file(entry, `/shoot/${entry.path}`)
						)
					),
				]);

				const event = new Event('drop', {
					bubbles: true,
					cancelable: true,
				});

				Object.defineProperty(event, 'dataTransfer', {
					value: {
						// What a browser lists for a dropped folder: an empty file.
						files: [new File([], 'shoot')],
						items: [
							{
								kind: 'file',
								getAsFile: () => null,
								webkitGetAsEntry: () => root,
							},
						],
						types: ['Files'],
						getData: () => '',
					},
				});

				zone.dispatchEvent(event);
			}, files);

		await expectGallery(editor, SHOOT_TITLES);
	});

	test('a ZIP archive is unpacked in the browser', async ({
		editor,
		page,
	}) => {
		const uploaded = [];

		page.on('request', (request) => {
			if (isMediaUpload(request)) {
				uploaded.push(request.postDataBuffer()?.toString('latin1'));
			}
		});

		await editor.canvas
			.locator('.vpf-loop-start input[type="file"]')
			.setInputFiles(getFixturePath('bulk-import/shoot.zip'));

		await expectGallery(editor, SHOOT_TITLES);
		expect(uploaded).toHaveLength(5);
		expect(uploaded.join()).not.toMatch(/shoot\.zip|__MACOSX|DS_Store/);
		await expect(
			editor.canvas.locator('.vpf-gallery-import[role="status"]')
		).toContainText('5 files added. 1 unsupported file skipped.');
	});

	test('importing the same folder again adds nothing', async ({
		editor,
		page,
	}) => {
		await pickShootFolder(page, editor.canvas);
		await expectGallery(editor, SHOOT_TITLES);

		await editor.canvas
			.getByRole('option', { name: 'Masonry Clean', exact: true })
			.click();
		await editor.selectBlocks(
			editor.canvas.locator('[data-type="visual-portfolio/loop"]')
		);

		const status = page.locator('.vpf-gallery-import[role="status"]');

		await status.getByRole('button', { name: 'Dismiss' }).click();
		await page
			.locator('.vpf-gallery-manager__actions')
			.getByRole('button', { name: 'Import', exact: true })
			.click();

		const chooser = page.waitForEvent('filechooser');

		await page.getByRole('menuitem', { name: 'Upload folder' }).click();
		await (await chooser).setFiles(getFixturePath('bulk-import/shoot'));

		await expect(status).toContainText(
			'0 files added. 5 duplicates skipped. 1 unsupported file skipped.'
		);
		expect(await getGalleryTitles(editor)).toEqual(SHOOT_TITLES);
	});

	test('a file the server refuses is listed, and Retry sends it again', async ({
		editor,
		page,
	}) => {
		// The editor refuses a file over the site's upload limit with the
		// message the server would answer.
		const setUploadLimit = (bytes) =>
			page.evaluate(
				(maxUploadFileSize) =>
					window.wp.data
						.dispatch('core/editor')
						.updateEditorSettings({ maxUploadFileSize }),
				bytes
			);

		await setUploadLimit(5000);
		await pickShootFolder(page, editor.canvas);

		const status = editor.canvas.locator(
			'.vpf-gallery-import[role="status"]'
		);

		await expect(status).toContainText('1 file failed:');
		await expect(status).toContainText('shoot/IMG_1.png');
		expect(await getGalleryTitles(editor)).toEqual(SHOOT_TITLES.slice(1));

		await setUploadLimit(0);
		await status.getByRole('button', { name: 'Retry failed' }).click();

		await expectGallery(editor, SHOOT_TITLES);
	});
});
