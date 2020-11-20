/**
 * Import CSS
 */
import './style.scss';

/**
 * External dependencies
 */
import { throttle, debounce } from 'throttle-debounce';
import rafSchd from 'raf-schd';
import iframeResizer from 'iframe-resizer/js/iframeResizer';
import classnames from 'classnames/dedupe';

/**
 * Internal dependencies
 */
import './live-reload-conditions';
import getDynamicCSS, { hasDynamicCSS } from '../../utils/controls-dynamic-css';

const $ = window.jQuery;
const variables = window.VPAdminGutenbergVariables;

/**
 * WordPress dependencies
 */
const {
    applyFilters,
} = wp.hooks;

const {
    Component,
    Fragment,
    createRef,
} = wp.element;

const {
    withSelect,
} = wp.data;

const {
    Spinner,
} = wp.components;

let uniqueIdCount = 1;

/**
 * Component Class
 */
class IframePreview extends Component {
    constructor( ...args ) {
        super( ...args );

        this.state = {
            loading: true,
            uniqueId: `vpf-preview-${ uniqueIdCount }`,
            latestIframeHeight: 0,
        };

        uniqueIdCount += 1;

        this.frameRef = createRef();
        this.formRef = createRef();

        this.maybePreviewTypeChanged = this.maybePreviewTypeChanged.bind( this );
        this.maybeAttributesChanged = this.maybeAttributesChanged.bind( this );
        this.onFrameLoad = this.onFrameLoad.bind( this );
        this.maybeReload = this.maybeReload.bind( this );
        this.maybeReloadDebounce = debounce( 300, rafSchd( this.maybeReload.bind( this ) ) );
        this.maybeResizePreviews = this.maybeResizePreviews.bind( this );
        this.maybeResizePreviewsThrottle = throttle( 100, rafSchd( this.maybeResizePreviews ) );
        this.printInput = this.printInput.bind( this );
    }

    componentDidMount() {
        const {
            clientId,
        } = this.props;

        iframeResizer( {
            interval: 10,
            warningTimeout: 60000,
            checkOrigin: false,
            onMessage( { message } ) {
                // select current block on click message.
                if ( 'clicked' === message ) {
                    wp.data.dispatch( 'core/block-editor' ).selectBlock( clientId );

                    window.focus();
                }
            },
        }, this.frameRef.current );

        this.frameRef.current.addEventListener( 'load', this.onFrameLoad );
        window.addEventListener( 'resize', this.maybeResizePreviewsThrottle );

        this.maybeReload();
    }

    componentDidUpdate( prevProps ) {
        this.maybePreviewTypeChanged( prevProps );
        this.maybeAttributesChanged( prevProps );
    }

    componentWillUnmount() {
        this.frameRef.current.removeEventListener( 'load', this.onFrameLoad );
        window.removeEventListener( 'resize', this.maybeResizePreviewsThrottle );

        if ( this.frameRef.current.iframeResizer ) {
            this.frameRef.current.iframeResizer.close();
            this.frameRef.current.iframeResizer.removeListeners();
        }
    }

    /**
     * On frame load event.
     *
     * @param {Object} e - event data.
     */
    onFrameLoad( e ) {
        this.frameWindow = e.target.contentWindow;
        this.frameJQuery = e.target.contentWindow.jQuery;

        if ( this.frameJQuery ) {
            this.$framePortfolio = this.frameJQuery( '.vp-portfolio' );

            this.maybeResizePreviews();

            if ( this.frameTimeout ) {
                clearTimeout( this.frameTimeout );
            }

            // We need this timeout, since we resize iframe size and layouts resized with transitions.
            this.frameTimeout = setTimeout( () => {
                this.setState( {
                    loading: false,
                } );
            }, 300 );
        }
    }

    maybePreviewTypeChanged( prevProps ) {
        if ( prevProps.previewDeviceType === this.props.previewDeviceType ) {
            return;
        }

        this.maybeResizePreviews();
    }

