/**
 * Gallery abilities: what an AI agent builds through the Abilities API is a
 * gallery the editor accepts and the page shows.
 *
 * The abilities are called the way the MCP Adapter calls them for an agent,
 * over the Abilities REST API as a logged-in user.
 */
import { expect, test } from '@wordpress/e2e-test-utils-playwright';

import { getFixturePath } from '../utils/fixture-path';
import { getPluginSlug } from '../utils/plugin-slug';

const ITEM = '.wp-block-visual-portfolio-item-template__item';

/**
 * Run an ability over REST, with the method core's `executeAbility()` picks
 * for it: a destructive, idempotent ability runs as DELETE, which carries its
 * input in the query string.
 *
 * @param {Object} requestUtils - request utils fixture.
 * @param {string} name         - ability name without the namespace.
 * @param {Object} input        - ability input.
 * @param {string} method       - HTTP method.
 * @return {Promise<Object>} ability output.
 */
function runAbility(requestUtils, name, input, method = 'POST') {
	const path = `/wp-abilities/v1/abilities/visual-portfolio/${name}/run`;

	if ('DELETE' !== method) {
		return requestUtils.rest({ method, path, data: { input } });
	}

	// Nested keys in PHP's bracket notation, as `addQueryArgs()` writes them.
	const params = {};
	const add = (key, value) => {
		if (value && 'object' === typeof value) {
			for (const [k, v] of Object.entries(value)) {
				add(`${key}[${k}]`, v);
			}
		} else {
			params[key] = value;
		}
	};

	add('input', input);

	return requestUtils.rest({ method, path, params });
}

/**
 * Every block the editor holds in the invalid state, and the loops.
 *
 * @param {import('@playwright/test').Page} page - editor page.
 * @return {Promise<Object>} `{ invalid, loops }`.
 */
function readBlocks(page) {
	return page.evaluate(() => {
		const invalid = [];
		let loops = 0;
		const walk = (blocks) =>
			blocks.forEach((block) => {
				if (false === block.isValid) {
					invalid.push(block.name);
				}

				if ('visual-portfolio/loop' === block.name) {
					loops += 1;
				}

				walk(block.innerBlocks);
			});

		walk(window.wp.data.select('core/block-editor').getBlocks());

		return { invalid, loops };
	});
}

test.describe('Gallery abilities', () => {
	let images = [];
	let post;

	test.beforeAll(async ({ requestUtils }) => {
		await requestUtils.activatePlugin(getPluginSlug());

		images = [];

		for (const file of [
			'image-300x200.jpeg',
			'image-1600x1200.jpeg',
			'image-1920x1080.jpeg',
		]) {
			images.push(await requestUtils.uploadMedia(getFixturePath(file)));
		}

		post = await requestUtils.rest({
			method: 'POST',
			path: '/wp/v2/posts',
			data: {
				title: 'Abilities gallery',
				status: 'publish',
				content:
					'<!-- wp:paragraph -->\n<p>Before the gallery.</p>\n<!-- /wp:paragraph -->',
			},
		});
	});

	test.afterAll(async ({ requestUtils }) => {
		await requestUtils.deleteAllPosts();
		await requestUtils.deleteAllMedia();
	});

	test('are listed for agents', async ({ requestUtils }) => {
		const abilities = await requestUtils.rest({
			path: '/wp-abilities/v1/abilities',
			params: { category: 'visual-portfolio', per_page: 100 },
		});
		const names = abilities.map(({ name }) => name).sort();

		expect(names).toEqual([
			'visual-portfolio/create-gallery',
			'visual-portfolio/get-gallery',
			'visual-portfolio/get-gallery-options',
			'visual-portfolio/list-galleries',
			'visual-portfolio/update-gallery',
		]);
	});

	test('build a gallery the editor accepts and the page shows', async ({
		admin,
		page,
		requestUtils,
	}) => {
		const ids = images.map(({ id }) => id);
		const gallery = await runAbility(requestUtils, 'create-gallery', {
			post_id: post.id,
			layout: 'visual-portfolio/gallery-masonry-classic',
			source: {
				type: 'images',
				images: ids.map((id) => ({ id })),
			},
			settings: { columns: 4 },
		});

		expect(gallery.settings).toEqual({
			per_page: -1,
			lightbox: true,
			columns: 4,
		});

		await admin.editPost(post.id);
		await expect
			.poll(() => readBlocks(page))
			.toEqual({ invalid: [], loops: 1 });

		await page.goto(post.link);

		const items = page.locator(ITEM);

		await expect(items).toHaveCount(3);
		await expect(page.locator(`${ITEM} [data-vp-popup]`)).toHaveCount(3);

		await runAbility(
			requestUtils,
			'update-gallery',
			{
				post_id: post.id,
				gallery_id: gallery.gallery_id,
				order: [...ids].reverse(),
			},
			'DELETE'
		);

		await page.reload();

		const order = await items
			.locator('img')
			.evaluateAll((nodes) =>
				nodes.map((node) =>
					Number(
						(node.className.match(/wp-image-(\d+)/) || [])[1] || 0
					)
				)
			);

		expect(order).toEqual([...ids].reverse());
	});
});
