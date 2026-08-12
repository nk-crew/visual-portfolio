import { getContext, getElement, store } from '@wordpress/interactivity';

/**
 * The `fly` effect of the Gallery Item Cover.
 *
 * The only JavaScript of the block, and only covers that ask for `fly` load it -
 * `fade`, `emerge` and `none` are stylesheet alone. All it does is name the edge
 * the pointer crossed, in a `data-vp-fly` attribute the stylesheet translates
 * the overlay and the content from.
 *
 * The attribute is also what arms the effect: until this module has run there is
 * none, and a cover with its content simply shown is what a visitor without
 * JavaScript gets.
 */

// Where the content flies in from before the pointer has said anything - after a
// keyboard focus, or on the frame the pointer enters a cover for the first time.
const DEFAULT_SIDE = 'bottom';

/**
 * The edge of an element a pointer event is closest to.
 *
 * Distances are measured on the box scaled to a square, so the diagonals of a
 * wide cover still split it corner to corner and a pointer entering the long top
 * edge is not read as coming from the side.
 *
 * @param {HTMLElement} element Cover.
 * @param {MouseEvent}  event   Pointer event.
 *
 * @return {string} One of `top`, `right`, `bottom`, `left`.
 */
function getSide(element, event) {
	const rect = element.getBoundingClientRect();
	const width = rect.width || 1;
	const height = rect.height || 1;
	const x = (event.clientX - rect.left) / width - 0.5;
	const y = (event.clientY - rect.top) / height - 0.5;

	if (Math.abs(x) > Math.abs(y)) {
		return x > 0 ? 'right' : 'left';
	}

	return y > 0 ? 'bottom' : 'top';
}

store('visual-portfolio/item-cover', {
	actions: {
		/**
		 * Take the side of the pointer, entering and leaving.
		 *
		 * The same answer serves both: on the way in the content flies in from
		 * the edge that was crossed, on the way out it leaves through it.
		 *
		 * @param {MouseEvent} event Pointer event.
		 */
		setFlySide(event) {
			const { ref } = getElement();

			getContext().flyFrom = getSide(ref, event);
		},
	},
	callbacks: {
		/**
		 * Arm the effect.
		 *
		 * Runs again whenever the router swaps the loop region in, so a cover
		 * that arrived with a new page is armed like any other.
		 */
		armFly() {
			const context = getContext();

			if (!context.flyFrom) {
				context.flyFrom = DEFAULT_SIDE;
			}
		},
	},
});
