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
	 * Shown on the last page of a gallery that has more than one, and printed
	 * hidden on the pages before it. Load More and infinite scroll never reload
	 * the page, so they reveal it once the page they fetched is the last. A copy
	 * taken from that page would lose the behaviour of any block inside it,
	 * which only runs on what the page was printed with.
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
		$current_page = Visual_Portfolio_Block_Loop::get_current_page( $block->context );

		// A gallery of one page has no list to reach the end of, and a page
		// past the last one is left to No Results.
		if ( $max_pages <= 1 || (int) $current_page > (int) $max_pages ) {
			return '';
		}

		return sprintf(
			'<div %1$s%2$s>%3$s</div>',
			get_block_wrapper_attributes( array( 'class' => 'vp-block-loop-pagination-end' ) ),
			(int) $current_page < (int) $max_pages ? ' hidden' : '',
			$content
		);
	}
}
new Visual_Portfolio_Block_Loop_Pagination_End();
