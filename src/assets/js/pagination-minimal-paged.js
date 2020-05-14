/*
 * Minimal Paged pagination.
 */
const $ = window.jQuery;

// Init minimal paged pagination.
$( document ).on( 'init.vpf loadedNewItems.vpf', ( event, self ) => {
    if ( 'vpf' !== event.namespace || 'paged' !== self.options.pagination || ! self.$pagination.children( '.vp-pagination__style-minimal' ).length ) {
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
