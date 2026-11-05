/**
 * Gallery Loop: setting up a new loop.
 *
 * An empty loop asks for its images, or another source, and then for a
 * layout previewed with that content. What the layout carries, set for the
 * source, ends up in the inner blocks.
 */
import { expect, test } from '@wordpress/e2e-test-utils-playwright';

import { getFixturePath } from '../utils/fixture-path';
import { getPluginSlug } from '../utils/plugin-slug';

const PREFIX = 'visual-portfolio/';

/**
 * The names of a block tree, without the namespace and without the blocks
 * inside the item template and the pagination.
 *
 * @param {Array} blocks - editor blocks.
 * @return {string[]} names.
 */
function getNames(blocks) {
	return blocks.map(({ name }) => name.replace(PREFIX, ''));
}

/**
 * The click action of every item picture in a tree.
 *
 * @param {Array} blocks - editor blocks.
 * @return {string[]} click actions.
 */
function getClickActions(blocks) {
	return blocks.flatMap(({ name, attributes, innerBlocks }) => [
		...('visual-portfolio/item-image' === name
			? [attributes.clickAction]
			: []),
		...getClickActions(innerBlocks),
	]);
}

/**
 * Open the layouts of this plugin in the Patterns tab of the inserter.
 *
 * @param {Object} page - Playwright page.
 * @return {Promise<void>} resolves once they are listed.
 */
async function openLayoutPatterns(page) {
	await page.evaluate(() =>
		window.wp.data
			.dispatch('core/editor')
			.setIsInserterOpened({ tab: 'patterns' })
	);
	await page.locator('button', { hasText: /^Visual Portfolio$/ }).click();
}

/**
 * Check the first loop of the post can be edited as ordinary blocks.
 *
 * @param {Object} editor - editor utils.
 * @param {Object} page   - Playwright page.
 * @return {Promise<void>} resolves once checked.
 */
async function expectUnlocked(editor, page) {
	await expect
		.poll(async () => (await editor.getBlocks())[0].attributes.metadata)
		.not.toHaveProperty('patternName');

	const mode = await page.evaluate(() => {
		const { getBlocks, getBlockEditingMode } =
			window.wp.data.select('core/block-editor');
		const [template] = getBlocks()[0].innerBlocks;

		return getBlockEditingMode(template.clientId);
	});

	expect(mode).toBe('default');
	await expect(
		page.getByRole('button', { name: 'Edit pattern' })
	).toHaveCount(0);
}

