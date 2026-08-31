/**
 * The box a carousel is drawn in, published for the controls over it.
 *
 * The controls of a carousel are blocks beside the gallery rather than markup
 * inside it, so a control that is drawn over the slides has no ancestor to
 * position itself against: the frame the list scrolls in is a sibling of the
 * block, not a parent of it. What it can position itself against is the loop,
 * which every control and the gallery share - so the frame is measured and its
 * box written on the loop as four custom properties.
 *
 * Shared by the view module and the editor, so that a carousel with overlaid
 * arrows is drawn the same in both.
 */

const LOOP_SELECTOR = '.vp-block-loop';

const PROPERTIES = ['top', 'left', 'width', 'height'];

const noop = () => {};

/**
 * Publish the box of a carousel frame on the loop around it.
 *
 * @param {HTMLElement} frame Carousel frame.
 *
 * @return {Function} Teardown.
 */
export function publishFrameBox(frame) {
	const root = frame?.closest(LOOP_SELECTOR);

	if (!root) {
		return noop;
	}

	// Written only when a number changed. A custom property nothing reads still
	// counts as a style change, and an observer that answers its own writes is
	// the loop the browser complains about.
	const written = {};

	const write = () => {
		const box = frame.getBoundingClientRect();
		const rootBox = root.getBoundingClientRect();

		// An absolutely positioned child is placed from the padding box, and a
		// bounding rectangle is measured from the border box.
		const values = {
			top: box.top - rootBox.top - root.clientTop,
			left: box.left - rootBox.left - root.clientLeft,
			width: box.width,
			height: box.height,
		};

		PROPERTIES.forEach((name) => {
			const value = Math.round(values[name] * 100) / 100;

			if (value === written[name]) {
				return;
			}

			written[name] = value;
			root.style.setProperty(`--vp-carousel-frame-${name}`, `${value}px`);
		});
	};

	write();

	// The frame answers for its own size, and the loop for everything above it
	// that could push the frame down.
	const observer = new window.ResizeObserver(write);

	observer.observe(frame);
	observer.observe(root);

	return () => {
		observer.disconnect();

		PROPERTIES.forEach((name) => {
			root.style.removeProperty(`--vp-carousel-frame-${name}`);
		});
	};
}
