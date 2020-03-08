/**
 * Gutenberg block
 */

// External Dependencies.
if ( ! global._babelPolyfill ) {
    require( '@babel/polyfill' );
}
import { throttle } from 'throttle-debounce';
import classnames from 'classnames/dedupe';
import ReactIframeResizer from 'iframe-resizer-react';

// Internal Dependencies.
import ElementIcon from '../images/icon-gutenberg.svg';

const $ = window.jQuery;
const $wnd = $( window );

const variables = window.VPAdminGutenbergVariables;

const { __ } = wp.i18n;
const {
    Component,
    Fragment,
    RawHTML,
} = wp.element;

const {
    registerBlockType,
} = wp.blocks;

const {
    Placeholder,
    Spinner,
    PanelBody,
    SelectControl,
} = wp.components;

const {
    InspectorControls,
} = wp.blockEditor;

const { apiFetch } = wp;

const {
    registerStore,
    withSelect,
} = wp.data;

// add fake iframe width, so @media styles will work fine.
function maybeResizePreviews() {
    const contentWidth = $( '.editor-styles-wrapper' ).width();

    if ( ! contentWidth ) {
        return;
    }

    $( '.visual-portfolio-gutenberg-preview iframe' ).each( function() {
        const $this = $( this );
        const $inner = $this.closest( '.visual-portfolio-gutenberg-preview-inner' );
        const parentWidth = $this.closest( '.visual-portfolio-gutenberg-preview' ).width();

        $inner.css( {
            width: contentWidth,
        } );

        if ( this.iFrameResizer ) {
            this.iFrameResizer.sendMessage( {
                name: 'resize',
                width: parentWidth,
            } );
            this.iFrameResizer.resize();
        }
    } );
}

// window resize.
$wnd.on( 'resize', throttle( 300, maybeResizePreviews ) );

const actions = {
    apiFetch( request ) {
        return {
            type: 'API_FETCH',
            request,
        };
    },
    setPortfolioLayouts( query, layouts ) {
        return {
            type: 'SET_PORTFOLIO_LAYOUTS',
            query,
            layouts,
        };
    },
};
registerStore( 'nk/visual-portfolio', {
    reducer( state = { layouts: {} }, action ) {
        switch ( action.type ) {
        case 'SET_PORTFOLIO_LAYOUTS':
            if ( ! state.layouts[ action.query ] && action.layouts ) {
                state.layouts[ action.query ] = action.layouts;
            }
            return state;
        // no default
        }
        return state;
    },
    actions,
    selectors: {
        getPortfolioLayouts( state, query ) {
            return state.layouts[ query ];
        },
    },
    controls: {
        API_FETCH( { request } ) {
            return apiFetch( request )
                .catch( ( fetchedData ) => {
                    if ( fetchedData && fetchedData.error && 'no_layouts_found' === fetchedData.error_code ) {
                        return {
                            response: [],
                            error: false,
                            success: true,
                        };
                    }

                    return false;
                } )
                .then( ( fetchedData ) => {
                    if ( fetchedData && fetchedData.success && fetchedData.response ) {
                        return fetchedData.response;
                    }
                    return false;
                } );
        },
    },
    resolvers: {
        * getPortfolioLayouts( query ) {
            const layouts = yield actions.apiFetch( { path: query } );
            return actions.setPortfolioLayouts( query, layouts );
        },
    },
} );

class VPEdit extends Component {
    // prevent re-render when ID has not changed.
    shouldComponentUpdate( nextProps ) {
        if (
            this.props.attributes.id === nextProps.attributes.id &&
            this.props.portfolioLayouts === nextProps.portfolioLayouts &&
            this.props.className === nextProps.className
        ) {
            return false;
        }
        return true;
    }

