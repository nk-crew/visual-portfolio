/**
 * A layout that toggles the page scrollbar.
 *
 * When the page height sits between its two scrollbar states, the layout at
 * the wider width is tall enough to need the scrollbar, and the one at the
 * narrower width is short enough to lose it, back and forth. No width settles,
 * so the guard stops at the wider layout: the page keeps its scrollbar, and the
 * items only shrink a little.
 *
 * The file is a partial - the name keeps it out of the entry glob - so the
 * Isotope and justified layouts of the classic gallery stop the same way.
 */

// Longer than one turn of the loop, the layout transition included.
const LOOP_TIME = 1000;

/**
 * Start a guard for one gallery.
 *
 * @return {Function} takes the width a layout is about to run at, and returns
 *                    whether that layout would only turn the loop again.
 */
export function createResizeLoopGuard() {
	let before = null;
	let last = null;

	return (width) => {
		const now = window.performance.now();
		const scrollbar =
			window.innerWidth - window.document.documentElement.clientWidth;

		if (
			before &&
			width === before.width &&
			width < last.width &&
			last.width - width <= scrollbar &&
			now - last.time < LOOP_TIME
		) {
			return true;
		}

		if (!last || last.width !== width) {
			before = last;
			last = { width, time: now };
		}

		return false;
	};
}
