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
		if ( ! function_exists( 'register_block_type_from_metadata' ) ) {
			return;
		}

		register_block_type_from_metadata(
			visual_portfolio()->plugin_path . 'gutenberg/blocks/loop',
			array(
				'render_callback' => array( $this, 'block_render' ),
				'attributes'      => Visual_Portfolio_Gutenberg::get_block_attributes(),
			)
		);
	}

	/**
	 * Block output
	 *
	 * @param array  $attributes - block attributes.
	 * @param string $inner_blocks - inner blocks.
	 *
	 * @return string
	 */
	public function block_render( $attributes, $inner_blocks ) {
		$config             = Visual_Portfolio_Get::get_output_config( $attributes );
		$wrapper_attributes = get_block_wrapper_attributes(
			array(
				'class' => $config['class'],
			)
		);

		return sprintf(
			'<div %1$s>%2$s</div>',
			$wrapper_attributes,
			$inner_blocks
		);
	}
}
new Visual_Portfolio_Block_Loop();
