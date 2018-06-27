/**
 * Gutenberg block
 */

// External Dependencies.
import classnames from 'classnames/dedupe';

// Internal Dependencies.
import elementIconBlack from '../images/icon-black.svg';
import elementIconGray from '../images/icon-gray.svg';

const { __ } = wp.i18n;
const {
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
    } )( ( {
        portfolioLayouts, attributes, className, setAttributes,
    } ) => {
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

        return (
            <Placeholder
                icon={ <img className="visual-portfolio-gutenberg-icon" src={ elementIconGray } alt="visual-portfolio-icon" /> }
                label={ __( 'Visual Portfolio' ) }
                className={ className }
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
        );
    } ),

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
