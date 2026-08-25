<?php
/**
 * Gutenberg utilities and enqueue block assets.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Visual_Portfolio_Gutenberg
 */
class Visual_Portfolio_Gutenberg {
	/**
	 * Cached block attributes, we will use it when register block in PHP and in JS.
	 *
	 * @var array
	 */
	private static $cached_attributes = array();

	/**
	 * Constructor.
	 */
	public function __construct() {
		add_action( 'enqueue_block_assets', array( $this, 'enqueue_block_editor_assets' ) );
		add_action( 'init', array( $this, 'register_block_patterns' ) );
	}

	/**
	 * Register the Gallery Loop block patterns.
	 *
	 * Patterns are plain PHP files in `gutenberg/patterns/`, described by file
	 * headers the same way theme patterns are. They all carry
	 * `Block Types: visual-portfolio/loop`, which is what puts them in the
	 * loop's own inserter.
	 */
	public function register_block_patterns() {
		// Every pattern is built out of loop blocks, so they follow the family gate.
		if ( ! visual_portfolio()->supports_loop_blocks() ) {
			return;
		}

		register_block_pattern_category(
			'visual-portfolio',
			array(
				'label' => __( 'Visual Portfolio', 'visual-portfolio' ),
			)
		);

		$pattern_files = glob( visual_portfolio()->plugin_path . 'gutenberg/patterns/*.php' );

		if ( empty( $pattern_files ) ) {
			return;
		}

		foreach ( $pattern_files as $pattern_file ) {
			$pattern_data = get_file_data(
				$pattern_file,
				array(
					'title'         => 'Title',
					'slug'          => 'Slug',
					'description'   => 'Description',
					'categories'    => 'Categories',
					'blockTypes'    => 'Block Types',
					'viewportWidth' => 'Viewport Width',
				)
			);

			if ( empty( $pattern_data['title'] ) || empty( $pattern_data['slug'] ) ) {
				continue;
			}

			$categories = array( 'visual-portfolio' );

			if ( ! empty( $pattern_data['categories'] ) ) {
				$categories = array_merge( $categories, array_map( 'trim', explode( ',', $pattern_data['categories'] ) ) );
			}

			$block_types = empty( $pattern_data['blockTypes'] )
				? array()
				: array_map( 'trim', explode( ',', $pattern_data['blockTypes'] ) );

			$pattern = array(
				// Untranslated on purpose: `make-pot` only collects pattern
				// headers from a `patterns/` directory at the plugin root, so
				// wrapping these would produce strings no catalogue can carry.
				'title'       => $pattern_data['title'],
				'description' => $pattern_data['description'],

				// The path rather than the markup: core reads the file the first
				// time a pattern's content is actually asked for, which on a
				// front-end request is never. Including all thirteen here cost
				// every page of the site thirteen includes and thirteen output
				// buffers to build something nobody looked at.
				'filePath'    => $pattern_file,
				'categories'  => $categories,
				'blockTypes'  => $block_types,
			);

			// The width a preview of the pattern is drawn at. Left out, the
			// editor assumes 1200px, and a gallery meant for a column of a page
			// is then previewed as a wall.
			if ( ! empty( $pattern_data['viewportWidth'] ) ) {
				$pattern['viewportWidth'] = (int) $pattern_data['viewportWidth'];
			}

			register_block_pattern( $pattern_data['slug'], $pattern );
		}
	}

