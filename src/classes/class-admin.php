<?php
/**
 * Admin
 *
 * @package @@plugin_name/admin
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Class Visual_Portfolio_Admin
 */
class Visual_Portfolio_Admin {
    /**
     * Visual_Portfolio_Admin constructor.
     */
    public function __construct() {
        add_action( 'admin_enqueue_scripts', array( $this, 'admin_enqueue_scripts' ) );
        add_action( 'enqueue_block_editor_assets', array( $this, 'saved_layouts_editor_enqueue_scripts' ) );

        // register controls.
        add_action( 'init', array( $this, 'register_controls' ), 9 );
        add_filter( 'vpf_extend_layouts', array( $this, 'add_default_layouts' ), 9 );
        add_filter( 'vpf_extend_items_styles', array( $this, 'add_default_items_styles' ), 9 );

        // ajax actions.
        add_action( 'wp_ajax_vp_find_oembed', array( $this, 'ajax_find_oembed' ) );

        add_action( 'vpf_get_source_social_stream_registered_controls', array( __class__, 'social_stream_information' ) );
    }

    /**
     * Enqueue styles and scripts
     */
    public function admin_enqueue_scripts() {
        $data_init = array(
            'nonce' => wp_create_nonce( 'vp-ajax-nonce' ),
        );

        wp_enqueue_script( '@@plugin_name-admin', visual_portfolio()->plugin_url . 'assets/admin/js/script.min.js', array( 'jquery', 'wp-data' ), '@@plugin_version', true );
        wp_enqueue_style( '@@plugin_name-admin', visual_portfolio()->plugin_url . 'assets/admin/css/style.min.css', '', '@@plugin_version' );
        wp_localize_script( '@@plugin_name-admin', 'VPAdminVariables', $data_init );
    }

    /**
     * Enqueue styles and scripts on saved layouts editor.
     */
    public function saved_layouts_editor_enqueue_scripts() {
        $data_init = array(
            'nonce' => wp_create_nonce( 'vp-ajax-nonce' ),
        );

        if ( 'vp_lists' === get_post_type() ) {
            wp_enqueue_script( '@@plugin_name-saved-layouts', visual_portfolio()->plugin_url . 'gutenberg/layouts-editor.min.js', array( 'jquery' ), '@@plugin_version', true );
            wp_enqueue_style( '@@plugin_name-saved-layouts', visual_portfolio()->plugin_url . 'gutenberg/layouts-editor.min.css', '', '@@plugin_version' );

            $block_data = Visual_Portfolio_Get::get_options( array( 'id' => get_the_ID() ) );

            // remove id from block data, as we don't need this in our layouts editor.
            if ( isset( $block_data['id'] ) ) {
                unset( $block_data['id'] );
            }

            wp_localize_script(
                '@@plugin_name-saved-layouts',
                'VPSavedLayoutVariables',
                array(
                    'nonce' => $data_init['nonce'],
                    'data'  => $block_data,
                )
            );
        }
    }

