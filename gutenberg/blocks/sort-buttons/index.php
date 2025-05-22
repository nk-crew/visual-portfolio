<?php
/**
 * Block Sort Buttons.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Visual Portfolio Sort Buttons block.
 */
class Visual_Portfolio_Block_Sort_Buttons {
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

		Visual_Portfolio_Assets::register_style( 'visual-portfolio-block-sort-buttons', 'build/gutenberg/blocks/sort-buttons/style' );
		wp_style_add_data( 'visual-portfolio-block-sort-buttons', 'rtl', 'replace' );

		// Register style variants.
		Visual_Portfolio_Assets::register_style( 'visual-portfolio-block-sort-buttons-minimal', 'build/gutenberg/blocks/sort-buttons/style-minimal' );
		Visual_Portfolio_Assets::register_style( 'visual-portfolio-block-sort-buttons-classic', 'build/gutenberg/blocks/sort-buttons/style-classic' );

		Visual_Portfolio_Assets::register_style( 'visual-portfolio-block-sort-buttons-editor', 'build/gutenberg/blocks/sort-buttons/editor' );
		wp_style_add_data( 'visual-portfolio-block-sort-buttons-editor', 'rtl', 'replace' );

		register_block_type_from_metadata(
			visual_portfolio()->plugin_path . 'gutenberg/blocks/sort-buttons'
		);
	}
}
new Visual_Portfolio_Block_Sort_Buttons();
