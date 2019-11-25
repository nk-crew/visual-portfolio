/*!
 * Name    : Visual Portfolio
 * Version : @@plugin_version
 * Author  : nK https://nkdev.info
 */
const $ = window.jQuery;
const $body = $( 'body' );
const $preview = $( '#vp_preview' );
const $portfolio = $preview.find( '.vp-portfolio' );

$portfolio.on( 'click', '.vp-portfolio__item, .vp-portfolio__item a', ( e ) => {
    e.preventDefault();
    e.stopPropagation();
} );

window.iFrameResizer = {
    log: false,
    heightCalculationMethod() {
        return $preview.outerHeight( true );
    },
    onMessage( data ) {
        if ( data && data.name && 'resize' === data.name ) {
            // This random number needed for proper resize Isotope and other plugins.
            $body.css( 'max-width', data.width + Math.random() );
        }
    },
};
