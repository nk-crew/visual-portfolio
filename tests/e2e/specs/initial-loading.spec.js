import { expect, test } from '@wordpress/e2e-test-utils-playwright';

test.describe('initial loading', () => {
	test.beforeAll(async ({ requestUtils }) => {
		const pluginName = process.env.CORE
			? 'visual-portfolio-pro'
			: 'visual-portfolio-posts-amp-image-gallery';
		await requestUtils.activatePlugin(pluginName);
	});

	test('should have visual portfolio in admin menu', async ({
		page,
		admin,
	}) => {
		await admin.visitAdminPage('index.php');

		await expect(page.locator('#menu-posts-portfolio')).toBeVisible();
	});
});
