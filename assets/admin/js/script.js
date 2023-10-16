import $ from 'jquery';
import rafSchd from 'raf-schd';

import { debounce } from '@wordpress/compose';

const { ajaxurl, VPAdminVariables } = window;
const $body = $('body');

// select shortcode text in input
$body.on(
	'focus',
	'[name="vp_list_shortcode"], [name="vp_filter_shortcode"], [name="vp_sort_shortcode"]',
	function () {
		this.select();
	}
);
$body.on('click', '.vp-onclick-selection', function () {
	// eslint-disable-next-line @wordpress/no-global-get-selection
	window.getSelection().selectAllChildren(this);
});
// fix the problem with Gutenberg shortcode transform (allowed only plain text pasted).
$body.on('copy cut', '.vp-onclick-selection', (e) => {
	// eslint-disable-next-line @wordpress/no-global-get-selection
	const copyText = window
		.getSelection()
		.toString()
		.replace(/[\n\r]+/g, '');

	e.originalEvent.clipboardData.setData('text/plain', copyText);
	e.originalEvent.preventDefault();
});

// Post format metabox show/hide
const $videoMetabox = $('#vp_format_video');
const $videoFormatCheckbox = $('#post-format-video');
let isVideoFormat = null;

function toggleVideoMetabox(show) {
	if (isVideoFormat === null || isVideoFormat !== show) {
		isVideoFormat = show;
		$videoMetabox[show ? 'show' : 'hide']();
	}
}

if ($videoMetabox.length) {
	if ($videoFormatCheckbox.length) {
		toggleVideoMetabox($videoFormatCheckbox.is(':checked'));

		$body.on('change', '[name=post_format]', () => {
			toggleVideoMetabox($videoFormatCheckbox.is(':checked'));
		});
	}
}

let oembedAjax = null;
let runAjaxVideoOembed = function ($this) {
	oembedAjax = $.ajax({
		url: ajaxurl,
		method: 'POST',
		dataType: 'json',
		data: {
			action: 'vp_find_oembed',
			q: $this.val(),
			nonce: VPAdminVariables.nonce,
		},
		complete(data) {
			const json = data.responseJSON;
			if (json && typeof json.html !== 'undefined') {
				$this.next('.vp-oembed-preview').html(json.html);
			}
		},
	});
};
runAjaxVideoOembed = debounce(300, rafSchd(runAjaxVideoOembed));

$body.on('change input', '.vp-input[name="_vp_format_video_url"]', function () {
	if (oembedAjax !== null) {
		oembedAjax.abort();
	}

	const $this = $(this);
	$this.next('.vp-oembed-preview').html('');

	runAjaxVideoOembed($this);
});

/**
 * When attempting to disable registration of portfolio post type,
 * We inform the user of the possible consequences and provide them with the opportunity to cancel this operation.
 */
$body.on(
	'change',
	"input[name='vp_general[register_portfolio_post_type]']",
	function () {
		// Does some stuff and logs the event to the console
		if (!$(this).is(':checked')) {
			// eslint-disable-next-line no-restricted-globals, no-alert, no-undef
			const confirmation = confirm(
				"Are you sure you want to turn off the Portfolio custom post type and related taxonomies? Make sure you don't use this post type on your site, otherwise you might see errors on the frontend."
			);
			if (!confirmation) {
				$(this).prop('checked', true);
			}
		}
	}
);
