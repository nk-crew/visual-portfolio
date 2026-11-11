/**
 * WordPress dependencies
 */
import { expect, test } from '@wordpress/e2e-test-utils-playwright';

/**
 * Internal dependencies
 */
import { deleteAllSavedLayouts } from '../utils/delete-all-saved-layouts';
import { getPluginSlug } from '../utils/plugin-slug';

const LIBRARY = ['admin.php', 'page=vpf-saved-layouts-wp-admin'];

/**
 * Serialized Gallery Loop.
 *
 * @param {Object} attributes Loop attributes.
 * @param {Object} template   Item template attributes.
 * @return {string} Markup.
 */
function loopMarkup(attributes, template) {
	return `<!-- wp:visual-portfolio/loop ${JSON.stringify(attributes)} --><div class="wp-block-visual-portfolio-loop vp-block-loop"><!-- wp:visual-portfolio/item-template ${JSON.stringify(template)} --><!-- wp:visual-portfolio/item-title /--><!-- /wp:visual-portfolio/item-template --></div><!-- /wp:visual-portfolio/loop -->`;
}

test.describe('Saved Layouts library', () => {
	test.beforeAll(async ({ requestUtils }) => {
		await requestUtils.activatePlugin(getPluginSlug());
	});

	test.beforeEach(async ({ requestUtils, admin, page }) => {
		await deleteAllSavedLayouts({ requestUtils });

		const layout = await requestUtils.rest({
			method: 'POST',
			path: '/wp/v2/vp_lists',
			data: {
				title: 'Library Masonry',
				status: 'publish',
				content: loopMarkup(
					{ queryType: 'images' },
					{ layoutType: 'masonry' }
				),
			},
		});

		await requestUtils.rest({
			method: 'POST',
			path: '/wp/v2/vp_lists',
			data: {
				title: 'Library Legacy',
				status: 'publish',
				content: '<!-- wp:visual-portfolio/saved-editor /-->',
			},
		});

		await requestUtils.rest({
			method: 'POST',
			path: '/wp/v2/pages',
			data: {
				title: 'Library usage page',
				status: 'publish',
				content: loopMarkup(
					{
						queryType: 'images',
						savedLayout: { id: layout.id, overrides: {} },
					},
					{}
				),
			},
		});

		// Start every test from the table view.
		await admin.visitAdminPage(...LIBRARY);
		await page.evaluate(() =>
			window.localStorage.setItem(
				'vpf-saved-layouts-view-v1',
				JSON.stringify({ type: 'table' })
			)
		);
		await admin.visitAdminPage(...LIBRARY);
	});

	test.afterAll(async ({ requestUtils }) => {
		await deleteAllSavedLayouts({ requestUtils });
	});

	test('the post type list opens the library', async ({ admin, page }) => {
		await admin.visitAdminPage('edit.php', 'post_type=vp_lists');

		await expect(page).toHaveURL(/page=vpf-saved-layouts-wp-admin/);
		await expect(
			page.getByRole('heading', { name: 'Saved Layouts', level: 1 })
		).toBeVisible();
	});

	test('lists layouts with their kind and usage', async ({ page }) => {
		const masonry = page.getByRole('row', { name: /Library Masonry/ });
		const legacy = page.getByRole('row', { name: /Library Legacy/ });

		await expect(masonry).toContainText('Images');
		await expect(masonry).toContainText('Masonry');
		await expect(masonry).toContainText('1 page · 1 synced');
		await expect(legacy).toContainText('Legacy');
		await expect(legacy).toContainText('Not used yet');
	});

	test('duplicates a layout', async ({ page }) => {
		await page
			.getByRole('row', { name: /Library Masonry/ })
			.getByRole('button', { name: 'Actions' })
			.click();
		await page.getByRole('menuitem', { name: 'Duplicate' }).click();

		await expect(
			page.getByRole('row', { name: /Library Masonry \(copy\)/ })
		).toBeVisible();
	});

	test('names the pages before trashing, then restores from the trash', async ({
		page,
	}) => {
		await page
			.getByRole('row', { name: /Library Masonry/ })
			.getByRole('button', { name: 'Actions' })
			.click();
		await page.getByRole('menuitem', { name: /Move to trash/ }).click();

		const dialog = page.getByRole('dialog');

		await expect(dialog).toContainText('Library usage page');
		await expect(dialog).toContainText(
			'Synced galleries keep following it until it is deleted for good.'
		);
		await dialog.getByRole('button', { name: 'Move to trash' }).click();

		await expect(
			page.getByRole('row', { name: /Library Masonry/ })
		).toHaveCount(0);

		await page.getByRole('link', { name: 'Trash (1)' }).click();

		const trashed = page.getByRole('row', { name: /Library Masonry/ });

		await expect(trashed).toBeVisible();
		await trashed.getByRole('button', { name: 'Restore' }).click();
		await expect(trashed).toHaveCount(0);
	});
});
