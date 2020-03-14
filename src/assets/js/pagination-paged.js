/*
 * Visual Portfolio pagination Paged.
 */
const $ = window.jQuery;

// Init paged pagination.
$( document ).on( 'init.vpf loadedNewItems.vpf', ( event, self ) => {
    if ( 'vpf' !== event.namespace || self.options.pagination !== 'paged' ) {
        return;
    }

    // Hack used in Paged active item to make circle using hidden <img>.
    // See styles for <img> tag in /templates/pagination/style.scss
    const $activeItem = self.$pagination.find( '.vp-pagination__item-active' );
    let $img = $activeItem.find( 'img' );

    if ( ! $img.length ) {
        $img = $( '<img src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7" alt="">' );
        $activeItem.prepend( $img );
    }

    $img.css( {
        width: $img.height(),
    } );
} );
