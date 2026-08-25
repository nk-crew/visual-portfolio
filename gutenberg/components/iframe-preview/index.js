import './style.scss';
import './live-reload-conditions';

import { Spinner } from '@wordpress/components';
import { dispatch, select, subscribe, withSelect } from '@wordpress/data';
import { Component, createRef, Fragment } from '@wordpress/element';
import { applyFilters } from '@wordpress/hooks';
import classnames from 'classnames/dedupe';
import $ from 'jquery';
import { isEqual, uniq } from 'lodash';
import { debounce } from 'throttle-debounce';

import {
	connectPreviewFrame,
	resolveTargetOrigin,
} from '../../../assets/js/_preview-frame';
import getDynamicCSS, { hasDynamicCSS } from '../../utils/controls-dynamic-css';

const {
	VPAdminGutenbergVariables: variables,
	VPGutenbergVariables: { controls: registeredControls },
} = window;

let uniqueIdCount = 1;

// Smallest gap between preview resizes, in ms. Content settles over roughly a second and reports
// a new height many times a second while it does; applying each one makes the preview jitter.
// This is deliberately longer than the CSS transition in `style.scss`, so every step finishes
// easing before the next one starts and the movement reads as continuous rather than stepped.
const PREVIEW_RESIZE_INTERVAL = 400;

function getUpdatedKeys(oldData, newData) {
	const keys = uniq([...Object.keys(oldData), ...Object.keys(newData)]);
	const changedKeys = [];

	keys.forEach((k) => {
		if (!isEqual(oldData[k], newData[k])) {
			changedKeys.push(k);
		}
	});

	return changedKeys;
}

/**
 * Component Class
 */
class IframePreview extends Component {
	constructor(...args) {
		super(...args);

		this.state = {
			loading: true,
			uniqueId: `vpf-preview-${uniqueIdCount}`,
			currentIframeHeight: 0,
			latestIframeHeight: 0,
			blockPosition: null,
		};

		uniqueIdCount += 1;

		this.frameRef = createRef();
		this.formRef = createRef();

		this.maybePreviewTypeChanged = this.maybePreviewTypeChanged.bind(this);
		this.maybeAttributesChanged = this.maybeAttributesChanged.bind(this);
		this.onFrameLoad = this.onFrameLoad.bind(this);
		this.maybeReload = this.maybeReload.bind(this);
		// No `rafSchd` here. Reloading only sets state and submits a form, so it
		// has nothing to coalesce into a frame that `debounce` does not already
		// coalesce - and `raf-schd` keeps its pending frame id until the frame
		// runs, so one frame that never comes (a hidden editor canvas, a
		// backgrounded tab that gets discarded) silently stops every later
		// reload for the rest of the session.
		this.maybeReloadDebounce = debounce(300, this.maybeReload.bind(this));
		this.maybeResizePreviews = this.maybeResizePreviews.bind(this);
		// Debounced, not throttled: this hands the frame a new width, which makes the gallery
		// inside recompute its columns. Doing that on every step of a drag is both expensive and
		// visibly jumpy, because the column count changes as the width crosses each breakpoint.
		// Waiting for the drag to stop gives one relayout at the size the user actually chose.
		//
		// No `rafSchd`: it holds its pending frame id until that frame runs, and a hidden editor
		// tab gets no frames, so one call made while the tab is in the background would swallow
		// every later resize.
		this.maybeResizePreviewsDebounce = debounce(
			300,
			this.maybeResizePreviews
		);
		this.updateIframeHeight = this.updateIframeHeight.bind(this);
		this.printInput = this.printInput.bind(this);

		this.trackBlockPosition = this.trackBlockPosition.bind(this);
	}

