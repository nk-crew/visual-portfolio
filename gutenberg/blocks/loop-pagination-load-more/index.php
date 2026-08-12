<?php
/**
 * Block Pagination Load More.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Visual Portfolio Pagination Load More block.
 */
class Visual_Portfolio_Block_Loop_Pagination_Load_More {
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
			visual_portfolio()->plugin_path . 'gutenberg/blocks/loop-pagination-load-more',
			array(
				'render_callback' => array( $this, 'block_render' ),
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
		$max_pages    = Visual_Portfolio_Block_Loop_Pagination::get_max_pages( $block->context );
		$query_id     = Visual_Portfolio_Block_Loop::get_query_id( $block->context );
		$current_page = Visual_Portfolio_Get::get_current_page_number( $query_id );

		// Nothing left to load.
		if ( $max_pages <= 1 || $current_page >= $max_pages ) {
			return '';
		}

		// Get attributes with defaults.
		$label         = $attributes['label'] ?? __( 'Load More', 'visual-portfolio' );
		$loading_label = $attributes['loadingLabel'] ?? __( 'Loading...', 'visual-portfolio' );

		// The router replaces a region, it cannot extend one, so this trigger is
		// the one control that fetches for itself.
		$wrapper_attributes = get_block_wrapper_attributes(
			array(
				'class'               => 'vp-block-loop-pagination-load-more',
				'data-wp-interactive' => Visual_Portfolio_Block_Loop::STORE,
				'data-wp-on--click'   => 'actions.loadMore',
			)
		);

		$pagination_links = Visual_Portfolio_Get::get_pagination_links(
			array(
				'start_page' => $current_page,
				'max_pages'  => $max_pages,
			),
			array(
				'pagination_paged__show_arrows'  => true,
				'pagination_paged__show_numbers' => false,
			),
			$query_id
		);

		// Find the next page link from the pagination links.
		$next_link = '#';
		foreach ( $pagination_links as $link ) {
			if ( $link['is_next_arrow'] ) {
				$next_link = $link['url'] ? esc_url( Visual_Portfolio_Block_Loop::add_random_seed( $link['url'], $block->context ) ) : '#';
				break;
			}
		}

		return sprintf(
			'<a href="%1$s" %2$s><span>%3$s</span><span class="vp-block-loop-pagination-load-more-loading"><span class="vp-spinner"></span><span class="vp-screen-reader-text">%4$s</span></span></a>',
			$next_link,
			$wrapper_attributes,
			wp_kses_post( $label ),
			wp_kses_post( $loading_label )
		);
	}
}
new Visual_Portfolio_Block_Loop_Pagination_Load_More();