    /**
     * Add default layouts.
     *
     * @param array $layouts - layouts array.
     *
     * @return array
     */
    public function add_default_layouts( $layouts ) {
        return array_merge(
            array(
                // Tiles.
                'tiles' => array(
                    'title'    => esc_html__( 'Tiles', '@@text_domain' ),
                    'icon'     => '<svg width="70" height="70" viewBox="0 0 70 70" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1.5" y="1.5" width="28" height="28" rx="2.5" stroke="currentColor" stroke-width="3"/><rect x="40.5" y="1.5" width="28" height="28" rx="2.5" stroke="currentColor" stroke-width="3"/><rect x="40.5" y="40.5001" width="28" height="28" rx="2.5" stroke="currentColor" stroke-width="3"/><rect x="1.5" y="40.5001" width="28" height="28" rx="2.5" stroke="currentColor" stroke-width="3"/></svg>',
                    'controls' => array(
                        /**
                         * Tile type:
                         * first parameter - is columns number
                         * the next is item sizes
                         *
                         * Example:
                         * 3|1,0.5|2,0.25|
                         *    3 columns in row
                         *    First item 100% width and 50% height
                         *    Second item 200% width and 25% height
                         */
                        array(
                            'type'        => 'tiles_selector',
                            'label'       => esc_html__( 'Tiles Preview', '@@text_domain' ),
                            'name'        => 'type',
                            'default'     => '3|1,1|',
                            'options'     => array_merge(
                                array(
                                    array(
                                        'value' => '1|1,0.5|',
                                    ),
                                    array(
                                        'value' => '2|1,1|',
                                    ),
                                    array(
                                        'value' => '2|1,0.8|',
                                    ),
                                    array(
                                        'value' => '2|1,1.34|',
                                    ),
                                    array(
                                        'value' => '2|1,1.2|1,1.2|1,0.67|1,0.67|',
                                    ),
                                    array(
                                        'value' => '2|1,1.2|1,0.67|1,1.2|1,0.67|',
                                    ),
                                    array(
                                        'value' => '2|1,0.67|1,1|1,1|1,1|1,1|1,0.67|',
                                    ),
                                    array(
                                        'value' => '3|1,1|',
                                    ),
                                    array(
                                        'value' => '3|1,0.8|',
                                    ),
                                    array(
                                        'value' => '3|1,1.3|',
                                    ),
                                    array(
                                        'value' => '3|1,1|1,1|1,1|1,1.3|1,1.3|1,1.3|',
                                    ),
                                    array(
                                        'value' => '3|1,1|1,1|1,2|1,1|1,1|1,1|1,1|1,1|',
                                    ),
                                    array(
                                        'value' => '3|1,2|1,1|1,1|1,1|1,1|1,1|1,1|1,1|',
                                    ),
                                    array(
                                        'value' => '3|1,1|1,2|1,1|1,1|1,1|1,1|1,1|1,1|',
                                    ),
                                    array(
                                        'value' => '3|1,1|1,2|1,1|1,1|1,1|1,1|2,0.5|',
                                    ),
                                    array(
                                        'value' => '3|1,0.8|1,1.6|1,0.8|1,0.8|1,1.6|1,0.8|1,0.8|1,0.8|1,0.8|1,0.8|',
                                    ),
                                    array(
                                        'value' => '3|1,0.8|1,1.6|1,0.8|1,0.8|1,1.6|1,1.6|1,0.8|1,0.8|1,0.8|',
                                    ),
                                    array(
                                        'value' => '3|1,0.8|1,0.8|1,1.6|1,0.8|1,0.8|1,1.6|1,1.6|1,0.8|1,0.8|',
                                    ),
                                    array(
                                        'value' => '3|1,0.8|1,0.8|1,1.6|1,0.8|1,0.8|1,0.8|1,1.6|1,1.6|1,0.8|',
                                    ),
                                    array(
                                        'value' => '3|1,1|2,1|1,1|2,0.5|1,1|',
                                    ),
                                    array(
                                        'value' => '3|1,1|2,1|1,1|1,1|1,1|1,1|2,0.5|1,1|',
                                    ),
                                    array(
                                        'value' => '3|1,2|2,0.5|1,1|1,2|2,0.5|',
                                    ),
                                    array(
                                        'value' => '4|1,1|',
                                    ),
                                    array(
                                        'value' => '4|1,1|1,1.34|1,1|1,1.34|1,1.34|1,1.34|1,1|1,1|',
                                    ),
                                    array(
                                        'value' => '4|1,0.8|1,1|1,0.8|1,1|1,1|1,1|1,0.8|1,0.8|',
                                    ),
                                    array(
                                        'value' => '4|1,1|1,1|2,1|1,1|1,1|2,1|1,1|1,1|1,1|1,1|',
                                    ),
                                    array(
                                        'value' => '4|2,1|2,0.5|2,0.5|2,0.5|2,1|2,0.5|',
                                    ),
                                ),
                                Visual_Portfolio_Extend::tiles()
                            ),
                        ),
                    ),
                ),

                // Masonry.
                'masonry' => array(
                    'title'    => esc_html__( 'Masonry', '@@text_domain' ),
                    'icon'     => '<svg width="70" height="70" viewBox="0 0 70 70" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1.5" y="1.5" width="28" height="21" rx="2.5" stroke="currentColor" stroke-width="3"/><rect x="40.5001" y="47.5" width="28" height="21" rx="2.5" stroke="currentColor" stroke-width="3"/><rect x="40.5001" y="1.5" width="28" height="35" rx="2.5" stroke="currentColor" stroke-width="3"/><rect x="1.5" y="33.5" width="28" height="35" rx="2.5" stroke="currentColor" stroke-width="3"/></svg>',
                    'controls' => array(
                        array(
                            'type'    => 'range',
                            'label'   => esc_html__( 'Columns', '@@text_domain' ),
                            'name'    => 'columns',
                            'min'     => 1,
                            'max'     => 5,
                            'default' => 3,
                        ),
                    ),
                ),

                // Grid.
                'grid' => array(
                    'title'    => esc_html__( 'Grid', '@@text_domain' ),
                    'icon'     => '<svg width="70" height="70" viewBox="0 0 70 70" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1.5" y="1.5" width="28" height="25" rx="2.5" stroke="currentColor" stroke-width="3"/><rect x="40.5001" y="45.5" width="28" height="23" rx="2.5" stroke="currentColor" stroke-width="3"/><rect x="40.5001" y="1.5" width="28" height="34" rx="2.5" stroke="currentColor" stroke-width="3"/><rect x="1.5" y="45.5" width="28" height="23" rx="2.5" stroke="currentColor" stroke-width="3"/></svg>',
                    'controls' => array(
                        array(
                            'type'    => 'range',
                            'label'   => esc_html__( 'Columns', '@@text_domain' ),
                            'name'    => 'columns',
                            'min'     => 1,
                            'max'     => 5,
                            'default' => 3,
                        ),
                    ),
                ),

                // Justified.
                'justified' => array(
                    'title'    => esc_html__( 'Justified', '@@text_domain' ),
                    'icon'     => '<svg width="70" height="70" viewBox="0 0 70 70" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1.5" y="68.5" width="28" height="21" rx="2.5" transform="rotate(-90 1.5 68.5)" stroke="currentColor" stroke-width="3"/><rect x="47.5" y="29.5" width="28" height="21" rx="2.5" transform="rotate(-90 47.5 29.5)" stroke="currentColor" stroke-width="3"/><rect x="1.5" y="29.5" width="28" height="35" rx="2.5" transform="rotate(-90 1.5 29.5)" stroke="currentColor" stroke-width="3"/><rect x="33.5" y="68.5" width="28" height="35" rx="2.5" transform="rotate(-90 33.5 68.5)" stroke="currentColor" stroke-width="3"/></svg>',
                    'controls' => array(
                        array(
                            'type'    => 'range',
                            'label'   => esc_html__( 'Row height', '@@text_domain' ),
                            'name'    => 'row_height',
                            'min'     => 100,
                            'max'     => 1000,
                            'default' => 200,
                        ),
                        array(
                            'type'    => 'range',
                            'label'   => esc_html__( 'Row Height Tolerance', '@@text_domain' ),
                            'name'    => 'row_height_tolerance',
                            'min'     => 0,
                            'max'     => 1,
                            'step'    => 0.05,
                            'default' => 0.25,
                        ),
                    ),
                ),

                // Slider.
                'slider' => array(
                    'title'    => esc_html__( 'Slider', '@@text_domain' ),
                    'icon'     => '<svg width="70" height="70" viewBox="0 0 70 70" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="17.4999" y="56.5" width="43" height="35" rx="2.5" transform="rotate(-90 17.4999 56.5)" stroke="currentColor" stroke-width="3"/><path d="M63 16L63 54C63 54.5523 63.4477 55 64 55L70 55L70 58L64 58C61.7909 58 60 56.2091 60 54L60 16C60 13.7909 61.7909 12 64 12L70 12L70 15L64 15C63.4477 15 63 15.4477 63 16Z" fill="currentColor"/><path d="M7 16L7 54C7 54.5523 6.55228 55 6 55L1.31134e-07 55L0 58L6 58C8.20914 58 10 56.2091 10 54L10 16C10 13.7909 8.20914 12 6 12L1.03375e-07 12L-2.77589e-08 15L6 15C6.55229 15 7 15.4477 7 16Z" fill="currentColor"/></svg>',
                    'controls' => array(
                        array(
                            'type'    => 'select',
                            'label'   => esc_html__( 'Effect', '@@text_domain' ),
                            'name'    => 'effect',
                            'default' => 'slide',
                            'options' => array(
                                'slide'     => esc_html__( 'Slide', '@@text_domain' ),
                                'coverflow' => esc_html__( 'Coverflow', '@@text_domain' ),
                                'fade'      => esc_html__( 'Fade', '@@text_domain' ),
                            ),
                        ),
                        array(
                            'type'    => 'range',
                            'label'   => esc_html__( 'Speed (in Seconds)', '@@text_domain' ),
                            'name'    => 'speed',
                            'min'     => 0,
                            'max'     => 5,
                            'step'    => 0.1,
                            'default' => 0.3,
                        ),
                        array(
                            'type'    => 'range',
                            'label'   => esc_html__( 'Autoplay (in Seconds)', '@@text_domain' ),
                            'name'    => 'autoplay',
                            'min'     => 0,
                            'max'     => 20,
                            'step'    => 0.2,
                            'default' => 6,
                        ),
                        array(
                            'type'      => 'toggle',
                            'label'     => esc_html__( 'Pause on Mouse Over', '@@text_domain' ),
                            'name'      => 'autoplay_hover_pause',
                            'default'   => false,
                            'condition' => array(
                                array(
                                    'control'  => 'autoplay',
                                    'operator' => '>',
                                    'value'    => 0,
                                ),
                            ),
                        ),
                        array(
                            'type'    => 'select',
                            'label'   => esc_html__( 'Items Height', '@@text_domain' ),
                            'name'    => 'items_height_type',
                            'default' => 'dynamic',
                            'options' => array(
                                'auto'    => esc_html__( 'Auto', '@@text_domain' ),
                                'static'  => esc_html__( 'Static (px)', '@@text_domain' ),
                                'dynamic' => esc_html__( 'Dynamic (%)', '@@text_domain' ),
                            ),
                        ),
                        array(
                            'type'      => 'range',
                            'name'      => 'items_height_static',
                            'min'       => 30,
                            'max'       => 800,
                            'default'   => 300,
                            'condition' => array(
                                array(
                                    'control'  => 'items_height_type',
                                    'operator' => '==',
                                    'value'    => 'static',
                                ),
                            ),
                        ),
                        array(
                            'type'      => 'range',
                            'name'      => 'items_height_dynamic',
                            'min'       => 10,
                            'max'       => 300,
                            'default'   => 80,
                            'condition' => array(
                                array(
                                    'control'  => 'items_height_type',
                                    'operator' => '==',
                                    'value'    => 'dynamic',
                                ),
                            ),
                        ),
                        array(
                            'type'        => 'text',
                            'label'       => esc_html__( 'Items Minimal Height', '@@text_domain' ),
                            'placeholder' => esc_attr__( '300px, 80vh', '@@text_domain' ),
                            'description' => esc_html__( 'Values with `vh` units will not be visible in preview.', '@@text_domain' ),
                            'name'        => 'items_min_height',
                            'default'     => '',
                            'condition'   => array(
                                array(
                                    'control'  => 'items_height_type',
                                    'operator' => '!==',
                                    'value'    => 'auto',
                                ),
                            ),
                        ),
                        array(
                            'type'      => 'select',
                            'label'     => esc_html__( 'Slides Per View', '@@text_domain' ),
                            'name'      => 'slides_per_view_type',
                            'default'   => 'custom',
                            'options'   => array(
                                'auto'   => esc_html__( 'Auto', '@@text_domain' ),
                                'custom' => esc_html__( 'Custom', '@@text_domain' ),
                            ),
                            'condition' => array(
                                array(
                                    'control'  => 'effect',
                                    'operator' => '!=',
                                    'value'    => 'fade',
                                ),
                            ),
                        ),
                        array(
                            'type'      => 'range',
                            'name'      => 'slides_per_view_custom',
                            'min'       => 1,
                            'max'       => 6,
                            'default'   => 3,
                            'condition' => array(
                                array(
                                    'control'  => 'effect',
                                    'operator' => '!=',
                                    'value'    => 'fade',
                                ),
                                array(
                                    'control'  => 'slides_per_view_type',
                                    'operator' => '==',
                                    'value'    => 'custom',
                                ),
                            ),
                        ),
                        array(
                            'type'      => 'toggle',
                            'label'     => esc_html__( 'Centered Slides', '@@text_domain' ),
                            'name'      => 'centered_slides',
                            'default'   => true,
                            'condition' => array(
                                array(
                                    'control'  => 'effect',
                                    'operator' => '!=',
                                    'value'    => 'fade',
                                ),
                            ),
                        ),
                        array(
                            'type'    => 'toggle',
                            'label'   => esc_html__( 'Loop', '@@text_domain' ),
                            'name'    => 'loop',
                            'default' => false,
                        ),
                        array(
                            'type'    => 'toggle',
                            'label'   => esc_html__( 'Free Scroll', '@@text_domain' ),
                            'name'    => 'free_mode',
                            'default' => false,
                        ),
                        array(
                            'type'      => 'toggle',
                            'label'     => esc_html__( 'Free Scroll Sticky', '@@text_domain' ),
                            'name'      => 'free_mode_sticky',
                            'default'   => false,
                            'condition' => array(
                                array(
                                    'control' => 'free_mode',
                                ),
                            ),
                        ),
                        array(
                            'type'    => 'toggle',
                            'label'   => esc_html__( 'Display Arrows', '@@text_domain' ),
                            'name'    => 'arrows',
                            'default' => true,
                        ),
                        array(
                            'type'        => 'text',
                            'name'        => 'arrows_icon_prev',
                            'default'     => 'fas fa-angle-left',
                            'placeholder' => esc_attr__( 'Prev Arrow Icon', '@@text_domain' ),
                            'hint'        => esc_attr__( 'Prev Arrow Icon', '@@text_domain' ),
                            'hint_place'  => 'left',
                            'condition'   => array(
                                array(
                                    'control' => 'arrows',
                                ),
                            ),
                        ),
                        array(
                            'type'        => 'text',
                            'name'        => 'arrows_icon_next',
                            'default'     => 'fas fa-angle-right',
                            'placeholder' => esc_attr__( 'Next Arrow Icon', '@@text_domain' ),
                            'hint'        => esc_attr__( 'Next Arrow Icon', '@@text_domain' ),
                            'hint_place'  => 'left',
                            'condition'   => array(
                                array(
                                    'control' => 'arrows',
                                ),
                            ),
                        ),
                        array(
                            'type'    => 'toggle',
                            'label'   => esc_html__( 'Display Bullets', '@@text_domain' ),
                            'name'    => 'bullets',
                            'default' => false,
                        ),
                        array(
                            'type'      => 'toggle',
                            'label'     => esc_html__( 'Dynamic Bullets', '@@text_domain' ),
                            'name'      => 'bullets_dynamic',
                            'default'   => false,
                            'condition' => array(
                                array(
                                    'control' => 'bullets',
                                ),
                            ),
                        ),
                        array(
                            'type'    => 'toggle',
                            'label'   => esc_html__( 'Mousewheel Control', '@@text_domain' ),
                            'name'    => 'mousewheel',
                            'default' => false,
                        ),
                        array(
                            'type'    => 'toggle',
                            'label'   => esc_html__( 'Display Thumbnails', '@@text_domain' ),
                            'name'    => 'thumbnails',
                            'default' => false,
                        ),
                        array(
                            'type'      => 'range',
                            'label'     => esc_html__( 'Thumbnails Gap', '@@text_domain' ),
                            'name'      => 'thumbnails_gap',
                            'default'   => 15,
                            'min'       => 0,
                            'max'       => 150,
                            'condition' => array(
                                array(
                                    'control' => 'thumbnails',
                                ),
                            ),
                        ),
                        array(
                            'type'      => 'select',
                            'label'     => esc_html__( 'Thumbnails Height', '@@text_domain' ),
                            'name'      => 'thumbnails_height_type',
                            'default'   => 'static',
                            'options'   => array(
                                'auto'    => esc_html__( 'Auto', '@@text_domain' ),
                                'static'  => esc_html__( 'Static (px)', '@@text_domain' ),
                                'dynamic' => esc_html__( 'Dynamic (%)', '@@text_domain' ),
                            ),
                            'condition' => array(
                                array(
                                    'control' => 'thumbnails',
                                ),
                            ),
                        ),
                        array(
                            'type'      => 'range',
                            'name'      => 'thumbnails_height_static',
                            'min'       => 10,
                            'max'       => 400,
                            'default'   => 100,
                            'condition' => array(
                                array(
                                    'control' => 'thumbnails',
                                ),
                                array(
                                    'control'  => 'thumbnails_height_type',
                                    'operator' => '==',
                                    'value'    => 'static',
                                ),
                            ),
                        ),
                        array(
                            'type'      => 'range',
                            'name'      => 'thumbnails_height_dynamic',
                            'min'       => 10,
                            'max'       => 200,
                            'default'   => 30,
                            'condition' => array(
                                array(
                                    'control'  => 'thumbnails',
                                ),
                                array(
                                    'control'  => 'thumbnails_height_type',
                                    'operator' => '==',
                                    'value'    => 'dynamic',
                                ),
                            ),
                        ),
                        array(
                            'type'      => 'select',
                            'label'     => esc_html__( 'Thumbnails Per View', '@@text_domain' ),
                            'name'      => 'thumbnails_per_view_type',
                            'default'   => 'custom',
                            'options'   => array(
                                'auto'   => esc_html__( 'Auto', '@@text_domain' ),
                                'custom' => esc_html__( 'Custom', '@@text_domain' ),
                            ),
                            'condition' => array(
                                array(
                                    'control'  => 'thumbnails',
                                ),
                            ),
                        ),
                        array(
                            'type'      => 'range',
                            'name'      => 'thumbnails_per_view_custom',
                            'min'       => 1,
                            'max'       => 14,
                            'default'   => 8,
                            'condition' => array(
                                array(
                                    'control' => 'thumbnails',
                                ),
                                array(
                                    'control'  => 'thumbnails_per_view_type',
                                    'operator' => '==',
                                    'value'    => 'custom',
                                ),
                            ),
                        ),
                    ),
                ),
            ),
            $layouts
        );
    }

