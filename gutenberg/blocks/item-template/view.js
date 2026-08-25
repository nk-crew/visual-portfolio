import { getElement, store } from '@wordpress/interactivity';

import { syncColumns } from './auto-columns';
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
const CAROUSEL_SELECTOR = '.wp-block-visual-portfolio-item-template__carousel';
const PROGRESS_SELECTOR =
	'.wp-block-visual-portfolio-item-template__carousel-progress';
const PLAYING_CLASS = 'vp-carousel-is-playing';
const DOT_SELECTOR = '.wp-block-visual-portfolio-item-template__carousel-dot';
const DOTS_SELECTOR = '.wp-block-visual-portfolio-item-template__carousel-dots';
const EDGE_FADE_CLASS = 'vp-carousel-edge-fade';
const MASONRY_CLASS = 'vp-layout-masonry';
const MASONRY_NATIVE_CLASS = 'vp-layout-masonry-native';

// Dispatched on the list by the family store once the router has swapped the
// region in. An event rather than a cross-store call: the two modules load
// independently and neither is guaranteed to be evaluated first.
const RELAYOUT_EVENT = 'vp-relayout';

// Listened for on the list, so that a script that is not a module of ours can
// drive a carousel - the Pro lightbox scrolls one to the slide it is showing
// and holds its autoplay while it is open.
//
// `vp-carousel-go-to`     `detail.index`   slide to rest on.
// `vp-carousel-autoplay`  `detail.playing` false holds autoplay, true releases
//                                          it. A hold, not a play button: the
//                                          pointer of the visitor still pauses
//                                          a released carousel.
const GO_TO_EVENT = 'vp-carousel-go-to';
const AUTOPLAY_EVENT = 'vp-carousel-autoplay';

// How long an arrow keeps counting from the slide the last press was headed
// for. Presses that come faster than the carousel travels are still one slide
// each, and a press after the carousel has settled counts from where it is.
const STEP_MEMORY = 700;

const noop = () => {};

const carousels = new WeakMap();

// The slide the last press asked for, per carousel.
const pending = new WeakMap();

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
 * The box the controls of a carousel belong to.
 *
 * @param {HTMLElement} list Item template list.
 *
 * @return {HTMLElement|null} Carousel element.
 */
function getCarousel(list) {
	return list.closest(CAROUSEL_SELECTOR);
}

/**
 * How far the carousel has to be scrolled for each of its slides to rest where
 * it snaps.
 *
 * Measured from the layout rather than from the rendered boxes: `offsetLeft` is
 * where a slide was laid out, and an effect that turns a card, scales it or
 * pins it with `position: sticky` never moves that. Read from the drawn
 * rectangles instead - which is what the carousel library does - and the arrows
 * of a cover flow answer with a position the slide is already at, so pressing
 * them does nothing at all.
 *
 * @param {HTMLElement} list Item template list.
 *
 * @return {number[]} Scroll distance from the start, one per slide.
 */
function getSlideTargets(list) {
	const items = Array.from(list.querySelectorAll(ITEM_SELECTOR));

	if (!items.length) {
		return [];
	}

	// The start of a carousel, not its left: on a right to left page the first
	// slide sits against the right edge, and measuring from the left one marked
	// the last slide as the current one for the whole carousel.
	const rtl = isRtl(list);
	const content = list.scrollWidth;
	const furthest = Math.max(0, content - list.clientWidth);
	// Where a slide comes to rest is the browser's answer, and these are the
	// two properties it reads it from - the alignment from the slide, the
	// padding it is held off the edge by from the container.
	const centred = window
		.getComputedStyle(items[0])
		.scrollSnapAlign.startsWith('center');
	const padding = centred
		? 0
		: parseFloat(window.getComputedStyle(list).scrollPaddingInlineStart) ||
			0;

	return items.map((item) => {
		const start = rtl
			? content - item.offsetLeft - item.offsetWidth
			: item.offsetLeft;
		const lead = centred
			? (list.clientWidth - item.offsetWidth) / 2
			: padding;

		return Math.max(0, Math.min(furthest, start - lead));
	});
}

