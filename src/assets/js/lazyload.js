/*
 * Visual Portfolio images lazy load.
 */
const { jQuery: $ } = window;

const $doc = $(document);

// recalculate image size if parent is <picture>
$doc.on('lazybeforesizes', (e) => {
	// for some reason sometimes e.detail is undefined, so we need to check it.
	if (!e.detail || !e.detail.width || !e.target) {
		return;
	}

	e.detail.width =
		$(e.target).parents(':not(picture)').innerWidth() || e.detail.width;
});

// Lazyloaded - remove preloader images placeholder effect.
$doc.on('lazybeforeunveil', (e) => {
	const $img = $(e.target);

	$img.closest('.vp-portfolio__item-img').addClass(
		'vp-portfolio__item-img-lazyloading'
	);
	$img.closest('.vp-portfolio__thumbnail-img').addClass(
		'vp-portfolio__thumbnail-img-lazyloading'
	);

	/**
	 * Remove <noscript> tag.
	 * Some of optimization plugin make something, that killed our styles with noscript tag.
	 * Related topic: https://wordpress.org/support/topic/visual-portfolio-and-sg-optimizer-dont-play-well/
	 */
	$img.prev('noscript').remove();
});
$doc.on('lazyloaded', (e) => {
	const $img = $(e.target);

	$img.closest('.vp-portfolio__item-img')
		.removeClass('vp-portfolio__item-img-lazyloading')
		.addClass('vp-portfolio__item-img-lazyloaded');
	$img.closest('.vp-portfolio__thumbnail-img')
		.removeClass('vp-portfolio__thumbnail-img-lazyloading')
		.addClass('vp-portfolio__thumbnail-img-lazyloaded');
});
