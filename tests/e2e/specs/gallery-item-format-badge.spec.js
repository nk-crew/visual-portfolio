/**
 * Gallery Loop: the badge an item image puts on a video, audio or gallery item.
 */
import { expect, test } from '@wordpress/e2e-test-utils-playwright';

import { getFixturePath } from '../utils/fixture-path';

test.describe('Gallery Loop format badge', () => {
	let images = [];

	test.beforeAll(async ({ requestUtils }) => {
		for (let index = 0; index < 3; index++) {
			const uploaded = await requestUtils.uploadMedia(
				getFixturePath('image-800x600.png')
			);

			images.push({ id: uploaded.id });
		}

		// A video, a gallery and a still picture.
		images[0] = {
			...images[0],
			format: 'video',
			video_url: 'https://www.youtube.com/watch?v=mSC6GwizOag',
		};
		images[1] = { ...images[1], format: 'gallery' };
	});

	test.afterAll(async ({ requestUtils }) => {
		await requestUtils.deleteAllMedia();
		await requestUtils.deleteAllPages();
		images = [];
	});

	/**
	 * A page with a loop of the images, the badge of its item image turned on.
	 *
	 * @param {Object} fixtures        - test fixtures.
	 * @param {Object} fixtures.admin  - admin utils.
	 * @param {Object} fixtures.editor - editor utils.
	 * @param {Object} fixtures.page   - page.
	 * @param {string} title           - page title.
	 * @return {Object} the Settings panel of the item image.
	 */
	async function addLoopWithBadge({ admin, editor, page }, title) {
		await admin.createNewPost({
			postType: 'page',
			title,
			showWelcomeGuide: false,
			legacyCanvas: true,
		});

		const loop = {
			block_id: 'e2e-format-badge',
			queryId: 1,
			queryType: 'images',
			baseQuery: { perPage: images.length, maxPages: 1 },
			imagesQuery: { images },
		};

		await editor.setContent(
			[
				`<!-- wp:visual-portfolio/loop ${JSON.stringify(loop)} -->`,
				'<div class="wp-block-visual-portfolio-loop vp-block-loop">',
				'<!-- wp:visual-portfolio/item-template -->',
				'<!-- wp:visual-portfolio/item-image /-->',
				'<!-- /wp:visual-portfolio/item-template -->',
				'</div>',
				'<!-- /wp:visual-portfolio/loop -->',
			].join('')
		);

		// The Gallery format is Pro's; offered here when Pro is not active.
		await page.evaluate(() =>
			window.wp.hooks.addFilter(
				'vpf.loopImageFormats',
				'e2e/gallery-format',
				(formats) =>
					formats.some(({ value }) => 'gallery' === value)
						? formats
						: [...formats, { value: 'gallery', label: 'Gallery' }]
			)
		);

		const blocks = await editor.getBlocks({ full: true });

		await page.evaluate(
			(id) =>
				window.wp.data.dispatch('core/block-editor').selectBlock(id),
			blocks[0].innerBlocks[0].innerBlocks[0].clientId
		);

		const settings = page.locator('.components-tools-panel', {
			has: page.getByRole('heading', { name: 'Settings' }),
		});

		await settings.getByRole('button', { name: /options/i }).click();
		await page
			.getByRole('menuitemcheckbox', { name: 'Format badge' })
			.click();
		await page.keyboard.press('Escape');

		await settings.getByRole('checkbox', { name: 'Format badge' }).check();

		return settings;
	}

	async function openPublished({ editor, page }) {
		await editor.publishPost();
		await page.goto(
			await page.evaluate(() =>
				window.wp.data.select('core/editor').getPermalink()
			)
		);
	}

	test('the badge marks every format with an icon, in the corner picked', async ({
		admin,
		editor,
		page,
	}) => {
		const settings = await addLoopWithBadge(
			{ admin, editor, page },
			'Gallery Loop - format badge'
		);

		const formats = settings.getByRole('group', { name: 'Formats' });

		await expect(formats.getByRole('checkbox')).not.toHaveCount(0);

		for (const checkbox of await formats.getByRole('checkbox').all()) {
			await expect(checkbox).toBeChecked();
		}

		await settings
			.getByRole('combobox', { name: 'Badge position' })
			.selectOption('bottom-left');

		// The video and the gallery: the still picture beside them gets none.
		await expect(
			editor.canvas
				.locator('.vp-item-format-badge.is-position-bottom-left')
				.filter({ visible: true })
		).toHaveCount(2);

		const [block] = await editor.getBlocks();

		expect(
			block.innerBlocks[0].innerBlocks[0].attributes.formatBadgeFormats
		).toEqual([]);

		await openPublished({ editor, page });

		await expect(page.getByRole('img', { name: 'Video' })).toHaveCount(1);
		await expect(page.getByRole('img', { name: 'Gallery' })).toHaveCount(1);
		await expect(
			page.locator('.vp-item-format-badge.is-position-bottom-left')
		).toHaveCount(2);
	});

	test('a badge limited to galleries leaves the video alone', async ({
		admin,
		editor,
		page,
	}) => {
		const settings = await addLoopWithBadge(
			{ admin, editor, page },
			'Gallery Loop - gallery badge'
		);

		const formats = settings.getByRole('group', { name: 'Formats' });

		// Every format but Gallery: Pro offers Audio beside Video.
		for (const checkbox of await formats
			.getByRole('checkbox', { name: /^(?!Gallery$)/ })
			.all()) {
			await checkbox.uncheck();
		}

		await expect(
			formats.getByRole('checkbox', { name: 'Gallery' })
		).toBeChecked();
		await expect(
			formats.getByRole('checkbox', { name: 'Gallery' })
		).toBeDisabled();

		const [block] = await editor.getBlocks();

		expect(
			block.innerBlocks[0].innerBlocks[0].attributes.formatBadgeFormats
		).toEqual(['gallery']);

		await expect(
			editor.canvas
				.locator('.vp-item-format-badge')
				.filter({ visible: true })
		).toHaveCount(1);
		await expect(
			editor.canvas
				.getByRole('img', { name: 'Gallery' })
				.filter({ visible: true })
		).toHaveCount(1);

		await openPublished({ editor, page });

		await expect(page.locator('.vp-item-format-badge')).toHaveCount(1);
		await expect(page.getByRole('img', { name: 'Gallery' })).toHaveCount(1);
		await expect(page.getByRole('img', { name: 'Video' })).toHaveCount(0);
	});
});
