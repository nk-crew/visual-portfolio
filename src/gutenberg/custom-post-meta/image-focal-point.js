/**
 * WordPress Dependencies
 */
const { __ } = wp.i18n;

const { withInstanceId, compose } = wp.compose;

const { withSelect, withDispatch } = wp.data;

const { Component } = wp.element;

const {
    PanelRow,
    FocalPointPicker,
} = wp.components;

const {
    PluginDocumentSettingPanel,
} = wp.editPost;

const { registerPlugin } = wp.plugins;

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
            <PluginDocumentSettingPanel
                name="VPImageFocalPoint"
                title={ __( 'Featured Image Focal Point', '@@text_domain' ) }
                icon={ (
                    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <rect x="0.75" y="0.75" width="18.5" height="18.5" rx="1.25" stroke="currentColor" strokeWidth="1.5" fill="transparent" />
                        <path d="M1 15.5L6 12L10 14L14.5 10L19 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="transparent" />
                    </svg>
                ) }
                className="vpf-meta-image-focal-point-panel"
            >
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
            </PluginDocumentSettingPanel>
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

        // support for custom thumbnail from Pro plugin.
        // eslint-disable-next-line no-underscore-dangle
        const customThumbnailId = meta._vp_custom_thumbnail || false;
        const thumbnailData = customThumbnailId || featuredImageId ? getMedia( customThumbnailId || featuredImageId ) : null;

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

registerPlugin( 'vp-image-focal-point', {
    render: VpImageFocalPoint,
} );
