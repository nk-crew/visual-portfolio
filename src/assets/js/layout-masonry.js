/*
 * Visual Portfolio layout Masonry.
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

    self.defaults.masonryColumns = 3;

    if ( ! self.options.masonryColumns ) {
        self.options.masonryColumns = self.defaults.masonryColumns;
    }
} );

// Init Layout.
$( document ).on( 'initLayout.vpf', ( event, self ) => {
    if ( 'vpf' !== event.namespace ) {
        return;
    }

    if ( self.options.layout !== 'masonry' ) {
        return;
    }

    self.addStyle( '.vp-portfolio__item-wrap', {
        width: `${ 100 / self.options.masonryColumns }%`,
    } );

    // calculate responsive.
    let count = self.options.masonryColumns - 1;
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
