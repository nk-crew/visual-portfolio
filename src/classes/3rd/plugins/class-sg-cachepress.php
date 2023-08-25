<?php
/**
 * SiteGround Optimizer Plugin.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Class Visual_Portfolio_3rd_SG_Cachepress
 */
class Visual_Portfolio_3rd_SG_Cachepress {
    /**
     * Visual_Portfolio_3rd_SG_Cachepress constructor.
     */
    public function __construct() {
        if ( ! class_exists( '\SiteGround_Optimizer\Options\Options' ) || ! \SiteGround_Optimizer\Options\Options::is_enabled( 'siteground_optimizer_lazyload_images' ) ) {
            return;
        }

        // Disable our lazyload if SiteGround Optimizer lazyload used.
        add_filter( 'vpf_images_lazyload', '__return_false' );
        add_action( 'wp_enqueue_scripts', array( $this, 'wp_enqueue_scripts' ), 20 );
    }

    /**
     * SG lazy loading breaks our scripts which calculate size of the images,
     * we need to resolve it in a hacky way by changing src placeholder.
     */
    public function wp_enqueue_scripts() {
        $wp_scripts    = wp_scripts();
        $sg_ll_handler = 'siteground-optimizer-lazy-sizes-js';

        if ( ! isset( $wp_scripts->registered[ $sg_ll_handler ] ) ) {
            return;
        }

        $wp_scripts->registered[ $sg_ll_handler ]->deps[] = 'jquery';

        wp_add_inline_script(
            $sg_ll_handler,
            '(function($){
                if ( !$ ) {
                    return;
                }

                function maybeFixSGSrc( $images ) {
                    $images.find( "img[src=\"data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7\"]" ).each( function() {
                        var $img = $( this );
                        var width = $img.attr( "width" );
                        var height = $img.attr( "height" );

                        if ( width && height ) {
                            var newSrc = "<svg width=\"" + width + "\" height=\"" + height + "\" viewBox=\"0 0 " + width + " " + height + "\" fill=\"none\" xmlns=\"http://www.w3.org/2000/svg\"></svg>";

                            newSrc = newSrc
                                .replace( /</g, "%3c" )
                                .replace( />/g, "%3e" )
                                .replace( /#/g, "%23" )
                                .replace( /"/g, "\'" );

                            $img.attr( "src", "data:image/svg+xml;utf8," + newSrc );
                        }
                    } );
                }

                // Fix starter images.
                maybeFixSGSrc( $( ".vp-portfolio__items" ) );

                // Fix AJAX loaded images.
                $( document ).on( "addItems.vpf", function ( event, self, $items, removeExisting ) {
                    if ( "vpf" !== event.namespace ) {
                        return;
                    }

                    maybeFixSGSrc( $items );
                } );
            }(window.jQuery));',
            'before'
        );
    }
}

new Visual_Portfolio_3rd_SG_Cachepress();
