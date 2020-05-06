/*
 * Visual Portfolio plugin fjGallery extension.
 */
const $ = window.jQuery;

// Extend VP class.
$( document ).on( 'extendClass.vpf', ( event, VP ) => {
    if ( 'vpf' !== event.namespace ) {
        return;
    }

    /**
     * Init fjGallery plugin
     *
     * @param {mixed} options - gallery options.
     * @param {mixed} additional - additional args.
     */
    VP.prototype.initFjGallery = function( options = false, additional = null ) {
        const self = this;

        if ( self.$items_wrap.fjGallery && 'justified' === self.options.layout ) {
            const initOptions = false !== options ? options : {
                gutter: parseFloat( self.options.itemsGap ) || 0,
                rowHeight: parseFloat( self.options.justifiedRowHeight ) || 200,
                rowHeightTolerance: parseFloat( self.options.justifiedRowHeightTolerance ) || 0,
                itemSelector: '.vp-portfolio__item-wrap',
                imageSelector: '.vp-portfolio__item-img img',
            };

            self.emitEvent( 'beforeInitFjGallery', [ initOptions, additional ] );

            self.$items_wrap.fjGallery( initOptions, additional );

            self.emitEvent( 'initFjGallery', [ initOptions, additional ] );
        }
    };

    /**
     * Destroy fjGallery plugin
     */
    VP.prototype.destroyFjGallery = function() {
        const self = this;
        const fjGallery = self.$items_wrap.data( 'fjGallery' );

        if ( fjGallery ) {
            self.$items_wrap.fjGallery( 'destroy' );

            self.emitEvent( 'destroyFjGallery' );
        }
    };
} );

// Add Items.
$( document ).on( 'addItems.vpf', ( event, self, $items, removeExisting ) => {
    if ( 'vpf' !== event.namespace ) {
        return;
    }

    const fjGallery = self.$items_wrap.data( 'fjGallery' );

    if ( ! fjGallery ) {
        return;
    }

    if ( removeExisting ) {
        self.destroyFjGallery();
        self.$items_wrap.find( '.vp-portfolio__item-wrap' ).remove();
        self.$items_wrap.prepend( $items );
        self.initFjGallery();
    } else {
        self.$items_wrap.append( $items );
        self.initFjGallery( 'appendImages', $items );
    }
} );

// Init.
$( document ).on( 'init.vpf', ( event, self ) => {
    if ( 'vpf' !== event.namespace ) {
        return;
    }

    self.initFjGallery();
} );

// Images Loaded.
$( document ).on( 'imagesLoaded.vpf', ( event, self ) => {
    if ( 'vpf' !== event.namespace ) {
        return;
    }

    // sometimes on iOs images failed to calculate positions, so we need this imagesLoaded event.
    // related issue: https://github.com/nk-o/visual-portfolio/issues/55
    self.initFjGallery();
} );

// Destroy.
$( document ).on( 'destroy.vpf', ( event, self ) => {
    if ( 'vpf' !== event.namespace ) {
        return;
    }

    self.destroyFjGallery();
} );
