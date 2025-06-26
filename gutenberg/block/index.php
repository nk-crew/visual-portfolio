<?php
/**
 * Block render and register.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Main Visual Portfolio block.
 */
class Visual_Portfolio_Block {
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
		register_block_type_from_metadata(
			visual_portfolio()->plugin_path . 'gutenberg/block',
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
	 * @param string $content - block content.
	 * @param object $block - block instance.
	 *
	 * @return string
	 */
	public function block_render( $attributes, $content, $block ) {
		$attributes = array_merge(
			array(
				'anchor'    => '',
				'align'     => '',
				'className' => '',
			),
			$attributes
		);

		// Transform context to attributes.
		$context_attributes = Visual_Portfolio_Gutenberg::transform_context_to_attributes( $block->context );

		// Merge with block attributes.
		$merged_attributes = array_merge( $attributes, $context_attributes );

		$class_name = 'wp-block-visual-portfolio';

		$wrapper_attributes = get_block_wrapper_attributes(
			array(
				'id'    => $merged_attributes['anchor'],
				'class' => $class_name,
			)
		);

		return sprintf( '<div %1$s>%2$s</div>', $wrapper_attributes, Visual_Portfolio_Get::get( $merged_attributes ) );
	}
}
new Visual_Portfolio_Block();
