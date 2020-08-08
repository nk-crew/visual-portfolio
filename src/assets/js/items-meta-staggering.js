/*
 * Visual Portfolio items meta staggering animation extension.
 */
const {
    jQuery: $,
} = window;

// Extend VP class.
$( document ).on( 'extendClass.vpf', ( event, VP ) => {
    if ( 'vpf' !== event.namespace ) {
        return;
    }

    /**
     * Init items meta staggering
     */
    VP.prototype.initItemsMetaStaggering = function() {
        const self = this;

        self.emitEvent( 'beforeInitItemsMetaStaggering' );

        self.$items_wrap.find( '.vp-portfolio__item-meta' ).each( function() {
            $( this ).children().each( function( index ) {
                this.style.setProperty( '--vp-items--meta-staggering__index', index + 1 );
            } );
        } );

        self.emitEvent( 'initItemsMetaStaggering' );
    };

    /**
     * Destroy items meta staggering
     */
    VP.prototype.destroyItemsMetaStaggering = function() {
        const self = this;

        self.$items_wrap.find( '.vp-portfolio__item-meta' ).each( function() {
            $( this ).children().each( function() {
                this.style.removeProperty( '--vp-items--meta-staggering__index' );
            } );
        } );

        self.emitEvent( 'destroyItemsMetaStaggering' );
    };
} );

// Add Items.
$( document ).on( 'addItems.vpf', ( event, self, $items, removeExisting ) => {
    if ( 'vpf' !== event.namespace ) {
        return;
    }

    if ( removeExisting ) {
        self.destroyItemsMetaStaggering();
    }

    self.initItemsMetaStaggering();
} );

// Init.
$( document ).on( 'init.vpf', ( event, self ) => {
    if ( 'vpf' !== event.namespace ) {
        return;
    }

    self.initItemsMetaStaggering();
} );

// Destroy.
$( document ).on( 'destroy.vpf', ( event, self ) => {
    if ( 'vpf' !== event.namespace ) {
        return;
    }

    self.destroyItemsMetaStaggering();
} );