    /**
     * Add default items styles.
     *
     * @param array $items_styles - items styles array.
     *
     * @return array
     */
    public function add_default_items_styles( $items_styles ) {
        return array_merge(
            array(
                // Default.
                'default' => array(
                    'title'            => esc_html__( 'Default', '@@text_domain' ),
                    'icon'             => '<svg width="70" height="80" viewBox="0 0 70 80" fill="none" xmlns="http://www.w3.org/2000/svg"><line x1="19.5" y1="78.5" x2="50.5" y2="78.5" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><rect x="1.5" y="1.5" width="67" height="67" rx="4.5" stroke="currentColor" stroke-width="3"/></svg>',
                    'builtin_controls' => array(
                        'images_rounded_corners' => true,
                        'show_title'             => true,
                        'show_categories'        => true,
                        'show_date'              => true,
                        'show_excerpt'           => true,
                        'show_icons'             => false,
                        'align'                  => true,
                    ),
                    'controls'         => array(
                        array(
                            'type'    => 'select',
                            'label'   => esc_html__( 'Display Read More Button', '@@text_domain' ),
                            'name'    => 'show_read_more',
                            'default' => false,
                            'options' => array(
                                'false'    => esc_html__( 'Hide', '@@text_domain' ),
                                'true'     => esc_html__( 'Always Display', '@@text_domain' ),
                                'more_tag' => esc_html__( 'Display when used "More tag" in the post', '@@text_domain' ),
                            ),
                        ),
                        array(
                            'type'        => 'text',
                            'name'        => 'read_more_label',
                            'placeholder' => 'Read More',
                            'default'     => 'Read More',
                            'hint'        => esc_attr__( 'Read More Button Label', '@@text_domain' ),
                            'hint_place'  => 'left',
                            'condition'   => array(
                                array(
                                    'control'  => 'show_read_more',
                                    'operator' => '!=',
                                    'value'    => 'false',
                                ),
                            ),
                        ),
                    ),
                ),

                // Fly.
                'fly' => array(
                    'title'            => esc_html__( 'Fly', '@@text_domain' ),
                    'icon'             => '<svg width="70" height="80" viewBox="0 0 70 80" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1.5" y="1.5" width="67" height="67" rx="4.5" stroke="currentColor" stroke-width="3"/><line x1="1.5" y1="35.5" x2="16.5" y2="35.5" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><line x1="35.5" y1="1.5" x2="35.5" y2="68.5" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
                    'builtin_controls' => array(
                        'images_rounded_corners' => true,
                        'show_title'             => true,
                        'show_categories'        => true,
                        'show_date'              => true,
                        'show_excerpt'           => true,
                        'show_icons'             => true,
                        'align'                  => 'extended',
                    ),
                    'controls'         => array(
                        array(
                            'type'    => 'color',
                            'label'   => esc_html__( 'Overlay Background Color', '@@text_domain' ),
                            'name'    => 'bg_color',
                            'default' => '#212125',
                            'alpha'   => true,
                            'style'   => array(
                                array(
                                    'element'  => '.vp-portfolio__items-style-fly .vp-portfolio__item-overlay',
                                    'property' => 'background-color',
                                ),
                            ),
                        ),
                        array(
                            'type'    => 'color',
                            'label'   => esc_html__( 'Overlay Text Color', '@@text_domain' ),
                            'name'    => 'text_color',
                            'default' => '#fff',
                            'alpha'   => true,
                            'style'   => array(
                                array(
                                    'element'  => '.vp-portfolio__items-style-fly .vp-portfolio__item-overlay',
                                    'property' => 'color',
                                ),
                            ),
                        ),
                    ),
                ),

                // Emerge.
                'emerge' => array(
                    'title'            => esc_html__( 'Emerge', '@@text_domain' ),
                    'icon'             => '<svg width="71" height="80" viewBox="0 0 71 80" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1.5" y="1.5" width="67" height="67" rx="4.5" stroke="currentColor" stroke-width="3"/><line x1="1.5843" y1="44.5893" x2="68.586" y2="48.4735" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><line x1="19.5" y1="57.5" x2="50.5" y2="57.5" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
                    'builtin_controls' => array(
                        'images_rounded_corners' => true,
                        'show_title'             => true,
                        'show_categories'        => true,
                        'show_date'              => true,
                        'show_excerpt'           => true,
                        'show_icons'             => false,
                        'align'                  => true,
                    ),
                    'controls'         => array(
                        array(
                            'type'    => 'color',
                            'label'   => esc_html__( 'Overlay Background Color', '@@text_domain' ),
                            'name'    => 'bg_color',
                            'default' => '#fff',
                            'alpha'   => true,
                            'style'   => array(
                                array(
                                    'element'  => '.vp-portfolio__items-style-emerge .vp-portfolio__item-overlay',
                                    'property' => 'background-color',
                                ),
                            ),
                        ),
                        array(
                            'type'    => 'color',
                            'label'   => esc_html__( 'Overlay Text Color', '@@text_domain' ),
                            'name'    => 'text_color',
                            'default' => '#000',
                            'alpha'   => true,
                            'style'   => array(
                                array(
                                    'element'  => '.vp-portfolio__items-style-emerge .vp-portfolio__item-overlay',
                                    'property' => 'color',
                                ),
                            ),
                        ),
                    ),
                ),

                // Fade.
                'fade' => array(
                    'title'            => esc_html__( 'Fade', '@@text_domain' ),
                    'icon'             => '<svg width="70" height="80" viewBox="0 0 70 80" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1.5" y="1.5" width="67" height="67" rx="4.5" stroke="currentColor" stroke-width="3"/><line x1="19.5" y1="35.5" x2="50.5" y2="35.5" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
                    'builtin_controls' => array(
                        'images_rounded_corners' => true,
                        'show_title'             => true,
                        'show_categories'        => true,
                        'show_date'              => true,
                        'show_excerpt'           => true,
                        'show_icons'             => true,
                        'align'                  => 'extended',
                    ),
                    'controls'         => array(
                        array(
                            'type'    => 'color',
                            'label'   => esc_html__( 'Overlay Background Color', '@@text_domain' ),
                            'name'    => 'bg_color',
                            'default' => 'rgba(0, 0, 0, 0.85)',
                            'alpha'   => true,
                            'style'   => array(
                                array(
                                    'element'  => '.vp-portfolio__items-style-fade .vp-portfolio__item-overlay',
                                    'property' => 'background-color',
                                ),
                            ),
                        ),
                        array(
                            'type'    => 'color',
                            'label'   => esc_html__( 'Overlay Text Color', '@@text_domain' ),
                            'name'    => 'text_color',
                            'default' => '#fff',
                            'alpha'   => true,
                            'style'   => array(
                                array(
                                    'element'  => '.vp-portfolio__items-style-fade .vp-portfolio__item-overlay',
                                    'property' => 'color',
                                ),
                            ),
                        ),
                    ),
                ),
            ),
            $items_styles
        );
    }