	/**
	 * Get block attributes.
	 *
	 * @return array
	 */
	public static function get_block_attributes() {
		if ( ! empty( self::$cached_attributes ) ) {
			return self::$cached_attributes;
		}

		// Default attributes.
		$attributes = array(
			'block_id' => array(
				'type' => 'string',
			),
			'align' => array(
				'type' => 'string',
			),
			'className' => array(
				'type' => 'string',
			),
			'anchor' => array(
				'type' => 'string',
			),
		);

		// Add dynamic attributes from registered controls.
		$controls = Visual_Portfolio_Controls::get_registered_array();

		foreach ( $controls as $control ) {
			if ( isset( $attributes[ $control['name'] ] ) ) {
				continue;
			}

			if (
				'html' === $control['type'] ||
				'notice' === $control['type'] ||
				'pro_note' === $control['type'] ||
				'category_tabs' === $control['type'] ||
				'category_toggle_group' === $control['type'] ||
				'category_collapse' === $control['type'] ||
				'category_navigator' === $control['type']
			) {
				continue;
			}

			$attribute_data = apply_filters(
				'vpf_register_block_attribute_data',
				array(
					'type' => 'string',
				),
				$control
			);

			if ( ! $attribute_data ) {
				continue;
			}

			$attributes[ $control['name'] ] = $attribute_data;

			switch ( $control['type'] ) {
				case 'checkbox':
				case 'toggle':
					$attributes[ $control['name'] ]['type'] = 'boolean';
					break;
				case 'number':
				case 'range':
					$attributes[ $control['name'] ]['type'] = 'number';
					break;
				case 'select':
				case 'select2':
					if ( $control['multiple'] ) {
						$attributes[ $control['name'] ]['type']  = 'array';
						$attributes[ $control['name'] ]['items'] = array(
							'type' => 'string',
						);
					}
					break;
				case 'sortable':
					$attributes[ $control['name'] ]['type']  = 'array';
					$attributes[ $control['name'] ]['items'] = array(
						'type' => 'string',
					);
					break;
				case 'gallery':
					$attributes[ $control['name'] ]['type']  = 'array';
					$attributes[ $control['name'] ]['items'] = array(
						'type' => 'object',
					);
					break;
				case 'elements_selector':
					$attributes[ $control['name'] ]['type']  = 'object';
					$attributes[ $control['name'] ]['items'] = array(
						'type' => 'object',
					);
					break;
			}

			if ( isset( $control['default'] ) ) {
				$attributes[ $control['name'] ]['default'] = $control['default'];
			}
		}

		$attributes = apply_filters(
			'vpf_register_block_attributes',
			$attributes,
			$controls
		);

		self::$cached_attributes = $attributes;

		return self::$cached_attributes;
	}

	/**
	 * Transform block context to attributes array.
	 *
	 * @param array  $context Block context.
	 * @param string $context_namespace Context namespace.
	 * @return array
	 */
	public static function transform_context_to_attributes( $context, $context_namespace = 'vp' ) {
		if ( empty( $context ) || ! is_array( $context ) ) {
			return array();
		}

		$transformed_attributes = array();
		$namespace_prefix       = $context_namespace . '/';

		foreach ( $context as $key => $value ) {
			// Check if the context key belongs to our namespace.
			if ( strpos( $key, $namespace_prefix ) === 0 ) {
				// Remove namespace from key.
				$attribute_key = str_replace( $namespace_prefix, '', $key );

				// Add to transformed attributes.
				$transformed_attributes[ $attribute_key ] = $value;
			}
		}

		// Only convert to legacy format with defaults if we found namespace attributes.
		// This check prevents attributes from being filled with default values.
		// When there is no valid context matching the namespace.
		if ( ! empty( $transformed_attributes ) ) {
			$transformed_attributes = Visual_Portfolio_Convert_Attributes::modern_to_legacy( $transformed_attributes, true );
		}

		return $transformed_attributes;
	}

	/**
	 * Sort options the Gallery Sort block offers in the editor.
	 *
	 * An ordered list rather than a slug-keyed map: the default sorting has an
	 * empty slug, which is an awkward object key, and the order the options are
	 * registered in is the order the block renders them in.
	 *
	 * The editor asks without a loop, so a `vpf_loop_sort_options` callback that
	 * answers differently per loop offers everything it has here.
	 *
	 * @return array
	 */
	private static function get_loop_sort_options() {
		$result = array();

		foreach ( Visual_Portfolio_Get::get_loop_sort_options() as $value => $label ) {
			$result[] = array(
				'value' => (string) $value,
				'label' => $label,
			);
		}

		return $result;
	}

