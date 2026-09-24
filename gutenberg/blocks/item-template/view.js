/**
 * Mark the slides a repeating carousel has moved round.
 *
 * Blossom carries the loop by translating the slides one end has run out of
 * to the other, and writes the translation on each slide as it goes. A
 * scroll-driven effect is drawn from where a slide was laid out, not from
 * where a transform put it, so a moved slide arrived wearing the state of a
 * slide far off the other edge - half out of its box, or turned away. A
 * moved slide is marked, and the range of the scroll it is in view for is
 * written on it, so that the stylesheet can animate it from the scroll of
 * the list instead of from its own place in the layout.
 *
 * @param {HTMLElement} list Item template list.
 *
 * @return {Function} Teardown.
 */
function markMovedRound(list) {
	const mark = (item) => {
		const moved = parseFloat(item.style.translate) || 0;

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
		mutations.forEach((mutation) => {
			mark(mutation.target);
		});
	});

	list.querySelectorAll(ITEM_SELECTOR).forEach(mark);
	observer.observe(list, {
		attributes: true,
		attributeFilter: ['style'],
		subtree: true,
	});

	return () => {
		observer.disconnect();
		list.querySelectorAll(ITEM_SELECTOR).forEach((item) => {
			item.classList.remove(MOVED_ROUND_CLASS);
			item.style.removeProperty(COPY_COVER_PROPERTY);
			item.style.removeProperty(COPY_CONTAIN_PROPERTY);
		});
	};
}

/**
 * Have Blossom measure a repeating carousel again.
 *
 * Its snap positions are read off the slides as they are drawn, copies
 * included, and only when the list changes - so the copies moved round
 * since were unknown to it, and a swipe back from the first slide had no
 * last slide to land on and came back to the first. It watches the list for
 * children coming and going, and a comment is a child that changes nothing
 * else.
 *
 * @param {HTMLElement} list Item template list.
 */
function remeasureLoop(list) {
	const mark = list.ownerDocument.createComment('');

	list.appendChild(mark);
	mark.remove();
}

/**
 * Answer Blossom's question about the scrollable width with the loop's.
 *
 * Blossom reads the scrollable width of the list to know how far a slide
 * is moved round and where the range ends, and reads it whenever the list
 * changes - which is as often as not while a slide is moved past the end,
 * stretching the width by its own. Measured then, the loop came out too
 * long: a slide moved round was taken back while it was still on screen,
 * leaving a blank strip at the edge until the carousel came to rest. The
 * list answers with the width the loop has by construction - a step per
 * slide past its own box - whoever asks.
 *
 * @param {HTMLElement} list Item template list.
 *
 * @return {Function} Teardown.
 */
function answerForScrollWidth(list) {
	const inherited = Object.getOwnPropertyDescriptor(
		Element.prototype,
		'scrollWidth'
	);

	if (!inherited?.get) {
		return noop;
	}

	Object.defineProperty(list, 'scrollWidth', {
		configurable: true,
		get() {
			const items = list.querySelectorAll(ITEM_SELECTOR);

			if (items.length < 2) {
				return inherited.get.call(list);
			}

			return (
				list.clientWidth +
				items.length *
					Math.abs(items[1].offsetLeft - items[0].offsetLeft)
			);
		},
	});

	return () => {
		delete list.scrollWidth;
	};
}

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
// The filled pill that marks the slide on screen. One per indicator, drawn over
// the dots rather than being one of them, so that moving from one slide to the
// next is a single thing crawling across the row.
const WORM_CLASS = 'vp-block-loop-carousel-dot-worm';
const WORM_SELECTOR = `.${WORM_CLASS}`;
// How long a crawl takes, and how the two edges of the pill divide it between
// them. The leading edge is away and arrived inside the first stretch of it;
// the trailing edge has not set off until well after that, and the ground
// between them is the pill stretched out.
const WORM_DURATION = 420;
const WORM_LEAD_SPAN = 0.55;
const WORM_TRAIL_DELAY = 0.32;
// The most ground the pill covers at once, in slots. A swipe running several
// slides together would otherwise stretch it the whole way, and a row that is
// showing its dots through a window has no room for that - the pill would be
// clipped by the window it is meant to be moving inside.
const WORM_REACH = 3;
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
// Snapping is held off while a bar is being dragged. Two switches, because a
// page has only one of them: the custom property is the one Blossom's own
// `!important` layer answers to, and the class is for the carousel on a touch
// screen, which never loads Blossom at all.
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
// A slide Blossom has moved round to the far end of a repeating carousel.
const MOVED_ROUND_CLASS = 'vp-carousel-moved-round';
// The scroll ranges a moved slide is in view for, written on the slide.
const COPY_COVER_PROPERTY = '--vp-carousel-copy-cover';
const COPY_CONTAIN_PROPERTY = '--vp-carousel-copy-contain';
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

// Dispatched on the list, and bubbling, once the module runs a carousel and
// again just before it lets go of one - so that a script that is not a module
// of ours can run alongside it for as long as it runs. `timelines.js` keeps
// the timelines of an effect by hand on this pair where the browser has none.
//
// `vp-carousel-start`  the carousel is running.
// `vp-carousel-stop`   it is about to be torn down.
const START_EVENT = 'vp-carousel-start';
const STOP_EVENT = 'vp-carousel-stop';

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

// The slide the last press asked for, per carousel.
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

// Where the pill of an indicator was left, so that the next move knows the
// ground it has to cover.
const worms = new WeakMap();

// The crawl drawing it, when one is: its two edges and the frame they are
// drawn on. A step landing mid-crawl moves where it is headed rather than
// starting a second one.
const crawls = new WeakMap();

// The slides a carousel can come to rest on, per carousel. One per slide
// unless the arrows move a frame at a time, in which case the slides between
// one frame and the next are scrolled past and are not places at all.
const restingPlaces = new WeakMap();

// How close to either end of its scroll range Blossom lets a repeating
// carousel rest. The loop is carried by copies of the slides moved round to
// the far end, and a scroll that passes this margin at one end is put back
// by a whole period at the other - so the range a step can be aimed at is
// the margin in from both ends, and a step past it is made in two moves.
const REPEAT_EDGE = 4;

// How far from the seam of the loop a slide has to rest: the margin, and a
// pixel for the rounding of a scroll position.
const SEAM_CLEARANCE = REPEAT_EDGE + 1;

// The padding moved from one end of a repeating list to the other to keep
// its resting places off the seam. Read by the stylesheet.
const SEAM_SHIFT_PROPERTY = '--vp-carousel-seam-shift';

