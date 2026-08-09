import $ from 'jquery';

const $body = $('body');
const $doc = $(document);
const $preview = $('#vp_preview');

// prevent click on links.
document.addEventListener(
	'click',
	(e) => {
		e.stopPropagation();
		e.preventDefault();

		if (window.parentIFrame) {
			window.parentIFrame.sendMessage('clicked');
		}
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

// Dynamic CSS cache.
const dynamicCSScache = {};

// configure iFrame resizer script.
window.iFrameResizer = {
	log: false,
	heightCalculationMethod() {
		return $preview.outerHeight(true);
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
				// Insert dynamic styles.
				const styleId = `vp-dynamic-styles-${data.blockId}-inline-css`;

				// Skip if styles haven't changed.
				if (
					dynamicCSScache[styleId] &&
					data.styles === dynamicCSScache[styleId]
				) {
					break;
				}

				let $style = $(`#${styleId}`);

				if (!$style.length) {
					$style = $(`<style id="${styleId}"></style>`).appendTo(
						'head'
					);
				}

				dynamicCSScache[styleId] = data.styles;

				$style.text(data.styles);
				break;
			}
			// no default
		}
	},
};
