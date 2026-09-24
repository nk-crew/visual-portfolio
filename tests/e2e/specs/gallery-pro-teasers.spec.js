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
		'<!-- wp:visual-portfolio/item-cover {"effect":"caption-move"} -->',
		'<!-- wp:visual-portfolio/item-title /-->',
		'<!-- /wp:visual-portfolio/item-cover -->',
		'<!-- wp:visual-portfolio/item-meta {"metaType":"album-count"} /-->',
		'<!-- wp:visual-portfolio/item-meta {"metaType":"constructor"} /-->',
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
		expect(content).toContain('"effect":"caption-move"');
		expect(content).toContain('"extensions":{"watermark":true}');
		expect(content).toContain('"extensions":{"threshold":300}');
		expect(content).toContain('"metaType":"album-count"');
	});

	test('a meta type this install lacks is shown as unavailable', async ({
		page,
		editor,
	}) => {
		test.skip(
			await page.evaluate(() => window.VPGutenbergVariables.pro),
			'Pro offers the type.'
		);

		await editor.setContent(getMarkup(images));

		// A name every object inherits is no type either.
		await expect(
			editor.canvas
				.getByText('Unavailable meta: constructor')
				.filter({ visible: true })
				.first()
		).toBeVisible();

		// Not as comments, which the page would not print either.
		await expect(
			editor.canvas
				.getByText('Unavailable meta: album-count')
				.filter({ visible: true })
				.first()
		).toBeVisible();
		await expect(
			editor.canvas.locator('.wp-block-visual-portfolio-item-meta', {
				hasText: /Comment/,
			})
		).toHaveCount(0);
	});

	test('the gallery manager offers a format an extension adds', async ({
		page,
		editor,
	}) => {
		await editor.setContent(getMarkup(images));

		const [loop] = await editor.getBlocks({ full: true });

		await page.evaluate(() =>
			window.wp.hooks.addFilter(
				'vpf.loopImageFormats',
				'e2e/gallery-format',
				(options) => [
					...options,
					{ label: 'Gallery', value: 'gallery' },
				]
			)
		);
		await page.evaluate(
			(id) =>
				window.wp.data.dispatch('core/block-editor').selectBlock(id),
			loop.clientId
		);
		await editor.openDocumentSettingsSidebar();
		await page
			.locator('.vpf-gallery-manager .vpf-gallery-manager__preview')
			.first()
			.click();

		const format = page
			.getByRole('dialog', { name: 'Image Settings' })
			.getByRole('combobox', { name: 'Format' });

		await expect(format.locator('option[value="gallery"]')).toHaveText(
			'Gallery'
		);

		await format.selectOption('gallery');

		await expect
			.poll(async () => {
				const [block] = await editor.getBlocks();

				return block.attributes.imagesQuery.images[0].format;
			})
			.toBe('gallery');
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
		await expect(
			page.getByRole('menuitemcheckbox', {
				name: 'Right-click Protection (Pro)',
			})
		).toBeVisible();
		await page
			.getByRole('menuitemcheckbox', {
				name: 'Password Protection (Pro)',
			})
			.click();
		await page.keyboard.press('Escape');

		await expect(
			protection.getByRole('link', { name: /Go Pro/ })
		).toHaveAttribute('href', /utm_campaign=teaser_protection_password/);

		// A teaser in a list the cover shares with Pro stays picked when the
		// block draws again.
		const cover = blocks[0].innerBlocks[0].innerBlocks[1].clientId;

		await page.evaluate(
			(id) =>
				window.wp.data.dispatch('core/block-editor').selectBlock(id),
			cover
		);

		const settings = page.locator('.components-tools-panel', {
			has: page.getByRole('heading', { name: 'Settings' }),
		});

		await settings.getByRole('button', { name: /options/i }).click();
		await page
			.getByRole('menuitemcheckbox', { name: 'Move under image (Pro)' })
			.click();
		await page.keyboard.press('Escape');
		await page.evaluate(
			(id) =>
				window.wp.data
					.dispatch('core/block-editor')
					.updateBlockAttributes(id, { minHeight: '200px' }),
			cover
		);

		await expect(
			settings.getByText('Draw the content below the picture')
		).toBeVisible();

		// Quick View is a click action of Pro's, offered and not chosen.
		const quickView = settings
			.getByRole('combobox', { name: 'On click' })
			.locator('option', { hasText: 'Quick View (Pro)' });

		await expect(quickView).toHaveCount(1);
		await expect(quickView).toBeDisabled();
	});

	test('without Pro, the picture blocks name the Pro image effects', async ({
		page,
		editor,
	}) => {
		test.skip(
			await page.evaluate(() => window.VPGutenbergVariables.pro),
			'Pro draws its own settings.'
		);

		await editor.setContent(getMarkup(images));

		const blocks = await editor.getBlocks({ full: true });
		const [image, cover] = blocks[0].innerBlocks[0].innerBlocks;
		const settings = page.locator('.components-tools-panel', {
			has: page.getByRole('heading', { name: 'Settings' }),
		});
		const imageEffects = [
			'Image filter (Pro)',
			'Hover transform (Pro)',
			'Blend mode (Pro)',
			'Tilt (Pro)',
		];

		for (const { clientId } of [image, cover]) {
			await page.evaluate(
				(id) =>
					window.wp.data
						.dispatch('core/block-editor')
						.selectBlock(id),
				clientId
			);
			await settings.getByRole('button', { name: /options/i }).click();

			for (const name of imageEffects) {
				await expect(
					page.getByRole('menuitemcheckbox', { name })
				).toBeVisible();
			}

			// The skew belongs to the emerge effect, and the cover is saved
			// with another one.
			await expect(
				page.getByRole('menuitemcheckbox', { name: 'Skew (Pro)' })
			).toHaveCount(0);
			await page.keyboard.press('Escape');
		}

		// The cover's effect list names Caption move, and cannot pick it.
		const captionMove = settings
			.getByRole('combobox', { name: 'Effect' })
			.locator('option[value="caption-move"]');

		await expect(captionMove).toHaveText('Caption move (Pro)');
		await expect(captionMove).toBeDisabled();

		// A Pro effect this install lacks is drawn as a fade, as on the page.
		await expect(
			editor.canvas
				.locator('.wp-block-visual-portfolio-item-cover')
				.first()
		).toHaveClass(/\bvp-effect-fade\b/);

		await page.evaluate(
			(id) =>
				window.wp.data
					.dispatch('core/block-editor')
					.updateBlockAttributes(id, { effect: 'emerge' }),
			cover.clientId
		);
		await settings.getByRole('button', { name: /options/i }).click();
		await expect(
			page.getByRole('menuitemcheckbox', { name: 'Skew (Pro)' })
		).toBeVisible();
	});
});