// The focus a press put on the list. The pointer's rather than the
// keyboard's, so the stylesheet draws no ring for it; taken off on the first
// key, which is the keyboard asking.
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

// How long a step of a repeating carousel takes, drawn by the module.
const TRAVEL_DURATION = 450;

// The shortest and the longest a move that carries on from a drag takes. Its
// length is otherwise the speed it was let go at, which for a slow drag over
// the last of a slide is a glide of several seconds, and for a hard flick
// that has almost arrived is a single frame.
const TRAVEL_SHORTEST = 120;
const TRAVEL_LONGEST = 700;

// The custom property Blossom keeps the snap type of the list in.
const SNAP_TYPE_PROPERTY = '--snap-type';

// How long a flick of a repeating carousel keeps going after it was let go.
// The slide it comes to rest on is the one it would have reached at the speed
// it left the pointer at, so a flick moves further the harder it is thrown.
// The same distance Blossom throws a carousel that does not repeat, so that
// two carousels one under the other answer a flick alike.
const FLICK_CARRY = 290;

// How much of the end of a drag its speed is read from. Longer than a frame,
// so a pointer that stopped before it was let go throws nothing.
const FLICK_WINDOW = 80;

// How far a press has to move the carousel to have been a drag rather than a
// click. The distance Blossom reads a press by, so a press that moves nothing
// here moves nothing there either.
const DRAG_SLOP = 10;

// Written on the list by Blossom while it is the one carrying drags. Where it
// is not - a touch device, which scrolls the carousel itself - the landing is
// the browser's and not this module's.
const OVERFLOW_ATTRIBUTE = 'has-overflow';

/**
 * Whether a carousel repeats.
 *
 * @param {HTMLElement} list Item template list.
 *
 * @return {boolean} True for an endless carousel.
 */
function isRepeating(list) {
	return 'true' === list.dataset.vpCarouselRepeat;
}

/**
 * Whether a carousel asked to repeat has anything to run round.
 *
 * The loop is carried by moving the slides one end has run out of to the
 * other, and a carousel whose slides all fit in its frame runs out of none:
 * the library shuffled the few it had back and forth instead, and a loop of
 * as many slides as columns rests with a hole in it, whichever way the slides
 * are aligned. Such a carousel is run as a plain one. Counted rather than
 * measured. The slide width is a `calc()` that fits the column count into the
 * frame, so the slides overflow it when there are more of them than columns,
 * and a measure would have to undo the padding the loop is carried in, the
 * library's included, to find the same.
 *
 * An RTL carousel is run as a plain one too: the library carries its loop in
 * the positive scroll positions of LTR, and under RTL, where they run
 * negative, it opened a fade on the far end and an arrow moved nothing.
 *
 * @param {HTMLElement} list    Item template list.
 * @param {number}      columns Slides the frame holds.
 *
 * @return {boolean} True when the slides overflow the frame.
 */
function hasLoop(list, columns) {
	return (
		!isRtl(list) &&
		list.querySelectorAll(ITEM_SELECTOR).length > Math.max(1, columns)
	);
}

/**
 * How a repeating carousel is laid out.
 *
 * Blossom pads the list by half its width at each end and, as the scroll
 * nears an end, moves the slides the other end has run out of round to it -
 * by the scrollable width, which the stylesheet makes one slide-and-gap per
 * slide. So the scroll position is a clock: it comes back to the same picture
 * every period, and the slides sit one step apart on it, the first of them
 * where the padding and its alignment put it.
 *
 * Read from the layout rather than the drawn boxes - `offsetLeft` never moves
 * with a slide that was moved round.
 *
 * @param {HTMLElement} list Item template list.
 *
 * @return {Object} `count`, and `step`, `period` and `origin` in pixels - the
 *                  origin being where the first slide rests.
 */
function getRepeatGeometry(list) {
	const items = list.querySelectorAll(ITEM_SELECTOR);
	const step =
		items.length > 1
			? Math.abs(items[1].offsetLeft - items[0].offsetLeft)
			: list.scrollWidth - list.clientWidth;
	// A step per slide, which the stylesheet makes the scrollable width of
	// the list - and not the scrollable width read back, which a slide moved
	// round to the far end stretches by its own width.
	const period = items.length ? items.length * step : 0;

	let origin = 0;

	if (items.length) {
		const style = window.getComputedStyle(list);
		const centred = window
			.getComputedStyle(items[0])
			.scrollSnapAlign.startsWith('center');
		const padding = parseFloat(style.paddingInlineStart) || 0;

		origin = centred
			? padding + (items[0].offsetWidth - list.clientWidth) / 2
			: padding - (parseFloat(style.scrollPaddingInlineStart) || 0);
	}

	return { count: items.length, step, period, origin };
}

/**
 * A position on the clock of a repeating carousel, in `[0, period)`.
 *
 * @param {number} position Scroll position.
 * @param {number} period   Length of the clock.
 *
 * @return {number} The same position, one turn in.
 */
function onTheClock(position, period) {
	return period > 0 ? ((position % period) + period) % period : 0;
}

/**
 * The slide a repeating carousel is resting on.
 *
 * @param {HTMLElement} list     Item template list.
 * @param {Object}      geometry Layout of the loop.
 *
 * @return {number} Index of the nearest slide.
 */
function getCurrentRepeatingSlide(list, geometry = getRepeatGeometry(list)) {
	const { count, step, period, origin } = geometry;

	if (!count || !step) {
		return 0;
	}

	return (
		Math.round(
			onTheClock(getScrollPosition(list) - origin, period) / step
		) % count
	);
}

/**
 * Scroll a repeating carousel to one of its slides.
 *
 * The slide is at its own step on the clock, one period apart from itself
 * again - so of those places the one asked for is the nearest, or the
 * nearest ahead or behind when the press said which way. The travel is one
 * unbroken move, however far off the range it aims: every frame of it is
 * put back onto the range, which is the same picture.
 *
 * @param {HTMLElement} list      Item template list.
 * @param {number}      index     Slide to rest on, counted round the loop.
 * @param {number}      direction `1` forwards, `-1` back, `0` the nearest way.
 * @param {number}      speed     How fast the carousel is already going, in
 *                                pixels of scroll per millisecond. Zero for a
 *                                press, which starts from rest.
 */
