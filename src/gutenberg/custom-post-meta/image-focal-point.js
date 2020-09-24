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
            getThumbnail,
            updateMeta,
        } = this.props;

        const thumbnailData = getThumbnail();

        if ( ! thumbnailData || ! thumbnailData.source_url ) {
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
                        url={ thumbnailData.source_url }
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
    withSelect( ( select ) => ( {
        getMeta( name ) {
            const meta = select( 'core/editor' ).getEditedPostAttribute( 'meta' ) || {};
            return meta[ name ];
        },
        getThumbnail() {
            const featuredImageId = select( 'core/editor' ).getEditedPostAttribute( 'featured_media' );

            return featuredImageId ? select( 'core' ).getMedia( featuredImageId ) : null;
        },
    } ) ),
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
