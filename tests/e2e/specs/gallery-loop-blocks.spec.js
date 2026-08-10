/**
 * Gallery Loop blocks: filter, sort and pagination.
 *
 * These blocks read the query from the loop context and resolve their links and
 * page counts on every request, so the assertions here deliberately check the
 * frontend markup rather than what the editor stored.
 */
import { expect, test } from '@wordpress/e2e-test-utils-playwright';

import { createRegularPosts } from '../utils/create-posts';
import { openPublishedPage } from '../utils/open-published-page';
import { getPluginSlug } from '../utils/plugin-slug';

const PER_PAGE = 3;
const POSTS_COUNT = 7;
const CATEGORIES = ['Loop Nature', 'Loop City'];

/**
 * Build a Gallery Loop block with the given pagination children.
 *
 * @param {Array} paginationBlocks - inner blocks of the pagination block.
 * @return {Object} block payload for `editor.insertBlock()`.
 */
function getLoopBlock(paginationBlocks) {
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
			{ name: 'visual-portfolio/filter-by-category' },
			{
				name: 'visual-portfolio/block',
				attributes: { setup_wizard: 'false' },
			},
			{
				name: 'visual-portfolio/pagination',
				innerBlocks: paginationBlocks,
			},
		],
	};
}

const PAGED_PAGINATION = [
	{ name: 'visual-portfolio/pagination-previous' },
	{ name: 'visual-portfolio/pagination-numbers' },
	{ name: 'visual-portfolio/pagination-next' },
];

