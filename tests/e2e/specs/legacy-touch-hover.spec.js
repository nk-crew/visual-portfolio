import { expect, test } from '@wordpress/e2e-test-utils-playwright';

import { getFixturePath } from '../utils/fixture-path';

const STYLES = ['default', 'fade', 'emerge', 'fly'];
const pageIds = [];
let image;

async function publish(requestUtils, style) {
	const modes = style === 'fly' ? ['hover'] : ['hover', 'default', 'always'];
	const content = modes.map((mode) => {
		const attributes = {
			block_id: `touch-${style}-${mode}`,
			setup_wizard: 'false',
			content_source: 'images',
			images: [{ id: image.id, title: 'A gallery photo' }],
			items_style: style,
			items_click_action: 'popup_gallery',
			layout: 'tiles',
			tiles_type: '1|1',
			[`items_style_${style}__show_overlay`]: mode,
			[`items_style_${style}__show_caption`]: mode,
		};

		return `<!-- wp:visual-portfolio/block ${JSON.stringify(attributes)} /-->`;
	});
	const created = await requestUtils.rest({
		path: '/wp/v2/pages',
		method: 'POST',
		data: {
			title: `Legacy ${style} input`,
			status: 'publish',
			content: content.join(''),
		},
	});

	pageIds.push(created.id);
	return { link: created.link, modes };
}

async function settle(item) {
	await item.evaluate(async (node) => {
		await Promise.all(
			node.getAnimations({ subtree: true }).map((animation) =>
				animation.finished.catch((error) => {
					if (
						error.name !== 'AbortError' ||
						animation.playState !== 'idle'
					) {
						throw error;
					}
				})
			)
		);
	});
}

async function appearance(item) {
	return item.evaluate((node) => {
		const style = (selector, property) => {
			const element = node.querySelector(selector);
			return element ? getComputedStyle(element)[property] : null;
		};

		return {
			image: style('.vp-portfolio__item-img img', 'transform'),
			overlay: style('.vp-portfolio__item-overlay', 'opacity'),
			panel: style('.vp-portfolio__item-overlay', 'transform'),
			caption: style('.vp-portfolio__item-caption', 'transform'),
			metadata: style('.vp-portfolio__item-meta > *', 'opacity'),
		};
	});
}

test.describe('legacy gallery hover @webkit', () => {
	test.beforeAll(async ({ requestUtils }) => {
		image = await requestUtils.uploadMedia(
			getFixturePath('image-800x600.png')
		);
	});

	test.afterAll(async ({ requestUtils }) => {
		for (const id of pageIds) {
			await requestUtils.rest({
				path: `/wp/v2/pages/${id}`,
				method: 'DELETE',
				params: { force: true },
			});
		}
		if (image) {
			await requestUtils.rest({
				path: `/wp/v2/media/${image.id}`,
				method: 'DELETE',
				params: { force: true },
			});
		}
	});

	test.describe('touch', () => {
		test.use({
			hasTouch: true,
			isMobile: true,
			viewport: { width: 390, height: 844 },
		});

		for (const style of STYLES) {
			test(`${style} ignores compatibility hover and opens on one tap`, async ({
				page,
				requestUtils,
			}) => {
				const { link, modes } = await publish(requestUtils, style);
				await page.goto(link);
				await expect(page.locator('.vp-portfolio__ready')).toHaveCount(
					modes.length
				);
				expect(
					await page.evaluate(
						() => matchMedia('(hover: hover)').matches
					)
				).toBe(false);

				for (const mode of modes) {
					const gallery = page
						.locator(`[data-vp-items-style="${style}"]`)
						.filter({
							has: page.locator(
								`.vp-portfolio__items-show-overlay-${mode}`
							),
						});
					const item = gallery.locator('.vp-portfolio__item').first();
					await item.scrollIntoViewIfNeeded();
					await page.mouse.move(0, 0);
					await settle(item);
					const resting = await appearance(item);
					await item.hover();
					await settle(item);
					expect(await appearance(item)).toEqual(resting);

					await page.mouse.move(0, 0);
					await item.tap();
					const popup = page.locator(
						'.fancybox-is-open, .pswp--open'
					);
					await expect(popup).toBeVisible();
					await page.keyboard.press('Escape');
					await expect(popup).toHaveCount(0);
					await expect(
						page.locator('.fancybox-container, .pswp--open')
					).toHaveCount(0);
				}
			});
		}
	});

	for (const style of STYLES) {
		test(`${style} keeps mouse hover and keyboard focus`, async ({
			page,
			requestUtils,
		}) => {
			const { link, modes } = await publish(requestUtils, style);
			await page.goto(link);
			await expect(page.locator('.vp-portfolio__ready')).toHaveCount(
				modes.length
			);
			expect(
				await page.evaluate(() => matchMedia('(hover: hover)').matches)
			).toBe(true);

			for (const mode of modes) {
				const gallery = page
					.locator(`[data-vp-items-style="${style}"]`)
					.filter({
						has: page.locator(
							`.vp-portfolio__items-show-overlay-${mode}`
						),
					});
				const item = gallery.locator('.vp-portfolio__item').first();
				await item.hover();
				await settle(item);
				if (style === 'fly') {
					expect(
						await item
							.locator('.vp-portfolio__item-overlay')
							.evaluate((node) => {
								const matrix = new DOMMatrix(
									getComputedStyle(node).transform
								);
								return [matrix.m41, matrix.m42];
							})
					).toEqual([0, 0]);
				} else {
					await expect(
						item.locator('.vp-portfolio__item-overlay')
					).toHaveCSS('opacity', mode === 'default' ? '0' : '1');
				}
				const hovered = await appearance(item);
				await page.mouse.move(0, 0);
				await settle(item);
				await page.keyboard.press('Tab');
				await item.locator('.vp-portfolio__item-img > a').focus();
				await expect(item).toHaveClass(
					/vp-portfolio__item-focus-visible/
				);
				await settle(item);
				const focused = await appearance(item);
				expect(focused).toEqual(hovered);
				await item
					.locator('.vp-portfolio__item-img > a')
					.evaluate((node) => node.blur());
			}
		});
	}
});
