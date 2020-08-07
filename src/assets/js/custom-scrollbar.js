/*
 * Visual Portfolio custom scrollbar extension.
 */
const {
    jQuery: $,
    SimpleBar,
} = window;

// Don't run on Mac and mobile devices.
const allowScrollbar = ! /Mac|Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test( navigator.userAgent );

if ( allowScrollbar && 'undefined' !== typeof SimpleBar ) {
    // Extend VP class.
    $( document ).on( 'extendClass.vpf', ( event, VP ) => {
        if ( 'vpf' !== event.namespace ) {
            return;
        }

        /**
         * Init Simplebar plugin
         */
        VP.prototype.initCustomScrollbar = function() {
            const self = this;

            self.emitEvent( 'beforeInitCustomScrollbar' );

            self.$items_wrap.find( '.vp-portfolio__custom-scrollbar' ).each( function() {
                // eslint-disable-next-line no-new
                new SimpleBar( this );
            } );

            self.emitEvent( 'initCustomScrollbar' );
        };

        /**
         * Destroy Simplebar plugin
         */
        VP.prototype.destroyCustomScrollbar = function() {
            const self = this;

            self.$items_wrap.find( '[data-simplebar="init"].vp-portfolio__custom-scrollbar' ).each( function() {
                const instance = SimpleBar.instances.get( this );

                if ( instance ) {
                    instance.unMount();
                }
            } );

            self.emitEvent( 'destroyCustomScrollbar' );
        };
    } );

    // Add Items.
    $( document ).on( 'addItems.vpf', ( event, self, $items, removeExisting ) => {
        if ( 'vpf' !== event.namespace ) {
            return;
        }

        if ( removeExisting ) {
            self.destroyCustomScrollbar();
        }

        self.initCustomScrollbar();
    } );

    // Init.
    $( document ).on( 'init.vpf', ( event, self ) => {
        if ( 'vpf' !== event.namespace ) {
            return;
        }

        self.initCustomScrollbar();
    } );

    // Destroy.
    $( document ).on( 'destroy.vpf', ( event, self ) => {
        if ( 'vpf' !== event.namespace ) {
            return;
        }

        self.destroyCustomScrollbar();
    } );
}
