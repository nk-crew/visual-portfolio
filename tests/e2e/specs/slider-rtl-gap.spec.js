/**
 * WordPress dependencies
 */
import { expect, test } from '@wordpress/e2e-test-utils-playwright';

import { createRegularPosts } from '../utils/create-posts';

test.describe('slider gap on RTL direction', () => {
	test.beforeAll(async ({ requestUtils }) => {
		const pluginName = process.env.CORE
			? 'visual-portfolio-pro'
			: 'visual-portfolio-posts-amp-image-gallery';

		await Promise.all([
			requestUtils.activatePlugin(pluginName),
			requestUtils.deleteAllPages(),
			requestUtils.deleteAllPosts(),
		]);
	});

	test.afterAll(async ({ requestUtils }) => {
		await Promise.all([
			requestUtils.deleteAllPages(),
			requestUtils.deleteAllPosts(),
		]);
	});

	test('keeps Swiper RTL gap margins after initialization', async ({
		page,
		requestUtils,
	}) => {
		const itemsGap = 35;

		// Create standard posts used by the VP posts source.
		await createRegularPosts({
			requestUtils,
			count: 5,
		});

		const pageWithSlider = await requestUtils.rest({
			path: '/wp/v2/pages',
			method: 'POST',
			data: {
				title: 'RTL Slider Gap Test',
				status: 'publish',
				content:
					'<div style="direction: rtl;"><!-- wp:visual-portfolio/block {"block_id":"rtlGapE2E","content_source":"post-based","posts_source":"post","layout":"slider","items_gap":35,"items_count":5,"slider_slides_per_view_type":"custom","slider_slides_per_view_custom":3,"slider_effect":"slide","slider_arrows":true,"slider_bullets":false,"slider_loop":false} /--></div>',
			},
		});

		await page.goto(pageWithSlider.link);

		await expect(async () => {
			const sliderState = await page.evaluate(() => {
				const slider = document.querySelector('.vp-portfolio');
				const slide = document.querySelector(
					'.vp-portfolio__item-wrap.swiper-slide'
				);

				if (!slider || !slide) {
					return null;
				}

				const slideStyles = window.getComputedStyle(slide);
				const inlineStyles = slide.getAttribute('style') || '';

				return {
					vpDirection: window.getComputedStyle(slider).direction,
					hasSwiperRtlClass: !!document.querySelector('.swiper-rtl'),
					inlineMarginLeft: inlineStyles.includes('margin-left')
						? parseFloat(
								inlineStyles.match(/margin-left:\s*([0-9.]+)px/)?.[1] ||
									'0'
						  )
						: 0,
					computedMarginLeft: parseFloat(slideStyles.marginLeft || '0'),
					computedMarginRight: parseFloat(slideStyles.marginRight || '0'),
				};
			});

			expect(sliderState).not.toBeNull();
			expect(sliderState.vpDirection).toBe('rtl');
			expect(sliderState.hasSwiperRtlClass).toBeTruthy();
			expect(sliderState.inlineMarginLeft).toBe(itemsGap);
			expect(sliderState.computedMarginLeft).toBe(itemsGap);
			expect(sliderState.computedMarginRight).toBe(0);
		}).toPass({ timeout: 15000 });
	});
});
