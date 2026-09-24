/**
 * The lightbox of the Gallery Loop family.
 *
 * It is the classic gallery's lightbox: `VPPopupAPI` with the vendor chosen in
 * Settings, reading the `<template>` every item carries. What a loop lacks is
 * the gallery instance the classic gallery opens it with, so each loop gets a
 * stand-in that answers what the vendors and Pro ask of one: `$item`, `uid`,
 * `options`, `isPreview()` and `emitEvent()`. Events go out the way the classic
 * gallery sends them, as `<event>.vpf` on the loop with the stand-in first.
 *
 * Nothing here is required for a gallery to work: a trigger is an anchor to
 * the full size image. The gallery is read off the DOM at the moment of the
 * click, so it survives a region swap and a Load More without being told.
 */

const $ = window.jQuery;

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

		gallery = {
			$item: $(loop),
			uid: `loop-${lastUid}`,
			options: { itemsClickAction: 'popup_gallery' },
			isPreview: () => false,
			emitEvent(event, data) {
				const args = data ? [gallery].concat(data) : [gallery];

				gallery.$item.trigger(`${event}.vpf`, args);
				gallery.$item.trigger(`${event}.vpf-uid-${gallery.uid}`, args);
			},
		};

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
		!VPPopupAPI?.vendor
	) {
		return;
	}

	const trigger = event.target.closest?.(TRIGGER_SELECTOR);
	const item = trigger?.closest(ITEM_SELECTOR);
	const list = item?.closest(LIST_SELECTOR);
	const loop = list?.closest(LOOP_SELECTOR);

	if (!loop) {
		return;
	}

	// One entry per item, however many of its blocks open it.
	const items = VPPopupAPI.parseGallery($(list));
	const index = items.findIndex((data) => data.el === item);

	if (index < 0) {
		return;
	}

	event.preventDefault();

	// Where the focus goes back to when the lightbox closes on a slide.
	items.forEach((data) => {
		data.linkEl = data.el.querySelector(TRIGGER_SELECTOR);
	});
	items[index].linkEl = trigger;

	VPPopupAPI.open(items, index, getGallery(loop));
});
