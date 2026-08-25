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
class Visual_Portfolio_Block_Loop_Pagination_Previous {
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
			visual_portfolio()->plugin_path . 'gutenberg/blocks/loop-pagination-previous',
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
		$max_pages = Visual_Portfolio_Block_Loop_Pagination::get_max_pages( $block->context );

		// If only one page, don't show pagination.
		if ( $max_pages <= 1 ) {
			return '';
		}

		// Get current page.
		$query_id     = Visual_Portfolio_Block_Loop::get_query_id( $block->context );
		$current_page = Visual_Portfolio_Get::get_current_page_number( $query_id );

		// If on the first page, don't show the previous link.
		if ( $current_page <= 1 ) {
			return '';
		}

		$wrapper_attributes = get_block_wrapper_attributes(
			array(
				'class'               => 'vp-block-loop-pagination-previous',
				'data-wp-interactive' => Visual_Portfolio_Block_Loop::STORE,
				'data-wp-on--click'   => 'actions.navigate',
			)
		);
		$show_label         = $block->context['vp/showLabel'] ?? true;
		$default_label      = esc_html__( 'Previous', 'visual-portfolio' );
		$label_text         = isset( $attributes['label'] ) && ! empty( $attributes['label'] ) ? esc_html( $attributes['label'] ) : $default_label;
		$label              = $show_label ? $label_text : '';
		$show_arrow         = $block->context['vp/showArrow'] ?? true;

		if ( ! $label ) {
			$wrapper_attributes .= ' aria-label="' . $label_text . '"';
		}
		if ( $show_arrow ) {
			$label = '<span class="vp-block-loop-pagination-previous-arrow" aria-hidden="true">&lsaquo;</span>' . $label;
		}

		$prev_link = Visual_Portfolio_Block_Loop::get_page_url( $current_page - 1, $block->context );

		return sprintf(
			'<a href="%1$s" %2$s>%3$s</a>',
			$prev_link,
			$wrapper_attributes,
			$label
		);
	}
}
new Visual_Portfolio_Block_Loop_Pagination_Previous();
