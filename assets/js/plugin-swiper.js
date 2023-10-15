import isNumber from 'is-number';
import $ from 'jquery';

const $doc = $(document);
const { screenSizes } = window.VPData;

function getSwiperVersion(Swiper) {
	let ver = 8;

	// in version 8 added new parameter `maxBackfaceHiddenSlides`.
	if (typeof Swiper.defaults.maxBackfaceHiddenSlides === 'undefined') {
		ver = 7;
	}

	// in version 7 added new parameter `rewind`.
	if (typeof Swiper.defaults.rewind === 'undefined') {
		ver = 6;
	}

	// in version 6 added new parameter `loopPreventsSlide`.
	if (typeof Swiper.defaults.loopPreventsSlide === 'undefined') {
		ver = 5;
	}

	return ver;
}

// Extend VP class.
$doc.on('extendClass.vpf', (event, VP) => {
	if (event.namespace !== 'vpf') {
		return;
	}

	/**
	 * Init Swiper plugin
	 *
	 * @param {mixed} options - slider options.
	 */
	VP.prototype.initSwiper = function (options = false) {
		const self = this;

		if (
			self.options.layout === 'slider' &&
			typeof window.Swiper !== 'undefined'
		) {
			const $parent = self.$items_wrap.parent();

			$parent.addClass('swiper');
			self.$items_wrap.addClass('swiper-wrapper');
			self.$items_wrap.children().addClass('swiper-slide');

			// calculate responsive.
			let slidesPerView = self.options.sliderSlidesPerView || 3;
			const breakPoints = {};

			if (self.options.sliderEffect === 'fade') {
				slidesPerView = 1;
			}

			if (isNumber(slidesPerView)) {
				let count = slidesPerView;
				let currentPoint = Math.min(screenSizes.length - 1, count - 1);

				for (; currentPoint >= 0; currentPoint -= 1) {
					if (
						count > 0 &&
						typeof screenSizes[currentPoint] !== 'undefined'
					) {
						breakPoints[screenSizes[currentPoint] + 1] = {
							slidesPerView: count,
						};
					}
					count -= 1;
				}

				slidesPerView = count || 1;
			}

			let optionsThumbs = false;
			let $thumbsParent = false;
			options = options || {
				speed: (parseFloat(self.options.sliderSpeed) || 0) * 1000,
				autoHeight: self.options.sliderItemsHeight === 'auto',
				effect: self.options.sliderEffect || 'slide',
				// fix fade items collapse (mostly in Default items style).
				fadeEffect: {
					crossFade: true,
				},
				spaceBetween: parseFloat(self.options.itemsGap) || 0,
				centeredSlides: self.options.sliderCenteredSlides === 'true',
				freeMode: {
					enabled: self.options.sliderFreeMode === 'true',
					sticky: self.options.sliderFreeModeSticky === 'true',
				},
				loop: self.options.sliderLoop === 'true',
				// This feature is cool, but not working properly when loop enabled
				// and fast clicking on previous button is not working properly
				// https://github.com/nolimits4web/swiper/issues/5945
				// loopPreventsSlide: false,
				autoplay: parseFloat(self.options.sliderAutoplay) > 0 && {
					delay: parseFloat(self.options.sliderAutoplay) * 1000,
					disableOnInteraction: false,
				},
				navigation: self.options.sliderArrows === 'true' && {
					nextEl: '.vp-portfolio__items-arrow-next',
					prevEl: '.vp-portfolio__items-arrow-prev',
				},
				pagination: self.options.sliderBullets === 'true' && {
					el: '.vp-portfolio__items-bullets',
					clickable: true,
					dynamicBullets:
						self.options.sliderBulletsDynamic === 'true',
					renderBullet(index, className) {
						return `<span class="${className}" data-bullet-index="${index}" data-bullet-number="${
							index + 1
						}"></span>`;
					},
				},
				mousewheel: self.options.sliderMousewheel === 'true',
				slidesPerView,
				breakpoints: breakPoints,
				keyboard: true,
				grabCursor: true,
				preloadImages: false,

				// fixes text selection when swipe in the items gap.
				touchEventsTarget: 'container',
			};

			// fix first load slide position (seems like a conflict with lazySizes)
			// issue: https://github.com/nk-crew/visual-portfolio/issues/54
			if (options.speed === 0) {
				options.speed = 1;
			}
			let positionFix = 0;

			options.on = {
				transitionEnd() {
					if (positionFix === 0) {
						positionFix = 1;
						this.setTransition(1);
						this.setTranslate(this.translate + 0.1);
					} else if (positionFix === 1) {
						positionFix = 2;
						this.slideReset();
					}
				},
				// These events used to add fixes for
				// conflict with custom cursor movement.
				touchStart(swiper, e) {
					self.emitEvent('swiperTouchStart', [swiper, e]);
				},
				touchMove(swiper, e) {
					self.emitEvent('swiperTouchMove', [swiper, e]);
				},
				touchEnd(swiper, e) {
					self.emitEvent('swiperTouchEnd', [swiper, e]);
				},
			};

			self.emitEvent('beforeInitSwiper', [options]);

			// thumbnails.
			if (self.$slider_thumbnails_wrap.length) {
				$thumbsParent = self.$slider_thumbnails_wrap.parent();

				$thumbsParent.addClass('swiper');
				self.$slider_thumbnails_wrap.addClass('swiper-wrapper');
				self.$slider_thumbnails_wrap
					.children()
					.addClass('swiper-slide');

				// calculate responsive.
				let thumbnailsPerView =
					self.options.sliderThumbnailsPerView || 8;
				const thumbnailsBreakPoints = {};

				if (isNumber(thumbnailsPerView)) {
					let count = thumbnailsPerView;
					let currentPoint = Math.min(
						screenSizes.length - 1,
						count - 1
					);

					for (; currentPoint >= 0; currentPoint -= 1) {
						if (
							count > 0 &&
							typeof screenSizes[currentPoint] !== 'undefined'
						) {
							thumbnailsBreakPoints[
								screenSizes[currentPoint] + 1
							] = {
								slidesPerView: count,
							};
						}
						count -= 1;
					}

					thumbnailsPerView = count || 1;
				}

				optionsThumbs = {
					autoHeight: self.options.sliderThumbnailsHeight === 'auto',
					effect: 'slide',
					spaceBetween:
						parseFloat(self.options.sliderThumbnailsGap) || 0,
					loop: false,
					// This feature is cool, but not working properly when loop enabled
					// and fast clicking on previous button is not working properly
					// https://github.com/nolimits4web/swiper/issues/5945
					// loopPreventsSlide: false,
					freeMode: {
						enabled: true,
						sticky: true,
					},
					loopedSlides: 5,
					slidesPerView: thumbnailsPerView,
					breakpoints: thumbnailsBreakPoints,
					keyboard: true,
					grabCursor: true,
					watchSlidesVisibility: true,
					watchSlidesProgress: true,
					preloadImages: false,

					// fixed text selection when swipe in the items gap.
					touchEventsTarget: 'container',
					on: {
						// These events used to add fixes for
						// conflict with custom cursor movement.
						touchStart(swiper, e) {
							self.emitEvent('swiperTouchStart', [swiper, e]);
						},
						touchMove(swiper, e) {
							self.emitEvent('swiperTouchMove', [swiper, e]);
						},
						touchEnd(swiper, e) {
							self.emitEvent('swiperTouchEnd', [swiper, e]);
						},
					},
				};
			}

			// Fallbacks for old Swiper versions.
			(() => {
				const swiperVersion = getSwiperVersion(window.Swiper);
				const isThumbsEnabled =
					optionsThumbs && $thumbsParent && $thumbsParent[0];

				// Since v7 used container class `swiper`, we should also add old `swiper-container` class.
				if (swiperVersion < 7) {
					$parent.addClass('swiper-container');

					if (isThumbsEnabled) {
						$thumbsParent.addClass('swiper-container');
					}
				}

				// Since v7 freeMode options moved under `freeMode` object.
				if (swiperVersion < 7) {
					options.freeModeSticky = options.freeMode.sticky;
					options.freeMode = options.freeMode.enabled;

					if (isThumbsEnabled) {
						optionsThumbs.freeModeSticky =
							optionsThumbs.freeMode.sticky;
						optionsThumbs.freeMode = optionsThumbs.freeMode.enabled;
					}
				}

				// Since v5 `breakpointsInverse` option is removed and it is now `true` by default, but in older versions it was `false`.
				if (swiperVersion >= 5) {
					options.breakpointsInverse = true;

					if (isThumbsEnabled) {
						optionsThumbs.breakpointsInverse = true;
					}
				}
			})();

			// Init Swiper.
			if (optionsThumbs && $thumbsParent && $thumbsParent[0]) {
				const swiperThumbs = new window.Swiper(
					$thumbsParent[0],
					optionsThumbs
				);

				options.thumbs = {
					swiper: swiperThumbs,
				};
			}
			const instance = new window.Swiper($parent[0], options);

			// Autoplay Hover Pause.
			if (
				self.options.sliderAutoplayHoverPause === 'true' &&
				parseFloat(self.options.sliderAutoplay) > 0
			) {
				self.$item.on(
					`mouseenter.vpf-uid-${self.uid}`,
					'.swiper',
					() => {
						$parent[0].swiper.autoplay.stop();
					}
				);
				self.$item.on(
					`mouseleave.vpf-uid-${self.uid}`,
					'.swiper',
					() => {
						$parent[0].swiper.autoplay.start();
					}
				);
			}

			self.emitEvent('initSwiper', [options, instance]);
		}
	};

	/**
	 * Destroy Swiper plugin
	 */
	VP.prototype.destroySwiper = function () {
		const self = this;
		const $parent = self.$items_wrap.parent();
		const $thumbsParent = self.$slider_thumbnails_wrap.length
			? self.$slider_thumbnails_wrap.parent()
			: false;

		const SliderSwiper = $parent[0].swiper;
		const ThumbsSwiper = $thumbsParent ? $thumbsParent[0].swiper : false;

		let isDestroyed = false;

		// Thumbnails.
		if (ThumbsSwiper) {
			ThumbsSwiper.destroy();

			$thumbsParent.removeClass('swiper');
			self.$slider_thumbnails_wrap.removeClass('swiper-wrapper');
			self.$slider_thumbnails_wrap.children().removeClass('swiper-slide');

			isDestroyed = true;
		}

		// Slider.
		if (SliderSwiper) {
			SliderSwiper.destroy();

			$parent.removeClass('swiper');
			self.$items_wrap.removeClass('swiper-wrapper');
			self.$items_wrap.children().removeClass('swiper-slide');

			$parent
				.find('.vp-portfolio__items-bullets')
				.removeClass(
					'swiper-pagination-clickable swiper-pagination-bullets-dynamic'
				)
				.removeAttr('style')
				.html('');

			isDestroyed = true;
		}

		if (isDestroyed) {
			self.emitEvent('destroySwiper');
		}
	};
});

