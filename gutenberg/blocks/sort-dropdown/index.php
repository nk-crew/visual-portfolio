<?php
/**
 * Block Sort Dropdown.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Visual Portfolio Sort Dropdown block.
 */
class Visual_Portfolio_Block_Sort_Dropdown {
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
		Visual_Portfolio_Assets::register_style( 'visual-portfolio-block-sort-dropdown', 'build/gutenberg/blocks/sort-dropdown/style' );
		wp_style_add_data( 'visual-portfolio-block-sort-dropdown', 'rtl', 'replace' );

		Visual_Portfolio_Assets::register_style( 'visual-portfolio-block-sort-dropdown-editor', 'build/gutenberg/blocks/sort-dropdown/editor' );
		wp_style_add_data( 'visual-portfolio-block-sort-dropdown-editor', 'rtl', 'replace' );

		register_block_type_from_metadata(
			visual_portfolio()->plugin_path . 'gutenberg/blocks/sort-dropdown'
		);
	}
}
new Visual_Portfolio_Block_Sort_Dropdown();
