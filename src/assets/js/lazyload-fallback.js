/*
 * Visual Portfolio images lazy load fallback for browsers
 * which does not support CSS :has()
 */

// Lazyloaded - remove preloader images placeholder effect.
document.addEventListener('lazybeforeunveil', (e) => {
	const vpfImgWrapper = e.target.closest(
		'.vp-portfolio__item-img, .vp-portfolio__thumbnail-img'
	);

	if (vpfImgWrapper) {
		vpfImgWrapper.classList.add('vp-has-lazyloading');
	}
});

document.addEventListener('lazyloaded', (e) => {
	const vpfImgWrapper = e.target.closest(
		'.vp-portfolio__item-img, .vp-portfolio__thumbnail-img'
	);

	if (vpfImgWrapper) {
		vpfImgWrapper.classList.add('vp-has-lazyloaded');
		vpfImgWrapper.classList.add('vp-has-lazyloading');
	}
});
