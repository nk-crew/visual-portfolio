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
                    'icon'     => '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="0.75" y="0.75" width="7.35714" height="7.35714" rx="1.25" stroke="currentColor" stroke-width="1.5" fill="transparent"/><rect x="11.8929" y="0.75" width="7.35714" height="7.35714" rx="1.25" stroke="currentColor" stroke-width="1.5" fill="transparent"/><rect x="11.8929" y="11.8929" width="7.35714" height="7.35714" rx="1.25" stroke="currentColor" stroke-width="1.5" fill="transparent"/><rect x="0.75" y="11.8929" width="7.35714" height="7.35714" rx="1.25" stroke="currentColor" stroke-width="1.5" fill="transparent"/></svg>',
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
                    'icon'     => '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="0.75" y="0.75" width="7.35714" height="5.35714" rx="1.25" stroke="currentColor" stroke-width="1.5" fill="transparent"/><rect x="11.8929" y="13.8928" width="7.35714" height="5.35715" rx="1.25" stroke="currentColor" stroke-width="1.5" fill="transparent"/><rect x="11.8929" y="0.75" width="7.35714" height="9.35714" rx="1.25" stroke="currentColor" stroke-width="1.5" fill="transparent"/><rect x="0.75" y="9.89285" width="7.35714" height="9.35715" rx="1.25" stroke="currentColor" stroke-width="1.5" fill="transparent"/></svg>',
                    'controls' => array(
                        array(
                            'type'    => 'range',
                            'label'   => esc_html__( 'Columns', '@@text_domain' ),
                            'name'    => 'columns',
                            'min'     => 1,
                            'max'     => 5,
                            'default' => 3,
                        ),
                        array(
                            'type'    => 'aspect_ratio',
                            'label'   => esc_html__( 'Images Aspect Ratio', '@@text_domain' ),
                            'name'    => 'images_aspect_ratio',
                            'default' => '',
                        ),
                    ),
                ),

                // Grid.
                'grid' => array(
                    'title'    => esc_html__( 'Grid', '@@text_domain' ),
                    'icon'     => '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="0.75" y="0.75" width="7.35714" height="6.5" rx="1.25" stroke="currentColor" stroke-width="1.5" fill="transparent"/><rect x="11.8929" y="13.3214" width="7.35714" height="5.92857" rx="1.25" stroke="currentColor" stroke-width="1.5" fill="transparent"/><rect x="11.8929" y="0.75" width="7.35714" height="9.07143" rx="1.25" stroke="currentColor" stroke-width="1.5" fill="transparent"/><rect x="0.75" y="13.3214" width="7.35714" height="5.92857" rx="1.25" stroke="currentColor" stroke-width="1.5" fill="transparent"/></svg>',
                    'controls' => array(
                        array(
                            'type'    => 'range',
                            'label'   => esc_html__( 'Columns', '@@text_domain' ),
                            'name'    => 'columns',
                            'min'     => 1,
                            'max'     => 5,
                            'default' => 3,
                        ),
                        array(
                            'type'    => 'aspect_ratio',
                            'label'   => esc_html__( 'Images Aspect Ratio', '@@text_domain' ),
                            'name'    => 'images_aspect_ratio',
                            'default' => '',
                        ),
                    ),
                ),

                // Justified.
                'justified' => array(
                    'title'    => esc_html__( 'Justified', '@@text_domain' ),
                    'icon'     => '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="0.75" y="19.25" width="7.35714" height="5.35714" rx="1.25" transform="rotate(-90 0.75 19.25)" stroke="currentColor" stroke-width="1.5" fill="transparent"/><rect x="13.8929" y="8.10715" width="7.35714" height="5.35714" rx="1.25" transform="rotate(-90 13.8929 8.10715)" stroke="currentColor" stroke-width="1.5" fill="transparent"/><rect x="0.75" y="8.10715" width="7.35714" height="9.35714" rx="1.25" transform="rotate(-90 0.75 8.10715)" stroke="currentColor" stroke-width="1.5" fill="transparent"/><rect x="9.89285" y="19.25" width="7.35714" height="9.35714" rx="1.25" transform="rotate(-90 9.89285 19.25)" stroke="currentColor" stroke-width="1.5" fill="transparent"/></svg>',
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

                // Slider / Carousel.
                'slider' => array(
                    'title'    => esc_html__( 'Carousel', '@@text_domain' ),
                    'icon'     => '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4.25" y="14.8214" width="11.6429" height="11.5" rx="1.25" transform="rotate(-90 4.25 14.8214)" stroke="currentColor" stroke-width="1.5" fill="transparent"/><path d="M2 4.5V13.5" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><path d="M18 4.5V13.5" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><circle cx="8.5" cy="17.25" r="0.75" fill="currentColor"/><circle cx="11.5" cy="17.25" r="0.75" fill="currentColor"/></svg>',
                    'controls' => array(
                        array(
                            'type'    => 'radio',
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
                            'type'      => 'checkbox',
                            'alongside' => esc_html__( 'Pause on Mouse Over', '@@text_domain' ),
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
                            'type'    => 'radio',
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
                            'type'      => 'radio',
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
                            'type'      => 'checkbox',
                            'alongside' => esc_html__( 'Centered Slides', '@@text_domain' ),
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
                            'type'      => 'checkbox',
                            'alongside' => esc_html__( 'Loop', '@@text_domain' ),
                            'name'      => 'loop',
                            'default'   => false,
                        ),
                        array(
                            'type'      => 'checkbox',
                            'alongside' => esc_html__( 'Free Scroll', '@@text_domain' ),
                            'name'      => 'free_mode',
                            'default'   => false,
                        ),
                        array(
                            'type'      => 'checkbox',
                            'alongside' => esc_html__( 'Free Scroll Sticky', '@@text_domain' ),
                            'name'      => 'free_mode_sticky',
                            'default'   => false,
                            'condition' => array(
                                array(
                                    'control' => 'free_mode',
                                ),
                            ),
                        ),
                        array(
                            'type'      => 'checkbox',
                            'alongside' => esc_html__( 'Display Arrows', '@@text_domain' ),
                            'name'      => 'arrows',
                            'default'   => true,
                        ),
                        array(
                            'type'      => 'checkbox',
                            'alongside' => esc_html__( 'Display Bullets', '@@text_domain' ),
                            'name'      => 'bullets',
                            'default'   => false,
                        ),
                        array(
                            'type'      => 'checkbox',
                            'alongside' => esc_html__( 'Dynamic Bullets', '@@text_domain' ),
                            'name'      => 'bullets_dynamic',
                            'default'   => false,
                            'condition' => array(
                                array(
                                    'control' => 'bullets',
                                ),
                            ),
                        ),
                        array(
                            'type'      => 'checkbox',
                            'alongside' => esc_html__( 'Mousewheel Control', '@@text_domain' ),
                            'name'      => 'mousewheel',
                            'default'   => false,
                        ),
                        array(
                            'type'      => 'checkbox',
                            'alongside' => esc_html__( 'Display Thumbnails', '@@text_domain' ),
                            'name'      => 'thumbnails',
                            'default'   => false,
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
                            'type'      => 'radio',
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
                            'type'      => 'radio',
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
                // Classic.
                'default' => array(
                    'title'            => esc_html__( 'Classic', '@@text_domain' ),
                    'icon'             => '<svg width="20" height="23" viewBox="0 0 20 23" fill="none" xmlns="http://www.w3.org/2000/svg"><line x1="5.89285" y1="22.25" x2="14.1071" y2="22.25" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><rect x="0.75" y="0.75" width="18.5" height="18.625" rx="1.25" stroke="currentColor" stroke-width="1.5" fill="transparent"/></svg>',
                    'builtin_controls' => array(
                        'images_rounded_corners' => true,
                        'show_title'             => true,
                        'show_categories'        => true,
                        'show_date'              => true,
                        'show_author'            => true,
                        'show_comments_count'    => true,
                        'show_views_count'       => true,
                        'show_reading_time'      => true,
                        'show_excerpt'           => true,
                        'show_icons'             => false,
                        'align'                  => true,
                    ),
                    'controls'         => array(
                        array(
                            'type'    => 'radio',
                            'label'   => esc_html__( 'Display Read More Button', '@@text_domain' ),
                            'name'    => 'show_read_more',
                            'default' => 'false',
                            'options' => array(
                                'false'    => esc_html__( 'Hide', '@@text_domain' ),
                                'true'     => esc_html__( 'Always Display', '@@text_domain' ),
                                'more_tag' => esc_html__( 'Display when used `More tag` in the post', '@@text_domain' ),
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

                // Fade.
                'fade' => array(
                    'title'            => esc_html__( 'Fade', '@@text_domain' ),
                    'icon'             => '<svg width="20" height="23" viewBox="0 0 20 23" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="0.75" y="0.75" width="18.5" height="18.625" rx="1.25" stroke="currentColor" stroke-width="1.5" fill="transparent"/><line x1="5.89285" y1="10.25" x2="14.1071" y2="10.25" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/></svg>',
                    'builtin_controls' => array(
                        'images_rounded_corners' => true,
                        'show_title'             => true,
                        'show_categories'        => true,
                        'show_date'              => true,
                        'show_author'            => true,
                        'show_comments_count'    => true,
                        'show_views_count'       => true,
                        'show_reading_time'      => true,
                        'show_excerpt'           => true,
                        'show_icons'             => true,
                        'align'                  => 'extended',
                    ),
                    'controls'         => array(
                        array(
                            'type'  => 'color',
                            'label' => esc_html__( 'Overlay Background Color', '@@text_domain' ),
                            'name'  => 'bg_color',
                            'alpha' => true,
                            'style' => array(
                                array(
                                    'element'  => '.vp-portfolio__items-style-fade',
                                    'property' => '--vp-items-style-fade--overlay__background-color',
                                ),
                            ),
                        ),
                        array(
                            'type'  => 'color',
                            'label' => esc_html__( 'Overlay Text Color', '@@text_domain' ),
                            'name'  => 'text_color',
                            'alpha' => true,
                            'style' => array(
                                array(
                                    'element'  => '.vp-portfolio__items-style-fade',
                                    'property' => '--vp-items-style-fade--overlay__color',
                                ),
                            ),
                        ),
                    ),
                ),

                // Fly.
                'fly' => array(
                    'title'            => esc_html__( 'Fly', '@@text_domain' ),
                    'icon'             => '<svg width="20" height="23" viewBox="0 0 20 23" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="0.75" y="0.75" width="18.5" height="18.625" rx="1.25" stroke="currentColor" stroke-width="1.5" fill="transparent"/><line x1="0.75" y1="9.8875" x2="4.39286" y2="9.8875" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><line x1="10.4643" y1="0.75" x2="10.4643" y2="19.375" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/></svg>',
                    'builtin_controls' => array(
                        'images_rounded_corners' => true,
                        'show_title'             => true,
                        'show_categories'        => true,
                        'show_date'              => true,
                        'show_author'            => true,
                        'show_comments_count'    => true,
                        'show_views_count'       => true,
                        'show_reading_time'      => true,
                        'show_excerpt'           => true,
                        'show_icons'             => true,
                        'align'                  => 'extended',
                    ),
                    'controls'         => array(
                        array(
                            'type'  => 'color',
                            'label' => esc_html__( 'Overlay Background Color', '@@text_domain' ),
                            'name'  => 'bg_color',
                            'alpha' => true,
                            'style' => array(
                                array(
                                    'element'  => '.vp-portfolio__items-style-fly',
                                    'property' => '--vp-items-style-fly--overlay__background-color',
                                ),
                            ),
                        ),
                        array(
                            'type'  => 'color',
                            'label' => esc_html__( 'Overlay Text Color', '@@text_domain' ),
                            'name'  => 'text_color',
                            'alpha' => true,
                            'style' => array(
                                array(
                                    'element'  => '.vp-portfolio__items-style-fly',
                                    'property' => '--vp-items-style-fly--overlay__color',
                                ),
                            ),
                        ),
                    ),
                ),

                // Emerge.
                'emerge' => array(
                    'title'            => esc_html__( 'Emerge', '@@text_domain' ),
                    'icon'             => '<svg width="21" height="23" viewBox="0 0 21 23" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="0.75" y="0.75" width="18.5" height="18.625" rx="1.25" stroke="currentColor" stroke-width="1.5" fill="transparent"/><line x1="0.75" y1="-0.75" x2="19.283" y2="-0.75" transform="matrix(0.998303 0.0582344 -0.0575156 0.998345 0 13.225)" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><line x1="5.89285" y1="16.2125" x2="14.1071" y2="16.2125" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/></svg>',
                    'builtin_controls' => array(
                        'images_rounded_corners' => true,
                        'show_title'             => true,
                        'show_categories'        => true,
                        'show_date'              => true,
                        'show_author'            => true,
                        'show_comments_count'    => true,
                        'show_views_count'       => true,
                        'show_reading_time'      => true,
                        'show_excerpt'           => true,
                        'show_icons'             => false,
                        'align'                  => true,
                    ),
                    'controls'         => array(
                        array(
                            'type'  => 'color',
                            'label' => esc_html__( 'Overlay Background Color', '@@text_domain' ),
                            'name'  => 'bg_color',
                            'alpha' => true,
                            'style' => array(
                                array(
                                    'element'  => '.vp-portfolio__items-style-emerge',
                                    'property' => '--vp-items-style-emerge--overlay__background-color',
                                ),
                            ),
                        ),
                        array(
                            'type'  => 'color',
                            'label' => esc_html__( 'Overlay Text Color', '@@text_domain' ),
                            'name'  => 'text_color',
                            'alpha' => true,
                            'style' => array(
                                array(
                                    'element'  => '.vp-portfolio__items-style-emerge',
                                    'property' => '--vp-items-style-emerge--overlay__color',
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
         * Categories.
         */
        Visual_Portfolio_Controls::register_categories(
            array(
                'content-source'               => array(
                    'title'     => esc_html__( 'Content Source', '@@text_domain' ),
                    'is_opened' => true,
                ),
                'content-source-additional'    => array(
                    'title'     => '',
                    'is_opened' => true,
                ),
                'content-source-post-based'    => array(
                    'title'     => esc_html__( 'Posts Settings', '@@text_domain' ),
                    'is_opened' => true,
                ),
                'content-source-images'        => array(
                    'title'     => esc_html__( 'Images Settings', '@@text_domain' ),
                    'is_opened' => true,
                ),
                'content-source-social-stream' => array(
                    'title'     => esc_html__( 'Social Stream Settings', '@@text_domain' ),
                    'is_opened' => true,
                ),
                'layout-elements'              => array(
                    'title'     => esc_html__( 'Layout', '@@text_domain' ),
                    'is_opened' => true,
                ),
                'items-style'                  => array(
                    'title'     => esc_html__( 'Items Style', '@@text_domain' ),
                    'is_opened' => false,
                ),
                'items-click-action'           => array(
                    'title'     => esc_html__( 'Items Click Action', '@@text_domain' ),
                    'is_opened' => false,
                ),
                'custom_css'                   => array(
                    'title'     => esc_html__( 'Custom CSS', '@@text_domain' ),
                    'is_opened' => false,
                ),
            )
        );

        /**
         * Enabled setup wizard.
         */
        Visual_Portfolio_Controls::register(
            array(
                'type'    => 'hidden',
                'name'    => 'setup_wizard',
                'default' => '',
            )
        );

        /**
         * Content Source
         */
        Visual_Portfolio_Controls::register(
            array(
                'category'     => 'content-source',
                'type'         => 'icons_selector',
                'name'         => 'content_source',
                'setup_wizard' => true,
                'default'      => '',
                'options'      => array(
                    'post-based' => array(
                        'value' => 'post-based',
                        'title' => esc_html__( 'Posts', '@@text_domain' ),
                        'icon'  => '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="0.75" y="0.75" width="18.5" height="18.5" rx="1.25" stroke="currentColor" stroke-width="1.5" fill="transparent"/><path d="M15.5 4.5H11.5" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><path d="M15.5 8H11.5" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><path d="M15.5 11.5H11.5" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><path d="M15.5 15H4.5" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><mask id="path-7-inside-1" fill="white"><rect x="3.5" y="3.5" width="6" height="8.8" rx="1"/></mask><rect x="3.5" y="3.5" width="6" height="8.8" rx="1" stroke="currentColor" stroke-width="3" mask="url(#path-7-inside-1)"/></svg>',
                    ),
                    'images' => array(
                        'value' => 'images',
                        'title' => esc_html__( 'Images', '@@text_domain' ),
                        'icon'  => '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16.0428 14.3315V1.71123C16.0428 0.748663 15.2941 0 14.3315 0H1.71123C0.748663 0 0 0.748663 0 1.71123V14.3315C0 15.2941 0.748663 16.0428 1.71123 16.0428H14.3315C15.2941 16.0428 16.0428 15.2941 16.0428 14.3315ZM1.60428 1.71123C1.60428 1.60428 1.71123 1.60428 1.71123 1.60428H14.3315C14.4385 1.60428 14.4385 1.71123 14.4385 1.71123V9.62567L11.9786 7.80749C11.6578 7.59358 11.3369 7.59358 11.016 7.80749L7.91444 10.0535L5.34759 8.87701C5.13369 8.77005 4.81283 8.77005 4.59893 8.87701L1.49733 10.4813V1.71123H1.60428ZM1.60428 14.3315V12.4064L5.02674 10.5882L7.59358 11.8717C7.80749 11.9786 8.12834 11.9786 8.4492 11.7647L11.4438 9.62567L14.4385 11.7647V14.4385C14.4385 14.5455 14.3315 14.5455 14.3315 14.5455H1.71123C1.71123 14.4385 1.60428 14.3315 1.60428 14.3315Z" fill="currentColor"/><path fill-rule="evenodd" clip-rule="evenodd" d="M19.25 5.75C19.6642 5.75 20 6.08579 20 6.5C20 6.91421 20 17.25 20 17.25C20 18.7688 18.7688 20 17.25 20H4.27C3.85579 20 3.52 19.6642 3.52 19.25C3.52 18.8358 3.85579 18.5 4.27 18.5H17.25C17.9404 18.5 18.5 17.9404 18.5 17.25C18.5 17.25 18.5 6.91421 18.5 6.5C18.5 6.08579 18.8358 5.75 19.25 5.75Z" fill="currentColor"/></svg>',
                    ),
                    // phpcs:ignore
                    /*
                        TODO: PRO
                        'social-stream' => array(
                            'value' => 'social-stream',
                            'title' => esc_html__( 'Social', '@@text_domain' ),
                            'icon'  => '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15.1429 6.57142C16.563 6.57142 17.7143 5.42015 17.7143 3.99999C17.7143 2.57983 16.563 1.42856 15.1429 1.42856C13.7227 1.42856 12.5714 2.57983 12.5714 3.99999C12.5714 5.42015 13.7227 6.57142 15.1429 6.57142Z" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.85715 12.5714C6.27731 12.5714 7.42858 11.4201 7.42858 9.99999C7.42858 8.57983 6.27731 7.42856 4.85715 7.42856C3.43699 7.42856 2.28572 8.57983 2.28572 9.99999C2.28572 11.4201 3.43699 12.5714 4.85715 12.5714Z" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><path d="M15.1429 18.5714C16.563 18.5714 17.7143 17.4201 17.7143 16C17.7143 14.5798 16.563 13.4286 15.1429 13.4286C13.7227 13.4286 12.5714 14.5798 12.5714 16C12.5714 17.4201 13.7227 18.5714 15.1429 18.5714Z" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><path d="M7.14285 11.4286L12.8571 14.5714" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><path d="M12.8571 5.42856L7.14285 8.57141" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/></svg>',
                        ),
                    */
                ),
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
                'type'           => 'select',
                'label'          => esc_html__( 'Excluded Posts', '@@text_domain' ),
                'name'           => 'posts_excluded_ids',
                'default'        => array(),
                'value_callback' => array( $this, 'find_posts_select_control' ),
                'searchable'     => true,
                'multiple'       => true,
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
                    array(
                        'control'  => 'posts_source',
                        'operator' => '!=',
                        'value'    => 'current_query',
                    ),
                ),
            )
        );
        Visual_Portfolio_Controls::register(
            array(
                'category'       => 'content-source-post-based',
                'type'           => 'select',
                'label'          => esc_html__( 'Taxonomies', '@@text_domain' ),
                'name'           => 'posts_taxonomies',
                'default'        => array(),
                'value_callback' => array( $this, 'find_taxonomies_select_control' ),
                'searchable'     => true,
                'multiple'       => true,
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
                    array(
                        'control'  => 'posts_source',
                        'operator' => '!=',
                        'value'    => 'current_query',
                    ),
                ),
            )
        );
        Visual_Portfolio_Controls::register(
            array(
                'category'      => 'content-source-post-based',
                'type'          => 'radio',
                'label'         => esc_html__( 'Taxonomies Relation', '@@text_domain' ),
                'name'          => 'posts_taxonomies_relation',
                'default'       => 'or',
                'options'       => array(
                    'or'  => esc_html__( 'OR', '@@text_domain' ),
                    'and' => esc_html__( 'AND', '@@text_domain' ),
                ),
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
                    array(
                        'control'  => 'posts_source',
                        'operator' => '!=',
                        'value'    => 'current_query',
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
                    'post_date'     => esc_html__( 'Date', '@@text_domain' ),
                    'title'         => esc_html__( 'Title', '@@text_domain' ),
                    'id'            => esc_html__( 'ID', '@@text_domain' ),
                    'comment_count' => esc_html__( 'Comments Count', '@@text_domain' ),
                    'modified'      => esc_html__( 'Modified', '@@text_domain' ),
                    'menu_order'    => esc_html__( 'Menu Order', '@@text_domain' ),
                    'rand'          => esc_html__( 'Random', '@@text_domain' ),
                ),
                'condition'     => array(
                    array(
                        'control'  => 'posts_source',
                        'operator' => '!=',
                        'value'    => 'custom_query',
                    ),
                    array(
                        'control'  => 'posts_source',
                        'operator' => '!=',
                        'value'    => 'current_query',
                    ),
                ),
            )
        );
        Visual_Portfolio_Controls::register(
            array(
                'category'      => 'content-source-post-based',
                'type'          => 'radio',
                'label'         => esc_html__( 'Order Direction', '@@text_domain' ),
                'name'          => 'posts_order_direction',
                'default'       => 'desc',
                'options'       => array(
                    'asc'  => esc_html__( 'ASC', '@@text_domain' ),
                    'desc' => esc_html__( 'DESC', '@@text_domain' ),
                ),
                'condition'     => array(
                    array(
                        'control'  => 'posts_source',
                        'operator' => '!=',
                        'value'    => 'custom_query',
                    ),
                    array(
                        'control'  => 'posts_source',
                        'operator' => '!=',
                        'value'    => 'current_query',
                    ),
                ),
            )
        );
        Visual_Portfolio_Controls::register(
            array(
                'category'    => 'content-source-post-based',
                'type'        => 'checkbox',
                'alongside'   => esc_html__( 'Avoid Duplicates', '@@text_domain' ),
                'description' => esc_html__( 'Enable to avoid duplicate posts from showing up. This only effects the frontend', '@@text_domain' ),
                'name'        => 'posts_avoid_duplicate_posts',
                'default'     => false,
            )
        );
        Visual_Portfolio_Controls::register(
            array(
                'category'    => 'content-source-post-based',
                'type'        => 'range',
                'label'       => esc_html__( 'Offset', '@@text_domain' ),
                'description' => esc_html__( 'Use this setting to skip over posts (e.g. `2` to skip over 2 posts)', '@@text_domain' ),
                'name'        => 'posts_offset',
                'min'         => 0,
                'condition'   => array(
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
                    array(
                        'control'  => 'posts_source',
                        'operator' => '!=',
                        'value'    => 'current_query',
                    ),
                ),
            )
        );
        Visual_Portfolio_Controls::register(
            array(
                'category'    => 'content-source-post-based',
                'type'        => 'pro_note',
                'name'        => 'additional_query_settings_pro',
                'label'       => esc_html__( 'PRO Feature', '@@text_domain' ),
                'description' => esc_html__( 'Additional query settings.', '@@text_domain' ),
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
                'setup_wizard'    => true,
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
                    'author' => array(
                        'type'    => 'text',
                        'label'   => esc_html__( 'Author Name', '@@text_domain' ),
                        'default' => '',
                    ),
                    'author_url'  => array(
                        'type'    => 'text',
                        'label'   => esc_html__( 'Author URL', '@@text_domain' ),
                        'default' => '',
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
            )
        );
        Visual_Portfolio_Controls::register(
            array(
                'category'      => 'content-source-images',
                'type'          => 'radio',
                'label'         => esc_html__( 'Order Direction', '@@text_domain' ),
                'name'          => 'images_order_direction',
                'default'       => 'asc',
                'options'       => array(
                    'asc'  => esc_html__( 'ASC', '@@text_domain' ),
                    'desc' => esc_html__( 'DESC', '@@text_domain' ),
                ),
            )
        );

        /**
         * Content Source Social Stream.
         */
        Visual_Portfolio_Controls::register(
            array(
                'category'    => 'content-source-social-stream',
                'type'        => 'pro_note',
                'name'        => 'social_pro_note',
                'label'       => esc_html__( 'PRO Feature', '@@text_domain' ),
                'description' => esc_html__( 'Social feeds such as Instagram, Youtube, etc...', '@@text_domain' ),
            )
        );

        /**
         * Content Source Additional Settings.
         */
        Visual_Portfolio_Controls::register(
            array(
                'category'    => 'content-source-additional',
                'type'        => 'range',
                'label'       => esc_html__( 'Items Per Page', '@@text_domain' ),
                'name'        => 'items_count',
                'default'     => 6,
                'min'         => 1,
                'max'         => 50,
            )
        );

        Visual_Portfolio_Controls::register(
            array(
                'category'   => 'content-source-additional',
                'type'       => 'checkbox',
                'alongside'  => esc_html__( 'Stretch', '@@text_domain' ),
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
                            if ( strpos( $cond['control'], 'GLOBAL_' ) === 0 ) {
                                $field['condition'][ $k ]['control'] = str_replace( 'GLOBAL_', '', $cond['control'] );
                            } else {
                                $field['condition'][ $k ]['control'] = $name . '_' . $cond['control'];
                            }
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
                'default'  => 'fade',
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
                                'type'    => 'range',
                                'label'   => esc_html__( 'Images Rounded Corners', '@@text_domain' ),
                                'name'    => 'images_rounded_corners',
                                'min'     => 0,
                                'max'     => 50,
                                'default' => 0,
                                'style'   => array(
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
                                'type'      => 'checkbox',
                                'alongside' => esc_html__( 'Display Title', '@@text_domain' ),
                                'name'      => 'show_title',
                                'default'   => true,
                            );
                            break;
                        case 'show_categories':
                            $new_fields[] = array(
                                'type'      => 'checkbox',
                                'alongside' => esc_html__( 'Display Categories', '@@text_domain' ),
                                'name'      => 'show_categories',
                                'default'   => true,
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
                                'type'    => 'radio',
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
                        case 'show_author':
                            $new_fields[] = array(
                                'type'      => 'checkbox',
                                'alongside' => esc_html__( 'Display Author', '@@text_domain' ),
                                'name'      => 'show_author',
                                'default'   => false,
                            );
                            break;
                        case 'show_comments_count':
                            $new_fields[] = array(
                                'type'      => 'checkbox',
                                'alongside' => esc_html__( 'Display Comments Count', '@@text_domain' ),
                                'name'      => 'show_comments_count',
                                'default'   => false,
                                'condition' => array(
                                    array(
                                        'control' => 'GLOBAL_content_source',
                                        'value'   => 'post-based',
                                    ),
                                ),
                            );
                            break;
                        case 'show_views_count':
                            $new_fields[] = array(
                                'type'      => 'checkbox',
                                'alongside' => esc_html__( 'Display Views Count', '@@text_domain' ),
                                'name'      => 'show_views_count',
                                'default'   => false,
                                'condition' => array(
                                    array(
                                        'control' => 'GLOBAL_content_source',
                                        'value'   => 'post-based',
                                    ),
                                ),
                            );
                            break;
                        case 'show_reading_time':
                            $new_fields[] = array(
                                'type'      => 'checkbox',
                                'alongside' => esc_html__( 'Display Reading Time', '@@text_domain' ),
                                'name'      => 'show_reading_time',
                                'default'   => false,
                                'condition' => array(
                                    array(
                                        'control' => 'GLOBAL_content_source',
                                        'value'   => 'post-based',
                                    ),
                                ),
                            );
                            break;
                        case 'show_excerpt':
                            $new_fields[] = array(
                                'type'      => 'checkbox',
                                'alongside' => esc_html__( 'Display Excerpt', '@@text_domain' ),
                                'name'      => 'show_excerpt',
                                'default'   => false,
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
                                'type'      => 'checkbox',
                                'alongside' => esc_html__( 'Display Icon', '@@text_domain' ),
                                'name'      => 'show_icon',
                                'default'   => false,
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
                            if ( strpos( $cond['control'], 'GLOBAL_' ) === 0 ) {
                                $field['condition'][ $k ]['control'] = str_replace( 'GLOBAL_', '', $cond['control'] );
                            } else {
                                $field['condition'][ $k ]['control'] = 'items_style_' . $name . '__' . $cond['control'];
                            }
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
                        'icon'  => '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="0.75" y="0.75" width="18.5" height="18.5" rx="9.25" stroke="currentColor" stroke-width="1.5" fill="transparent"/><line x1="0.75" y1="-0.75" x2="18.2409" y2="-0.75" transform="matrix(0.707107 0.707107 0.707107 -0.707107 4.15475 3.14285)" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/></svg>',
                    ),
                    array(
                        'value' => 'url',
                        'title' => esc_html__( 'URL', '@@text_domain' ),
                        'icon'  => '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8.28572 10.9975C8.67611 11.53 9.17418 11.9706 9.74614 12.2894C10.3181 12.6082 10.9506 12.7978 11.6007 12.8453C12.2508 12.8928 12.9033 12.7971 13.5139 12.5647C14.1246 12.3323 14.6791 11.9686 15.1399 11.4983L17.867 8.71597C18.6949 7.84137 19.153 6.66999 19.1427 5.45411C19.1323 4.23824 18.6543 3.07515 17.8116 2.21537C16.9689 1.35558 15.8289 0.867884 14.6372 0.857319C13.4454 0.846753 12.2973 1.31416 11.4401 2.15888L9.87654 3.74482" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><path d="M11.7143 9.0025C11.3239 8.47002 10.8258 8.02943 10.2539 7.71061C9.68192 7.39179 9.04944 7.20221 8.39935 7.1547C7.74926 7.1072 7.09676 7.2029 6.4861 7.43531C5.87545 7.66771 5.32093 8.03139 4.86015 8.50167L2.13304 11.284C1.30509 12.1586 0.846963 13.33 0.857319 14.5459C0.867675 15.7618 1.34569 16.9248 2.1884 17.7846C3.03112 18.6444 4.17111 19.1321 5.36284 19.1427C6.55457 19.1532 7.7027 18.6858 8.55993 17.8411L10.1144 16.2552" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/></svg>',
                    ),
                    array(
                        'value' => 'popup_gallery',
                        'title' => esc_html__( 'Popup', '@@text_domain' ),
                        'icon'  => '<svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="6.75" y="14.25" width="13.5" height="13.5" rx="1.25" transform="rotate(-90 6.75 14.25)" stroke="currentColor" stroke-width="1.5" fill="transparent"/><path d="M2 19L4.29088 16.7396" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 15.5L5.51523 15.5152L5.5 18" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/></svg>',
                    ),
                ),
            )
        );

        // url.
        Visual_Portfolio_Controls::register(
            array(
                'category'  => 'items-click-action',
                'type'      => 'radio',
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
        Visual_Portfolio_Controls::register(
            array(
                'category'  => 'items-click-action',
                'type'      => 'text',
                'label'     => esc_html__( 'Rel', '@@text_domain' ),
                'name'      => 'items_click_action_url_rel',
                'default'   => '',
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
        Visual_Portfolio_Controls::register(
            array(
                'category'    => 'items-click-action',
                'type'        => 'pro_note',
                'name'        => 'items_click_action_pro_note',
                'label'       => esc_html__( 'PRO Feature', '@@text_domain' ),
                'description' => esc_html__( 'Display pages in popup iframe, not just images.', '@@text_domain' ),
                'condition'   => array(
                    array(
                        'control' => 'items_click_action',
                        'value'   => 'popup_gallery',
                    ),
                ),
            )
        );

        /**
         * Layout Elements.
         */
        Visual_Portfolio_Controls::register(
            array(
                'category'  => 'layout-elements',
                'type'      => 'elements_selector',
                'name'      => 'layout_elements',
                'locations' => array(
                    'top'    => array(
                        'title' => esc_html__( 'Top', '@@text_domain' ),
                        'align' => array(
                            'left',
                            'center',
                            'right',
                            'between',
                        ),
                    ),
                    'items'  => array(),
                    'bottom' => array(
                        'title' => esc_html__( 'Bottom', '@@text_domain' ),
                        'align' => array(
                            'left',
                            'center',
                            'right',
                            'between',
                        ),
                    ),
                ),
                'default'   => array(
                    'top'    => array(
                        'elements' => array(),
                        'align'    => 'center',
                    ),
                    'items'  => array(
                        'elements' => array( 'items' ),
                    ),
                    'bottom' => array(
                        'elements' => array(),
                        'align'    => 'center',
                    ),
                ),
                'options'   => array(
                    'filter' => array(
                        'title'             => esc_html__( 'Filter', '@@text_domain' ),
                        'allowed_locations' => array( 'top' ),
                        'category'          => 'filter',
                        'render_callback'   => 'Visual_Portfolio_Get::filter',
                    ),
                    'sort' => array(
                        'title'             => esc_html__( 'Sort', '@@text_domain' ),
                        'allowed_locations' => array( 'top' ),
                        'category'          => 'sort',
                        'render_callback'   => 'Visual_Portfolio_Get::sort',
                    ),

                    // phpcs:ignore
                    /*
                        TODO: PRO
                        'search' => array(
                            'title'             => esc_html__( 'Search', '@@text_domain' ),
                            'allowed_locations' => array( 'top' ),
                            'category'          => 'search',
                            'is_pro'            => true,
                        ),
                    */
                    'items' => array(
                        'title'             => esc_html__( 'Items', '@@text_domain' ),
                        'allowed_locations' => array( 'items' ),
                        'category'          => 'layouts',
                    ),
                    'pagination' => array(
                        'title'             => esc_html__( 'Pagination', '@@text_domain' ),
                        'allowed_locations' => array( 'bottom' ),
                        'category'          => 'pagination',
                        'render_callback'   => 'Visual_Portfolio_Get::pagination',
                    ),
                ),
            )
        );

        /**
         * Filter.
         */
        $filters = array_merge(
            array(
                // Minimal.
                'minimal' => array(
                    'title'    => esc_html__( 'Minimal', '@@text_domain' ),
                    'icon'     => '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0.879261 8.13636V12.5H1.77415V9.64915H1.81037L2.93963 12.4787H3.54901L4.67827 9.6598H4.71449V12.5H5.60938V8.13636H4.47159L3.26989 11.0682H3.21875L2.01705 8.13636H0.879261ZM10.0194 8.13636H9.10103V10.8807H9.06268L7.17915 8.13636H6.3695V12.5H7.29208V9.75355H7.32404L9.22248 12.5H10.0194V8.13636ZM10.7816 8.13636V12.5H11.6765V9.64915H11.7127L12.842 12.4787H13.4513L14.5806 9.6598H14.6168V12.5H15.5117V8.13636H14.3739L13.1722 11.0682H13.1211L11.9194 8.13636H10.7816ZM16.2718 12.5H19.0652V11.7393H17.1944V8.13636H16.2718V12.5Z" fill="currentColor"/></svg>',
                    'controls' => array(),
                ),

                // Classic.
                'default' => array(
                    'title'    => esc_html__( 'Classic', '@@text_domain' ),
                    'icon'     => '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="0.75" y="5.89286" width="18.5" height="7.07143" rx="1.25" stroke="currentColor" stroke-width="1.5" fill="transparent"/><path d="M0.857143 11.1071V12.8214C0.857143 13.2948 1.2409 13.6786 1.71429 13.6786H18.2857C18.7591 13.6786 19.1429 13.2948 19.1429 12.8214V11.1071L19.5714 10.25C19.8081 10.25 20 10.4419 20 10.6786V12.8214C20 13.7682 19.2325 14.5357 18.2857 14.5357H1.71429C0.767512 14.5357 0 13.7682 0 12.8214V10.6786C0 10.4419 0.191878 10.25 0.428571 10.25L0.857143 11.1071Z" fill="currentColor"/></svg>',
                    'controls' => array(),
                ),

                // Dropdown.
                'dropdown' => array(
                    'title'    => esc_html__( 'Dropdown', '@@text_domain' ),
                    'icon'     => '<svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11 20.4286C16.2073 20.4286 20.4286 16.2073 20.4286 11C20.4286 5.79274 16.2073 1.57143 11 1.57143C5.79274 1.57143 1.57143 5.79274 1.57143 11C1.57143 16.2073 5.79274 20.4286 11 20.4286Z" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 9.85714L11 13.8571L15 9.85714" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/></svg>',
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
                'default'  => 'minimal',
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
                            if ( strpos( $cond['control'], 'GLOBAL_' ) === 0 ) {
                                $field['condition'][ $k ]['control'] = str_replace( 'GLOBAL_', '', $cond['control'] );
                            } else {
                                $field['condition'][ $k ]['control'] = $name . '_' . $cond['control'];
                            }
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
                'type'      => 'checkbox',
                'alongside' => esc_html__( 'Display Count', '@@text_domain' ),
                'name'      => 'filter_show_count',
                'default'   => false,
            )
        );
        Visual_Portfolio_Controls::register(
            array(
                'category'  => 'filter',
                'type'      => 'text',
                'label'     => esc_html__( 'All Button Text', '@@text_domain' ),
                'name'      => 'filter_text_all',
                'default'   => esc_attr__( 'All', '@@text_domain' ),
            )
        );

        /**
         * Sort.
         */
        $sorts = array_merge(
            array(
                // Minimal.
                'minimal' => array(
                    'title'    => esc_html__( 'Minimal', '@@text_domain' ),
                    'icon'     => '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0.879261 8.13636V12.5H1.77415V9.64915H1.81037L2.93963 12.4787H3.54901L4.67827 9.6598H4.71449V12.5H5.60938V8.13636H4.47159L3.26989 11.0682H3.21875L2.01705 8.13636H0.879261ZM10.0194 8.13636H9.10103V10.8807H9.06268L7.17915 8.13636H6.3695V12.5H7.29208V9.75355H7.32404L9.22248 12.5H10.0194V8.13636ZM10.7816 8.13636V12.5H11.6765V9.64915H11.7127L12.842 12.4787H13.4513L14.5806 9.6598H14.6168V12.5H15.5117V8.13636H14.3739L13.1722 11.0682H13.1211L11.9194 8.13636H10.7816ZM16.2718 12.5H19.0652V11.7393H17.1944V8.13636H16.2718V12.5Z" fill="currentColor"/></svg>',
                    'controls' => array(),
                ),

                // Classic.
                'default' => array(
                    'title'    => esc_html__( 'Classic', '@@text_domain' ),
                    'icon'     => '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="0.75" y="5.89286" width="18.5" height="7.07143" rx="1.25" stroke="currentColor" stroke-width="1.5" fill="transparent"/><path d="M0.857143 11.1071V12.8214C0.857143 13.2948 1.2409 13.6786 1.71429 13.6786H18.2857C18.7591 13.6786 19.1429 13.2948 19.1429 12.8214V11.1071L19.5714 10.25C19.8081 10.25 20 10.4419 20 10.6786V12.8214C20 13.7682 19.2325 14.5357 18.2857 14.5357H1.71429C0.767512 14.5357 0 13.7682 0 12.8214V10.6786C0 10.4419 0.191878 10.25 0.428571 10.25L0.857143 11.1071Z" fill="currentColor"/></svg>',
                    'controls' => array(),
                ),

                // Dropdown.
                'dropdown' => array(
                    'title'    => esc_html__( 'Dropdown', '@@text_domain' ),
                    'icon'     => '<svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11 20.4286C16.2073 20.4286 20.4286 16.2073 20.4286 11C20.4286 5.79274 16.2073 1.57143 11 1.57143C5.79274 1.57143 1.57143 5.79274 1.57143 11C1.57143 16.2073 5.79274 20.4286 11 20.4286Z" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 9.85714L11 13.8571L15 9.85714" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/></svg>',
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
                'default'  => 'dropdown',
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
                            if ( strpos( $cond['control'], 'GLOBAL_' ) === 0 ) {
                                $field['condition'][ $k ]['control'] = str_replace( 'GLOBAL_', '', $cond['control'] );
                            } else {
                                $field['condition'][ $k ]['control'] = $name . '_' . $cond['control'];
                            }
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

        /**
         * Search
         */
        Visual_Portfolio_Controls::register(
            array(
                'category'    => 'search',
                'type'        => 'pro_note',
                'name'        => 'search_pro_note',
                'label'       => esc_html__( 'PRO Feature', '@@text_domain' ),
                'description' => esc_html__( 'The search module is only available for PRO users.', '@@text_domain' ),
            )
        );

        /**
         * Pagination
         */
        $pagination = array_merge(
            array(
                // Minimal.
                'minimal' => array(
                    'title'    => esc_html__( 'Minimal', '@@text_domain' ),
                    'icon'     => '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0.879261 8.13636V12.5H1.77415V9.64915H1.81037L2.93963 12.4787H3.54901L4.67827 9.6598H4.71449V12.5H5.60938V8.13636H4.47159L3.26989 11.0682H3.21875L2.01705 8.13636H0.879261ZM10.0194 8.13636H9.10103V10.8807H9.06268L7.17915 8.13636H6.3695V12.5H7.29208V9.75355H7.32404L9.22248 12.5H10.0194V8.13636ZM10.7816 8.13636V12.5H11.6765V9.64915H11.7127L12.842 12.4787H13.4513L14.5806 9.6598H14.6168V12.5H15.5117V8.13636H14.3739L13.1722 11.0682H13.1211L11.9194 8.13636H10.7816ZM16.2718 12.5H19.0652V11.7393H17.1944V8.13636H16.2718V12.5Z" fill="currentColor"/></svg>',
                    'controls' => array(),
                ),

                // Classic.
                'default' => array(
                    'title'    => esc_html__( 'Classic', '@@text_domain' ),
                    'icon'     => '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="0.75" y="5.89286" width="18.5" height="7.07143" rx="1.25" stroke="currentColor" stroke-width="1.5" fill="transparent"/><path d="M0.857143 11.1071V12.8214C0.857143 13.2948 1.2409 13.6786 1.71429 13.6786H18.2857C18.7591 13.6786 19.1429 13.2948 19.1429 12.8214V11.1071L19.5714 10.25C19.8081 10.25 20 10.4419 20 10.6786V12.8214C20 13.7682 19.2325 14.5357 18.2857 14.5357H1.71429C0.767512 14.5357 0 13.7682 0 12.8214V10.6786C0 10.4419 0.191878 10.25 0.428571 10.25L0.857143 11.1071Z" fill="currentColor"/></svg>',
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
            $pagination_selector[ $name ] = array(
                'value' => $name,
                'title' => $pagin['title'],
                'icon'  => isset( $pagin['icon'] ) ? $pagin['icon'] : '',
            );
        }
        Visual_Portfolio_Controls::register(
            array(
                'category' => 'pagination',
                'type'     => 'icons_selector',
                'name'     => 'pagination_style',
                'default'  => 'minimal',
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
                        'icon'  => '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3.12749 7.40909H2.11577L0.855469 8.20703V9.16158L2.02131 8.43075H2.05114V12.5H3.12749V7.40909ZM7.57768 12.5H11.2069V11.62H9.06916V11.5852L9.81241 10.8569C10.8589 9.90234 11.1398 9.42507 11.1398 8.84588C11.1398 7.96342 10.4189 7.33949 9.32768 7.33949C8.25879 7.33949 7.52548 7.97834 7.52797 8.97763H8.54963C8.54714 8.49041 8.85538 8.19212 9.32022 8.19212C9.76767 8.19212 10.1008 8.47053 10.1008 8.91797C10.1008 9.32315 9.85218 9.60156 9.38983 10.0465L7.57768 11.7244V12.5ZM17.1088 12.5696C18.2523 12.5696 19.0701 11.9407 19.0676 11.0707C19.0701 10.4368 18.6674 9.98438 17.9192 9.88991V9.85014C18.4885 9.74822 18.8812 9.34553 18.8787 8.77379C18.8812 7.97088 18.1777 7.33949 17.1238 7.33949C16.0797 7.33949 15.2942 7.95099 15.2793 8.83097H16.3109C16.3233 8.44318 16.6788 8.19212 17.1188 8.19212C17.5538 8.19212 17.8446 8.45561 17.8422 8.83842C17.8446 9.23864 17.5041 9.50959 17.0144 9.50959H16.5396V10.3001H17.0144C17.5911 10.3001 17.9515 10.5884 17.949 10.9986C17.9515 11.4038 17.6035 11.6822 17.1113 11.6822C16.6365 11.6822 16.2811 11.4336 16.2612 11.0607H15.1774C15.1948 11.9506 15.9902 12.5696 17.1088 12.5696Z" fill="currentColor"/></svg>',
                    ),
                    array(
                        'value' => 'load-more',
                        'title' => esc_html__( 'Load More', '@@text_domain' ),
                        'icon'  => '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="0.75" y="3.75" width="18.5" height="11.07" rx="1.25" stroke="currentColor" stroke-width="1.5" fill="transparent"/><path d="M0.857143 12.9643V14.6786C0.857143 15.152 1.2409 15.5357 1.71429 15.5357H18.2857C18.7591 15.5357 19.1429 15.152 19.1429 14.6786V12.9643L19.5714 12.1071C19.8081 12.1071 20 12.299 20 12.5357V14.6786C20 15.6254 19.2325 16.3929 18.2857 16.3929H1.71429C0.767512 16.3929 0 15.6254 0 14.6786V12.5357C0 12.299 0.191878 12.1071 0.428571 12.1071L0.857143 12.9643Z" fill="currentColor"/><path d="M9.92957 7.0001L9.96091 12" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><path d="M7.32182 9.36091L9.96091 12L12.6 9.36091" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/></svg>',
                    ),
                    array(
                        'value' => 'infinite',
                        'title' => esc_html__( 'Infinite', '@@text_domain' ),
                        'icon'  => '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 1.42857V4.85714" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><path opacity="0.5" d="M10 14V17.4286" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><path opacity="0.875" d="M4.28571 3.71428L6.57142 5.99999" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><path opacity="0.375" d="M13.4286 12.8571L15.7143 15.1429" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><path opacity="0.75" d="M2 9.42857H5.42857" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><path opacity="0.25" d="M14.5714 9.42857H18" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><path opacity="0.625" d="M4.28571 15.1429L6.57142 12.8571" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><path opacity="0.125" d="M13.4286 5.99999L15.7143 3.71428" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/></svg>',
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
                'name'      => 'pagination_infinite_texts',
                'condition' => array(
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
                'type'      => 'checkbox',
                'alongside' => esc_html__( 'Display Arrows', '@@text_domain' ),
                'name'      => 'pagination_paged__show_arrows',
                'default'   => true,
                'condition' => array(
                    array(
                        'control' => 'pagination',
                        'value'   => 'paged',
                    ),
                ),
            )
        );
        Visual_Portfolio_Controls::register(
            array(
                'category'  => 'pagination',
                'type'      => 'checkbox',
                'alongside' => esc_html__( 'Display Numbers', '@@text_domain' ),
                'name'      => 'pagination_paged__show_numbers',
                'default'   => true,
                'condition' => array(
                    array(
                        'control' => 'pagination',
                        'value'   => 'paged',
                    ),
                ),
            )
        );
        Visual_Portfolio_Controls::register(
            array(
                'category'  => 'pagination',
                'type'      => 'checkbox',
                'alongside' => esc_html__( 'Scroll to Top', '@@text_domain' ),
                'name'      => 'pagination_paged__scroll_top',
                'default'   => true,
                'condition' => array(
                    array(
                        'control' => 'pagination',
                        'value'   => 'paged',
                    ),
                ),
            )
        );
        Visual_Portfolio_Controls::register(
            array(
                'category'  => 'pagination',
                'type'      => 'range',
                'label'     => esc_html__( 'Scroll to Top Offset', '@@text_domain' ),
                'name'      => 'pagination_paged__scroll_top_offset',
                'default'   => 30,
                'condition' => array(
                    array(
                        'control' => 'pagination',
                        'value'   => 'paged',
                    ),
                    array(
                        'control' => 'pagination_paged__scroll_top',
                    ),
                ),
            )
        );
        Visual_Portfolio_Controls::register(
            array(
                'category'  => 'pagination',
                'type'      => 'checkbox',
                'alongside' => esc_html__( 'Hide on Reached End', '@@text_domain' ),
                'name'      => 'pagination_hide_on_end',
                'default'   => false,
                'condition' => array(
                    array(
                        'control'  => 'pagination',
                        'operator' => '!=',
                        'value'    => 'paged',
                    ),
                ),
            )
        );

        /**
         * Code Editor
         */
        Visual_Portfolio_Controls::register(
            array(
                'category'         => 'custom_css',
                'type'             => 'code_editor',
                'name'             => 'custom_css',
                'max_lines'        => 20,
                'min_lines'        => 5,
                'mode'             => 'css',
                'mode'             => 'css',
                'allow_modal'      => true,
                'classes_tree'     => true,
                'code_placeholder' => "selector {\n\n}",
                'default'          => '',
                'description'      => '<p></p>
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
                    'icon'  => '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 0.75H11.6893L17.25 6.31066V18C17.25 18.3315 17.1183 18.6495 16.8839 18.8839C16.6495 19.1183 16.3315 19.25 16 19.25H4C3.66848 19.25 3.35054 19.1183 3.11612 18.8839C2.8817 18.6495 2.75 18.3315 2.75 18V2C2.75 1.66848 2.8817 1.35054 3.11612 1.11612C3.35054 0.881696 3.66848 0.75 4 0.75Z" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><path d="M11.7143 0.571426V6H17.4286" stroke="currentColor" stroke-width="1.5" fill="transparent"/><path d="M14 11.1429H6" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 7.14285H6" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 15.1429H6" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/></svg>',
                );
            }
        }
        $post_types_selector['ids']           = array(
            'value' => 'ids',
            'title' => esc_html__( 'Manual Selection', '@@text_domain' ),
            'icon'  => '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="0.75" y="0.75" width="18.5" height="18.5" rx="1.25" stroke="currentColor" stroke-width="1.5" fill="transparent"/><path d="M5 11.6L7.30769 14L15 6" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/></svg>',
        );
        $post_types_selector['custom_query']  = array(
            'value' => 'custom_query',
            'title' => esc_html__( 'Custom Query', '@@text_domain' ),
            'icon'  => '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10.7678 0.91749L10.7678 0.917496L10.7707 0.919154L17.7678 4.91831C17.7682 4.91856 17.7687 4.91882 17.7691 4.91907C17.9584 5.02866 18.1156 5.186 18.225 5.37541C18.3347 5.56526 18.3926 5.78064 18.3929 5.99995V14.0001C18.3926 14.2194 18.3347 14.4347 18.225 14.6246C18.1156 14.814 17.9583 14.9714 17.769 15.081C17.7686 15.0812 17.7682 15.0814 17.7678 15.0817L10.7707 19.0808L10.7678 19.0825C10.5778 19.1922 10.3622 19.25 10.1429 19.25C9.92346 19.25 9.70793 19.1922 9.51791 19.0825L9.51501 19.0808L2.51791 15.0817C2.5175 15.0814 2.51708 15.0812 2.51667 15.081C2.32739 14.9714 2.17015 14.814 2.06067 14.6246C1.95102 14.4348 1.89314 14.2196 1.89285 14.0004V5.99959C1.89314 5.78041 1.95102 5.56516 2.06067 5.37541C2.17014 5.186 2.32736 5.02865 2.5166 4.91907C2.51704 4.91881 2.51747 4.91856 2.51791 4.91831L9.51501 0.919154L9.51502 0.91916L9.51791 0.91749C9.70793 0.807761 9.92346 0.75 10.1429 0.75C10.3622 0.75 10.5778 0.807761 10.7678 0.91749Z" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><path d="M10.1449 18.9286V9.42857" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><path d="M18.1159 4.78261L10.1449 9.42029L2.02899 4.78261" stroke="currentColor" stroke-width="1.5" fill="transparent"/></svg>',
        );
        $post_types_selector['current_query'] = array(
            'value' => 'current_query',
            'title' => esc_html__( 'Current Query', '@@text_domain' ),
            'icon'  => '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10.7678 0.91749L10.7678 0.917496L10.7707 0.919154L17.7678 4.91831C17.7682 4.91856 17.7687 4.91882 17.7691 4.91907C17.9584 5.02866 18.1156 5.186 18.225 5.37541C18.3347 5.56526 18.3926 5.78064 18.3929 5.99995V14.0001C18.3926 14.2194 18.3347 14.4347 18.225 14.6246C18.1156 14.814 17.9583 14.9714 17.769 15.081C17.7686 15.0812 17.7682 15.0814 17.7678 15.0817L10.7707 19.0808L10.7678 19.0825C10.5778 19.1922 10.3622 19.25 10.1429 19.25C9.92346 19.25 9.70793 19.1922 9.51791 19.0825L9.51501 19.0808L2.51791 15.0817C2.5175 15.0814 2.51708 15.0812 2.51667 15.081C2.32739 14.9714 2.17015 14.814 2.06067 14.6246C1.95102 14.4348 1.89314 14.2196 1.89285 14.0004V5.99959C1.89314 5.78041 1.95102 5.56516 2.06067 5.37541C2.17014 5.186 2.32736 5.02865 2.5166 4.91907C2.51704 4.91881 2.51747 4.91856 2.51791 4.91831L9.51501 0.919154L9.51502 0.91916L9.51791 0.91749C9.70793 0.807761 9.92346 0.75 10.1429 0.75C10.3622 0.75 10.5778 0.807761 10.7678 0.91749Z" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><path d="M10.1449 18.9286V9.42857" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><path d="M18.1159 4.78261L10.1449 9.42029L2.02899 4.78261" stroke="currentColor" stroke-width="1.5" fill="transparent"/></svg>',
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
