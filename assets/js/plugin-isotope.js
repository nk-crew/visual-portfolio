import $ from 'jquery';
import rafSchd from 'raf-schd';
import { debounce, throttle } from 'throttle-debounce';

const { getComputedStyle } = window;
const $wnd = $(window);
const $doc = $(document);

const SUPPORTED_LAYOUTS = ['tiles', 'masonry', 'grid'];

// Longer than one turn of the loop below, the layout transition included.
const SCROLLBAR_LOOP_TIME = 1000;

/**
 * Start a guard against a layout that toggles the page scrollbar.
 *
 * When the page height sits between its two scrollbar states, the layout at
 * the wider width is tall enough to bring the scrollbar, and the one at the
 * narrower width it leaves is short enough to lose it, back and forth, with
 * the window untouched. No width settles, so the guard stops at the wider
 * layout: the page keeps its scrollbar, and the items only shrink a little.
 *
 * @return {Function} takes the width a layout is about to run at, and returns
 *                    whether that layout would only turn the loop again.
 */
function createScrollbarLoopGuard() {
	let before = null;
	let last = null;

	return (width) => {
		const time = window.performance.now();
		const viewport = window.innerWidth;
		const scrollbar = viewport - document.documentElement.clientWidth;

		if (
			before &&
			width === before.width &&
			width < last.width &&
			viewport === before.viewport &&
			viewport === last.viewport &&
			scrollbar > last.scrollbar &&
			time - last.time < SCROLLBAR_LOOP_TIME
		) {
			return true;
		}

		if (!last || last.width !== width) {
			before = last;
			last = { width, viewport, scrollbar, time };
		}

		return false;
	};
}

// Extend VP class.
$doc.on('extendClass.vpf', (event, VP) => {
	if (event.namespace !== 'vpf') {
		return;
	}

	/**
	 * Init Isotope
	 * TODO: Check one of these scripts as alternative
	 * - https://github.com/haltu/muuri
	 * - https://github.com/Vestride/Shuffle
	 * - https://github.com/patrickkunka/mixitup
	 *
	 * @param {Object} options isotope options
	 */
	VP.prototype.initIsotope = function (options) {
		if (
			this.$items_wrap.isotope &&
			SUPPORTED_LAYOUTS.includes(this.options.layout)
		) {
			const isRtl =
				getComputedStyle(this.$items_wrap[0]).direction === 'rtl';

			const initOptions = options || {
				itemSelector: '.vp-portfolio__item-wrap',
				layoutMode: 'masonry',
				masonry:
					this.options.layout === 'masonry'
						? {
								// Use proper order for row items in Masonry layout only.
								// Tiles layout may not work as expected with this option.
								horizontalOrder:
									this.options.masonryHorizontalOrder ===
									'true',
							}
						: {},
				transitionDuration: '0.3s',
				// We don't use stagger anymore because it is not
				// working properly in a large galleries.
				// When screen resized, latest items transition is too big and it looks ugly.
				// stagger: '0.03s',
				percentPosition: true,
				originLeft: !isRtl,

				// See `initEvents.vpf` event why we need this option disabled.
				resize: false,
			};

			this.emitEvent('beforeInitIsotope', [initOptions]);

			this.$items_wrap.isotope(initOptions);

			this.emitEvent('initIsotope', [initOptions]);
		}
	};

	/**
	 * Lay Isotope out again for a new width.
	 */
	VP.prototype.resizeIsotope = function () {
		if (!this.$items_wrap.data('isotope')) {
			return;
		}

		const width = window.getSize(this.$items_wrap[0]).innerWidth;

		this.isScrollbarLoop =
			this.isScrollbarLoop || createScrollbarLoopGuard();

		// A hidden gallery reads 0 wide and keeps the layout it had.
		if (!width || this.isScrollbarLoop(width)) {
			return;
		}

		this.initIsotope('layout');
	};

	/**
	 * Destroy Isotope
	 */
	VP.prototype.destroyIsotope = function () {
		const isotope = this.$items_wrap.data('isotope');

		if (isotope) {
			this.$items_wrap.isotope('destroy');

			this.emitEvent('destroyIsotope');
		}
	};
});

// Add Items.
$doc.on('addItems.vpf', (event, self, $items, removeExisting) => {
	if (event.namespace !== 'vpf') {
		return;
	}

	const isotope = self.$items_wrap.data('isotope');

	if (!isotope) {
		return;
	}

	if (removeExisting) {
		const $existing = self.$items_wrap.find('.vp-portfolio__item-wrap');
		self.$items_wrap.isotope('remove', $existing);

		// we need to prepend items when remove existing just because Tiles layout have troubles with appending and removing items
		self.$items_wrap.prepend($items).isotope('prepended', $items);
	} else {
		self.$items_wrap.append($items).isotope('appended', $items);
	}

	// Idk why, but with timeout isotope recalculate all items fine.
	// if we run only re-layout inside the timeout, there will be visible image blinking.
	// So, we need to make these 2 calls.
	self.initIsotope('layout');
	setTimeout(() => {
		self.initIsotope('layout');
	}, 0);
});

// Remove Items.
$doc.on('removeItems.vpf', (event, self, $items) => {
	if (event.namespace !== 'vpf') {
		return;
	}

	const isotope = self.$items_wrap.data('isotope');

	if (!isotope) {
		return;
	}

	self.$items_wrap.isotope('remove', $items);
});

// Init.
$doc.on('init.vpf', (event, self) => {
	if (event.namespace !== 'vpf') {
		return;
	}

	self.initIsotope();
});

// Images Loaded.
$doc.on('imagesLoaded.vpf', (event, self) => {
	if (event.namespace !== 'vpf') {
		return;
	}

	// sometimes on iOs images failed to calculate positions, so we need this imagesLoaded event.
	// related issue: https://github.com/nk-crew/visual-portfolio/issues/55
	self.initIsotope('layout');
});

// Destroy.
$doc.on('destroy.vpf', (event, self) => {
	if (event.namespace !== 'vpf') {
		return;
	}

	self.destroyIsotope();
});

// Init events.
$doc.on('initEvents.vpf', (event, self) => {
	if (event.namespace !== 'vpf') {
		return;
	}

	// We need to resize isotope manually, since the native relayout
	// is not working properly, when container size is not changed
	// but items sizes are changed in CSS. For some reason Isotope don't relayout it.
	if (
		self.$items_wrap.isotope &&
		SUPPORTED_LAYOUTS.includes(self.options.layout)
	) {
		const evp = `.vpf-uid-${self.uid}`;

		$wnd.on(
			`resize${evp}`,
			throttle(
				100,
				rafSchd(() => {
					self.resizeIsotope();
				})
			)
		);
	}
});

// Destroy events.
$doc.on('destroyEvents.vpf', (event, self) => {
	if (event.namespace !== 'vpf') {
		return;
	}

	if (SUPPORTED_LAYOUTS.includes(self.options.layout)) {
		const evp = `.vpf-uid-${self.uid}`;

		$wnd.off(`resize${evp}`);
	}
});

// WPBakery Page Builder fullwidth row fix.
$doc.on(
	'vc-full-width-row',
	debounce(
		150,
		rafSchd((event, el) => {
			$(el)
				.find('.vp-portfolio')
				.each(function () {
					if (!this.vpf || !this.vpf.initIsotope) {
						return;
					}

					const isotope = this.vpf.$items_wrap.data('isotope');

					if (isotope) {
						this.vpf.initIsotope('layout');
					}
				});
		})
	)
);
