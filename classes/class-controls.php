<?php
/**
 * Controls
 *
 * @package visual-portfolio
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
	 * Cached all registered controls.
	 *
	 * @var array
	 */
	private static $cached_all_registered_controls = array();

	/**
	 * Cached saved layout meta.
	 *
	 * @var array
	 */
	private static $cached_saved_layout_meta = array();

	/**
	 * Default control args.
	 *
	 * @var array
	 */
	private static $default_args = array(
		// category for registered fields.
		'category'          => '',

		'type'              => 'text',
		'label'             => false,
		'description'       => false,
		'group'             => false,
		'name'              => '',
		'value'             => '',
		'placeholder'       => '',
		'readonly'          => false,
		'value_callback'    => '',
		'sanitize_callback' => '',
		'reload_iframe'     => true,

		// control-specific args.
		// notice.
		'status'            => 'info',
		// select.
		'options'           => array(),
		'searchable'        => false,
		'multiple'          => false,
		'creatable'         => false,
		// range.
		'min'               => '',
		'max'               => '',
		'step'              => '1',
		// textarea.
		'cols'              => '',
		'rows'              => '',
		// color.
		'alpha'             => false,
		'gradient'          => false,
		// align.
		'extended'          => false,
		// code editor.
		'mode'              => 'css',
		'max_lines'         => 20,
		'min_lines'         => 5,
		'allow_modal'       => true,
		'classes_tree'      => false,
		'encode'            => false,
		'code_placeholder'  => '',
		// elements selector.
		'locations'         => array(),
		// gallery.
		'focal_point'       => false,

		// hint, deprecated.
		'hint'              => false,
		'hint_place'        => 'top',

		// display in setup wizard.
		'setup_wizard'      => false,

		// support for WPML.
		'wpml'              => false,

		// condition.
		'condition'         => array(
			/**
			 * Array of arrays with data:
			 *  'control'  - control name.
			 *  'operator' - operator (==, !==, >, <, >=, <=).
			 *  'value'    - condition value.
			 */
		),

		// style.
		'style'             => array(
			/**
			 * Array of arrays with data:
			 *  'element'  - CSS selector string (.vp-portfolio__item, .vp-portfolio__item-overlay, etc).
			 *  'property' - CSS property (color, font-size, etc).
			 *  'mask'     - CSS value mask, for ex. "$px".
			 */
		),

		'class'             => '',
		'wrapper_class'     => '',
	);

	/**
	 * Visual_Portfolio_Controls constructor.
	 */
	public function __construct() {
		add_action( 'wp_ajax_vp_dynamic_control_callback', array( $this, 'ajax_dynamic_control_callback' ) );

		// Add filter to fix boolean string values for Saved Layout posts.
		add_filter( 'vpf_control_value', array( $this, 'fix_boolean_string_values_for_saved_layouts' ), 10, 3 );
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
		foreach ( $controls as $control ) {
			if (
				isset( $control['name'] ) &&
				$control['name'] === $_POST['vp_control_name'] &&
				isset( $control['value_callback'] ) &&
				is_callable( $control['value_callback'] )
			) {
                // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized, WordPress.Security.ValidatedSanitizedInput.MissingUnslash
				$attributes = isset( $_POST['vp_attributes'] ) ? Visual_Portfolio_Security::sanitize_attributes( $_POST['vp_attributes'] ) : array();
				$found      = true;
				$result     = call_user_func( $control['value_callback'], $attributes, $control );
				break;
			}
		}

		if ( null === $found ) {
			echo wp_json_encode(
				array(
					'response' => esc_attr__( 'Dynamic control callback function is not found.', 'visual-portfolio' ),
					'error'    => true,
				)
			);
		} else {
			echo wp_json_encode(
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
		// Return cached version of all controls.
		if ( ! empty( self::$cached_all_registered_controls ) ) {
			return self::$cached_all_registered_controls;
		}

		$result = array();

		foreach ( self::$registered_fields as $k => $args ) {
			$result[ $k ] = array_merge( self::$default_args, $args );

			// Gallery image controls.
			if ( 'gallery' === $result[ $k ]['type'] && isset( $result[ $k ]['image_controls'] ) && ! empty( $result[ $k ]['image_controls'] ) ) {
				$img_controls = array();

				// Extend.
                // phpcs:ignore Squiz.PHP.CommentedOutCode.Found, Squiz.Commenting.BlockComment.NoEmptyLineBefore
				/*
				* Example:
					array(
						'title' => array(
							'type'  => 'text',
							'label' => esc_html__( 'Title', 'visual-portfolio' ),
						),
						'description' => array(
							'type'  => 'textarea',
							'label' => esc_html__( 'Description', 'visual-portfolio' ),
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

			$result[ $k ] = apply_filters( 'vpf_registered_control_args', $result[ $k ] );
		}

		self::$cached_all_registered_controls = apply_filters( 'vpf_registered_controls', $result );

		return self::$cached_all_registered_controls;
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
	 * Check if a field requires string boolean conversion for Saved Layout posts.
	 *
	 * Some form controls use string boolean values ('false', 'true') instead of actual booleans
	 * for their dropdown options. This is specifically needed for Saved Layout posts (vp_lists)
	 * that store values in WordPress post meta.
	 *
	 * Background:
	 * - Saved Layout posts (post_type: 'vp_lists') store control values in post meta
	 * - During retrieval, WordPress may convert stored values to different types
	 * - Controls like "Display Date" and "Display Read More Button" use string options:
	 *   'false' => 'Hide', 'true' => 'Always Display', etc.
	 * - The frontend React components expect these exact string values to display correctly
	 * - Without this fix, values get converted to boolean false/true, causing dropdowns
	 *   to show "Select..." instead of the correct selected option
	 *
	 * Note: Regular Gutenberg block posts store data directly in block content and don't need this fix.
	 *
	 * @param string   $field_name - The control field name to check.
	 * @param int|bool $post_id - The post ID (false for non-post contexts).
	 *
	 * @return bool True if field needs string boolean conversion for Saved Layouts.
	 */
	private static function is_boolean_string_field_for_saved_layout( $field_name, $post_id = false ) {
		// Only apply to Saved Layout posts (vp_lists post type).
		if ( ! $post_id || 'vp_lists' !== get_post_type( $post_id ) ) {
			return false;
		}

		// List of field name patterns that use string boolean values.
		$boolean_string_field_patterns = array(
			'__show_date',         // Display Date control: 'false' => 'Hide', 'true' => 'Default', 'human' => 'Human Format'.
			'__show_read_more',    // Display Read More Button: 'false' => 'Hide', 'true' => 'Always Display', 'more_tag' => 'More tag'.
			'__show_categories',   // Display Categories control: similar boolean select pattern.
			'__show_excerpt',      // Display Excerpt control: boolean select.
			'__show_arrows',       // Pagination arrows control: boolean select.
			'__show_numbers',      // Pagination numbers control: boolean select.
			'__show_title',        // Display Title control: boolean select.
			'__show_author',       // Display Author control: boolean select.
			'__show_icon',         // Display Icon control: boolean select.
			'__show_count',        // Display Count control: boolean select.
		);

		// Check if field name ends with any of the patterns.
		foreach ( $boolean_string_field_patterns as $pattern ) {
			if ( substr( $field_name, -strlen( $pattern ) ) === $pattern ) {
				return true;
			}
		}

		return false;
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
		// get all layout meta at once and cache them (works faster).
		if ( $post_id ) {
			if ( ! isset( self::$cached_saved_layout_meta[ $post_id ] ) ) {
				$saved_meta  = get_post_meta( $post_id );
				$result_meta = array();

				// We should unserialize array data as in standard function https://developer.wordpress.org/reference/functions/get_metadata_raw/.
				if ( is_array( $saved_meta ) ) {
					foreach ( $saved_meta as $key => $val ) {
						if ( isset( $val[0] ) ) {
							$result_meta[ $key ] = maybe_unserialize( $val[0] );
						}
					}
				}

				self::$cached_saved_layout_meta[ $post_id ] = $result_meta;
			}
			if ( isset( self::$cached_saved_layout_meta[ $post_id ] ) && isset( self::$cached_saved_layout_meta[ $post_id ][ 'vp_' . $name ] ) ) {
				$result = self::$cached_saved_layout_meta[ $post_id ][ 'vp_' . $name ];
			}
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
		$result = apply_filters( 'vpf_control_value', $result, $name, $post_id );

		// fix for gallery array.
		if ( isset( $registered_data['type'] ) && 'gallery' === $registered_data['type'] ) {
			$result = (array) ( is_string( $result ) ? json_decode( $result, true ) : $result );

			// add image url if doesn't exist.
			foreach ( $result as $k => $data ) {
				if ( ! isset( $data['imgUrl'] ) && isset( $data['id'] ) ) {
					$result[ $k ]['imgUrl']          = Visual_Portfolio_Images::wp_get_attachment_image_url( $data['id'], 'full' );
					$result[ $k ]['imgThumbnailUrl'] = Visual_Portfolio_Images::wp_get_attachment_image_url( $data['id'], 'thumbnail' );
				}
			}
		}

		if ( 'custom_css' === $name && $result ) {
			// Decode.
			$result = visual_portfolio_decode( $result );

			// Fix for old plugin versions (< 2.0).
			$result = str_replace( '&gt;', '>', $result );
		}

		return $result;
	}

	/**
	 * Fix boolean string values for Saved Layout posts.
	 *
	 * Handles conversion between boolean and string representations for dropdown controls
	 * in Saved Layout posts. This ensures proper display of selected options in the UI.
	 *
	 * @param mixed  $value   The control value.
	 * @param string $name    The control name.
	 * @param int    $post_id The post ID.
	 *
	 * @return mixed The filtered value.
	 */
	public static function fix_boolean_string_values_for_saved_layouts( $value, $name, $post_id ) {
		// Determine if this field requires string booleans (for Saved Layout dropdown controls).
		$needs_string_booleans = self::is_boolean_string_field_for_saved_layout( $name, $post_id );

		if ( $needs_string_booleans ) {
			// Convert various falsy/truthy values to string 'false'/'true' for dropdown compatibility.
			if ( false === $value || '0' === $value || 0 === $value || '' === $value ) {
				$value = 'false';
			} elseif ( true === $value || '1' === $value || 1 === $value ) {
				$value = 'true';
			}
			// Keep existing string values ('false', 'true', 'more_tag', 'human', etc.) as is.
		} else {
			// Convert string booleans to actual boolean values for all other fields.
			if ( 'false' === $value ) {
				$value = false;
			} elseif ( 'true' === $value ) {
				$value = true;
			}
		}

		return $value;
	}
}

new Visual_Portfolio_Controls();