	componentDidMount() {
		const self = this;

		const { clientId } = self.props;

		// Set initial block position
		this.setState({
			blockPosition: this.getBlockPosition(clientId),
		});

		// Subscribe to block position changes
		this.unsubscribe = subscribe(() => {
			this.trackBlockPosition(clientId);
		});

		self.previewFrame = connectPreviewFrame(self.frameRef.current, {
			targetOrigin: resolveTargetOrigin(variables.preview_url),
			applyInterval: PREVIEW_RESIZE_INTERVAL,
			// The wrapper carries the height and the frame fills it, so exactly one box
			// changes size. Sizing both left two edges easing independently, which reads as
			// the preview resizing twice.
			sizeHeight: false,
			onMessage({ message }) {
				// select current block on click message.
				if (message === 'clicked') {
					dispatch('core/block-editor').selectBlock(clientId);

					window.focus();
				}
			},
			onResized({ height }) {
				self.updateIframeHeight(`${height}px`);
			},
		});

		self.frameRef.current.addEventListener('load', self.onFrameLoad);

		// The block renders inside the editor canvas, and WordPress iframes that
		// canvas - always, as of 7.1. Only the canvas window is told when it
		// resizes, which is what the preview follows: opening the sidebar or
		// switching the device preview never reaches the outer window.
		self.previewWindow = self.getPreviewDocument().defaultView || window;
		self.previewWindow.addEventListener(
			'resize',
			self.maybeResizePreviewsDebounce
		);

		self.maybeReload();
	}

	componentDidUpdate(prevProps) {
		this.maybePreviewTypeChanged(prevProps);
		this.maybeAttributesChanged(prevProps);
	}

	componentWillUnmount() {
		// Unsubscribe from block position tracking
		if (this.unsubscribe) {
			this.unsubscribe();
		}

		if (this.frameTimeout) {
			clearTimeout(this.frameTimeout);
			this.frameTimeout = null;
		}

		this.frameRef.current.removeEventListener('load', this.onFrameLoad);
		(this.previewWindow || window).removeEventListener(
			'resize',
			this.maybeResizePreviewsDebounce
		);

		if (this.previewFrame) {
			this.previewFrame.destroy();
			this.previewFrame = null;
		}
	}

	/**
	 * On frame load event.
	 *
	 * @param {Object} e - event data.
	 */
	onFrameLoad(e) {
		this.frameWindow = e.target.contentWindow;

		// WordPress 7.1 serves the editor with `Document-Isolation-Policy`, which places it
		// in its own agent cluster. A frame that does not answer with the same policy then
		// counts as cross-origin and reading anything off its window throws, even though
		// both documents are on the same host. Reading `contentWindow` itself still works,
		// so the throw lands here rather than on the line above.
		//
		// The same read says whether this is the blank document an `<iframe>` starts on.
		// Some browsers fire `load` for that one, and taking it for the preview would drop
		// the spinner before the form has posted anything into the frame. A frame that
		// throws is never the blank one: blank inherits this document's origin and policy,
		// so it always reads.
		let blank = false;

		try {
			this.frameJQuery = e.target.contentWindow.jQuery;
			blank = e.target.contentWindow.location.href === 'about:blank';
		} catch {
			this.frameJQuery = null;
		}

		if (blank) {
			return;
		}

		if (this.frameJQuery) {
			this.$framePortfolio = this.frameJQuery('.vp-portfolio');

			this.maybeResizePreviews();
		}

		if (this.frameTimeout) {
			clearTimeout(this.frameTimeout);
		}

		// We need this timeout, since we resize iframe size and layouts resized with transitions.
		//
		// Outside the check above on purpose. Height and messages travel over `postMessage`,
		// which works whether or not this document may read the frame's window, so a preview
		// that is running fine must not be left behind a spinner because that read failed.
		this.frameTimeout = setTimeout(() => {
			this.setState({
				loading: false,
			});
		}, 300);
	}

	maybePreviewTypeChanged(prevProps) {
		if (prevProps.previewDeviceType === this.props.previewDeviceType) {
			return;
		}

		this.maybeResizePreviews();
	}

