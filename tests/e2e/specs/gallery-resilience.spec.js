/**
 * Gallery Loop: what happens when the enhancement is not there.
 *
 * The contract of the family is that every control is a real link or a real
 * form resolved by the server, and the script module only replaces the page
 * load with a region swap. This spec breaks the module's half of the deal on
 * purpose - the network drops, or JavaScript is off entirely - and asserts the
 * visitor still gets where they were going. A control that does nothing is the
 * one failure mode that must never happen.
 */
import { expect, test } from '@wordpress/e2e-test-utils-playwright';

import { getLoopParam } from '../utils/loop-query-params';
import { getPluginSlug } from '../utils/plugin-slug';

const LOOP = '.vp-block-loop';
const ITEM = '.wp-block-visual-portfolio-item-template__item';
const TITLE = '.wp-block-visual-portfolio-item-title';
const SORT = '.vp-block-loop-sort';
const SORT_SUBMIT = '.vp-block-loop-sort__submit';
const NEXT = '.vp-block-loop-pagination-next';
const LOAD_MORE = '.vp-block-loop-pagination-load-more';

const PER_PAGE = 2;
const IMAGES_COUNT = 6;

/**
 * Serialized markup of one loop.
 *
 * @param {Object} options            - loop options.
 * @param {number} options.queryId    - id the URL parameters are named after.
 * @param {Array}  options.images     - images of the source.
 * @param {Array}  [options.controls] - control blocks around the item template.
 * @param {number} [options.perPage]  - items per page.
 * @return {string} serialized blocks.
 */
function getLoopMarkup({ queryId, images, controls = [], perPage = PER_PAGE }) {
	const loop = {
		block_id: `e2e-resilience-${queryId}`,
		queryId,
		queryType: 'images',
		baseQuery: { perPage, maxPages: 0 },
		imagesQuery: { images, orderBy: 'default' },
	};

	return [
		`<!-- wp:visual-portfolio/loop ${JSON.stringify(loop)} -->`,
		'<div class="wp-block-visual-portfolio-loop vp-block-loop">',
		controls.join(''),
		'<!-- wp:visual-portfolio/item-template -->',
		'<!-- wp:visual-portfolio/item-title /-->',
		'<!-- /wp:visual-portfolio/item-template -->',
		'</div>',
		'<!-- /wp:visual-portfolio/loop -->',
	].join('');
}

/**
 * A pagination block holding the given controls.
 *
 * @param {string[]} names - block names without the namespace.
 * @return {string} serialized blocks.
 */
function getPagination(names) {
	return `<!-- wp:visual-portfolio/loop-pagination -->${names
		.map((name) => `<!-- wp:visual-portfolio/${name} /-->`)
		.join('')}<!-- /wp:visual-portfolio/loop-pagination -->`;
}

/**
 * Titles currently rendered by a loop.
 *
 * @param {Object} scope - Playwright locator of the loop.
 * @return {Promise<string[]>} item titles.
 */
function getTitles(scope) {
	return scope.locator(`${ITEM} ${TITLE}`).allInnerTexts();
}

