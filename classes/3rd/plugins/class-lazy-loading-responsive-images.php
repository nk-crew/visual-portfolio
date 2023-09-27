<?php
/**
 * Lazy Loader Plugin.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Class Visual_Portfolio_3rd_Lazy_Loader
 */
class Visual_Portfolio_3rd_Lazy_Loader {
    /**
     * Visual_Portfolio_3rd_Lazy_Loader constructor.
     */
    public function __construct() {
        if ( ! class_exists( 'FlorianBrinkmann\LazyLoadResponsiveImages\Plugin' ) ) {
            return;
        }

        // Disable our lazyload if Lazy Loader plugin installed.
        add_filter( 'vpf_images_lazyload', '__return_false' );
        add_filter( 'vpf_enqueue_plugin_lazysizes', '__return_false' );
    }
}

new Visual_Portfolio_3rd_Lazy_Loader();
