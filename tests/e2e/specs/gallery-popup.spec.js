/**
 * Gallery Loop: what a click on an item does.
 *
 * `clickAction` is the whole of the model - a link, a lightbox, or nothing -
 * and only the rendered page can say which of the three an item ended up being.
 * The lightbox is asserted the way a visitor meets it: opened from a click,
 * walked with the keyboard, closed with Escape and with the backdrop, and
 * asked to give the focus back afterwards.
 *
 * Pages are published straight through REST: every test here is about the front
 * end, and one of them runs with JavaScript switched off.
 */
import { expect, test } from '@wordpress/e2e-test-utils-playwright';

import { getFixturePath } from '../utils/fixture-path';
import { getPluginSlug } from '../utils/plugin-slug';

const LIST = 'ul.wp-block-visual-portfolio-item-template';
const ITEM = '.wp-block-visual-portfolio-item-template__item';
const TRIGGER = '[data-vp-popup]';
const POPUP = '.pswp';
const COUNTER = '.pswp__counter';
const CAPTION = '.vp-popup-caption';
// The slide holders of the neighbours are kept, and are off screen: only the
// current one is a thing a visitor can click.
const SLIDE = '.pswp__item[aria-hidden="false"]';
const SLIDE_IMAGE = '.pswp__img:not(.pswp__img--placeholder)';
const LOAD_MORE = '.vp-block-loop-pagination-load-more';
const PAGE_NUMBER = '.vp-block-loop-pagination-numbers a';

const IMAGES_COUNT = 4;
const CAPTION_TEXT = 'A caption of the first image';

// Long enough to be recognised as a YouTube id, and never requested: the test
// asserts the address of the frame, not what the address answers.
const VIDEO_URL = 'https://www.youtube.com/watch?v=aBcDeFgHiJk';

/**
 * The images of a spec, as the source of a loop wants them.
 *
 * The `url` the spec carries alongside every image is its own note of where the
 * file lives. It must not reach the source: an image with a URL is an image the
 * gallery links somewhere, and the plugin gives it no popup at all.
 *
 * @param {Array} items - images of the spec.
 * @return {Array} images of the source.
 */
function toQueryImages(items) {
	return items.map((item) => {
		const image = { id: item.id };

		if (item.videoUrl) {
			image.format = 'video';
			image.video_url = item.videoUrl;
		}

		return image;
	});
}

/**
 * Block markup of a loop whose items carry the given click action.
 *
 * @param {Object}  options              - loop options.
 * @param {string}  options.blockId      - id the loop resolves its query with.
 * @param {number}  options.queryId      - id the URL parameters of the loop are named after.
 * @param {Array}   options.images       - images of the source.
 * @param {string}  options.clickAction  - `none`, `url` or `popup`.
 * @param {number}  [options.perPage]    - items per page.
 * @param {boolean} [options.cover]      - render an item cover instead of an item image.
 * @param {Array}   [options.controls]   - inner blocks of the pagination block.
 * @return {string} serialized blocks.
 */
function getLoopMarkup({
	blockId,
	queryId,
	images,
	clickAction,
	perPage = IMAGES_COUNT,
	cover = false,
	controls = [],
}) {
	const loop = {
		block_id: blockId,
		queryId,
		queryType: 'images',
		baseQuery: { perPage, maxPages: 0 },
		imagesQuery: { images: toQueryImages(images) },
	};

	const item = cover
		? `<!-- wp:visual-portfolio/item-cover ${JSON.stringify({
				aspectRatio: '1',
				clickAction,
			})} --><!-- wp:visual-portfolio/item-title /--><!-- /wp:visual-portfolio/item-cover -->`
		: `<!-- wp:visual-portfolio/item-image ${JSON.stringify({
				aspectRatio: '1',
				clickAction,
			})} /-->`;

	const pagination = controls.length
		? `<!-- wp:visual-portfolio/loop-pagination -->${controls
				.map((name) => `<!-- wp:visual-portfolio/${name} /-->`)
				.join('')}<!-- /wp:visual-portfolio/loop-pagination -->`
		: '';

	return [
		`<!-- wp:visual-portfolio/loop ${JSON.stringify(loop)} -->`,
		'<div class="wp-block-visual-portfolio-loop vp-block-loop">',
		'<!-- wp:visual-portfolio/item-template {"layoutType":"grid","layoutColumns":2} -->',
		item,
		'<!-- /wp:visual-portfolio/item-template -->',
		pagination,
		'</div>',
		'<!-- /wp:visual-portfolio/loop -->',
	].join('');
}

