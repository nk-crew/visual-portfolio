<?php
/**
 * Block Filter by Category.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Visual Portfolio Filter by Category block.
 */
class Visual_Portfolio_Block_Loop_Filter {
	/**
	 * Constructor.
	 */
	public function __construct() {
		add_action( 'init', array( $this, 'register_block' ), 11 );
	}

	/**
	 * Register Block.
	 */
	public function register_block() {
		Visual_Portfolio_Assets::register_style( 'visual-portfolio-block-loop-filter', 'build/gutenberg/blocks/loop-filter/style' );
		wp_style_add_data( 'visual-portfolio-block-loop-filter', 'rtl', 'replace' );

		register_block_type_from_metadata(
			visual_portfolio()->plugin_path . 'gutenberg/blocks/loop-filter',
			array(
				'render_callback' => array( $this, 'block_render' ),
			)
		);
	}

	/**
	 * Block output
	 *
	 * @param array  $attributes - block attributes.
	 * @param string $content - block content.
	 *
	 * @return string
	 */
	public function block_render( $attributes, $content ) {
		if ( empty( trim( $content ) ) ) {
			return '';
		}

		$wrapper_attributes = get_block_wrapper_attributes(
			array(
				'class'      => 'vp-block-loop-filter',
				// `get_block_wrapper_attributes()` escapes the values itself.
				'aria-label' => __( 'Category filter', 'visual-portfolio' ),
			)
		);

		return sprintf(
			'<nav %1$s>%2$s</nav>',
			$wrapper_attributes,
			$content
		);
	}
}
new Visual_Portfolio_Block_Loop_Filter();
