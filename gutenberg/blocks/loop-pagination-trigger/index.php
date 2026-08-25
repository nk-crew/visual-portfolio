<?php
/**
 * Block Pagination Trigger.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Visual Portfolio Pagination Trigger block.
 */
class Visual_Portfolio_Block_Loop_Pagination_Trigger {
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
			visual_portfolio()->plugin_path . 'gutenberg/blocks/loop-pagination-trigger',
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

		$is_infinite = 'infinite' === ( $attributes['triggerType'] ?? 'load-more' );

		// Get attributes with defaults.
		$label         = empty( $attributes['label'] ) ? __( 'Load More', 'visual-portfolio' ) : $attributes['label'];
		$loading_label = empty( $attributes['loadingLabel'] ) ? __( 'Loading...', 'visual-portfolio' ) : $attributes['loadingLabel'];

		// The router replaces a region, it cannot extend one, so this trigger is
		// the one control that fetches for itself. It stays a real link either
		// way: without the observer, or without any JavaScript at all, clicking
		// it is still the next page.
		// One class for both variations. What separates them is the directive
		// below, which is the only difference that changes behaviour.
		$wrapper_args = array(
			'class'               => 'vp-block-loop-pagination-trigger',
			'data-wp-interactive' => Visual_Portfolio_Block_Loop::STORE,
			'data-wp-on--click'   => 'actions.loadMore',
		);

		if ( $is_infinite ) {
			$wrapper_args['data-wp-init'] = 'callbacks.observeInfinite';
		}

		$next_link = Visual_Portfolio_Block_Loop::get_page_url( $current_page + 1, $block->context );

		return sprintf(
			'<a href="%1$s" %2$s><span>%3$s</span><span class="vp-block-loop-pagination-trigger-loading"><span class="vp-spinner"></span><span class="vp-screen-reader-text">%4$s</span></span></a>',
			$next_link,
			get_block_wrapper_attributes( $wrapper_args ),
			wp_kses_post( $label ),
			wp_kses_post( $loading_label )
		);
	}
}
new Visual_Portfolio_Block_Loop_Pagination_Trigger();
