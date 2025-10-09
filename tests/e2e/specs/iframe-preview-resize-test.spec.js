/**
 * WordPress dependencies
 */
import { expect, test } from '@wordpress/e2e-test-utils-playwright';

import { createRegularPosts } from '../utils/create-posts';

test.describe('iframe preview resize', () => {
	test.beforeAll(async ({ requestUtils }) => {
		const pluginName = process.env.CORE
			? 'visual-portfolio-pro'
			: 'visual-portfolio-posts-amp-image-gallery';

		await Promise.all([
			requestUtils.activatePlugin(pluginName),
			requestUtils.deleteAllMedia(),
			requestUtils.deleteAllPages(),
			requestUtils.deleteAllPosts(),
		]);

		await createRegularPosts({
			requestUtils,
			count: 3,
		});
	});
	test.afterAll(async ({ requestUtils }) => {
		await Promise.all([
			requestUtils.deleteAllMedia(),
			requestUtils.deleteAllPages(),
			requestUtils.deleteAllPosts(),
		]);
	});

	test('check disabled click action', async ({ page, admin, editor }) => {
		await admin.createNewPost({
			title: 'Preview Test',
			postType: 'page',
			showWelcomeGuide: false,
			legacyCanvas: true,
		});

		await editor.insertBlock({
			name: 'visual-portfolio/block',
		});

		await page.getByRole('button', { name: 'Posts' }).click();
		await page.getByRole('button', { name: 'Continue' }).click();
		await page
			.getByRole('button', { name: 'Classic Preview Classic' })
			.click();
		await page.getByRole('button', { name: 'Continue' }).click();
		await page.getByRole('button', { name: 'Continue' }).click();
		await page.getByRole('button', { name: 'Post', exact: true }).click();

		const iframe = page.locator(
			'.visual-portfolio-gutenberg-preview:not(.visual-portfolio-gutenberg-preview-loading) iframe'
		);
		await iframe.waitFor({ state: 'visible' });

		// Wait for height to stabilize and be > 400px and < 500px
		// We don't need to check the exact height value, just need to ensure the iframe is loaded
		// and the height is calculated and set to a non-zero value.
		await expect(async () => {
			const height = await iframe.evaluate((el) => el.offsetHeight);
			expect(height).toBeGreaterThan(400);
			expect(height).toBeLessThan(500);
		}).toPass({ timeout: 10000 });
	});
});
