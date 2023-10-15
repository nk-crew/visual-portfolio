/**
 * Load duplicated Swiper slides to prevent images "blink" effect after swipe.
 *
 * @param window
 * @param factory
 */
(function (window, factory) {
	const globalInstall = function () {
		factory(window.lazySizes);
		window.removeEventListener('lazyunveilread', globalInstall, true);
	};
	factory = factory.bind(null, window, window.document);

	if (window.lazySizes) {
		globalInstall();
	} else {
		window.addEventListener('lazyunveilread', globalInstall, true);
	}
})(window, (window, document, lazySizes) => {
	if (!window.addEventListener) {
		return;
	}

	const { unveil } = lazySizes.loader;

	const getSiblings = (el, filter) =>
		[...el.parentNode.children].filter(
			(child) =>
				child.nodeType === 1 &&
				child !== el &&
				(!filter || child.matches(filter))
		);

	const swiperDuplicatesLoad = {
		getSlideData(element) {
			const $el = element.closest('.swiper-slide');
			const slideIndex = $el
				? $el.getAttribute('data-swiper-slide-index')
				: false;

			return {
				$el,
				slideIndex,
			};
		},
		run(element) {
			const slideData = this.getSlideData(element);

			if (slideData.slideIndex) {
				const $siblingDuplicates = getSiblings(
					slideData.$el,
					`[data-swiper-slide-index="${slideData.slideIndex}"]`
				);

				$siblingDuplicates.forEach((el) => {
					// We should also get images in `loading` state, because in some rare situations
					// duplicated images by default has this class and not displaying correctly.
					const $images = el.querySelectorAll(
						'img.vp-lazyload, img.vp-lazyloading'
					);

					if ($images) {
						$images.forEach(($img) => {
							unveil($img);
						});
					}
				});
			}

			return true;
		},
	};

	lazySizes.swiperDuplicatesLoad = swiperDuplicatesLoad;

	document.addEventListener('lazyloaded', (e) => {
		// for some reason sometimes e.detail is undefined, so we need to check it.
		if (
			e.defaultPrevented ||
			!e.detail ||
			e.detail.swiperDuplicatesChecked ||
			!e.target ||
			e.detail.instance !== lazySizes
		) {
			return;
		}

		const element = e.target;
		e.detail.swiperDuplicatesChecked = swiperDuplicatesLoad.run(element);
	});
});
