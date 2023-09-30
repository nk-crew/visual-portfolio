<?php
/**
 * Deprecations.
 *
 * @package visual-portfolio
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

		// Deprecated some builtin_controls for skins v3.0.0.
		add_filter( 'vpf_items_style_builtin_controls_options', array( $this, 'deprecated_vpf_items_style_builtin_controls_options' ), 20 );
		add_filter( 'vpf_items_style_builtin_controls', array( $this, 'deprecated_vpf_items_style_builtin_controls' ), 20, 4 );
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
		$this->hooks[] = array(
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
	 * Restore some old builtin_controls for skins.
	 *
	 * @param array $builtin_controls - builtin default controls.
	 *
	 * @return array
	 */
	public function deprecated_vpf_items_style_builtin_controls_options( $builtin_controls ) {
		return array_merge(
			$builtin_controls,
			array(
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
				'align'                  => true,
			)
		);
	}

	/**
	 * Restore some old builtin_controls for skins.
	 *
	 * @param array  $fields - builtin fields.
	 * @param string $option_name - option name.
	 * @param array  $options - builtin field options.
	 * @param string $style_name - items style name.
	 *
	 * @return array
	 */
	public function deprecated_vpf_items_style_builtin_controls( $fields, $option_name, $options, $style_name ) {
		switch ( $option_name ) {
			case 'images_rounded_corners':
				$fields[] = array(
					'type'    => 'range',
					'label'   => esc_html__( 'Images Rounded Corners', 'visual-portfolio' ),
					'name'    => 'images_rounded_corners',
					'min'     => 0,
					'max'     => 100,
					'default' => 0,
					'style'   => array(
						array(
							'element'  => '.vp-portfolio__items-style-' . $style_name,
							'property' => '--vp-items-style-' . $style_name . '--image__border-radius',
							'mask'     => '$px',
						),
					),
				);
				break;
			case 'show_title':
				$fields[] = array(
					'type'      => 'checkbox',
					'alongside' => esc_html__( 'Display Title', 'visual-portfolio' ),
					'name'      => 'show_title',
					'default'   => true,
				);
				break;
			case 'show_categories':
				$fields[] = array(
					'type'      => 'checkbox',
					'alongside' => esc_html__( 'Display Categories', 'visual-portfolio' ),
					'name'      => 'show_categories',
					'group'     => 'items_style_categories',
					'default'   => true,
				);
				$fields[] = array(
					'type'      => 'range',
					'label'     => esc_html__( 'Categories Count', 'visual-portfolio' ),
					'name'      => 'categories_count',
					'group'     => 'items_style_categories',
					'min'       => 1,
					'max'       => 20,
					'default'   => 1,
					'condition' => array(
						array(
							'control' => 'show_categories',
						),
					),
				);
				break;
			case 'show_date':
				$fields[] = array(
					'type'    => 'radio',
					'label'   => esc_html__( 'Display Date', 'visual-portfolio' ),
					'name'    => 'show_date',
					'group'   => 'items_style_date',
					'default' => 'false',
					'options' => array(
						'false' => esc_html__( 'Hide', 'visual-portfolio' ),
						'true'  => esc_html__( 'Default', 'visual-portfolio' ),
						'human' => esc_html__( 'Human Format', 'visual-portfolio' ),
					),
				);
				$fields[] = array(
					'type'        => 'text',
					'name'        => 'date_format',
					'group'       => 'items_style_date',
					'default'     => 'F j, Y',
					'description' => esc_attr__( 'Date format example: F j, Y', 'visual-portfolio' ),
					'wpml'        => true,
					'condition'   => array(
						array(
							'control' => 'show_date',
						),
					),
				);
				break;
			case 'show_author':
				$fields[] = array(
					'type'      => 'checkbox',
					'alongside' => esc_html__( 'Display Author', 'visual-portfolio' ),
					'name'      => 'show_author',
					'default'   => false,
				);
				break;
			case 'show_comments_count':
				$fields[] = array(
					'type'      => 'checkbox',
					'alongside' => esc_html__( 'Display Comments Count', 'visual-portfolio' ),
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
				$fields[] = array(
					'type'      => 'checkbox',
					'alongside' => esc_html__( 'Display Views Count', 'visual-portfolio' ),
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
				$fields[] = array(
					'type'      => 'checkbox',
					'alongside' => esc_html__( 'Display Reading Time', 'visual-portfolio' ),
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
				$fields[] = array(
					'type'      => 'checkbox',
					'alongside' => esc_html__( 'Display Excerpt', 'visual-portfolio' ),
					'name'      => 'show_excerpt',
					'group'     => 'items_style_excerpt',
					'default'   => false,
				);
				$fields[] = array(
					'type'      => 'number',
					'label'     => esc_html__( 'Excerpt Words Count', 'visual-portfolio' ),
					'name'      => 'excerpt_words_count',
					'group'     => 'items_style_excerpt',
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
				$fields[] = array(
					'type'      => 'checkbox',
					'alongside' => esc_html__( 'Display Icon', 'visual-portfolio' ),
					'name'      => 'show_icon',
					'default'   => false,
				);
				break;
			case 'align':
				$fields[] = array(
					'type'     => 'align',
					'label'    => esc_html__( 'Caption Align', 'visual-portfolio' ),
					'name'     => 'align',
					'default'  => 'center',
					'extended' => 'extended' === $options,
				);
				break;
			// no default.
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
