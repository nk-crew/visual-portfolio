/*
 * Visual Portfolio layout Masonry.
 */
const $ = window.jQuery;

const {
    screenSizes,
} = window.VPData;

/**
 * Parse aspect ratio string.
 *
 * @param {String} val - aspect ratio string.
 *
 * @return {Array}
 */
function parseAspectRatio( val ) {
    let left = '';
    let right = '';

    if ( val && /:/g.test( val ) ) {
        const parts = val.split( ':' );

        // eslint-disable-next-line prefer-destructuring
        left = parts[ 0 ];
        // eslint-disable-next-line prefer-destructuring
        right = parts[ 1 ];
    }

    return [ left, right ];
}

// Init Options.
$( document ).on( 'initOptions.vpf', ( event, self ) => {
    if ( 'vpf' !== event.namespace ) {
        return;
    }

    self.defaults.masonryColumns = 3;

    if ( ! self.options.masonryColumns ) {
        self.options.masonryColumns = self.defaults.masonryColumns;
    }
    if ( ! self.options.masonryImagesAspectRatio ) {
        self.options.masonryImagesAspectRatio = self.defaults.masonryImagesAspectRatio;
    }
} );

// Init Layout.
$( document ).on( 'initLayout.vpf', ( event, self ) => {
    if ( 'vpf' !== event.namespace ) {
        return;
    }

    if ( 'masonry' !== self.options.layout ) {
        return;
    }

    // aspect ratio.
    const aspectRatio = parseAspectRatio( self.options.masonryImagesAspectRatio );

    if ( aspectRatio && aspectRatio[ 0 ] && aspectRatio[ 1 ] ) {
        self.addStyle( '.vp-portfolio__item-wrap .vp-portfolio__item-img-wrap::before', {
            'padding-top': `${ 100 * ( aspectRatio[ 1 ] / aspectRatio[ 0 ] ) }%`,
        } );
    }

    // columns.
    self.addStyle( '.vp-portfolio__item-wrap', {
        width: `${ 100 / self.options.masonryColumns }%`,
    } );

    // calculate responsive.
    let count = self.options.masonryColumns - 1;
    let currentPoint = Math.min( screenSizes.length - 1, count );

    for ( ; 0 <= currentPoint; currentPoint -= 1 ) {
        if ( 0 < count && 'undefined' !== typeof screenSizes[ currentPoint ] ) {
            self.addStyle( '.vp-portfolio__item-wrap', {
                width: `${ 100 / count }%`,
            }, `screen and (max-width: ${ screenSizes[ currentPoint ] }px)` );
        }
        count -= 1;
    }
} );
