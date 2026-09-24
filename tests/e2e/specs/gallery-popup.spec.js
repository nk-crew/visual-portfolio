/**
 * Gallery Loop: what a click on an item does.
 *
 * `clickAction` is the whole of the model - a link, a lightbox, or nothing -
 * and only the rendered page can say which of the three an item ended up being.
 * The lightbox is the classic gallery's, the vendor chosen in Settings, and it
 * is asserted the way a visitor meets it: opened from a click, walked with the
 * keyboard, closed with Escape, and asked to give the focus back afterwards.
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
const TEMPLATE = 'template.vp-portfolio__item-popup';
const LOAD_MORE = '.vp-block-loop-pagination-trigger';
const PAGE_NUMBER = '.vp-block-loop-pagination-numbers a';

const FANCYBOX = '.fancybox-container';
const FANCYBOX_INDEX = `${FANCYBOX} [data-fancybox-index]`;
const FANCYBOX_COUNT = `${FANCYBOX} [data-fancybox-count]`;
const FANCYBOX_CAPTION = `${FANCYBOX} .fancybox-caption__body`;
// Open and done animating in: the library ignores the keyboard until then.
const PHOTOSWIPE = '.pswp.pswp--open.pswp--animated-in';
const PHOTOSWIPE_COUNTER = '.pswp__counter';

const IMAGES_COUNT = 4;
const TITLE_TEXT = 'The first image';
const CAPTION_TEXT = 'A caption of the first image';
const LINK_URL = 'https://example.com/an-image-of-its-own';

// Long enough to be recognised as a YouTube id, and never requested: the test
// asserts the address of the frame, not what the address answers.
const VIDEO_URL = 'https://www.youtube.com/watch?v=aBcDeFgHiJk';

/**
 * The images of a spec, as the source of a loop wants them.
 *
 * The `url` the spec carries alongside every image is its own note of where the
 * file lives. `link` is the address an image of the gallery points to.
 *
 * @param {Array} items - images of the spec.
 * @return {Array} images of the source.
 */
