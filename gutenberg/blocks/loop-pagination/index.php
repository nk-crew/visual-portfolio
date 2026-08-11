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
class Visual_Portfolio_Block_Loop_Pagination {
	/**
	 * Calculated max pages, keyed by loop query.
	 *
	 * Every pagination block inside a loop asks for the same number, so it is
	 * only calculated once per request.
	 *
	 * @var array
	 */
	private static $max_pages_cache = array();

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
		Visual_Portfolio_Assets::register_style( 'visual-portfolio-block-loop-pagination', 'build/gutenberg/blocks/loop-pagination/style' );
		wp_style_add_data( 'visual-portfolio-block-loop-pagination', 'rtl', 'replace' );

		register_block_type_from_metadata(
			visual_portfolio()->plugin_path . 'gutenberg/blocks/loop-pagination',
			array(
				'render_callback' => array( $this, 'block_render' ),
			)
		);
	}

	/**
	 * Get max pages for all pagination blocks
	 *
	 * The `maxPages` value the editor stores in the loop attributes is only a
	 * preview: it goes stale as soon as the queried content changes. The number
	 * is calculated from the loop query on every request instead.
	 *
	 * @param array $context - Block Loop Context with query block attributes.
	 * @return int
	 */
	public static function get_max_pages( $context ) {
		if ( empty( $context ) || ! is_array( $context ) ) {
			return 1;
		}

		$options = Visual_Portfolio_Gutenberg::transform_context_to_attributes( $context );

		if ( empty( $options ) ) {
			return 1;
		}

		// The filter narrows the query, so it is part of the identity here.
		$identity = wp_json_encode( array( $options, Visual_Portfolio_Get::get_filter_active_item( array() ) ) );

		// Without a reliable identity two different loops would share one entry,
		// which is worse than calculating twice.
		if ( false === $identity ) {
			return Visual_Portfolio_Get::calculate_max_pages( $options );
		}

		$cache_key = md5( $identity );

		if ( ! isset( self::$max_pages_cache[ $cache_key ] ) ) {
			self::$max_pages_cache[ $cache_key ] = Visual_Portfolio_Get::calculate_max_pages( $options );
		}

		return self::$max_pages_cache[ $cache_key ];
	}

	/**
	 * Block output
	 *
	 * @param array  $attributes - block attributes.
	 * @param string $content - block content.
	 *
	 * @return string
	 */
	public function block_render( $attributes, $content ) {
		// We should always render the block, even if no content is provided.
		// This prevents ajax loading from breaking when there is no block available.
		$no_content = empty( trim( $content ) );

		$wrapper_attributes = get_block_wrapper_attributes(
			array(
				'class'      => 'vp-block-loop-pagination',
				// `get_block_wrapper_attributes()` escapes the values itself.
				'aria-label' => __( 'Pagination', 'visual-portfolio' ),
			)
		);

		return sprintf(
			'<nav %1$s>%2$s</nav>',
			$wrapper_attributes,
			$no_content ? '' : $content
		);
	}
}
new Visual_Portfolio_Block_Loop_Pagination();
