<?php
/**
 * Controls
 *
 * @package @@plugin_name
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Class Visual_Portfolio_Controls
 */
class Visual_Portfolio_Controls {
    /**
     * Registered user categories to print it in the future.
     *
     * @var array
     */
    private static $registered_categories = array();

    /**
     * Registered user fields to print it in the future.
     *
     * @var array
     */
    private static $registered_fields = array();

    /**
     * Default control args.
     *
     * @var array
     */
    private static $default_args = array(
        // category for registered fields.
        'category'         => '',

        'type'             => 'text',
        'label'            => false,
        'description'      => false,
        'name'             => '',
        'value'            => '',
        'value_callback'   => '',
        'placeholder'      => '',
        'readonly'         => false,

        // control-specific args.
        // select.
        'options'          => array(),
        'searchable'       => false,
        'multiple'         => false,
        'creatable'        => false,
        // range.
        'min'              => '',
        'max'              => '',
        'step'             => '1',
        // textarea.
        'cols'             => '',
        'rows'             => '',
        // color.
        'alpha'            => false,
        // align.
        'extended'         => false,
        // code editor.
        'mode'             => 'css',
        'max_lines'        => 20,
        'min_lines'        => 5,
        'allow_modal'      => true,
        'classes_tree'     => false,
        'code_placeholder' => '',
        // elements selector.
        'locations'        => array(),
        // gallery.
        'focal_point'      => false,

        // hint.
        'hint'             => false,
        'hint_place'       => 'top',

        // display in setup wizard.
        'setup_wizard'     => false,

        // condition.
        'condition'        => array(
            /**
             * Array of arrays with data:
             *  'control'  - control name.
             *  'operator' - operator (==, !==, >, <, >=, <=).
             *  'value'    - condition value.
             */
        ),

        // style.
        'style'            => array(
            /**
             * Array of arrays with data:
             *  'element'  - CSS selector string (.vp-portfolio__item, .vp-portfolio__item-overlay, etc).
             *  'property' - CSS property (color, font-size, etc).
             *  'mask'     - CSS value mask, for ex. "$px".
             */
        ),

        'class'            => '',
        'wrapper_class'    => '',
    );

    /**
     * Visual_Portfolio_Controls constructor.
     */
    public function __construct() {
        add_action( 'wp_ajax_vp_dynamic_control_callback', array( $this, 'ajax_dynamic_control_callback' ) );
    }

    /**
     * Dynamic control AJAX callback.
     */
    public function ajax_dynamic_control_callback() {
        check_ajax_referer( 'vp-ajax-nonce', 'nonce' );
        if ( ! isset( $_POST['vp_control_name'] ) ) {
            wp_die();
        }

        $result   = null;
        $found    = null;
        $controls = self::get_registered_array();

        // find control callback.
        foreach ( $controls as $k => $control ) {
            if (
                isset( $control['name'] ) &&
                $control['name'] === $_POST['vp_control_name'] &&
                isset( $control['value_callback'] ) &&
                is_callable( $control['value_callback'] )
            ) {
                // phpcs:ignore
                $attributes = isset( $_POST['vp_attributes'] ) ? $_POST['vp_attributes'] : array();
                $found      = true;
                $result     = call_user_func( $control['value_callback'], $attributes, $control );
                break;
            }
        }

        if ( null === $found ) {
            // phpcs:ignore
            echo json_encode(
                array(
                    'response' => esc_attr__( 'Dynamic control callback function is not found.', '@@text_domain' ),
                    'error'    => true,
                )
            );
        } else {
            // phpcs:ignore
            echo json_encode(
                array(
                    'response' => $result,
                    'success'  => true,
                )
            );
        }

        wp_die();
    }

    /**
     * Register category to print in the future.
     *
     * @param array $categories - categories args.
     */
    public static function register_categories( $categories = array() ) {
        self::$registered_categories = array_merge( self::$registered_categories, $categories );
    }

