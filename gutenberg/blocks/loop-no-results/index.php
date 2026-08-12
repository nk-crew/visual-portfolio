<?php
/**
 * Block Loop No Results.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Visual Portfolio Loop No Results block.
 */
class Visual_Portfolio_Block_Loop_No_Results {
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
			visual_portfolio()->plugin_path . 'gutenberg/blocks/loop-no-results',
			array(
				'render_callback' => array( $this, 'block_render' ),
			)
		);
	}

	/**
	 * Block output
	 *
	 * A sibling of the item template rather than a replacement for it: the
	 * template keeps printing its empty list, which is the node the router swaps
	 * when the loop navigates back to a query that does find something.
	 *
	 * The query is resolved a second time here. It costs nothing - the item
	 * template asked for the same items with the same context in this request,
	 * and `get_loop_items()` memoizes per request.
	 *
	 * @param array    $attributes - block attributes.
	 * @param string   $content - block content.
	 * @param WP_Block $block - block instance.
	 *
	 * @return string
	 */
	public function block_render( $attributes, $content, $block ) {
		if ( empty( trim( $content ) ) ) {
			return '';
		}

		$atts = Visual_Portfolio_Gutenberg::transform_context_to_attributes( $block->context );

		if ( empty( $atts ) ) {
			return '';
		}

		$result = Visual_Portfolio_Get::get_loop_items( $atts );

		// A query that could not be resolved at all is not the same as one that
		// found nothing, and the item template stays silent about it too.
		if ( ! is_array( $result ) || ! empty( $result['items'] ) ) {
			return '';
		}

		return sprintf(
			'<div %1$s>%2$s</div>',
			get_block_wrapper_attributes(),
			$content
		);
	}
}
new Visual_Portfolio_Block_Loop_No_Results();
