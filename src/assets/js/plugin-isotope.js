/*
 * Visual Portfolio plugin Isotope extension.
 */
import { debounce } from 'throttle-debounce';

const $ = window.jQuery;
const $doc = $( document );

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

        if ( self.$items_wrap.isotope && ( 'tiles' === self.options.layout || 'masonry' === self.options.layout || 'grid' === self.options.layout ) ) {
            const initOptions = options || {
                itemSelector: '.vp-portfolio__item-wrap',
                layoutMode: 'grid' === self.options.layout ? 'fitRows' : 'masonry',
                // masonry: {
                //     horizontalOrder: true
                // },
                transitionDuration: '0.3s',
                percentPosition: true,
            };

            self.emitEvent( 'beforeInitIsotope', [ options ] );

            self.$items_wrap.isotope( initOptions );

            self.emitEvent( 'initIsotope', [ options ] );
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

// WPBakery Page Builder fullwidth row fix.
$doc.on( 'vc-full-width-row', debounce( 150, ( event, el ) => {
    $( el ).find( '.vp-portfolio' ).each( function() {
        if ( ! this.vpf || ! this.vpf.initIsotope ) {
            return;
        }

        const isotope = this.vpf.$items_wrap.data( 'isotope' );

        if ( isotope ) {
            this.vpf.initIsotope( 'layout' );
        }
    } );
} ) );
