/**
 * Keep the timelines of every carousel effect on the page, where the browser
 * has none.
 *
 * The view module announces a carousel it runs with `vp-carousel-start` on
 * the list, bubbling, and lets go of one with `vp-carousel-stop` - a Load
 * More stops and starts it again. This listens for both on the document, and
 * on load takes up any carousel with an effect that is already on the page:
 * the module hydrates after the scripts of the page have run, but nothing
 * here depends on which of the two came first.
 */

/**
 * Internal dependencies
 */
import { driveTimelines } from './_timelines';

const LIST_SELECTOR =
	'.wp-block-visual-portfolio-item-template.vp-layout-carousel.vp-carousel-effect';

// The teardown of every list being driven.
const driven = new WeakMap();

/**
 * Start driving a list, once.
 *
 * @param {HTMLElement} list - item template list.
 */
function start(list) {
	if (!list || driven.has(list)) {
		return;
	}

	driven.set(list, driveTimelines(list));
}

/**
 * Stop driving a list.
 *
 * @param {HTMLElement} list - item template list.
 */
function stop(list) {
	driven.get(list)?.();
	driven.delete(list);
}

document.addEventListener('vp-carousel-start', (event) => {
	start(event.target);
});

document.addEventListener('vp-carousel-stop', (event) => {
	stop(event.target);
});

const takeUp = () => {
	document.querySelectorAll(LIST_SELECTOR).forEach(start);
};

if ('loading' === document.readyState) {
	document.addEventListener('DOMContentLoaded', takeUp);
} else {
	takeUp();
}