    /**
     * Register control to print in the future.
     *
     * @param array $args - control args.
     */
    public static function register( $args = array() ) {
        if ( ! isset( $args['name'] ) ) {
            return;
        }
        self::$registered_fields[ $args['name'] ] = apply_filters( 'vpf_register_control', $args, $args['name'] );

        do_action( 'vpf_registered_control', $args['name'], $args );
    }

    /**
     * Get all registered controls.
     *
     * @return array
     */
    public static function get_registered_array() {
        $result = array();

        foreach ( self::$registered_fields as $k => $args ) {
            $result[ $k ] = array_merge( self::$default_args, $args );

            // Gallery image controls.
            if ( 'gallery' === $result[ $k ]['type'] && isset( $result[ $k ]['image_controls'] ) && ! empty( $result[ $k ]['image_controls'] ) ) {
                $img_controls = array();

                // Extend.
                // phpcs:ignore
                /*
                * Example:
                    array(
                        'title' => array(
                            'type'  => 'text',
                            'label' => esc_html__( 'Title', '@@text_domain' ),
                        ),
                        'description' => array(
                            'type'  => 'textarea',
                            'label' => esc_html__( 'Description', '@@text_domain' ),
                        ),
                    )
                */
                $result[ $k ]['image_controls'] = apply_filters( 'vpf_extend_image_controls', $result[ $k ]['image_controls'], $result[ $k ]['name'] );

                // Get default controls data.
                foreach ( $result[ $k ]['image_controls'] as $i => $img_args ) {
                    $img_controls[ $i ] = array_merge( self::$default_args, $img_args );
                }

                $result[ $k ]['image_controls'] = $img_controls;
            }

            $result[ $k ] = apply_filters( 'vpf_print_layout_control_args', $result[ $k ] );
        }

        return $result;
    }

    /**
     * Get all registered categories.
     *
     * @return array
     */
    public static function get_registered_categories() {
        return self::$registered_categories;
    }

    /**
     * Get registered control value.
     *
     * @param string   $name - field name.
     * @param int|bool $post_id - post id to get meta data.
     *
     * @return mixed
     */
    public static function get_registered_value( $name, $post_id = false ) {
        // get meta data.
        $result = null;

        // get meta data from saved layout.
        if ( $post_id && metadata_exists( 'post', $post_id, 'vp_' . $name ) ) {
            $result = get_post_meta( $post_id, 'vp_' . $name, true );
        }

        // registered data.
        $registered_array = self::get_registered_array();
        $registered_data  = isset( $registered_array[ $name ] ) ? $registered_array[ $name ] : false;

        // find default.
        $default = null;
        if ( isset( $registered_data ) ) {
            $default = isset( $registered_data['default'] ) ? $registered_data['default'] : $default;
        }
        if ( ! isset( $result ) && isset( $default ) ) {
            $result = $default;
        }

        // filter.
        $result = apply_filters( 'vpf_get_layout_option', $result, $name, $post_id );

        // fix for gallery array.
        if ( isset( $registered_data['type'] ) && 'gallery' === $registered_data['type'] ) {
            $result = (array) ( is_string( $result ) ? json_decode( $result, true ) : $result );

            // add image url if doesn't exist.
            foreach ( $result as $k => $data ) {
                if ( ! isset( $data['imgUrl'] ) && isset( $data['id'] ) ) {
                    $result[ $k ]['imgUrl']          = wp_get_attachment_image_url( $data['id'], 'full' );
                    $result[ $k ]['imgThumbnailUrl'] = wp_get_attachment_image_url( $data['id'], 'thumbnail' );
                }
            }
        }

        // fix bool values.
        if ( 'false' === $result ) {
            $result = false;
        }
        if ( 'true' === $result ) {
            $result = true;
        }

        // Fix for old plugin versions (< 2.0).
        if ( 'custom_css' === $name && $result ) {
            $result = str_replace( '&gt;', '>', $result );
        }

        return $result;
    }
}

new Visual_Portfolio_Controls();
