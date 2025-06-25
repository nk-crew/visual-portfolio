<?php
/**
 * Block Loop.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Visual Portfolio Loop block.
 */
class Visual_Portfolio_Block_Loop {
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
		Visual_Portfolio_Assets::register_script( 'visual-portfolio-block-loop', 'build/gutenberg/blocks/loop/view' );

		register_block_type_from_metadata(
			visual_portfolio()->plugin_path . 'gutenberg/blocks/loop'
		);
	}
}
new Visual_Portfolio_Block_Loop();
