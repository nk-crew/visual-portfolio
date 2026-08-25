import $ from 'jquery';

/**
 * Internal dependencies
 */
import { getFlyOffset } from './_fly-side';

const $wnd = $(window);

// Init Events.
$(document).on('initEvents.vpf', (event, self) => {
	if (event.namespace !== 'vpf' || self.options.itemsStyle !== 'fly') {
		return;
	}

	const evp = `.vpf-uid-${self.uid}`;

	// determine cursor position
	let lastCursorPos = {};
	$wnd.on(`mousemove${evp}`, (e) => {
		lastCursorPos = {
			x: e.clientX,
			y: e.clientY,
		};
	});

	self.$item.on(
		`mouseenter${evp} mouseleave${evp}`,
		'.vp-portfolio__item',
		function (e) {
			const $this = $(this);
			const $overlay = $this.find('.vp-portfolio__item-overlay');
			const enter = e.type === 'mouseenter';
			const { x: endX, y: endY } = getFlyOffset(
				$this[0].getBoundingClientRect(),
				{ x: e.clientX, y: e.clientY },
				lastCursorPos
			);

			if (enter) {
				$overlay.css({
					transition: 'none',
					transform: `translateX(${endX}) translateY(${endY}) translateZ(0)`,
				});
				// Trigger a reflow, flushing the CSS changes. This need to fix some glitches in Safari and Firefox.
				// Info here - https://stackoverflow.com/questions/11131875/what-is-the-cleanest-way-to-disable-css-transition-effects-temporarily
				// eslint-disable-next-line no-unused-expressions
				$overlay[0].offsetHeight;
			}

			$overlay.css({
				transition: '.2s transform ease-in-out',
				transform: `translateX(${enter ? '0%' : endX}) translateY(${
					enter ? '0%' : endY
				}) translateZ(0)`,
			});
		}
	);
});

// Destroy Events.
$(document).on('destroyEvents.vpf', (event, self) => {
	if (event.namespace !== 'vpf' || self.options.itemsStyle !== 'fly') {
		return;
	}

	const evp = `.vpf-uid-${self.uid}`;

	$wnd.off(`mousemove${evp}`);
	self.$item.off(`mouseenter${evp} mouseleave${evp}`);
});