function goToRepeatingSlide(list, index, direction = 0, speed = 0) {
	const geometry = getRepeatGeometry(list);
	const { count, step, period, origin } = geometry;

	if (!count || !step) {
		return;
	}

	const wanted = ((index % count) + count) % count;
	const position = getScrollPosition(list);
	const base = origin + wanted * step;

	let target = base;

	// The nearest place the way the press said, however many turns off the
	// slide's own place is: a carousel that had just come round to the start
	// of its range was sent a whole turn on to a slide one step ahead.
	if (direction > 0) {
		while (target - period > position + 1) {
			target -= period;
		}

		while (target <= position + 1) {
			target += period;
		}
	} else if (direction < 0) {
		while (target + period < position - 1) {
			target += period;
		}

		while (target >= position - 1) {
			target -= period;
		}
	} else {
		target = [base - period, base, base + period].reduce((near, place) =>
			Math.abs(place - position) < Math.abs(near - position)
				? place
				: near
		);
	}

	pending.set(list, { index: wanted, time: window.performance.now() });
	travelRepeating(list, position, target, period, speed);
}

// The travel under way on each repeating carousel, so that a press that
// comes before the last one has arrived takes over from it rather than
// racing it.
const travels = new WeakMap();

/**
 * Where a position on the clock of a repeating carousel is scrolled to.
 *
 * Blossom keeps the scroll a margin in from either end of its range and puts
 * a scroll that reaches an end back at the other, so the range a frame can
 * be drawn at is the margin in from both ends - and a position off it is
 * the same picture a period along.
 *
 * @param {number} place  Position, anywhere on the clock.
 * @param {number} period Length of the clock.
 *
 * @return {number} The same picture, inside the range.
 */
function onTheRange(place, period) {
	const end = period - REPEAT_EDGE;
	const turned = onTheClock(place, period);

	if (turned >= REPEAT_EDGE && turned <= end) {
		return turned;
	}

	// Inside the margin at either end, which is one picture: the near edge.
	return turned + period <= end ? turned + period : REPEAT_EDGE;
}

/**
 * Put a repeating carousel at a position on its clock, at once.
 *
 * Blossom moves the slides round when the list reports a scroll, and the
 * browser reports one at the top of the next frame - after this frame has been
 * drawn. So the frame that crosses the seam was drawn where the carousel had
 * got to with the slides still where it came from, which is a blank strip as
 * wide as whatever had yet to be moved round: a flicker, once per pass. The
 * list is told here instead, and the slides move round in time to be drawn.
 *
 * @param {HTMLElement} list     Item template list.
 * @param {number}      position Position, anywhere on the clock.
 * @param {number}      period   Length of the clock.
 */
function placeRepeating(list, position, period) {
	const at = onTheRange(position, period);
	const moved = at !== getScrollPosition(list);

	// Set outright: the list scrolls smoothly by its stylesheet, and a
	// position merely assigned to it is a smooth scroll of its own - which,
	// for the frame that steps from one end of the range to the other, was a
	// smooth scroll the whole way back.
	list.scrollTo({ left: isRtl(list) ? -at : at, behavior: 'instant' });

	if (moved) {
		list.dispatchEvent(new window.Event('scroll'));
	}
}

/**
 * Move a repeating carousel from one position on its clock to another.
 *
 * Drawn frame by frame rather than left to the browser's smooth scroll: the
 * browser cannot scroll past the range, and a move made in two scrolls came
 * to rest halfway. Snapping is held off for the move and given back at
 * rest, where the snap and the rest agree. A visitor who asked for less
 * motion gets the arrival alone.
 *
 * @param {HTMLElement} list   Item template list.
 * @param {number}      from   Position the move starts at.
 * @param {number}      to     Position it ends at, anywhere on the clock.
 * @param {number}      period Length of the clock.
 * @param {number}      speed  How fast the carousel is already going, in
 *                             pixels of scroll per millisecond. Zero for a
 *                             move that starts from rest.
 */
function travelRepeating(list, from, to, period, speed = 0) {
	stopTravel(list);

	// Blossom writes the snap type of the list into a custom property and
	// reads it back in a rule of its own, with `!important` and in a layer
	// of its own - which outranks anything set on the element. The property
	// is the one switch the rule answers to.
	const snap = list.style.getPropertyValue(SNAP_TYPE_PROPERTY);

	list.style.setProperty(SNAP_TYPE_PROPERTY, 'none');

	// Set outright: the list scrolls smoothly by its stylesheet, and a
	// position merely assigned to it is a smooth scroll of its own - which,
	// for the frame that steps from one end of the range to the other, was a
	// smooth scroll the whole way back.
	const place = (position) => placeRepeating(list, position, period);

	const finish = () => {
		travels.delete(list);

		if (snap) {
			list.style.setProperty(SNAP_TYPE_PROPERTY, snap);
		} else {
			list.style.removeProperty(SNAP_TYPE_PROPERTY);
		}

		remeasureLoop(list);
	};

	// A carousel that was thrown is already going, and a move that eased in
	// from a standstill stopped it dead under the finger that let it go and
	// started it again. It carries on instead, and only slows down - which is
	// what the browser does with a carousel that does not repeat, and what
	// this one was next to and read worse than.
	const distance = Math.abs(to - from);
	// Not a throw when the carousel has to turn round to get there: a drag
	// let go short of the next slide comes back to the one it left, and
	// coming back is a move that starts from rest like any other.
	const thrown = distance > 0 && Math.sign(to - from) === Math.sign(speed);
	// A cube leaves the start at three times the average speed of the move,
	// so three times the distance over the speed is the length that carries
	// on at exactly the speed it was let go at.
	const carried = Math.min(
		TRAVEL_LONGEST,
		Math.max(TRAVEL_SHORTEST, (3 * distance) / Math.abs(speed))
	);

	let duration = thrown ? carried : TRAVEL_DURATION;

	// A visitor who asked for less motion gets the arrival alone.
	if ('auto' === getScrollBehavior()) {
		duration = 0;
	}

	const started = window.performance.now();

	let raf = 0;

	const frame = (now) => {
		const t = duration ? Math.min(1, (now - started) / duration) : 1;
		const left = 1 - t;
		// Slowing down out of the throw, or easing in and out of a rest - so
		// the move starts and stops as a scroll of its own does.
		const eased = thrown
			? 1 - left * left * left
			: 0.5 - Math.cos(Math.PI * t) / 2;

		place(from + (to - from) * eased);

		if (t < 1) {
			raf = window.requestAnimationFrame(frame);

			return;
		}

		// Snapping comes back a frame later. Blossom lays the copies out on
		// the scroll event, which the browser runs before the next frame's
		// callbacks - and a snap given back before that found the slide the
		// carousel rests on still moved round to the far end, and took the
		// carousel to the nearest slide that was not.
		raf = window.requestAnimationFrame(() => {
			raf = window.requestAnimationFrame(finish);
		});
	};

	travels.set(list, () => {
		window.cancelAnimationFrame(raf);
		finish();
	});

	// The carousel is put where it already is before the first frame is asked
	// for. Blossom stops throwing a carousel the moment anything else scrolls
	// it, and a travel that waited for its frame let a throw it was taking
	// over from move the carousel once more first.
	place(from);

	raf = window.requestAnimationFrame(frame);
}

