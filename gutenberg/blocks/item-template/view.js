import { getElement, store } from '@wordpress/interactivity';

import { syncAutoColumns } from './auto-columns';
import { getJustifiedOptions, layoutJustified, startLayout } from './layouts';

/**
 * The layouts of the Gallery Item Template that need a browser.
 *
 * Grid and tiles are stylesheet alone and never load this module. Masonry loads
 * it only to answer one question - whether the browser lays masonry out itself -
 * and is otherwise the family store's, which is also what puts the appended
 * items of a Load More back in place. Justified and carousel are owned here end
 * to end.
 *
 * Nothing here is required for a gallery to be readable: justified falls back to
 * rows that grow on their own, and a carousel is a scroll container, which
 * swipes, scrolls and takes the keyboard with no script at all.
 */

const LIST_SELECTOR = '.wp-block-visual-portfolio-item-template';
const ITEM_SELECTOR = '.wp-block-visual-portfolio-item-template__item';
const NAV_SELECTOR = '.wp-block-visual-portfolio-item-template__carousel-nav';
const FRAME_SELECTOR =
	'.wp-block-visual-portfolio-item-template__carousel-frame';
const PROGRESS_SELECTOR =
	'.wp-block-visual-portfolio-item-template__carousel-progress';
const PLAYING_CLASS = 'vp-carousel-is-playing';
const DOT_SELECTOR = '.wp-block-visual-portfolio-item-template__carousel-dot';
const DOTS_SELECTOR = '.wp-block-visual-portfolio-item-template__carousel-dots';
const MASONRY_CLASS = 'vp-layout-masonry';
const MASONRY_NATIVE_CLASS = 'vp-layout-masonry-native';

// Dispatched on the list by the family store once the router has swapped the
// region in. An event rather than a cross-store call: the two modules load
// independently and neither is guaranteed to be evaluated first.
const RELAYOUT_EVENT = 'vp-relayout';

const noop = () => {};

const carousels = new WeakMap();

/**
 * Whether the browser packs a masonry layout without being asked twice.
 *
 * Grid Lanes shipped in Safari 26.4 and is behind a flag elsewhere, so this is a
 * browser question and stays one - the WordPress version the family requires
 * says nothing about it.
 *
 * @return {boolean} True when `display: grid-lanes` is understood.
 */
function hasNativeMasonry() {
	return !!window.CSS?.supports?.('display', 'grid-lanes');
}

const nativeMasonry = hasNativeMasonry();

// The family store starts Masonry from the `vp-layout-masonry` class, and it
// does so in an effect of the same hydration pass that applies the class
// directives on this list. Taking the class off here, while the document is
// still only parsed, settles the question before either effect runs.
if (nativeMasonry && typeof document !== 'undefined') {
	document
		.querySelectorAll(`${LIST_SELECTOR}.${MASONRY_CLASS}`)
		.forEach((list) => {
			list.classList.remove(MASONRY_CLASS);
			list.classList.add(MASONRY_NATIVE_CLASS);
		});
}

/**
 * Gap of a list, as CSS resolved it.
 *
 * Reading it back keeps the stylesheet the only place the number is written
 * down, so a theme that overrides the layout variables per breakpoint keeps
 * working.
 *
 * @param {HTMLElement} list Item template list.
 *
 * @return {number} Gap in pixels.
 */
function getGap(list) {
	const gap = window.getComputedStyle(list).columnGap;

	if (gap.endsWith('%')) {
		return (parseFloat(gap) / 100) * list.clientWidth || 0;
	}

	return parseFloat(gap) || 0;
}

/**
 * Watch a list for the items a Load More appends.
 *
 * The append is made by the family store, which knows nothing about the layouts
 * of this module, so the list itself is what reports them.
 *
 * @param {HTMLElement} list     Item template list.
 * @param {Function}    onAppend Called with the appended items.
 *
 * @return {Function} Teardown.
 */
function observeItems(list, onAppend) {
	const observer = new window.MutationObserver((mutations) => {
		const added = mutations
			.flatMap((mutation) => Array.from(mutation.addedNodes))
			.filter(
				(node) => node.nodeType === 1 && node.matches?.(ITEM_SELECTOR)
			);

		if (added.length) {
			onAppend(added);
		}
	});

	observer.observe(list, { childList: true });

	return () => observer.disconnect();
}

