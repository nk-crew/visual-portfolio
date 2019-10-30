/*!
 * Name    : Visual Portfolio
 * Version : @@plugin_version
 * Author  : nK https://nkdev.info
 */
( function( $ ) {
    const $preview = $( '#vp_preview' );
    const $portfolio = $preview.find( '.vp-portfolio' );
    $portfolio.on( 'click', '.vp-portfolio__item, .vp-portfolio__item a', ( e ) => {
        e.preventDefault();
        e.stopPropagation();
    } );
    window.iFrameResizer = {
        heightCalculationMethod() {
            return $preview.outerHeight( true );
        },
    };
}( jQuery ) );
