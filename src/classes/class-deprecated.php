<?php
/**
 * Deprecations.
 *
 * @package @@plugin_name
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Class Visual_Portfolio_Deprecations
 */
class Visual_Portfolio_Deprecations {
    /**
     * The list of all deprecated hooks.
     *
     * @var array
     */
    public $hooks = array();

    /**
     * Visual_Portfolio_Deprecations constructor.
     */
    public function __construct() {
        // Deprecated filters since v2.9.0.
        $this->add_deprecated_filter( 'vpf_print_layout_control_args', '2.9.0', 'vpf_registered_control_args' );
        $this->add_deprecated_filter( 'vpf_get_layout_option', '2.9.0', 'vpf_control_value' );
        $this->add_deprecated_filter( 'vpf_extend_popup_image', '2.9.0', 'vpf_popup_image_data' );
        $this->add_deprecated_filter( 'vpf_extend_custom_popup_image', '2.9.0', 'vpf_popup_custom_image_data' );
        $this->add_deprecated_filter( 'vpf_print_popup_data', '2.9.0', 'vpf_popup_output' );
        $this->add_deprecated_filter( 'vpf_wp_get_attachment_image_extend', '2.9.0', 'vpf_wp_get_attachment_image' );

        // Deprecated image args for wp kses since v2.10.4.
        // Since v2.20.0 we are using the `vp_image` kses.
        add_filter( 'vpf_image_item_args', array( $this, 'deprecated_image_kses_args' ), 9 );
        add_filter( 'vpf_post_item_args', array( $this, 'deprecated_image_kses_args' ), 9 );

        // Deprecated image noscript argument since v2.6.0.
        add_filter( 'vpf_each_item_args', array( $this, 'deprecated_noscript_args' ), 9 );
    }

    /**
     * Add Deprecated Filter
     *
     * @param  string $deprecated  The deprecated hook.
     * @param  string $version     The version this hook was deprecated.
     * @param  string $replacement The replacement hook.
     */
    public function add_deprecated_filter( $deprecated, $version, $replacement ) {
        // Store replacement data.
        $this->hooks[] = array(
            'type'        => 'filter',
            'deprecated'  => $deprecated,
            'replacement' => $replacement,
            'version'     => $version,
        );

        // Add generic handler.
        // Use a priority of 10, and accepted args of 10 (ignored by WP).
        add_filter( $replacement, array( $this, 'apply_deprecated_hook' ), 10, 10 );
    }

    /**
     * Add Deprecated Action
     *
     * @param  string $deprecated  The deprecated hook.
     * @param  string $version     The version this hook was deprecated.
     * @param  string $replacement The replacement hook.
     */
    public function add_deprecated_action( $deprecated, $version, $replacement ) {
        // Store replacement data.
        $hooks[] = array(
            'type'        => 'action',
            'deprecated'  => $deprecated,
            'replacement' => $replacement,
            'version'     => $version,
        );

        // Add generic handler.
        // Use a priority of 10, and accepted args of 10 (ignored by WP).
        add_action( $replacement, array( $this, 'apply_deprecated_hook' ), 10, 10 );
    }

    /**
     * Apply Deprecated Hook
     *
     * Apply a deprecated filter during apply_filters() or do_action().
     *
     * @return mixed
     */
    public function apply_deprecated_hook() {
        // Get current hook.
        $hook_name = current_filter();

        // Get args provided to function.
        $args = func_get_args();

        foreach ( $this->hooks as $hook_data ) {
            if ( $hook_name !== $hook_data['replacement'] ) {
                continue;
            }

            // Check if anyone is hooked into this deprecated hook.
            if ( has_filter( $hook_data['deprecated'] ) ) {
                // Log warning.
                // Most probably we will add it later.
                //
                // _deprecated_hook( $hook_data['deprecated'], $hook_data['version'], $hook_name ); .

                // Apply filters.
                if ( 'filter' === $hook_data['type'] ) {
                    // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.DynamicHooknameFound
                    $args[0] = apply_filters_ref_array( $hook_data['deprecated'], $args );

                    // Or do action.
                } else {
                    // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.DynamicHooknameFound
                    do_action_ref_array( $hook_data['deprecated'], $args );
                }
            }
        }

        // Return first arg.
        return $args[0];
    }

    /**
     * Allowed attributes for wp_kses used in vp images.
     *
     * @param array $args vp item args.
     *
     * @return array
     */
    public function deprecated_image_kses_args( $args ) {
        if ( ! isset( $args['image_allowed_html'] ) ) {
            $args['image_allowed_html'] = array();
        }
        if ( ! isset( $args['image_allowed_html']['img'] ) ) {
            $args['image_allowed_html']['img'] = array();
        }

        $args['image_allowed_html']['noscript'] = array();
        $args['image_allowed_html']['img']      = array_merge(
            $args['image_allowed_html']['img'],
            array(
                'src'          => array(),
                'srcset'       => array(),
                'sizes'        => array(),
                'alt'          => array(),
                'class'        => array(),
                'width'        => array(),
                'height'       => array(),

                // Lazy loading attributes.
                'loading'      => array(),
                'data-src'     => array(),
                'data-sizes'   => array(),
                'data-srcset'  => array(),
                'data-no-lazy' => array(),
            )
        );

        return $args;
    }

    /**
     * Add noscript string to prevent errors in old templates.
     *
     * @param array $args vp item args.
     *
     * @return array
     */
    public function deprecated_noscript_args( $args ) {
        $args['image_noscript'] = '';

        return $args;
    }
}

new Visual_Portfolio_Deprecations();
