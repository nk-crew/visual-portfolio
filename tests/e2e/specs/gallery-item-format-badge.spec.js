/**
 * Gallery Loop: the badge an item image puts on a video, audio or gallery item.
 */
import { expect, test } from '@wordpress/e2e-test-utils-playwright';

import { getFixturePath } from '../utils/fixture-path';

test.describe('Gallery Loop format badge', () => {
	let images = [];

	test.beforeAll(async ({ requestUtils }) => {
		for (let index = 0; index < 2; index++) {
			const uploaded = await requestUtils.uploadMedia(
				getFixturePath('image-800x600.png')
			);

			images.push({ id: uploaded.id });
		}

		// The first item is a video, the second a still picture.
		images[0] = {
			...images[0],
			format: 'video',
			video_url: 'https://www.youtube.com/watch?v=mSC6GwizOag',
		};
	});

	test.afterAll(async ({ requestUtils }) => {
		await requestUtils.deleteAllMedia();
		await requestUtils.deleteAllPages();
		images = [];
	});

	test('the badge marks the video item, in the corner picked', async ({
		admin,
		editor,
		page,
	}) => {
		await admin.createNewPost({
			postType: 'page',
			title: 'Gallery Loop - format badge',
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
		await settings
			.getByRole('combobox', { name: 'Badge position' })
			.selectOption('bottom-left');

		// The video item, once: the still picture beside it gets none.
		await expect(
			editor.canvas
				.locator('.vp-item-format-badge.is-position-bottom-left')
				.filter({ visible: true })
		).toHaveCount(1);
		await expect(
			editor.canvas
				.getByRole('img', { name: 'Video' })
				.filter({ visible: true })
		).toHaveCount(1);

		await editor.publishPost();
		await page.goto(
			await page.evaluate(() =>
				window.wp.data.select('core/editor').getPermalink()
			)
		);

		await expect(page.getByRole('img', { name: 'Video' })).toHaveCount(1);
		await expect(
			page.locator('.vp-item-format-badge.is-position-bottom-left')
		).toHaveCount(1);
	});
});
