import $ from 'jquery';

const { ResizeObserver } = window;

function setImgWidth($el) {
	if ($el && $el.height > 1) {
		$el.style.width = `${$el.height}px`;
	}
}

// We need to use resize observer because for some reason in the Preview
// and on some mobile devices image height is 1px.
const resizeObserver = new ResizeObserver((entries) => {
	entries.forEach(({ target }) => {
		if (target) {
			setImgWidth(target);
		}
	});
});

// Init minimal paged pagination.
$(document).on('init.vpf loadedNewItems.vpf', (event, self) => {
	if (
		event.namespace !== 'vpf' ||
		self.options.pagination !== 'paged' ||
		!self.$pagination.children('.vp-pagination__style-minimal').length
	) {
		return;
	}

	// Hack used in Paged active item to make circle using hidden <img>.
	// See styles for <img> tag in /templates/pagination/style.scss
	const $activeItem = self.$pagination.find('.vp-pagination__item-active');
	let $img = $activeItem.find('img');

	if (!$img.length) {
		$img = $(
			'<img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt="">'
		);

		resizeObserver.observe($img[0]);
		$activeItem.prepend($img);

		setImgWidth($img[0]);
	}
});
