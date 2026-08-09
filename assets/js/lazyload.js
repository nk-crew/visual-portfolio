// Recalculate image size if parent is <picture>
document.addEventListener('lazybeforesizes', (e) => {
	// for some reason sometimes e.detail is undefined, so we need to check it.
	if (!e.detail || !e.detail.width || !e.target) {
		return;
	}

	const parent = e.target.closest(':not(picture)');

	if (parent) {
		e.detail.width = parent.clientWidth || e.detail.width;
	}
});

/**
 * Remove <noscript> tag.
 * Some of optimization plugin make something, that killed our styles with noscript tag.
 * Related topic: https://wordpress.org/support/topic/visual-portfolio-and-sg-optimizer-dont-play-well/
 */
document.addEventListener('lazybeforeunveil', (e) => {
	const prevEl = e.target.previousElementSibling;

	if (prevEl && prevEl.matches('noscript')) {
		prevEl.remove();
	}
});
