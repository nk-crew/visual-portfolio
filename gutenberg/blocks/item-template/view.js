import { getElement, store } from '@wordpress/interactivity';

import { syncColumns } from './auto-columns';
import { getJustifiedOptions, startJustified, startMasonry } from './layouts';

/**
 * The layouts of the Gallery Item Template that need a browser.
 *
 * Grid and tiles are stylesheet alone and never load this module. Justified,
 * masonry and carousel are owned here end to end.
 *
 * Nothing here is required for a gallery to be readable: justified rows and
 * masonry lanes are laid out by their stylesheet before the script runs, and a
 * carousel is a scroll container, which swipes, scrolls and takes the keyboard
 * with no script at all.
 */

const LIST_SELECTOR = '.wp-block-visual-portfolio-item-template';
const ITEM_SELECTOR = '.wp-block-visual-portfolio-item-template__item';
const FRAME_SELECTOR =
	'.wp-block-visual-portfolio-item-template__carousel-frame';

// What a carousel is steered with. Every one of them is a block of its own and
// can be dropped anywhere inside the loop - under the gallery, above it, in a
// row beside the heading, an arrow on either side of the dots - so the loop is
// what a control and the list it drives have in common, and it is the box
// everything about a running carousel is published on.
const LOOP_SELECTOR = '.vp-block-loop';
const CONTROL_SELECTOR = '[data-vp-carousel-control]';
const PREV_SELECTOR = '.vp-block-loop-carousel-previous';
const NEXT_SELECTOR = '.vp-block-loop-carousel-next';
const DOTS_SELECTOR = '.vp-block-loop-carousel-indicator--dots';
const DOT_SELECTOR = '.vp-block-loop-carousel-dot';
// What every control that names a slide carries: a dot, and the thumbnails a
// carousel can be steered by. The two are the same control - a row of buttons
// that name a slide index and light the one the carousel rests on - so the
// click and the sweep that lights them are written once, against what they
// name rather than against what they look like.
const SLIDE_TARGET_SELECTOR = '[data-vp-slide]';
const DOT_PROGRESS_CLASS = 'vp-block-loop-carousel-dot-progress';
// An indicator showing a window of its dots rather than all of them, and the
// two states a dot takes as it reaches the edge of that window.
const DOTS_COLLAPSED_CLASS = 'is-collapsed';
const DOT_EDGE_CLASS = 'is-edge';
const DOT_EDGE_FAR_CLASS = 'is-edge-far';
const DOTS_SHIFT_PROPERTY = '--vp-carousel-dots-shift';
const PROGRESS_SELECTOR = '.vp-block-loop-carousel-indicator--progress';
// A bar the visitor may take hold of. One that may not is a plain progress
// bar: it says where the carousel is and answers for nothing.
const SCRUB_SELECTOR =
	'.vp-block-loop-carousel-indicator--progress.is-draggable';
const AUTOPLAY_SELECTOR = '[data-vp-carousel-control="autoplay"]';
const SCRUBBING_CLASS = 'vp-carousel-is-scrubbing';
// A slide that is not the start of a group, and so not a place a swipe comes
// to rest on when the arrows move a frame at a time.
const NO_SNAP_CLASS = 'vp-carousel-no-snap';
const THUMBS_SELECTOR = '.vp-block-loop-carousel-thumbnails';
const THUMB_SELECTOR = '.vp-block-loop-carousel-thumb';
const STOPPED_CLASS = 'vp-carousel-is-stopped';
const COUNTER_SELECTOR = '.vp-block-loop-carousel-indicator--counter';
const COUNTER_CURRENT_SELECTOR = '.vp-block-loop-carousel-counter-current';
const COUNTER_TOTAL_SELECTOR = '.vp-block-loop-carousel-counter-total';

// Taken off a control once a carousel is running for it to move. The server
// renders every control with it: they all drive the scroll container through
// the scroll API, there is nothing to fall back to when that API has nobody
// calling it, and a control that ended up beside a grid never loses it.
const IDLE_CLASS = 'vp-carousel-control-idle';
const PLAYING_CLASS = 'vp-carousel-is-playing';
const MOVED_ROUND_CLASS = 'vp-carousel-moved-round';
// The scroll ranges a moved slide is in view for, written on the slide.
const COPY_COVER_PROPERTY = '--vp-carousel-copy-cover';
const COPY_CONTAIN_PROPERTY = '--vp-carousel-copy-contain';
const EDGE_FADE_CLASS = 'vp-carousel-edge-fade';

// Dispatched on the list by the family store once the router has swapped the
// region in. An event rather than a cross-store call: the two modules load
// independently and neither is guaranteed to be evaluated first.
const RELAYOUT_EVENT = 'vp-relayout';

// Listened for on the list, so that a script that is not a module of ours can
// drive a carousel - the Pro lightbox scrolls one to the slide it is showing
// and holds its autoplay while it is open.
//
// `vp-carousel-go-to`     `detail.index`   slide to rest on.
//                         `detail.behavior: 'instant'` moves there before
//                                          the command returns.
// `vp-carousel-autoplay`  `detail.playing` false holds autoplay, true releases
//                                          it. A hold, not a play button: the
//                                          pointer of the visitor still pauses
//                                          a released carousel.
// `vp-carousel-place`     `detail.position` a place on the clock of a
//                                          repeating carousel, scrolled to at
//                                          once. Written back as the
//                                          resulting scroll position.
// `vp-carousel-autoplay-take`              the autoplay stops moving the
//                                          carousel itself and hands each
//                                          frame it would have run to the
//                                          script that took it.
const GO_TO_EVENT = 'vp-carousel-go-to';
const AUTOPLAY_EVENT = 'vp-carousel-autoplay';
const PLACE_EVENT = 'vp-carousel-place';
const AUTOPLAY_TAKE_EVENT = 'vp-carousel-autoplay-take';

// Dispatched on the list, and bubbling, once the module runs a carousel and
// again just before it lets go of one - so that a script that is not a module
// of ours can run alongside it for as long as it runs. `timelines.js` keeps
// the timelines of an effect by hand on this pair where the browser has none.
//
// `vp-carousel-start`  the carousel is running.
// `vp-carousel-stop`   it is about to be torn down.
const START_EVENT = 'vp-carousel-start';
const STOP_EVENT = 'vp-carousel-stop';

// Dispatched on the list, so that a script moving the carousel as well keeps
// out of the way of the module.
//
// `vp-carousel-travel-start`  a command is about to move a repeating track.
// `vp-carousel-travel-end`    the movement has settled.
// `vp-carousel-autoplay-frame` a frame of a taken autoplay: `detail.elapsed`
//                             in milliseconds, `detail.held` - stopped by the
//                             visitor, held by a script, off the screen or
//                             under the keyboard - `detail.pointer` when the
//                             pointer rests on the carousel, and
//                             `detail.keyboard` when the keyboard has it.
const TRAVEL_START_EVENT = 'vp-carousel-travel-start';
const TRAVEL_END_EVENT = 'vp-carousel-travel-end';
const AUTOPLAY_FRAME_EVENT = 'vp-carousel-autoplay-frame';

// Dispatched on the list by a press on an arrow or a dot. Autoplay starts
// its wait over on it: a visitor who has just chosen a slide is owed a whole
// delay on it, not whatever was left of the last one.
const STEP_EVENT = 'vp-carousel-step';

// How long an arrow keeps counting from the slide the last press was headed
// for. Presses that come faster than the carousel travels are still one slide
// each, and a press after the carousel has settled counts from where it is.
const STEP_MEMORY = 700;

// How long the slide a press asked for stays the current one before the
// position is read again - long enough for the carousel to get there.
const STEP_HOLD = 1200;

const noop = () => {};

const carousels = new WeakMap();
const connectedThumbnails = new WeakSet();
const travel = new WeakMap();
const SNAP_TYPE_PROPERTY = 'scroll-snap-type';

// The destination of an explicit step or a snap prediction, per carousel.
const pending = new WeakMap();

// Carousels a visitor has stopped. Kept apart from the hold an outside script
// asks for - the Pro lightbox holds autoplay while it is open - because
// releasing that hold must not start a carousel the visitor pressed stop on.
const stopped = new WeakSet();

// Carousels that asked to repeat, whether or not they had the slides for it
// the last time they were started: a Load More may bring the rest.
const askedToRepeat = new WeakSet();

// The slide a dot window was last drawn for, per indicator. Sliding the dots
// under the window is the one thing here that has to measure, so it is done
// when the slide changes and not on every frame of a scroll.
const dotWindows = new WeakMap();

// Indicators already listening for a dot of theirs taking focus.
const watched = new WeakSet();

// The slides a carousel can come to rest on, per carousel. One per slide
// unless the arrows move a frame at a time, in which case the slides between
// one frame and the next are scrolled past and are not places at all.
const restingPlaces = new WeakMap();

const POINTER_FOCUS_CLASS = 'vp-carousel-pointer-focus';

