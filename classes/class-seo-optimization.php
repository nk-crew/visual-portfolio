<?php
/**
 * SEO Optimization
 *
 * This file implements SEO optimization features,
 * specifically focusing on robots meta tags for filtered, sorted, searched,
 * and paginated portfolio pages to prevent duplicate content indexing.
 *
 * Key Features:
 * - Adds appropriate robots meta tags for filtered/paginated content
 * - Prevents duplicate content issues with "noindex, follow" strategy
 * - Maintains crawlability while avoiding content duplication
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Visual_Portfolio_SEO_Optimization
 */
class Visual_Portfolio_SEO_Optimization {
	/**
	 * Visual_Portfolio_SEO_Optimization constructor.
	 *
	 * Initializes the SEO optimization hooks and filters.
	 */
	public function __construct() {
		add_action( 'init', array( $this, 'init' ), 9 );
	}

	/**
	 * Initialize SEO optimization.
	 *
	 * Sets up robots meta tag management for filtered/paginated pages.
	 */
	public function init() {
		// Add robots meta for filtered/paginated pages.
		// Priority 1 ensures robots meta is added early in wp_head, before SEO plugins.
		add_action( 'wp_head', array( $this, 'add_robots_meta' ), 1 );
	}

	/**
	 * Add robots meta for filtered/paginated pages.
	 *
	 * Adds "noindex, follow" meta tag for filtered, sorted, searched, or
	 * paginated portfolio pages to prevent duplicate content indexing
	 * while allowing crawlers to follow links.
	 */
	public function add_robots_meta() {
		if (
			$this->is_not_vp_archive( get_queried_object_id() ) &&
			(
				isset( $_GET['vp_filter'] ) ||
				isset( $_GET['vp_sort'] ) ||
				isset( $_GET['vp_search'] ) ||
				// For paginated content beyond page 1.
				( isset( $_GET['vp_page'] ) && (int) $_GET['vp_page'] > 1 )
			)
		) {
			echo '<meta name="robots" content="noindex, follow" />' . "\n";
		}
	}

	/**
	 * Check if current page is not a VP archive.
	 *
	 * Determines if the current page is a regular page/post (not a VP archive)
	 * where noindex meta should be added for filtered/paginated content.
	 * VP archives should have proper URLs and remain indexable.
	 *
	 * @param int $post_id Post ID.
	 * @return bool True if this is not a VP archive, false if it is a VP archive.
	 */
	private function is_not_vp_archive( $post_id ) {
		return ! Visual_Portfolio_Archive_Mapping::is_archive(
			array(
				'content_source' => 'post-based',
				'posts_source'   => 'current_query',
			),
			$post_id
		);
	}
}

new Visual_Portfolio_SEO_Optimization();
