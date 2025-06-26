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
				'class' => 'vp-block-pagination-numbers',
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
				'mid_size'   => $attributes['midSize'],
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
				$output .= '<span class="vp-block-pagination-dots">...</span>';
			} else {
				$url = $link['url'] ? esc_url( $link['url'] ) : '#';

				if ( $link['active'] ) {
					$output .= sprintf(
						'<span aria-label="%1$s" aria-current="page" class="is-active">%2$s</span>',
						// translators: %s page number.
						sprintf( esc_attr__( 'Page %s', 'visual-portfolio' ), $link['label'] ),
						esc_html( $link['label'] )
					);
				} else {
					$output .= sprintf(
						'<a aria-label="%1$s" href="%2$s">%3$s</a>',
						// translators: %s page number.
						sprintf( esc_attr__( 'Page %s', 'visual-portfolio' ), $link['label'] ),
						$url,
						esc_html( $link['label'] )
					);
				}
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