// The keys that are pressed on the way to another key, and ask nothing of
// the carousel on their own.
const MODIFIER_KEYS = new Set([
	'Alt',
	'AltGraph',
	'CapsLock',
	'Control',
	'Fn',
	'Meta',
	'NumLock',
	'OS',
	'ScrollLock',
	'Shift',
	'Symbol',
]);

function markMovedRound(list) {
	const mark = (item) => {
		const moved =
			parseFloat(item.style.getPropertyValue('--re-carousel-shift')) || 0;

		item.classList.toggle(MOVED_ROUND_CLASS, !!moved);

		if (!moved) {
			item.style.removeProperty(COPY_COVER_PROPERTY);
			item.style.removeProperty(COPY_CONTAIN_PROPERTY);

			return;
		}

		// Where the slide is drawn, in the scroll's own coordinates, and the
		// two ranges a view timeline knows: `cover`, from the slide's first
		// edge entering the box to its last edge leaving it, and `contain`,
		// from the whole slide being inside to its first edge leaving. The
		// box is the list inset by what the effect asks for - on the item,
		// which is where the effects name their view timeline.
		const inset =
			parseFloat(window.getComputedStyle(item).viewTimelineInset) || 0;
		const start = item.offsetLeft + moved;
		const end = start + item.offsetWidth;
		const box = list.clientWidth;

		item.style.setProperty(
			COPY_COVER_PROPERTY,
			`${start - box + inset}px ${end - inset}px`
		);
		item.style.setProperty(
			COPY_CONTAIN_PROPERTY,
			`${end - box + inset}px ${start - inset}px`
		);
	};

	const observer = new window.MutationObserver((mutations) => {
		new Set(mutations.map(({ target }) => target)).forEach((item) => {
			if (item.parentElement === list && item.matches(ITEM_SELECTOR)) {
				mark(item);
			}
		});
	});

	getItems(list).forEach(mark);
	observer.observe(list, {
		attributes: true,
		attributeFilter: ['data-re-cycle'],
		subtree: true,
	});

	return () => {
		observer.disconnect();
		getItems(list).forEach((item) => {
			item.classList.remove(MOVED_ROUND_CLASS);
			item.style.removeProperty(COPY_COVER_PROPERTY);
			item.style.removeProperty(COPY_CONTAIN_PROPERTY);
		});
	};
}

function getItems(list) {
	return Array.from(list.children).filter((item) =>
		item.matches(ITEM_SELECTOR)
	);
}

function getLoopRange(list) {
	const items = getItems(list);
	const first = items[0];
	const last = items.at(-1);

	if (!first || !last) {
		return { start: 0, length: 0 };
	}

	const style = window.getComputedStyle(list);
	const length = last.offsetLeft - first.offsetLeft;
	const lead =
		'center' === first.style.scrollSnapAlign
			? (list.clientWidth - first.offsetWidth) / 2
			: parseFloat(style.scrollPaddingInlineStart) || 0;

	return {
		start: first.offsetLeft - lead,
		length:
			length +
			('center' === first.style.scrollSnapAlign
				? (last.offsetWidth - first.offsetWidth) / 2
				: 0),
	};
}

function isRepeating(list) {
	return 'true' === list.dataset.vpCarouselRepeat;
}

/**
 * Scroll a carousel to a position measured from its own start.
 *
 * @param {HTMLElement} list     Item template list.
 * @param {number}      position Distance from the start.
 * @param {string}      behavior How to get there. The smooth scroll a visitor
 *                               asked for by default; `instant` for a move
 *                               that is following a finger.
 */
