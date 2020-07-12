const { __ } = wp.i18n;

const { withInstanceId, compose } = wp.compose;

const { withSelect, withDispatch } = wp.data;

const { Component } = wp.element;

const {
    PanelRow,
    TextControl,
    createSlotFill,
} = wp.components;

const {
    PluginDocumentSettingPanel,
} = wp.editPost;

const { registerPlugin } = wp.plugins;

const { Slot } = createSlotFill( 'VpVideoSidebar' );

class VpVideoComponent extends Component {
    render() {
        const {
            getMeta,
            getPostFormat,
            updateMeta,
        } = this.props;

        if ( 'video' !== getPostFormat() ) {
            return '';
        }

        return (
            <PluginDocumentSettingPanel
                name="VPVideo"
                title={ __( 'Video', '@@text_domain' ) }
                icon="format-video"
            >
                <PanelRow>
                    <TextControl
                        label={ __( 'Video URL', '@@text_domain' ) }
                        value={ getMeta( '_vp_format_video_url' ) || '' }
                        onChange={ ( val ) => {
                            updateMeta( '_vp_format_video_url', val );
                        } }
                        type="url"
                        placeholder="https://"
                    />
                </PanelRow>
                <Slot />
            </PluginDocumentSettingPanel>
        );
    }
}

const VpVideo = compose( [
    withSelect( ( select ) => ( {
        getMeta( name ) {
            const meta = select( 'core/editor' ).getEditedPostAttribute( 'meta' ) || {};
            return meta[ name ];
        },
        getPostFormat() {
            return select( 'core/editor' ).getEditedPostAttribute( 'format' );
        },
    } ) ),
    withDispatch( ( dispatch ) => ( {
        updateMeta( name, val ) {
            dispatch( 'core/editor' ).editPost( { meta: { [ name ]: val } } );
        },
    } ) ),
    withInstanceId,
] )( VpVideoComponent );

registerPlugin( 'vp-video', {
    render: VpVideo,
} );
