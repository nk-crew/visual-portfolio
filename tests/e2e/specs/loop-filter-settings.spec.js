/**
 * The settings of the Gallery Filter block in the free plugin: its label and
 * order on the page, and where it points at the settings Pro adds.
 */
import { expect, test } from '@wordpress/e2e-test-utils-playwright';

import { createRegularPosts } from '../utils/create-posts';
import { openPublishedPage } from '../utils/open-published-page';
import { getPluginSlug } from '../utils/plugin-slug';

const CATEGORIES = ['Settings Zebra', 'Settings Apple'];

/**
 * A Gallery Loop of posts with one filter.
 *
 * @param {Object} filterAttributes - attributes of the filter block.
 *
 * @return {Object} block payload for `editor.insertBlock()`.
 */
function getLoopBlock(filterAttributes) {
	return {
		name: 'visual-portfolio/loop',
		attributes: {
			queryType: 'posts',
			baseQuery: { perPage: 10 },
			postsQuery: { source: 'post' },
		},
		innerBlocks: [
			{
				name: 'visual-portfolio/loop-filter',
				attributes: filterAttributes,
			},
			{
				name: 'visual-portfolio/item-template',
				innerBlocks: [{ name: 'visual-portfolio/item-title' }],
			},
		],
	};
}

test.describe('Gallery Filter settings', () => {
	let createdPostIds = [];

	test.beforeAll(async ({ requestUtils }) => {
		await requestUtils.activatePlugin(getPluginSlug());

		createdPostIds = await createRegularPosts({
			requestUtils,
			count: 4,
			categories: CATEGORIES,
		});
	});

	test.afterAll(async ({ requestUtils }) => {
		await requestUtils.deleteAllPages();

		await Promise.all(
			createdPostIds.map((id) =>
				requestUtils.rest({
					path: `/wp/v2/posts/${id}`,
					method: 'DELETE',
					params: { force: true },
				})
			)
		);
	});

	test.beforeEach(async ({ admin }) => {
		await admin.createNewPost({
			title: 'Gallery Filter - settings',
			postType: 'page',
			showWelcomeGuide: false,
			legacyCanvas: true,
		});
	});

	test('the label names a dropdown and the order sorts its terms', async ({
		editor,
		page,
	}) => {
		await editor.insertBlock(
			getLoopBlock({
				displayAsDropdown: true,
				showAllItem: false,
				label: 'Theme',
				order: 'name',
			})
		);
		await editor.publishPost();

		const frontend = await openPublishedPage(page);
		const select = frontend.getByRole('combobox', { name: 'Theme' });

		await expect(select).toBeVisible();

		const options = await select
			.locator('option')
			.evaluateAll((nodes) => nodes.map((node) => node.textContent));

		expect(options[0]).toBe('Theme');
		expect(options.indexOf('Settings Apple')).toBeGreaterThan(0);
		expect(options.indexOf('Settings Apple')).toBeLessThan(
			options.indexOf('Settings Zebra')
		);
	});

	test('a filter sorted by name keeps its items where the order puts them', async ({
		editor,
		page,
	}) => {
		await editor.insertBlock(getLoopBlock({ order: 'name' }));

		const filterItems = editor.canvas.locator(
			'[data-type="visual-portfolio/loop-filter-item"]'
		);

		await expect(filterItems.first()).toBeVisible();

		const movable = await page.evaluate(() => {
			const { getBlocksByName, canMoveBlock } =
				window.wp.data.select('core/block-editor');

			return getBlocksByName('visual-portfolio/loop-filter-item').map(
				(clientId) => canMoveBlock(clientId)
			);
		});

		expect(movable.length).toBeGreaterThan(0);
		expect(movable).not.toContain(true);
	});

	test('a filter set up in Pro keeps its items in the editor and shows nothing on the page', async ({
		editor,
		page,
	}) => {
		test.skip(
			await page.evaluate(() => window.VPGutenbergVariables.pro),
			'Pro draws the filter itself.'
		);

		const block = getLoopBlock({
			extensions: { facet: { by: 'category', multiple: true } },
		});

		block.innerBlocks[0].innerBlocks = [
			{
				name: 'visual-portfolio/loop-filter-item',
				attributes: { text: 'Kept label', filter: 'kept' },
			},
		];

		await editor.insertBlock(block);
		await editor.publishPost();

		// Without Pro the editor adds no default terms to the saved items.
		await expect(
			editor.canvas.locator(
				'[data-type="visual-portfolio/loop-filter-item"]'
			)
		).toHaveText(['Kept label']);

		const frontend = await openPublishedPage(page);

		await expect(
			frontend.locator('.wp-block-visual-portfolio-item-title').first()
		).toBeVisible();
		await expect(frontend.locator('.vp-block-loop-filter')).toHaveCount(0);
	});

	test('the Settings panel lists the Pro settings in its menu only', async ({
		editor,
		page,
	}) => {
		test.skip(
			await page.evaluate(() => window.VPGutenbergVariables.pro),
			'Pro draws the real settings.'
		);

		await editor.insertBlock(getLoopBlock({}));
		await editor.selectBlocks(
			editor.canvas.locator('[data-type="visual-portfolio/loop-filter"]')
		);
		await editor.openDocumentSettingsSidebar();

		const sidebar = page.getByRole('region', { name: 'Editor settings' });

		await expect(sidebar.getByText('Filter by (Pro)')).toHaveCount(0);

		await sidebar.getByRole('button', { name: 'Settings options' }).click();

		const menu = page.getByRole('menu');

		await expect(
			menu.getByRole('menuitemcheckbox', { name: /\(Pro\)/ })
		).toHaveText([
			/Filter by \(Pro\)/,
			/Several terms \(Pro\)/,
			/Child terms \(Pro\)/,
			/Hide empty terms \(Pro\)/,
		]);

		await menu
			.getByRole('menuitemcheckbox', { name: /Several terms \(Pro\)/ })
			.click();
		await page.keyboard.press('Escape');

		const teaser = sidebar.locator('.vpf-pro-teaser');

		await expect(teaser).toContainText(
			'Let visitors choose more than one term at a time.'
		);
		await expect(
			teaser.getByRole('link', { name: /Go Pro/ })
		).toHaveAttribute('href', /utm_campaign=teaser_loop_filter_selection/);
	});
});
