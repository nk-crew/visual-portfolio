<?php
/**
 * Block Filter.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Visual Portfolio Filter block.
 */
class Visual_Portfolio_Block_Filter {
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
		if ( ! function_exists( 'register_block_type_from_metadata' ) ) {
			return;
		}

		Visual_Portfolio_Assets::register_style( 'visual-portfolio-block-filter', 'build/gutenberg/blocks/filter/style' );
		wp_style_add_data( 'visual-portfolio-block-filter', 'rtl', 'replace' );

		Visual_Portfolio_Assets::register_style( 'visual-portfolio-block-filter-editor', 'build/gutenberg/blocks/filter/style' );
		wp_style_add_data( 'visual-portfolio-block-filter-editor', 'rtl', 'replace' );

		register_block_type_from_metadata(
			visual_portfolio()->plugin_path . 'gutenberg/blocks/filter'
		);
	}
}
new Visual_Portfolio_Block_Filter();
