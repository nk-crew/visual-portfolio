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
			visual_portfolio()->plugin_path . 'gutenberg/blocks/pagination'
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
		$max_pages = $context['visual-portfolio/maxPages'] ?? 1;

		// Check if filtering is applied.
		if ( empty( $_GET['vp_filter'] ) ) {
			return $max_pages;
		}

		// If filter is applied, we need to recalculate max_pages.
		$rest_api = new Visual_Portfolio_Rest();

		// Create base request data.
		$request_data = array(
			'content_source' => $context['visual-portfolio/content_source'] ?? 'post-based',
			'items_count'    => (int) ( $context['visual-portfolio/items_count'] ?? 6 ),
			'vp_filter'      => sanitize_text_field( wp_unslash( $_GET['vp_filter'] ) ),
		);

		// Universal mapping: convert all visual-portfolio/* context keys to request parameters.
		$request_data = array_merge( $request_data, self::map_context_to_request( $context ) );

		return $rest_api->calculate_max_pages( $request_data );
	}

	/**
	 * Universal context mapping helper
	 *
	 * @param array $context - Block context.
	 * @return array - Mapped request data
	 */
	private static function map_context_to_request( $context ) {
		$request_data = array();
		$prefix       = 'visual-portfolio/';

		foreach ( $context as $key => $value ) {
			// Skip if key doesn't start with our prefix.
			if ( strpos( $key, $prefix ) !== 0 ) {
				continue;
			}

			// Convert context key to request parameter key.
			$param_key = str_replace( $prefix, '', $key );

			// Skip keys we already handle in the main function.
			if ( in_array( $param_key, array( 'maxPages', 'content_source', 'items_count' ), true ) ) {
				continue;
			}

			$request_data[ $param_key ] = $value;
		}

		return $request_data;
	}
}
new Visual_Portfolio_Block_Paged_Pagination();
