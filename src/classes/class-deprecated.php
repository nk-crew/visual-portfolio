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

        // Deprecated some builtin_controls for skins v2.23.0.
        add_filter( 'vpf_extend_items_styles', array( $this, 'deprecated_items_styles_builtin_controls_config' ), 20 );
        add_filter( 'vpf_items_style_builtin_controls', array( $this, 'deprecated_items_styles_builtin_controls' ), 20, 5 );
        add_filter( 'vpf_get_options', array( $this, 'deprecated_items_styles_attributes' ), 20, 2 );

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
     * Replace some old builtin_controls for skins.
     *
     * @param array $skins - all registered skins.
     *
     * @return array
     */
    public function deprecated_items_styles_builtin_controls_config( $skins ) {
        $move_to_general = array( 'show_title', 'show_categories', 'show_date', 'show_author', 'show_comments_count', 'show_views_count', 'show_reading_time', 'show_excerpt', 'show_read_more', 'show_icons' );

        foreach ( $skins as &$skin ) {
            if ( isset( $skin['builtin_controls'] ) ) {
                // Add 'general' controls.
                foreach ( $move_to_general as $opt ) {
                    if ( ! isset( $skin['builtin_controls'][ $opt ] ) ) {
                        continue;
                    }

                    if ( ! isset( $skin['builtin_controls']['general'] ) ) {
                        $skin['builtin_controls']['general'] = array();
                    }

                    $skin['builtin_controls']['general'][ str_replace( 'show_', '', $opt ) ] = $skin['builtin_controls'][ $opt ];

                    unset( $skin['builtin_controls'][ $opt ] );
                }

                // Add 'images' controls.
                if ( isset( $skin['builtin_controls']['images_rounded_corners'] ) ) {
                    if ( ! isset( $skin['builtin_controls']['image'] ) ) {
                        $skin['builtin_controls']['image'] = array(
                            'border_radius' => $skin['builtin_controls']['images_rounded_corners'],
                        );
                    }

                    unset( $skin['builtin_controls']['images_rounded_corners'] );
                }
            }
        }

        return $skins;
    }

    /**
     * Add controls for old builtin_controls config.
     *
     * @param array  $fields - builtin fields.
     * @param string $option_name - option name.
     * @param array  $options - builtin field options.
     * @param string $style_name - items style name.
     * @param string $style - items style data.
     *
     * @return array
     */
    public function deprecated_items_styles_builtin_controls( $fields, $option_name, $options, $style_name, $style ) {
        if ( 'align' === $option_name ) {
            $fields[] = array(
                'type'     => 'align',
                'category' => 'items-style-caption',
                'label'    => esc_html__( 'Caption Align', '@@text_domain' ),
                'name'     => 'align',
                'group'    => 'items_style_align',
                'default'  => 'center',
                'options'  => 'extended' === $options ? 'box' : 'horizontal',
            );
        }

        return $fields;
    }

    /**
     * Add attributes to block rendering as a fallback
     * to prevent errors in changed templates.
     *
     * @param array $options - block options.
     * @param array $attrs - block attributes.
     *
     * @return array
     */
    public function deprecated_items_styles_attributes( $options, $attrs ) {
        $styles = array( 'default', 'fade', 'fly', 'emerge' );

        foreach ( $styles as $style ) {
            // Restore align option.
            if ( ! isset( $options[ 'items_style_' . $style . '__align' ] ) ) {
                $options[ 'items_style_' . $style . '__align' ] = $attrs[ 'items_style_' . $style . '__align' ] ?? 'center';
            }
        }

        return $options;
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