test.describe('Gallery Loop resilience', () => {
	let images = [];
	let pageIds = [];

	test.beforeAll(async ({ requestUtils }) => {
		await requestUtils.activatePlugin(getPluginSlug());

		const media = await requestUtils.rest({
			path: '/wp/v2/media',
			params: {
				per_page: IMAGES_COUNT,
				media_type: 'image',
				orderby: 'id',
				order: 'desc',
			},
		});

		images = media.map((item) => ({ id: item.id }));

		while (images.length < IMAGES_COUNT) {
			const uploaded = await requestUtils.uploadMedia(
				'tests/fixtures/image-800x600.png'
			);

			images.push({ id: uploaded.id });
		}

		// Titles the sort can actually order, and that a test can read back.
		images = images.map((image, index) => ({
			...image,
			title: `Resilience ${String.fromCharCode(65 + index)}`,
		}));
	});

	test.afterAll(async ({ requestUtils }) => {
		await Promise.all(
			pageIds.map((id) =>
				requestUtils.rest({
					path: `/wp/v2/pages/${id}`,
					method: 'DELETE',
					params: { force: true },
				})
			)
		);

		pageIds = [];
	});

	/**
	 * Publish a page and open it.
	 *
	 * @param {Object} requestUtils - REST utils.
	 * @param {Object} page         - Playwright page.
	 * @param {string} title        - page title.
	 * @param {string} content      - serialized blocks.
	 * @return {Promise<string>} URL of the page.
	 */
	async function publish(requestUtils, page, title, content) {
		const created = await requestUtils.rest({
			path: '/wp/v2/pages',
			method: 'POST',
			data: { title, status: 'publish', content },
		});

		pageIds.push(created.id);

		await page.goto(created.link, { waitUntil: 'domcontentloaded' });

		return created.link;
	}

	/**
	 * Drop every request the page makes for itself, and leave navigations be.
	 *
	 * This is the failure the store has to survive: the module is running, the
	 * fetch it makes never lands, and the browser has to be handed the link.
	 *
	 * @param {Object} page - Playwright page.
	 */
	async function breakFetch(page) {
		await page.route('**/*', (route) => {
			const type = route.request().resourceType();

			return 'fetch' === type || 'xhr' === type
				? route.abort('failed')
				: route.continue();
		});
	}

	/**
	 * Mark the document, so a full page load can be told from a region swap.
	 *
	 * @param {Object} page - Playwright page.
	 */
	function markDocument(page) {
		return page.evaluate(() => {
			window.__vpSameDocument = true;
		});
	}

	test('a sort with no JavaScript submits its form and lands on the sorted page', async ({
		browser,
		requestUtils,
	}) => {
		const context = await browser.newContext({ javaScriptEnabled: false });
		const page = await context.newPage();

		await publish(
			requestUtils,
			page,
			'Resilience - sort without JavaScript',
			getLoopMarkup({
				queryId: 1,
				images,
				perPage: IMAGES_COUNT,
				controls: ['<!-- wp:visual-portfolio/loop-sort /-->'],
			})
		);

		const loop = page.locator(LOOP);

		expect(await getTitles(loop)).toEqual([
			'Resilience A',
			'Resilience B',
			'Resilience C',
			'Resilience D',
			'Resilience E',
			'Resilience F',
		]);

		// The button only exists for this case, and this is the only case in
		// which it is visible.
		await expect(page.locator(SORT_SUBMIT)).toBeVisible();

		await page.locator(`${SORT} select`).selectOption('title_desc');
		await page.locator(SORT_SUBMIT).click();
		await page.waitForLoadState('domcontentloaded');

		expect(getLoopParam(page.url(), 'sort')).toBe('title_desc');
		expect(await getTitles(page.locator(LOOP))).toEqual([
			'Resilience F',
			'Resilience E',
			'Resilience D',
			'Resilience C',
			'Resilience B',
			'Resilience A',
		]);

		await context.close();
	});

	test('sorting one loop leaves the page of the loop beside it alone', async ({
		browser,
		requestUtils,
	}) => {
		const context = await browser.newContext({ javaScriptEnabled: false });
		const page = await context.newPage();

		const url = await publish(
			requestUtils,
			page,
			'Resilience - sort beside a paged loop',
			getLoopMarkup({
				queryId: 1,
				images,
				perPage: IMAGES_COUNT,
				controls: ['<!-- wp:visual-portfolio/loop-sort /-->'],
			}) +
				getLoopMarkup({
					queryId: 2,
					images,
					controls: [getPagination(['loop-pagination-numbers'])],
				})
		);

		// Put the second loop on its second page, then sort the first one.
		// Built through `URL`, because a site on plain permalinks addresses its
		// pages with a query string of their own.
		const paged = new URL(url);

		paged.searchParams.set('vp-2-page', '2');

		await page.goto(paged.href, { waitUntil: 'domcontentloaded' });

		await page.locator(`${SORT} select`).selectOption('title_desc');
		await page.locator(SORT_SUBMIT).click();
		await page.waitForLoadState('domcontentloaded');

		const params = new URL(page.url()).searchParams;

		expect(params.get('vp-1-sort')).toBe('title_desc');
		// The hidden inputs of the form carried it through the submit.
		expect(params.get('vp-2-page')).toBe('2');

		expect(await getTitles(page.locator(LOOP).nth(1))).toEqual([
			'Resilience C',
			'Resilience D',
		]);

		await context.close();
	});

	test('the submit button of a sort is taken away once the module runs', async ({
		page,
		requestUtils,
	}) => {
		await publish(
			requestUtils,
			page,
			'Resilience - sort with JavaScript',
			getLoopMarkup({
				queryId: 1,
				images,
				perPage: IMAGES_COUNT,
				controls: ['<!-- wp:visual-portfolio/loop-sort /-->'],
			})
		);

		await expect(page.locator(SORT_SUBMIT)).toBeHidden();

		await markDocument(page);
		await page.locator(`${SORT} select`).selectOption('title_desc');

		await expect
			.poll(() => getLoopParam(page.url(), 'sort'))
			.toBe('title_desc');

		expect(await getTitles(page.locator(LOOP))).toEqual([
			'Resilience F',
			'Resilience E',
			'Resilience D',
			'Resilience C',
			'Resilience B',
			'Resilience A',
		]);

		// A region swap, not a page load.
		expect(await page.evaluate(() => window.__vpSameDocument)).toBe(true);
	});

	test('a pagination link that cannot be fetched is followed by the browser', async ({
		page,
		requestUtils,
	}) => {
		await publish(
			requestUtils,
			page,
			'Resilience - broken fetch on navigate',
			getLoopMarkup({
				queryId: 1,
				images,
				controls: [getPagination(['loop-pagination-next'])],
			})
		);

		await breakFetch(page);
		await markDocument(page);

		await page.locator(NEXT).click();
		await page.waitForURL(
			(url) => '2' === url.searchParams.get('vp-1-page')
		);
		await page.waitForLoadState('domcontentloaded');

		expect(await getTitles(page.locator(LOOP))).toEqual([
			'Resilience C',
			'Resilience D',
		]);

		// The mark is gone, so the document was replaced - the navigation was
		// handed back to the browser rather than left half done.
		expect(
			await page.evaluate(() => window.__vpSameDocument)
		).toBeUndefined();
	});

	test('a load more that cannot be fetched is followed by the browser', async ({
		page,
		requestUtils,
	}) => {
		await publish(
			requestUtils,
			page,
			'Resilience - broken fetch on load more',
			getLoopMarkup({
				queryId: 1,
				images,
				controls: [getPagination(['loop-pagination-load-more'])],
			})
		);

		await breakFetch(page);
		await markDocument(page);

		await page.locator(LOAD_MORE).click();
		await page.waitForURL(
			(url) => '2' === url.searchParams.get('vp-1-page')
		);
		await page.waitForLoadState('domcontentloaded');

		// A full load of page two, rather than the two pages appended: the
		// browser was given the href the trigger already carried.
		expect(await getTitles(page.locator(LOOP))).toEqual([
			'Resilience C',
			'Resilience D',
		]);
		expect(
			await page.evaluate(() => window.__vpSameDocument)
		).toBeUndefined();
	});
});
