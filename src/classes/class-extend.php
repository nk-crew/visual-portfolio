<?php
/**
 * Extensions Support
 *
 * @package @@plugin_name
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Class Visual_Portfolio_Extend
 */
class Visual_Portfolio_Extend {
    /**
     * Visual_Portfolio_Extend constructor.
     */
    public function __construct() {
    }

    /**
     * Additional Layouts.
     *
     * @return array
     */
    public static function layouts() {
        /*
         * Example:
            array(
                'new_layout' => array(
                    'title' => esc_html__( 'New Layout', 'text_domain' ),
                    'controls' => array(
                        ... controls ...
                    ),
                ),
            )
         */
        return apply_filters( 'vpf_extend_layouts', array() );
    }

    /**
     * Additional Items Styles.
     *
     * @return array
     */
    public static function items_styles() {
        /*
         * Example:
            array(
                'new_items_style' => array(
                    'title' => esc_html__( 'New Items Style', '@@text_domain' ),
                    'builtin_controls' => array(
                        'show_title' => true,
                        'show_categories' => true,
                        'show_date' => true,
                        'show_excerpt' => true,
                        'show_icons' => false,
                        'align' => true,
                    ),
                    'controls' => array(
                        ... controls ...
                    ),
                ),
            )
         */
        return apply_filters( 'vpf_extend_items_styles', array() );
    }

    /**
     * Additional Filters.
     *
     * @return array
     */
    public static function filters() {
        /*
         * Example:
            array(
                'new_filter' => array(
                    'title' => esc_html__( 'New Filter', '@@text_domain' ),
                    'controls' => array(
                        ... controls ...
                    ),
                ),
            )
         */
        return apply_filters( 'vpf_extend_filters', array() );
    }

    /**
     * Portfolio Data Attributes.
     *
     * @param array $attrs - attributes.
     * @param array $options - options.
     * @return array
     */
    public static function portfolio_attrs( $attrs, $options ) {
        /*
         * Example:
            array(
                'data-vp-my-attribute' => 'data',
            )
         */
        return apply_filters( 'vpf_extend_portfolio_data_attributes', $attrs, $options );
    }

    /**
     * Portfolio Class.
     *
     * @param string $class - class.
     * @param array  $options - options.
     * @return array
     */
    public static function portfolio_class( $class, $options ) {
        return apply_filters( 'vpf_extend_portfolio_class', $class, $options );
    }
}
