/*
 * Infinite Scroll pagination.
 */
import { throttle } from '@wordpress/compose';
import rafSchd from 'raf-schd';

const { jQuery: $ } = window;
const $wnd = $(window);

// Init infinite scroll pagination.
$(document).on('initEvents.vpf', (event, self) => {
	if (event.namespace !== 'vpf' || self.options.pagination !== 'infinite') {
		return;
	}

	const evp = `.vpf-uid-${self.uid}`;
	const scrollThreshold = 400;
	let visibilityCheckBusy = false;

	function checkVisibilityAndLoad() {
		if (visibilityCheckBusy || !self.options.nextPageUrl) {
			return;
		}
		visibilityCheckBusy = true;

		const rect = self.$item[0].getBoundingClientRect();

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

	checkVisibilityAndLoad();

	$wnd.on(
		`load${evp} scroll${evp} resize${evp} orientationchange${evp}`,
		throttle(
			150,
			rafSchd(() => {
				checkVisibilityAndLoad();
			})
		)
	);
});