function toQueryImages(items) {
	return items.map((item) => {
		const image = { id: item.id };

		if (item.title) {
			image.title = item.title;
		}

		if (item.link) {
			image.url = item.link;
		}

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
 * @param {Object}  options             - loop options.
 * @param {string}  options.blockId     - id the loop resolves its query with.
 * @param {number}  options.queryId     - id the URL parameters of the loop are named after.
 * @param {Array}   options.images      - images of the source.
 * @param {string}  options.clickAction - `none`, `url` or `popup`.
 * @param {number}  [options.perPage]   - items per page.
 * @param {boolean} [options.cover]     - render an item cover instead of an item image.
 * @param {boolean} [options.title]     - add an item title that opens the lightbox too.
 * @param {Object}  [options.lightbox]  - caption sources of the loop.
 * @param {Array}   [options.controls]  - inner blocks of the pagination block.
 * @param {Object}  [options.layout]    - attributes of the item template.
 * @return {string} serialized blocks.
 */
function getLoopMarkup({
	blockId,
	queryId,
	images,
	clickAction,
	perPage = IMAGES_COUNT,
	cover = false,
	title = false,
	lightbox,
	controls = [],
	layout = { layoutType: 'grid', layoutColumns: 2 },
}) {
	const loop = {
		block_id: blockId,
		queryId,
		queryType: 'images',
		baseQuery: { perPage, maxPages: 0 },
		imagesQuery: { images: toQueryImages(images) },
		...(lightbox ? { lightbox } : {}),
	};

	let item = cover
		? `<!-- wp:visual-portfolio/item-cover ${JSON.stringify({
				aspectRatio: '1',
				clickAction,
			})} --><!-- wp:visual-portfolio/item-title /--><!-- /wp:visual-portfolio/item-cover -->`
		: `<!-- wp:visual-portfolio/item-image ${JSON.stringify({
				aspectRatio: '1',
				clickAction,
			})} /-->`;

	if (title) {
		item += `<!-- wp:visual-portfolio/item-title ${JSON.stringify({
			clickAction,
		})} /-->`;
	}

	const pagination = controls.length
		? `<!-- wp:visual-portfolio/loop-pagination -->${controls
				.map((name) => `<!-- wp:visual-portfolio/${name} /-->`)
				.join('')}<!-- /wp:visual-portfolio/loop-pagination -->`
		: '';

	return [
		`<!-- wp:visual-portfolio/loop ${JSON.stringify(loop)} -->`,
		'<div class="wp-block-visual-portfolio-loop vp-block-loop">',
		`<!-- wp:visual-portfolio/item-template ${JSON.stringify(layout)} -->`,
		item,
		'<!-- /wp:visual-portfolio/item-template -->',
		pagination,
		'</div>',
		'<!-- /wp:visual-portfolio/loop -->',
	].join('');
}

/**
 * The popup data of every item of the page, in the order they are rendered.
 *
 * @param {import('@playwright/test').Page} page - page under test.
 * @return {Promise<Array>} `{ img, video, title, description }` per item.
 */
function getItemPopups(page) {
	return page.locator(ITEM).evaluateAll(
		(nodes, selector) =>
			nodes.map((node) => {
				const template = node.querySelector(selector);

				return template
					? {
							img: template.dataset.vpPopupImg,
							video: template.dataset.vpPopupVideo,
							title: template.content
								.querySelector(
									'.vp-portfolio__item-popup-title'
								)
								?.textContent.trim(),
							description: template.content
								.querySelector(
									'.vp-portfolio__item-popup-description'
								)
								?.textContent.trim(),
						}
					: null;
			}),
		TEMPLATE
	);
}

/**
 * Pick the lightbox vendor in Settings, the way a site owner does.
 *
 * @param {Object} admin  - admin utils.
 * @param {Object} page   - Playwright page.
 * @param {string} vendor - `fancybox` or `photoswipe`.
 */
async function setVendor(admin, page, vendor) {
	await admin.visitAdminPage(
		'edit.php',
		'post_type=portfolio&page=visual-portfolio-settings'
	);

	// The field sits on a tab of its own, so it is set rather than clicked.
	await page
		.locator('select[name="vp_popup_gallery[vendor]"]')
		.evaluate((node, value) => {
			node.value = value;

			// The form has a field named `submit`, which hides the method.
			HTMLFormElement.prototype.submit.call(node.form);
		}, vendor);

	await page.waitForURL(/settings-updated=true/);
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

		// Every item has a title, so every item title opens the lightbox.
		images.forEach((image, index) => {
			image.title = index ? `Image ${index + 1}` : TITLE_TEXT;
		});

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
	 * @param {Object} options      - see `getLoopMarkup()`, plus a page title.
	 * @return {Promise<string>} URL of the published page.
	 */
	async function publishLoop(requestUtils, page, options) {
		const created = await requestUtils.rest({
			path: '/wp/v2/pages',
			method: 'POST',
			data: {
				title: options.pageTitle,
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
			pageTitle: 'Popup - click action url',
			blockId: 'e2e-popup-url',
			queryId: 1,
			images,
			clickAction: 'url',
		});

		await expect(page.locator(`${ITEM} figure a`)).toHaveCount(
			IMAGES_COUNT
		);
		// A link is a link and nothing more - no popup data rides along.
		await expect(page.locator(TRIGGER)).toHaveCount(0);
		await expect(page.locator(TEMPLATE)).toHaveCount(0);

		await publishLoop(requestUtils, page, {
			pageTitle: 'Popup - click action none',
			blockId: 'e2e-popup-none',
			queryId: 1,
			images,
			clickAction: 'none',
		});

		await expect(page.locator(`${LIST} ${ITEM}`)).toHaveCount(IMAGES_COUNT);
		await expect(page.locator(`${ITEM} figure a`)).toHaveCount(0);

		await publishLoop(requestUtils, page, {
			pageTitle: 'Popup - click action popup',
			blockId: 'e2e-popup-data',
			queryId: 1,
			images,
			clickAction: 'popup',
		});

		await expect(page.locator(TRIGGER)).toHaveCount(IMAGES_COUNT);
		await expect(page.locator(TRIGGER).first()).toHaveAttribute(
			'href',
			images[0].url
		);

		// The item title leads, the way the lightbox of a loop captions a
		// slide unless told otherwise.
		const popups = await getItemPopups(page);

		expect(popups[0]).toMatchObject({
			img: images[0].url,
			title: TITLE_TEXT,
		});
	});

	test('the caption follows the sources the loop picked', async ({
		page,
		requestUtils,
	}) => {
		await publishLoop(requestUtils, page, {
			pageTitle: 'Popup - caption sources',
			blockId: 'e2e-popup-sources',
			queryId: 1,
			images,
			clickAction: 'popup',
			lightbox: { titleSource: 'none', descriptionSource: 'caption' },
		});

		const popups = await getItemPopups(page);

		expect(popups[0].title).toBeUndefined();
		expect(popups[0].description).toBe(CAPTION_TEXT);
	});

	test('an image with a link of its own follows it', async ({
		page,
		requestUtils,
	}) => {
		await publishLoop(requestUtils, page, {
			pageTitle: 'Popup - own link',
			blockId: 'e2e-popup-own-link',
			queryId: 1,
			images: [{ ...images[0], link: LINK_URL }, images[1]],
			clickAction: 'popup',
		});

		const links = page.locator(`${ITEM} figure a`);

		await expect(links.first()).toHaveAttribute('href', LINK_URL);
		await expect(links.first()).not.toHaveAttribute('data-vp-popup');
		await expect(links.nth(1)).toHaveAttribute('data-vp-popup');

		// The lightbox holds the items it can show, and the linked one is not
		// among them - not even through a gallery inside its content.
		await page
			.locator(ITEM)
			.first()
			.evaluate((item) => {
				item.insertAdjacentHTML(
					'afterbegin',
					'<div class="vp-portfolio__item-wrap"><template class="vp-portfolio__item-popup" data-vp-popup-img="https://example.org/nested.jpg"></template></div>'
				);
			});

		await links.nth(1).click();
		await expect(page.locator(FANCYBOX)).toBeVisible();
		await expect(page.locator(FANCYBOX_COUNT)).toHaveText('1');
	});

	test('the lightbox opens one slide per item, walks with the keyboard and hands the focus back', async ({
		page,
		requestUtils,
	}) => {
		await publishLoop(requestUtils, page, {
			pageTitle: 'Popup - keyboard',
			blockId: 'e2e-popup-keyboard',
			queryId: 1,
			images,
			clickAction: 'popup',
			title: true,
		});

		// The picture and the title of every item open it, and it holds each
		// item once.
		await expect(page.locator(TRIGGER)).toHaveCount(IMAGES_COUNT * 2);

		await page.locator(TRIGGER).nth(1).click();

		await expect(page.locator(FANCYBOX)).toBeVisible();
		await expect(page.locator(FANCYBOX_COUNT)).toHaveText(
			`${IMAGES_COUNT}`
		);
		await expect(page.locator(FANCYBOX_INDEX)).toHaveText('1');
		await expect(page.locator(FANCYBOX_CAPTION)).toContainText(TITLE_TEXT);

		await page.keyboard.press('ArrowRight');
		await expect(page.locator(FANCYBOX_INDEX)).toHaveText('2');

		await page.keyboard.press('Escape');
		await expect(page.locator(FANCYBOX)).toBeHidden();

		// Back on the item of the slide the visitor left, not on the top of
		// the document.
		await expect
			.poll(() =>
				page.evaluate(
					(selector) =>
						document.activeElement?.closest(selector) ===
						document.querySelectorAll(selector)[1],
					ITEM
				)
			)
			.toBe(true);
	});

	[
		['a grid', { layoutType: 'grid', layoutColumns: 2 }],
		[
			'a carousel whose effect wraps the items',
			{ layoutType: 'carousel', carouselEffect: 'slideshow' },
		],
	].forEach(([name, layout]) => {
		test(`a gallery inside the content of an item stays out of its lightbox, in ${name}`, async ({
			page,
			requestUtils,
		}) => {
			await publishLoop(requestUtils, page, {
				pageTitle: `Popup - nested gallery in ${name}`,
				blockId: `e2e-popup-nested-${layout.layoutType}`,
				queryId: 1,
				images,
				clickAction: 'popup',
				layout,
			});

			// What an item description showing a post's content brings with
			// it: a classic gallery, whose items carry popup data of their
			// own, ahead of the item's own.
			await page
				.locator(ITEM)
				.nth(1)
				.evaluate((item) => {
					(
						item.querySelector(
							'.wp-block-visual-portfolio-item-template__card'
						) || item
					).insertAdjacentHTML(
						'afterbegin',
						'<div class="vp-portfolio__item-wrap"><template class="vp-portfolio__item-popup" data-vp-popup-img="https://example.org/nested.jpg"><h3 class="vp-portfolio__item-popup-title">Nested</h3></template></div>'
					);
				});

			await page
				.locator(ITEM)
				.nth(1)
				.locator(TRIGGER)
				.first()
				.dispatchEvent('click');

			await expect(page.locator(FANCYBOX_COUNT)).toHaveText(
				`${IMAGES_COUNT}`
			);
			await expect(page.locator(FANCYBOX_INDEX)).toHaveText('2');
			await expect(page.locator(FANCYBOX_CAPTION)).toContainText(
				'Image 2'
			);
		});
	});

	test('the cover opens the lightbox', async ({ page, requestUtils }) => {
		await publishLoop(requestUtils, page, {
			pageTitle: 'Popup - cover',
			blockId: 'e2e-popup-cover',
			queryId: 1,
			images,
			clickAction: 'popup',
			cover: true,
		});

		// The gallery the lightbox names in its events is the loop, by the id
		// an address can name it by again.
		await page.evaluate(() => {
			window.jQuery(document).on('initFancybox.vpf', (event, self) => {
				window.vpOpenedFor = self.uid;
			});
		});

		// The cover renders its trigger as the anchor that covers the whole
		// item, which is the other of the two blocks that can open a popup.
		await page.locator(TRIGGER).first().click();
		await expect(page.locator(FANCYBOX)).toBeVisible();
		await expect(page.locator(FANCYBOX_INDEX)).toHaveText('1');

		expect(await page.evaluate(() => window.vpOpenedFor)).toBe(
			'e2e-popup-cover'
		);
	});

	test('a video item is played in a frame', async ({
		page,
		requestUtils,
	}) => {
		await publishLoop(requestUtils, page, {
			pageTitle: 'Popup - video',
			blockId: 'e2e-popup-video',
			queryId: 1,
			images: [
				images[0],
				{ ...images[1], videoUrl: VIDEO_URL },
				images[2],
			],
			clickAction: 'popup',
		});

		const popups = await getItemPopups(page);

		expect(popups[1].video).toBe(VIDEO_URL);

		// The video URL is also where a click goes without the script: a video
		// has no full size image to fall back to.
		await expect(page.locator(TRIGGER).nth(1)).toHaveAttribute(
			'href',
			VIDEO_URL
		);

		await page.locator(TRIGGER).nth(1).click();

		await expect(
			page.locator(`${FANCYBOX} .fancybox-slide--current iframe`)
		).toHaveAttribute('src', /youtube\.com\/embed\/aBcDeFgHiJk/);
	});

	test('the lightbox holds the items a load more appended', async ({
		page,
		requestUtils,
	}) => {
		await publishLoop(requestUtils, page, {
			pageTitle: 'Popup - load more',
			blockId: 'e2e-popup-load-more',
			queryId: 1,
			images,
			clickAction: 'popup',
			perPage: 2,
			controls: ['loop-pagination-trigger'],
		});

		await expect(page.locator(TRIGGER)).toHaveCount(2);

		await page.locator(LOAD_MORE).click();
		await expect(page.locator(TRIGGER)).toHaveCount(IMAGES_COUNT);

		// The appended trigger opens the lightbox as well: the gallery is read
		// off the page at the click.
		await page.locator(TRIGGER).last().click();

		await expect(page.locator(FANCYBOX)).toBeVisible();
		await expect(page.locator(FANCYBOX_INDEX)).toHaveText(
			`${IMAGES_COUNT}`
		);

		// A step back through a history of the hash alone - what a deep link
		// to each slide writes - leaves the page, appended items and all.
		await page.keyboard.press('Escape');
		await page.evaluate(() => {
			window.history.pushState(null, '', '#&gid=a&pid=1');
			window.history.back();
		});
		await expect.poll(() => new URL(page.url()).hash).toBe('');

		await expect(page.locator(TRIGGER)).toHaveCount(IMAGES_COUNT);
	});

	test('the lightbox holds the items a region swap brought', async ({
		page,
		requestUtils,
	}) => {
		await publishLoop(requestUtils, page, {
			pageTitle: 'Popup - region swap',
			blockId: 'e2e-popup-swap',
			queryId: 1,
			images,
			clickAction: 'popup',
			perPage: 2,
			controls: ['loop-pagination-numbers'],
		});

		const firstPage = await getItemPopups(page);

		await page.locator(PAGE_NUMBER).getByText('2').click();

		// The swap replaced the items rather than adding to them, so the
		// gallery is the second page and nothing else.
		await expect
			.poll(async () => (await getItemPopups(page))[0].img)
			.not.toBe(firstPage[0].img);

		const swapped = await getItemPopups(page);

		await page.locator(TRIGGER).first().click();

		await expect(page.locator(FANCYBOX)).toBeVisible();
		await expect(page.locator(FANCYBOX_COUNT)).toHaveText('2');
		// The picture on screen is the one of the page that was swapped in, in
		// whichever of its sizes the vendor picked.
		const file = swapped[0].img
			.split('/')
			.pop()
			.replace(/\.\w+$/, '');

		await expect(
			page
				.locator(
					`${FANCYBOX} .fancybox-slide--current img.fancybox-image`
				)
				.last()
		).toHaveAttribute('src', new RegExp(file));
	});

	test.describe('with PhotoSwipe chosen in Settings', () => {
		test.beforeEach(async ({ admin, page }) => {
			await setVendor(admin, page, 'photoswipe');
		});

		test.afterEach(async ({ admin, page }) => {
			await setVendor(admin, page, 'fancybox');
		});

		test('the lightbox is PhotoSwipe, one slide per item', async ({
			page,
			requestUtils,
		}) => {
			await publishLoop(requestUtils, page, {
				pageTitle: 'Popup - photoswipe',
				blockId: 'e2e-popup-photoswipe',
				queryId: 1,
				images,
				clickAction: 'popup',
				title: true,
			});

			await page.locator(TRIGGER).first().click();

			await expect(page.locator(PHOTOSWIPE)).toBeVisible();
			await expect(page.locator(PHOTOSWIPE_COUNTER)).toHaveText(
				`1 / ${IMAGES_COUNT}`
			);

			await page.keyboard.press('ArrowRight');
			await expect(page.locator(PHOTOSWIPE_COUNTER)).toHaveText(
				`2 / ${IMAGES_COUNT}`
			);

			await page.keyboard.press('Escape');
			await expect(page.locator(PHOTOSWIPE)).toBeHidden();

			await expect
				.poll(() =>
					page.evaluate(
						(selector) =>
							document.activeElement?.closest(selector) ===
							document.querySelectorAll(selector)[1],
						ITEM
					)
				)
				.toBe(true);
		});
	});

	test.describe('without JavaScript', () => {
		test.use({ javaScriptEnabled: false });

		test('a trigger is a link to the full size image', async ({
			page,
			requestUtils,
		}) => {
			await publishLoop(requestUtils, page, {
				pageTitle: 'Popup - no js',
				blockId: 'e2e-popup-nojs',
				queryId: 1,
				images,
				clickAction: 'popup',
			});

			const trigger = page.locator(TRIGGER).first();

			await expect(trigger).toHaveAttribute('href', images[0].url);

			await trigger.click();
			await page.waitForURL(images[0].url);

			// Nothing was lost by the script not being there: the page the
			// click led to is the picture the lightbox would have shown.
			expect(page.url()).toBe(images[0].url);
		});
	});
});
