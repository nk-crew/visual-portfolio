/**
 * WordPress dependencies
 */
import { test, expect } from '@wordpress/e2e-test-utils-playwright';

test.describe('initial loading', () => {
	test.beforeAll(async ({ requestUtils }) => {
		await requestUtils.activatePlugin(
			'visual-portfolio-posts-amp-image-gallery'
		);
	});

	test('should have visual portfolio in admin menu', async ({
		page,
		admin,
	}) => {
		await admin.visitAdminPage('index.php');

		await expect(page.locator('#menu-posts-portfolio')).toBeVisible();
	});
});
