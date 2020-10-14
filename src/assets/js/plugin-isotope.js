/*
 * Visual Portfolio plugin Isotope extension.
 */
import {
    throttle,
    debounce,
} from 'throttle-debounce';
import rafSchd from 'raf-schd';

const $ = window.jQuery;
const $wnd = $( window );
const $doc = $( document );

const SUPPORTED_LAYOUTS = [ 'tiles', 'masonry', 'grid' ];

// Extend VP class.
$doc.on( 'extendClass.vpf', ( event, VP ) => {
    if ( 'vpf' !== event.namespace ) {
        return;
    }

    /**
     * Init Isotope
     * TODO: Check for MixItUp plugin
     *
     * @param {object} options isotope options
     */
    VP.prototype.initIsotope = function( options ) {
        const self = this;

        if ( self.$items_wrap.isotope && SUPPORTED_LAYOUTS.includes( self.options.layout ) ) {
            const isRtl = 'rtl' === getComputedStyle( self.$items_wrap[ 0 ] ).direction;

            const initOptions = options || {
                itemSelector: '.vp-portfolio__item-wrap',
                layoutMode: 'masonry',
                // masonry: {
                //     horizontalOrder: true
                // },
                transitionDuration: '0.3s',
                percentPosition: true,
                originLeft: ! isRtl,

                // See `initEvents.vpf` event why we need this option disabled.
                resize: false,
            };

            self.emitEvent( 'beforeInitIsotope', [ initOptions ] );

            self.$items_wrap.isotope( initOptions );

            self.emitEvent( 'initIsotope', [ initOptions ] );
        }
    };

    /**
     * Destroy Isotope
     */
    VP.prototype.destroyIsotope = function() {
        const self = this;
        const isotope = self.$items_wrap.data( 'isotope' );

        if ( isotope ) {
            self.$items_wrap.isotope( 'destroy' );

            self.emitEvent( 'destroyIsotope' );
        }
    };
} );

// Add Items.
$doc.on( 'addItems.vpf', ( event, self, $items, removeExisting ) => {
    if ( 'vpf' !== event.namespace ) {
        return;
    }

    const isotope = self.$items_wrap.data( 'isotope' );

    if ( ! isotope ) {
        return;
    }

    if ( removeExisting ) {
        const $existing = self.$items_wrap.find( '.vp-portfolio__item-wrap' );
        self.$items_wrap.isotope( 'remove', $existing );

        // we need to prepend items when remove existing just because Tiles layout have troubles with appending and removing items
        self.$items_wrap.prepend( $items )
            .isotope( 'prepended', $items );
    } else {
        self.$items_wrap.append( $items )
            .isotope( 'appended', $items );
    }

    // idk why, but with timeout isotope recalculate all items fine.
    setTimeout( () => {
        self.initIsotope( 'layout' );
    }, 0 );
} );

// Remove Items.
$doc.on( 'removeItems.vpf', ( event, self, $items ) => {
    if ( 'vpf' !== event.namespace ) {
        return;
    }

    const isotope = self.$items_wrap.data( 'isotope' );

    if ( ! isotope ) {
        return;
    }

    self.$items_wrap.isotope( 'remove', $items );
} );

// Init.
$doc.on( 'init.vpf', ( event, self ) => {
    if ( 'vpf' !== event.namespace ) {
        return;
    }

    self.initIsotope();
} );

// Images Loaded.
$doc.on( 'imagesLoaded.vpf', ( event, self ) => {
    if ( 'vpf' !== event.namespace ) {
        return;
    }

    // sometimes on iOs images failed to calculate positions, so we need this imagesLoaded event.
    // related issue: https://github.com/nk-o/visual-portfolio/issues/55
    self.initIsotope( 'layout' );
} );

// Destroy.
$doc.on( 'destroy.vpf', ( event, self ) => {
    if ( 'vpf' !== event.namespace ) {
        return;
    }

    self.destroyIsotope();
} );

// Init events.
$doc.on( 'initEvents.vpf', ( event, self ) => {
    if ( 'vpf' !== event.namespace ) {
        return;
    }

    // We need to resize isotope manually, since the native relayout
    // is not working properly, when container size is not changed
    // but items sizes are changed in CSS. For some reason Isotope don't relayout it.
    if ( self.$items_wrap.isotope && SUPPORTED_LAYOUTS.includes( self.options.layout ) ) {
        const evp = `.vpf-uid-${ self.uid }`;

        $wnd.on( `resize${ evp }`, throttle( 100, rafSchd( () => {
            self.$items_wrap.isotope( 'layout' );
        } ) ) );
    }
} );

// Destroy events.
$doc.on( 'destroyEvents.vpf', ( event, self ) => {
    if ( 'vpf' !== event.namespace ) {
        return;
    }

    if ( SUPPORTED_LAYOUTS.includes( self.options.layout ) ) {
        const evp = `.vpf-uid-${ self.uid }`;

        $wnd.off( `resize${ evp }` );
    }
} );

// WPBakery Page Builder fullwidth row fix.
$doc.on( 'vc-full-width-row', debounce( 150, rafSchd( ( event, el ) => {
    $( el ).find( '.vp-portfolio' ).each( function() {
        if ( ! this.vpf || ! this.vpf.initIsotope ) {
            return;
        }

        const isotope = this.vpf.$items_wrap.data( 'isotope' );

        if ( isotope ) {
            this.vpf.initIsotope( 'layout' );
        }
    } );
} ) ) );
