/**
 * Where the classic block and the Settings page point at Pro, without Pro:
 * the settings Pro adds there, by name, and one link.
 */
import { expect, test } from '@wordpress/e2e-test-utils-playwright';

import { getPluginSlug } from '../utils/plugin-slug';

test.describe('Pro notes without Pro', () => {
	test.beforeAll(async ({ requestUtils }) => {
		await requestUtils.activatePlugin(getPluginSlug());
	});

	test('the classic block lists the Protection settings Pro adds', async ({
		admin,
		editor,
		page,
	}) => {
		await admin.createNewPost({
			postType: 'page',
			title: 'Classic block - Pro notes',
			showWelcomeGuide: false,
			legacyCanvas: true,
		});

		test.skip(
			await page.evaluate(() => window.VPGutenbergVariables.pro),
			'Pro draws the real settings.'
		);

		await editor.insertBlock({
			name: 'visual-portfolio/block',
			attributes: {
				setup_wizard: 'false',
				content_source: 'images',
			},
		});
		await editor.openDocumentSettingsSidebar();
		await page
			.locator('.components-panel__body-toggle', {
				hasText: 'Protection',
			})
			.click();

		const note = page.locator('.vpf-pro-features');

		await expect(note.locator('.vpf-pro-features__name')).toHaveText([
			'WatermarksPro',
			'Password ProtectionPro',
			'Age Gate ProtectionPro',
		]);
		await expect(
			note.locator('.vpf-pro-features__description').first()
		).toHaveText('Protect your works using watermarks');
		await expect(note.locator('.vpf-pro-features__footer')).toContainText(
			'These come with Visual Portfolio Pro.'
		);

		const link = note.getByRole('link', { name: /Go Pro/ });

		await expect(link).toHaveCount(1);
		await expect(link).toHaveAttribute(
			'href',
			/utm_campaign=protection_pro_note/
		);
	});

	test('a Pro tab of Settings shows its fields greyed out', async ({
		admin,
		page,
	}) => {
		// Pro's own suite runs this spec with Pro active, and Pro draws its real settings.
		test.skip(!!process.env.CORE, 'Pro draws the real settings.');

		await admin.visitAdminPage(
			'edit.php',
			'post_type=portfolio&page=visual-portfolio-settings'
		);

		await page.locator('.nav-tab', { hasText: 'White Label' }).click();

		const tab = page.locator('#vp_white_label');

		await expect(tab.locator('.vpf-settings-pro-note')).toContainText(
			'White Label comes with Visual Portfolio Pro. Remove our plugin brand and logos from Front and Admin areas'
		);
		await expect(tab.getByRole('link', { name: /Go Pro/ })).toHaveAttribute(
			'href',
			/utm_campaign=white_label/
		);

		// Pro's tab as Pro first shows it: the toggle, by the name Pro gives
		// it, and it takes no value here.
		await expect(tab.locator('.vpf-settings-pro-preview th')).toHaveText([
			'Enable White Label',
		]);
		await expect(
			tab.locator('input[type="checkbox"][name="vp_white_label[enable]"]')
		).toBeDisabled();
		await expect(tab.locator('.metabox-holder-footer')).toBeHidden();
	});

	test('the Social Feeds tab lists the Pro networks with no account connected', async ({
		admin,
		page,
	}) => {
		// Pro's own suite runs this spec with Pro active, and Pro draws its real settings.
		test.skip(!!process.env.CORE, 'Pro draws the real settings.');

		await admin.visitAdminPage(
			'edit.php',
			'post_type=portfolio&page=visual-portfolio-settings'
		);

		await page.locator('.nav-tab', { hasText: 'Social Feeds' }).click();

		const preview = page.locator(
			'#vp_social_integrations .vpf-settings-pro-preview'
		);

		await expect(preview.locator('button span')).toHaveText([
			'Instagram',
			'YouTube',
			'Vimeo',
			'Unsplash',
			'X',
			'Flickr',
			'Dribbble',
			'Twitch',
			'VK',
			'RSS',
		]);
		await expect(preview.locator('h3')).toHaveText('Instagram');
		await expect(preview).toContainText('No accounts connected yet.');
		// Pro's buttons are only drawn here.
		await expect(preview).toHaveAttribute('inert', '');
	});
});
