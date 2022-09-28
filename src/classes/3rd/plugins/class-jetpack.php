<?php
/**
 * Jetpack Plugin.
 *
 * @package @@plugin_name
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Class Visual_Portfolio_3rd_Jetpack
 */
class Visual_Portfolio_3rd_Jetpack {
    /**
     * Visual_Portfolio_3rd_Jetpack constructor.
     */
    public function __construct() {
        // Fix conflict with lazy loading.
        add_filter( 'jetpack_lazy_images_skip_image_with_attributes', array( $this, 'jetpack_lazy_images_skip_image_with_attributes' ), 15, 2 );

        add_action( 'wp_enqueue_scripts', array( $this, 'wp_enqueue_scripts' ), 20 );
    }

    /**
     * We need to init the Jetpack lazy loading manually after Visual Portfolio AJAX completed.
     */
    public function wp_enqueue_scripts() {
        $wp_scripts         = wp_scripts();
        $jetpack_ll_handler = 'jetpack-lazy-images';

        if ( ! isset( $wp_scripts->registered[ $jetpack_ll_handler ] ) ) {
            return;
        }

        $wp_scripts->registered[ $jetpack_ll_handler ]->deps[] = 'jquery';

        wp_add_inline_script(
            $jetpack_ll_handler,
            '(function($){
                if ( !$ ) {
                    return;
                }

                var jetpackLazyImagesLoadEvent;
                try {
                    jetpackLazyImagesLoadEvent = new Event( "jetpack-lazy-images-load", {
                        bubbles: true,
                        cancelable: true
                    } );
                } catch ( e ) {
                    jetpackLazyImagesLoadEvent = document.createEvent( "Event" )
                    jetpackLazyImagesLoadEvent.initEvent( "jetpack-lazy-images-load", true, true );
                }

                // Fix AJAX loaded images.
                $( document ).on( "loadedNewItems.vpf", function ( event, self, $items, removeExisting ) {
                    if ( "vpf" !== event.namespace ) {
                        return;
                    }

                    $("body").get( 0 ).dispatchEvent( jetpackLazyImagesLoadEvent );
                } );
            }(window.jQuery));',
            'before'
        );
    }

    /**
     * Skip Jetpack lazy loading when data-src attribute added to image.
     *
     * @param boolean $return     skip lazy Jetpack.
     * @param array   $attributes image attributes.
     *
     * @return boolean
     */
    public function jetpack_lazy_images_skip_image_with_attributes( $return, $attributes ) {
        return isset( $attributes['data-src'] );
    }
}

new Visual_Portfolio_3rd_Jetpack();