    /**
     * Register control fields for the metaboxes.
     */
    public function register_controls() {
        do_action( 'vpf_before_register_controls' );

        /**
         * Content Source
         */
        Visual_Portfolio_Controls::register(
            array(
                'category' => 'content-source',
                'type'     => 'hidden',
                'name'     => 'content_source',
                'default'  => 'portfolio',
            )
        );

        /**
         * Content Source Posts
         */
        Visual_Portfolio_Controls::register(
            array(
                'category'       => 'content-source-post-based',
                'type'           => 'icons_selector',
                'name'           => 'posts_source',
                'default'        => 'portfolio',
                'value_callback' => array( $this, 'find_post_types_options' ),
            )
        );
        $allowed_protocols = array(
            'a' => array(
                'href'   => array(),
                'target' => array(),
            ),
        );
        Visual_Portfolio_Controls::register(
            array(
                'category'      => 'content-source-post-based',
                'type'          => 'textarea',
                'label'         => esc_html__( 'Custom Query', '@@text_domain' ),
                // translators: %1$s - escaped url.
                'description'   => sprintf( wp_kses( __( 'Build custom query according to WordPress Codex. See example here <a href="%1$s">%1$s</a>.', '@@text_domain' ), $allowed_protocols ), esc_url( 'https://visualportfolio.co/documentation/portfolio-layouts/content-source/post-based/#custom-query' ) ),
                'name'          => 'posts_custom_query',
                'default'       => '',
                'cols'          => 30,
                'rows'          => 3,
                'wrapper_class' => 'vp-col-12',
                'condition'     => array(
                    array(
                        'control' => 'posts_source',
                        'value'   => 'custom_query',
                    ),
                ),
            )
        );
        Visual_Portfolio_Controls::register(
            array(
                'category'       => 'content-source-post-based',
                'type'           => 'select',
                'label'          => esc_html__( 'Specific Posts', '@@text_domain' ),
                'name'           => 'posts_ids',
                'default'        => array(),
                'value_callback' => array( $this, 'find_posts_select_control' ),
                'searchable'     => true,
                'multiple'       => true,
                'class'          => 'vp-select2-posts-ajax',
                'wrapper_class'  => 'vp-col-6',
                'condition'      => array(
                    array(
                        'control' => 'posts_source',
                        'value'   => 'ids',
                    ),
                ),
            )
        );
        Visual_Portfolio_Controls::register(
            array(
                'category'       => 'content-source-post-based',
                'type'           => 'select2',
                'label'          => esc_html__( 'Excluded Posts', '@@text_domain' ),
                'name'           => 'posts_excluded_ids',
                'default'        => array(),
                'value_callback' => array( $this, 'find_posts_select_control' ),
                'searchable'     => true,
                'multiple'       => true,
                'class'          => 'vp-select2-posts-ajax',
                'wrapper_class'  => 'vp-col-6',
                'condition'      => array(
                    array(
                        'control'  => 'posts_source',
                        'operator' => '!=',
                        'value'    => 'ids',
                    ),
                    array(
                        'control'  => 'posts_source',
                        'operator' => '!=',
                        'value'    => 'custom_query',
                    ),
                ),
            )
        );
        Visual_Portfolio_Controls::register(
            array(
                'category'       => 'content-source-post-based',
                'type'           => 'select2',
                'label'          => esc_html__( 'Taxonomies', '@@text_domain' ),
                'name'           => 'posts_taxonomies',
                'default'        => array(),
                'value_callback' => array( $this, 'find_taxonomies_select_control' ),
                'searchable'     => true,
                'multiple'       => true,
                'class'          => 'vp-select2-taxonomies-ajax',
                'wrapper_class'  => 'vp-col-6',
                'condition'      => array(
                    array(
                        'control'  => 'posts_source',
                        'operator' => '!=',
                        'value'    => 'ids',
                    ),
                    array(
                        'control'  => 'posts_source',
                        'operator' => '!=',
                        'value'    => 'custom_query',
                    ),
                ),
            )
        );
        Visual_Portfolio_Controls::register(
            array(
                'category'      => 'content-source-post-based',
                'type'          => 'buttons',
                'label'         => esc_html__( 'Taxonomies Relation', '@@text_domain' ),
                'name'          => 'posts_taxonomies_relation',
                'default'       => 'or',
                'options'       => array(
                    'or'  => esc_html__( 'OR', '@@text_domain' ),
                    'and' => esc_html__( 'AND', '@@text_domain' ),
                ),
                'wrapper_class' => 'vp-col-6',
                'condition'     => array(
                    array(
                        'control'  => 'posts_source',
                        'operator' => '!=',
                        'value'    => 'ids',
                    ),
                    array(
                        'control'  => 'posts_source',
                        'operator' => '!=',
                        'value'    => 'custom_query',
                    ),
                ),
            )
        );
        Visual_Portfolio_Controls::register(
            array(
                'category'      => 'content-source-post-based',
                'type'          => 'select',
                'label'         => esc_html__( 'Order by', '@@text_domain' ),
                'name'          => 'posts_order_by',
                'default'       => 'post_date',
                'options'       => array(
                    'post_date'  => esc_html__( 'Date', '@@text_domain' ),
                    'title'      => esc_html__( 'Title', '@@text_domain' ),
                    'id'         => esc_html__( 'ID', '@@text_domain' ),
                    'menu_order' => esc_html__( 'Menu Order', '@@text_domain' ),
                    'rand'       => esc_html__( 'Random', '@@text_domain' ),
                ),
                'wrapper_class' => 'vp-col-6',
            )
        );
        Visual_Portfolio_Controls::register(
            array(
                'category'      => 'content-source-post-based',
                'type'          => 'buttons',
                'label'         => esc_html__( 'Order Direction', '@@text_domain' ),
                'name'          => 'posts_order_direction',
                'default'       => 'desc',
                'options'       => array(
                    'asc'  => esc_html__( 'ASC', '@@text_domain' ),
                    'desc' => esc_html__( 'DESC', '@@text_domain' ),
                ),
                'wrapper_class' => 'vp-col-6',
            )
        );
        Visual_Portfolio_Controls::register(
            array(
                'category'      => 'content-source-post-based',
                'type'          => 'toggle',
                'label'         => esc_html__( 'Avoid Duplicate Posts', '@@text_domain' ),
                'name'          => 'posts_avoid_duplicate_posts',
                'default'       => false,
                'wrapper_class' => 'vp-col-6',
            )
        );

        /**
         * Content Source Images
         */
        Visual_Portfolio_Controls::register(
            array(
                'category'        => 'content-source-images',
                'type'            => 'gallery',
                'name'            => 'images',
                'image_controls'  => array(
                    'title'       => array(
                        'type'      => 'text',
                        'label'     => esc_html__( 'Title', '@@text_domain' ),
                        'condition' => array(
                            array(
                                'control'  => 'images_titles_source',
                                'operator' => '===',
                                'value'    => 'custom',
                            ),
                        ),
                    ),
                    'description' => array(
                        'type'      => 'textarea',
                        'label'     => esc_html__( 'Description', '@@text_domain' ),
                        'condition' => array(
                            array(
                                'control'  => 'images_descriptions_source',
                                'operator' => '===',
                                'value'    => 'custom',
                            ),
                        ),
                    ),
                    'categories'  => array(
                        'type'      => 'select',
                        'label'     => esc_html__( 'Categories', '@@text_domain' ),
                        'multiple'  => true,
                        'creatable' => true,
                    ),
                    'format'      => array(
                        'type'    => 'select',
                        'label'   => esc_html__( 'Format', '@@text_domain' ),
                        'default' => 'standard',
                        'options' => array(
                            'standard' => esc_html__( 'Standard', '@@text_domain' ),
                            'video'    => esc_html__( 'Video', '@@text_domain' ),
                        ),
                    ),
                    'video_url'   => array(
                        'type'        => 'text',
                        'label'       => esc_html__( 'Video URL', '@@text_domain' ),
                        'placeholder' => esc_html__( 'https://...', '@@text_domain' ),
                        'condition'   => array(
                            array(
                                'control' => 'SELF.format',
                                'value'   => 'video',
                            ),
                        ),
                    ),
                    'url'         => array(
                        'type'        => 'text',
                        'label'       => esc_html__( 'URL', '@@text_domain' ),
                        'description' => esc_html__( 'By default used full image url, you can use custom one', '@@text_domain' ),
                        'placeholder' => esc_html__( 'https://...', '@@text_domain' ),
                    ),
                ),
                'default'         => array(
                    /**
                     * Array items:
                     * id - image id.
                     * title - image title.
                     * description - image description.
                     * categories - categories array.
                     * format - image format [standard,video].
                     * video_url - video url.
                     */
                ),
                'wrapper_class'   => 'vp-col-12',
            )
        );
        Visual_Portfolio_Controls::register(
            array(
                'category'      => 'content-source-images',
                'type'          => 'select',
                'label'         => esc_html__( 'Titles', '@@text_domain' ),
                'name'          => 'images_titles_source',
                'default'       => 'custom',
                'options'       => array(
                    'none'        => esc_html__( 'None', '@@text_domain' ),
                    'custom'      => esc_html__( 'Custom', '@@text_domain' ),
                    'title'       => esc_html__( 'Image Title', '@@text_domain' ),
                    'caption'     => esc_html__( 'Image Caption', '@@text_domain' ),
                    'alt'         => esc_html__( 'Image Alt', '@@text_domain' ),
                    'description' => esc_html__( 'Image Description', '@@text_domain' ),
                ),
                'wrapper_class' => 'vp-col-6',
            )
        );
        Visual_Portfolio_Controls::register(
            array(
                'category'      => 'content-source-images',
                'type'          => 'select',
                'label'         => esc_html__( 'Descriptions', '@@text_domain' ),
                'name'          => 'images_descriptions_source',
                'default'       => 'custom',
                'options'       => array(
                    'none'        => esc_html__( 'None', '@@text_domain' ),
                    'custom'      => esc_html__( 'Custom', '@@text_domain' ),
                    'title'       => esc_html__( 'Image Title', '@@text_domain' ),
                    'caption'     => esc_html__( 'Image Caption', '@@text_domain' ),
                    'alt'         => esc_html__( 'Image Alt', '@@text_domain' ),
                    'description' => esc_html__( 'Image Description', '@@text_domain' ),
                ),
                'wrapper_class' => 'vp-col-6',
            )
        );
        Visual_Portfolio_Controls::register(
            array(
                'category'      => 'content-source-images',
                'type'          => 'select',
                'label'         => esc_html__( 'Order by', '@@text_domain' ),
                'name'          => 'images_order_by',
                'default'       => 'default',
                'options'       => array(
                    'default' => esc_html__( 'Default', '@@text_domain' ),
                    'date'    => esc_html__( 'Uploaded', '@@text_domain' ),
                    'title'   => esc_html__( 'Title', '@@text_domain' ),
                    'rand'    => esc_html__( 'Random', '@@text_domain' ),
                ),
                'wrapper_class' => 'vp-col-6',
            )
        );
        Visual_Portfolio_Controls::register(
            array(
                'category'      => 'content-source-images',
                'type'          => 'buttons',
                'label'         => esc_html__( 'Order Direction', '@@text_domain' ),
                'name'          => 'images_order_direction',
                'default'       => 'asc',
                'options'       => array(
                    'asc'  => esc_html__( 'ASC', '@@text_domain' ),
                    'desc' => esc_html__( 'DESC', '@@text_domain' ),
                ),
                'wrapper_class' => 'vp-col-6',
            )
        );

        /**
         * Content Source Additional Settings.
         */
        Visual_Portfolio_Controls::register(
            array(
                'category' => 'content-source-additional',
                'type'     => 'range',
                'label'    => esc_html__( 'Items Per Page', '@@text_domain' ),
                'name'     => 'items_count',
                'default'  => 6,
                'min'      => 1,
                'max'      => 50,
            )
        );

        Visual_Portfolio_Controls::register(
            array(
                'category'   => 'content-source-additional',
                'type'       => 'toggle',
                'label'      => esc_html__( 'Stretch', '@@text_domain' ),
                'name'       => 'stretch',
                'default'    => false,
                'hint'       => esc_attr__( 'Break container and display it wide', '@@text_domain' ),
                'hint_place' => 'left',
            )
        );

        /**
         * Layouts.
         */
        $layouts = Visual_Portfolio_Extend::layouts();

        // Extend specific layout controls.
        foreach ( $layouts as $name => $layout ) {
            if ( isset( $layout['controls'] ) ) {
                $layouts[ $name ]['controls'] = Visual_Portfolio_Extend::layout_controls( $name, $layout['controls'] );
            }
        }

        // Layouts selector.
        $layouts_selector = array();
        foreach ( $layouts as $name => $layout ) {
            $layouts_selector[ $name ] = array(
                'value' => $name,
                'title' => $layout['title'],
                'icon'  => isset( $layout['icon'] ) ? $layout['icon'] : '',
            );
        }

        Visual_Portfolio_Controls::register(
            array(
                'category' => 'layouts',
                'type'     => 'icons_selector',
                'name'     => 'layout',
                'default'  => 'tiles',
                'options'  => $layouts_selector,
            )
        );

        // layouts options.
        foreach ( $layouts as $name => $layout ) {
            if ( ! isset( $layout['controls'] ) ) {
                continue;
            }
            foreach ( $layout['controls'] as $field ) {
                $field['category'] = 'layouts';
                $field['name']     = $name . '_' . $field['name'];

                // condition names prefix fix.
                if ( isset( $field['condition'] ) ) {
                    foreach ( $field['condition'] as $k => $cond ) {
                        if ( isset( $cond['control'] ) ) {
                            $field['condition'][ $k ]['control'] = $name . '_' . $cond['control'];
                        }
                    }
                }

                $field['condition'] = array_merge(
                    isset( $field['condition'] ) ? $field['condition'] : array(),
                    array(
                        array(
                            'control' => 'layout',
                            'value'   => $name,
                        ),
                    )
                );
                Visual_Portfolio_Controls::register( $field );
            }
        }

        Visual_Portfolio_Controls::register(
            array(
                'category' => 'layouts',
                'type'     => 'range',
                'label'    => esc_html__( 'Gap', '@@text_domain' ),
                'name'     => 'items_gap',
                'default'  => 15,
                'min'      => 0,
                'max'      => 150,
            )
        );

        /**
         * Items Style
         */
        $items_styles = Visual_Portfolio_Extend::items_styles();

        // Extend specific item style controls.
        foreach ( $items_styles as $name => $style ) {
            if ( isset( $style['controls'] ) ) {
                $items_styles[ $name ]['controls'] = Visual_Portfolio_Extend::item_style_controls( $name, $style['controls'] );
            }
        }

        // Styles selector.
        $items_styles_selector = array();
        foreach ( $items_styles as $name => $style ) {
            $items_styles_selector[ $name ] = array(
                'value' => $name,
                'title' => $style['title'],
                'icon'  => isset( $style['icon'] ) ? $style['icon'] : '',
            );
        }

        Visual_Portfolio_Controls::register(
            array(
                'category' => 'items-style',
                'type'     => 'icons_selector',
                'name'     => 'items_style',
                'default'  => 'fly',
                'options'  => $items_styles_selector,
            )
        );

        // styles builtin options.
        foreach ( $items_styles as $name => $style ) {
            $new_fields = array();
            if ( isset( $style['builtin_controls'] ) ) {
                foreach ( $style['builtin_controls'] as $control_name => $val ) {
                    if ( ! $val ) {
                        continue;
                    }
                    switch ( $control_name ) {
                        case 'images_rounded_corners':
                            $new_fields[] = array(
                                'type'      => 'range',
                                'label'     => esc_html__( 'Images Rounded Corners', '@@text_domain' ),
                                'name'      => 'images_rounded_corners',
                                'min'       => 0,
                                'max'       => 50,
                                'default'   => 0,
                                'style'     => array(
                                    array(
                                        'element'  => 'fade' === $name || 'fly' === $name || 'emerge' === $name ? '.vp-portfolio__item' : '.vp-portfolio__item-img',
                                        'property' => 'border-radius',
                                        'mask'     => '$px',
                                    ),
                                ),
                            );
                            break;
                        case 'show_title':
                            $new_fields[] = array(
                                'type'    => 'toggle',
                                'label'   => esc_html__( 'Display Title', '@@text_domain' ),
                                'name'    => 'show_title',
                                'default' => true,
                            );
                            break;
                        case 'show_categories':
                            $new_fields[] = array(
                                'type'    => 'toggle',
                                'label'   => esc_html__( 'Display Categories', '@@text_domain' ),
                                'name'    => 'show_categories',
                                'default' => true,
                            );
                            $new_fields[] = array(
                                'type'      => 'range',
                                'label'     => esc_html__( 'Categories Count', '@@text_domain' ),
                                'name'      => 'categories_count',
                                'min'       => 1,
                                'max'       => 10,
                                'default'   => 1,
                                'condition' => array(
                                    array(
                                        'control' => 'show_categories',
                                    ),
                                ),
                            );
                            break;
                        case 'show_date':
                            $new_fields[] = array(
                                'type'    => 'buttons',
                                'label'   => esc_html__( 'Display Date', '@@text_domain' ),
                                'name'    => 'show_date',
                                'default' => 'false',
                                'options' => array(
                                    'false' => esc_html__( 'Hide', '@@text_domain' ),
                                    'true'  => esc_html__( 'Default', '@@text_domain' ),
                                    'human' => esc_html__( 'Human Format', '@@text_domain' ),
                                ),
                            );
                            $new_fields[] = array(
                                'type'        => 'text',
                                'name'        => 'date_format',
                                'placeholder' => 'F j, Y',
                                'default'     => 'F j, Y',
                                'hint'        => esc_attr__( "Date format \r\n Example: F j, Y", '@@text_domain' ),
                                'hint_place'  => 'left',
                                'condition'   => array(
                                    array(
                                        'control' => 'show_date',
                                    ),
                                ),
                            );
                            break;
                        case 'show_excerpt':
                            $new_fields[] = array(
                                'type'    => 'toggle',
                                'label'   => esc_html__( 'Display Excerpt', '@@text_domain' ),
                                'name'    => 'show_excerpt',
                                'default' => false,
                            );
                            $new_fields[] = array(
                                'type'      => 'range',
                                'label'     => esc_html__( 'Excerpt Words Count', '@@text_domain' ),
                                'name'      => 'excerpt_words_count',
                                'default'   => 15,
                                'min'       => 1,
                                'max'       => 200,
                                'condition' => array(
                                    array(
                                        'control' => 'show_excerpt',
                                    ),
                                ),
                            );
                            break;
                        case 'show_icons':
                            $new_fields[] = array(
                                'type'    => 'toggle',
                                'label'   => esc_html__( 'Display Icon', '@@text_domain' ),
                                'name'    => 'show_icon',
                                'default' => false,
                            );
                            $new_fields[] = array(
                                'type'        => 'text',
                                'name'        => 'icon',
                                'default'     => 'fas fa-search',
                                'placeholder' => esc_attr__( 'Standard Icon', '@@text_domain' ),
                                'hint'        => esc_attr__( 'Standard Icon', '@@text_domain' ),
                                'hint_place'  => 'left',
                                'condition'   => array(
                                    array(
                                        'control' => 'show_icon',
                                    ),
                                ),
                            );
                            $new_fields[] = array(
                                'type'        => 'text',
                                'name'        => 'icon_video',
                                'default'     => 'fas fa-play',
                                'placeholder' => esc_attr__( 'Video Icon', '@@text_domain' ),
                                'hint'        => esc_attr__( 'Video Icon', '@@text_domain' ),
                                'hint_place'  => 'left',
                                'condition'   => array(
                                    array(
                                        'control' => 'show_icon',
                                    ),
                                ),
                            );
                            break;
                        case 'align':
                            $new_fields[] = array(
                                'type'     => 'align',
                                'label'    => esc_html__( 'Caption Align', '@@text_domain' ),
                                'name'     => 'align',
                                'default'  => 'center',
                                'extended' => 'extended' === $val,
                            );
                            break;
                        // no default.
                    }
                }
            }
            $items_styles[ $name ]['controls'] = array_merge( $new_fields, isset( $style['controls'] ) ? $style['controls'] : array() );
        }

        // styles options.
        foreach ( $items_styles as $name => $style ) {
            if ( ! isset( $style['controls'] ) ) {
                continue;
            }
            foreach ( $style['controls'] as $field ) {
                $field['category'] = 'items-style';
                $field['name']     = 'items_style_' . $name . '__' . $field['name'];

                // condition names prefix fix.
                if ( isset( $field['condition'] ) ) {
                    foreach ( $field['condition'] as $k => $cond ) {
                        if ( isset( $cond['control'] ) ) {
                            $field['condition'][ $k ]['control'] = 'items_style_' . $name . '__' . $cond['control'];
                        }
                    }
                }

                $field['condition'] = array_merge(
                    isset( $field['condition'] ) ? $field['condition'] : array(),
                    array(
                        array(
                            'control' => 'items_style',
                            'value'   => $name,
                        ),
                    )
                );
                Visual_Portfolio_Controls::register( $field );
            }
        }

        /**
         * Items Click Action
         */
        Visual_Portfolio_Controls::register(
            array(
                'category' => 'items-click-action',
                'type'     => 'icons_selector',
                'name'     => 'items_click_action',
                'default'  => 'url',
                'options'  => array(
                    array(
                        'value' => 'false',
                        'title' => esc_html__( 'Disabled', '@@text_domain' ),
                        'icon'  => '<svg width="70" height="70" viewBox="0 0 70 70" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1.5" y="1.5" width="67" height="67" rx="33.5" stroke="currentColor" stroke-width="3"/><line x1="1.5" y1="-1.5" x2="64.968" y2="-1.5" transform="matrix(0.707107 0.707107 0.707107 -0.707107 11.0416 11)" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
                    ),
                    array(
                        'value' => 'url',
                        'title' => esc_html__( 'URL', '@@text_domain' ),
                        'icon'  => '<svg width="70" height="70" viewBox="0 0 70 70" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M29 38.4913C30.3664 40.3549 32.1096 41.897 34.1115 43.0129C36.1133 44.1287 38.327 44.7923 40.6023 44.9585C42.8776 45.1248 45.1614 44.7898 47.2987 43.9764C49.4359 43.163 51.3768 41.8901 52.9895 40.2441L62.5344 30.5059C65.4322 27.4448 67.0356 23.345 66.9994 19.0894C66.9632 14.8338 65.2901 10.763 62.3406 7.75378C59.3911 4.74453 55.4011 3.03759 51.2301 3.00061C47.059 2.96363 43.0406 4.59957 40.0403 7.55607L34.5679 13.1069" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M41 31.5087C39.6336 29.6451 37.8904 28.103 35.8885 26.9871C33.8867 25.8713 31.673 25.2077 29.3977 25.0415C27.1224 24.8752 24.8386 25.2102 22.7013 26.0236C20.5641 26.837 18.6232 28.1099 17.0105 29.7559L7.46561 39.4941C4.56781 42.5552 2.96436 46.6551 3.0006 50.9106C3.03685 55.1662 4.70989 59.237 7.65939 62.2462C10.6089 65.2555 14.5989 66.9624 18.7699 66.9994C22.941 67.0364 26.9594 65.4004 29.9597 62.4439L35.4003 56.8931" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
                    ),
                    array(
                        'value' => 'popup_gallery',
                        'title' => esc_html__( 'Popup Gallery', '@@text_domain' ),
                        'icon'  => '<svg width="70" height="70" viewBox="0 0 70 70" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3 56.3385V61C3 64.3137 5.68629 67 9 67H13.6615" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M43.7077 67L48.3692 67C51.6829 67 54.3692 64.3137 54.3692 61L54.3692 59.2462" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M10.7538 15.6308L9 15.6308C5.68629 15.6308 3 18.3171 3 21.6308L3 26.2923" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 46.6462V35.9846" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M23.3538 67L34.0154 67" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 58L25 45" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M12.9007 44.3084H25.6916V57.0993" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M12.7538 36.4077V8.13846C12.7538 4.74828 15.5021 2 18.8923 2H61.8615C65.2517 2 68 4.74828 68 8.13846V51.1077C68 54.4979 65.2517 57.2462 61.8615 57.2462H33.5923" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M29.7154 23.3231C32.1242 23.3231 34.0769 21.3704 34.0769 18.9615C34.0769 16.5527 32.1242 14.6 29.7154 14.6C27.3066 14.6 25.3538 16.5527 25.3538 18.9615C25.3538 21.3704 27.3066 23.3231 29.7154 23.3231Z" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M68 39.0511L52.7905 23.3231L33.5923 43.1923" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
                    ),
                ),
            )
        );

        // url.
        Visual_Portfolio_Controls::register(
            array(
                'category'  => 'items-click-action',
                'type'      => 'select',
                'label'     => esc_html__( 'Target', '@@text_domain' ),
                'name'      => 'items_click_action_url_target',
                'default'   => '',
                'options'   => array(
                    ''       => esc_html__( 'Default', '@@text_domain' ),
                    '_blank' => esc_html__( 'New Tab (_blank)', '@@text_domain' ),
                    '_top'   => esc_html__( 'Top Frame (_top)', '@@text_domain' ),
                ),
                'condition' => array(
                    array(
                        'control' => 'items_click_action',
                        'value'   => 'url',
                    ),
                ),
            )
        );

        // popup.
        Visual_Portfolio_Controls::register(
            array(
                'category'  => 'items-click-action',
                'type'      => 'select',
                'label'     => esc_html__( 'Title', '@@text_domain' ),
                'name'      => 'items_click_action_popup_title_source',
                'default'   => 'title',
                'options'   => array(
                    'none'        => esc_html__( 'None', '@@text_domain' ),
                    'title'       => esc_html__( 'Image Title', '@@text_domain' ),
                    'caption'     => esc_html__( 'Image Caption', '@@text_domain' ),
                    'alt'         => esc_html__( 'Image Alt', '@@text_domain' ),
                    'description' => esc_html__( 'Image Description', '@@text_domain' ),
                ),
                'condition' => array(
                    array(
                        'control' => 'items_click_action',
                        'value'   => 'popup_gallery',
                    ),
                ),
            )
        );
        Visual_Portfolio_Controls::register(
            array(
                'category'  => 'items-click-action',
                'type'      => 'select',
                'label'     => esc_html__( 'Description', '@@text_domain' ),
                'name'      => 'items_click_action_popup_description_source',
                'default'   => 'description',
                'options'   => array(
                    'none'        => esc_html__( 'None', '@@text_domain' ),
                    'title'       => esc_html__( 'Image Title', '@@text_domain' ),
                    'caption'     => esc_html__( 'Image Caption', '@@text_domain' ),
                    'alt'         => esc_html__( 'Image Alt', '@@text_domain' ),
                    'description' => esc_html__( 'Image Description', '@@text_domain' ),
                ),
                'condition' => array(
                    array(
                        'control' => 'items_click_action',
                        'value'   => 'popup_gallery',
                    ),
                ),
            )
        );

        /**
         * Filter.
         */
        $filters = array_merge(
            array(
                // False.
                'false' => array(
                    'title'    => esc_html__( 'Disabled', '@@text_domain' ),
                    'icon'     => '<svg width="70" height="70" viewBox="0 0 70 70" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1.5" y="1.5" width="67" height="67" rx="33.5" stroke="currentColor" stroke-width="3"/><line x1="1.5" y1="-1.5" x2="64.968" y2="-1.5" transform="matrix(0.707107 0.707107 0.707107 -0.707107 11.0416 11)" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
                    'controls' => array(),
                ),

                // Default.
                'default' => array(
                    'title'    => esc_html__( 'Default', '@@text_domain' ),
                    'icon'     => '<svg width="70" height="70" viewBox="0 0 70 70" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1.5" y="19.5" width="67" height="27" rx="4.5" stroke="currentColor" stroke-width="3"/><path d="M3 39V45C3 46.6569 4.34315 48 6 48H64C65.6569 48 67 46.6569 67 45V39L68.5 36C69.3284 36 70 36.6716 70 37.5V45C70 48.3137 67.3137 51 64 51H6C2.68629 51 0 48.3137 0 45V37.5C0 36.6716 0.671573 36 1.5 36L3 39Z" fill="currentColor"/></svg>',
                    'controls' => array(),
                ),

                // Dropdown.
                'dropdown' => array(
                    'title'    => esc_html__( 'Dropdown', '@@text_domain' ),
                    'icon'     => '<svg width="70" height="70" viewBox="0 0 70 70" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M35 68C53.2254 68 68 53.2254 68 35C68 16.7746 53.2254 2 35 2C16.7746 2 2 16.7746 2 35C2 53.2254 16.7746 68 35 68Z" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 31L35 45L49 31" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
                    'controls' => array(),
                ),
            ),
            Visual_Portfolio_Extend::filters()
        );

        // Extend specific filter controls.
        foreach ( $filters as $name => $filter ) {
            if ( isset( $filter['controls'] ) ) {
                $filters[ $name ]['controls'] = Visual_Portfolio_Extend::filter_controls( $name, $filter['controls'] );
            }
        }

        // Filters selector.
        $filters_selector = array();
        foreach ( $filters as $name => $filter ) {
            $filters_selector[] = array(
                'value' => $name,
                'title' => $filter['title'],
                'icon'  => isset( $filter['icon'] ) ? $filter['icon'] : '',
            );
        }
        Visual_Portfolio_Controls::register(
            array(
                'category' => 'filter',
                'type'     => 'icons_selector',
                'name'     => 'filter',
                'default'  => 'default',
                'options'  => $filters_selector,
            )
        );

        // filters options.
        foreach ( $filters as $name => $filter ) {
            if ( ! isset( $filter['controls'] ) ) {
                continue;
            }
            foreach ( $filter['controls'] as $field ) {
                $field['category'] = 'filter';
                $field['name']     = 'filter_' . $name . '__' . $field['name'];

                // condition names prefix fix.
                if ( isset( $field['condition'] ) ) {
                    foreach ( $field['condition'] as $k => $cond ) {
                        if ( isset( $cond['control'] ) ) {
                            $field['condition'][ $k ]['control'] = $name . '_' . $cond['control'];
                        }
                    }
                }

                $field['condition'] = array_merge(
                    isset( $field['condition'] ) ? $field['condition'] : array(),
                    array(
                        array(
                            'control' => 'filter',
                            'value'   => $name,
                        ),
                    )
                );
                Visual_Portfolio_Controls::register( $field );
            }
        }

        Visual_Portfolio_Controls::register(
            array(
                'category'  => 'filter',
                'type'      => 'align',
                'label'     => esc_html__( 'Align', '@@text_domain' ),
                'name'      => 'filter_align',
                'default'   => 'center',
                'condition' => array(
                    array(
                        'control'  => 'filter',
                        'operator' => '!=',
                        'value'    => 'false',
                    ),
                ),
            )
        );
        Visual_Portfolio_Controls::register(
            array(
                'category'  => 'filter',
                'type'      => 'toggle',
                'label'     => esc_html__( 'Display Count', '@@text_domain' ),
                'name'      => 'filter_show_count',
                'default'   => false,
                'condition' => array(
                    array(
                        'control'  => 'filter',
                        'operator' => '!=',
                        'value'    => 'false',
                    ),
                ),
            )
        );
        Visual_Portfolio_Controls::register(
            array(
                'category'  => 'filter',
                'type'      => 'text',
                'label'     => esc_html__( 'All Button Text', '@@text_domain' ),
                'name'      => 'filter_text_all',
                'default'   => esc_attr__( 'All', '@@text_domain' ),
                'condition' => array(
                    array(
                        'control'  => 'filter',
                        'operator' => '!=',
                        'value'    => 'false',
                    ),
                ),
            )
        );

        /**
         * Sort.
         */
        $sorts = array_merge(
            array(
                // False.
                'false' => array(
                    'title'    => esc_html__( 'Disabled', '@@text_domain' ),
                    'icon'     => '<svg width="70" height="70" viewBox="0 0 70 70" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1.5" y="1.5" width="67" height="67" rx="33.5" stroke="currentColor" stroke-width="3"/><line x1="1.5" y1="-1.5" x2="64.968" y2="-1.5" transform="matrix(0.707107 0.707107 0.707107 -0.707107 11.0416 11)" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
                    'controls' => array(),
                ),

                // Default.
                'default' => array(
                    'title'    => esc_html__( 'Default', '@@text_domain' ),
                    'icon'     => '<svg width="70" height="70" viewBox="0 0 70 70" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1.5" y="19.5" width="67" height="27" rx="4.5" stroke="currentColor" stroke-width="3"/><path d="M3 39V45C3 46.6569 4.34315 48 6 48H64C65.6569 48 67 46.6569 67 45V39L68.5 36C69.3284 36 70 36.6716 70 37.5V45C70 48.3137 67.3137 51 64 51H6C2.68629 51 0 48.3137 0 45V37.5C0 36.6716 0.671573 36 1.5 36L3 39Z" fill="currentColor"/></svg>',
                    'controls' => array(),
                ),

                // Dropdown.
                'dropdown' => array(
                    'title'    => esc_html__( 'Dropdown', '@@text_domain' ),
                    'icon'     => '<svg width="70" height="70" viewBox="0 0 70 70" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M35 68C53.2254 68 68 53.2254 68 35C68 16.7746 53.2254 2 35 2C16.7746 2 2 16.7746 2 35C2 53.2254 16.7746 68 35 68Z" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 31L35 45L49 31" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
                    'controls' => array(),
                ),
            ),
            Visual_Portfolio_Extend::sort()
        );

        // Extend specific sort controls.
        foreach ( $sorts as $name => $sort ) {
            if ( isset( $sort['controls'] ) ) {
                $sorts[ $name ]['controls'] = Visual_Portfolio_Extend::sort_controls( $name, $sort['controls'] );
            }
        }

        // Sort selector.
        $sorts_selector = array();
        foreach ( $sorts as $name => $sort ) {
            $sorts_selector[ $name ] = array(
                'value' => $name,
                'title' => $sort['title'],
                'icon'  => isset( $sort['icon'] ) ? $sort['icon'] : '',
            );
        }
        Visual_Portfolio_Controls::register(
            array(
                'category' => 'sort',
                'type'     => 'icons_selector',
                'name'     => 'sort',
                'default'  => 'false',
                'options'  => $sorts_selector,
            )
        );

        // sorts options.
        foreach ( $sorts as $name => $sort ) {
            if ( ! isset( $sort['controls'] ) ) {
                continue;
            }
            foreach ( $sort['controls'] as $field ) {
                $field['category'] = 'sort';
                $field['name']     = 'sort_' . $name . '__' . $field['name'];

                // condition names prefix fix.
                if ( isset( $field['condition'] ) ) {
                    foreach ( $field['condition'] as $k => $cond ) {
                        if ( isset( $cond['control'] ) ) {
                            $field['condition'][ $k ]['control'] = $name . '_' . $cond['control'];
                        }
                    }
                }

                $field['condition'] = array_merge(
                    isset( $field['condition'] ) ? $field['condition'] : array(),
                    array(
                        array(
                            'control' => 'sort',
                            'value'   => $name,
                        ),
                    )
                );
                Visual_Portfolio_Controls::register( $field );
            }
        }

        Visual_Portfolio_Controls::register(
            array(
                'category'  => 'sort',
                'type'      => 'align',
                'label'     => esc_html__( 'Align', '@@text_domain' ),
                'name'      => 'sort_align',
                'default'   => 'center',
                'condition' => array(
                    array(
                        'control'  => 'sort',
                        'operator' => '!=',
                        'value'    => 'false',
                    ),
                ),
            )
        );

        /**
         * Pagination
         */
        $pagination = array_merge(
            array(
                // False.
                'false' => array(
                    'title'    => esc_html__( 'Disabled', '@@text_domain' ),
                    'controls' => array(),
                ),

                // Default.
                'default' => array(
                    'title'    => esc_html__( 'Default', '@@text_domain' ),
                    'controls' => array(),
                ),
            ),
            Visual_Portfolio_Extend::pagination()
        );

        // Extend specific pagination controls.
        foreach ( $pagination as $name => $pagin ) {
            if ( isset( $pagin['controls'] ) ) {
                $pagination[ $name ]['controls'] = Visual_Portfolio_Extend::pagination_controls( $name, $pagin['controls'] );
            }
        }

        // Pagination selector.
        $pagination_selector = array();
        foreach ( $pagination as $name => $pagin ) {
            $pagination_selector[ $name ] = $pagin['title'];
        }
        Visual_Portfolio_Controls::register(
            array(
                'category' => 'pagination',
                'type'     => 'select',
                'name'     => 'pagination_style',
                'default'  => 'default',
                'options'  => $pagination_selector,
            )
        );

        // pagination options.
        foreach ( $pagination as $name => $pagin ) {
            if ( ! isset( $pagin['controls'] ) ) {
                continue;
            }
            foreach ( $pagin['controls'] as $field ) {
                $field['category'] = 'pagination';
                $field['name']     = 'pagination_' . $name . '__' . $field['name'];

                // condition names prefix fix.
                if ( isset( $field['condition'] ) ) {
                    foreach ( $field['condition'] as $k => $cond ) {
                        if ( isset( $cond['control'] ) ) {
                            $field['condition'][ $k ]['control'] = $name . '_' . $cond['control'];
                        }
                    }
                }

                $field['condition'] = array_merge(
                    isset( $field['condition'] ) ? $field['condition'] : array(),
                    array(
                        array(
                            'control' => 'pagination_style',
                            'value'   => $name,
                        ),
                    )
                );
                Visual_Portfolio_Controls::register( $field );
            }
        }

        Visual_Portfolio_Controls::register(
            array(
                'category'  => 'pagination',
                'label'     => esc_html__( 'Type', '@@text_domain' ),
                'type'      => 'icons_selector',
                'name'      => 'pagination',
                'default'   => 'load-more',
                'options'   => array(
                    array(
                        'value' => 'paged',
                        'title' => esc_html__( 'Paged', '@@text_domain' ),
                        'icon'  => '<svg width="70" height="70" viewBox="0 0 70 70" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1.5" y="19.5" width="67" height="27" rx="4.5" stroke="currentColor" stroke-width="3"/><path d="M3 39V45C3 46.6569 4.34315 48 6 48H64C65.6569 48 67 46.6569 67 45V39L68.5 36C69.3284 36 70 36.6716 70 37.5V45C70 48.3137 67.3137 51 64 51H6C2.68629 51 0 48.3137 0 45V37.5C0 36.6716 0.671573 36 1.5 36L3 39Z" fill="currentColor"/><path d="M26 33H16" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M21 38L16 33L21 28" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M44 33H54" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M49 38L54 33L49 28" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
                    ),
                    array(
                        'value' => 'load-more',
                        'title' => esc_html__( 'Load More', '@@text_domain' ),
                        'icon'  => '<svg width="70" height="70" viewBox="0 0 70 70" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1.5" y="19.5" width="67" height="27" rx="4.5" stroke="currentColor" stroke-width="3"/><path d="M3 39V45C3 46.6569 4.34315 48 6 48H64C65.6569 48 67 46.6569 67 45V39L68.5 36C69.3284 36 70 36.6716 70 37.5V45C70 48.3137 67.3137 51 64 51H6C2.68629 51 0 48.3137 0 45V37.5C0 36.6716 0.671573 36 1.5 36L3 39Z" fill="currentColor"/><path d="M35 28L35 38" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M40 33L35 38L30 33" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
                    ),
                    array(
                        'value' => 'infinite',
                        'title' => esc_html__( 'Infinite', '@@text_domain' ),
                        'icon'  => '<svg width="70" height="70" viewBox="0 0 70 70" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="1.5" y="19.5" width="67" height="27" rx="4.5" stroke="currentColor" stroke-width="3"/><path d="M3 39V45C3 46.6569 4.34315 48 6 48H64C65.6569 48 67 46.6569 67 45V39L68.5 36C69.3284 36 70 36.6716 70 37.5V45C70 48.3137 67.3137 51 64 51H6C2.68629 51 0 48.3137 0 45V37.5C0 36.6716 0.671573 36 1.5 36L3 39Z" fill="currentColor"/><path d="M35 26V29" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path opacity="0.5" d="M35 37V40" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path opacity="0.875" d="M30 28L32 30" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path opacity="0.375" d="M38 36L40 38" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path opacity="0.75" d="M28 33H31" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path opacity="0.25" d="M39 33H42" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path opacity="0.625" d="M30 38L32 36" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path opacity="0.125" d="M38 30L40 28" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
                    ),
                ),
                'condition' => array(
                    array(
                        'control'  => 'pagination_style',
                        'operator' => '!=',
                        'value'    => 'false',
                    ),
                ),
            )
        );
        Visual_Portfolio_Controls::register(
            array(
                'category'    => 'pagination',
                'type'        => 'html',
                'description' => esc_html__( 'Note: you will see the "Load More" pagination in the preview. "Infinite" pagination will be visible on the site.', '@@text_domain' ),
                'name'        => 'pagination_infinite_notice',
                'condition'   => array(
                    array(
                        'control'  => 'pagination_style',
                        'operator' => '!=',
                        'value'    => 'false',
                    ),
                    array(
                        'control'  => 'pagination',
                        'operator' => '==',
                        'value'    => 'infinite',
                    ),
                ),
            )
        );
        Visual_Portfolio_Controls::register(
            array(
                'category'  => 'pagination',
                'type'      => 'align',
                'label'     => esc_html__( 'Align', '@@text_domain' ),
                'name'      => 'pagination_align',
                'default'   => 'center',
                'condition' => array(
                    array(
                        'control'  => 'pagination_style',
                        'operator' => '!=',
                        'value'    => 'false',
                    ),
                    array(
                        'control'  => 'pagination',
                        'operator' => '!=',
                        'value'    => 'false',
                    ),
                ),
            )
        );
        Visual_Portfolio_Controls::register(
            array(
                'category'  => 'pagination',
                'type'      => 'html',
                'label'     => esc_html__( 'Texts', '@@text_domain' ),
                'name'      => 'pagination_infinite_texts',
                'condition' => array(
                    array(
                        'control'  => 'pagination_style',
                        'operator' => '!=',
                        'value'    => 'false',
                    ),
                    array(
                        'control'  => 'pagination',
                        'operator' => '==',
                        'value'    => 'infinite',
                    ),
                ),
            )
        );
        Visual_Portfolio_Controls::register(
            array(
                'category'  => 'pagination',
                'type'      => 'html',
                'label'     => esc_html__( 'Texts', '@@text_domain' ),
                'name'      => 'pagination_load_more_texts',
                'condition' => array(
                    array(
                        'control'  => 'pagination_style',
                        'operator' => '!=',
                        'value'    => 'false',
                    ),
                    array(
                        'control'  => 'pagination',
                        'operator' => '==',
                        'value'    => 'load-more',
                    ),
                ),
            )
        );
        Visual_Portfolio_Controls::register(
            array(
                'category'    => 'pagination',
                'type'        => 'text',
                'name'        => 'pagination_infinite_text_load',
                'default'     => esc_attr__( 'Load More', '@@text_domain' ),
                'placeholder' => esc_attr__( 'Load more button label', '@@text_domain' ),
                'hint'        => esc_attr__( 'Load more button label', '@@text_domain' ),
                'hint_place'  => 'left',
                'condition'   => array(
                    array(
                        'control'  => 'pagination_style',
                        'operator' => '!=',
                        'value'    => 'false',
                    ),
                    array(
                        'control'  => 'pagination',
                        'operator' => '==',
                        'value'    => 'infinite',
                    ),
                ),
            )
        );
        Visual_Portfolio_Controls::register(
            array(
                'category'    => 'pagination',
                'type'        => 'text',
                'name'        => 'pagination_infinite_text_loading',
                'default'     => esc_attr__( 'Loading More...', '@@text_domain' ),
                'placeholder' => esc_attr__( 'Loading more button label', '@@text_domain' ),
                'hint'        => esc_attr__( 'Loading more button label', '@@text_domain' ),
                'hint_place'  => 'left',
                'condition'   => array(
                    array(
                        'control'  => 'pagination_style',
                        'operator' => '!=',
                        'value'    => 'false',
                    ),
                    array(
                        'control'  => 'pagination',
                        'operator' => '==',
                        'value'    => 'infinite',
                    ),
                ),
            )
        );
        Visual_Portfolio_Controls::register(
            array(
                'category'    => 'pagination',
                'type'        => 'text',
                'name'        => 'pagination_infinite_text_end_list',
                'default'     => esc_attr__( 'You’ve reached the end of the list', '@@text_domain' ),
                'placeholder' => esc_attr__( 'End of the list text', '@@text_domain' ),
                'hint'        => esc_attr__( 'End of the list text', '@@text_domain' ),
                'hint_place'  => 'left',
                'condition'   => array(
                    array(
                        'control'  => 'pagination_style',
                        'operator' => '!=',
                        'value'    => 'false',
                    ),
                    array(
                        'control'  => 'pagination',
                        'operator' => '==',
                        'value'    => 'infinite',
                    ),
                ),
            )
        );
        Visual_Portfolio_Controls::register(
            array(
                'category'    => 'pagination',
                'type'        => 'text',
                'name'        => 'pagination_load_more_text_load',
                'default'     => esc_attr__( 'Load More', '@@text_domain' ),
                'placeholder' => esc_attr__( 'Load more button label', '@@text_domain' ),
                'hint'        => esc_attr__( 'Load more button label', '@@text_domain' ),
                'hint_place'  => 'left',
                'condition'   => array(
                    array(
                        'control'  => 'pagination_style',
                        'operator' => '!=',
                        'value'    => 'false',
                    ),
                    array(
                        'control'  => 'pagination',
                        'operator' => '==',
                        'value'    => 'load-more',
                    ),
                ),
            )
        );
        Visual_Portfolio_Controls::register(
            array(
                'category'    => 'pagination',
                'type'        => 'text',
                'name'        => 'pagination_load_more_text_loading',
                'default'     => esc_attr__( 'Loading More...', '@@text_domain' ),
                'placeholder' => esc_attr__( 'Loading more button label', '@@text_domain' ),
                'hint'        => esc_attr__( 'Loading more button label', '@@text_domain' ),
                'hint_place'  => 'left',
                'condition'   => array(
                    array(
                        'control'  => 'pagination_style',
                        'operator' => '!=',
                        'value'    => 'false',
                    ),
                    array(
                        'control'  => 'pagination',
                        'operator' => '==',
                        'value'    => 'load-more',
                    ),
                ),
            )
        );
        Visual_Portfolio_Controls::register(
            array(
                'category'    => 'pagination',
                'type'        => 'text',
                'name'        => 'pagination_load_more_text_end_list',
                'default'     => esc_attr__( 'You’ve reached the end of the list', '@@text_domain' ),
                'placeholder' => esc_attr__( 'End of the list text', '@@text_domain' ),
                'hint'        => esc_attr__( 'End of the list text', '@@text_domain' ),
                'hint_place'  => 'left',
                'condition'   => array(
                    array(
                        'control'  => 'pagination_style',
                        'operator' => '!=',
                        'value'    => 'false',
                    ),
                    array(
                        'control'  => 'pagination',
                        'operator' => '==',
                        'value'    => 'load-more',
                    ),
                ),
            )
        );
        Visual_Portfolio_Controls::register(
            array(
                'category'  => 'pagination',
                'type'      => 'toggle',
                'label'     => esc_html__( 'Display Arrows', '@@text_domain' ),
                'name'      => 'pagination_paged__show_arrows',
                'default'   => true,
                'condition' => array(
                    array(
                        'control'  => 'pagination_style',
                        'operator' => '!=',
                        'value'    => 'false',
                    ),
                    array(
                        'control' => 'pagination',
                        'value'   => 'paged',
                    ),
                ),
            )
        );
        Visual_Portfolio_Controls::register(
            array(
                'category'    => 'pagination',
                'type'        => 'text',
                'name'        => 'pagination_paged__arrows_icon_prev',
                'default'     => 'fas fa-angle-left',
                'placeholder' => esc_attr__( 'Prev Arrow Icon', '@@text_domain' ),
                'hint'        => esc_attr__( 'Prev Arrow Icon', '@@text_domain' ),
                'hint_place'  => 'left',
                'condition'   => array(
                    array(
                        'control'  => 'pagination_style',
                        'operator' => '!=',
                        'value'    => 'false',
                    ),
                    array(
                        'control' => 'pagination',
                        'value'   => 'paged',
                    ),
                    array(
                        'control' => 'pagination_paged__show_arrows',
                    ),
                ),
            )
        );
        Visual_Portfolio_Controls::register(
            array(
                'category'    => 'pagination',
                'type'        => 'text',
                'name'        => 'pagination_paged__arrows_icon_next',
                'default'     => 'fas fa-angle-right',
                'placeholder' => esc_attr__( 'Next Arrow Icon', '@@text_domain' ),
                'hint'        => esc_attr__( 'Next Arrow Icon', '@@text_domain' ),
                'hint_place'  => 'left',
                'condition'   => array(
                    array(
                        'control'  => 'pagination_style',
                        'operator' => '!=',
                        'value'    => 'false',
                    ),
                    array(
                        'control' => 'pagination',
                        'value'   => 'paged',
                    ),
                    array(
                        'control' => 'pagination_paged__show_arrows',
                    ),
                ),
            )
        );
        Visual_Portfolio_Controls::register(
            array(
                'category'  => 'pagination',
                'type'      => 'toggle',
                'label'     => esc_html__( 'Display Numbers', '@@text_domain' ),
                'name'      => 'pagination_paged__show_numbers',
                'default'   => true,
                'condition' => array(
                    array(
                        'control'  => 'pagination_style',
                        'operator' => '!=',
                        'value'    => 'false',
                    ),
                    array(
                        'control' => 'pagination',
                        'value'   => 'paged',
                    ),
                ),
            )
        );

        /**
         * Code Editor
         */
        Visual_Portfolio_Controls::register(
            array(
                'category'     => 'custom_css',
                'type'         => 'code_editor',
                'name'         => 'custom_css',
                'max_lines'    => 20,
                'min_lines'    => 5,
                'mode'         => 'css',
                'mode'         => 'css',
                'allow_modal'  => true,
                'classes_tree' => true,
                'default'      => '',
                'description'  => '<p></p>
                <p>' . wp_kses_post( __( 'Use <code>selector</code> rule to change block styles.', '@@text_domain' ) ) . '</p>
                <p>' . esc_html__( 'Example:', '@@text_domain' ) . '</p>
                <pre class="vpf-control-pre-custom-css">
selector {
    background-color: #5C39A7;
}

selector p {
    color: #5C39A7;
}
</pre>',
            )
        );

        do_action( 'vpf_after_register_controls' );
    }

