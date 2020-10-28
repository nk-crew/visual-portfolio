/*
 * Visual Portfolio images lazy load.
 */
const {
    jQuery: $,
    objectFitImages,
} = window;

const $doc = $( document );

// enable object-fit
if ( 'undefined' !== typeof objectFitImages ) {
    // ofi and lazysizes conflicted, so we need to run lazysizes
    // first and then run ofi polyfill.
    objectFitImages( '.vp-portfolio img:not(.vp-lazyload)' );

    $doc.on( 'lazybeforeunveil', ( e ) => {
        const $img = $( e.target );

        if ( $img.hasClass( 'vp-lazyload' ) ) {
            $img.one( 'load', () => {
                objectFitImages( $img[ 0 ] );
            } );
        }
    } );
}

// Lazyloaded - remove preloader images placeholder effect.
$doc.on( 'lazybeforeunveil', ( e ) => {
    const $img = $( e.target );

    if ( $img.hasClass( 'vp-lazyload' ) ) {
        $img.closest( '.vp-portfolio__item-img' ).addClass( 'vp-portfolio__item-img-lazyloading' );
        $img.closest( '.vp-portfolio__thumbnail-img' ).addClass( 'vp-portfolio__thumbnail-img-lazyloading' );
    }
} );
$doc.on( 'lazyloaded', ( e ) => {
    const $img = $( e.target );

    if ( $img.hasClass( 'vp-lazyload' ) ) {
        $img.closest( '.vp-portfolio__item-img-lazyloading' ).removeClass( 'vp-portfolio__item-img-lazyloading' );
        $img.closest( '.vp-portfolio__thumbnail-img-lazyloading' ).removeClass( 'vp-portfolio__thumbnail-img-lazyloading' );
    }
} );

// Extend VP class.
$doc.on( 'extendClass.vpf', ( event, VP ) => {
    if ( 'vpf' !== event.namespace ) {
        return;
    }

    /**
     * Prepare image for Lazyload
     *
     * We need to add lazyload class and attributes from global config of lazysizes.
     * This need because some 3rd-party themes/plugins may change it and it will be conflicted with our config.
     * Related topic: https://wordpress.org/support/topic/since-the-last-update-i-cant-see-image-featured-of-posts/#post-10519096.
     */
    VP.prototype.prepareLazyLoad = function() {
        const self = this;
        const config = window.lazySizes && window.lazySizes.cfg ? window.lazySizes.cfg : window.lazySizesConfig;

        if ( config ) {
            const attrsToReplace = {
                'data-src': config.srcAttr,
                'data-sizes': config.sizesAttr,
                'data-srcset': config.srcsetAttr,
            };

            self.$items_wrap.add( self.$slider_thumbnails_wrap )
                .find( `img.vp-lazyload:not(.${ config.lazyClass }), picture.vp-lazyload img:not(.${ config.lazyClass })` ).each( function() {
                    const $item = $( this );

                    Object.keys( attrsToReplace ).forEach( ( attr ) => {
                        if ( attrsToReplace[ attr ] && attr !== attrsToReplace[ attr ] && $item.attr( attr ) ) {
                            $item.attr( attrsToReplace[ attr ], $item.attr( attr ) );
                            $item.removeAttr( attr );
                        }
                    } );

                    // We need to add our class to support 3rd-party plugins, that adds
                    // WebP support using <picture> tags (for example Imagify).
                    $item.addClass( `vp-lazyload ${ config.lazyClass }` );
                } );
        }
    };
} );

// Init lazy loading on start and after new items loaded.
$doc.on( 'init.vpf endLoadingNewItems.vpf', ( event, self ) => {
    if ( 'vpf' !== event.namespace ) {
        return;
    }

    self.prepareLazyLoad();
} );
