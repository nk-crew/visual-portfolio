/**
 * Gallery Loop: setting up a new loop.
 *
 * An empty loop asks for a source, then for a filter, the lightbox and the
 * pagination, and then starts blank or from a pattern. What it asked has to
 * end up in the inner blocks either way.
 */
import { expect, test } from '@wordpress/e2e-test-utils-playwright';

import { getPluginSlug } from '../utils/plugin-slug';

const PREFIX = 'visual-portfolio/';

/**
 * The shape of a block tree: names without the namespace, with the inner
 * blocks of the containers.
 *
 * The items of a filter are replaced by the terms it fetches, as many as the
 * site has, so a filter counts as holding items of one kind.
 *
 * @param {Array} blocks - editor blocks.
 * @return {Array} names, and `[ name, children ]` for a block with children.
 */
function getShape(blocks) {
	return blocks.map(({ name, innerBlocks }) => {
		const short = name.replace(PREFIX, '');

		if ('loop-filter' === short) {
			return [
				short,
				[...new Set(innerBlocks.map((block) => block.name))].map(
					(child) => child.replace(PREFIX, '')
				),
			];
		}

		return innerBlocks.length ? [short, getShape(innerBlocks)] : short;
	});
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

test.describe('Gallery Loop setup', () => {
	test.beforeAll(async ({ requestUtils }) => {
		await requestUtils.activatePlugin(getPluginSlug());
	});

	test.beforeEach(async ({ admin, editor }) => {
		await admin.createNewPost({
			title: 'Gallery Loop - setup',
			postType: 'page',
			showWelcomeGuide: false,
			legacyCanvas: true,
		});

		await editor.insertBlock({ name: 'visual-portfolio/loop' });

		await editor.canvas
			.getByRole('button', { name: 'Posts', exact: true })
			.click();
	});

	test('Start blank builds the loop the choices describe', async ({
		editor,
	}) => {
		const { canvas } = editor;

		await canvas.getByRole('checkbox', { name: 'Filter' }).check();
		await canvas
			.getByRole('checkbox', { name: 'Open in a lightbox' })
			.uncheck();
		await canvas
			.getByRole('combobox', { name: 'Pagination' })
			.selectOption('load-more');
		await canvas.getByRole('button', { name: 'Start blank' }).click();

		const [loop] = await editor.getBlocks();

		expect(loop.attributes.queryType).toBe('posts');
		expect(getShape(loop.innerBlocks)).toEqual([
			['loop-filter', ['loop-filter-item']],
			['item-template', ['item-image', 'item-title']],
			['loop-no-results', ['core/paragraph']],
			[
				'loop-pagination',
				[
					'loop-pagination-trigger',
					['loop-pagination-end', ['core/paragraph']],
				],
			],
		]);
		// Without the lightbox a picture of a post links to the post.
		expect(getClickActions(loop.innerBlocks)).toEqual(['url']);
	});

	test('a pattern is applied with the choices', async ({ editor, page }) => {
		const { canvas } = editor;

		await canvas.getByRole('checkbox', { name: 'Filter' }).check();
		await canvas
			.getByRole('combobox', { name: 'Pagination' })
			.selectOption('infinite');
		await canvas.getByRole('button', { name: 'Choose a gallery' }).click();

		const chooser = page.getByRole('dialog', { name: 'Choose a gallery' });

		await chooser
			.getByRole('option', { name: 'Paged Posts Grid', exact: true })
			.click();

		await expect(chooser).toHaveCount(0);

		const [loop] = await editor.getBlocks();

		expect(loop.attributes.queryType).toBe('posts');
		expect(loop.attributes.metadata).toMatchObject({
			patternName: 'visual-portfolio/gallery-posts-paged',
		});
		// The pattern's own blocks, with the filter the choices asked for put
		// in front and its page numbers traded for the infinite trigger.
		expect(getShape(loop.innerBlocks)).toEqual([
			['loop-filter', ['loop-filter-item']],
			['item-template', ['item-image', 'item-title', 'item-date']],
			['loop-no-results', ['core/paragraph']],
			[
				'loop-pagination',
				[
					'loop-pagination-trigger',
					['loop-pagination-end', ['core/paragraph']],
				],
			],
		]);

		const pagination = loop.innerBlocks[3];

		expect(pagination.innerBlocks[0].attributes.triggerType).toBe(
			'infinite'
		);
		// The lightbox is on by default and takes the click of the picture.
		expect(getClickActions(loop.innerBlocks)).toEqual(['popup']);
		expect(loop.innerBlocks[1].attributes).toMatchObject({
			layoutType: 'grid',
			layoutColumnCount: 3,
		});
	});
});
