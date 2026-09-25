/**
 * Gallery Loop: saved markup the editor accepts.
 *
 * Every loop block is saved as static markup, and a change to what one of them
 * saves turns every loop already in a post into an invalid block. The patterns
 * are that markup written by hand. So the loop blocks and the patterns are
 * inserted, saved and opened again, and the editor has to take every block
 * back as valid.
 */
import fs from 'node:fs';
import path from 'node:path';

import { expect, test } from '@wordpress/e2e-test-utils-playwright';

import { getPluginSlug } from '../utils/plugin-slug';

const PATTERN_CATEGORY = 'visual-portfolio';

// The patterns the plugin ships, by the slug in their file header. Read next
// to this spec, so it holds in the free repository and inside Pro alike.
const PATTERN_SLUGS = fs
	.readdirSync(path.join(__dirname, '../../../gutenberg/patterns'))
	.filter((file) => file.endsWith('.php'))
	.map(
		(file) =>
			fs
				.readFileSync(
					path.join(__dirname, '../../../gutenberg/patterns', file),
					'utf8'
				)
				.match(/^\s*\*\s*Slug:\s*(\S+)/m)[1]
	);

/**
 * Two loops that hold every block of the family between them. Blocks left
 * without inner blocks get the ones their editor fills in.
 */
const ALL_BLOCKS_LOOPS = [
	{
		name: 'visual-portfolio/loop',
		attributes: { queryType: 'posts' },
		innerBlocks: [
			{ name: 'visual-portfolio/loop-filter' },
			{ name: 'visual-portfolio/loop-sort' },
			{ name: 'visual-portfolio/loop-search' },
			{
				name: 'visual-portfolio/item-template',
				attributes: { layoutType: 'grid' },
				innerBlocks: [
					{ name: 'visual-portfolio/item-image' },
					{ name: 'visual-portfolio/item-title' },
					{ name: 'visual-portfolio/item-description' },
					{ name: 'visual-portfolio/item-date' },
					{ name: 'visual-portfolio/item-author' },
					{ name: 'visual-portfolio/item-categories' },
					{ name: 'visual-portfolio/item-meta' },
					{ name: 'visual-portfolio/item-read-more' },
					{ name: 'visual-portfolio/item-cover' },
				],
			},
			{ name: 'visual-portfolio/loop-no-results' },
			{
				name: 'visual-portfolio/loop-pagination',
				innerBlocks: [
					{ name: 'visual-portfolio/loop-pagination-previous' },
					{ name: 'visual-portfolio/loop-pagination-numbers' },
					{ name: 'visual-portfolio/loop-pagination-next' },
				],
			},
			{
				name: 'visual-portfolio/loop-pagination',
				innerBlocks: [
					{ name: 'visual-portfolio/loop-pagination-trigger' },
					{ name: 'visual-portfolio/loop-pagination-end' },
				],
			},
		],
	},
	{
		name: 'visual-portfolio/loop',
		attributes: { queryType: 'posts' },
		innerBlocks: [
			{
				name: 'visual-portfolio/item-template',
				attributes: { layoutType: 'carousel' },
				innerBlocks: [
					{ name: 'visual-portfolio/item-image' },
					{ name: 'visual-portfolio/loop-carousel-nav' },
				],
			},
			{
				name: 'visual-portfolio/loop-carousel-nav',
				innerBlocks: [
					{ name: 'visual-portfolio/loop-carousel-previous' },
					{ name: 'visual-portfolio/loop-carousel-next' },
					{ name: 'visual-portfolio/loop-carousel-indicator' },
					{ name: 'visual-portfolio/loop-carousel-autoplay' },
					{ name: 'visual-portfolio/loop-carousel-thumbnails' },
				],
			},
		],
	},
];

/**
 * Names of the blocks in a tree of block payloads.
 *
 * @param {Array} blocks - payloads for `editor.insertBlock()`.
 * @return {string[]} block names.
 */
function getTreeNames(blocks) {
	return blocks.flatMap((block) => [
		block.name,
		...getTreeNames(block.innerBlocks || []),
	]);
}

/**
 * What the editor holds: the name of every block, and the ones it found
 * invalid, walked through the inner blocks.
 *
 * @param {import('@playwright/test').Page} page - editor page.
 * @return {Promise<Object>} `{ names, invalid, loops }`.
 */
