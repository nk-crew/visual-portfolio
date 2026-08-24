import { getContext, getElement, store } from '@wordpress/interactivity';

/**
 * Internal dependencies
 */
import { getFlyOffset } from '../../../assets/js/_fly-side';

/**
 * The `fly` effect of the Gallery Item Cover.
 *
 * The only JavaScript of the block, and only covers that ask for `fly` load it -
 * `fade`, `emerge` and `none` are stylesheet alone.
 *
 * The panel is the overlay and the content together, and it moves the way the
 * legacy items style moves its own: nothing fades, the side is the edge the
 * pointer crossed, and the panel is put on that side without a transition
 * before being brought in - or a pointer entering from the right would still be
 * answered by a panel travelling from wherever it left last time.
 *
 * Arming is what the stylesheet waits for: until `data-vp-fly` is on the cover
 * the panel is where it started and the content is shown, which is what a
 * visitor whose JavaScript never arrived gets.
 */

// The panel is these two boxes: the overlay painted over the picture, and the
// blocks on top of it.
const PANEL_PARTS = [
	'.wp-block-visual-portfolio-item-cover__overlay--hover',
	'.wp-block-visual-portfolio-item-cover__inner',
];

const TRANSITION = '0.2s transform ease-in-out';

// Where the pointer was before the move that entered or left a cover. One
// listener answers for every cover on the page, and `mouseenter` is dispatched
// before the `mousemove` of the same movement - so at the moment a cover asks,
// this is still the point the pointer came from.
const lastCursor = { x: 0, y: 0 };

window.addEventListener(
	'mousemove',
	(event) => {
		lastCursor.x = event.clientX;
		lastCursor.y = event.clientY;
	},
	{ passive: true }
);

/**
 * Move the panel of a cover.
 *
 * @param {HTMLElement} cover  Cover.
 * @param {Object}      offset Translation of the resting panel.
 * @param {boolean}     enter  Whether the pointer is entering.
 */
function movePanel(cover, offset, enter) {
	const parts = PANEL_PARTS.map((selector) =>
		cover.querySelector(selector)
	).filter(Boolean);

	const resting = `translateX(${offset.x}) translateY(${offset.y}) translateZ(0)`;

	if (enter) {
		// Seated on the side the pointer crossed, and seated silently: the
		// panel has to start there rather than travel there.
		parts.forEach((part) => {
			part.style.transition = 'none';
			part.style.transform = resting;
		});

		// Flush the change before the transition goes back on, or Safari and
		// Firefox animate the seating as well.
		void cover.offsetHeight;
	}

	parts.forEach((part) => {
		part.style.transition = TRANSITION;
		part.style.transform = enter
			? 'translateX(0%) translateY(0%) translateZ(0)'
			: resting;
	});
}

store('visual-portfolio/item-cover', {
	actions: {
		/**
		 * Move the panel, entering and leaving.
		 *
		 * The same answer serves both: on the way in the panel comes from the
		 * edge that was crossed, on the way out it leaves through it.
		 *
		 * @param {MouseEvent} event Pointer event.
		 */
		flyPanel(event) {
			const { ref } = getElement();

			movePanel(
				ref,
				getFlyOffset(
					ref.getBoundingClientRect(),
					{ x: event.clientX, y: event.clientY },
					lastCursor
				),
				'mouseenter' === event.type
			);
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
			getContext().flyArmed = true;
		},
	},
});
