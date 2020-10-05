/**
 * WordPress Dependencies
 */
const { __ } = wp.i18n;

const { withInstanceId, compose } = wp.compose;

const { withSelect, withDispatch } = wp.data;

const {
    Fragment,
    Component,
} = wp.element;

const {
    PanelRow,
    FocalPointPicker,
} = wp.components;

const {
    addFilter,
} = wp.hooks;

/**
 * Component
 */
class VpImageFocalPointComponent extends Component {
    render() {
        const {
            getMeta,
            thumbnailData,
            updateMeta,
        } = this.props;

        let previewUrl = '';

        if ( thumbnailData ) {
            const mediaSize = 'post-thumbnail';

            previewUrl = thumbnailData.source_url;

            if ( ! thumbnailData.mime_type || 'image/gif' !== thumbnailData.mime_type ) {
                if ( thumbnailData.media_details && thumbnailData.media_details.sizes && thumbnailData.media_details.sizes[ mediaSize ] ) {
                    // use mediaSize when available
                    previewUrl = thumbnailData.media_details.sizes[ mediaSize ].source_url;
                } else {
                    // get fallbackMediaSize if mediaSize is not available
                    const fallbackMediaSize = 'thumbnail';

                    if ( thumbnailData.media_details && thumbnailData.media_details.sizes && thumbnailData.media_details.sizes[ fallbackMediaSize ] ) {
                        // use fallbackMediaSize when mediaSize is not available
                        previewUrl = thumbnailData.media_details.sizes[ fallbackMediaSize ].source_url;
                    }
                }
            }
        }

        if ( ! previewUrl ) {
            return null;
        }

        let focalPoint = getMeta( '_vp_image_focal_point' );
        if ( ! focalPoint || ! focalPoint.x || ! focalPoint.y ) {
            focalPoint = {
                x: '0.5',
                y: '0.5',
            };
        }

        return (
            <div className="vpf-post-image-focal-point-panel">
                <PanelRow>
                    <p className="description">{ __( 'Focal point will be used in Visual Portfolio layouts only.', '@@text_domain' ) }</p>
                </PanelRow>
                <PanelRow>
                    <FocalPointPicker
                        url={ previewUrl }
                        value={ focalPoint }
                        onChange={ ( val ) => {
                            updateMeta( '_vp_image_focal_point', val );
                        } }
                    />
                </PanelRow>
            </div>
        );
    }
}

const VpImageFocalPoint = compose( [
    withSelect( ( select ) => {
        const {
            getEditedPostAttribute,
        } = select( 'core/editor' );

        const {
            getMedia,
        } = select( 'core' );

        const featuredImageId = getEditedPostAttribute( 'featured_media' );
        const meta = getEditedPostAttribute( 'meta' ) || {};
        const thumbnailData = featuredImageId ? getMedia( featuredImageId ) : null;

        return {
            thumbnailData,
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

addFilter( 'editor.PostFeaturedImage', 'vpf/post-featured-image-focal-point', ( OriginalComponent ) => (
    function( props ) {
        return (
            <Fragment>
                <VpImageFocalPoint />
                <OriginalComponent { ...props } />
            </Fragment>
        );
    }
) );
