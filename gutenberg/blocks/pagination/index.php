<?php
/**
 * Block Paged Pagination.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Visual Portfolio Paged Pagination block.
 */
class Visual_Portfolio_Block_Paged_Pagination {
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

		Visual_Portfolio_Assets::register_style( 'visual-portfolio-block-pagination', 'build/gutenberg/blocks/pagination/style' );
		wp_style_add_data( 'visual-portfolio-block-pagination', 'rtl', 'replace' );

		Visual_Portfolio_Assets::register_style( 'visual-portfolio-block-pagination-editor', 'build/gutenberg/blocks/pagination/editor' );
		wp_style_add_data( 'visual-portfolio-block-pagination-editor', 'rtl', 'replace' );

		register_block_type_from_metadata(
			visual_portfolio()->plugin_path . 'gutenberg/blocks/pagination',
			array(
				'render_callback' => array( $this, 'block_render' ),
			)
		);
	}

	/**
	 * Get max pages for all pagination blocks
	 *
	 * @param array $context - Block Loop Context with query block attributes.
	 * @return int
	 */
	public static function get_max_pages( $context ) {
		// Get context values.
		$max_pages = isset( $context['visual-portfolio/maxPages'] )
		? $context['visual-portfolio/maxPages']
		: 1;

		// Check if filtering is applied.
		$filter_applied = isset( $_GET['vp_filter'] ) && ! empty( $_GET['vp_filter'] );

		// If filter is applied, we need to recalculate max_pages.
		if ( $filter_applied ) {
			$rest_api = new Visual_Portfolio_Rest();
			// Get the filter value.
			$filter = sanitize_text_field( wp_unslash( $_GET['vp_filter'] ) );

			// Create request data from block context.
			$request_data = array(
				'content_source' => $context['visual-portfolio/content_source'] ?? 'post-based',
				'items_count'    => (int) ( $context['visual-portfolio/items_count'] ?? 6 ),
				'vp_filter'      => $filter,
			);

			// Map relevant block context to request parameters.
			$context_mapping = array(
				'visual-portfolio/id'                     => 'id',
				'visual-portfolio/posts_source'           => 'posts_source',
				'visual-portfolio/posts_taxonomies'       => 'posts_taxonomies',
				'visual-portfolio/posts_order_by'         => 'posts_order_by',
				'visual-portfolio/posts_order_direction'  => 'posts_order_direction',
				'visual-portfolio/posts_ids'              => 'posts_ids',
				'visual-portfolio/posts_excluded_ids'     => 'posts_excluded_ids',
				'visual-portfolio/images'                 => 'images',
				'visual-portfolio/images_order_by'        => 'images_order_by',
				'visual-portfolio/images_order_direction' => 'images_order_direction',
			);

			foreach ( $context_mapping as $context_key => $param_key ) {
				if ( isset( $context[ $context_key ] ) ) {
					$request_data[ $param_key ] = $context[ $context_key ];
				}
			}

			$max_pages = $rest_api->calculate_max_pages( $request_data );
		}

		return $max_pages;
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
		// Get block style.
		$block_style = '';

		// Parse the class name from block attributes to get the style.
		if ( isset( $block->attributes['className'] ) && strpos( $block->attributes['className'], 'is-style-' ) !== false ) {
			// Extract style name from className (e.g., "is-style-classic" becomes "classic").
			preg_match( '/is-style-([^\s]+)/', $block->attributes['className'], $matches );
			if ( isset( $matches[1] ) ) {
				$block_style = $matches[1];
			}
		}

		// If no specific style found in className, use the default "minimal".
		if ( empty( $block_style ) ) {
			$block_style = 'minimal';
		}

		$wrapper_attributes = get_block_wrapper_attributes(
			array(
				'class' => 'vp-pagination vp-pagination-type-paged vp-pagination-style-' . $block_style,
			)
		);

		return sprintf(
			'<div %1$s>%2$s</div>',
			$wrapper_attributes,
			$content
		);
	}
}
new Visual_Portfolio_Block_Paged_Pagination();
