/**
 * The view timelines of a carousel effect, kept by hand.
 *
 * Every carousel effect is a scroll driven animation over the boxes of a
 * slide, played by how far the slide is through the frame. A browser without
 * scroll driven animations - Firefox, Safari before 26 - has no timeline to
 * play it on, and nothing in the plugin, in WordPress or in the browser stands
 * in for one; so this does. On every scroll it measures where each slide is
 * in the frame and writes the two numbers a view timeline would have known -
 * how far through `cover` and through `contain` the slide is - on the item,
 * and the stylesheet holds the same animations still, paused, at the time
 * those numbers name. Where the browser has the timelines this does nothing
 * at all: the native rules apply, and the numbers would go unread.
 *
 * A contract with every effect stylesheet, the Pro ones included:
 *
 * - `vp-carousel-scripted` is put on a list whose slides carry the numbers,
 *   and the scripted rules apply to such a list and to no other - so a
 *   browser without the timelines and without the script keeps the plain
 *   carousel rather than a pile of slides held at the start of an effect.
 * - `--vp-carousel-cover` and `--vp-carousel-contain` are the two ranges, as
 *   progress from 0 to 1 and past either end: a range of an animation may
 *   reach past both, and the fill mode holds a slide beyond it where it
 *   should be.
 * - `--vp-carousel-timeline-inset` is what an effect would have set as
 *   `view-timeline-inset` on a slide, in a registered length so it is read
 *   back in pixels: the frame is inset by it on both sides for that slide.
 *
 * Nothing here knows an effect by name. The stylesheet decides what each
 * number means for each effect, the way `animation-range` does natively, so
 * an effect added there needs nothing added here.
 */

const ITEM_SELECTOR = '.wp-block-visual-portfolio-item-template__item';
const EFFECT_CLASS = 'vp-carousel-effect';
const SCRIPTED_CLASS = 'vp-carousel-scripted';
const COVER_PROPERTY = '--vp-carousel-cover';
const CONTAIN_PROPERTY = '--vp-carousel-contain';
const INSET_PROPERTY = '--vp-carousel-timeline-inset';

// How far past its range a slide is worth stating. A slide a whole page away
// is held at the end of its animation either way.
const REACH = 4;

const noop = () => {};

/**
 * Whether the browser drives scroll driven animations itself.
 *
 * The same question the stylesheets ask with `@supports`.
 *
 * @param {Window} view - the window the carousel is in.
 * @return {boolean} True where the timelines are native.
 */
export function supportsTimelines(view = window) {
	return !!view.CSS?.supports?.('animation-timeline: view()');
}

/**
 * A scroll padding of the list, in pixels.
 *
 * The timelines are measured inside the scroll padding of the list: a view
 * timeline is inset by it unless told otherwise. A container that narrows
 * the carousel is scroll padding, so this is what keeps a slide resting in
 * a container halfway through its passage rather than a third of the way.
 *
 * @param {string} value - computed `scroll-padding-inline-*`.
 * @param {number} width - width of the scrollport, which a percentage is of.
 * @return {number} padding in pixels.
 */
function getScrollPadding(value, width) {
	if (value.endsWith('%')) {
		return ((parseFloat(value) || 0) * width) / 100;
	}

	return parseFloat(value) || 0;
}

/**
 * Write a number on a slide, when it changed.
 *
 * @param {HTMLElement} item  - slide.
 * @param {string}      name  - custom property.
 * @param {number}      value - progress.
 */
function publish(item, name, value) {
	const text = Math.max(-REACH, Math.min(1 + REACH, value)).toFixed(4);

	if (item.style.getPropertyValue(name) !== text) {
		item.style.setProperty(name, text);
	}
}

/**
 * Measure every slide of a list and write where it is.
 *
 * A slide is read where it is drawn, transforms included, so a slide a
 * repeating carousel has moved round to the far end is read at the far end -
 * the one case the native timelines cannot see, and the reason
 * `markMovedRound` marks those slides for the stylesheet. Except a slide the
 * effect has pinned: a view timeline reads a sticky box where the row laid it
 * out, not where it stuck, which is what fans a pile of cards out rather than
 * drawing every card stuck at the edge in the same pose. So the row is laid
 * out again here - each slide after the one before it and the gap, from the
 * padding of the list less what has been scrolled - and a pinned slide is
 * read from that.
 *
 * @param {HTMLElement} list - item template list.
 */