function scrollListTo(list, position, behavior = getScrollBehavior()) {
	// The list is scrolled rather than the slide scrolled into view: that one
	// walks every scrollable ancestor, and the page must not move under a
	// lightbox that is showing the same item. Forwards is leftwards on a right
	// to left page, which is the sign `scrollLeft` speaks in.
	list.scrollTo({
		left: isRtl(list) ? -position : position,
		behavior,
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
	return startJustified(list, getJustifiedOptions(list));
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
 * The box the controls of a carousel are published on.
 *
 * The loop is the one ancestor a control and its list are guaranteed to share,
 * and it is also the region the router replaces - so a class or a custom
 * property written here comes back with the gallery after a navigation.
 *
 * @param {HTMLElement} list Item template list.
 *
 * @return {HTMLElement} Loop element, or the nearest box there is.
 */
function getControlsRoot(list) {
	return list.closest(LOOP_SELECTOR) || getFrame(list) || list;
}

/**
 * The controls this carousel is steered with.
 *
 * @param {HTMLElement} list Item template list.
 *
 * @return {HTMLElement[]} Control blocks of the gallery.
 */
function getControls(list) {
	return Array.from(getControlsRoot(list).querySelectorAll(CONTROL_SELECTOR));
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
	const items = getItems(list);

	if (!items.length) {
		return [];
	}

	// The start of a carousel, not its left: on a right to left page the first
	// slide sits against the right edge, and measuring from the left one marked
	// the last slide as the current one for the whole carousel. The browsers
	// count an RTL list's `offsetLeft` from its right edge, the overflow
	// running negative, so a slide starts where the list's width leaves it.
	const rtl = isRtl(list);
	const furthest = Math.max(0, list.scrollWidth - list.clientWidth);
	// Where a slide comes to rest is the browser's answer, and these are the
	// two properties it reads it from - the alignment from the slide, the
	// padding it is held off the edge by from the container.
	const centred = items.some((item) =>
		window.getComputedStyle(item).scrollSnapAlign.includes('center')
	);
	const padding = centred
		? 0
		: parseFloat(window.getComputedStyle(list).scrollPaddingInlineStart) ||
			0;

	return items.map((item) => {
		const start = rtl
			? list.clientWidth - item.offsetLeft - item.offsetWidth
			: item.offsetLeft;
		const lead = centred
			? (list.clientWidth - item.offsetWidth) / 2
			: padding;

		const place = Math.max(0, Math.min(furthest, start - lead));

		// Three rounded numbers under RTL, one in LTR, so a place can fall up
		// to a pixel and a half short of the end - and the snap put the list
		// back at the end on every step towards the start. No step is two
		// pixels long, so a place that close is the end.
		return furthest - place < 2 ? furthest : place;
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
function getCurrentSlide(list, targets) {
	const carousel = carousels.get(list);

	if (carousel) {
		return carousel.getState().index;
	}

	targets ??= getSlideTargets(list);

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
	// A carousel that repeats has no scroll to be a fraction of: its scroll
	// is a clock, and a bar reading it ran from a quarter on the first slide
	// to an eighth on the last. The slide on screen over the count is what a
	// bar of a loop can honestly say - so a press or a drag on the bar lands
	// where the bar showed it.
	if (isRepeating(list)) {
		const count = getItems(list).length;

		return count > 1 ? getDisplayedSlide(list) / (count - 1) : 1;
	}

	const total = list.scrollWidth - list.clientWidth;

	return total > 0
		? Math.min(1, Math.max(0, getScrollPosition(list) / total))
		: 1;
}

/**
 * Bring the controls in line with where the carousel is.
 *
 * Every control of the gallery, wherever it was put: a gallery is free to draw
 * two indicators, or an arrow on either side of its heading, and all of them
 * say the same thing about the same carousel.
 *
 * @param {HTMLElement} list Item template list.
 */
function syncNav(list, updateDots = true) {
	const root = getControlsRoot(list);

	// Snapping never lands exactly on the edge, and a whole pixel of slack is
	// less than any scroll step.
	const position = getScrollPosition(list);
	const end = list.scrollWidth - list.clientWidth - 1;
	const repeats = isRepeating(list);

	// A carousel that repeats has no ends to run out of.
	const state = carousels.get(list)?.getState();
	const atStart = state ? !state.canPrev : !repeats && position <= 1;
	const atEnd = state ? !state.canNext : !repeats && position >= end;

	root.querySelectorAll(PREV_SELECTOR).forEach((prev) => {
		prev.disabled = atStart;
	});

	root.querySelectorAll(NEXT_SELECTOR).forEach((next) => {
		next.disabled = atEnd;
	});

	// The fade is an invitation to scroll on, so the end that has been reached
	// loses it. Written by the side of the screen, which is where a mask is
	// placed - on a right to left page the start of the carousel is the right.
	if (list.classList.contains(EDGE_FADE_CLASS)) {
		const rtl = isRtl(list);

		setFade(list, 'left', rtl ? atEnd : atStart);
		setFade(list, 'right', rtl ? atStart : atEnd);
	}

	syncIndicators(list, root, updateDots);
}

/**
 * The slide a carousel is showing as its current one.
 *
 * The slide a press asked for is the current one from the press on: the ones
 * the carousel passes on its way there are not visited, and the one pressed is
 * the one lit. Once the carousel has had time to arrive, the position answers
 * again - which is also what a drag reads.
 *
 * @param {HTMLElement} list Item template list.
 *
 * @return {number} Index of the slide, from zero.
 */
function getDisplayedSlide(list) {
	const held = pending.get(list);

	return held && window.performance.now() - held.time < STEP_HOLD
		? held.index
		: getCurrentSlide(list);
}

/**
 * Bring every indicator of a carousel in line with where it is.
 *
 * Dots, the counter and the progress bar are three drawings of the same pair
 * of numbers, and the thumbnails are the dots with pictures - so all of them
 * are answered in one place, from one reading of the position.
 *
 * @param {HTMLElement} list Item template list.
 * @param {HTMLElement} root Box the controls of the carousel are published on.
 */
function syncIndicators(list, root = getControlsRoot(list), updateDots = true) {
	const current = getDisplayedSlide(list);
	const total = getItems(list).length;

	root.querySelectorAll(SLIDE_TARGET_SELECTOR).forEach((target) => {
		if (
			target.matches(DOT_SELECTOR) ||
			connectedThumbnails.has(target.closest(THUMBS_SELECTOR))
		) {
			return;
		}

		const index = parseInt(target.dataset.vpSlide, 10);

		target.setAttribute(
			'aria-current',
			index === current ? 'true' : 'false'
		);
	});

	const places = getRestingPlaces(list);

	if (updateDots) {
		root.querySelectorAll(DOTS_SELECTOR).forEach((container) => {
			syncDotRow(container, current, places);
		});
	}

	root.querySelectorAll(THUMBS_SELECTOR).forEach((strip) => {
		if (!connectedThumbnails.has(strip)) {
			showThumb(strip, current);
		}
	});

	// Counted from one, the way a visitor counts. A carousel that repeats is
	// already counted round its seam by `getCurrentSlide`.
	root.querySelectorAll(COUNTER_SELECTOR).forEach((counter) => {
		setText(counter, COUNTER_CURRENT_SELECTOR, current + 1);
		setText(counter, COUNTER_TOTAL_SELECTOR, total);
	});

	const value = getScrollProgress(list);

	root.querySelectorAll(PROGRESS_SELECTOR).forEach((progress) => {
		progress.style.setProperty('--vp-carousel-progress', `${value * 100}%`);
		progress.setAttribute('aria-valuenow', String(Math.round(value * 100)));

		// The number is a percentage, which says nothing on its own. What a
		// visitor is told is the slide it stands for.
		const label = progress.dataset.vpPositionLabel;

		if (label) {
			progress.setAttribute(
				'aria-valuetext',
				label
					.replace('%1$d', String(current + 1))
					.replace('%2$d', String(total))
			);
		}
	});
}

/**
 * Write a number into one half of a counter, and only when it has changed.
 *
 * @param {HTMLElement} counter  Indicator drawn as a counter.
 * @param {string}      selector Half of it to write.
 * @param {number}      value    Number to write.
 */
function setText(counter, selector, value) {
	const box = counter.querySelector(selector);
	const text = String(value);

	if (box && box.textContent !== text) {
		box.textContent = text;
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
 * Give every indicator of a carousel as many dots as it has slides.
 *
 * @param {HTMLElement} list Item template list.
 */
function syncDots(list) {
	const places = getRestingPlaces(list);

	getControlsRoot(list)
		.querySelectorAll(DOTS_SELECTOR)
		.forEach((container) => {
			fillDots(container, places);
		});
}

/**
 * Give one indicator its dots.
 *
 * The block renders the row empty: how many slides there are is the item
 * template's answer and not the indicator's - the two are siblings - and Load
 * More and a filter both change the count after the page was rendered anyway.
 *
 * @param {HTMLElement} container Indicator drawn as dots.
 * @param {number[]}    places    Slides the carousel can come to rest on.
 */
function fillDots(container, places) {
	const dots = container.querySelectorAll(DOT_SELECTOR);
	const label = container.dataset.vpDotLabel || '';
	const items = places.length;
	container.style.setProperty('--vp-carousel-dots-count', String(items));

	// A dot with nowhere behind it does nothing when pressed.
	for (let index = dots.length - 1; index >= items; index -= 1) {
		dots[index].remove();
	}

	for (let index = dots.length; index < items; index += 1) {
		const dot = document.createElement('button');

		dot.type = 'button';
		dot.className = DOT_SELECTOR.slice(1);
		dot.innerHTML = `<span class="vp-block-loop-carousel-dot-value" aria-hidden="true"><span class="${DOT_PROGRESS_CLASS}"></span></span>`;
		container.appendChild(dot);
	}

	// Named after the slide each one goes to, which is not its own place in
	// the row when the arrows move a frame at a time.
	container.querySelectorAll(DOT_SELECTOR).forEach((dot, index) => {
		const slide = places[index];

		dot.dataset.vpSlide = String(slide);
		dot.setAttribute('aria-label', label.replace('%d', String(slide + 1)));
	});
}

/**
 * Use settled dot widths while the collapsed window is animating.
 *
 * @param {HTMLElement} container Indicator drawn as dots.
 * @param {number}      count     Number of dots.
 * @return {Object} Dot centres and total row width.
 */
function getDotGeometry(container, count, current) {
	const style = window.getComputedStyle(container);
	const slot =
		parseFloat(style.getPropertyValue('--vp-carousel-dot-slot')) || 18;
	const size =
		parseFloat(style.getPropertyValue('--vp-carousel-dot-size')) || 6;
	const grown =
		parseFloat(style.getPropertyValue('--vp-carousel-dot-active-size')) ||
		slot;
	const spread = Math.max(0, (grown - size) / 2);
	const inset = parseFloat(style.paddingInlineStart) || 0;
	const endInset = parseFloat(style.paddingInlineEnd) || 0;
	const stepOf = (at) =>
		at < current ? 0 : at === current ? spread : spread * 2;

	return {
		centreOf: (at) => inset + at * slot + slot / 2 + stepOf(at),
		content: count * slot + spread * 2 + inset + endInset,
	};
}

/**
 * Let a swipe rest where an arrow would leave the carousel.
 *
 * A carousel whose arrows move a whole frame should answer a finger the same
 * way - otherwise the two disagree about what a step is, and a swipe lands
 * between two frames. Only the slides that begin a group keep their snap; the
 * rest are scrolled past.
 *
 * @param {HTMLElement} list Item template list.
 */
function syncSnapGroups(list) {
	const items = getItems(list);

	if (!items.length) {
		restingPlaces.delete(list);

		return;
	}

	const targets = getSlideTargets(list);
	const group = getGroupSize(list, targets, 0);
	const repeats = isRepeating(list);
	const last = items.length - 1;
	const places = [];

	items.forEach((item, index) => {
		// The last slide keeps its snap whatever the step is. Snapping is
		// mandatory, so a carousel can only come to rest where a slide says it
		// may - and a gallery whose slide count is not a whole number of
		// frames would otherwise be pulled back from its own end. A carousel
		// that repeats has no end to be pulled back from: its places are the
		// group starts alone, and the step after the last of them is the
		// first again.
		const rests = 0 === index % group || (!repeats && index === last);

		item.classList.toggle(NO_SNAP_CLASS, group > 1 && !rests);

		// A place is somewhere the carousel comes to rest. Stepping a frame at
		// a time, the last slides all rest where the scroll runs out, and the
		// end of the row is one place however many of them are standing in it.
		// Stepping one slide at a time every slide keeps its own dot, which is
		// what a carousel has always drawn. The scroll of a loop runs out
		// nowhere, so every group start of one is a place of its own.
		const before = places[places.length - 1];

		if (
			rests &&
			(repeats ||
				1 === group ||
				undefined === before ||
				targets[index] !== targets[before])
		) {
			places.push(index);
		}
	});

	restingPlaces.set(list, places);
}

/**
 * The slides a carousel can come to rest on.
 *
 * One per slide for a carousel that steps one at a time, and one per frame for
 * a carousel that steps a frame - which is what its dots have to name, since a
 * dot for a slide it cannot stop at is a dot that does nothing when pressed.
 *
 * @param {HTMLElement} list Item template list.
 *
 * @return {number[]} Slide indexes, in order.
 */
function getRestingPlaces(list) {
	const state = carousels.get(list)?.getState();

	if (state && list.dataset.vpCarouselGroup) {
		return state.pages;
	}

	const places = restingPlaces.get(list);

	if (places) {
		return places;
	}

	return getItems(list).map((item, index) => index);
}

/**
 * Bring the thumbnail of the slide on screen into view inside its strip.
 *
 * The strip scrolls itself rather than the page: `scrollIntoView` walks every
 * scrollable ancestor, and the page must not move under a lightbox that is
 * showing the same item - the same reason the carousel is scrolled by position
 * and not by slide.
 *
 * @param {HTMLElement} strip   Row of thumbnails.
 * @param {number}      current Slide the carousel is showing.
 */
function showThumb(strip, current) {
	if (dotWindows.get(strip) === current) {
		return;
	}

	dotWindows.set(strip, current);

	const thumb = strip.querySelectorAll(THUMB_SELECTOR)[current];

	if (!thumb || strip.scrollWidth <= strip.clientWidth) {
		return;
	}

	// Measured against the strip itself, which is why the stylesheet positions
	// it: `offsetLeft` answers for the nearest positioned ancestor, and an
	// unpositioned strip handed back a distance from the frame the carousel
	// scrolls in - so the thumbnail brought into view was never the right one.
	//
	// On a right to left page the strip starts at its right and its scroll
	// runs from zero to minus the overflow - and its `offsetLeft` runs negative
	// the same way, so the thumbnail is centred by the same sum, held to the
	// range the other side of zero.
	const centre = thumb.offsetLeft + thumb.offsetWidth / 2;
	const furthest = strip.scrollWidth - strip.clientWidth;
	const wanted = centre - strip.clientWidth / 2;
	const left = isRtl(strip)
		? Math.max(-furthest, Math.min(0, wanted))
		: Math.max(0, Math.min(furthest, wanted));

	strip.scrollTo({ left, behavior: getScrollBehavior() });
}
/**
 * Bring a row of dots in line with the slide the carousel is showing.
 *
 * A row given a window slides under it. Every dot stays in the page: each
 * one is still a button naming a slide, still reachable by keyboard and still
 * carrying the label a screen reader reads.
 *
 * @param {HTMLElement} container Indicator drawn as dots.
 * @param {number}      current   Slide the carousel is showing.
 */
function syncDotRow(container, current, places) {
	const dots = container.querySelectorAll(DOT_SELECTOR);

	if (!dots.length) {
		return;
	}

	// Which dot the carousel is resting under. Not the slide's own number: a
	// carousel that steps a frame at a time has a dot per frame, and the slides
	// in between are named by the dot of the frame they belong to.
	let at = 0;

	places.forEach((slide, index) => {
		if (slide <= current) {
			at = index;
		}
	});

	dots.forEach((dot, index) => {
		dot.setAttribute('aria-current', index === at ? 'true' : 'false');
	});

	const max = parseInt(container.dataset.vpMaxDots, 10) || 0;
	const collapsed = max > 0 && dots.length > max;
	const geometry = getDotGeometry(container, dots.length, at);

	// A row that fits is a plain row: no window, no shift, and no classes left
	// behind by a gallery that had more slides a moment ago.
	if (!collapsed) {
		container.classList.remove(DOTS_COLLAPSED_CLASS);
		container.style.removeProperty(DOTS_SHIFT_PROPERTY);
		dots.forEach((dot) => {
			dot.classList.remove(DOT_EDGE_CLASS, DOT_EDGE_FAR_CLASS);
		});
		dotWindows.delete(container);

		return;
	}

	container.classList.add(DOTS_COLLAPSED_CLASS);

	// The window is drawn around the dot the visitor has tabbed to, when there
	// is one, and around the slide on screen otherwise.
	//
	// A press on a dot sets the carousel scrolling, and the scroll goes on
	// reporting where it has reached for as long as it takes to get there - so
	// a focus that landed while one was still settling had the row pulled back
	// out from under it a frame later, and the ring was drawn on a dot nobody
	// could see. Which is the one thing the window is here to prevent.
	const held = container.querySelector(`${DOT_SELECTOR}:focus-visible`);
	const middle = held ? Array.prototype.indexOf.call(dots, held) : at;

	if (!watched.has(container)) {
		watched.add(container);

		// A dot the window has moved past is still a button in the page, so
		// tabbing to it brings it back under the window - the alternative is a
		// focus ring drawn on something nobody can see. The window alone
		// moves: the active dot stays with the slide on screen,
		// which a focus has not changed.
		//
		// Only for a visitor arriving by keyboard. A press gives the dot focus
		// too, and moving the row then took the dot out from under the pointer
		// between pressing and letting go - so the press never became a click
		// and the carousel did not move.
		container.addEventListener('focusin', (event) => {
			const dot = event.target.closest(DOT_SELECTOR);

			if (!dot?.matches(':focus-visible')) {
				return;
			}

			const row = container.querySelectorAll(DOT_SELECTOR);
			const lit = Math.max(
				0,
				Array.prototype.findIndex.call(
					row,
					(each) => 'true' === each.getAttribute('aria-current')
				)
			);

			shiftDotWindow(
				container,
				getDotGeometry(container, row.length, lit),
				Array.prototype.indexOf.call(row, dot)
			);
		});
	}

	shiftDotWindow(container, geometry, middle);
}

/**
 * Slide a collapsed row of dots so that one of them sits under its window.
 *
 * @param {HTMLElement} container Indicator drawn as dots.
 * @param {Object}      geometry  Where the dots come to rest.
 * @param {number}      middle    Dot the window is drawn around.
 */
function shiftDotWindow(container, geometry, middle) {
	const dots = container.querySelectorAll(DOT_SELECTOR);
	const width = container.clientWidth;

	// A row that is not drawn yet - the controls wake after the first sync -
	// has no window to centre, and a shift worked out for it would stick.
	if (!width || dotWindows.get(container) === middle) {
		return;
	}

	dotWindows.set(container, middle);

	const { centreOf, content } = geometry;

	// Centred, but never pulled away from either end: the first dots sit at the
	// start of the window and the last ones at its end, as they would in a row
	// that was never collapsed.
	const shift = Math.round(
		Math.min(0, Math.max(width - content, width / 2 - centreOf(middle)))
	);

	container.style.setProperty(DOTS_SHIFT_PROPERTY, `${shift}px`);

	// Only an edge with dots behind it shrinks them. At the start of the row
	// the first dot is the first there is, and shrinking it would say there
	// are earlier slides.
	const more = [shift < 0, shift > width - content];

	// Which dots the window shows.
	const shown = [];

	dots.forEach((ignored, at) => {
		const centre = centreOf(at) + shift;

		if (centre >= 0 && centre <= width) {
			shown.push(at);
		}
	});

	dots.forEach((dot, at) => {
		const place = shown.indexOf(at);
		// How far in from either end of the window a dot sits, for an end that
		// has more dots behind it. A ladder of two steps: the dot at the edge
		// is the smallest, the one beside it is bigger, and everything nearer
		// the middle is drawn whole - which the dot the window is drawn around
		// always is, since the window is centred on it.
		const rank =
			at === middle || place < 0
				? place < 0
					? -1
					: Number.POSITIVE_INFINITY
				: Math.min(
						more[0] ? place : Number.POSITIVE_INFINITY,
						more[1]
							? shown.length - 1 - place
							: Number.POSITIVE_INFINITY
					);

		dot.classList.toggle(DOT_EDGE_CLASS, 1 === rank);
		dot.classList.toggle(DOT_EDGE_FAR_CLASS, rank <= 0);
	});
}

/**
 * The slide a press steps to.
 *
 * Not simply the next one along. A centred carousel would have to scroll past
 * its own start to bring its first slides to the middle, and past its end for
 * the last ones - so each of those rests where the scroll is clamped to, which
 * is where a carousel sitting at either end already is. Stepping onto one asks
 * it to stay exactly where it is, and since it never moves, every further press
 * asks the same thing again: the arrows do nothing for as long as they are
 * pressed. The slides that rest where this one does are stepped over.
 *
 * @param {number[]} targets   Resting places of the slides.
 * @param {number}   from      Slide the press counts from.
 * @param {number}   direction `1` forwards, `-1` back.
 *
 * @return {number} Slide to rest on, off the end when the carousel has run out
 *                  of places to go that way.
 */
function getNextSlide(targets, from, direction) {
	let index = from + direction;

	while (
		index >= 0 &&
		index < targets.length &&
		targets[index] === targets[from]
	) {
		index += direction;
	}

	return index;
}

/**
 * How many slides an arrow moves at a press.
 *
 * One by default, which is what a carousel has always done. A number is that
 * many, and never more than a screenful: the columns step down as the screen
 * narrows, and three slides a press on a phone that shows one would skip two
 * nobody saw. Zero is a whole screen.
 *
 * @param {HTMLElement} list    Item template list.
 * @param {number[]}    targets Resting places of the slides.
 * @param {number}      from    Slide the press counts from.
 *
 * @return {number} Slides to move, at least one.
 */
function getGroupSize(list, targets, from) {
	const asked = parseInt(list.dataset.vpCarouselGroup, 10);

	if (!Number.isInteger(asked)) {
		return 1;
	}

	if (asked >= 1) {
		return Math.min(asked, getSlidesOnScreen(list, targets));
	}

	return getScreenful(list, targets, from);
}

/**
 * How many whole slides the frame shows.
 *
 * The column count where there is one: the slide next to the peek is only
 * partly on screen, and measuring would count it. Slides of their own width
 * have no count, so those are measured from the first slide, the way the snap
 * groups are.
 *
 * @param {HTMLElement} list    Item template list.
 * @param {number[]}    targets Resting places of the slides.
 *
 * @return {number} Slides, at least one.
 */
function getSlidesOnScreen(list, targets) {
	if (list.classList.contains('vp-carousel-auto-width')) {
		return getScreenful(list, targets, 0);
	}

	const view = list.ownerDocument.defaultView || window;
	const columns = parseInt(
		view
			.getComputedStyle(list)
			.getPropertyValue('--vp-layout-current-columns'),
		10
	);

	return Math.max(1, columns || 1);
}

/**
 * How many slides fill the frame.
 *
 * Measured rather than counted: a carousel whose slides are their own width
 * has no count of slides that means a screenful.
 *
 * @param {HTMLElement} list    Item template list.
 * @param {number[]}    targets Resting places of the slides.
 * @param {number}      from    Slide the screen starts at.
 *
 * @return {number} Slides on the screen, at least one.
 */
function getScreenful(list, targets, from) {
	const width = list.clientWidth;

	// The slide a screen further along, measured rather than counted, so that
	// slides of unequal width step by what is actually on screen.
	const origin = targets[Math.max(0, Math.min(targets.length - 1, from))];

	for (let index = from + 1; index < targets.length; index += 1) {
		if (Math.abs(targets[index] - origin) >= width) {
			return index - from;
		}
	}

	return Math.max(1, targets.length - 1 - from);
}

/**
 * The slide a press steps to when an arrow moves a whole frame.
 *
 * Clamped to the ends rather than allowed off them: a carousel of ten slides
 * stepping three at a time reaches the eighth, and asking for the eleventh
 * would be refused - the arrow would die two slides early with a whole screen
 * still to see.
 *
 * @param {number[]} targets   Resting places of the slides.
 * @param {number}   from      Slide the press counts from.
 * @param {number}   direction `1` forwards, `-1` back.
 * @param {number}   group     Slides a press moves.
 *
 * @return {number} Slide to rest on, off the end when there is nowhere to go.
 */
function getGroupSlide(targets, from, direction, group) {
	const wanted = from + direction * group;

	// Nowhere left to go that way: answered off the end, the way `getNextSlide`
	// answers it, so that a press at the end does nothing rather than jumping.
	if (
		(direction > 0 && from >= targets.length - 1) ||
		(direction < 0 && from <= 0)
	) {
		return wanted;
	}

	const index = Math.max(0, Math.min(targets.length - 1, wanted));

	// The slides that rest where this one does are stepped over, for the same
	// reason a single step steps over them.
	return targets[index] === targets[from]
		? getNextSlide(targets, from, direction)
		: index;
}

/**
 * The resting place of a repeating carousel nearest to a slide, counted
 * round the loop - so a slide just past the last place is nearer to the
 * first place a turn on than to the last one.
 *
 * @param {number[]} places Resting places of the loop, in order.
 * @param {number}   index  Slide, anywhere on the clock.
 * @param {number}   count  Slides in the loop.
 *
 * @return {number} Place, possibly a turn off the clock.
 */
function getNearestPlace(places, index, count) {
	if (!places.length) {
		return index;
	}

	let nearest = index;
	let distance = Number.POSITIVE_INFINITY;

	places.forEach((place) => {
		[place - count, place, place + count].forEach((candidate) => {
			const offset = Math.abs(candidate - index);

			if (offset < distance) {
				distance = offset;
				nearest = candidate;
			}
		});
	});

	return nearest;
}

/**
 * Move a carousel by one slide.
 *
 * @param {HTMLElement} list      Item template list.
 * @param {number}      direction `1` forwards, `-1` back.
 */
function slide(list, direction) {
	list.dispatchEvent(new window.CustomEvent(STEP_EVENT));

	const carousel = carousels.get(list);

	if (carousel?.getState().isLooping) {
		travel.get(list)(() => {
			if (direction > 0) {
				carousel.next();
			} else {
				carousel.prev();
			}
		});
		return;
	}

	const held = pending.get(list);
	const remembered =
		held && window.performance.now() - held.time < STEP_MEMORY;
	const targets = getSlideTargets(list);

	// A press that comes faster than the carousel travels is still one step:
	// it counts from the slide the last press was headed for, not from the one
	// the animation happens to be passing.
	const from = remembered ? held.index : getCurrentSlide(list, targets);
	const group = getGroupSize(list, targets, from);

	goToSlide(
		list,
		1 === group
			? getNextSlide(targets, from, direction)
			: getGroupSlide(targets, from, direction, group),
		targets
	);
}

/**
 * Scroll a carousel to one of its slides.
 *
 * @param {HTMLElement} list     Item template list.
 * @param {number}      index    Slide to rest on.
 * @param {number[]}    targets  Resting places of the slides.
 * @param {string}      behavior Optional scroll behavior.
 */
function goToSlide(list, index, targets, behavior) {
	const carousel = carousels.get(list);

	if (carousel) {
		if (
			Number.isInteger(index) &&
			index >= 0 &&
			index < carousel.getState().count
		) {
			travel.get(list)(() => carousel.goTo(index, behavior));
		}

		return;
	}

	targets ??= getSlideTargets(list);

	const wanted = Math.max(0, Math.min(targets.length - 1, index));

	if (!targets.length || wanted !== index) {
		return;
	}

	pending.set(list, {
		index: wanted,
		time: window.performance.now(),
		source: 'step',
	});
	syncNav(list);

	scrollListTo(list, targets[wanted], behavior);
}

/**
 * Let the progress bar of a carousel be dragged, and steered by the keyboard.
 *
 * The bar says where the carousel is; a bar that can be taken hold of says it
 * and answers for it. Everything a key does goes through `slide`, so the step
 * event fires and autoplay starts its wait over, which is the courtesy a
 * visitor who has just chosen a slide is owed.
 *
 * @param {HTMLElement} list Item template list.
 *
 * @return {Function} Teardown.
 */
function initScrub(list) {
	const root = getControlsRoot(list);
	const bars = Array.from(root.querySelectorAll(SCRUB_SELECTOR));

	if (!bars.length) {
		return noop;
	}

	let snap = null;
	let driver;
	let base;
	let dragging = null;
	// A press that never moved is a press, not a drag: the carousel travels to
	// where it landed the way it travels for an arrow, rather than jumping.
	let from = 0;
	let moved = false;

	const holdSnap = () => {
		const carousel = carousels.get(list);

		if (
			carousel &&
			!window.matchMedia('(prefers-reduced-motion: reduce)').matches
		) {
			travel.get(list)(() => {
				base = getScrollPosition(list);
				driver = carousel.take('gallery-loop-progress', {
					onInterrupt: () => {
						driver = undefined;
						list.classList.remove(SCRUBBING_CLASS);
					},
				});
			}, false);
		} else {
			snap = list.style.getPropertyValue(SNAP_TYPE_PROPERTY);
			list.style.setProperty(SNAP_TYPE_PROPERTY, 'none');
		}
		list.classList.add(SCRUBBING_CLASS);
		// The slide a press asked for a moment ago is not the current one any
		// more: the finger is, and the bar follows it.
		pending.delete(list);
	};

	const freeSnap = () => {
		if (driver) {
			driver.release();
			driver = undefined;
		} else if (snap) {
			list.style.setProperty(SNAP_TYPE_PROPERTY, snap);
		} else if (null !== snap) {
			list.style.removeProperty(SNAP_TYPE_PROPERTY);
		}

		snap = null;
		list.classList.remove(SCRUBBING_CLASS);
	};

	// How far along the bar the pointer is, from its start rather than from
	// its left: on a right to left page the start of the carousel is the right.
	const getFraction = (bar, clientX) => {
		const box = bar.getBoundingClientRect();
		const along = isRtl(list) ? box.right - clientX : clientX - box.left;

		return box.width > 0 ? Math.min(1, Math.max(0, along / box.width)) : 0;
	};

	// Following a finger, frame by frame: the carousel is put where the finger
	// is and nowhere else, so it never lags behind or overshoots it.
	const scrubTo = (fraction) => {
		const { start, length } = isRepeating(list)
			? getLoopRange(list)
			: { start: 0, length: list.scrollWidth - list.clientWidth };
		const position = start + fraction * length;

		if (driver) {
			driver.setPosition(position - base);
		} else if (null !== snap) {
			// Reuse Carousel declines take() under reduced motion.
			scrollListTo(list, position, 'instant');
		}
	};

	// Travelling to where a press landed, which is a different thing: the
	// carousel is asked to go there and gets there the way it does for an
	// arrow - the browser's own smooth scroll, and for a repeating carousel
	// the step the module draws.
	const travelTo = (fraction) => {
		const total = getItems(list).length;

		// A visitor who has just chosen a place is owed a whole delay on it,
		// the same courtesy an arrow gets.
		list.dispatchEvent(new window.CustomEvent(STEP_EVENT));

		if (carousels.has(list)) {
			goToSlide(list, getSlideAt(fraction, total));

			return;
		}

		scrollListTo(list, fraction * (list.scrollWidth - list.clientWidth));
	};

	// Let go on a slide rather than between two: mandatory snapping does it
	// for a plain carousel as soon as it is given back, and a repeating one is
	// walked to the nearest slide the way an arrow walks it.
	const land = (fraction) => {
		freeSnap();

		if (!isRepeating(list)) {
			return;
		}

		const total = getItems(list).length;

		goToSlide(list, getSlideAt(fraction, total));
	};

	// The slide a fraction of the bar stands for, on the scale the bar is
	// drawn on: the first slide at the start, the last at the end, and a
	// resting place of the loop rather than a slide between two.
	const getSlideAt = (fraction, total) => {
		const places = getRestingPlaces(list);

		if (isRepeating(list)) {
			return getNearestPlace(
				places,
				Math.round(fraction * (total - 1)),
				total
			);
		}

		const targets = getSlideTargets(list);
		const position = fraction * (list.scrollWidth - list.clientWidth);

		return places.reduce(
			(best, index) =>
				Math.abs(targets[index] - position) <
				Math.abs(targets[best] - position)
					? index
					: best,
			0
		);
	};

	const onMove = (event) => {
		if (!dragging) {
			return;
		}

		// A couple of pixels of travel under a finger is still a press. Only
		// past that does the carousel start following it, and only then is
		// snapping taken off.
		if (!moved) {
			if (Math.abs(event.clientX - from) < 3) {
				return;
			}

			moved = true;
			holdSnap();
		}

		scrubTo(getFraction(dragging, event.clientX));
	};

	const onUp = (event) => {
		if (!dragging) {
			return;
		}

		const fraction = getFraction(dragging, event.clientX);
		const dragged = moved;

		dragging = null;
		moved = false;
		window.removeEventListener('pointermove', onMove);
		window.removeEventListener('pointerup', onUp);
		window.removeEventListener('pointercancel', onUp);

		if (dragged) {
			land(fraction);
		} else {
			travelTo(fraction);
		}
	};

	const onDown = (event) => {
		// A drag takes over from a step the module is still drawing.
		if (0 !== event.button || dragging) {
			return;
		}

		dragging = event.currentTarget;
		from = event.clientX;
		moved = false;

		window.addEventListener('pointermove', onMove);
		window.addEventListener('pointerup', onUp);
		window.addEventListener('pointercancel', onUp);
	};

	const onKey = (event) => {
		const rtl = isRtl(list);
		const total = getItems(list).length;
		const back = rtl ? 'ArrowRight' : 'ArrowLeft';
		const on = rtl ? 'ArrowLeft' : 'ArrowRight';

		switch (event.key) {
			case back:
			case 'ArrowDown':
			case 'PageDown':
				slide(list, -1);
				break;
			case on:
			case 'ArrowUp':
			case 'PageUp':
				slide(list, 1);
				break;
			case 'Home':
				goToSlide(list, 0);
				break;
			case 'End':
				goToSlide(list, total - 1);
				break;
			default:
				return;
		}

		// The page scrolls on the arrow keys and jumps on Home, and a bar that
		// answered them would have done both at once.
		event.preventDefault();
	};

	bars.forEach((bar) => {
		bar.addEventListener('pointerdown', onDown);
		bar.addEventListener('keydown', onKey);
	});

	return () => {
		bars.forEach((bar) => {
			bar.removeEventListener('pointerdown', onDown);
			bar.removeEventListener('keydown', onKey);
		});
		window.removeEventListener('pointermove', onMove);
		window.removeEventListener('pointerup', onUp);
		window.removeEventListener('pointercancel', onUp);
		freeSnap();
	};
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

	// The countdown is drawn on the dots, and an indicator can be anywhere in
	// the gallery - so it is published on the loop, which every control of the
	// carousel inherits from.
	const root = getControlsRoot(list);

	// Anything the visitor is doing with the carousel holds the clock: resting
	// the pointer on a slide, and reaching for a control just as much - which
	// no longer means the same box, so both are listened to.
	const boxes = [getFrame(list) || list, ...getControls(list)];

	// How much of the wait is already behind, and the frame it was last added
	// to. Kept apart so that a pause holds the clock rather than turning it
	// back: a visitor who rests the pointer on a carousel and takes it off
	// again is owed the rest of the wait, not the whole of it.
	let elapsed = 0;
	let last = 0;
	let raf = 0;
	// The boxes the visitor is on - the pointer resting on one, or a focus
	// inside one. A set rather than a flag: a control over the slides sits
	// inside the frame, and leaving the control is not leaving the carousel.
	const pointerOn = new Set(boxes.filter((box) => box.matches(':hover')));
	const focusIn = new Set();
	// Asked for from outside, and kept apart from the pointer so that releasing
	// it does not start a carousel the pointer is resting on.
	let held = false;
	// Stopped by the visitor, held from outside, paused under the pointer and
	// off the screen are four ways of holding the same clock, and none of them
	// turns it back: whatever was left of the wait is what is left of it when
	// the carousel runs on.
	//
	// Off the screen. A carousel nobody can see has nobody to run for, and a
	// visitor who scrolls back to it is owed the slide they left it on: the
	// clock holds rather than turning back, like a pause.
	let offscreen = true;

	// The slide the wait is being counted for. A wait belongs to a slide, not
	// to the carousel, so it starts again whenever the carousel comes to be
	// showing a different one.
	let seen = -1;

	// Taken by a script that moves the carousel itself. The pauses stay the
	// autoplay's, and so does the play and pause button.
	let taken = false;

	const setProgress = (value) => {
		root.style.setProperty(
			'--vp-carousel-autoplay-progress',
			`${value * 100}%`
		);
	};

	const restart = () => {
		elapsed = 0;
		setProgress(0);
	};

	const tick = (now) => {
		raf = window.requestAnimationFrame(tick);

		const step = now - last;

		last = now;

		// A box the loop replaced under the pointer never says it was left.
		[pointerOn, focusIn].forEach((boxes) => {
			boxes.forEach((box) => {
				if (!box.isConnected) {
					boxes.delete(box);
				}
			});
		});

		if (taken && isRepeating(list)) {
			list.dispatchEvent(
				new window.CustomEvent(AUTOPLAY_FRAME_EVENT, {
					detail: {
						elapsed: step,
						held: !!(
							focusIn.size ||
							held ||
							offscreen ||
							stopped.has(list)
						),
						pointer: pointerOn.size > 0,
						keyboard: focusIn.size > 0,
					},
				})
			);

			return;
		}

		if (held || offscreen || stopped.has(list)) {
			return;
		}

		// Whichever way the carousel moved, the slide it moved to is owed the
		// whole of a wait. A press on an arrow or a dot says so itself and is
		// listened for, but a swipe says nothing - so the delay went on
		// running down from wherever it had got to, and a slide a visitor had
		// just swiped to could be taken away from them a moment later.
		//
		// Asked of the carousel rather than waited for as an event, because
		// there is no one event to wait for: a swipe, a throw, a drag of the
		// progress bar, a Load More that changes what the slides are, and the
		// carousel's own step are all the same thing to a visitor watching the
		// wait run down.
		const showing = getDisplayedSlide(list);

		if (showing !== seen) {
			seen = showing;
			restart();
		}

		// A pause holds time, but changing slides still starts a new wait.
		if (
			pointerOn.size ||
			focusIn.size ||
			carousels.get(list)?.getState().isDragging
		) {
			return;
		}

		elapsed += step;

		setProgress(Math.min(1, elapsed / delay));

		if (elapsed < delay) {
			return;
		}

		elapsed = 0;

		// Emptied with the same frame that starts the move, so the dot of the
		// slide being left does not sit there full while the carousel travels.
		// A step fires the step event and lands here again through `restart`;
		// the wrap back to the first slide does not, and used to leave the
		// wait drawn full for a frame.
		setProgress(0);

		// The last slide goes back to the first, so a carousel that does not
		// repeat still runs on.
		if (
			!isRepeating(list) &&
			getScrollPosition(list) >= list.scrollWidth - list.clientWidth - 1
		) {
			goToSlide(list, 0);
		} else {
			slide(list, 1);
		}
	};

	// `pointerleave` and `focusout` do not bubble, so each box answers for
	// itself: the carousel is left when the last of them has been.
	const onPointerEnter = (event) => pointerOn.add(event.currentTarget);
	const onPointerLeave = (event) => pointerOn.delete(event.currentTarget);
	// A focus the keyboard put there: a press on the play button focuses
	// it too, and a carousel started with a mouse would be held by the very
	// button that started it. The focus the module gives the list on a
	// mouse press is the pointer's as well, whatever the browser says of it,
	// and the list is marked so while it lasts.
	const onFocusIn = (event) => {
		if (
			event.target.matches?.(':focus-visible') &&
			!event.target.classList.contains(POINTER_FOCUS_CLASS)
		) {
			focusIn.add(event.currentTarget);
		}
	};
	const onFocusOut = (event) => focusIn.delete(event.currentTarget);
	const hold = (event) => {
		// A visitor pressing stop and a script asking for a hold are two
		// different things, and they are written down separately: closing a
		// lightbox releases its own hold and must not start a carousel the
		// visitor stopped.
		if ('visitor' === event.detail?.source) {
			return;
		}

		held = false === event.detail?.playing;
	};

	// Half of the frame on screen is the carousel in view: less than that
	// is a strip along the edge of the window, which is not something a
	// visitor is watching.
	const frame = getFrame(list) || list;
	const view = frame.ownerDocument.defaultView || window;
	const watcher = new view.IntersectionObserver(
		(entries) => {
			entries.forEach((entry) => {
				offscreen = !entry.isIntersecting;
			});
		},
		{ threshold: 0.5 }
	);

	watcher.observe(frame);

	root.classList.add(PLAYING_CLASS);
	boxes.forEach((box) => {
		box.addEventListener('pointerenter', onPointerEnter);
		box.addEventListener('pointerleave', onPointerLeave);
		box.addEventListener('focusin', onFocusIn);
		box.addEventListener('focusout', onFocusOut);
	});
	list.addEventListener(AUTOPLAY_EVENT, hold);
	const take = () => {
		taken = isRepeating(list);
		setProgress(0);
	};

	list.addEventListener(STEP_EVENT, restart);
	list.addEventListener(AUTOPLAY_TAKE_EVENT, take);
	syncAutoplay(list, root);

	raf = window.requestAnimationFrame((now) => {
		last = now;
		tick(now);
	});

	return () => {
		window.cancelAnimationFrame(raf);
		watcher.disconnect();
		root.classList.remove(PLAYING_CLASS);
		boxes.forEach((box) => {
			box.removeEventListener('pointerenter', onPointerEnter);
			box.removeEventListener('pointerleave', onPointerLeave);
			box.removeEventListener('focusin', onFocusIn);
			box.removeEventListener('focusout', onFocusOut);
		});
		list.removeEventListener(AUTOPLAY_EVENT, hold);
		list.removeEventListener(STEP_EVENT, restart);
		list.removeEventListener(AUTOPLAY_TAKE_EVENT, take);
		root.style.removeProperty('--vp-carousel-autoplay-progress');
	};
}

/**
 * Bring the play and pause button in line with the carousel it stops.
 *
 * @param {HTMLElement} list Item template list.
 * @param {HTMLElement} root Box the controls of the carousel are published on.
 */
function syncAutoplay(list, root = getControlsRoot(list)) {
	const playing = !stopped.has(list);

	root.classList.toggle(STOPPED_CLASS, !playing);

	root.querySelectorAll(AUTOPLAY_SELECTOR).forEach((button) => {
		// The label names what a press does next, the way a play and pause
		// button of a player does - so the button carries no pressed state,
		// which a changing label contradicts.
		const label = playing
			? button.dataset.vpPauseLabel
			: button.dataset.vpPlayLabel;

		if (label) {
			button.setAttribute('aria-label', label);
		}
	});
}

/**
 * Let the controls of a carousel be seen and used.
 *
 * They are rendered switched off, and until this runs nothing on the page could
 * have moved them - so a control beside a grid, beside a carousel with no items,
 * or on a page whose module never loaded, stays switched off and out of the way.
 *
 * @param {HTMLElement} list Item template list.
 *
 * @return {Function} Teardown.
 */
function wakeControls(list, hasAutoplay) {
	if (!list.querySelector(ITEM_SELECTOR)) {
		return noop;
	}

	// A carousel with no autoplay, and one a visitor asked less motion of,
	// have nothing for a play and pause button to stop - so it is left
	// switched off, the way an arrow beside a grid is.
	const controls = getControls(list).filter(
		(control) => hasAutoplay || !control.matches(AUTOPLAY_SELECTOR)
	);

	controls.forEach((control) => {
		control.classList.remove(IDLE_CLASS);
	});

	return () => {
		controls.forEach((control) => {
			control.classList.add(IDLE_CLASS);
		});
	};
}

function getCarouselGroup(list) {
	if (
		'0' === list.dataset.vpCarouselGroup &&
		list.classList.contains('vp-carousel-auto-width')
	) {
		return 'page';
	}

	return getGroupSize(list, getSlideTargets(list), 0);
}

function initCarousel(list, restore) {
	const events = new window.AbortController();
	const { signal } = events;
	const source = list.dataset.vpCarouselSrc;
	const root = getControlsRoot(list);
	const delay = parseFloat(list.dataset.vpCarouselAutoplay) * 1000;
	const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
	let carousel;
	let thumbnails = [];
	let stopMarking = noop;
	let started = false;
	let travelling = false;
	let touching = false;
	let touchScroll = false;
	let driver;
	let driverBase;
	let group;
	let pages;
	let dotTimer;
	let handlingScroll = false;

	if (isRepeating(list)) {
		askedToRepeat.add(list);
	}
	delete list.dataset.vpCarouselRepeat;
	const canRepeat = () => askedToRepeat.has(list) && !isRtl(list);

	const setRepeat = (looping) => {
		if (looping === isRepeating(list)) {
			return;
		}

		if (started) {
			list.dispatchEvent(
				new window.CustomEvent(STOP_EVENT, { bubbles: true })
			);
		}
		if (looping) {
			list.dataset.vpCarouselRepeat = 'true';
		} else {
			delete list.dataset.vpCarouselRepeat;
		}

		if (started) {
			if (!looping) {
				releaseDriver();
			}
			list.dispatchEvent(
				new window.CustomEvent(START_EVENT, { bubbles: true })
			);
		}
	};

	const releaseDriver = () => {
		const previous = driver;
		driver = undefined;
		previous?.release();
	};

	const endTravel = () => {
		if (travelling) {
			travelling = false;
			list.dispatchEvent(new window.CustomEvent(TRAVEL_END_EVENT));
		}
	};

	const beginTravel = (move, animate = true) => {
		if (isRepeating(list) && (animate || driver) && !travelling) {
			travelling = true;
			list.dispatchEvent(new window.CustomEvent(TRAVEL_START_EVENT));
		}
		releaseDriver();
		move();
		if (!animate) {
			endTravel();
		}
	};

	const onPlace = ({ detail }) => {
		if (
			!isRepeating(list) ||
			travelling ||
			list.classList.contains(SCRUBBING_CLASS) ||
			touching ||
			!Number.isFinite(detail?.position)
		) {
			return;
		}
		if (!driver) {
			driverBase = getScrollPosition(list);
			driver = carousel.take('gallery-loop-marquee', {
				onInterrupt: () => {
					driver = undefined;
				},
			});
		}
		driver.setPosition(detail.position - driverBase);
		detail.position = getScrollPosition(list);
	};

	const onKey = (event) => {
		if (!MODIFIER_KEYS.has(event.key)) {
			list.classList.remove(POINTER_FOCUS_CLASS);
		}
		if (
			event.defaultPrevented ||
			event.altKey ||
			event.ctrlKey ||
			event.metaKey ||
			event.target.closest(
				'input, textarea, select, [contenteditable], [role="slider"]'
			) ||
			!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)
		) {
			return;
		}

		pending.delete(list);
		if (
			carousel &&
			!isRepeating(list) &&
			['ArrowLeft', 'ArrowRight'].includes(event.key)
		) {
			event.preventDefault();
			const right = 'ArrowRight' === event.key;
			slide(list, right !== isRtl(list) ? 1 : -1);
		} else if (carousel && isRepeating(list)) {
			list.dispatchEvent(new window.CustomEvent(STEP_EVENT));
			// Let the carousel's keyboard handler move after the marquee releases.
			beginTravel(noop);
		}
	};

	const syncLayout = () => {
		if (list.classList.contains('vp-carousel-coverflow')) {
			const count = getItems(list).length;
			const property = '--vp-coverflow-loop-gap';

			if (canRepeat() && count > getSlidesOnScreen(list, [])) {
				// Reuse needs the viewport and a spare slide in one cycle.
				// Two pixels cover rounding in its offset-based measurements.
				const box = 'var(--vp-coverflow-box-width)';
				const gap = `max(0px, calc((100cqw + ${box} + 2px) / ${count} - ${box}))`;
				if (gap !== list.style.getPropertyValue(property)) {
					list.style.setProperty(property, gap);
				}
			} else {
				list.style.removeProperty(property);
			}
		}
		if (carousel) {
			const nextGroup = getCarouselGroup(list);
			if (nextGroup !== group) {
				group = nextGroup;
				carousel.setOptions({ group });
			} else {
				carousel.refresh();
			}
		} else {
			syncSnapGroups(list);
			syncDots(list);
			syncNav(list);
		}
	};
	const stopColumns = syncColumns(list, syncLayout);
	const stopObserving = observeItems(list, syncLayout);
	const sleepControls = wakeControls(list, !!delay && !motion.matches);
	const stopAutoplay = initAutoplay(list);
	const stopScrub = initScrub(list);

	list.addEventListener(
		'scroll',
		() => {
			if (carousel) {
				handlingScroll = true;
				return;
			}
			syncNav(list, false);
			window.clearTimeout(dotTimer);
			dotTimer = window.setTimeout(() => syncNav(list), 120);
		},
		{ capture: true, passive: true, signal }
	);
	list.addEventListener(
		'wheel',
		() => {
			pending.delete(list);
			if (driver) {
				beginTravel(noop, false);
			}
		},
		{ passive: true, signal }
	);
	list.addEventListener('pointerdown', () => pending.delete(list), {
		signal,
	});
	list.addEventListener(
		'touchstart',
		() => {
			touching = true;
			touchScroll = true;
		},
		{ passive: true, signal }
	);
	const onTouchEnd = (event) => {
		touching = Array.from(event.touches).some((touch) =>
			list.contains(touch.target)
		);
		if (!touching && touchScroll) {
			window.clearTimeout(dotTimer);
			dotTimer = window.setTimeout(() => {
				touchScroll = false;
				syncNav(list);
			}, 180);
		}
	};
	window.addEventListener('touchend', onTouchEnd, { passive: true, signal });
	window.addEventListener('touchcancel', onTouchEnd, {
		passive: true,
		signal,
	});
	list.addEventListener('keydown', onKey, { capture: true, signal });
	list.addEventListener(
		'blur',
		() => list.classList.remove(POINTER_FOCUS_CLASS),
		{ signal }
	);
	list.addEventListener(
		'mousedown',
		(event) => {
			if (
				0 !== event.button ||
				!window.matchMedia('(hover: hover) and (pointer: fine)')
					.matches ||
				event.target.closest(
					'input, textarea, select, button, [contenteditable], [data-carousel-no-drag]'
				)
			) {
				return;
			}
			event.preventDefault();
			list.classList.add(POINTER_FOCUS_CLASS);
			list.focus({ preventScroll: true });
		},
		{ signal }
	);
	list.addEventListener(
		GO_TO_EVENT,
		({ detail }) =>
			goToSlide(
				list,
				detail?.index,
				undefined,
				detail?.behavior === 'instant' ? 'instant' : undefined
			),
		{ signal }
	);
	list.addEventListener(PLACE_EVENT, onPlace, { signal });
	list.addEventListener(
		AUTOPLAY_FRAME_EVENT,
		(event) => {
			if (event.detail?.keyboard && driver) {
				beginTravel(noop);
			}
		},
		{ signal }
	);

	const start = () => {
		started = true;
		list.dispatchEvent(
			new window.CustomEvent(START_EVENT, { bubbles: true })
		);
	};

	syncLayout();
	if (undefined !== restore) {
		const position = getSlideTargets(list)[restore];
		if (undefined !== position) {
			scrollListTo(list, position, 'instant');
		}
	}

	if (source) {
		import(/* webpackIgnore: true */ source).then(
			({ createCarousel, connectThumbnails }) => {
				if (signal.aborted || !list.isConnected) {
					return;
				}

				const index = getDisplayedSlide(list);
				const items = getItems(list);
				items.forEach((item) => {
					item.classList.remove(NO_SNAP_CLASS);
				});
				restingPlaces.delete(list);
				pending.delete(list);
				group = getCarouselGroup(list);
				const align =
					items[0] &&
					window
						.getComputedStyle(items[0])
						.scrollSnapAlign.includes('center')
						? 'center'
						: 'start';

				carousel = createCarousel(list, {
					slides: ITEM_SELECTOR,
					align,
					group,
					loop: canRepeat(),
					moveMotion:
						askedToRepeat.has(list) && !isRtl(list)
							? 'spring'
							: 'native',
				});
				carousels.set(list, carousel);
				travel.set(list, beginTravel);

				const sync = (state, previous) => {
					setRepeat(state.isLooping);
					if (state.pages !== pages) {
						pages = state.pages;
						syncDots(list);
					}
					if (
						!previous ||
						state.index !== previous.index ||
						state.progress !== previous.progress ||
						state.pages !== previous.pages ||
						state.isDragging !== previous.isDragging ||
						state.canPrev !== previous.canPrev ||
						state.canNext !== previous.canNext
					) {
						syncNav(
							list,
							!handlingScroll && !touchScroll && !state.isDragging
						);
					}
				};

				const initial = restore ?? index;
				if (initial !== carousel.getState().index) {
					carousel.goTo(initial, 'instant');
				}

				thumbnails = Array.from(
					root.querySelectorAll(THUMBS_SELECTOR),
					(strip) => {
						const thumbs = createCarousel(strip, {
							slides: THUMB_SELECTOR,
							align: 'center',
						});
						connectedThumbnails.add(strip);
						strip.addEventListener(
							'click',
							(event) => {
								if (event.target.closest(THUMB_SELECTOR)) {
									list.dispatchEvent(
										new window.CustomEvent(STEP_EVENT)
									);
									beginTravel(noop);
								}
							},
							{ signal }
						);

						const disconnect = connectThumbnails(carousel, thumbs);
						return () => {
							disconnect();
							thumbs.destroy();
							connectedThumbnails.delete(strip);
						};
					}
				);

				list.addEventListener(
					'scroll',
					() => {
						handlingScroll = false;
					},
					{ signal }
				);

				let previous = carousel.getState();
				carousel.subscribe(
					(state) => {
						const before = previous;
						previous = state;
						sync(state, before);
					},
					{ signal }
				);
				carousel.on(
					'settle',
					() => {
						driver = undefined;
						if (!touching) {
							touchScroll = false;
							syncNav(list);
						}
						endTravel();
					},
					{ signal }
				);
				if (list.classList.contains('vp-carousel-effect')) {
					stopMarking = markMovedRound(list);
				}
				sync(carousel.getState());
				start();
			},
			() => {
				if (!signal.aborted && list.isConnected) {
					start();
				}
			}
		);
	} else {
		start();
	}

	return () => {
		if (started) {
			list.dispatchEvent(
				new window.CustomEvent(STOP_EVENT, { bubbles: true })
			);
		}
		events.abort();
		window.clearTimeout(dotTimer);
		endTravel();
		stopAutoplay();
		stopScrub();
		stopMarking();
		stopColumns();
		stopObserving();
		sleepControls();
		thumbnails.forEach((disconnect) => {
			disconnect();
		});
		carousel?.destroy();
		list.style.removeProperty('--vp-coverflow-loop-gap');
		carousels.delete(list);
		travel.delete(list);
		restingPlaces.delete(list);
		pending.delete(list);
		list.classList.remove(POINTER_FOCUS_CLASS);
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
	// One item template to a loop, so the loop a control was dropped in names
	// the list it drives - however deeply it was nested on the way there.
	return element.closest(LOOP_SELECTOR)?.querySelector(LIST_SELECTOR) || null;
}

/**
 * Start the layout a list says it was rendered as.
 *
 * @param {HTMLElement} list Item template list.
 *
 * @return {Function|undefined} Teardown, when the layout has one.
 */
function startListLayout(list, restore) {
	if ('justified' === list.dataset.vpLayout) {
		return initJustified(list);
	}

	if ('masonry' === list.dataset.vpLayout) {
		return startMasonry(list);
	}

	if ('carousel' === list.dataset.vpLayout) {
		return initCarousel(list, restore);
	}

	return undefined;
}

store('visual-portfolio/item-template', {
	state: {
		// Read by the markup rather than by this module: a control that only
		// works with a script is hidden until there is one.
		hasScript: true,
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
		 * Stop a carousel that moves on its own, or start it again.
		 *
		 * The stop of a visitor outranks a hold asked for from outside: a
		 * lightbox that closes releases its own hold, and must not start a
		 * carousel somebody pressed stop on.
		 */
		carouselAutoplayToggle() {
			const { ref } = getElement();
			const list = getListOf(ref);

			if (!list) {
				return;
			}

			const playing = stopped.has(list);

			if (playing) {
				stopped.delete(list);
			} else {
				stopped.add(list);
			}

			syncAutoplay(list);
			list.dispatchEvent(
				new window.CustomEvent(AUTOPLAY_EVENT, {
					detail: { playing, source: 'visitor' },
				})
			);
		},

		/**
		 * Jump to the slide a dot or a thumbnail names.
		 *
		 * Bound to the container rather than to a dot: dots are appended as
		 * a Load More brings more slides, and a node inserted after hydration
		 * carries no directives of its own.
		 *
		 * @param {Event} event Click event.
		 */
		carouselGoTo(event) {
			const { ref } = getElement();
			if (connectedThumbnails.has(ref)) {
				return;
			}

			const target = event.target.closest(SLIDE_TARGET_SELECTOR);
			const list = getListOf(ref);
			const index = target ? parseInt(target.dataset.vpSlide, 10) : -1;

			if (!list || index < 0) {
				return;
			}

			list.dispatchEvent(new window.CustomEvent(STEP_EVENT));
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
			// the page before it. The loop announces the swap. A carousel that
			// is started again is put back on the slide it was showing: a
			// visitor who pressed Load More on the third slide is owed the
			// third slide.
			const relayout = () => {
				const showing =
					'carousel' === ref.dataset.vpLayout
						? getCurrentSlide(ref)
						: undefined;

				teardown();
				teardown = startListLayout(ref, showing) || noop;
			};

			ref.addEventListener(RELAYOUT_EVENT, relayout);

			return () => {
				ref.removeEventListener(RELAYOUT_EVENT, relayout);
				teardown();
			};
		},
	},
});