// Add Items.
$doc.on('addItems.vpf', (event, self, $items, removeExisting, $newVP) => {
	if (event.namespace !== 'vpf') {
		return;
	}

	const Swiper = self.$items_wrap.parent()[0].swiper;

	if (!Swiper) {
		return;
	}

	// Slider.
	{
		if (removeExisting) {
			Swiper.removeAllSlides();
		}

		const appendArr = [];
		$items.addClass('swiper-slide').each(function () {
			appendArr.push(this);
		});
		Swiper.appendSlide(appendArr);
	}

	// Thumbnails.
	const ThumbsSwiper = self.$slider_thumbnails_wrap.length
		? self.$slider_thumbnails_wrap.parent()[0].swiper
		: false;
	if (ThumbsSwiper) {
		if (removeExisting) {
			ThumbsSwiper.removeAllSlides();
		}

		const appendArr = [];
		$newVP
			.find('.vp-portfolio__thumbnails > .vp-portfolio__thumbnail-wrap')
			.clone()
			.addClass('swiper-slide')
			.each(function () {
				appendArr.push(this);
			});
		ThumbsSwiper.appendSlide(appendArr);
	}
});

// Init.
$doc.on('init.vpf', (event, self) => {
	if (event.namespace !== 'vpf') {
		return;
	}

	self.initSwiper();
});

// Destroy.
$doc.on('destroy.vpf', (event, self) => {
	if (event.namespace !== 'vpf') {
		return;
	}

	self.destroySwiper();
});