/**
 * Stop the travel under way on a repeating carousel, where there is one.
 *
 * @param {HTMLElement} list Item template list.
 */
function stopTravel(list) {
	travels.get(list)?.();
}

/**
 * Land a drag of a repeating carousel on one of its slides.
 *
 * Blossom lets a carousel go at the resting place nearest to where the throw
 * was headed, chosen from a list of them it measures off the slides as they
 * are drawn - the copies moved round to the far end included - and measures
 * again only when the list gains or loses a child. The loop moves those
 * copies on every scroll, so the list is out of date by the time it is read:
 * a flick back from the first slide was aimed at a last slide that had since
 * been moved, and came back to the first, or at a slide that was no longer
 * anywhere near, and did not move at all. A place off either end of the
 * scroll is put back onto it as well, and the loop takes a scroll that
 * reaches an end round to the other - so a flick across the seam finished at
 * the edge of the range, which is half a slide from anywhere.
 *
 * The throw is worked out here instead, on the clock of the loop, and drawn
 * by the travel an arrow press is drawn by. Blossom still carries the drag
 * itself; this is only where it comes to rest.
 *
 * @param {HTMLElement} list Item template list.
 *
 * @return {Function} Teardown.
 */
function landDrags(list) {
	// Where the pointer has been, in time order, since the press began.
	let trail = [];
	// How far it has travelled, however much of that it took back.
	let travelled = 0;

	const onMove = (event) => {
		travelled += Math.abs(event.clientX - trail[trail.length - 1].x);
		trail.push({ x: event.clientX, time: event.timeStamp });
	};

	const stopWatching = () => {
		window.removeEventListener('pointermove', onMove);
		window.removeEventListener('pointerup', onUp);
		window.removeEventListener('pointercancel', onUp);
	};

	function onUp(event) {
		stopWatching();

		// A press that moved nothing was a click, and Blossom leaves the
		// carousel where it is for one of those too.
		if (
			travelled <= DRAG_SLOP ||
			'true' !== list.getAttribute(OVERFLOW_ATTRIBUTE)
		) {
			return;
		}

		const { count, step, origin } = getRepeatGeometry(list);

		if (!count || !step) {
			return;
		}

		const end = { x: event.clientX, time: event.timeStamp };
		// The tail of the drag is what it was thrown with. A pointer that came
		// to a stop before it was let go has no point inside the window, and
		// the last one there is answers with a throw of nothing.
		const start =
			trail.find((point) => end.time - point.time <= FLICK_WINDOW) ||
			trail[trail.length - 1];
		const elapsed = Math.max(1, end.time - start.time);
		// How fast the carousel was going when it was let go, in the scroll's
		// own direction: a carousel runs against the pointer, thrown to the
		// left it goes forwards, and back on a right to left page, which
		// starts at the right.
		const speed = ((end.x - start.x) / elapsed) * (isRtl(list) ? 1 : -1);
		const landing = getScrollPosition(list) + speed * FLICK_CARRY;

		goToRepeatingSlide(
			list,
			getNearestPlace(
				getRestingPlaces(list),
				Math.round((landing - origin) / step),
				count
			),
			0,
			speed
		);
	}

	const onDown = (event) => {
		// A drag takes over from a step the module is still drawing.
		stopTravel(list);

		trail = [{ x: event.clientX, time: event.timeStamp }];
		travelled = 0;

		window.addEventListener('pointermove', onMove);
		window.addEventListener('pointerup', onUp);
		window.addEventListener('pointercancel', onUp);
	};

	list.addEventListener('pointerdown', onDown);

	return () => {
		list.removeEventListener('pointerdown', onDown);
		stopWatching();
	};
}

/**
 * Keep the resting places of a repeating carousel off the seam of its loop.
 *
 * Blossom lets the scroll rest no nearer than a margin to either end of its
 * range, and puts a scroll that gets nearer back at the other end - so the
 * clock has a dead stretch as wide as the margin on either side of its seam,
 * and a slide whose resting place falls in it can never be rested on: the
 * browser snaps into the stretch, Blossom throws the scroll to the other
 * end, and the two hand the carousel back and forth until it gives up on the
 * slide before. Four columns with no gap put a slide exactly there.
 *
 * The slides rest one step apart from where the padding at the start puts
 * the first, so when that lands within the clearance of a multiple of the
 * step, twice the clearance is moved from the padding at the end to the
 * padding at the start. Every resting place moves off the stretch, and
 * nothing else does: the two paddings still add up to the frame, so the
 * loop is as long as it was and the copies land where they did.
 *
 * @param {HTMLElement} list Item template list.
 *
 * @return {Function} Teardown.
 */
function keepSeamOffTheGrid(list) {
	const view = list.ownerDocument.defaultView || window;

	const update = () => {
		const applied =
			parseFloat(list.style.getPropertyValue(SEAM_SHIFT_PROPERTY)) || 0;
		const { count, step, period, origin } = getRepeatGeometry(list);

		if (!count || !step) {
			return;
		}

		// Where the first slide would rest with no shift at all, on its step.
		const bare = origin - applied;
		const offset = ((bare % step) + step) % step;
		const wanted =
			offset < SEAM_CLEARANCE || offset > step - SEAM_CLEARANCE
				? 2 * SEAM_CLEARANCE
				: 0;

		if (wanted === applied) {
			return;
		}

		if (wanted) {
			list.style.setProperty(SEAM_SHIFT_PROPERTY, `${wanted}px`);
		} else {
			list.style.removeProperty(SEAM_SHIFT_PROPERTY);
		}

		// The slides moved with the padding, and the scroll goes with them so
		// the carousel shows what it showed.
		if (period) {
			placeRepeating(
				list,
				getScrollPosition(list) + (wanted - applied),
				period
			);
		}

		// Blossom reads the padding when it measures and not again, so it is
		// asked to measure once more - when it is there to ask.
		if (carousels.has(list)) {
			remeasureLoop(list);
		}
	};

	update();

	// The step is a share of the frame and the padding another, so where the
	// first slide rests on its step changes with the width.
	const observer = new view.ResizeObserver(update);

	observer.observe(list);

	return () => {
		observer.disconnect();
		list.style.removeProperty(SEAM_SHIFT_PROPERTY);
	};
}

