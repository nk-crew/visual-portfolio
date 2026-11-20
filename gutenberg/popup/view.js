import { LOOP_POPUP_OPEN } from './open';
import { openReuse } from './reuse';

const { VPData } = window;
const useReuse = !VPData.pro || VPData.loopLightbox === 'reuse';

const TRIGGER_SELECTOR = '[data-vp-popup]';
const ITEM_SELECTOR = '.wp-block-visual-portfolio-item-template__item';
const LIST_SELECTOR = '.wp-block-visual-portfolio-item-template';
const LOOP_SELECTOR = '.vp-block-loop';

const galleries = new WeakMap();
let lastUid = 0;

/**
 * The stand-in for the gallery instance of a loop, one per loop element.
 *
 * @param {Element} loop - loop element.
 *
 * @return {Object} gallery.
 */
function getGallery(loop) {
	let gallery = galleries.get(loop);

	if (!gallery) {
		lastUid += 1;

		// The loop's own id where it has one, so what names a gallery in an
		// address - Pro's deep links - finds the same loop on the next visit.
		const region = loop.getAttribute('data-wp-router-region') || '';

		gallery = {
			$item: window.jQuery?.(loop) || [loop],
			uid: region.replace(/^vp-loop-/, '') || `loop-${lastUid}`,
			options: { itemsClickAction: 'popup_gallery' },
			isPreview: () => false,
			emitEvent(event, data) {
				const args = data ? [gallery].concat(data) : [gallery];

				const $item = window.jQuery?.(loop);
				$item?.trigger(`${event}.vpf`, args);
				$item?.trigger(`${event}.vpf-uid-${gallery.uid}`, args);
			},
		};

		if (useReuse) {
			gallery[LOOP_POPUP_OPEN] = openReuse;
		}

		galleries.set(loop, gallery);
	}

	return gallery;
}

// For what opens the lightbox of a loop on its own, such as Pro's Quick View:
// the same stand-in, so the events name the same gallery.
window.VPPopupAPI.getLoopGallery = getGallery;

document.addEventListener('click', (event) => {
	const { VPPopupAPI } = window;

	if (
		event.defaultPrevented ||
		event.button !== 0 ||
		event.metaKey ||
		event.ctrlKey ||
		event.shiftKey ||
		event.altKey ||
		(!useReuse && !VPPopupAPI.vendor)
	) {
		return;
	}

	const trigger = event.target.closest?.(TRIGGER_SELECTOR);
	const item = trigger?.closest(ITEM_SELECTOR);
	const list = item?.closest(LIST_SELECTOR);
	const loop = list?.closest(LOOP_SELECTOR);

	if (!loop || trigger.closest(LOOP_SELECTOR) !== loop) {
		return;
	}

	// One entry per item, however many of its blocks open it.
	const items = VPPopupAPI.parseGallery(window.jQuery?.(list) || list);
	const index = items.findIndex((data) => data.el === item);

	if (index < 0) {
		return;
	}

	// Where the focus goes back to when the lightbox closes on a slide.
	items.forEach((data) => {
		data.linkEl = Array.from(
			data.el.querySelectorAll(TRIGGER_SELECTOR)
		).find((link) => link.closest(ITEM_SELECTOR) === data.el);
	});
	items[index].linkEl = trigger;

	const gallery = getGallery(loop);
	if (!useReuse) {
		event.preventDefault();
		VPPopupAPI.open(items, index, gallery);
	} else if (VPPopupAPI.open(items, index, gallery) !== false) {
		event.preventDefault();
	}
});