/**
 * Lay a justified gallery out.
 *
 * @param {HTMLElement} list Item template list.
 *
 * @return {Function} Teardown.
 */
function initJustified(list) {
	return startLayout(list, (element) =>
		layoutJustified(element, getJustifiedOptions(element))
	);
}

/**
 * The frame the arrows of a carousel are pinned to.
 *
 * @param {HTMLElement} list Item template list.
 *
 * @return {HTMLElement|null} Frame element.
 */
function getFrame(list) {
	return list.closest(FRAME_SELECTOR);
}

/**
 * Controls that belong to a carousel.
 *
 * @param {HTMLElement} list Item template list.
 *
 * @return {HTMLElement|null} Nav element, when the gallery renders one.
 */
function getNav(list) {
	const next = getFrame(list)?.nextElementSibling;

	return next && next.matches(NAV_SELECTOR) ? next : null;
}

/**
 * Index of the slide the carousel is resting on.
 *
 * @param {HTMLElement} list Item template list.
 *
 * @return {number} Index of the nearest item.
 */
function getCurrentSlide(list) {
	const items = Array.from(list.querySelectorAll(ITEM_SELECTOR));
	const edge = list.getBoundingClientRect().left;

	let nearest = 0;
	let distance = Number.POSITIVE_INFINITY;

	items.forEach((item, index) => {
		const offset = Math.abs(item.getBoundingClientRect().left - edge);

		if (offset < distance) {
			distance = offset;
			nearest = index;
		}
	});

	return nearest;
}

/**
 * How far through the carousel the scroll is, as a fraction.
 *
 * @param {HTMLElement} list Item template list.
 *
 * @return {number} Between zero and one.
 */
function getScrollProgress(list) {
	const total = list.scrollWidth - list.clientWidth;

	return total > 0 ? Math.min(1, Math.max(0, list.scrollLeft / total)) : 1;
}

/**
 * Bring the controls in line with where the carousel is.
 *
 * @param {HTMLElement} list Item template list.
 */
function syncNav(list) {
	const frame = getFrame(list);
	const nav = getNav(list);

	// Snapping never lands exactly on the edge, and a whole pixel of slack is
	// less than any scroll step.
	const end = list.scrollWidth - list.clientWidth - 1;
	const repeats = 'true' === list.dataset.vpCarouselRepeat;

	if (frame) {
		const prev = frame.querySelector(
			'[data-wp-on--click="actions.carouselPrev"]'
		);
		const next = frame.querySelector(
			'[data-wp-on--click="actions.carouselNext"]'
		);

		// A carousel that repeats has no ends to run out of.
		if (prev) {
			prev.disabled = !repeats && list.scrollLeft <= 1;
		}

		if (next) {
			next.disabled = !repeats && list.scrollLeft >= end;
		}
	}

	if (!nav) {
		return;
	}

	const dots = Array.from(nav.querySelectorAll(DOT_SELECTOR));
	const current = getCurrentSlide(list);

	dots.forEach((dot, index) => {
		dot.setAttribute('aria-current', index === current ? 'true' : 'false');
	});

	const progress = nav.querySelector(PROGRESS_SELECTOR);

	if (progress) {
		const value = getScrollProgress(list);

		progress.style.setProperty('--vp-carousel-progress', `${value * 100}%`);
		progress.setAttribute('aria-valuenow', String(Math.round(value * 100)));
	}
}

/**
 * Give a carousel as many dots as it has slides.
 *
 * @param {HTMLElement} list Item template list.
 */
function syncDots(list) {
	const nav = getNav(list);
	const container = nav && nav.querySelector(DOTS_SELECTOR);

	if (!container) {
		return;
	}

	const items = list.querySelectorAll(ITEM_SELECTOR).length;
	const dots = container.querySelectorAll(DOT_SELECTOR);
	const label = container.dataset.vpDotLabel || '';

	for (let index = dots.length; index < items; index += 1) {
		const dot = document.createElement('button');

		dot.type = 'button';
		dot.className = DOT_SELECTOR.slice(1);
		dot.dataset.vpSlide = String(index);
		dot.setAttribute('aria-label', label.replace('%d', String(index + 1)));
		dot.innerHTML =
			'<span class="wp-block-visual-portfolio-item-template__carousel-dot-progress"></span>';
		container.appendChild(dot);
	}
}

