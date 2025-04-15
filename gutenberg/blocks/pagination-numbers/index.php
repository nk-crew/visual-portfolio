<?php
/**
 * Block Pagination Numbers.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Visual Portfolio Pagination Numbers block.
 */
class Visual_Portfolio_Block_Pagination_Numbers {
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

		Visual_Portfolio_Assets::register_style( 'visual-portfolio-block-pagination-numbers', 'build/gutenberg/blocks/pagination-numbers/style' );
		wp_style_add_data( 'visual-portfolio-block-pagination-numbers', 'rtl', 'replace' );

		register_block_type_from_metadata(
			visual_portfolio()->plugin_path . 'gutenberg/blocks/pagination-numbers',
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
				'class' => 'vp-pagination-numbers',
			)
		);

		// Get current page.
		$current_page = max( 1, isset( $_GET['vp_page'] ) ? Visual_Portfolio_Security::sanitize_number( $_GET['vp_page'] ) : 1 );
		if ( $current_page < 1 ) {
			$current_page = 1;
		}

		$pagination_links = Visual_Portfolio_Get::get_pagination_links(
			array(
				'start_page' => $current_page,
				'max_pages'  => $max_pages,
			),
			array(
				'pagination_paged__show_arrows'  => false,
				'pagination_paged__show_numbers' => true,
			)
		);

		// Generate pagination numbers.
		$output = '';

		// Iterate over pagination links.
		foreach ( $pagination_links as $link ) {
			if ( $link['is_dots'] ) {
				$output .= '<span class="vp-pagination-number-ellipsis">...</span>';
			} else {
				$active_class = $link['active'] ? ' vp-pagination-number-active' : '';
				$url          = $link['url'] ? esc_url( $link['url'] ) : '#';
				$output      .= sprintf(
					'<span class="vp-pagination-number%1$s"><a href="%2$s" data-vp-pagination="%3$s">%3$s</a></span>',
					$active_class,
					$url,
					esc_html( $link['label'] )
				);
			}
		}

		return sprintf(
			'<div %1$s>%2$s</div>',
			$wrapper_attributes,
			$output
		);
	}
}
new Visual_Portfolio_Block_Pagination_Numbers();