/**
 * Index of the slide the carousel is resting on.
 *
 * @param {HTMLElement} list    Item template list.
 * @param {number[]}    targets Resting places of the slides.
 *
 * @return {number} Index of the nearest item.
 */
function getCurrentSlide(list, targets = getSlideTargets(list)) {
	const position = getScrollPosition(list);

	let nearest = 0;
	let distance = Number.POSITIVE_INFINITY;

	targets.forEach((target, index) => {
		const offset = Math.abs(target - position);

		if (offset < distance) {
			distance = offset;
			nearest = index;
		}
	});

	return nearest;
}

/**
 * Whether the carousel runs right to left.
 *
 * @param {HTMLElement} list Item template list.
 *
 * @return {boolean} True on an RTL page.
 */
function isRtl(list) {
	return 'rtl' === window.getComputedStyle(list).direction;
}

/**
 * How a carousel should travel.
 *
 * The stylesheet takes `scroll-behavior` back to `auto` under
 * `prefers-reduced-motion`, and a `behavior` passed to the scroll API outranks
 * the property - a visitor who asked for less motion still got the slide.
 *
 * @return {string} `smooth`, or `auto` where motion was asked against.
 */
function getScrollBehavior() {
	return window.matchMedia('(prefers-reduced-motion: reduce)').matches
		? 'auto'
		: 'smooth';
}

/**
 * How far the carousel has been scrolled from its own start.
 *
 * Not `scrollLeft`: a right to left carousel starts at zero and counts down
 * into negative numbers as it advances, so everything measured from the raw
 * value - the indicator, the current slide, both arrows - stayed at the start
 * for the whole carousel.
 *
 * @param {HTMLElement} list Item template list.
 *
 * @return {number} Distance from the start, never negative.
 */
