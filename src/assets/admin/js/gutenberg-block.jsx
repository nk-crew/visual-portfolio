/**
 * Gutenberg block
 */

// External Dependencies.
import classnames from 'classnames/dedupe';
import ReactIframeResizer from 'react-iframe-resizer-super';

// Internal Dependencies.
import elementIconBlack from '../images/icon-black.svg';
import elementIconGray from '../images/icon-gray.svg';

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
    withAPIData,
} = wp.components;

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
        if ( portfolioLayouts && portfolioLayouts.data && portfolioLayouts.data.success ) {
            portfolioLayoutsSelect = [ {
                label: __( '--- Select layout ---' ),
                value: '',
            } ];
            Object.keys( portfolioLayouts.data.response ).map( ( key ) => {
                const val = portfolioLayouts.data.response[ key ];
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
                    icon={ <img className="visual-portfolio-gutenberg-icon" src={ elementIconGray } alt="visual-portfolio-icon" /> }
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
    icon: <img className="dashicon visual-portfolio-gutenberg-icon" src={ elementIconBlack } alt="visual-portfolio-icon" />,

    category: 'common',

    keywords: [ 'visual portfolio', 'vp', 'portfolio' ],

    supports: {
        anchor: true,
        className: true,
        html: false,
        align: [ 'wide', 'full' ],
        ghostkitIndents: true,
        ghostkitDisplay: true,
    },

    attributes: {
        id: {
            type: 'string',
        },
    },

    edit: withAPIData( () => {
        return {
            portfolioLayouts: '/visual-portfolio/v1/get_layouts/',
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
