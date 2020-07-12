/**
 * External Dependencies
 */
import { debounce } from 'throttle-debounce';

/**
 * WordPress Dependencies
 */
const { __ } = wp.i18n;

const { withInstanceId, compose } = wp.compose;

const { withSelect, withDispatch } = wp.data;

const { Component } = wp.element;

const {
    PanelRow,
    TextControl,
} = wp.components;

const {
    PluginDocumentSettingPanel,
} = wp.editPost;

const { registerPlugin } = wp.plugins;

const {
    jQuery: $,
    ajaxurl,
    VPGutenbergMetaVariables,
} = window;

/**
 * Component
 */
class VpVideoComponent extends Component {
    constructor( props ) {
        super( props );

        this.state = {
            oembedQuery: '',
            oembedHTML: '',
        };

        this.maybePrepareOembed = debounce( 300, this.maybePrepareOembed.bind( this ) );
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
        const {
            oembedQuery,
            oembedHTML,
        } = this.state;

        const {
            getMeta,
            getPostFormat,
        } = this.props;

        if ( 'video' !== getPostFormat() ) {
            return;
        }

        const videoUrl = getMeta( '_vp_format_video_url' );

        if ( oembedQuery === videoUrl ) {
            return;
        }

        // Abort AJAX.
        if ( this.oembedAjax && this.oembedAjax.abort ) {
            this.oembedAjax.abort();
        }

        if ( ! oembedQuery && oembedHTML ) {
            this.setState( {
                oembedHTML: '',
            } );
            return;
        }

        this.oembedAjax = $.ajax( {
            url: ajaxurl,
            method: 'POST',
            dataType: 'json',
            data: {
                action: 'vp_find_oembed',
                q: videoUrl,
                nonce: VPGutenbergMetaVariables.nonce,
            },
            complete: ( data ) => {
                const json = data.responseJSON;
                const newState = {
                    oembedQuery: videoUrl,
                    oembedHTML: '',
                };

                if ( json && 'undefined' !== typeof json.html ) {
                    newState.oembedHTML = json.html;
                }
                this.setState( newState );

                this.oembedAjax = null;
            },
        } );
    }

    render() {
        const {
            getMeta,
            getPostFormat,
            updateMeta,
        } = this.props;

        const {
            oembedHTML,
        } = this.state;

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
                <PanelRow>
                    { /* eslint-disable-next-line react/no-danger */ }
                    <div className="vp-oembed-preview" dangerouslySetInnerHTML={ { __html: oembedHTML } } />
                </PanelRow>
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
