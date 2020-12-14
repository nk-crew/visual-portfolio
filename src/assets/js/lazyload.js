/*
 * Visual Portfolio images lazy load.
 */
const {
    jQuery: $,
    objectFitImages,
} = window;

const $doc = $( document );

// enable object-fit
if ( 'undefined' !== typeof objectFitImages ) {
    // ofi and lazysizes conflicted, so we need to run lazysizes
    // first and then run ofi polyfill.
    objectFitImages( '.vp-portfolio img:not(.vp-lazyload)' );

    $doc.on( 'lazybeforeunveil', ( e ) => {
        const $img = $( e.target );

        if ( $img.closest( '.vp-portfolio' ).length ) {
            $img.one( 'load', () => {
                objectFitImages( $img[ 0 ] );
            } );
        }
    } );
}

// recalculate image size if parent is <picture>
$doc.on( 'lazybeforesizes', ( e ) => {
    e.detail.width = $( e.target ).parents( ':not(picture)' ).innerWidth() || e.detail.width;
} );

// Lazyloaded - remove preloader images placeholder effect.
$doc.on( 'lazybeforeunveil', ( e ) => {
    const $img = $( e.target );

    $img.closest( '.vp-portfolio__item-img' ).addClass( 'vp-portfolio__item-img-lazyloading' );
    $img.closest( '.vp-portfolio__thumbnail-img' ).addClass( 'vp-portfolio__thumbnail-img-lazyloading' );

    /**
     * Remove <noscript> tag.
     * Some of optimization plugin make something, that killed our styles with noscript tag.
     * Related topic: https://wordpress.org/support/topic/visual-portfolio-and-sg-optimizer-dont-play-well/
     */
    $img.prev( 'noscript' ).remove();
} );
$doc.on( 'lazyloaded', ( e ) => {
    const $img = $( e.target );

    $img.closest( '.vp-portfolio__item-img' ).removeClass( 'vp-portfolio__item-img-lazyloading' ).addClass( 'vp-portfolio__item-img-lazyloaded' );
    $img.closest( '.vp-portfolio__thumbnail-img' ).removeClass( 'vp-portfolio__thumbnail-img-lazyloading' ).addClass( 'vp-portfolio__thumbnail-img-lazyloaded' );
} );