function readBlocks(page) {
	return page.evaluate(() => {
		const names = new Set();
		const invalid = [];
		const walk = (blocks) =>
			blocks.forEach((block) => {
				names.add(block.name);

				if (false === block.isValid) {
					invalid.push(block.name);
				}

				walk(block.innerBlocks);
			});

		const blocks = window.wp.data.select('core/block-editor').getBlocks();

		walk(blocks);

		return {
			names: [...names].sort(),
			invalid,
			loops: blocks.filter(({ name }) => 'visual-portfolio/loop' === name)
				.length,
		};
	});
}

/**
 * Names of the registered blocks of the loop family.
 *
 * @param {import('@playwright/test').Page} page - editor page.
 * @return {Promise<string[]>} block names.
 */
function getFamilyNames(page) {
	return page.evaluate(() =>
		window.wp.blocks
			.getBlockTypes()
			.map(({ name }) => name)
			.filter((name) => /^visual-portfolio\/(loop|item-)/.test(name))
			.sort()
	);
}

/**
 * Save the post and open it in the editor again, so every block is parsed
 * back from the markup it saved.
 *
 * @param {import('@playwright/test').Page} page   - editor page.
 * @param {Object}                          editor - editor fixture.
 * @param {number}                          loops  - loops the post holds.
 */
async function saveAndReopen(page, editor, loops) {
	await editor.publishPost();
	await page.reload();
	await page.waitForFunction(
		(count) =>
			window.wp?.data
				?.select('core/block-editor')
				?.getBlocks()
				.filter(({ name }) => 'visual-portfolio/loop' === name)
				.length === count,
		loops
	);
}

test.describe('Gallery Loop block validity', () => {
	let validationMessages = [];

	test.beforeAll(async ({ requestUtils }) => {
		await requestUtils.activatePlugin(getPluginSlug());
	});

	test.beforeEach(async ({ page }) => {
		validationMessages = [];

		page.on('console', (message) => {
			if (/block validation/i.test(message.text())) {
				validationMessages.push(message.text());
			}
		});
	});

	test.afterAll(async ({ requestUtils }) => {
		await requestUtils.deleteAllPages();
	});

	test('every loop pattern is saved and opened again as valid blocks', async ({
		admin,
		editor,
		page,
	}) => {
		await admin.createNewPost({
			title: 'Gallery Loop - pattern validity',
			postType: 'page',
			showWelcomeGuide: false,
			legacyCanvas: true,
		});

		const patterns = await page.evaluate(async (category) => {
			const all = await window.wp.data
				.resolveSelect('core')
				.getBlockPatterns();

			return all
				.filter((pattern) => pattern.categories?.includes(category))
				.map(({ name, content }) => ({ name, content }));
		}, PATTERN_CATEGORY);

		expect(patterns.map(({ name }) => name)).toEqual(
			expect.arrayContaining(PATTERN_SLUGS)
		);

		await page.evaluate((list) => {
			const { dispatch } = window.wp.data;

			list.forEach(({ content }) => {
				dispatch('core/block-editor').insertBlocks(
					window.wp.blocks.parse(content)
				);
			});
		}, patterns);

		const inserted = await readBlocks(page);

		expect(inserted.loops).toBe(patterns.length);
		expect(inserted.invalid).toEqual([]);

		await saveAndReopen(page, editor, patterns.length);

		expect((await readBlocks(page)).invalid).toEqual([]);
		expect(validationMessages).toEqual([]);
	});

	test('every loop block with its default inner blocks is saved and opened again as valid', async ({
		admin,
		editor,
		page,
	}) => {
		await admin.createNewPost({
			title: 'Gallery Loop - block validity',
			postType: 'page',
			showWelcomeGuide: false,
			legacyCanvas: true,
		});

		const family = await getFamilyNames(page);

		expect(family).toEqual(
			expect.arrayContaining(getTreeNames(ALL_BLOCKS_LOOPS))
		);

		for (const loop of ALL_BLOCKS_LOOPS) {
			await editor.insertBlock(loop);
		}

		// The editors of the container blocks fill in their default inner
		// blocks once they mount.
		await expect
			.poll(async () => (await readBlocks(page)).names)
			.toEqual(expect.arrayContaining(family));

		expect((await readBlocks(page)).invalid).toEqual([]);

		await saveAndReopen(page, editor, ALL_BLOCKS_LOOPS.length);

		const reopened = await readBlocks(page);

		expect(reopened.names).toEqual(expect.arrayContaining(family));
		expect(reopened.invalid).toEqual([]);
		expect(validationMessages).toEqual([]);
	});
});