    /**
     * Add Title metabox
     *
     * @param object $post The post object.
     */
    public function add_name_metabox( $post ) {
        wp_nonce_field( basename( __FILE__ ), 'vp_layout_nonce' );

        Visual_Portfolio_Controls::get(
            array(
                'type'  => 'text',
                'label' => esc_html__( 'Name', '@@text_domain' ),
                'name'  => 'list_name',
                'value' => $post->post_title,
            )
        );

        Visual_Portfolio_Controls::get(
            array(
                'type'        => 'text',
                'label'       => esc_html__( 'Shortcode', '@@text_domain' ),
                'description' => esc_html__( 'Place the shortcode where you want to show the portfolio list.', '@@text_domain' ),
                'name'        => 'list_shortcode',
                'value'       => $post->ID ? '[visual_portfolio id="' . $post->ID . '" class=""]' : '',
                'readonly'    => true,
            )
        );

        ?>

        <style>
            #submitdiv {
                margin-top: -21px;
                border-top: none;
            }
            .vp-controls-styles,
            #post-body-content,
            #submitdiv .handlediv,
            #submitdiv .hndle,
            #minor-publishing,
            .wrap h1.wp-heading-inline,
            .page-title-action {
                display: none;
            }
        </style>
        <?php
    }

    /**
     * Find post types options for control.
     *
     * @return array
     */
    public function find_post_types_options() {
        check_ajax_referer( 'vp-ajax-nonce', 'nonce' );

        // post types list.
        $post_types = get_post_types(
            array(
                'public' => false,
                'name'   => 'attachment',
            ),
            'names',
            'NOT'
        );

        $post_types_selector = array();
        if ( is_array( $post_types ) && ! empty( $post_types ) ) {
            foreach ( $post_types as $post_type ) {
                $post_types_selector[ $post_type ] = array(
                    'value' => $post_type,
                    'title' => ucfirst( $post_type ),
                    'icon'  => '<svg width="70" height="70" viewBox="0 0 70 70" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 1.5H41.3787L61.5 21.6213V63C61.5 64.4587 60.9205 65.8576 59.8891 66.8891C58.8576 67.9205 57.4587 68.5 56 68.5H14C12.5413 68.5 11.1424 67.9205 10.1109 66.8891C9.07946 65.8576 8.5 64.4587 8.5 63V7C8.5 5.54131 9.07946 4.14236 10.1109 3.11091C11.1424 2.07946 12.5413 1.5 14 1.5Z" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M41 2V21H61" stroke="currentColor" stroke-width="3"/><path d="M49 39H21" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M28 25H21" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M49 53H21" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>',
                );
            }
        }
        $post_types_selector['ids']          = array(
            'value' => 'ids',
            'title' => esc_html__( 'Specific Posts', '@@text_domain' ),
            'icon'  => '<svg width="70" height="70" viewBox="0 0 70 70" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="40.5" y="1.5" width="28" height="28" rx="2.5" stroke="currentColor" stroke-width="3"/><rect x="1.5" y="1.5" width="28" height="28" rx="2.5" stroke="currentColor" stroke-width="3"/><path d="M8 17.7L11.4615 21L23 10" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><rect x="40.5" y="40.5001" width="28" height="28" rx="2.5" stroke="currentColor" stroke-width="3"/><path d="M47 56.7L50.4615 60L62 49" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><rect x="1.5" y="40.5001" width="28" height="28" rx="2.5" stroke="currentColor" stroke-width="3"/></svg>',
        );
        $post_types_selector['custom_query'] = array(
            'value' => 'custom_query',
            'title' => esc_html__( 'Custom Query', '@@text_domain' ),
            'icon'  => '<svg width="69" height="70" viewBox="0 0 69 70" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M37.6927 2.7236L37.6985 2.72691L61.8427 16.5264C61.8437 16.527 61.8447 16.5275 61.8457 16.5281C62.6645 17.0016 63.3446 17.6819 63.8179 18.501C64.2919 19.3211 64.5419 20.2514 64.5429 21.1987V48.8013C64.5419 49.7486 64.2919 50.6789 63.8179 51.499C63.3445 52.3182 62.6643 52.9985 61.8454 53.472C61.8445 53.4726 61.8436 53.4731 61.8427 53.4736L37.6985 67.2731L37.6927 67.2764C36.8718 67.7505 35.9407 68 34.9929 68C34.045 68 33.1139 67.7505 32.293 67.2764L32.2872 67.2731L8.14297 53.4736C8.1421 53.4731 8.14122 53.4726 8.14035 53.4721C7.32144 52.9986 6.6412 52.3182 6.16777 51.499C5.69396 50.6791 5.44396 49.7491 5.44286 48.8021V21.1979C5.44396 20.2509 5.69396 19.3209 6.16777 18.501C6.64114 17.6819 7.32128 17.0016 8.14007 16.5281C8.14104 16.5275 8.142 16.527 8.14297 16.5264L32.2872 2.72691L32.2872 2.72693L32.293 2.72359C33.1139 2.24955 34.045 2 34.9929 2C35.9407 2 36.8718 2.24955 37.6927 2.7236Z" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M35 67.5286V33.0286" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/><path d="M62.5 17L35 33L7 17" stroke="currentColor" stroke-width="3"/></svg>',
        );

        return array(
            'options' => $post_types_selector,
        );
    }

    /**
     * Find posts for select control.
     *
     * @param array $attributes - current block attributes.
     * @param array $control - current control.
     *
     * @return array
     */
    public function find_posts_select_control( $attributes, $control ) {
        check_ajax_referer( 'vp-ajax-nonce', 'nonce' );

        $result = array();

        // get selected options.
        $selected_ids = isset( $attributes[ $control['name'] ] ) ? $attributes[ $control['name'] ] : array();

        if ( ! isset( $_POST['q'] ) && empty( $selected_ids ) ) {
            return $result;
        }

        $post_type = isset( $attributes['posts_source'] ) ? sanitize_text_field( wp_unslash( $attributes['posts_source'] ) ) : 'any';

        if ( ! $post_type || 'custom_query' === $post_type || 'ids' === $post_type ) {
            $post_type = 'any';
        }

        if ( isset( $_POST['q'] ) ) {
            $the_query = new WP_Query(
                array(
                    's'              => sanitize_text_field( wp_unslash( $_POST['q'] ) ),
                    'posts_per_page' => 50,
                    'post_type'      => $post_type,
                )
            );
        } else {
            $the_query = new WP_Query(
                array(
                    'post__in'       => $selected_ids,
                    'posts_per_page' => 50,
                    'post_type'      => $post_type,
                )
            );
        }

        if ( $the_query->have_posts() ) {
            $result['options'] = array();

            while ( $the_query->have_posts() ) {
                $the_query->the_post();
                $result['options'][ (string) get_the_ID() ] = array(
                    'value'    => (string) get_the_ID(),
                    'label'    => get_the_title(),
                    'img'      => get_the_post_thumbnail_url( null, 'thumbnail' ),
                    'category' => get_post_type( get_the_ID() ),
                );
            }
            $the_query->reset_postdata();
        }

        return $result;
    }

    /**
     * Find taxonomies for select control.
     *
     * @param array $attributes - current block attributes.
     * @param array $control - current control.
     *
     * @return array
     */
    public function find_taxonomies_select_control( $attributes, $control ) {
        check_ajax_referer( 'vp-ajax-nonce', 'nonce' );

        $result = array();

        // get selected options.
        $selected_ids = isset( $attributes[ $control['name'] ] ) ? $attributes[ $control['name'] ] : array();

        if ( ! isset( $_POST['q'] ) && empty( $selected_ids ) ) {
            return $result;
        }

        if ( isset( $_POST['q'] ) ) {
            $post_type = isset( $_POST['post_type'] ) ? sanitize_text_field( wp_unslash( $_POST['post_type'] ) ) : 'any';

            if ( ! $post_type || 'custom_query' === $post_type || 'ids' === $post_type ) {
                $post_type = 'any';
            }

            // get taxonomies for selected post type or all available.
            if ( 'any' === $post_type ) {
                $post_type = get_post_types(
                    array(
                        'public' => false,
                        'name'   => 'attachment',
                    ),
                    'names',
                    'NOT'
                );
            }

            $taxonomies_names = get_object_taxonomies( $post_type );

            $the_query = new WP_Term_Query(
                array(
                    'taxonomy'   => $taxonomies_names,
                    'hide_empty' => false,
                    'search'     => sanitize_text_field( wp_unslash( $_POST['q'] ) ),
                )
            );
        } else {
            $the_query = new WP_Term_Query(
                array(
                    'include' => $selected_ids,
                )
            );
        }

        if ( ! empty( $the_query->terms ) ) {
            $result['options'] = array();

            foreach ( $the_query->terms as $term ) {
                $result['options'][ (string) $term->term_id ] = array(
                    'value'    => (string) $term->term_id,
                    'label'    => $term->name,
                    'category' => $term->taxonomy,
                );
            }
        }

        return $result;
    }

    /**
     * Find taxonomies ajax
     */
    public function ajax_find_oembed() {
        check_ajax_referer( 'vp-ajax-nonce', 'nonce' );
        if ( ! isset( $_POST['q'] ) ) {
            wp_die();
        }

        $oembed = visual_portfolio()->get_oembed_data( sanitize_text_field( wp_unslash( $_POST['q'] ) ) );

        if ( ! isset( $oembed ) || ! $oembed || ! isset( $oembed['html'] ) ) {
            wp_die();
        }

        // phpcs:ignore
        echo json_encode( $oembed );

        wp_die();
    }
}
