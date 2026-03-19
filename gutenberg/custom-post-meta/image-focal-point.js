import {
	__experimentalUnitControl,
	Button,
	PanelRow,
	UnitControl as __stableUnitControl,
} from '@wordpress/components';
import { compose, withInstanceId } from '@wordpress/compose';
import { withDispatch, withSelect } from '@wordpress/data';
import { useState } from '@wordpress/element';
import { addFilter } from '@wordpress/hooks';
import { __ } from '@wordpress/i18n';

const UnitControl = __stableUnitControl || __experimentalUnitControl;

/**
 * Component
 *
 * @param {Object} props Component props.
 * @return {JSX.Element|null} Component output.
 */
function VpImageFocalPointComponent( props ) {
	const { getMeta, featuredImageId, updateMeta } = props;
	const [ isOpen, setIsOpen ] = useState( false );

	if ( ! featuredImageId ) {
		return null;
	}

	let focalPoint = getMeta( '_vp_image_focal_point' );

	if ( ! focalPoint || ! focalPoint.x || ! focalPoint.y ) {
		focalPoint = {
			x: 0.5,
			y: 0.5,
		};
	}

	return (
		<div className="vpf-post-image-focal-point-panel">
			<Button
				className="vpf-post-image-focal-point-panel__toggle"
				onClick={ () => setIsOpen( ! isOpen ) }
				aria-expanded={ isOpen }
			>
				<span>{ __( 'Image focal point', 'visual-portfolio' ) }</span>
				<svg
					viewBox="0 0 24 24"
					xmlns="http://www.w3.org/2000/svg"
					width="24"
					height="24"
					className="components-panel__arrow"
					aria-hidden="true"
					focusable="false"
				>
					<path d="M17.5 11.6L12 16l-5.5-4.4.9-1.2L12 14l4.5-3.6 1 1.2z" />
				</svg>
			</Button>
			{ isOpen ? (
				<div className="vpf-post-image-focal-point-panel__content">
					<PanelRow>
						<p className="description">
							{ __(
								'Focal point will be used in Visual Portfolio layouts only:',
								'visual-portfolio'
							) }
						</p>
					</PanelRow>
					<PanelRow>
						<UnitControl
							label={ __( 'Left', 'visual-portfolio' ) }
							value={ 100 * focalPoint.x + '%' }
							onChange={ ( val ) => {
								const newFocalPoint = { ...focalPoint };
								newFocalPoint.x = parseFloat( val ) / 100;

								updateMeta(
									'_vp_image_focal_point',
									newFocalPoint
								);
							} }
							min={ 0 }
							max={ 100 }
							step={ 1 }
							units={ [ { value: '%', label: '%' } ] }
							__next40pxDefaultSize
							__nextHasNoMarginBottom
						/>
						<UnitControl
							label={ __( 'Top', 'visual-portfolio' ) }
							value={ 100 * focalPoint.y + '%' }
							onChange={ ( val ) => {
								const newFocalPoint = { ...focalPoint };
								newFocalPoint.y = parseFloat( val ) / 100;

								updateMeta(
									'_vp_image_focal_point',
									newFocalPoint
								);
							} }
							min={ 0 }
							max={ 100 }
							step={ 1 }
							units={ [ { value: '%', label: '%' } ] }
							__next40pxDefaultSize
							__nextHasNoMarginBottom
						/>
					</PanelRow>
				</div>
			) : null }
		</div>
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
