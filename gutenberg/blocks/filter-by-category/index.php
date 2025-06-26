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
class Visual_Portfolio_Block_Filter_By_Category {
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
		Visual_Portfolio_Assets::register_style( 'visual-portfolio-block-filter-by-category', 'build/gutenberg/blocks/filter-by-category/style' );
		wp_style_add_data( 'visual-portfolio-block-filter-by-category', 'rtl', 'replace' );

		Visual_Portfolio_Assets::register_script( 'visual-portfolio-block-filter-by-category', 'build/gutenberg/blocks/filter-by-category/view' );

		register_block_type_from_metadata(
			visual_portfolio()->plugin_path . 'gutenberg/blocks/filter-by-category',
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
				'class'      => 'vp-block-filter-by-category',
				'aria-label' => esc_attr__( 'Category filter', 'visual-portfolio' ),
			)
		);

		return sprintf(
			'<nav %1$s>%2$s</nav>',
			$wrapper_attributes,
			$content
		);
	}
}
new Visual_Portfolio_Block_Filter_By_Category();
