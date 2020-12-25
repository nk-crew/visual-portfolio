<?php
/**
 * Avada Theme.
 *
 * @package @@plugin_name
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Class Visual_Portfolio_3rd_Avada
 */
class Visual_Portfolio_3rd_Avada {
    /**
     * Visual_Portfolio_3rd_Avada constructor.
     */
    public function __construct() {
        if ( is_admin() ) {
            return;
        }

        $current_theme = wp_get_theme();
        $avada_options = get_option( 'fusion_options' );

        if ( 'Avada' !== $current_theme->get( 'Name' ) || ! isset( $avada_options['lazy_load'] ) || 'avada' !== $avada_options['lazy_load'] ) {
            return;
        }

        // Disable our lazyload if Avada's lazyload used.
        add_filter( 'vpf_images_lazyload', '__return_false' );
    }
}

new Visual_Portfolio_3rd_Avada();
