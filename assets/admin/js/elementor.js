import $ from 'jquery';
import { debounce } from 'throttle-debounce';

import {
	connectPreviewFrame,
	resolveTargetOrigin,
} from '../../js/_preview-frame';

// Smallest gap between preview resizes, in ms. Matches the block editor, and is longer than the
// CSS transition so each step finishes easing before the next begins.
const PREVIEW_RESIZE_INTERVAL = 400;

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

	// Debounced, not throttled: this hands the frame a new width, which makes the gallery inside
	// recompute its columns. Doing that on every step of a drag is expensive and visibly jumpy,
	// because the column count changes as the width crosses each breakpoint. Waiting for the
	// resizing to stop gives one relayout at the size the user actually chose.
	const maybeResizePreviewsDebounced = debounce(300, maybeResizePreviews);

	// Follow the preview's own box, not just a window resize event.
	//
	// Switching the device preview resizes the preview frame from the editor chrome. A window
	// listener only hears about that if the preview window is told, while a ResizeObserver
	// reports the box itself whatever caused it to change. The window listener stays as well,
	// for anything that resizes the preview window without changing this element.
	//
	// No `rafSchd`: it holds its pending frame id until that frame runs, and a hidden editor tab
	// gets no frames - so one call made while the tab is in the background would swallow every
	// later resize.
	//
	// Width only. This function exists to hand the frames a viewport width, and reacting to
	// height as well would close a loop: applying a frame's height grows the document being
	// watched here, and the answer to that would be to re-send a width the frame relayouts
	// against, which changes its height again.
	let lastObservedWidth = null;

	function handleDocumentResize(entries) {
		const width = entries[0]?.contentRect?.width;

		if (width === lastObservedWidth) {
			return;
		}

		lastObservedWidth = width;

		maybeResizePreviewsDebounced();
	}

	if (typeof elementorWindow.ResizeObserver !== 'undefined') {
		new elementorWindow.ResizeObserver(handleDocumentResize).observe(
			elementorWindow.document.documentElement
		);
	}

	// Kept as a fallback for anything that resizes the preview window itself.
	$wnd.on('resize', maybeResizePreviewsDebounced);

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
						applyInterval: PREVIEW_RESIZE_INTERVAL,
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
