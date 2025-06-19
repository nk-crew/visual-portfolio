<?php
/**
 * Block Pagination Previous.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Visual Portfolio Pagination Previous block.
 */
class Visual_Portfolio_Block_Pagination_Previous {
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
		Visual_Portfolio_Assets::register_style( 'visual-portfolio-block-pagination-previous', 'build/gutenberg/blocks/pagination-previous/style' );
		wp_style_add_data( 'visual-portfolio-block-pagination-previous', 'rtl', 'replace' );

		register_block_type_from_metadata(
			visual_portfolio()->plugin_path . 'gutenberg/blocks/pagination-previous',
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

		// If only one page, don't show pagination.
		if ( $max_pages <= 1 ) {
			return '';
		}

		$wrapper_attributes = get_block_wrapper_attributes(
			array(
				'class' => 'vp-pagination-prev',
			)
		);

		$label = isset( $attributes['label'] ) ? $attributes['label'] : '« ' . __( 'Previous', 'visual-portfolio' );

		// Get current page.
		$current_page = max( 1, isset( $_GET['vp_page'] ) ? Visual_Portfolio_Security::sanitize_number( $_GET['vp_page'] ) : 1 );

		// If on the first page, don't show the previous link.
		if ( $current_page <= 1 ) {
			return '';
		}

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

		// Find the previous page link from the pagination links.
		$prev_link = '#';
		foreach ( $pagination_links as $link ) {
			if ( $link['is_prev_arrow'] ) {
				$prev_link = $link['url'] ? esc_url( $link['url'] ) : '#';
				break;
			}
		}

		// Disable link if on first page.
		$disabled_class = $current_page <= 1 ? ' vp-pagination-disabled' : '';

		return sprintf(
			'<div %1$s><a href="%2$s" class="vp-pagination-prev-link%3$s" data-vp-pagination="prev"><span class="vp-pagination-prev-icon">←</span><span class="vp-pagination-prev-label">%4$s</span></a></div>',
			$wrapper_attributes,
			$prev_link,
			$disabled_class,
			esc_html( $label )
		);
	}
}
new Visual_Portfolio_Block_Pagination_Previous();