    render() {
        const {
            portfolioLayouts,
            attributes,
            setAttributes,
        } = this.props;
        let {
            className,
        } = this.props;

        const {
            id,
            ghostkitClassname,
        } = attributes;

        let portfolioLayoutsSelect = false;
        let currentItemUrl = false;

        // add custom classname.
        if ( ghostkitClassname ) {
            className = classnames( className, ghostkitClassname );
        }

        // prepare portfolios list.
        if ( portfolioLayouts ) {
            portfolioLayoutsSelect = [ {
                label: __( '--- Select layout ---' ),
                value: '',
            } ];
            Object.keys( portfolioLayouts ).map( ( key ) => {
                const val = portfolioLayouts[ key ];
                portfolioLayoutsSelect.push( {
                    label: `#${ val.id } - ${ val.title }`,
                    value: val.id,
                } );

                if ( id && parseInt( id, 10 ) === val.id ) {
                    currentItemUrl = val.edit_url;
                }
            } );
        } else if ( id ) {
            portfolioLayoutsSelect = [ {
                label: `#${ id }`,
                value: id,
            } ];
        }

        // prepare iframe url.
        const iframeURL = variables.preview_url + ( variables.preview_url.split( '?' )[ 1 ] ? '&' : '?' ) + `vp_preview_frame=true&vp_preview_type=gutenberg&vp_preview_frame_id=${ id }`;

        const controls = (
            <Fragment>
                { ! Array.isArray( portfolioLayoutsSelect ) ? (
                    <Spinner />
                ) : '' }
                { Array.isArray( portfolioLayoutsSelect ) && portfolioLayoutsSelect.length ? (
                    <Fragment>
                        <SelectControl
                            value={ id }
                            onChange={ ( value ) => setAttributes( { id: value } ) }
                            options={ portfolioLayoutsSelect }
                        />
                    </Fragment>
                ) : '' }
                { Array.isArray( portfolioLayoutsSelect ) && ! portfolioLayoutsSelect.length ? (
                    __( 'No portfolio layouts found.' )
                ) : '' }
            </Fragment>
        );

        return (
            <Fragment>
                <InspectorControls>
                    <PanelBody>
                        { controls }
                    </PanelBody>
                    { Array.isArray( portfolioLayoutsSelect ) && portfolioLayoutsSelect.length && currentItemUrl ? (
                        <PanelBody>
                            <a href={ currentItemUrl } target="_blank" rel="noopener noreferrer">{ __( 'Edit Layout' ) }</a>
                        </PanelBody>
                    ) : '' }
                </InspectorControls>
                <div className={ className }>
                    { id ? (
                        <div className="visual-portfolio-gutenberg-preview">
                            <div className="visual-portfolio-gutenberg-preview-inner">
                                <ReactIframeResizer
                                    src={ iframeURL }
                                    onInit={ () => {
                                        maybeResizePreviews();
                                    } }
                                    allowtransparency="true"
                                />
                            </div>
                        </div>
                    ) : (
                        <Placeholder
                            className="visual-portfolio-gutenberg-placeholder"
                            icon={ <ElementIcon /> }
                            label={ __( 'Visual Portfolio' ) }
                        >
                            { controls }
                        </Placeholder>
                    ) }
                </div>
            </Fragment>
        );
    }
}

registerBlockType( 'nk/visual-portfolio', {
    title: 'Visual Portfolio',

    // add element with classname to support different icon sets like FontAwesome.
    icon: ElementIcon,

    category: 'common',

    keywords: [ 'visual portfolio', 'vp', 'portfolio' ],

    ghostkit: {
        supports: {
            spacings: true,
            display: true,
            scrollReveal: true,
        },
    },

    supports: {
        anchor: true,
        className: true,
        html: false,
        align: [ 'wide', 'full' ],
    },

    attributes: {
        id: {
            type: 'string',
        },
    },

    edit: withSelect( ( select ) => {
        return {
            portfolioLayouts: select( 'nk/visual-portfolio' ).getPortfolioLayouts( '/visual-portfolio/v1/get_layouts/' ),
        };
    } )( VPEdit ),

    save( { attributes } ) {
        const {
            id,
            className,
        } = attributes;

        let result = '[visual_portfolio';

        if ( id ) {
            result += ` id="${ id }"`;
        }

        if ( className ) {
            result += ` class="${ className }"`;
        }

        result += ']';

        return <RawHTML>{ result }</RawHTML>;
    },

    transforms: {
        from: [
            {
                type: 'shortcode',
                tag: 'visual_portfolio',
                attributes: {
                    id: {
                        type: 'string',
                        shortcode: ( data ) => {
                            return data.named.id;
                        },
                    },
                    className: {
                        type: 'string',
                        shortcode: ( data ) => {
                            return data.named.class;
                        },
                    },
                },
            },
        ],
    },
} );