/**
 * Move a carousel by one slide.
 *
 * @param {HTMLElement} list      Item template list.
 * @param {number}      direction `1` forwards, `-1` back.
 */
function slide(list, direction) {
	const carousel = carousels.get(list);

	// Blossom knows where the snap points are; without it a slide is the width
	// of the first item, which is the width the stylesheet gave all of them.
	if (carousel) {
		if (direction > 0) {
			carousel.next();
		} else {
			carousel.prev();
		}

		return;
	}

	const item = list.querySelector(ITEM_SELECTOR);
	const step = item
		? item.getBoundingClientRect().width + getGap(list)
		: list.clientWidth;

	list.scrollBy({ left: step * direction, behavior: 'smooth' });
}

/**
 * Run a carousel on its own.
 *
 * The delay is drawn onto the indicator as it runs down, so the dot doubles as
 * the progress of the wait. Anything the visitor does with the carousel stops
 * the clock until they leave it alone again, and a visitor who asked for less
 * motion never starts one.
 *
 * @param {HTMLElement} list Item template list.
 *
 * @return {Function} Teardown.
 */
function initAutoplay(list) {
	const delay = parseFloat(list.dataset.vpCarouselAutoplay) * 1000;

	if (
		!delay ||
		window.matchMedia('(prefers-reduced-motion: reduce)').matches
	) {
		return noop;
	}

	const frame = getFrame(list) || list;

	let start = 0;
	let raf = 0;
	let paused = false;

	const setProgress = (value) => {
		frame.style.setProperty(
			'--vp-carousel-autoplay-progress',
			`${value * 100}%`
		);
	};

	const tick = (now) => {
		raf = window.requestAnimationFrame(tick);

		if (paused) {
			start = now;

			return;
		}

		const elapsed = now - start;

		setProgress(Math.min(1, elapsed / delay));

		if (elapsed < delay) {
			return;
		}

		start = now;

		// The last slide goes back to the first, so a carousel that does not
		// repeat still runs on.
		if (list.scrollLeft >= list.scrollWidth - list.clientWidth - 1) {
			list.scrollTo({ left: 0, behavior: 'smooth' });
		} else {
			slide(list, 1);
		}
	};

	const pause = () => {
		paused = true;
	};
	const resume = () => {
		paused = false;
	};

	frame.classList.add(PLAYING_CLASS);
	frame.addEventListener('pointerenter', pause);
	frame.addEventListener('pointerleave', resume);
	frame.addEventListener('focusin', pause);
	frame.addEventListener('focusout', resume);
	list.addEventListener('pointerdown', pause);

	raf = window.requestAnimationFrame((now) => {
		start = now;
		tick(now);
	});

	return () => {
		window.cancelAnimationFrame(raf);
		frame.classList.remove(PLAYING_CLASS);
		frame.removeEventListener('pointerenter', pause);
		frame.removeEventListener('pointerleave', resume);
		frame.removeEventListener('focusin', pause);
		frame.removeEventListener('focusout', resume);
		list.removeEventListener('pointerdown', pause);
		frame.style.removeProperty('--vp-carousel-autoplay-progress');
	};
}

/**
 * Start a carousel.
 *
 * @param {HTMLElement} list Item template list.
 *
 * @return {Function} Teardown.
 */
