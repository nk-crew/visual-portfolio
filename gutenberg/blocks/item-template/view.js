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
		// box is the list inset by what the effect asks for.
		const slide = item.querySelector(SLIDE_SELECTOR);
		const inset = slide
			? parseFloat(window.getComputedStyle(slide).viewTimelineInset) || 0
			: 0;
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
const DOT_PROGRESS_CLASS = 'vp-block-loop-carousel-dot-progress';
const PROGRESS_SELECTOR = '.vp-block-loop-carousel-indicator--progress';

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
const SLIDE_SELECTOR = '.wp-block-visual-portfolio-item-template__slide';
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

// How close to either end of its scroll range Blossom lets a repeating
// carousel rest. The loop is carried by copies of the slides moved round to
// the far end, and a scroll that passes this margin at one end is put back
// by a whole period at the other - so the range a step can be aimed at is
// the margin in from both ends, and a step past it is made in two moves.
const REPEAT_EDGE = 4;

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

	if (direction > 0) {
		while (target <= position + 1) {
			target += period;
		}
	} else if (direction < 0) {
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
	const place = (position) => {
		const at = onTheRange(position, period);
		const moved = at !== getScrollPosition(list);

		list.scrollTo({ left: isRtl(list) ? -at : at, behavior: 'instant' });

		if (!moved) {
			return;
		}

		// Blossom moves the slides round when the list reports a scroll, and
		// the browser reports one at the top of the next frame - after this
		// frame has been drawn. So the frame that crosses the seam was drawn
		// where the carousel had got to with the slides still where it came
		// from, which is a blank strip as wide as whatever had yet to be
		// moved round: a flicker, once per pass, on the step across the seam.
		// The list is told here instead, and the slides move round in time to
		// be drawn.
		list.dispatchEvent(new window.Event('scroll'));
	};

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
			Math.round((landing - origin) / step),
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
 * Put a repeating carousel on its first slide, at once.
 *
 * @param {HTMLElement} list Item template list.
 */
function openOnFirstSlide(list) {
	const { origin } = getRepeatGeometry(list);

	list.scrollTo({
		left: isRtl(list) ? -origin : origin,
		behavior: 'instant',
	});
	syncNav(list);
}

/**
 * Scroll a carousel to a position measured from its own start.
 *
 * @param {HTMLElement} list     Item template list.
 * @param {number}      position Distance from the start.
 */
function scrollListTo(list, position) {
	// The list is scrolled rather than the slide scrolled into view: that one
	// walks every scrollable ancestor, and the page must not move under a
	// lightbox that is showing the same item. Forwards is leftwards on a right
	// to left page, which is the sign `scrollLeft` speaks in.
	list.scrollTo({
		left: isRtl(list) ? -position : position,
		behavior: getScrollBehavior(),
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

	// The slide a press asked for is the current one from the press on: the
	// dots the carousel passes on its way there are not visited, and the
	// one pressed is the one lit. Once the carousel has had time to arrive,
	// the position answers again - which is also what a drag reads.
	const held = pending.get(list);
	const current =
		held && window.performance.now() - held.time < STEP_HOLD
			? held.index
			: getCurrentSlide(list);

	root.querySelectorAll(DOT_SELECTOR).forEach((dot) => {
		const index = parseInt(dot.dataset.vpSlide, 10);

		dot.setAttribute('aria-current', index === current ? 'true' : 'false');
	});

	const value = getScrollProgress(list);

	root.querySelectorAll(PROGRESS_SELECTOR).forEach((progress) => {
		progress.style.setProperty('--vp-carousel-progress', `${value * 100}%`);
		progress.setAttribute('aria-valuenow', String(Math.round(value * 100)));
	});
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
	const items = list.querySelectorAll(ITEM_SELECTOR).length;

	getControlsRoot(list)
		.querySelectorAll(DOTS_SELECTOR)
		.forEach((container) => {
			fillDots(container, items);
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
 * @param {number}      items     Number of slides.
 */
function fillDots(container, items) {
	const dots = container.querySelectorAll(DOT_SELECTOR);
	const label = container.dataset.vpDotLabel || '';

	// A dot with no slide behind it does nothing when clicked.
	for (let index = dots.length - 1; index >= items; index -= 1) {
		dots[index].remove();
	}

	for (let index = dots.length; index < items; index += 1) {
		const dot = document.createElement('button');

		dot.type = 'button';
		dot.className = DOT_SELECTOR.slice(1);
		dot.dataset.vpSlide = String(index);
		dot.setAttribute('aria-label', label.replace('%d', String(index + 1)));
		dot.innerHTML = `<span class="${DOT_PROGRESS_CLASS}"></span>`;
		container.appendChild(dot);
	}
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

		goToRepeatingSlide(list, from + direction, direction);

		return;
	}

	const targets = getSlideTargets(list);

	// A press that comes faster than the carousel travels is still one slide:
	// it counts from the slide the last press was headed for, not from the one
	// the animation happens to be passing.
	const from = remembered ? held.index : getCurrentSlide(list, targets);

	goToSlide(list, getNextSlide(targets, from, direction), targets);
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
	let paused = false;
	// Asked for from outside, and kept apart from `paused` so that releasing it
	// does not start a carousel the pointer is resting on.
	let held = false;
	// Off the screen. A carousel nobody can see has nobody to run for, and a
	// visitor who scrolls back to it is owed the slide they left it on: the
	// clock holds rather than turning back, like a pause.
	let offscreen = true;

	const setProgress = (value) => {
		root.style.setProperty(
			'--vp-carousel-autoplay-progress',
			`${value * 100}%`
		);
	};

	const tick = (now) => {
		raf = window.requestAnimationFrame(tick);

		const step = now - last;

		last = now;

		if (paused || held || offscreen) {
			return;
		}

		elapsed += step;

		setProgress(Math.min(1, elapsed / delay));

		if (elapsed < delay) {
			return;
		}

		elapsed = 0;

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

	const pause = () => {
		paused = true;
	};
	const resume = () => {
		paused = false;
	};
	const hold = (event) => {
		held = false === event.detail?.playing;
	};
	const restart = () => {
		elapsed = 0;
		setProgress(0);
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
		box.addEventListener('pointerenter', pause);
		box.addEventListener('pointerleave', resume);
		box.addEventListener('focusin', pause);
		box.addEventListener('focusout', resume);
	});
	list.addEventListener('pointerdown', pause);
	list.addEventListener(AUTOPLAY_EVENT, hold);
	list.addEventListener(STEP_EVENT, restart);

	raf = window.requestAnimationFrame((now) => {
		last = now;
		tick(now);
	});

	return () => {
		window.cancelAnimationFrame(raf);
		watcher.disconnect();
		root.classList.remove(PLAYING_CLASS);
		boxes.forEach((box) => {
			box.removeEventListener('pointerenter', pause);
			box.removeEventListener('pointerleave', resume);
			box.removeEventListener('focusin', pause);
			box.removeEventListener('focusout', resume);
		});
		list.removeEventListener('pointerdown', pause);
		list.removeEventListener(AUTOPLAY_EVENT, hold);
		list.removeEventListener(STEP_EVENT, restart);
		root.style.removeProperty('--vp-carousel-autoplay-progress');
	};
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
function wakeControls(list) {
	const controls = getControls(list);

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
function initCarousel(list) {
	const onScroll = () => syncNav(list);
	const onGoTo = (event) => goToSlide(list, event.detail?.index);

	// The slide width is a `calc()` over the column count, which auto mode has
	// to work out from the container.
	const stopColumns = syncColumns(list, () => syncNav(list));
	const sleepControls = wakeControls(list);

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
	const repeats = isRepeating(list);

	// A repeating carousel opens on its first slide. The padding the loop is
	// carried in comes from the stylesheet, so the place is known before the
	// library that carries the loop has loaded - and it is taken now, so
	// that the library never finds the scroll at zero, which it puts at the
	// far end.
	if (repeats) {
		openOnFirstSlide(list);
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
	const onMouseDown = (event) => {
		if (0 !== event.button) {
			return;
		}

		event.preventDefault();
		list.focus({ preventScroll: true });
	};

	if (canDrag) {
		list.addEventListener('mousedown', onMouseDown);
	}

	// A drag of a repeating carousel takes over from a step the module is
	// still drawing, and is landed on a slide by the module as well.
	const stopLanding = repeats ? landDrags(list) : noop;

	const stopAnswering = repeats ? answerForScrollWidth(list) : noop;

	if ((canDrag || repeats) && source) {
		import(/* webpackIgnore: true */ source)
			.then(({ Blossom }) => {
				if (!list.isConnected || carousels.has(list)) {
					return;
				}

				const carousel = Blossom(list, { repeat: repeats });

				carousels.set(list, carousel);
				carousel.init();

				// Taken again once the library has laid the loop out, in
				// case its first pass moved the scroll - and the loop is
				// measured once more after that, with the copies in place.
				if (repeats) {
					openOnFirstSlide(list);
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
	const stopMarking = repeats ? markMovedRound(list) : noop;

	return () => {
		stopMarking();
		stopAutoplay();
		stopColumns();
		sleepControls();
		list.removeEventListener('scroll', onScroll);
		list.removeEventListener(GO_TO_EVENT, onGoTo);
		list.removeEventListener('mousedown', onMouseDown);
		stopLanding();
		stopTravel(list);
		stopAnswering();
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
