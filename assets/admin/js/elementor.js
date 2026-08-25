import $ from 'jquery';
import rafSchd from 'raf-schd';
import { throttle } from 'throttle-debounce';

import {
	connectPreviewFrame,
	resolveTargetOrigin,
} from '../../js/_preview-frame';

// Frame element -> connection handle, so a resize can reach a frame set up elsewhere.
//
// A plain Map rather than a WeakMap because it has to be iterable: Elementor renders a widget
// again with a brand new `<iframe>` element, so the previous handle is never looked up by key
// and would otherwise keep its `message` listener and its detached frame alive for the rest of
// the editing session. `pruneConnections` drops the ones whose frame has left the document.
const connections = new Map();

function pruneConnections() {
	connections.forEach((connection, frame) => {
		if (!frame.isConnected) {
			connection.destroy();
			connections.delete(frame);
		}
	});
}

const { elementorFrontend, VPAdminElementorVariables: variables } = window;
const $wnd = $(window);

$wnd.on('elementor/frontend/init', ($data) => {
	if (!variables) {
		return;
	}

	const { target: elementorWindow } = $data;

	// add fake iframe width, so @media styles will work fine.
	function maybeResizePreviews() {
		const elementorWidth = elementorWindow
			.jQuery(elementorWindow.document)
			.width();

		elementorWindow.jQuery
			.find('.visual-portfolio-elementor-preview iframe')
			.forEach((item) => {
				const $this = $(item);
				const parentWidth = $this.parent().width();

				$this.css({
					width: elementorWidth,
				});

				const connection = connections.get(item);

				if (connection) {
					connection.sendMessage({
						name: 'resize',
						width: parentWidth,
					});
					connection.resize();
				}
			});
	}

	// window resize.
	$wnd.on('resize', throttle(300, rafSchd(maybeResizePreviews)));

	// added/changed widget.
	elementorFrontend.hooks.addAction(
		'frontend/element_ready/visual-portfolio.default',
		($scope) => {
			const $block = $($scope).find(
				'.visual-portfolio-elementor-preview'
			);
			const $frame = $block.find('iframe');
			const id = $block.attr('data-id');
			const iframeURL = `${
				variables.preview_url +
				(variables.preview_url.split('?')[1] ? '&' : '?')
			}vp_preview_frame=true&vp_preview_type=elementor&vp_preview_frame_id=${id}&vp_preview_nonce=${
				variables.nonce
			}`;

			$frame.attr('src', iframeURL);

			// resize iframe
			const frame = $frame.get(0);

			if (frame) {
				pruneConnections();

				const previous = connections.get(frame);

				if (previous) {
					previous.destroy();
				}

				connections.set(
					frame,
					connectPreviewFrame(frame, {
						targetOrigin: resolveTargetOrigin(
							variables.preview_url
						),
						onInit() {
							maybeResizePreviews();
						},
						onMessage({ message }) {
							// select current block on click message.
							if (message === 'clicked') {
								// Select current widget to display settings.
								$frame
									.closest('.elementor-element')
									.find('.elementor-editor-element-edit')
									.trigger('click');

								window.focus();
							}
						},
					})
				);
			}
		}
	);
});
