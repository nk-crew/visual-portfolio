import $ from 'jquery';
import rafSchd from 'raf-schd';
import { throttle } from 'throttle-debounce';

const $wnd = $(window);

// Init infinite scroll pagination.
$(document).on('initEvents.vpf', (event, self) => {
	// Exit early if not the right namespace or pagination type
	if (event.namespace !== 'vpf') {
		return;
	}

	// Update pagination options if infinite pagination is present
	function updatePaginationOptions() {
		if (
			self.$pagination.find(
				'.wp-block-visual-portfolio-pagination-infinite'
			).length
		) {
			self.options.pagination = 'infinite';
			self.options.nextPageUrl = self.$pagination
				.find('a.vp-pagination__load-more')
				.attr('href');
		}
	}

	// Initial update of pagination options
	updatePaginationOptions();

	// Exit if not using infinite pagination
	if (self.options.pagination !== 'infinite') {
		return;
	}

	const evp = `.vpf-uid-${self.uid}`;
	const scrollThreshold = 400;
	let visibilityCheckBusy = false;

	// Check if we need to load more items
	function checkVisibilityAndLoad() {
		// Update pagination options before checking
		updatePaginationOptions();

		// Skip if busy or no next page URL
		if (visibilityCheckBusy || !self.options.nextPageUrl) {
			return;
		}

		visibilityCheckBusy = true;
		const rect = self.$item[0].getBoundingClientRect();

		// Load more items if we're close to the bottom
		if (
			rect.bottom > 0 &&
			rect.bottom - scrollThreshold <= window.innerHeight
		) {
			self.loadNewItems(self.options.nextPageUrl, false, () => {
				setTimeout(() => {
					visibilityCheckBusy = false;
					checkVisibilityAndLoad();
				}, 300);
			});
		} else {
			visibilityCheckBusy = false;
		}
	}

	// Create throttled scroll handler using requestAnimationFrame for performance
	const throttledScrollHandler = throttle(
		150,
		rafSchd(checkVisibilityAndLoad)
	);

	// Initial check
	checkVisibilityAndLoad();

	// Attach event listeners
	$wnd.on(
		`load${evp} scroll${evp} resize${evp} orientationchange${evp}`,
		throttledScrollHandler
	);
});
