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
        // phpcs:ignore
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
     * Extend Specific Layout Controls.
     *
     * @param string $name - layout name.
     * @param array  $controls - controls array.
     * @return array
     */
    public static function layout_controls( $name, $controls ) {
        // phpcs:ignore
        /*
         * Example:
            array(
                ... controls ...
            )
         */
        return apply_filters( 'vpf_extend_layout_' . $name . '_controls', $controls );
    }

    /**
     * Additional Tiles.
     *
     * @return array
     */
    public static function tiles() {
        // phpcs:ignore
        /*
         * Example:
            array(
                array(
                    'url' => 'assets/images/tiles-1-1.svg',
                    'value' => '1|1,0.5|',
                ),
                array(
                    'url' => 'assets/images/tiles-2-1.svg',
                    'value' => '2|1,1|',
                ),
            )
         */
        return apply_filters( 'vpf_extend_tiles', array() );
    }

    /**
     * Additional Items Styles.
     *
     * @return array
     */
    public static function items_styles() {
        // phpcs:ignore
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
     * Extend Specific Item Style Controls.
     *
     * @param string $name - item style name.
     * @param array  $controls - controls array.
     * @return array
     */
    public static function item_style_controls( $name, $controls ) {
        // phpcs:ignore
        /*
         * Example:
            array(
                ... controls ...
            )
         */
        return apply_filters( 'vpf_extend_item_style_' . $name . '_controls', $controls );
    }

    /**
     * Additional Filters.
     *
     * @return array
     */
    public static function filters() {
        // phpcs:ignore
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
     * Extend Specific Filter Controls.
     *
     * @param string $name - filter name.
     * @param array  $controls - controls array.
     * @return array
     */
    public static function filter_controls( $name, $controls ) {
        // phpcs:ignore
        /*
         * Example:
            array(
                ... controls ...
            )
         */
        return apply_filters( 'vpf_extend_filter_' . $name . '_controls', $controls );
    }

    /**
     * Additional Sort.
     *
     * @return array
     */
    public static function sort() {
        // phpcs:ignore
        /*
         * Example:
            array(
                'new_sort' => array(
                    'title' => esc_html__( 'New Sort', '@@text_domain' ),
                    'controls' => array(
                        ... controls ...
                    ),
                ),
            )
         */
        return apply_filters( 'vpf_extend_sort', array() );
    }

    /**
     * Extend Specific Sort Controls.
     *
     * @param string $name - sort name.
     * @param array  $controls - controls array.
     * @return array
     */
    public static function sort_controls( $name, $controls ) {
        // phpcs:ignore
        /*
         * Example:
            array(
                ... controls ...
            )
         */
        return apply_filters( 'vpf_extend_sort_' . $name . '_controls', $controls );
    }

    /**
     * Additional Pagination.
     *
     * @return array
     */
    public static function pagination() {
        // phpcs:ignore
        /*
         * Example:
            array(
                'new_pagination' => array(
                    'title' => esc_html__( 'New Pagination', '@@text_domain' ),
                    'controls' => array(
                        ... controls ...
                    ),
                ),
            )
         */
        return apply_filters( 'vpf_extend_pagination', array() );
    }

    /**
     * Extend Specific Pagination Controls.
     *
     * @param string $name - filter name.
     * @param array  $controls - controls array.
     * @return array
     */
    public static function pagination_controls( $name, $controls ) {
        // phpcs:ignore
        /*
         * Example:
            array(
                ... controls ...
            )
         */
        return apply_filters( 'vpf_extend_pagination_' . $name . '_controls', $controls );
    }

    /**
     * Portfolio Data Attributes.
     *
     * @param array $attrs - attributes.
     * @param array $options - options.
     * @return array
     */
    public static function portfolio_attrs( $attrs, $options ) {
        // phpcs:ignore
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

    /**
     * Additional Image Controls.
     *
     * @param array  $controls - list of image controls.
     * @param string $name - unique option name.
     * @return array
     */
    public static function image_controls( $controls, $name ) {
        // phpcs:ignore
        /*
         * Example:
            array(
                'title' => array(
                    'type'  => 'text',
                    'label' => esc_html__( 'Title', '@@text_domain' ),
                    'name'  => $name . '_additional_title',
                ),
                'description' => array(
                    'type'  => 'textarea',
                    'label' => esc_html__( 'Description', '@@text_domain' ),
                    'name'  => $name . '_additional_description',
                ),
            )
         */
        return apply_filters( 'vpf_extend_image_controls', $controls, $name );
    }

    /**
     * Extend Query Args.
     *
     * @param array  $args - query arguments.
     * @param string $options - portfolio options.
     * @param string $id - portfolio id.
     * @return array
     */
    public static function query_args( $args, $options, $id ) {
        return apply_filters( 'vpf_extend_query_args', $args, $options, $id );
    }

    /**
     * Extend Filter Items.
     *
     * @param array  $items - list of all filter items.
     * @param string $options - portfolio options.
     * @return array
     */
    public static function filter_items( $items, $options ) {
        // phpcs:ignore
        /*
         * Example:
            array(
                array(
                    'filter'      => '*',
                    'label'       => $options['vp_filter_text_all'],
                    'description' => false,
                    'count'       => false,
                    'active'      => true,
                    'url'         => Visual_Portfolio_Get::get_pagenum_link(
                        array(
                            'vp_filter' => '',
                            'vp_page' => 1,
                        )
                    ),
                    'class'       => 'vp-filter__item',
                ),
            )
         */
        return apply_filters( 'vpf_extend_filter_items', $items, $options );
    }

    /**
     * Extend Sort Items.
     *
     * @param array  $items - list of all sort items.
     * @param string $options - portfolio options.
     * @return array
     */
    public static function sort_items( $items, $options ) {
        // phpcs:ignore
        /*
         * Example:
            array(
                ''           => esc_html__( 'Default sorting', '@@text_domain' ),
                'date_desc'  => esc_html__( 'Sort by date (newest)', '@@text_domain' ),
                'date'       => esc_html__( 'Sort by date (oldest)', '@@text_domain' ),
                'title'      => esc_html__( 'Sort by title (A-Z)', '@@text_domain' ),
                'title_desc' => esc_html__( 'Sort by title (Z-A)', '@@text_domain' ),
            )
         */
        return apply_filters( 'vpf_extend_sort_items', $items, $options );
    }
}
