<?php
/**
 * Block Search.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Visual Portfolio Search block.
 */
class Visual_Portfolio_Block_Loop_Search {
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
		Visual_Portfolio_Assets::register_style( 'visual-portfolio-block-loop-search', 'build/gutenberg/blocks/loop-search/style' );
		wp_style_add_data( 'visual-portfolio-block-loop-search', 'rtl', 'replace' );

		register_block_type_from_metadata(
			visual_portfolio()->plugin_path . 'gutenberg/blocks/loop-search',
			array(
				'render_callback' => array( $this, 'block_render' ),
			)
		);
	}

	/**
	 * Block output
	 *
	 * Renders nothing. The visitor search belongs to an extension, which
	 * supplies the render callback through `register_block_type_args`.
	 * Without one the block stays registered, so the posts that hold it keep
	 * it.
	 *
	 * @return string
	 */
	public function block_render() {
		return '';
	}
}
new Visual_Portfolio_Block_Loop_Search();