test.describe('Gallery Loop blocks', () => {
	test.beforeAll(async ({ requestUtils }) => {
		await requestUtils.activatePlugin(getPluginSlug());
		await requestUtils.deleteAllPosts();

		await createRegularPosts({
			requestUtils,
			count: POSTS_COUNT,
			categories: CATEGORIES,
		});
	});

	test.afterAll(async ({ requestUtils }) => {
		await Promise.all([
			requestUtils.deleteAllPages(),
			requestUtils.deleteAllPosts(),
		]);
	});

	test('filter items are fetched when the loop is inserted', async ({
		admin,
		editor,
	}) => {
		await admin.createNewPost({
			title: 'Gallery Loop - filter items',
			postType: 'page',
			showWelcomeGuide: false,
			legacyCanvas: true,
		});

		await editor.insertBlock(getLoopBlock(PAGED_PAGINATION));

		// The filter block asks the REST API for the terms behind the query, so
		// a freshly inserted loop must end up with more than just the "All" item.
		await expect
			.poll(async () => getFilterItemCount(await editor.getBlocks()), {
				timeout: 20000,
			})
			.toBe(CATEGORIES.length + 1);
	});

	test('category links point at the published page and filter its items', async ({
		page,
		admin,
		editor,
	}) => {
		await admin.createNewPost({
			title: 'Gallery Loop - filtering',
			postType: 'page',
			showWelcomeGuide: false,
			legacyCanvas: true,
		});

		await editor.insertBlock(getLoopBlock(PAGED_PAGINATION));
		await editor.publishPost();

		const frontend = await openPublishedPage(page);
		const pageUrl = new URL(frontend.url());

		const items = frontend.locator('.vp-block-filter-by-category-item');
		await expect(items.first()).toBeVisible();

		// "All" is rendered as a non-link span while it is the active item.
		await expect(
			frontend.locator('span.vp-block-filter-by-category-item.is-active')
		).toHaveCount(1);

		// Only the categories are links while "All" is active.
		const categoryLink = frontend
			.locator('a.vp-block-filter-by-category-item')
			.first();
		const href = await categoryLink.getAttribute('href');
		const label = (await categoryLink.innerText()).trim();

		// The URL is built at render time from the page being viewed, and posts
		// are filtered by `taxonomy:slug`.
		expect(href).toContain(pageUrl.pathname);
		expect(href).toContain('vp_filter=category%3A');

		await categoryLink.click();

		// The filter markup is replaced with the one of the filtered page, where
		// the clicked category became the active item.
		await expect(
			frontend.locator('span.vp-block-filter-by-category-item.is-active')
		).toHaveText(label, { timeout: 15000 });
	});

	test('paged pagination walks the pages and hides its edge links', async ({
		page,
		admin,
		editor,
	}) => {
		await admin.createNewPost({
			title: 'Gallery Loop - paged',
			postType: 'page',
			showWelcomeGuide: false,
			legacyCanvas: true,
		});

		await editor.insertBlock(getLoopBlock(PAGED_PAGINATION));
		await editor.publishPost();

		const frontend = await openPublishedPage(page);

		const expectedPages = Math.ceil(POSTS_COUNT / PER_PAGE);
		const numbers = frontend.locator('.vp-block-pagination-numbers > *');

		await expect(numbers.first()).toBeVisible();
		await expect(numbers).toHaveCount(expectedPages);

		// No "previous" link on the first page.
		await expect(
			frontend.locator('.vp-block-pagination-previous')
		).toHaveCount(0);

		await frontend.locator('.vp-block-pagination-next').click();

		// The pagination markup is replaced with the one of the loaded page.
		await expect(
			frontend.locator('.vp-block-pagination-previous')
		).toHaveCount(1);

		// Walk to the last page - "next" must be gone there.
		for (let i = 2; i < expectedPages; i++) {
			await frontend.locator('.vp-block-pagination-next').click();
			await expect(
				frontend.locator('.vp-block-pagination-numbers .is-active')
			).toHaveText(String(i + 1));
		}

		await expect(frontend.locator('.vp-block-pagination-next')).toHaveCount(
			0
		);
	});

	test('load more disappears once the last page is loaded', async ({
		page,
		admin,
		editor,
	}) => {
		await admin.createNewPost({
			title: 'Gallery Loop - load more',
			postType: 'page',
			showWelcomeGuide: false,
			legacyCanvas: true,
		});

		await editor.insertBlock(
			getLoopBlock([{ name: 'visual-portfolio/pagination-load-more' }])
		);
		await editor.publishPost();

		const frontend = await openPublishedPage(page);

		const loadMore = frontend.locator('.vp-block-pagination-load-more');
		const items = frontend.locator('.vp-portfolio__item');

		await expect(loadMore).toHaveCount(1);
		await expect(items).toHaveCount(PER_PAGE);

		const clicks = Math.ceil(POSTS_COUNT / PER_PAGE) - 1;

		for (let i = 1; i <= clicks; i++) {
			await loadMore.click();

			await expect(items).toHaveCount(
				Math.min(POSTS_COUNT, PER_PAGE * (i + 1))
			);
		}

		// Everything is loaded, so there is nothing left to click.
		await expect(loadMore).toHaveCount(0);
	});

	test('page count follows the content without re-saving the page', async ({
		page,
		admin,
		editor,
		requestUtils,
	}) => {
		await admin.createNewPost({
			title: 'Gallery Loop - stale max pages',
			postType: 'page',
			showWelcomeGuide: false,
			legacyCanvas: true,
		});

		await editor.insertBlock(getLoopBlock(PAGED_PAGINATION));
		await editor.publishPost();

		const frontend = await openPublishedPage(page);
		const publishedUrl = frontend.url();

		const numbers = frontend.locator('.vp-block-pagination-numbers > *');
		await expect(numbers).toHaveCount(Math.ceil(POSTS_COUNT / PER_PAGE));

		// Publishing more posts must add a page, even though the page itself was
		// not touched - the count is calculated per request, not stored.
		await createRegularPosts({ requestUtils, count: PER_PAGE });

		await frontend.goto(publishedUrl);

		await expect(numbers).toHaveCount(
			Math.ceil((POSTS_COUNT + PER_PAGE) / PER_PAGE)
		);
	});
});

/**
 * Count the filter items inside the inserted loop block.
 *
 * @param {Array} blocks - editor blocks.
 * @return {number} number of filter items.
 */
function getFilterItemCount(blocks) {
	const loop = blocks.find((block) => 'visual-portfolio/loop' === block.name);
	const filter = loop?.innerBlocks?.find(
		(block) => 'visual-portfolio/filter-by-category' === block.name
	);

	return filter?.innerBlocks?.length ?? 0;
}
