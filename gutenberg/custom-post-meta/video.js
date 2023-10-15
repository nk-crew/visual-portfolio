import $ from 'jquery';
import rafSchd from 'raf-schd';
import { debounce } from 'throttle-debounce';

import { PanelRow, TextControl } from '@wordpress/components';
import { compose, withInstanceId } from '@wordpress/compose';
import { withDispatch, withSelect } from '@wordpress/data';
import { PluginDocumentSettingPanel } from '@wordpress/edit-post';
import { Component } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { registerPlugin } from '@wordpress/plugins';

const { ajaxurl, VPGutenbergMetaVariables } = window;

/**
 * Component
 */
class VpVideoComponent extends Component {
	constructor(props) {
		super(props);

		this.state = {
			oembedQuery: '',
			oembedHTML: '',
		};

		this.maybePrepareOembed = debounce(
			300,
			rafSchd(this.maybePrepareOembed.bind(this))
		);
	}

	componentDidMount() {
		this.maybePrepareOembed();
	}

	componentDidUpdate() {
		this.maybePrepareOembed();
	}

	/**
	 * Prepare oEmbed HTML.
	 */
	maybePrepareOembed() {
		const { oembedQuery, oembedHTML } = this.state;

		const { getMeta, postFormat } = this.props;

		if (postFormat !== 'video') {
			return;
		}

		const videoUrl = getMeta('_vp_format_video_url');

		if (oembedQuery === videoUrl) {
			return;
		}

		// Abort AJAX.
		if (this.oembedAjax && this.oembedAjax.abort) {
			this.oembedAjax.abort();
		}

		if (!oembedQuery && oembedHTML) {
			this.setState({
				oembedHTML: '',
			});
			return;
		}

		this.oembedAjax = $.ajax({
			url: ajaxurl,
			method: 'POST',
			dataType: 'json',
			data: {
				action: 'vp_find_oembed',
				q: videoUrl,
				nonce: VPGutenbergMetaVariables.nonce,
			},
			complete: (data) => {
				const json = data.responseJSON;
				const newState = {
					oembedQuery: videoUrl,
					oembedHTML: '',
				};

				if (json && typeof json.html !== 'undefined') {
					newState.oembedHTML = json.html;
				}
				this.setState(newState);

				this.oembedAjax = null;
			},
		});
	}

	render() {
		const { getMeta, postFormat, updateMeta } = this.props;

		const { oembedHTML } = this.state;

		if (postFormat !== 'video') {
			return null;
		}

		return (
			<PluginDocumentSettingPanel
				name="VPVideo"
				title={__('Video', 'visual-portfolio')}
				icon={
					<svg
						width="14"
						height="14"
						viewBox="0 0 20 20"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							d="M19.25 10C19.25 15.1086 15.1086 19.25 10 19.25C4.89137 19.25 0.75 15.1086 0.75 10C0.75 4.89137 4.89137 0.75 10 0.75C15.1086 0.75 19.25 4.89137 19.25 10Z"
							stroke="currentColor"
							strokeWidth="1.5"
							strokeLinecap="round"
							strokeLinejoin="round"
							fill="transparent"
						/>
						<path
							d="M8 12.6326V7.36671C8.00011 7.30082 8.01856 7.23618 8.05342 7.17955C8.08828 7.12293 8.13826 7.0764 8.19812 7.04485C8.25798 7.0133 8.32552 6.99789 8.39367 7.00023C8.46181 7.00257 8.52805 7.02258 8.58544 7.05816L12.8249 9.69035C12.8786 9.72358 12.9228 9.76933 12.9534 9.82337C12.984 9.87742 13 9.93803 13 9.99963C13 10.0612 12.984 10.1218 12.9534 10.1759C12.9228 10.2299 12.8786 10.2757 12.8249 10.3089L8.58544 12.9418C8.52805 12.9774 8.46181 12.9974 8.39367 12.9998C8.32552 13.0021 8.25798 12.9867 8.19812 12.9551C8.13826 12.9236 8.08828 12.8771 8.05342 12.8204C8.01856 12.7638 8.00011 12.6992 8 12.6333V12.6326Z"
							fill="currentColor"
						/>
					</svg>
				}
				className="vpf-meta-video-panel"
			>
				<PanelRow>
					<p className="description">
						{sprintf(
							__(
								'Video will be used in %s layouts only. Full list of supported links',
								'visual-portfolio'
							),
							VPGutenbergMetaVariables.plugin_name
						)}
						&nbsp;
						<a
							href="https://visualportfolio.co/docs/projects/video-project/#supported-video-vendors"
							target="_blank"
							rel="noopener noreferrer"
						>
							{__('see here', 'visual-portfolio')}
						</a>
					</p>
				</PanelRow>
				<PanelRow>
					<TextControl
						label={__('Video URL', 'visual-portfolio')}
						value={getMeta('_vp_format_video_url') || ''}
						onChange={(val) => {
							updateMeta('_vp_format_video_url', val);
						}}
						type="url"
						placeholder="https://"
					/>
				</PanelRow>
				<PanelRow>
					<div
						className="vp-oembed-preview"
						dangerouslySetInnerHTML={{ __html: oembedHTML }}
					/>
				</PanelRow>
			</PluginDocumentSettingPanel>
		);
	}
}

const VpVideo = compose([
	withSelect((select) => ({
		getMeta(name) {
			const meta =
				select('core/editor').getEditedPostAttribute('meta') || {};
			return meta[name];
		},
		postFormat: select('core/editor').getEditedPostAttribute('format'),
	})),
	withDispatch((dispatch) => ({
		updateMeta(name, val) {
			dispatch('core/editor').editPost({ meta: { [name]: val } });
		},
	})),
	withInstanceId,
])(VpVideoComponent);

// Check if editPost available.
// For example, on the Widgets screen this variable is not defined.
if (wp.editPost) {
	registerPlugin('vp-video', {
		render: VpVideo,
	});
}
