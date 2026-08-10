import $ from 'jquery';
import { throttle } from 'lodash';

import { getLoopGallery } from '../../utils/loop-gallery';

const $doc = $(document);

const INFINITE_SELECTOR = '.vp-block-pagination-infinite';

$doc.on(
	'click',
	'.vp-block-pagination-previous, .vp-block-pagination-next, .vp-block-pagination-numbers a, .vp-block-pagination-load-more, .vp-block-pagination-infinite',
	(e) => {
		const $current = $(e.currentTarget);
		const vpf = getLoopGallery(e.currentTarget);

		if (!vpf) {
			return;
		}

		e.preventDefault();

		const isPaged =
			$current.hasClass('vp-block-pagination-previous') ||
			$current.hasClass('vp-block-pagination-next') ||
			!!$current.parent('.vp-block-pagination-numbers').length;

		vpf.loadNewItems($current.attr('href'), isPaged);
	}
);

/**
 * Infinite scroll.
 *
 * The observer reports the initial intersection state right after `observe()`,
 * so re-registering the trigger once the new markup arrives is enough to keep
 * loading while it stays in view.
 */
const infiniteObserver = new window.IntersectionObserver(
	(entries, observer) => {
		entries.forEach((entry) => {
			const { target } = entry;

			if (!target) {
				return;
			}

			// The trigger is replaced with a fresh one after each load.
			if (!target.isConnected) {
				observer.unobserve(target);
				return;
			}

			const href = target.getAttribute('href');

			// Nothing left to load.
			if (!href) {
				observer.unobserve(target);
				return;
			}

			if (!entry.isIntersecting) {
				return;
			}

			getLoopGallery(target)?.loadNewItems(href, false);
		});
	},
	{ rootMargin: '300px 0px' }
);

const initInfinite = throttle(() => {
	document
		.querySelectorAll(`${INFINITE_SELECTOR}[href]:not(.is-handled)`)
		.forEach((element) => {
			element.classList.add('is-handled');
			infiniteObserver.observe(element);
		});
}, 200);

// This is a footer script, but `$( fn )` also fires immediately when the
// document is already ready.
$(initInfinite);

// Pagination blocks are replaced with new markup after AJAX loading.
$doc.on('replacedLoopBlocks.vpf', initInfinite);

// Galleries may be initialized later than this script runs.
$doc.on('init.vpf', initInfinite);