function getScrollPosition(list) {
	return Math.abs(list.scrollLeft);
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

	return total > 0
		? Math.min(1, Math.max(0, getScrollPosition(list) / total))
		: 1;
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
	const position = getScrollPosition(list);
	const end = list.scrollWidth - list.clientWidth - 1;
	const repeats = 'true' === list.dataset.vpCarouselRepeat;

	// A carousel that repeats has no ends to run out of.
	const atStart = !repeats && position <= 1;
	const atEnd = !repeats && position >= end;

	if (frame) {
		const prev = frame.querySelector(
			'[data-wp-on--click="actions.carouselPrev"]'
		);
		const next = frame.querySelector(
			'[data-wp-on--click="actions.carouselNext"]'
		);

		if (prev) {
			prev.disabled = atStart;
		}

		if (next) {
			next.disabled = atEnd;
		}
	}

	// The fade is an invitation to scroll on, so the end that has been reached
	// loses it. Written by the side of the screen, which is where a mask is
	// placed - on a right to left page the start of the carousel is the right.
	if (list.classList.contains(EDGE_FADE_CLASS)) {
		const rtl = isRtl(list);

		setFade(list, 'left', rtl ? atEnd : atStart);
		setFade(list, 'right', rtl ? atStart : atEnd);
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
 * Take the fade off one side of a carousel, or give it back.
 *
 * @param {HTMLElement} list    Item template list.
 * @param {string}      side    `left` or `right`.
 * @param {boolean}     reached Whether the carousel has run out that way.
 */
function setFade(list, side, reached) {
	const property = `--vp-carousel-fade-${side}`;

	// Every scroll event asks, and all but two of them ask for the answer that
	// is already written down.
	if (reached === ('0px' === list.style.getPropertyValue(property))) {
		return;
	}

	// Removed rather than set back to a width: the stylesheet is where the
	// width of the fade is written down, and a theme that changed it there
	// keeps its answer.
	if (reached) {
		list.style.setProperty(property, '0px');
	} else {
		list.style.removeProperty(property);
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

	// Load More and a filter both change how many slides there are, and a dot
	// with no slide behind it does nothing when clicked.
	for (let index = dots.length - 1; index >= items; index -= 1) {
		dots[index].remove();
	}

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

	// A carousel that repeats has no first and no last slide to count between:
	// the endlessness is Blossom's, and so is the step through it.
	if (carousel && 'true' === list.dataset.vpCarouselRepeat) {
		if (direction > 0) {
			carousel.next();
		} else {
			carousel.prev();
		}

		return;
	}

	const targets = getSlideTargets(list);
	const held = pending.get(list);

	// A press that comes faster than the carousel travels is still one slide:
	// it counts from the slide the last press was headed for, not from the one
	// the animation happens to be passing.
	const from =
		held && window.performance.now() - held.time < STEP_MEMORY
			? held.index
			: getCurrentSlide(list, targets);

	goToSlide(list, from + direction, targets);
}

/**
 * Scroll a carousel to one of its slides.
 *
 * @param {HTMLElement} list    Item template list.
 * @param {number}      index   Slide to rest on.
 * @param {number[]}    targets Resting places of the slides.
 */
function goToSlide(list, index, targets = getSlideTargets(list)) {
	const wanted = Math.max(0, Math.min(targets.length - 1, index));

	if (!targets.length || wanted !== index) {
		return;
	}

	pending.set(list, { index: wanted, time: window.performance.now() });

	// The list is scrolled rather than the slide scrolled into view: that one
	// walks every scrollable ancestor, and the page must not move under a
	// lightbox that is showing the same item. Forwards is leftwards on a right
	// to left page, which is the sign `scrollLeft` speaks in.
	list.scrollTo({
		left: isRtl(list) ? -targets[wanted] : targets[wanted],
		behavior: getScrollBehavior(),
	});
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

	// The countdown is drawn on the dots, and the dots sit outside the frame
	// the arrows are pinned to - so it is published on the box that holds both,
	// which is also the box a visitor's pointer rests on.
	const carousel = getCarousel(list) || list;

	let start = 0;
	let raf = 0;
	let paused = false;
	// Asked for from outside, and kept apart from `paused` so that releasing it
	// does not start a carousel the pointer is resting on.
	let held = false;

	const setProgress = (value) => {
		carousel.style.setProperty(
			'--vp-carousel-autoplay-progress',
			`${value * 100}%`
		);
	};

	const tick = (now) => {
		raf = window.requestAnimationFrame(tick);

		if (paused || held) {
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
		if (
			getScrollPosition(list) >=
			list.scrollWidth - list.clientWidth - 1
		) {
			list.scrollTo({ left: 0, behavior: getScrollBehavior() });
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
	const hold = (event) => {
		held = false === event.detail?.playing;
	};

	carousel.classList.add(PLAYING_CLASS);
	carousel.addEventListener('pointerenter', pause);
	carousel.addEventListener('pointerleave', resume);
	carousel.addEventListener('focusin', pause);
	carousel.addEventListener('focusout', resume);
	list.addEventListener('pointerdown', pause);
	list.addEventListener(AUTOPLAY_EVENT, hold);

	raf = window.requestAnimationFrame((now) => {
		start = now;
		tick(now);
	});

	return () => {
		window.cancelAnimationFrame(raf);
		carousel.classList.remove(PLAYING_CLASS);
		carousel.removeEventListener('pointerenter', pause);
		carousel.removeEventListener('pointerleave', resume);
		carousel.removeEventListener('focusin', pause);
		carousel.removeEventListener('focusout', resume);
		list.removeEventListener('pointerdown', pause);
		list.removeEventListener(AUTOPLAY_EVENT, hold);
		carousel.style.removeProperty('--vp-carousel-autoplay-progress');
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
	const onGoTo = (event) => goToSlide(list, event.detail?.index);

	// The slide width is a `calc()` over the column count, which auto mode has
	// to work out from the container.
	const stopColumns = syncColumns(list, () => syncNav(list));

	syncDots(list);
	syncNav(list);

	list.addEventListener('scroll', onScroll, { passive: true });
	list.addEventListener(GO_TO_EVENT, onGoTo);

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
		list.removeEventListener(GO_TO_EVENT, onGoTo);
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

			goToSlide(list, index);
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