	/**
	 * Enqueue script for Gutenberg editor
	 */
	public function enqueue_block_editor_assets() {
		if ( ! is_admin() ) {
			return;
		}

		$attributes = self::get_block_attributes();

		$gutenberg_script_dependencies = array( 'masonry' );
		$editor_vendor_path            = 'build/gutenberg/editor-vendor';

		// Webpack may split heavy editor vendors into a separate chunk.
		if ( file_exists( visual_portfolio()->plugin_path . $editor_vendor_path . '.js' ) ) {
			Visual_Portfolio_Assets::enqueue_script(
				'visual-portfolio-gutenberg-editor-vendor',
				$editor_vendor_path
			);

			$gutenberg_script_dependencies[] = 'visual-portfolio-gutenberg-editor-vendor';
		}

		// Block.
		Visual_Portfolio_Assets::enqueue_script(
			'visual-portfolio-gutenberg',
			'build/gutenberg/index',
			$gutenberg_script_dependencies
		);
		Visual_Portfolio_Assets::enqueue_style(
			'visual-portfolio-gutenberg',
			'build/gutenberg/index'
		);
		wp_style_add_data( 'visual-portfolio-gutenberg', 'rtl', 'replace' );
		wp_style_add_data( 'visual-portfolio-gutenberg', 'suffix', '.min' );

		// Asking for the sort options fires `vpf_loop_sort_options`, and the
		// block that reads them ships with the Gallery Loop family.
		$loop_blocks = visual_portfolio()->supports_loop_blocks();

		wp_localize_script(
			'visual-portfolio-gutenberg',
			'VPGutenbergVariables',
			array(
				'nonce'                    => wp_create_nonce( 'vp-ajax-nonce' ),

				// Developer tooling is on: the editor speaks up about mistakes
				// only a developer can make, such as a loop control that ended
				// up outside its loop.
				'debug'                    => defined( 'SCRIPT_DEBUG' ) && SCRIPT_DEBUG,
				'plugin_version'           => VISUAL_PORTFOLIO_VERSION,
				'plugin_name'              => visual_portfolio()->plugin_name,
				'plugin_url'               => visual_portfolio()->plugin_url,
				'pro'                      => visual_portfolio()->is_pro(),
				'loop_blocks'              => $loop_blocks,
				'loop_sort_options'        => $loop_blocks ? self::get_loop_sort_options() : array(),
				'admin_url'                => get_admin_url(),
				'attributes'               => $attributes,
				'controls'                 => Visual_Portfolio_Controls::get_registered_array(),
				'controls_categories'      => Visual_Portfolio_Controls::get_registered_categories(),
				'items_count_notice'       => get_option( 'visual_portfolio_items_count_notice_state', 'show' ),
				'items_count_notice_limit' => 40,
			)
		);

		// Meta.
		Visual_Portfolio_Assets::enqueue_script(
			'visual-portfolio-gutenberg-custom-post-meta',
			'build/gutenberg/custom-post-meta'
		);
		Visual_Portfolio_Assets::enqueue_style(
			'visual-portfolio-gutenberg-custom-post-meta',
			'build/gutenberg/custom-post-meta'
		);
		wp_style_add_data( 'visual-portfolio-gutenberg-custom-post-meta', 'rtl', 'replace' );
		wp_style_add_data( 'visual-portfolio-gutenberg-custom-post-meta', 'suffix', '.min' );

		wp_localize_script(
			'visual-portfolio-gutenberg-custom-post-meta',
			'VPGutenbergMetaVariables',
			array(
				'nonce'       => wp_create_nonce( 'vp-ajax-nonce' ),
				'plugin_name' => visual_portfolio()->plugin_name,
			)
		);
	}
}

new Visual_Portfolio_Gutenberg();
