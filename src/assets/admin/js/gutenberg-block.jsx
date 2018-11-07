/**
 * Gutenberg block
 */

// External Dependencies.
if ( ! global._babelPolyfill ) {
    require( '@babel/polyfill' );
}
import classnames from 'classnames/dedupe';
import ReactIframeResizer from 'react-iframe-resizer-super';

// Internal Dependencies.
import ElementIcon from '../images/icon-gutenberg.svg';

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
    SelectControl,
} = wp.components;

const { apiFetch } = wp;
const {
    registerStore,
    withSelect,
} = wp.data;

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
        const iframeURL = variables.preview_url + ( variables.preview_url.split( '?' )[ 1 ] ? '&' : '?' ) + `vp_preview_frame=true&vp_preview_frame_id=${ id }`;

        return (
            <div className={ className }>
                <Placeholder
                    className="visual-portfolio-gutenberg-placeholder"
                    icon={ <ElementIcon /> }
                    label={ __( 'Visual Portfolio' ) }
                >
                    { ! Array.isArray( portfolioLayoutsSelect ) &&
                        <Spinner />
                    }
                    { Array.isArray( portfolioLayoutsSelect ) && portfolioLayoutsSelect.length &&
                        <Fragment>
                            { currentItemUrl && <a href={ currentItemUrl } target="_blank">{ __( 'Edit Layout' ) }</a> }
                            <SelectControl
                                value={ id }
                                onChange={ ( value ) => setAttributes( { id: value } ) }
                                options={ portfolioLayoutsSelect }
                            />
                        </Fragment>
                    }
                    { Array.isArray( portfolioLayoutsSelect ) && ! portfolioLayoutsSelect.length &&
                        __( 'No portfolio layouts found.' )
                    }
                </Placeholder>
                { id ? (
                    <div className="visual-portfolio-gutenberg-preview">
                        <ReactIframeResizer
                            src={ iframeURL }
                            iframeResizerOptions={ {
                                resizedCallback( data ) {
                                    if ( data.iframe ) {
                                        jQuery( data.iframe ).css( 'margin-bottom', -jQuery( data.iframe ).height() / 2 );
                                    }
                                },
                            } }
                        />
                    </div>
                ) : '' }
            </div>
        );
    }
}

registerBlockType( 'nk/visual-portfolio', {
    title: 'Visual Portfolio',

    // add element with classname to support different icon sets like FontAwesome.
    icon: ElementIcon,

    category: 'common',

    keywords: [ 'visual portfolio', 'vp', 'portfolio' ],

    supports: {
        anchor: true,
        className: true,
        html: false,
        align: [ 'wide', 'full' ],
        ghostkitIndents: true,
        ghostkitDisplay: true,
        ghostkitSR: true,
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

    save( { attributes, className } ) {
        const {
            id,
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
} );