/**
 * Popup data of every trigger of the page, in the order they are rendered.
 *
 * @param {import('@playwright/test').Page} page - page under test.
 * @return {Promise<Array>} parsed `data-vp-popup` payloads.
 */
function getTriggerData(page) {
	return page
		.locator(TRIGGER)
		.evaluateAll((nodes) =>
			nodes.map((node) => JSON.parse(node.getAttribute('data-vp-popup')))
		);
}

test.describe('Gallery Loop click actions and lightbox', () => {
	let images = [];
	let pageIds = [];

	test.beforeAll(async ({ requestUtils }) => {
		await requestUtils.activatePlugin(getPluginSlug());

		// Uploaded rather than borrowed from the library: the lightbox is
		// asserted against the file behind an item, and a leftover of another
		// spec is not a file this one knows.
		for (let index = 0; index < IMAGES_COUNT; index++) {
			const uploaded = await requestUtils.uploadMedia(
				getFixturePath('image-800x600.png')
			);

			images.push({ id: uploaded.id, url: uploaded.source_url });
		}

		// The caption of an attachment is what the lightbox shows under it.
		await requestUtils.rest({
			path: `/wp/v2/media/${images[0].id}`,
			method: 'POST',
			data: { caption: CAPTION_TEXT },
		});
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

		await Promise.all(
			images.map((image) =>
				requestUtils.rest({
					path: `/wp/v2/media/${image.id}`,
					method: 'DELETE',
					params: { force: true },
				})
			)
		);

		pageIds = [];
		images = [];
	});

	/**
	 * Publish a page holding one loop and open it.
	 *
	 * @param {Object} requestUtils - REST utils.
	 * @param {Object} page         - Playwright page.
	 * @param {Object} options      - see `getLoopMarkup()`, plus a title.
	 * @return {Promise<string>} URL of the published page.
	 */
	async function publishLoop(requestUtils, page, options) {
		const created = await requestUtils.rest({
			path: '/wp/v2/pages',
			method: 'POST',
			data: {
				title: options.title,
				status: 'publish',
				content: getLoopMarkup(options),
			},
		});

		pageIds.push(created.id);

		await page.goto(created.link, { waitUntil: 'domcontentloaded' });

		return created.link;
	}

	test('an item links to itself, opens a lightbox or does nothing at all', async ({
		page,
		requestUtils,
	}) => {
		await publishLoop(requestUtils, page, {
			title: 'Popup - click action url',
			blockId: 'e2e-popup-url',
			queryId: 1,
			images,
			clickAction: 'url',
		});

		const links = page.locator(`${ITEM} figure a`);

		await expect(links).toHaveCount(IMAGES_COUNT);
		// A link is a link and nothing more - no popup data rides along.
		await expect(page.locator(TRIGGER)).toHaveCount(0);

		await publishLoop(requestUtils, page, {
			title: 'Popup - click action none',
			blockId: 'e2e-popup-none',
			queryId: 1,
			images,
			clickAction: 'none',
		});

		await expect(page.locator(`${LIST} ${ITEM}`)).toHaveCount(IMAGES_COUNT);
		await expect(page.locator(`${ITEM} figure a`)).toHaveCount(0);

		await publishLoop(requestUtils, page, {
			title: 'Popup - click action popup',
			blockId: 'e2e-popup-data',
			queryId: 1,
			images,
			clickAction: 'popup',
		});

		const triggers = page.locator(TRIGGER);

		await expect(triggers).toHaveCount(IMAGES_COUNT);

		const data = await getTriggerData(page);

		expect(data[0]).toMatchObject({
			type: 'image',
			src: images[0].url,
			caption: CAPTION_TEXT,
		});
		expect(data[0].width).toBeGreaterThan(0);
		expect(data[0].height).toBeGreaterThan(0);
	});

	test('the lightbox opens, walks with the keyboard and hands the focus back', async ({
		page,
		requestUtils,
	}) => {
		await publishLoop(requestUtils, page, {
			title: 'Popup - keyboard',
			blockId: 'e2e-popup-keyboard',
			queryId: 1,
			images,
			clickAction: 'popup',
		});

		const trigger = page.locator(TRIGGER).first();

		await trigger.click();

		const popup = page.locator(POPUP);

		await expect(popup).toBeVisible();
		await expect(page.locator(COUNTER)).toHaveText(`1 / ${IMAGES_COUNT}`);
		await expect(page.locator(CAPTION)).toContainText(CAPTION_TEXT);

		// The dialog took the focus, which is what makes the keys below arrive
		// at the lightbox rather than at the page under it.
		await expect
			.poll(() =>
				page.evaluate(() => !!document.activeElement?.closest('.pswp'))
			)
			.toBe(true);

		await page.keyboard.press('ArrowRight');
		await expect(page.locator(COUNTER)).toHaveText(`2 / ${IMAGES_COUNT}`);

		// Where the focus goes while the dialog is open.
		const seq = [];

		for (let step = 0; step < 8; step++) {
			await page.keyboard.press('Tab');
			seq.push(
				await page.evaluate(() => {
					const active = document.activeElement;

					if (active === document.body) {
						return 'nowhere';
					}

					return active?.closest('.pswp') ? 'lightbox' : 'page';
				})
			);
		}

		// Nothing behind the dialog is ever reached. The tab order walks the
		// buttons of the lightbox and then leaves the document - in a browser
		// that is the address bar - and coming back in lands in the dialog
		// again, because the dialog takes any focus that was not meant for it.
		expect(seq).not.toContain('page');
		expect(seq).toContain('lightbox');
		expect(seq[seq.length - 1]).toBe('lightbox');

		await page.keyboard.press('Escape');
		await expect(popup).toBeHidden();

		// Back on the element the visitor left, not on the top of the document.
		await expect
			.poll(() =>
				page.evaluate(() =>
					document.activeElement?.hasAttribute('data-vp-popup')
				)
			)
			.toBe(true);
	});

	test('a click on the backdrop closes the lightbox', async ({
		page,
		requestUtils,
	}) => {
		await publishLoop(requestUtils, page, {
			title: 'Popup - backdrop',
			blockId: 'e2e-popup-backdrop',
			queryId: 1,
			images,
			clickAction: 'popup',
			cover: true,
		});

		// The cover renders its trigger as the anchor that covers the whole
		// item, which is the other of the two blocks that can open a popup.
		await page.locator(TRIGGER).first().click();
		await expect(page.locator(POPUP)).toBeVisible();

		// The slide holder, not the backdrop element behind it: it is the one
		// covering the viewport, and the library reads a click on it as a click
		// beside the picture. Left of the image, below the toolbar and above
		// the arrows - the three things a click there would mean instead.
		await page
			.locator(SLIDE)
			.first()
			.click({ position: { x: 5, y: 120 } });

		await expect(page.locator(POPUP)).toBeHidden();
	});

	test('a video item is played in a frame, and only while it is on screen', async ({
		page,
		requestUtils,
	}) => {
		await publishLoop(requestUtils, page, {
			title: 'Popup - video',
			blockId: 'e2e-popup-video',
			queryId: 1,
			images: [
				images[0],
				{ ...images[1], videoUrl: VIDEO_URL },
				images[2],
			],
			clickAction: 'popup',
		});

		const data = await getTriggerData(page);

		expect(data[1]).toMatchObject({ type: 'video', src: VIDEO_URL });

		// The video URL is also where a click goes without the module: a video
		// has no full size image to fall back to.
		await expect(page.locator(TRIGGER).nth(1)).toHaveAttribute(
			'href',
			VIDEO_URL
		);

		await page.locator(TRIGGER).nth(1).click();

		const frame = page.locator('.vp-popup-video iframe');

		await expect(frame).toHaveAttribute(
			'src',
			/youtube\.com\/embed\/aBcDeFgHiJk/
		);

		// Off the slide, the frame stops being pointed at anything: the
		// neighbouring slides stay loaded, and a video one swipe away must not
		// be playing.
		await page.keyboard.press('ArrowRight');
		await expect(frame).not.toHaveAttribute('src', /youtube/);
	});

	test('the lightbox holds the items a load more appended', async ({
		page,
		requestUtils,
	}) => {
		await publishLoop(requestUtils, page, {
			title: 'Popup - load more',
			blockId: 'e2e-popup-load-more',
			queryId: 1,
			images,
			clickAction: 'popup',
			perPage: 2,
			controls: ['loop-pagination-load-more'],
		});

		await expect(page.locator(TRIGGER)).toHaveCount(2);

		await page.locator(LOAD_MORE).click();
		await expect(page.locator(TRIGGER)).toHaveCount(IMAGES_COUNT);

		// The appended trigger opens the lightbox as well. Its own directives
		// were never hydrated - it arrived after the page was - so this is the
		// listener on the loop answering for it.
		await page.locator(TRIGGER).last().click();

		await expect(page.locator(POPUP)).toBeVisible();
		await expect(page.locator(COUNTER)).toHaveText(
			`${IMAGES_COUNT} / ${IMAGES_COUNT}`
		);
	});

	test('the lightbox holds the items a region swap brought', async ({
		page,
		requestUtils,
	}) => {
		await publishLoop(requestUtils, page, {
			title: 'Popup - region swap',
			blockId: 'e2e-popup-swap',
			queryId: 1,
			images,
			clickAction: 'popup',
			perPage: 2,
			controls: ['loop-pagination-numbers'],
		});

		const firstPage = await getTriggerData(page);

		await page.locator(PAGE_NUMBER).getByText('2').click();

		// The swap replaced the items rather than adding to them, so the
		// gallery is the second page and nothing else.
		await expect
			.poll(async () => (await getTriggerData(page))[0].src)
			.not.toBe(firstPage[0].src);

		await page.locator(TRIGGER).first().click();

		await expect(page.locator(POPUP)).toBeVisible();
		await expect(page.locator(COUNTER)).toHaveText('1 / 2');

		const swapped = await getTriggerData(page);

		// The picture on screen is the one of the page that was swapped in.
		// Asserted rather than read once: the library shows the size the grid
		// already had until the full one has loaded.
		await expect(page.locator(SLIDE_IMAGE).first()).toHaveAttribute(
			'src',
			swapped[0].src
		);
	});

	test.describe('without JavaScript', () => {
		test.use({ javaScriptEnabled: false });

		test('a trigger is a link to the full size image', async ({
			page,
			requestUtils,
		}) => {
			await publishLoop(requestUtils, page, {
				title: 'Popup - no js',
				blockId: 'e2e-popup-nojs',
				queryId: 1,
				images,
				clickAction: 'popup',
			});

			const trigger = page.locator(TRIGGER).first();

			await expect(trigger).toHaveAttribute('href', images[0].url);

			await trigger.click();
			await page.waitForURL(images[0].url);

			// Nothing was lost by the module not being there: the page the
			// click led to is the picture the lightbox would have shown.
			expect(page.url()).toBe(images[0].url);
		});
	});
});
