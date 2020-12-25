<?php
/**
 * Class for Elementor
 *
 * @package @@plugin_name/elementor
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Class Visual_Portfolio_3rd_Elementor
 */
class Visual_Portfolio_3rd_Elementor {
    /**
     * Visual_Portfolio_3rd_Elementor constructor.
     */
    public function __construct() {
        add_action( 'elementor/widgets/widgets_registered', array( $this, 'widgets_registered' ) );
    }

    /**
     * Register widget
     */
    public function widgets_registered() {
        require_once visual_portfolio()->plugin_path . 'classes/3rd/plugins/class-elementor-widget.php';

        \Elementor\Plugin::instance()->widgets_manager->register_widget_type( new Visual_Portfolio_3rd_Elementor_Widget() );
    }
}

new Visual_Portfolio_3rd_Elementor();
