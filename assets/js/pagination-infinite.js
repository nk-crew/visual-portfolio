import $ from 'jquery';
import rafSchd from 'raf-schd';
import { throttle } from 'throttle-debounce';

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
			self.loadNewItems(self.options.nextPageUrl, false);
		} else {
			visibilityCheckBusy = false;
		}
	}

	// Any page that lands, as a click on the link may bring the one a failed
	// request left behind. A failure lands nothing, so this asks only once.
	self.$item.on(`endLoadingNewItems${evp}`, (e) => {
		if (e.target === self.$item[0]) {
			setTimeout(() => {
				visibilityCheckBusy = false;
				checkVisibilityAndLoad();
			}, 300);
		}
	});

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
