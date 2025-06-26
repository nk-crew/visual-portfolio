<?php
/**
 * Block Pagination Infinite.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Visual Portfolio Pagination Infinite block.
 */
class Visual_Portfolio_Block_Pagination_Infinite {
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
			visual_portfolio()->plugin_path . 'gutenberg/blocks/pagination-infinite',
			array(
				'render_callback' => array( $this, 'block_render' ),
			)
		);

		Visual_Portfolio_Assets::store_used_assets( 'visual-portfolio-pagination-infinite', true, 'script' );
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
		$max_pages = Visual_Portfolio_Block_Paged_Pagination::get_max_pages( $block->context );

		// Get attributes with defaults.
		$label         = $attributes['label'] ?? __( 'Load More', 'visual-portfolio' );
		$loading_label = $attributes['loadingLabel'] ?? __( 'Loading...', 'visual-portfolio' );

		// Get current page.
		$current_page = max( 1, isset( $_GET['vp_page'] ) ? Visual_Portfolio_Security::sanitize_number( $_GET['vp_page'] ) : 1 );

		$wrapper_attributes = get_block_wrapper_attributes(
			array(
				'class' => 'vp-block-pagination-infinite',
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
			)
		);

		// Find the next page link from the pagination links.
		$next_link = '#';
		foreach ( $pagination_links as $link ) {
			if ( $link['is_next_arrow'] ) {
				$next_link = $link['url'] ? esc_url( $link['url'] ) : '#';
				break;
			}
		}

		return sprintf(
			'<a href="%1$s" %2$s><span>%3$s</span><span class="vp-block-pagination-load-more-loading"><span class="vp-spinner"></span><span class="vp-screen-reader-text">%4$s</span></span></a>',
			$next_link,
			$wrapper_attributes,
			wp_kses_post( $label ),
			wp_kses_post( $loading_label )
		);
	}
}
new Visual_Portfolio_Block_Pagination_Infinite();
