import { compose, withInstanceId } from '@wordpress/compose';
import { withDispatch, withSelect } from '@wordpress/data';
import { addFilter } from '@wordpress/hooks';
import { __ } from '@wordpress/i18n';

import FocalPointControl, {
	hasCustomFocalPointValue,
	normalizeFocalPointValue,
} from '../components/focal-point-control';

/**
 * Component
 *
 * @param {Object} props Component props.
 * @return {JSX.Element|null} Component output.
 */
function VpImageFocalPointComponent( props ) {
	const { getMeta, featuredImageId, updateMeta } = props;

	if ( ! featuredImageId ) {
		return null;
	}

	const focalPoint = normalizeFocalPointValue(
		getMeta( '_vp_image_focal_point' )
	);

	return (
		<FocalPointControl
			value={ focalPoint }
			defaultExpanded={ hasCustomFocalPointValue( focalPoint ) }
			description={ __(
				'Focal point will be used in Visual Portfolio layouts only:',
				'visual-portfolio'
			) }
			onChange={ ( nextValue ) => {
				updateMeta( '_vp_image_focal_point', nextValue );
			} }
		/>
	);
}

const VpImageFocalPoint = compose( [
	withSelect( ( select ) => {
		const { getEditedPostAttribute } = select( 'core/editor' );

		const featuredImageId = getEditedPostAttribute( 'featured_media' );
		const meta = getEditedPostAttribute( 'meta' ) || {};

		return {
			featuredImageId,
			getMeta( name ) {
				return meta[ name ];
			},
		};
	} ),
	withDispatch( ( dispatch ) => ( {
		updateMeta( name, val ) {
			dispatch( 'core/editor' ).editPost( { meta: { [ name ]: val } } );
		},
	} ) ),
	withInstanceId,
] )( VpImageFocalPointComponent );

addFilter(
	'editor.PostFeaturedImage',
	'vpf/post-featured-image-focal-point',
	( OriginalComponent ) =>
		function ( props ) {
			return (
				<>
					<OriginalComponent { ...props } />
					<VpImageFocalPoint />
				</>
			);
		}
);
