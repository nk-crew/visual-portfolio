import { expect, test } from '@wordpress/e2e-test-utils-playwright';
import { createRegularPosts } from '../utils/create-posts';
import { getPluginSlug } from '../utils/plugin-slug';

test('short legacy slider keeps logical thumbnails and popup order', async ({
	page,
	requestUtils,
}) => {
	await requestUtils.activatePlugin(getPluginSlug());
	await createRegularPosts({ requestUtils, count: 3 });
	const attributes = {
		block_id: 'swiperCompatibility',
		content_source: 'post-based',
		posts_source: 'post',
		layout: 'slider',
		items_count: 3,
		items_gap: 20,
		slider_slides_per_view_type: 'custom',
		slider_slides_per_view_custom: 3,
		slider_effect: 'slide',
		slider_loop: true,
		slider_centered_slides: true,
		slider_arrows: true,
		slider_bullets: true,
		slider_autoplay: 0,
		slider_speed: 0.2,
		slider_thumbnails: true,
		slider_thumbnails_per_view_type: 'custom',
		slider_thumbnails_per_view_custom: 3,
		items_click_action: 'popup_gallery',
	};
	const created = await requestUtils.rest({
		path: '/wp/v2/pages',
		method: 'POST',
		data: {
			title: 'Slider compatibility',
			status: 'publish',
			content: `<!-- wp:visual-portfolio/block ${JSON.stringify(attributes)} /-->`,
		},
	});
	const pages = [created.id];
	try {
		await page.emulateMedia({ reducedMotion: 'no-preference' });
		await page.goto(created.link);
		const root = page.locator('.vp-portfolio__items-wrap.swiper');
		await expect
			.poll(() => root.evaluate((el) => Boolean(el.swiper?.initialized)))
			.toBe(true);
		expect(
			await root.evaluate(
				(el) => el.swiper.constructor === window.VisualPortfolioSwiper
			)
		).toBe(true);
		await expect
			.poll(() =>
				root.evaluate((el) => Number(el.swiper.params.slidesPerView))
			)
			.toBe(3);
		expect(
			await root.evaluate((el) => {
				const swiper = el.swiper;
				const active = swiper.slides[swiper.activeIndex];
				return Math.abs(
					active.getBoundingClientRect().width -
						(swiper.width - 2 * swiper.params.spaceBetween) / 3
				);
			})
		).toBeLessThan(1);
		const sources = await page.evaluate(() =>
			window.VPPopupAPI.parseGallery(window.jQuery('.vp-portfolio')).map(
				(item) => item.src
			)
		);
		expect(sources).toHaveLength(3);
		await expect(
			page.locator(
				'.vp-portfolio__items-bullets > .swiper-pagination-bullet'
			)
		).toHaveCount(3);
		for (let index = 1; index <= 7; index += 1) {
			await expect
				.poll(() => root.evaluate((el) => el.swiper.animating))
				.toBe(false);
			await page.locator('.vp-portfolio__items-arrow-next').click();
			await expect
				.poll(() => root.evaluate((el) => el.swiper.realIndex))
				.toBe(index % 3);
		}
		expect(
			await page.evaluate(() =>
				window.VPPopupAPI.parseGallery(
					window.jQuery('.vp-portfolio')
				).map((item) => item.src)
			)
		).toEqual(sources);
		await expect
			.poll(() => root.evaluate((el) => el.swiper.animating))
			.toBe(false);
		const thumbPage = await requestUtils.rest({
			path: '/wp/v2/pages',
			method: 'POST',
			data: {
				title: 'Thumbnail compatibility',
				status: 'publish',
				content: `<!-- wp:visual-portfolio/block ${JSON.stringify({ ...attributes, block_id: 'thumbCompatibility', slider_slides_per_view_custom: 1 })} /-->`,
			},
		});
		pages.push(thumbPage.id);
		await page.goto(thumbPage.link);
		await expect
			.poll(() =>
				root.evaluate((el) => Number(el.swiper?.params.slidesPerView))
			)
			.toBe(1);
		await page
			.locator('.vp-portfolio__thumbnails > .swiper-slide')
			.nth(2)
			.click();
		await expect
			.poll(() => root.evaluate((el) => el.swiper.realIndex))
			.toBe(2);
	} finally {
		for (const id of pages)
			await requestUtils.rest({
				path: `/wp/v2/pages/${id}`,
				method: 'DELETE',
				params: { force: true },
			});
		await requestUtils.deleteAllPosts();
	}
});
