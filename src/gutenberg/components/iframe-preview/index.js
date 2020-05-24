/**
 * Import CSS
 */
import './style.scss';

/**
 * External dependencies
 */
import { throttle, debounce } from 'throttle-debounce';
import iframeResizer from 'iframe-resizer/js/iframeResizer';
import classnames from 'classnames/dedupe';

/**
 * Internal dependencies
 */
import getDynamicCSS, { hasDynamicCSS } from '../../utils/controls-dynamic-css';

const $ = window.jQuery;
const variables = window.VPAdminGutenbergVariables;

/**
 * WordPress dependencies
 */
const {
    applyFilters,
    addFilter,
} = wp.hooks;

const {
    Component,
    Fragment,
    createRef,
} = wp.element;

const {
    Spinner,
} = wp.components;

/**
 * Component Class
 */
export default class IframePreview extends Component {
    constructor( ...args ) {
        super( ...args );

        this.state = {
            attributes: { ...this.props.attributes },
            loading: true,
        };

        this.frameRef = createRef();
        this.formRef = createRef();

        this.maybeAttributesChanged = this.maybeAttributesChanged.bind( this );
        this.onFrameLoad = this.onFrameLoad.bind( this );
        this.maybeReload = this.maybeReload.bind( this );
        this.maybeReloadDebounce = debounce( 300, this.maybeReload.bind( this ) );
        this.maybeResizePreviews = this.maybeResizePreviews.bind( this );
        this.maybeResizePreviewsThrottle = throttle( 100, this.maybeResizePreviews );
        this.printInput = this.printInput.bind( this );
    }

    componentDidMount() {
        const {
            clientId,
        } = this.props;

        iframeResizer( {
            interval: 10,
            checkOrigin: false,
            messageCallback( { message } ) {
                // select current block on click message.
                if ( 'clicked' === message ) {
                    wp.data.dispatch( 'core/editor' ).selectBlock( clientId );
                }
            },
        }, this.frameRef.current );

        this.frameRef.current.addEventListener( 'load', this.onFrameLoad );
        window.addEventListener( 'resize', this.maybeResizePreviewsThrottle );

        this.maybeReload();
    }

    componentDidUpdate() {
        this.maybeAttributesChanged();
    }

    componentWillUnmount() {
        this.frameRef.current.removeEventListener( 'load', this.onFrameLoad );
        window.removeEventListener( 'resize', this.maybeResizePreviewsThrottle );

        if ( this.frameRef.current.iframeResizer ) {
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
        this.$framePortfolio = this.frameJQuery( '.vp-portfolio' );

        this.maybeResizePreviews();

        this.setState( {
            loading: false,
        } );
    }

    maybeAttributesChanged() {
        if ( this.busyReload ) {
            return;
        }
        this.busyReload = true;

        const {
            attributes: newAttributes,
        } = this.props;

        const {
            attributes: oldAttributes,
        } = this.state;

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
            let reload = true;

            // Don't reload if block has dynamic styles.
            Object.keys( changedAttributes ).forEach( ( name ) => {
                reload = reload && ! hasDynamicCSS( name );
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

            this.setState( {
                attributes: {
                    ...oldAttributes,
                    ...data.attributes,
                },
            }, () => {
                if ( data.reload ) {
                    this.maybeReloadDebounce();
                }
                this.busyReload = false;
            } );
        } else {
            this.busyReload = false;
        }
    }

    maybeReload() {
        this.setState( {
            loading: true,
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
            clientId,
        } = this.props;

        const {
            attributes,
            loading,
        } = this.state;

        const {
            id,
            content_source: contentSource,
        } = attributes;

        return (
            <div className={ classnames(
                'visual-portfolio-gutenberg-preview',
                loading ? 'visual-portfolio-gutenberg-preview-loading' : ''
            ) }
            >
                <div className="visual-portfolio-gutenberg-preview-inner">
                    <form
                        action={ variables.preview_url }
                        target={ `vpf-preview-${ clientId }` }
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
                        id={ `vpf-preview-${ clientId }` }
                        name={ `vpf-preview-${ clientId }` }
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

// live reload
addFilter( 'vpf.editor.changed-attributes', 'vpf/editor/changed-attributes/live-reload', ( data ) => {
    if ( ! data.$framePortfolio ) {
        return data;
    }

    let reload = false;

    Object.keys( data.attributes ).forEach( ( name ) => {
        const val = data.attributes[ name ];

        switch ( name ) {
        case 'tiles_type':
        case 'masonry_columns':
        case 'grid_columns':
        case 'justified_row_height':
        case 'justified_row_height_tolerance':
        case 'slider_effect':
        case 'slider_speed':
        case 'slider_autoplay':
        case 'slider_autoplay_hover_pause':
        case 'slider_centered_slides':
        case 'slider_loop':
        case 'slider_free_mode':
        case 'slider_free_mode_sticky':
        case 'slider_bullets_dynamic':
        case 'items_gap': {
            data.$framePortfolio.attr( `data-vp-${ name.replace( /_/g, '-' ) }`, val );
            data.$framePortfolio.vpf( 'init' );

            break;
        }
        case 'items_style_default__align':
        case 'items_style_fade__align':
        case 'items_style_fly__align':
        case 'items_style_emerge__align': {
            let allAlignClasses = '';

            [ 'left', 'center', 'right', 'top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right' ].forEach( ( alignName ) => {
                allAlignClasses += `${ allAlignClasses ? ' ' : '' }vp-portfolio__item-align-${ alignName }`;
            } );

            data.$framePortfolio.find( '.vp-portfolio__item-overlay' ).removeClass( allAlignClasses ).addClass( `vp-portfolio__item-align-${ val }` );

            break;
        }
        case 'filter_align':
            data.$framePortfolio.find( '.vp-filter' ).removeClass( 'vp-filter__align-center vp-filter__align-left vp-filter__align-right' ).addClass( `vp-filter__align-${ val }` );

            break;
        case 'sort_align':
            data.$framePortfolio.find( '.vp-sort' ).removeClass( 'vp-sort__align-center vp-sort__align-left vp-sort__align-right' ).addClass( `vp-sort__align-${ val }` );

            break;
        case 'pagination_align':
            data.$framePortfolio.find( '.vp-pagination' ).removeClass( 'vp-pagination__align-center vp-pagination__align-left vp-pagination__align-right' ).addClass( `vp-pagination__align-${ val }` );

            break;
        // prevent some options reload
        case 'list_name':
        case 'stretch':
        case 'custom_css':
            // no reload
            break;
        default:
            reload = reload || data.reload;
            break;
        }
    } );

    return {
        ...data,
        reload,
    };
} );