    maybeAttributesChanged( prevProps ) {
        if ( this.busyReload ) {
            return;
        }
        this.busyReload = true;

        const {
            attributes: newAttributes,
        } = this.props;

        const {
            attributes: oldAttributes,
        } = prevProps;

        const frame = this.frameRef.current;

        const changedAttributes = {};

        // change changed attributes.
        Object.keys( newAttributes ).forEach( ( name ) => {
            const val = newAttributes[ name ];

            if ( 'undefined' === typeof oldAttributes[ name ] || oldAttributes[ name ] !== val ) {
                changedAttributes[ name ] = val;
            }
        } );

        if ( Object.keys( changedAttributes ).length ) {
            let reload = false;

            // Don't reload if block has dynamic styles.
            Object.keys( changedAttributes ).forEach( ( name ) => {
                reload = reload || ! hasDynamicCSS( name );
            } );

            const data = applyFilters( 'vpf.editor.changed-attributes', {
                attributes: changedAttributes,
                reload,
                $frame: this.frameRef.current,
                frameWindow: this.frameWindow,
                frameJQuery: this.frameJQuery,
                $framePortfolio: this.$framePortfolio,
            } );

            if ( ! data.reload ) {
                // Update AJAX dynamic data.
                if ( data.frameWindow && data.frameWindow.vp_preview_post_data ) {
                    data.frameWindow.vp_preview_post_data[ data.name ] = data.value;
                }

                // Insert dynamic CSS.
                if ( frame.iFrameResizer && newAttributes.block_id ) {
                    frame.iFrameResizer.sendMessage( {
                        name: 'dynamic-css',
                        blockId: newAttributes.block_id,
                        styles: getDynamicCSS( newAttributes ),
                    } );
                }
            }

            if ( data.reload ) {
                this.maybeReloadDebounce();
            }
            this.busyReload = false;
        } else {
            this.busyReload = false;
        }
    }

    maybeReload() {
        let latestIframeHeight = 0;

        if ( this.frameRef.current ) {
            latestIframeHeight = this.frameRef.current.scrollHeight;
        }

        this.setState( {
            loading: true,
            latestIframeHeight,
        } );
        this.formRef.current.submit();
    }

    /**
     * Resize frame to properly work with @media.
     */
    maybeResizePreviews() {
        const contentWidth = $( '.editor-styles-wrapper' ).width();

        if ( ! contentWidth || ! this.frameRef.current ) {
            return;
        }

        const frame = this.frameRef.current;
        const $frame = $( frame );
        const $inner = $frame.closest( '.visual-portfolio-gutenberg-preview-inner' );
        const parentWidth = $frame.closest( '.visual-portfolio-gutenberg-preview' ).width();

        $inner.css( {
            width: contentWidth,
        } );

        if ( frame.iFrameResizer ) {
            frame.iFrameResizer.sendMessage( {
                name: 'resize',
                width: parentWidth,
            } );
            frame.iFrameResizer.resize();
        }
    }

    /**
     * Prepare form input for POST variables.
     *
     * @param {String} name - option name.
     * @param {Mixed} val - option value.
     *
     * @returns {JSX} - form control.
     */
    printInput( name, val ) {
        const params = {
            key: name,
            type: 'text',
            name,
            value: val,
        };

        if ( 'number' === typeof val ) {
            params.type = 'number';
        } else if ( 'boolean' === typeof val ) {
            params.type = 'number';
            params.value = val ? 1 : 0;
        } else if ( 'object' === typeof val && null !== val ) {
            return (
                <Fragment>
                    { Object.keys( val ).map( ( i ) => this.printInput( `${ name }[${ i }]`, val[ i ] ) ) }
                </Fragment>
            );
        }

        return (
            <input { ...params } />
        );
    }

    render() {
        const {
            attributes,
        } = this.props;

        const {
            loading,
            uniqueId,
            latestIframeHeight,
        } = this.state;

        const {
            id,
            content_source: contentSource,
        } = attributes;

        return (
            <div
                className={ classnames(
                    'visual-portfolio-gutenberg-preview',
                    loading ? 'visual-portfolio-gutenberg-preview-loading' : ''
                ) }
                style={ loading ? { minHeight: latestIframeHeight } : {} }
            >
                <div className="visual-portfolio-gutenberg-preview-inner">
                    <form
                        action={ variables.preview_url }
                        target={ uniqueId }
                        method="POST"
                        style={ { display: 'none' } }
                        ref={ this.formRef }
                    >
                        <input type="hidden" name="vp_preview_frame" value="true" />
                        <input type="hidden" name="vp_preview_type" value="gutenberg" />

                        { 'saved' === contentSource ? (
                            <input type="text" name="vp_id" value={ id } />
                        ) : (
                            <Fragment>
                                <input type="hidden" name="vp_content_source" value={ contentSource } />
                                { Object.keys( attributes ).map( ( k ) => {
                                    const val = attributes[ k ];

                                    return this.printInput( `vp_${ k }`, val );
                                } ) }
                            </Fragment>
                        ) }
                    </form>
                    <iframe
                        title="vp-preview"
                        id={ uniqueId }
                        name={ uniqueId }
                        // eslint-disable-next-line
                        allowtransparency="true"
                        ref={ this.frameRef }
                    />
                </div>
                { loading ? (
                    <Spinner />
                ) : '' }
            </div>
        );
    }
}

export default withSelect( ( select ) => {
    const {
        __experimentalGetPreviewDeviceType,
    } = select( 'core/edit-post' );

    return {
        previewDeviceType: __experimentalGetPreviewDeviceType ? __experimentalGetPreviewDeviceType() : 'desktop',
    };
} )( IframePreview );
