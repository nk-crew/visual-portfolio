import { getElement, store } from '@wordpress/interactivity';

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
 * The panel is one box - the hover overlay with the blocks on it - and it moves
 * the way the legacy items style moves its own: nothing fades, the side is the
 * edge the pointer crossed, and the panel is put on that side without a
 * transition before being brought in, or a pointer entering from the right
 * would still be answered by a panel travelling from wherever it left last
 * time.
 *
 * The stylesheet parks the panel at the foot of the card, so a cover whose
 * script never arrives still hides and reveals what it holds - it simply always
 * does so from below.
 */

// The side the panel rests on, written as the variable the stylesheet already
// parks the panel with. The module never writes `transform` itself: an inline
// property outweighs every rule there is, and one pass of the pointer would
// leave the panel deaf to `:focus-within` and to `prefers-reduced-motion` for
// the rest of the page's life.
const SIDE = '--vp-panel-hidden-transform';

// Worn for the one frame in which the panel is put on the side the pointer
// crossed. The stylesheet reads it as hidden, and not travelling.
const SEATING = 'vp-is-seating';

// A cover set to the default state holds its panel up and stands aside for the
// pointer, so entering and leaving mean the opposite of what they do otherwise.
const INVERTED = 'vp-show-content-default';

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
 * @param {HTMLElement} cover    Cover.
 * @param {Object}      offset   Translation of the resting panel.
 * @param {boolean}     arriving Whether the panel is coming in.
 */
function movePanel(cover, offset, arriving) {
	// Seated on the side the pointer crossed, and seated silently: the panel
	// has to start there rather than travel there.
	if (arriving) {
		cover.classList.add(SEATING);
	}

	cover.style.setProperty(
		SIDE,
		`translateX(${offset.x}) translateY(${offset.y})`
	);

	if (arriving) {
		// Flush the seating before the state rules take the panel in, or
		// Safari and Firefox animate the seating as well.
		void cover.offsetHeight;

		cover.classList.remove(SEATING);
	}
}

store('visual-portfolio/item-cover', {
	actions: {
		/**
		 * Move the panel, entering and leaving.
		 *
		 * The same answer serves both: the panel comes from the edge that was
		 * crossed and leaves through it.
		 *
		 * @param {MouseEvent} event Pointer event.
		 */
		flyPanel(event) {
			// The states themselves live in `@media (hover: hover)`, and the
			// side is read the same way: on a touch screen the compatibility
			// mouse events of a tap would park the panel off a card that no
			// rule there ever brings it back onto.
			if (!window.matchMedia('(hover: hover)').matches) {
				return;
			}

			const { ref } = getElement();
			const entering = 'mouseenter' === event.type;

			movePanel(
				ref,
				getFlyOffset(
					ref.getBoundingClientRect(),
					{ x: event.clientX, y: event.clientY },
					lastCursor
				),
				entering !== ref.classList.contains(INVERTED)
			);
		},
	},
});
