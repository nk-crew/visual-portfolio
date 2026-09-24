/**
 * Gallery Loop blocks and the settings Pro adds to them.
 *
 * A setting Pro adds is kept where the free plugin declares room for it - the
 * `extensions` object of every block, the value lists that are left open - so
 * a gallery saved with Pro keeps its settings when it is edited without Pro.
 * And without Pro, each of those settings has a place in the editor that says
 * what it would do.
 */
import { expect, test } from '@wordpress/e2e-test-utils-playwright';

import { getFixturePath } from '../utils/fixture-path';
import { getPluginSlug } from '../utils/plugin-slug';

/**
 * A loop with a Pro setting on every block that takes one.
 *
 * @param {Array} images - images of the source.
 * @return {string} serialized blocks.
 */
function getMarkup(images) {
	const loop = {
		block_id: 'e2e-pro-settings',
		queryId: 1,
		queryType: 'images',
		baseQuery: { perPage: images.length, maxPages: 1 },
		imagesQuery: { images },
	};
	const template = {
		layoutType: 'carousel',
		carouselEffect: 'cards',
		layoutColumnCountTablet: 2,
		layoutTilesMobile: '2|1,1|',
	};

	return [
		`<!-- wp:visual-portfolio/loop ${JSON.stringify(loop)} -->`,
		'<div class="wp-block-visual-portfolio-loop vp-block-loop">',
		`<!-- wp:visual-portfolio/item-template ${JSON.stringify(template)} -->`,
		'<!-- wp:visual-portfolio/item-image {"extensions":{"watermark":true}} /-->',
		'<!-- /wp:visual-portfolio/item-template -->',
		'<!-- wp:visual-portfolio/loop-pagination -->',
		'<!-- wp:visual-portfolio/loop-pagination-trigger {"triggerType":"infinite","extensions":{"threshold":300}} /-->',
		'<!-- /wp:visual-portfolio/loop-pagination -->',
		'</div>',
		'<!-- /wp:visual-portfolio/loop -->',
	].join('');
}

test.describe('Gallery Loop and Pro settings', () => {
	let images = [];

	test.beforeAll(async ({ requestUtils }) => {
		await requestUtils.activatePlugin(getPluginSlug());

		const uploaded = await requestUtils.uploadMedia(
			getFixturePath('image-800x600.png')
		);

		images = [{ id: uploaded.id }];
	});

	test.beforeEach(async ({ admin }) => {
		await admin.createNewPost({
			postType: 'page',
			title: 'Gallery Loop - Pro settings',
			showWelcomeGuide: false,
			legacyCanvas: true,
		});
	});

	test('a gallery keeps the Pro settings it was saved with', async ({
		editor,
	}) => {
		await editor.setContent(getMarkup(images));

		// Parsed and serialized again, which is what dropped an attribute the
		// block did not declare and a value outside a closed list.
		const content = await editor.getEditedPostContent();

		expect(content).toContain('"carouselEffect":"cards"');
		expect(content).toContain('"layoutColumnCountTablet":2');
		expect(content).toContain('"layoutTilesMobile":"2|1,1|"');
		expect(content).toContain('"extensions":{"watermark":true}');
		expect(content).toContain('"extensions":{"threshold":300}');
	});

	test('without Pro, a Pro setting says what it would do', async ({
		page,
		editor,
	}) => {
		test.skip(
			await page.evaluate(() => window.VPGutenbergVariables.pro),
			'Pro draws its own settings.'
		);

		await editor.setContent(getMarkup(images));

		const blocks = await editor.getBlocks({ full: true });

		// The effect list names the Pro effects, and cannot pick them.
		await page.evaluate(
			(id) =>
				window.wp.data.dispatch('core/block-editor').selectBlock(id),
			blocks[0].innerBlocks[0].clientId
		);

		const cards = page
			.getByRole('combobox', { name: 'Effect' })
			.locator('option[value="cards"]');

		await expect(cards).toHaveText('Cards (Pro)');
		await expect(cards).toBeDisabled();

		// The loop's protection is an item of a Protection panel's menu, and
		// picked it shows one line and the way to Pro.
		await page.evaluate(
			(id) =>
				window.wp.data.dispatch('core/block-editor').selectBlock(id),
			blocks[0].clientId
		);

		const protection = page.locator('.components-tools-panel', {
			has: page.getByRole('heading', { name: 'Protection' }),
		});

		await protection.getByRole('button', { name: /options/i }).click();
		await page
			.getByRole('menuitemcheckbox', {
				name: 'Password Protection (Pro)',
			})
			.click();
		await page.keyboard.press('Escape');

		await expect(
			protection.getByRole('link', { name: /Go Pro/ })
		).toHaveAttribute('href', /utm_campaign=teaser_protection_password/);
	});
});
