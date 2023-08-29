import { debounce } from '@wordpress/compose';

const { jQuery: $ } = window;

let jetpackLazyImagesLoadEvent;
try {
	jetpackLazyImagesLoadEvent = new Event('jetpack-lazy-images-load', {
		bubbles: true,
		cancelable: true,
	});
} catch (e) {
	jetpackLazyImagesLoadEvent = document.createEvent('Event');
	jetpackLazyImagesLoadEvent.initEvent(
		'jetpack-lazy-images-load',
		true,
		true
	);
}

// Fix AJAX loaded images.
$(document).on('loadedNewItems.vpf', function (event) {
	if (event.namespace !== 'vpf') {
		return;
	}

	$('body').get(0).dispatchEvent(jetpackLazyImagesLoadEvent);
});

// Fix masonry reloading when Jetpack images lazy loaded.
const runReLayout = debounce(200, ($gallery) => {
	$gallery.vpf('imagesLoaded');
});

$(document.body).on('jetpack-lazy-loaded-image', '.vp-portfolio', function () {
	const $this = $(this).closest('.vp-portfolio');

	if ($this && $this.length) {
		runReLayout($this);
	}
});
