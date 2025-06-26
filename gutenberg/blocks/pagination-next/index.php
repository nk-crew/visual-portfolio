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
				'class' => 'vp-block-pagination-next',
			)
		);
		$show_label         = $attributes['showLabel'] ?? true;
		$default_label      = esc_html__( 'Next', 'visual-portfolio' );
		$label_text         = isset( $attributes['label'] ) && ! empty( $attributes['label'] ) ? esc_html( $attributes['label'] ) : $default_label;
		$label              = $show_label ? $label_text : '';
		$show_arrow         = $attributes['showArrow'] ?? true;

		if ( ! $label ) {
			$wrapper_attributes .= ' aria-label="' . $label_text . '"';
		}
		if ( $show_arrow ) {
			$label = $label . '<span class="vp-block-pagination-next-arrow" aria-hidden="true">&rsaquo;</span>';
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

		// Find the next page link from the pagination links.
		$next_link = '#';
		foreach ( $pagination_links as $link ) {
			if ( $link['is_next_arrow'] ) {
				$next_link = $link['url'] ? esc_url( $link['url'] ) : '#';
				break;
			}
		}

		return sprintf(
			'<a href="%1$s" %2$s>%3$s</a>',
			$next_link,
			$wrapper_attributes,
			$label
		);
	}
}
new Visual_Portfolio_Block_Pagination_Next();
