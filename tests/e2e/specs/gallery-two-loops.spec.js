/**
 * Two Gallery Loops on one page.
 *
 * Every loop owns its URL parameters (`vp-{queryId}-page` and friends), which is
 * the whole point of naming them after the block: paging or filtering one
 * gallery has to leave the other one exactly where the visitor left it.
 */
import { expect, test } from '@wordpress/e2e-test-utils-playwright';

import { createRegularPosts } from '../utils/create-posts';
import { getLoopParams } from '../utils/loop-query-params';
import { openPublishedPage } from '../utils/open-published-page';
import { getPluginSlug } from '../utils/plugin-slug';

const PER_PAGE = 2;
const POSTS_COUNT = 6;
const CATEGORIES = ['Two Loops Nature', 'Two Loops City'];

const LOOP = '.vp-block-loop';
const ITEM = '.wp-block-visual-portfolio-item-template__item';
const TITLE = '.wp-block-visual-portfolio-item-title';

/**
 * Build a Gallery Loop with a filter and numbered pagination.
 *
 * The two loops of a test are identical on purpose: same query, same page size,
 * same controls. Anything that tells them apart at render time has to come from
 * the query id.
 *
 * @return {Object} block payload for `editor.insertBlock()`.
 */
function getLoopBlock() {
	return {
		name: 'visual-portfolio/loop',
		attributes: {
			queryType: 'posts',
			baseQuery: { perPage: PER_PAGE, maxPages: 1 },
			postsQuery: {
				source: 'post',
				order: 'desc',
				orderBy: 'post_date',
			},
		},
		innerBlocks: [
			{ name: 'visual-portfolio/loop-filter' },
			{
				name: 'visual-portfolio/item-template',
				innerBlocks: [{ name: 'visual-portfolio/item-title' }],
			},
			{
				name: 'visual-portfolio/loop-pagination',
				innerBlocks: [
					{ name: 'visual-portfolio/loop-pagination-numbers' },
				],
			},
		],
	};
}

test.describe('Two Gallery Loops on one page', () => {
	let createdPostIds = [];

	test.beforeAll(async ({ requestUtils }) => {
		await requestUtils.activatePlugin(getPluginSlug());

		createdPostIds = await createRegularPosts({
			requestUtils,
			count: POSTS_COUNT,
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

	test.beforeEach(async ({ admin, editor }) => {
		await admin.createNewPost({
			title: 'Gallery Loop - two loops',
			postType: 'page',
			showWelcomeGuide: false,
			legacyCanvas: true,
		});

		await editor.insertBlock(getLoopBlock());
		await editor.insertBlock(getLoopBlock());
		await editor.publishPost();
	});

	test('the two loops are given parameters of their own', async ({
		page,
	}) => {
		const frontend = await openPublishedPage(page);
		const loops = frontend.locator(LOOP);

		await expect(loops).toHaveCount(2);

		// Every pagination link names the loop it belongs to, and the two loops
		// never name the same one.
		const pageParams = await frontend
			.locator(`${LOOP} .vp-block-loop-pagination-numbers a`)
			.evaluateAll((links) =>
				links.map((link) => {
					const found = [
						...new URL(link.href).searchParams.keys(),
					].filter((name) => /^vp-\d+-page$/.test(name));

					return found.join(',');
				})
			);

		expect(pageParams.length).toBeGreaterThan(1);

		const names = [...new Set(pageParams)];

		expect(names).toHaveLength(2);
		expect(names).not.toContain('');
	});

	test('paging one loop leaves the other one alone', async ({ page }) => {
		const frontend = await openPublishedPage(page);

		const first = frontend.locator(LOOP).nth(0);
		const second = frontend.locator(LOOP).nth(1);

		const firstTitles = first.locator(`${ITEM} ${TITLE}`);
		const secondTitles = second.locator(`${ITEM} ${TITLE}`);

		await expect(firstTitles).toHaveCount(PER_PAGE);
		await expect(secondTitles).toHaveCount(PER_PAGE);

		const beforeFirst = await firstTitles.allInnerTexts();
		const beforeSecond = await secondTitles.allInnerTexts();

		// Both loops start on the same items - they run the same query.
		expect(beforeFirst).toEqual(beforeSecond);

		await first
			.locator('.vp-block-loop-pagination-numbers a[aria-label="Page 2"]')
			.click();

		await expect
			.poll(() => firstTitles.allInnerTexts())
			.not.toEqual(beforeFirst);

		// The one that matters: the second gallery was never asked to move.
		expect(await secondTitles.allInnerTexts()).toEqual(beforeSecond);

		// Exactly one loop is paged, and the URL says which.
		const paged = getLoopParams(frontend.url(), 'page');

		expect(paged).toHaveLength(1);
		expect(paged[0][1]).toBe('2');

		// The URL is the whole state: a visitor who opens it sees the same thing.
		await frontend.reload();

		expect(await firstTitles.allInnerTexts()).not.toEqual(beforeFirst);
		expect(await secondTitles.allInnerTexts()).toEqual(beforeSecond);
	});

	test('filtering one loop leaves the other one unfiltered', async ({
		page,
	}) => {
		const frontend = await openPublishedPage(page);

		const first = frontend.locator(LOOP).nth(0);
		const second = frontend.locator(LOOP).nth(1);

		const categoryLink = first
			.locator('a.vp-block-loop-filter-item')
			.first();

		const label = (await categoryLink.innerText()).trim();

		await categoryLink.click();

		// The clicked category became the active item of the first loop only.
		await expect(
			first.locator('span.vp-block-loop-filter-item.is-active')
		).toHaveText(label, { timeout: 15000 });

		await expect(
			second.locator('span.vp-block-loop-filter-item.is-active')
		).toHaveText('All');

		expect(getLoopParams(frontend.url(), 'filter')).toHaveLength(1);
	});

	test('each loop announces and marks its own state', async ({ page }) => {
		const frontend = await openPublishedPage(page);

		const first = frontend.locator(LOOP).nth(0);
		const second = frontend.locator(LOOP).nth(1);

		// One live region per loop, so an update is announced once.
		await expect(
			frontend.locator(
				'.wp-block-visual-portfolio-item-template__live-region[aria-live="polite"]'
			)
		).toHaveCount(2);

		// The current page and the active filter of a loop are marked as such,
		// and the state of one loop is never announced on the other.
		await expect(
			first.locator(
				'.vp-block-loop-pagination-numbers [aria-current="page"]'
			)
		).toHaveText('1');

		await first
			.locator('.vp-block-loop-pagination-numbers a[aria-label="Page 2"]')
			.click();

		await expect(
			first.locator(
				'.vp-block-loop-pagination-numbers [aria-current="page"]'
			)
		).toHaveText('2');

		await expect(
			second.locator(
				'.vp-block-loop-pagination-numbers [aria-current="page"]'
			)
		).toHaveText('1');

		await expect(
			second.locator('span.vp-block-loop-filter-item.is-active')
		).toHaveAttribute('aria-current', 'page');
	});
});