function draw(list) {
	const view = list.ownerDocument.defaultView || window;
	const styles = view.getComputedStyle(list);
	const rtl = 'rtl' === styles.direction;
	const frame = list.getBoundingClientRect().left + list.clientLeft;
	const width = list.clientWidth;

	if (!width) {
		return;
	}

	const gap = parseFloat(styles.columnGap) || 0;
	const padStart = getScrollPadding(styles.scrollPaddingInlineStart, width);
	const padEnd = getScrollPadding(styles.scrollPaddingInlineEnd, width);
	// The frame the timelines run over, and the padding it starts after.
	const port = width - padStart - padEnd;

	if (port <= 0) {
		return;
	}

	// Where the next slide was laid out, from the edge the slides come in at
	// - which on a right to left page is the right one, and is where the
	// padding of the list is measured from too.
	let laidOut =
		(parseFloat(styles.paddingInlineStart) || 0) -
		Math.abs(list.scrollLeft);

	// All the reads before any of the writes, so the layout is settled once.
	const places = Array.from(list.querySelectorAll(ITEM_SELECTOR), (item) => {
		const rect = item.getBoundingClientRect();
		const own = view.getComputedStyle(item);
		const size = rect.width;
		const drawn = rtl ? width - (rect.right - frame) : rect.left - frame;
		const pinned = 'sticky' === own.position;
		const inset = parseFloat(own.getPropertyValue(INSET_PROPERTY)) || 0;

		const start = (pinned ? laidOut : drawn) - padStart - inset;

		laidOut += size + gap;

		return [item, start, size, port - 2 * inset];
	});

	places.forEach(([item, start, size, room]) => {
		const cover = (room - start) / (room + size);
		const contained = room - size;

		publish(item, COVER_PROPERTY, cover);
		// A slide as wide as the frame is never contained, and a range that
		// starts and ends at the same scroll is no range: the effects that
		// show one slide over the frame read `cover` instead, and this only
		// has to be a number.
		publish(
			item,
			CONTAIN_PROPERTY,
			contained > 1 ? (contained - start) / contained : cover
		);
	});

	list.classList.add(SCRIPTED_CLASS);
}

/**
 * Keep the timelines of a carousel effect where the browser has none.
 *
 * A visitor who asked for less motion is left the plain carousel the
 * stylesheet leaves them without this: the effects are motion, and one held
 * still at its start is not the carousel they asked for.
 *
 * @param {HTMLElement} list - item template list.
 * @return {Function} teardown.
 */
export function driveTimelines(list) {
	const view = list.ownerDocument.defaultView || window;

	if (
		!list.classList.contains(EFFECT_CLASS) ||
		supportsTimelines(view) ||
		view.matchMedia('(prefers-reduced-motion: reduce)').matches
	) {
		return noop;
	}

	let queued = 0;

	// Once a frame however many things asked, the way a scroll is drawn.
	const schedule = () => {
		if (queued) {
			return;
		}

		queued = view.requestAnimationFrame(() => {
			queued = 0;
			draw(list);
		});
	};

	// The slides resize with the frame, and with the column count when a
	// breakpoint is crossed - which leaves the frame as it was.
	const resizes = new view.ResizeObserver(schedule);
	const watch = () => {
		resizes.disconnect();
		resizes.observe(list);
		list.querySelectorAll(ITEM_SELECTOR).forEach((item) => {
			resizes.observe(item);
		});
	};

	// Slides that come and go - a Load More, the editor redrawing the preview.
	const changes = new view.MutationObserver(() => {
		watch();
		schedule();
	});

	list.addEventListener('scroll', schedule, { passive: true });
	changes.observe(list, { childList: true });
	watch();
	draw(list);

	return () => {
		view.cancelAnimationFrame(queued);
		list.removeEventListener('scroll', schedule);
		changes.disconnect();
		resizes.disconnect();
		list.classList.remove(SCRIPTED_CLASS);
		list.querySelectorAll(ITEM_SELECTOR).forEach((item) => {
			item.style.removeProperty(COVER_PROPERTY);
			item.style.removeProperty(CONTAIN_PROPERTY);
		});
	};
}
