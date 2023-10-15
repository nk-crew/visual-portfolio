import {
	__experimentalUnitControl,
	PanelRow,
	UnitControl as __stableUnitControl,
} from '@wordpress/components';
import { compose, withInstanceId } from '@wordpress/compose';
import { withDispatch, withSelect } from '@wordpress/data';
import { Component } from '@wordpress/element';
import { addFilter } from '@wordpress/hooks';
import { __ } from '@wordpress/i18n';

const UnitControl = __stableUnitControl || __experimentalUnitControl;

/**
 * Component
 */
class VpImageFocalPointComponent extends Component {
	render() {
		const { getMeta, featuredImageId, updateMeta } = this.props;

		if (!featuredImageId) {
			return null;
		}

		let focalPoint = getMeta('_vp_image_focal_point');

		if (!focalPoint || !focalPoint.x || !focalPoint.y) {
			focalPoint = {
				x: 0.5,
				y: 0.5,
			};
		}

		return (
			<div className="vpf-post-image-focal-point-panel">
				<PanelRow>
					<p className="description">
						{__(
							'Focal point will be used in Visual Portfolio layouts only:',
							'visual-portfolio'
						)}
					</p>
				</PanelRow>
				<PanelRow>
					<UnitControl
						label={__('Left', 'visual-portfolio')}
						value={100 * focalPoint.x + '%'}
						onChange={(val) => {
							const newFocalPoint = { ...focalPoint };
							newFocalPoint.x = parseFloat(val) / 100;

							updateMeta('_vp_image_focal_point', newFocalPoint);
						}}
						min={0}
						max={100}
						step={1}
						units={[{ value: '%', label: '%' }]}
					/>
					<UnitControl
						label={__('Top', 'visual-portfolio')}
						value={100 * focalPoint.y + '%'}
						onChange={(val) => {
							const newFocalPoint = { ...focalPoint };
							newFocalPoint.y = parseFloat(val) / 100;

							updateMeta('_vp_image_focal_point', newFocalPoint);
						}}
						min={0}
						max={100}
						step={1}
						units={[{ value: '%', label: '%' }]}
					/>
				</PanelRow>
			</div>
		);
	}
}

const VpImageFocalPoint = compose([
	withSelect((select) => {
		const { getEditedPostAttribute } = select('core/editor');

		const featuredImageId = getEditedPostAttribute('featured_media');
		const meta = getEditedPostAttribute('meta') || {};

		return {
			featuredImageId,
			getMeta(name) {
				return meta[name];
			},
		};
	}),
	withDispatch((dispatch) => ({
		updateMeta(name, val) {
			dispatch('core/editor').editPost({ meta: { [name]: val } });
		},
	})),
	withInstanceId,
])(VpImageFocalPointComponent);

addFilter(
	'editor.PostFeaturedImage',
	'vpf/post-featured-image-focal-point',
	(OriginalComponent) =>
		function (props) {
			return (
				<>
					<OriginalComponent {...props} />
					<VpImageFocalPoint />
				</>
			);
		}
);