test.describe('Gallery Loop setup', () => {
	const uploaded = [];

	test.beforeAll(async ({ requestUtils }) => {
		await requestUtils.activatePlugin(getPluginSlug());
	});

	test.afterAll(async ({ requestUtils }) => {
		await Promise.all(
			uploaded.map((id) =>
				requestUtils.rest({
					path: `/wp/v2/media/${id}`,
					method: 'DELETE',
					params: { force: true },
				})
			)
		);
	});

	test.beforeEach(async ({ admin, editor }) => {
		await admin.createNewPost({
			title: 'Gallery Loop - setup',
			postType: 'page',
			showWelcomeGuide: false,
			legacyCanvas: true,
		});

		await editor.insertBlock({ name: 'visual-portfolio/loop' });
	});

	test('uploaded images become the gallery of the layout picked', async ({
		editor,
	}) => {
		const { canvas } = editor;

		await expect(
			canvas.locator('.vpf-loop-start .components-placeholder')
		).toContainText('Add images');

		await canvas
			.locator('.vpf-loop-start input[type="file"]')
			.setInputFiles([
				getFixturePath('image-1600x1200.jpeg'),
				getFixturePath('image-2000x2000.jpeg'),
			]);

		await expect(
			canvas.getByRole('heading', { name: 'Choose a layout' })
		).toBeVisible();
		// Each image joins the gallery once the server has saved it.
		await expect
			.poll(
				async () =>
					(await editor.getBlocks())[0].attributes.imagesQuery.images
						.length,
				{ timeout: 20000 }
			)
			.toBe(2);

		const [{ attributes: added }] = await editor.getBlocks();

		uploaded.push(...added.imagesQuery.images.map(({ id }) => id));

		await canvas
			.getByRole('option', { name: 'Masonry Clean', exact: true })
			.click();

		const [loop] = await editor.getBlocks();

		expect(loop.attributes.queryType).toBe('images');
		expect(loop.attributes.metadata).toMatchObject({
			name: 'Masonry Clean',
		});
		// A gallery of images shows all of them on one page, and a picture
		// opens larger.
		expect(loop.attributes.baseQuery.perPage).toBe(-1);
		expect(getNames(loop.innerBlocks)).not.toContain('loop-pagination');
		expect(getClickActions(loop.innerBlocks)).toEqual(['popup']);
	});

	test('another source picks from every layout, and changes it later', async ({
		editor,
		page,
	}) => {
		const { canvas } = editor;

		await canvas.getByRole('button', { name: 'Other sources' }).click();
		await page.getByRole('menuitem', { name: /^Posts/ }).click();

		await canvas.getByRole('button', { name: 'All layouts' }).click();

		const chooser = page.getByRole('dialog', { name: 'Choose a layout' });

		await chooser
			.getByRole('option', { name: 'Paged Posts Grid', exact: true })
			.click();

		await expect(chooser).toHaveCount(0);

		let [loop] = await editor.getBlocks();

		expect(loop.attributes.queryType).toBe('posts');
		expect(loop.attributes.metadata).toMatchObject({
			name: 'Paged Posts Grid',
		});
		// Posts keep what the layout carries, and a picture opens its post.
		expect(getNames(loop.innerBlocks)).toContain('loop-pagination');
		expect(getClickActions(loop.innerBlocks)).toEqual(['url']);

		await editor.selectBlocks(canvas.locator('.vp-block-loop').first());
		await page
			.getByRole('toolbar', { name: 'Block tools' })
			.getByRole('button', { name: 'Change layout' })
			.click();
		await chooser
			.getByRole('option', { name: 'Posts Cards', exact: true })
			.click();

		[loop] = await editor.getBlocks();

		expect(loop.attributes.queryType).toBe('posts');
		expect(loop.attributes.metadata).toMatchObject({
			name: 'Posts Cards',
		});
		expect(getNames(loop.innerBlocks)).not.toContain('loop-pagination');
	});

	test('a layout picked in the chooser is not locked', async ({
		editor,
		page,
	}) => {
		const { canvas } = editor;

		await canvas.getByRole('button', { name: 'Other sources' }).click();
		await page.getByRole('menuitem', { name: /^Posts/ }).click();
		await canvas
			.getByRole('option', { name: 'Posts Cards', exact: true })
			.click();

		await expectUnlocked(editor, page);
	});

	test('a layout inserted as a pattern is not locked', async ({
		editor,
		page,
	}) => {
		await page.evaluate(() =>
			window.wp.data.dispatch('core/block-editor').resetBlocks([])
		);

		await openLayoutPatterns(page);
		await page
			.getByRole('option', { name: 'Tiles Mosaic', exact: true })
			.click();

		await expectUnlocked(editor, page);
	});

	test('a loop built by hand can change its layout', async ({
		editor,
		page,
	}) => {
		await page.evaluate(() =>
			window.wp.data.dispatch('core/block-editor').resetBlocks([])
		);
		await editor.insertBlock({
			name: 'visual-portfolio/loop',
			attributes: { queryType: 'images' },
			innerBlocks: [{ name: 'visual-portfolio/item-template' }],
		});
		await editor.selectBlocks(
			editor.canvas.locator('.vp-block-loop').first()
		);

		await page
			.getByRole('toolbar', { name: 'Block tools' })
			.getByRole('button', { name: 'Change layout' })
			.click();
		await page
			.getByRole('dialog', { name: 'Choose a layout' })
			.getByRole('option', { name: 'Tiles Mosaic', exact: true })
			.click();

		const [loop] = await editor.getBlocks();

		expect(loop.innerBlocks[0].attributes.layoutType).toBe('tiles');
	});

	test('the chooser previews the items, without the No Results text', async ({
		editor,
	}) => {
		const { canvas } = editor;

		await canvas
			.locator('.vpf-loop-start input[type="file"]')
			.setInputFiles([getFixturePath('image-1600x1200.jpeg')]);

		const preview = canvas
			.getByRole('option', { name: 'Masonry Clean', exact: true })
			.locator('iframe')
			.contentFrame();

		await expect(
			preview.locator('.wp-block-visual-portfolio-item-template__item')
		).toHaveCount(1, { timeout: 20000 });
		await expect(preview.locator('body')).not.toContainText(
			'No items were found'
		);

		const [{ attributes }] = await editor.getBlocks();

		uploaded.push(...attributes.imagesQuery.images.map(({ id }) => id));
	});

	test('the inserter previews a pattern by the shapes of its layout', async ({
		page,
	}) => {
		await openLayoutPatterns(page);

		const preview = page
			.getByRole('option', { name: 'Tiles Mosaic', exact: true })
			.locator('iframe')
			.contentFrame();

		// The pattern holds ten items and no images to fill them with.
		await expect(
			preview.locator(
				'.vp-layout-tiles > .wp-block-visual-portfolio-item-template__skeleton'
			)
		).toHaveCount(10, { timeout: 20000 });
		await expect(preview.locator('body')).not.toContainText('No results');
		await expect(preview.locator('body')).not.toContainText(
			'No items were found'
		);
	});
});