/**
 * Put a repeating carousel on one of its slides, at once.
 *
 * @param {HTMLElement} list  Item template list.
 * @param {number}      index Slide to open on.
 */
function openOnSlide(list, index) {
	const { count, step, origin } = getRepeatGeometry(list);
	const place = origin + (count ? index % count : 0) * step;

	list.scrollTo({
		left: isRtl(list) ? -place : place,
		behavior: 'instant',
	});
	syncNav(list);
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
	const items = Array.from(list.querySelectorAll(ITEM_SELECTOR));

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
	const centred = window
		.getComputedStyle(items[0])
		.scrollSnapAlign.startsWith('center');
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
function getCurrentSlide(list, targets = getSlideTargets(list)) {
	if (isRepeating(list)) {
		return getCurrentRepeatingSlide(list);
	}

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
		const count = list.querySelectorAll(ITEM_SELECTOR).length;

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
function syncNav(list) {
	const root = getControlsRoot(list);

	// Snapping never lands exactly on the edge, and a whole pixel of slack is
	// less than any scroll step.
	const position = getScrollPosition(list);
	const end = list.scrollWidth - list.clientWidth - 1;
	const repeats = isRepeating(list);

	// A carousel that repeats has no ends to run out of.
	const atStart = !repeats && position <= 1;
	const atEnd = !repeats && position >= end;

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

	syncIndicators(list, root);
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
function syncIndicators(list, root = getControlsRoot(list)) {
	const current = getDisplayedSlide(list);
	const total = list.querySelectorAll(ITEM_SELECTOR).length;

	root.querySelectorAll(SLIDE_TARGET_SELECTOR).forEach((target) => {
		const index = parseInt(target.dataset.vpSlide, 10);

		target.setAttribute(
			'aria-current',
			index === current ? 'true' : 'false'
		);
	});

	const places = getRestingPlaces(list);

	root.querySelectorAll(DOTS_SELECTOR).forEach((container) => {
		syncDotRow(container, current, places);
	});

	root.querySelectorAll(THUMBS_SELECTOR).forEach((strip) => {
		showThumb(strip, current);
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

	// A dot with nowhere behind it does nothing when pressed.
	for (let index = dots.length - 1; index >= items; index -= 1) {
		dots[index].remove();
	}

	for (let index = dots.length; index < items; index += 1) {
		const dot = document.createElement('button');

		dot.type = 'button';
		dot.className = DOT_SELECTOR.slice(1);
		container.appendChild(dot);
	}

	// Named after the slide each one goes to, which is not its own place in
	// the row when the arrows move a frame at a time.
	container.querySelectorAll(DOT_SELECTOR).forEach((dot, index) => {
		const slide = places[index];

		dot.dataset.vpSlide = String(slide);
		dot.setAttribute('aria-label', label.replace('%d', String(slide + 1)));
	});

	// The pill is drawn over the dots and is nobody's slide, so it is out of
	// the reach of a pointer and of a screen reader: the dot underneath is the
	// button, and it is the one that says which slide it names.
	if (items && !container.querySelector(WORM_SELECTOR)) {
		const worm = document.createElement('span');

		worm.className = WORM_CLASS;
		worm.setAttribute('aria-hidden', 'true');
		worm.innerHTML = `<span class="${DOT_PROGRESS_CLASS}"></span>`;
		container.prepend(worm);
	}
}

/**
 * Where the dots of a row will come to rest.
 *
 * Worked out from the shape the stylesheet writes down rather than read off the
 * row: the dots are still making room for the pill while this runs, so a
 * measurement taken now is of a row halfway through a move.
 *
 * @param {HTMLElement} container Indicator drawn as dots.
 * @param {number}      count     How many dots it has.
 * @param {number}      current   Slide the carousel is showing.
 *
 * @return {Object} The sizes, and where each dot starts and ends.
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
	// How far a dot steps aside for the one on screen. The stylesheet works
	// the same number out of the same two lengths; a custom property that is
	// a sum of others is handed back unresolved, so it is worked out again
	// here rather than read.
	const spread = Math.max(0, (grown - size) / 2);
	// The row is placed inside whatever the box around it keeps for itself,
	// and the pill is placed against that box rather than against the row - so
	// an indicator drawn as a filled pill, which is padded, had its own pill
	// sitting a padding to the left of the dots it was meant to be on.
	const inset = parseFloat(style.paddingInlineStart) || 0;
	const index = Math.min(Math.max(current, 0), Math.max(0, count - 1));

	// Every slide keeps a slot of the same width, so the row is the same width
	// and the same shape whatever the carousel is doing. A dot rests where its
	// slot puts it, give or take the step it takes aside for the one on
	// screen - and the one on screen takes none, which is what keeps the pill
	// travelling a slot at a time.
	const stepOf = (at) => {
		if (at === index) {
			return 0;
		}

		return at < index ? -spread : spread;
	};

	return {
		slot,
		grown,
		index,
		centreOf: (at) => inset + at * slot + slot / 2 + stepOf(at),
		content: count * slot + spread * 2,
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
	const items = list.querySelectorAll(ITEM_SELECTOR);

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
	const places = restingPlaces.get(list);

	if (places) {
		return places;
	}

	return Array.from(
		list.querySelectorAll(ITEM_SELECTOR),
		(ignored, at) => at
	);
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
 * Crawl the pill of an indicator to the dot the carousel has reached.
 *
 * Two edges rather than one box: the edge in front of the travel leaves at
 * once and the one behind it follows, so the pill stretches across the ground
 * between two dots and gathers itself once the trailing edge has caught up.
 *
 * Drawn frame by frame rather than handed to the browser as an animation,
 * because the far end moves: a swipe steps again before the pill has arrived,
 * and an animation can only be replaced - which either snapped the pill to
 * where the last step was aimed or stretched it a second time from a shape
 * that was already stretched, pulsing once per slide. Given a new destination
 * mid-crawl, the two edges simply carry on towards it.
 *
 * @param {HTMLElement} container Indicator drawn as dots.
 * @param {Object}      geometry  Where the dots come to rest.
 * @param {number}      reach     The most ground it may cover at once.
 */
function moveWorm(container, geometry, reach) {
	const worm = container.querySelector(WORM_SELECTOR);

	if (!worm) {
		return;
	}

	const to = {
		left: Math.round(
			geometry.centreOf(geometry.index) - geometry.grown / 2
		),
		width: geometry.grown,
	};
	const at = worms.get(container);

	// Written only when it has changed. The row is asked about on every frame
	// of a scroll, and writing the same two lengths back each time laid the
	// page out again for nothing.
	if (at && at.left === to.left && at.width === to.width) {
		return;
	}

	worms.set(container, to);

	const place = (left, width) => {
		worm.style.insetInlineStart = `${Math.round(left)}px`;
		worm.style.width = `${Math.round(width)}px`;
	};

	// Nothing to crawl from, or a visitor who asked for less motion: the pill
	// is simply where it belongs.
	if (!at || 'auto' === getScrollBehavior()) {
		crawls.delete(container);
		place(to.left, to.width);

		return;
	}

	const crawl = crawls.get(container) || {
		tail: at.left,
		head: at.left + at.width,
		frame: 0,
	};

	// A step landing mid-crawl sets off from where the edges are, so a pill
	// that is already stretched stays stretched: the trailing edge is held
	// back again rather than being allowed to catch up first.
	crawl.tailFrom = crawl.tail;
	crawl.headFrom = crawl.head;
	crawl.tailTo = to.left;
	crawl.headTo = to.left + to.width;
	// Which edge is in front. Going back along the row it is the left one, and
	// holding the right one back is what stretches the pill - hold the wrong
	// one and it shrinks away from the direction it is travelling in.
	crawl.onwards = crawl.tailTo >= crawl.tailFrom;
	crawl.reach = reach;
	crawl.started = window.performance.now();
	crawls.set(container, crawl);

	if (crawl.frame) {
		return;
	}

	// The leading edge is away at once and slows into place; the trailing edge
	// eases out of its wait as well as into its arrival, so that it gathers the
	// pill up rather than snapping after it.
	const settle = (part) => 1 - (1 - part) ** 3;
	const gather = (part) => part * part * (3 - 2 * part);

	const tick = () => {
		if (!worm.isConnected || crawls.get(container) !== crawl) {
			crawl.frame = 0;

			return;
		}

		const part = Math.min(
			1,
			(window.performance.now() - crawl.started) / WORM_DURATION
		);
		const lead = settle(Math.min(1, part / WORM_LEAD_SPAN));
		const trail = gather(
			Math.max(0, (part - WORM_TRAIL_DELAY) / (1 - WORM_TRAIL_DELAY))
		);
		const headPart = crawl.onwards ? lead : trail;
		const tailPart = crawl.onwards ? trail : lead;

		crawl.head =
			crawl.headFrom + (crawl.headTo - crawl.headFrom) * headPart;
		crawl.tail =
			crawl.tailFrom + (crawl.tailTo - crawl.tailFrom) * tailPart;

		// Long enough to read as a crawl, never longer than the row can show.
		if (crawl.head - crawl.tail > crawl.reach) {
			if (crawl.onwards) {
				crawl.tail = crawl.head - crawl.reach;
			} else {
				crawl.head = crawl.tail + crawl.reach;
			}
		}

		place(crawl.tail, Math.max(1, crawl.head - crawl.tail));

		crawl.frame = part < 1 ? window.requestAnimationFrame(tick) : 0;
	};

	crawl.frame = window.requestAnimationFrame(tick);
}

/**
 * Bring a row of dots in line with the slide the carousel is showing.
 *
 * The pill crawls to the dot that names it, and a row given a window slides
 * under that window - a gallery of forty slides draws forty dots, which is a
 * wall rather than an indicator. Every dot stays in the page either way: each
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

	// A row showing its dots through a window has only so much room, and a
	// pill drawn wider than the window would be clipped by it. A row showing
	// all of its dots has the whole row to stretch across.
	moveWorm(
		container,
		geometry,
		collapsed ? geometry.slot * WORM_REACH : Number.POSITIVE_INFINITY
	);

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
		// moves: the dot lit and the pill stay with the slide on screen,
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
 * many. Zero is a whole screen, which has to be measured: a carousel whose
 * slides are their own width has no count of slides that means a screenful.
 *
 * @param {HTMLElement} list    Item template list.
 * @param {number[]}    targets Resting places of the slides.
 * @param {number}      from    Slide the press counts from.
 *
 * @return {number} Slides to move, at least one.
 */
function getGroupSize(list, targets, from) {
	const asked = parseInt(list.dataset.vpCarouselGroup, 10);

	if (asked >= 1) {
		return asked;
	}

	if (!Number.isInteger(asked)) {
		return 1;
	}

	const width = list.clientWidth;

	// A repeating carousel has no targets to walk: every slide is a step of
	// the same size, and the loop is carried by moving them round.
	if (isRepeating(list)) {
		const { step } = getRepeatGeometry(list);

		return step > 0 ? Math.max(1, Math.round(width / step)) : 1;
	}

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
 * The place a repeating carousel steps to, round its loop.
 *
 * @param {number[]} places    Resting places of the loop, in order.
 * @param {number}   from      Slide the press counts from.
 * @param {number}   direction `1` forwards, `-1` back.
 *
 * @return {number} Slide to rest on: the next place along, or the first
 *                  place again past the last.
 */
function getNextPlace(places, from, direction) {
	if (!places.length) {
		return from + direction;
	}

	if (direction > 0) {
		return places.find((place) => place > from) ?? places[0];
	}

	return [...places].reverse().find((place) => place < from) ?? places.at(-1);
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

	const held = pending.get(list);
	const remembered =
		held && window.performance.now() - held.time < STEP_MEMORY;

	// A carousel that repeats has no first and no last slide to run out of:
	// the step is counted round the clock, and the seam is crossed on the way.
	// Blossom carries the loop, but not the step through it - its own steps
	// are aimed at places it worked out from a padding it misread, and stop
	// at the seam.
	if (isRepeating(list)) {
		const from = remembered ? held.index : getCurrentRepeatingSlide(list);

		goToRepeatingSlide(
			list,
			getNextPlace(getRestingPlaces(list), from, direction),
			direction
		);

		return;
	}

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
 * @param {HTMLElement} list    Item template list.
 * @param {number}      index   Slide to rest on.
 * @param {number[]}    targets Resting places of the slides.
 */
function goToSlide(list, index, targets = getSlideTargets(list)) {
	if (isRepeating(list)) {
		goToRepeatingSlide(list, index);

		return;
	}

	const wanted = Math.max(0, Math.min(targets.length - 1, index));

	if (!targets.length || wanted !== index) {
		return;
	}

	pending.set(list, { index: wanted, time: window.performance.now() });

	scrollListTo(list, targets[wanted]);
}

/**
 * Let a strip of thumbnails be dragged along by a mouse.
 *
 * A finger already drags it - it is a scroll container - and a mouse does not,
 * which is the same gap the carousel itself fills. It is filled the same way:
 * the strip is handed to Blossom, the library the carousel already loads, so a
 * thumbnail row behaves like the slides above it and nothing new is shipped to
 * do it.
 *
 * @param {HTMLElement} list    Item template list.
 * @param {boolean}     canDrag Whether the pointer of this visitor can drag.
 *
 * @return {Function} Teardown.
 */
function initThumbDrag(list, canDrag) {
	const strips = Array.from(
		getControlsRoot(list).querySelectorAll(THUMBS_SELECTOR)
	);
	const source = list.dataset.vpCarouselSrc;

	if (!strips.length || !source || !canDrag) {
		return noop;
	}

	const dragged = [];
	let dropped = false;

	// The same module the carousel imports, and the same request: a module
	// asked for twice is evaluated once.
	import(/* webpackIgnore: true */ source)
		.then(({ Blossom }) => {
			if (dropped) {
				return;
			}

			strips.forEach((strip) => {
				if (!strip.isConnected || carousels.has(strip)) {
					return;
				}

				const carousel = Blossom(strip, { repeat: false });

				carousels.set(strip, carousel);
				carousel.init();
				dragged.push(strip);
			});
		})
		.catch(() => {
			// A strip that could not be handed over is still a scroll
			// container, and still answers a finger and a wheel.
		});

	return () => {
		dropped = true;

		dragged.forEach((strip) => {
			carousels.get(strip)?.destroy();
			carousels.delete(strip);
		});
	};
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
	let dragging = null;
	// A press that never moved is a press, not a drag: the carousel travels to
	// where it landed the way it travels for an arrow, rather than jumping.
	let from = 0;
	let moved = false;

	const holdSnap = () => {
		snap = list.style.getPropertyValue(SNAP_TYPE_PROPERTY);
		list.style.setProperty(SNAP_TYPE_PROPERTY, 'none');
		list.classList.add(SCRUBBING_CLASS);
		// The slide a press asked for a moment ago is not the current one any
		// more: the finger is, and the bar follows it.
		pending.delete(list);
	};

	const freeSnap = () => {
		if (snap) {
			list.style.setProperty(SNAP_TYPE_PROPERTY, snap);
		} else {
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
		if (isRepeating(list)) {
			const { count, step, origin, period } = getRepeatGeometry(list);

			// The bar of a loop runs from the first slide to the last, the
			// way it draws itself - see `getScrollProgress`.
			placeRepeating(
				list,
				origin + fraction * Math.max(0, count - 1) * step,
				period
			);

			return;
		}

		scrollListTo(
			list,
			fraction * (list.scrollWidth - list.clientWidth),
			'instant'
		);
	};

	// Travelling to where a press landed, which is a different thing: the
	// carousel is asked to go there and gets there the way it does for an
	// arrow - the browser's own smooth scroll, and for a repeating carousel
	// the step the module draws.
	const travelTo = (fraction) => {
		const total = list.querySelectorAll(ITEM_SELECTOR).length;

		// A visitor who has just chosen a place is owed a whole delay on it,
		// the same courtesy an arrow gets.
		list.dispatchEvent(new window.CustomEvent(STEP_EVENT));

		if (isRepeating(list)) {
			goToRepeatingSlide(list, getSlideAt(fraction, total), 0);

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

		const total = list.querySelectorAll(ITEM_SELECTOR).length;

		goToRepeatingSlide(list, getSlideAt(fraction, total), 0);
	};

	// The slide a fraction of the bar stands for, on the scale the bar is
	// drawn on: the first slide at the start, the last at the end, and a
	// resting place of the loop rather than a slide between two.
	const getSlideAt = (fraction, total) =>
		getNearestPlace(
			getRestingPlaces(list),
			Math.round(fraction * Math.max(0, total - 1)),
			total
		);

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
		stopTravel(list);

		dragging = event.currentTarget;
		from = event.clientX;
		moved = false;

		window.addEventListener('pointermove', onMove);
		window.addEventListener('pointerup', onUp);
		window.addEventListener('pointercancel', onUp);
	};

	const onKey = (event) => {
		const rtl = isRtl(list);
		const total = list.querySelectorAll(ITEM_SELECTOR).length;
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
	const pointerOn = new Set();
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

		// A held clock reads nothing: the slide it will count for is read on
		// the first frame it runs again.
		if (
			pointerOn.size ||
			focusIn.size ||
			held ||
			offscreen ||
			stopped.has(list)
		) {
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
			list.scrollTo({ left: 0, behavior: getScrollBehavior() });
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
	list.addEventListener(STEP_EVENT, restart);
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
 * have moved them - so a control beside a grid, or on a page whose module never
 * loaded, stays switched off and out of the way.
 *
 * @param {HTMLElement} list Item template list.
 *
 * @return {Function} Teardown.
 */
function wakeControls(list, hasAutoplay) {
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

/**
 * Start a carousel.
 *
 * @param {HTMLElement} list Item template list.
 *
 * @return {Function} Teardown.
 */
function initCarousel(list, restore) {
	const onScroll = () => syncNav(list);
	const onGoTo = (event) => goToSlide(list, event.detail?.index);

	// Drag is the one thing the browser does not do for a scroll container, and
	// it is the one thing Blossom adds - so it is loaded where a pointer can
	// drag and nowhere else. A carousel that repeats is the exception: the
	// endlessness is Blossom's too, and a touch device is owed it as much as a
	// desktop one. A carousel that asked to repeat with nothing to run round
	// is run as a plain one.
	if (isRepeating(list)) {
		askedToRepeat.add(list);
	}

	// Whether the slides overflow the frame is known once the columns are:
	// the slide width is a `calc()` over the column count, which auto mode
	// has to work out from the container, below. Unset until then, which is
	// what the first count tells the callback.
	let repeats;
	let columns = 0;

	const stopColumns = syncColumns(list, (count) => {
		columns = count;

		// Whether the slides overflow the frame changes with the columns.
		// Three slides fit three columns and overflow one, so a loop that
		// could not run before may run now, or the other way round. The
		// carousel is started again then, on the slide it is showing, the
		// way a Load More starts it again.
		if (
			undefined !== repeats &&
			askedToRepeat.has(list) &&
			hasLoop(list, count) !== repeats
		) {
			list.dispatchEvent(new window.Event(RELAYOUT_EVENT));

			return;
		}

		// A group measured as a screenful changes with the width of the frame,
		// so where a swipe rests is worked out again with the columns - and
		// so is the number of dots, one per place, which is why the places
		// come first. Blossom measured the loop at the old width, so it is
		// asked again.
		syncSnapGroups(list);
		syncDots(list);
		syncNav(list);

		if (carousels.has(list)) {
			remeasureLoop(list);
		}
	});

	// The stylesheet is told through the attribute it pads the loop by.
	repeats = askedToRepeat.has(list) && hasLoop(list, columns);

	if (repeats) {
		list.dataset.vpCarouselRepeat = 'true';
	} else {
		delete list.dataset.vpCarouselRepeat;
	}

	// Whether a play and pause button has anything to stop, which is the same
	// question `initAutoplay` answers by doing nothing at all.
	const hasAutoplay =
		!!parseFloat(list.dataset.vpCarouselAutoplay) &&
		!window.matchMedia('(prefers-reduced-motion: reduce)').matches;
	const sleepControls = wakeControls(list, hasAutoplay);

	syncSnapGroups(list);
	syncDots(list);
	syncNav(list);

	list.addEventListener('scroll', onScroll, { passive: true });
	list.addEventListener(GO_TO_EVENT, onGoTo);

	const stopObserving = observeItems(list, () => {
		syncSnapGroups(list);
		syncDots(list);
		syncNav(list);
	});

	// Before the first slide is looked for: the shift moves where it rests.
	const stopShifting = repeats ? keepSeamOffTheGrid(list) : noop;

	// A repeating carousel opens on its first slide - or on the slide it was
	// showing, when it is started again after a Load More. The padding the
	// loop is carried in comes from the stylesheet, so the place is known
	// before the library that carries the loop has loaded - and it is taken
	// now, so that the library never finds the scroll at zero, which it puts
	// at the far end.
	if (repeats) {
		openOnSlide(list, restore ?? 0);
	}

	const canDrag = window.matchMedia(
		'(hover: hover) and (pointer: fine)'
	).matches;
	const source = list.dataset.vpCarouselSrc;

	// A press with a mouse is the start of a drag as often as it is a click,
	// and the link under it takes focus on the press - which a theme draws a
	// ring around, so every swipe lit the picture up. Focus is the default of
	// the press and the click is not: it fires either way, and the keyboard
	// still reaches the link the ordinary way. The list takes the focus
	// instead, which is what lets the arrow keys move the carousel after a
	// click on it.
	//
	// A focus a script gives is one the browser draws a ring for, whatever
	// the pointer was doing - so the list is marked as focused by the pointer
	// and the stylesheet leaves the ring out, until a key says the keyboard
	// has taken over or the focus is gone.
	const onMouseDown = (event) => {
		if (0 !== event.button) {
			return;
		}

		event.preventDefault();
		list.classList.add(POINTER_FOCUS_CLASS);
		list.focus({ preventScroll: true });
	};
	const unmarkFocus = () => list.classList.remove(POINTER_FOCUS_CLASS);
	// A modifier on its own is not the keyboard taking over: Cmd is pressed
	// for a shortcut that goes elsewhere, Shift for a capital in another
	// field, and a ring drawn for either is a ring nobody asked for.
	const onKeyDown = (event) => {
		if (!MODIFIER_KEYS.has(event.key)) {
			unmarkFocus();
		}
	};

	if (canDrag) {
		list.addEventListener('mousedown', onMouseDown);
		list.addEventListener('keydown', onKeyDown);
		list.addEventListener('blur', unmarkFocus);
	}

	// A drag of a repeating carousel takes over from a step the module is
	// still drawing, and is landed on a slide by the module as well.
	const stopLanding = repeats ? landDrags(list) : noop;

	const stopAnswering = repeats ? answerForScrollWidth(list) : noop;

	// A carousel torn down while the library is still on its way, by a Load
	// More or by a column change that flips the loop, would have this import
	// land on the one started in its place, with the wrong mode.
	let torn = false;

	if ((canDrag || repeats) && source) {
		import(/* webpackIgnore: true */ source)
			.then(({ Blossom }) => {
				if (torn || !list.isConnected || carousels.has(list)) {
					return;
				}

				const carousel = Blossom(list, { repeat: repeats });

				carousels.set(list, carousel);
				carousel.init();

				// Measured before anything can scroll it: the library reads
				// the loop at its first resize callback, and until then
				// answers a scroll with the range it was born with - a few
				// hundred pixels, past which it throws the scroll to the
				// start. The measurement is asked for now, and arrives as a
				// mutation callback, ahead of any scroll event. Taken again
				// once the library has laid the loop out, in case its first
				// pass moved the scroll - and the loop is measured once more
				// after that, with the copies in place.
				if (repeats) {
					remeasureLoop(list);
					openOnSlide(list, restore ?? 0);
					window.requestAnimationFrame(() => {
						window.requestAnimationFrame(() => {
							if (carousels.has(list)) {
								remeasureLoop(list);
							}
						});
					});
				}
			})
			.catch(() => {
				// A carousel without drag is still a carousel.
			});
	}

	const stopAutoplay = initAutoplay(list);
	const stopScrub = initScrub(list);
	const stopThumbDrag = initThumbDrag(list, canDrag);
	const stopMarking = repeats ? markMovedRound(list) : noop;

	list.dispatchEvent(new window.CustomEvent(START_EVENT, { bubbles: true }));

	return () => {
		torn = true;
		list.dispatchEvent(
			new window.CustomEvent(STOP_EVENT, { bubbles: true })
		);
		stopMarking();
		stopAutoplay();
		stopScrub();
		stopThumbDrag();
		stopColumns();
		sleepControls();
		list.removeEventListener('scroll', onScroll);
		list.removeEventListener(GO_TO_EVENT, onGoTo);
		list.removeEventListener('mousedown', onMouseDown);
		list.removeEventListener('keydown', onKeyDown);
		list.removeEventListener('blur', unmarkFocus);
		unmarkFocus();
		stopShifting();
		stopLanding();
		stopTravel(list);
		stopAnswering();
		stopObserving();

		const carousel = carousels.get(list);

		if (carousel) {
			carousels.delete(list);
			carousel.destroy();

			// The library leaves the slides where it moved them round, and
			// a carousel started again as a plain one has nowhere to put
			// them back.
			list.querySelectorAll(ITEM_SELECTOR).forEach((item) => {
				item.style.removeProperty('translate');
			});
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
