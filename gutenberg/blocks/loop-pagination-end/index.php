<?php
/**
 * Block Pagination End of List.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Visual Portfolio Pagination End of List block.
 */
class Visual_Portfolio_Block_Loop_Pagination_End {
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
			visual_portfolio()->plugin_path . 'gutenberg/blocks/loop-pagination-end',
			array(
				'render_callback' => array( $this, 'block_render' ),
			)
		);
	}

	/**
	 * Block output
	 *
	 * Printed on the last page of a gallery that has more than one. Load More
	 * and infinite scroll never reload the page to reach it: they take this
	 * block from the last page they fetch and put it where the trigger was.
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

		$max_pages    = Visual_Portfolio_Block_Loop_Pagination::get_max_pages( $block->context );
		$query_id     = Visual_Portfolio_Block_Loop::get_query_id( $block->context );
		$current_page = Visual_Portfolio_Get::get_current_page_number( $query_id );

		// A gallery of one page has no list to reach the end of.
		if ( $max_pages <= 1 || $current_page < $max_pages ) {
			return '';
		}

		return sprintf(
			'<div %1$s>%2$s</div>',
			get_block_wrapper_attributes( array( 'class' => 'vp-block-loop-pagination-end' ) ),
			$content
		);
	}
}
new Visual_Portfolio_Block_Loop_Pagination_End();