function initCarousel(list) {
	const onScroll = () => syncNav(list);

	// The slide width is a `calc()` over the column count, which auto mode has
	// to work out from the container.
	const stopColumns = syncAutoColumns(list, () => syncNav(list));

	syncDots(list);
	syncNav(list);

	list.addEventListener('scroll', onScroll, { passive: true });

	const stopObserving = observeItems(list, () => {
		syncDots(list);
		syncNav(list);
	});

	// Drag is the one thing the browser does not do for a scroll container, and
	// it is the one thing Blossom adds - so it is loaded where a pointer can
	// drag and nowhere else. A carousel that repeats is the exception: the
	// endlessness is Blossom's too, and a touch device is owed it as much as a
	// desktop one.
	const repeats = 'true' === list.dataset.vpCarouselRepeat;
	const canDrag = window.matchMedia(
		'(hover: hover) and (pointer: fine)'
	).matches;
	const source = list.dataset.vpCarouselSrc;

	if ((canDrag || repeats) && source) {
		import(/* webpackIgnore: true */ source)
			.then(({ Blossom }) => {
				if (!list.isConnected || carousels.has(list)) {
					return;
				}

				const carousel = Blossom(list, { repeat: repeats });

				carousels.set(list, carousel);
				carousel.init();
			})
			.catch(() => {
				// A carousel without drag is still a carousel.
			});
	}

	const stopAutoplay = initAutoplay(list);

	return () => {
		stopAutoplay();
		stopColumns();
		list.removeEventListener('scroll', onScroll);
		stopObserving();

		const carousel = carousels.get(list);

		if (carousel) {
			carousels.delete(list);
			carousel.destroy();
		}
	};
}

/**
 * The list a control belongs to.
 *
 * @param {HTMLElement} element Control inside the carousel nav.
 *
 * @return {HTMLElement|null} Item template list.
 */
function getListOf(element) {
	// An arrow sits inside the frame, beside the list; an indicator sits in the
	// nav after it.
	const frame =
		element.closest(FRAME_SELECTOR) ||
		element.closest(NAV_SELECTOR)?.previousElementSibling;

	return frame?.querySelector(LIST_SELECTOR) || null;
}

/**
 * Start the layout a list says it was rendered as.
 *
 * @param {HTMLElement} list Item template list.
 *
 * @return {Function|undefined} Teardown, when the layout has one.
 */
function startListLayout(list) {
	if ('justified' === list.dataset.vpLayout) {
		return initJustified(list);
	}

	if ('carousel' === list.dataset.vpLayout) {
		return initCarousel(list);
	}

	return undefined;
}

store('visual-portfolio/item-template', {
	state: {
		// Read by the markup rather than by this module: a control that only
		// works with a script is hidden until there is one.
		hasScript: true,
		useJsMasonry: !nativeMasonry,
		useNativeMasonry: nativeMasonry,
	},
	actions: {
		/**
		 * Move a carousel back one slide.
		 */
		carouselPrev() {
			const list = getListOf(getElement().ref);

			if (list) {
				slide(list, -1);
			}
		},

		/**
		 * Move a carousel on one slide.
		 */
		carouselNext() {
			const list = getListOf(getElement().ref);

			if (list) {
				slide(list, 1);
			}
		},

		/**
		 * Jump to the slide a dot names.
		 *
		 * Bound to the dot container rather than to a dot: dots are appended as
		 * a Load More brings more slides, and a node inserted after hydration
		 * carries no directives of its own.
		 *
		 * @param {Event} event Click event.
		 */
		carouselGoTo(event) {
			const { ref } = getElement();
			const dot = event.target.closest(DOT_SELECTOR);
			const list = getListOf(ref);
			const index = dot ? parseInt(dot.dataset.vpSlide, 10) : -1;

			if (!list || index < 0) {
				return;
			}

			const item = list.querySelectorAll(ITEM_SELECTOR)[index];

			if (item) {
				item.scrollIntoView({
					behavior: 'smooth',
					block: 'nearest',
					inline: 'start',
				});
			}
		},
	},
	callbacks: {
		/**
		 * Lay the items out.
		 *
		 * The list says which layout it was rendered as, so a region that comes
		 * back from the server with a different one is laid out as that one.
		 *
		 * @return {Function|undefined} Teardown, when the layout has one.
		 */
		initLayout() {
			const { ref } = getElement();

			let teardown = startListLayout(ref);

			if (!teardown) {
				return undefined;
			}

			// A region swap replaces the items but keeps the list, so this
			// callback never runs again and the layout would go on measuring
			// the page before it. The loop announces the swap.
			const relayout = () => {
				teardown();
				teardown = startListLayout(ref) || noop;
			};

			ref.addEventListener(RELAYOUT_EVENT, relayout);

			return () => {
				ref.removeEventListener(RELAYOUT_EVENT, relayout);
				teardown();
			};
		},
	},
});