	maybeAttributesChanged(prevProps) {
		if (this.busyReload) {
			return;
		}
		this.busyReload = true;

		const newAttributes = this.props.attributes;
		const oldAttributes = prevProps.attributes;

		const changedAttributes = {};
		const changedAttributeKeys = getUpdatedKeys(
			oldAttributes,
			newAttributes
		);

		// check changed attributes
		changedAttributeKeys.forEach((name) => {
			if (typeof newAttributes[name] !== 'undefined') {
				changedAttributes[name] = newAttributes[name];
			}
		});

		if (Object.keys(changedAttributes).length) {
			let reload = false;

			Object.keys(changedAttributes).forEach((name) => {
				// Attributes not registered as controls (e.g. the saved
				// layout "id") have no dynamic CSS and no reload flag, so
				// the safest default is to reload the iframe.
				if (!registeredControls[name]) {
					reload = true;
					return;
				}

				// Don't reload if block has dynamic styles.
				const hasStyles = hasDynamicCSS(name);

				// Don't reload if reloading disabled in control attributes.
				const hasReloadAttribute =
					registeredControls[name].reload_iframe;

				reload = reload || (!hasStyles && hasReloadAttribute);
			});

			const data = applyFilters('vpf.editor.changed-attributes', {
				attributes: changedAttributes,
				reload,
				$frame: this.frameRef.current,
				frameWindow: this.frameWindow,
				frameJQuery: this.frameJQuery,
				$framePortfolio: this.$framePortfolio,
			});

			if (!data.reload) {
				// Update AJAX dynamic data.
				if (data.frameWindow && data.frameWindow.vp_preview_post_data) {
					data.frameWindow.vp_preview_post_data[data.name] =
						data.value;
				}

				// Insert dynamic CSS.
				if (this.previewFrame && newAttributes.block_id) {
					this.previewFrame.sendMessage({
						name: 'dynamic-css',
						blockId: newAttributes.block_id,
						styles: getDynamicCSS(newAttributes),
					});
				}
			}

			if (data.reload) {
				this.maybeReloadDebounce();
			}
			this.busyReload = false;
		} else {
			this.busyReload = false;
		}
	}

	// Add new methods to track block position
	getBlockPosition(clientId) {
		const { getBlockIndex, getBlockRootClientId } =
			select('core/block-editor');
		const rootClientId = getBlockRootClientId(clientId);
		return getBlockIndex(clientId, rootClientId);
	}

	trackBlockPosition(clientId) {
		const newPosition = this.getBlockPosition(clientId);

		if (this.state.blockPosition !== newPosition) {
			this.setState(
				{
					blockPosition: newPosition,
					loading: true,
				},
				() => {
					// Reload the iframe with a slight delay to ensure DOM is updated
					setTimeout(() => {
						this.maybeReload();
					}, 100);
				}
			);
		}
	}

	maybeReload() {
		let latestIframeHeight = 0;

		if (this.frameRef.current) {
			latestIframeHeight = this.state.currentIframeHeight;
		}

		this.setState(
			{
				loading: true,
				latestIframeHeight,
			},
			() => {
				if (this.formRef.current) {
					this.formRef.current.submit();
				}
			}
		);
	}

	/**
	 * Document this preview is rendered in.
	 *
	 * The editor canvas is a document of its own, so the editor wrapper the
	 * preview measures itself against is not in the top-level one.
	 *
	 * @return {Document} owner document of the preview, the top-level one until
	 *                    the frame is mounted.
	 */
	getPreviewDocument() {
		return this.frameRef.current?.ownerDocument || document;
	}

	/**
	 * Resize frame to properly work with @media.
	 */
	maybeResizePreviews() {
		const contentWidth = $(
			'.editor-styles-wrapper, .edit-post-visual-editor__content-area',
			this.getPreviewDocument()
		)
			.eq(0)
			.width();

		if (!contentWidth || !this.frameRef.current) {
			return;
		}

		const frame = this.frameRef.current;
		const $frame = $(frame);
		const parentWidth = $frame
			.closest('.visual-portfolio-gutenberg-preview')
			.width();

		$frame.css({
			width: contentWidth,
		});

		if (this.previewFrame) {
			this.previewFrame.sendMessage({
				name: 'resize',
				width: parentWidth,
			});
			this.previewFrame.resize();
		}
	}

