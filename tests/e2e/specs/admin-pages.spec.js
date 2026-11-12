/**
 * WordPress dependencies
 */
import { expect, test } from '@wordpress/e2e-test-utils-playwright';

test.describe('Plugin admin pages', () => {
	test('the WordPress list screens carry the plugin page header', async ({
		admin,
		page,
	}) => {
		await admin.visitAdminPage('edit.php', 'post_type=portfolio');

		const header = page.locator('.vpf-admin-page__header');

		await expect(
			header.getByRole('heading', { level: 1, name: 'Projects' })
		).toBeVisible();
		await expect(
			header.getByRole('link', { name: 'Add New Project' })
		).toHaveAttribute('href', /post-new\.php\?post_type=portfolio/);

		// WordPress's own title gives way to the header's.
		await expect(page.locator('.wrap > .wp-heading-inline')).toBeHidden();

		await header.getByRole('link', { name: 'Categories' }).click();
		await expect(page).toHaveURL(/taxonomy=portfolio_category/);
		await expect(
			page
				.locator('.vpf-admin-page__header')
				.getByRole('link', { name: 'Categories' })
		).toHaveAttribute('aria-current', 'page');
	});
});
