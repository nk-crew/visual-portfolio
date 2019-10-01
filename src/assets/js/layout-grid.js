/*
 * Visual Portfolio layout Grid.
 */
const $ = window.jQuery;

const {
    screenSizes,
} = window.VPData;

// Init Options.
$( document ).on( 'initOptions.vpf', ( event, self ) => {
    if ( 'vpf' !== event.namespace ) {
        return;
    }

    self.defaults.gridColumns = 3;

    if ( ! self.options.gridColumns ) {
        self.options.gridColumns = self.defaults.gridColumns;
    }
} );

// Init Layout.
$( document ).on( 'initLayout.vpf', ( event, self ) => {
    if ( 'vpf' !== event.namespace ) {
        return;
    }

    if ( self.options.layout !== 'grid' ) {
        return;
    }

    self.addStyle( '.vp-portfolio__item-wrap', {
        width: `${ 100 / self.options.gridColumns }%`,
    } );

    // calculate responsive.
    let count = self.options.gridColumns - 1;
    let currentPoint = Math.min( screenSizes.length - 1, count );

    for ( ; currentPoint >= 0; currentPoint-- ) {
        if ( count > 0 && typeof screenSizes[ currentPoint ] !== 'undefined' ) {
            self.addStyle( '.vp-portfolio__item-wrap', {
                width: `${ 100 / count }%`,
            }, `screen and (max-width: ${ screenSizes[ currentPoint ] }px)` );
        }
        count -= 1;
    }
} );
