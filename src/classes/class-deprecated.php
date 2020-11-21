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
        // Deprecated filters in v2.9.0.
        $this->add_deprecated_filter( 'vpf_print_layout_control_args', '2.9.0', 'vpf_registered_control_args' );
        $this->add_deprecated_filter( 'vpf_get_layout_option', '2.9.0', 'vpf_control_value' );
        $this->add_deprecated_filter( 'vpf_extend_popup_image', '2.9.0', 'vpf_popup_image_data' );
        $this->add_deprecated_filter( 'vpf_extend_custom_popup_image', '2.9.0', 'vpf_popup_custom_image_data' );
        $this->add_deprecated_filter( 'vpf_print_popup_data', '2.9.0', 'vpf_popup_output' );
        $this->add_deprecated_filter( 'vpf_wp_get_attachment_image_extend', '2.9.0', 'vpf_wp_get_attachment_image' );
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
        add_action( $replacement, '_acf_apply_deprecated_hook', 10, 10 );
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
                    // phpcs:ignore
                    $args[0] = apply_filters_ref_array( $hook_data['deprecated'], $args );

                    // Or do action.
                } else {
                    // phpcs:ignore
                    do_action_ref_array( $hook_data['deprecated'], $args );
                }
            }
        }

        // Return first arg.
        return $args[0];
    }
}

new Visual_Portfolio_Deprecations();
