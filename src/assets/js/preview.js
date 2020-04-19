/*!
 * Name    : Visual Portfolio
 * Version : @@plugin_version
 * Author  : nK https://nkdev.info
 */
const $ = window.jQuery;
const $body = $( 'body' );
const $preview = $( '#vp_preview' );
const $portfolio = $preview.find( '.vp-portfolio' );

// prevent click on items links.
$portfolio.on( 'click', '.vp-portfolio__item, .vp-portfolio__item a', ( e ) => {
    e.preventDefault();
    e.stopPropagation();
} );

// add dynamic data to AJAX calls.
$( document ).on( 'startLoadingNewItems.vpf', function( event, vpObject, url, ajaxData ) {
    if ( 'vpf' !== event.namespace ) {
        return;
    }

    ajaxData.data = Object.assign( ajaxData.data || {}, window.vp_preview_post_data );
} );

// configure iFrame resizer script.
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