	/**
	 * Update iframe height.
	 *
	 * @param newHeight
	 */
	updateIframeHeight(newHeight) {
		this.setState({
			currentIframeHeight: newHeight,
		});
	}

	/**
	 * Prepare form input for POST variables.
	 *
	 * @param {string} name - option name.
	 * @param {Mixed}  val  - option value.
	 *
	 * @return {JSX} - form control.
	 */
	printInput(name, val) {
		const params = {
			type: 'text',
			name,
			value: val,
			readOnly: true,
		};

		if (typeof val === 'number') {
			params.type = 'number';
		} else if (typeof val === 'boolean') {
			params.type = 'number';
			params.value = val ? 1 : 0;
		} else if (typeof val === 'object' && val !== null) {
			return (
				<>
					{Object.keys(val).map((i) => (
						<Fragment key={`${name}[${i}]`}>
							{this.printInput(`${name}[${i}]`, val[i])}
						</Fragment>
					))}
				</>
			);
		} else {
			params.value = params.value || '';
		}

		return <input {...params} />;
	}

	render() {
		const { postType, postId } = this.props;

		const { loading, uniqueId, currentIframeHeight, latestIframeHeight } =
			this.state;

		const formData = {};
		const attributes = this.props.attributes;

		const { id, content_source: contentSource } = attributes;

		// Convert attributes for form submission.
		Object.keys(attributes).forEach((key) => {
			formData[`vp_${key}`] = attributes[key];
		});

		return (
			<div
				className={classnames(
					'visual-portfolio-gutenberg-preview',
					loading ? 'visual-portfolio-gutenberg-preview-loading' : ''
				)}
				style={{
					height: loading ? latestIframeHeight : currentIframeHeight,
				}}
			>
				<div className="visual-portfolio-gutenberg-preview-inner">
					<form
						action={variables.preview_url}
						target={uniqueId}
						method="POST"
						style={{ display: 'none' }}
						ref={this.formRef}
					>
						<input
							type="hidden"
							name="vp_preview_frame"
							value="true"
							readOnly
						/>
						<input
							type="hidden"
							name="vp_preview_type"
							value="gutenberg"
							readOnly
						/>
						<input
							type="hidden"
							name="vp_preview_post_type"
							value={postType}
							readOnly
						/>
						<input
							type="hidden"
							name="vp_preview_post_id"
							value={postId}
							readOnly
						/>
						<input
							type="hidden"
							name="vp_preview_nonce"
							value={variables.nonce}
							readOnly
						/>
						{/*
							WordPress 7.1+ isolates the block editor with
							`Document-Isolation-Policy`. The preview has to be
							served with the same policy, or the editor may not
							touch the frame's `contentWindow` even though both
							are same-origin.
						*/}
						<input
							type="hidden"
							name="vp_preview_isolated"
							value={window.crossOriginIsolated ? 1 : 0}
							readOnly
						/>

						{contentSource === 'saved' ? (
							<input
								type="text"
								name="vp_id"
								value={id}
								readOnly
							/>
						) : (
							Object.entries(formData).map(([key, value]) => (
								<Fragment key={key}>
									{this.printInput(key, value)}
								</Fragment>
							))
						)}
					</form>
					<iframe
						title="vp-preview"
						id={uniqueId}
						name={uniqueId}
						// eslint-disable-next-line react/no-unknown-property
						allowtransparency="true"
						ref={this.frameRef}
					/>
				</div>
				{loading ? <Spinner /> : ''}
			</div>
		);
	}
}

export default withSelect((selectEditor) => {
	const {
		getDeviceType,
		getCurrentPost,
		getBlockIndex,
		getBlockRootClientId,
	} = selectEditor('core/editor') || {};
	return {
		previewDeviceType: getDeviceType ? getDeviceType() : 'desktop',
		postType: getCurrentPost ? getCurrentPost().type : 'standard',
		postId: getCurrentPost ? getCurrentPost().id : 'widgets',
		getBlockIndex,
		getBlockRootClientId,
	};
})(IframePreview);
