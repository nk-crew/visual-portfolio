<?php
/**
 * Gutenberg block.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Visual_Portfolio_Gutenberg_Block
 */
class Visual_Portfolio_Gutenberg_Block {
	/**
	 * Cached block attributes, we will use it when register block in PHP and in JS.
	 *
	 * @var array
	 */
	public $cached_attributes = array();

	/**
	 * Registered controls, that will be used in Gutenberg block.
	 *
	 * @var array
	 */
	public $registered_controls = array();

	/**
	 * Visual_Portfolio_Gutenberg_Block constructor.
	 */
	public function __construct() {
		add_action( 'init', array( $this, 'register_block' ), 11 );
		add_action( 'enqueue_block_assets', array( $this, 'enqueue_block_editor_assets' ) );
	}

	/**
	 * Get block attributes.
	 *
	 * @return array
	 */
	public function get_block_attributes() {
		if ( ! empty( $this->cached_attributes ) ) {
			return $this->cached_attributes;
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

		$this->cached_attributes = $attributes;

		return $this->cached_attributes;
	}

	/**
	 * Register Block.
	 */
	public function register_block() {
		if ( ! function_exists( 'register_block_type_from_metadata' ) ) {
			return;
		}

		$attributes = $this->get_block_attributes();

		register_block_type_from_metadata(
			visual_portfolio()->plugin_path . 'gutenberg/block',
			array(
				'render_callback' => array( $this, 'block_render' ),
				'attributes'      => $attributes,
			)
		);
	}

	/**
	 * Block output
	 *
	 * @param array $attributes - block attributes.
	 *
	 * @return string
	 */
	public function block_render( $attributes ) {
		$attributes = array_merge(
			array(
				'align'     => '',
				'className' => '',
			),
			$attributes
		);

		$class_name = 'wp-block-visual-portfolio';

		$wrapper_attributes = get_block_wrapper_attributes(
			array(
				'class' => $class_name,
			)
		);

		return sprintf( '<div %1$s>%2$s</div>', $wrapper_attributes, Visual_Portfolio_Get::get( $attributes ) );
	}

	/**
	 * Enqueue script for Gutenberg editor
	 */
	public function enqueue_block_editor_assets() {
		if ( ! is_admin() ) {
			return;
		}

		$attributes = $this->get_block_attributes();

		// Block.
		Visual_Portfolio_Assets::enqueue_script(
			'visual-portfolio-gutenberg',
			'build/gutenberg/index',
			array( 'masonry' )
		);
		Visual_Portfolio_Assets::enqueue_style(
			'visual-portfolio-gutenberg',
			'build/gutenberg/index'
		);
		wp_style_add_data( 'visual-portfolio-gutenberg', 'rtl', 'replace' );
		wp_style_add_data( 'visual-portfolio-gutenberg', 'suffix', '.min' );

		wp_localize_script(
			'visual-portfolio-gutenberg',
			'VPGutenbergVariables',
			array(
				'nonce'                    => wp_create_nonce( 'vp-ajax-nonce' ),
				'plugin_version'           => VISUAL_PORTFOLIO_VERSION,
				'plugin_name'              => visual_portfolio()->plugin_name,
				'plugin_url'               => visual_portfolio()->plugin_url,
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
new Visual_Portfolio_Gutenberg_Block();
