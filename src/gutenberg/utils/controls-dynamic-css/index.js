/**
 * Internal dependencies
 */
import conditionCheck from '../control-condition-check';

const {
    controls: registeredControls,
} = window.VPGutenbergVariables;

/**
 * Prepare styles from params
 * Params example:
    array(
        'element'  => '$ .inner-selector',
        'property' => 'height',
        'mask'     => '$px',
    )
 *
 * @param {String} selector CSS selector.
 * @param {Mixed}  value Property value.
 * @param {Array}  params Output params.
 *
 * @returns {String}
 */
export function prepareStylesFromParams( selector, value, params ) {
    let result = '';

    if ( ! selector || 'undefined' === typeof value || '' === value || null === value || 'undefined' === typeof params.property ) {
        return result;
    }

    // Value mask.
    if ( 'undefined' !== typeof params.mask ) {
        value = params.mask.replace( '$', value );
    }

    // Custom selector mask.
    if ( 'undefined' !== typeof params.element && /\$/g.test( params.element ) ) {
        selector = params.element.replace( '$', selector );
    } else {
        selector += 'undefined' !== typeof params.element ? ` ${ params.element }` : '';
    }

    // Prepare CSS.
    result = `${ selector } { ${ params.property }: ${ value }; } `;

    return result;
}

/**
 * Check if these control has dynamic CSS.
 *
 * @param {String} controlName control name.
 *
 * @returns {Boolean}
 */
export function hasDynamicCSS( controlName ) {
    return (
        'undefined' !== typeof registeredControls[ controlName ]
        && 'undefined' !== typeof registeredControls[ controlName ].style
        && registeredControls[ controlName ].style.length
    );
}

/**
 * Get dynamic CSS from options.
 *
 * @param {Array} options block options.
 *
 * @returns {String}
 */
export default function getDynamicCSS( options ) {
    let result = '';
    let selector = '';

    if ( 'undefined' !== typeof options.block_id && options.block_id ) {
        selector = options.block_id;
    } else if ( 'undefined' !== typeof options.id && options.id ) {
        selector = options.id;
    }
    if ( ! selector ) {
        return result;
    }

    selector = `.vp-id-${ selector }`;

    // Controls styles.
    Object.keys( registeredControls ).forEach( ( k ) => {
        const control = registeredControls[ k ];
        let allow = 'undefined' !== typeof control.style && control.style;

        // Check condition.
        if ( allow && 'undefined' !== typeof control.condition && control.condition.length ) {
            allow = conditionCheck( control.condition, options );
        }

        // Prepare styles.
        if ( allow ) {
            control.style.forEach( ( data ) => {
                result += prepareStylesFromParams( selector, options[ control.name ], data );
            } );
        }
    } );

    // Custom CSS.
    if ( 'undefined' !== typeof options.custom_css && options.custom_css ) {
        let customCss = options.custom_css;

        // replace 'selector' to actual css selector.
        customCss = customCss.replace( /selector/g, selector );

        // a little security fix.
        customCss = customCss.replace( /<\//g, '&lt;/' );

        result += customCss;
    }

    return result;
}
