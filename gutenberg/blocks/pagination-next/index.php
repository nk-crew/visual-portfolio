<?php
/**
 * Block Pagination Next.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Visual Portfolio Pagination Next block.
 */
class Visual_Portfolio_Block_Pagination_Next {
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
		Visual_Portfolio_Assets::register_style( 'visual-portfolio-block-pagination-next', 'build/gutenberg/blocks/pagination-next/editor' );
		wp_style_add_data( 'visual-portfolio-block-pagination-next', 'rtl', 'replace' );

		register_block_type_from_metadata(
			visual_portfolio()->plugin_path . 'gutenberg/blocks/pagination-next',
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
		$max_pages = Visual_Portfolio_Block_Paged_Pagination::get_max_pages( $block->context );

		// Get current page.
		$current_page = max( 1, isset( $_GET['vp_page'] ) ? Visual_Portfolio_Security::sanitize_number( $_GET['vp_page'] ) : 1 );

		// If only one page or on the last page, don't show pagination.
		if ( $max_pages <= 1 || $current_page >= $max_pages ) {
			return '';
		}

		$wrapper_attributes = get_block_wrapper_attributes(
			array(
				'class' => 'vp-pagination-next',
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

		// Default label for the next button.
		$label = isset( $attributes['label'] ) ? $attributes['label'] : __( 'Next', 'visual-portfolio' );

		// Find the next page link from the pagination links.
		$next_link = '#';
		foreach ( $pagination_links as $link ) {
			if ( $link['is_next_arrow'] ) {
				$next_link = $link['url'] ? esc_url( $link['url'] ) : '#';
				break;
			}
		}

		// Disable link if on last page.
		$disabled_class = $current_page >= $max_pages ? ' vp-pagination-disabled' : '';

		return sprintf(
			'<div %1$s><a href="%2$s" class="vp-pagination-next-link%3$s" data-vp-pagination="next"><span class="vp-pagination-next-label">%4$s</span><span class="vp-pagination-next-icon">→</span></a></div>',
			$wrapper_attributes,
			$next_link,
			$disabled_class,
			esc_html( $label )
		);
	}
}
new Visual_Portfolio_Block_Pagination_Next();
