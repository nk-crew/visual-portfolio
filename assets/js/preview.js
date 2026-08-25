import $ from 'jquery';

import { initPreviewFrameChild } from './_preview-frame';

const $body = $('body');
const $doc = $(document);

// Dynamic CSS cache.
const dynamicCSScache = {};

/**
 * The element whose height the embedding page follows.
 *
 * Looked up on every call rather than cached: loading a page of results over AJAX replaces this
 * element, and a cached reference would keep reporting the height of a node that is no longer in
 * the document. `getElementById` is the cheapest lookup there is, and a burst of changes is
 * coalesced into a single measurement anyway.
 *
 * @return {HTMLElement|null} the measured element, if it exists yet.
 */
function getPreviewElement() {
	return document.getElementById('vp_preview');
}

// Height sync and messaging with the page that embeds this preview.
const previewFrame = initPreviewFrameChild({
	hostOrigins: window.VPPreviewFrameVariables?.hostOrigins || [],
	getTarget: getPreviewElement,
	getHeight() {
		const el = getPreviewElement();

		if (!el) {
			return document.documentElement.scrollHeight || 0;
		}

		// Outer height including margins, which is what the embedding page has to reserve.
		// `offsetHeight` rather than `getBoundingClientRect()`, so a transform mid-animation
		// does not report a height the layout does not actually occupy.
		const style = window.getComputedStyle(el);

		return (
			el.offsetHeight +
			(parseFloat(style.marginTop) || 0) +
			(parseFloat(style.marginBottom) || 0)
		);
	},
	onMessage(data) {
		if (!data || !data.name) {
			return;
		}

		switch (data.name) {
			case 'resize':
				// This random number needed for proper resize Isotope and other plugins.
				$body.css('max-width', data.width + Math.random());
				break;
			case 'dynamic-css': {
				// `blockId` arrives over postMessage and nothing on this path sanitises it -
				// the server-side `[a-zA-Z0-9_-]` check only guards the PHP render. Keep it
				// out of both HTML strings and selectors: build the element and set `id` as a
				// property, and look it up with `getElementById`, which takes a raw string
				// rather than parsing a selector.
				const styleId = `vp-dynamic-styles-${String(
					data.blockId ?? ''
				)}-inline-css`;

				// Skip if styles haven't changed.
				if (
					dynamicCSScache[styleId] &&
					data.styles === dynamicCSScache[styleId]
				) {
					break;
				}

				let styleEl = document.getElementById(styleId);

				if (!styleEl) {
					styleEl = document.createElement('style');
					styleEl.id = styleId;
					document.head.appendChild(styleEl);
				}

				dynamicCSScache[styleId] = data.styles;

				styleEl.textContent = data.styles;
				break;
			}
			// no default
		}
	},
});

// prevent click on links.
document.addEventListener(
	'click',
	(e) => {
		e.stopPropagation();
		e.preventDefault();

		previewFrame.sendMessage('clicked');
	},
	true
);

// prevent click on <select> and similar elements.
document.addEventListener(
	'mousedown',
	(e) => {
		e.stopPropagation();
		e.preventDefault();

		e.target.blur();
		window.focus();
	},
	true
);

// add dynamic data to AJAX calls.
$doc.on('startLoadingNewItems.vpf', (event, vpObject, url, ajaxData) => {
	if (event.namespace !== 'vpf') {
		return;
	}

	ajaxData.data = Object.assign(
		ajaxData.data || {},
		window.vp_preview_post_data
	);
});
