/* eslint-disable no-useless-escape */

/**
 * Get control value.
 * Supported array names like `images[3].format`
 *
 * @param {String} name - control name.
 * @param {Object} attributes - block attributes.
 *
 * @returns {Mixed} value.
 */
export default function controlGetValue( name, attributes ) {
    let val = attributes[ name ];

    // Parse arrays and objects.
    // Example `images[3].format`.
    if ( 'undefined' === typeof val && /[\[\.]/g.test( name ) ) {
        // Find parts, used for objects.
        // Example `images.format`
        const valObjectParts = name.split( '.' );
        const valParts = [];

        if ( valObjectParts && valObjectParts.length ) {
            // Find parts, used for arrays.
            // Example `images[3]`
            valObjectParts.forEach( ( objPart ) => {
                if ( /[\[]/g.test( objPart ) ) {
                    const valArrayParts = objPart.split( /[\[\]]/g );

                    if ( valArrayParts && valArrayParts.length ) {
                        valArrayParts.forEach( ( arrPart ) => {
                            if ( '' !== arrPart ) {
                                if ( `${ parseInt( arrPart, 10 ) }` === arrPart ) {
                                    valParts.push( parseInt( arrPart, 10 ) );
                                } else {
                                    valParts.push( arrPart );
                                }
                            }
                        } );
                    }
                } else {
                    valParts.push( objPart );
                }
            } );

            // Try to find value in attributes.
            if ( valParts.length ) {
                let currentVal = attributes;

                valParts.forEach( ( partName ) => {
                    if ( currentVal && 'undefined' !== typeof currentVal[ partName ] ) {
                        currentVal = currentVal[ partName ];
                    } else {
                        currentVal = undefined;
                    }
                } );

                val = currentVal;
            }
        }
    }

    return val;
}
