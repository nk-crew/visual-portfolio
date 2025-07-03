<?php
/**
 * SEO Optimization - Canonical Consolidation Strategy
 *
 * This file implements SEO optimization features for Visual Portfolio plugin,
 * specifically focusing on canonical URL consolidation and robots meta tags
 * for filtered, sorted, searched, and paginated portfolio pages.
 *
 * Key Features:
 * - Removes VP parameters from canonical URLs to prevent duplicate content
 * - Optimizes shortlinks by cleaning VP-specific query parameters
 * - Adds appropriate robots meta tags for filtered/paginated content
 * - Ensures proper SEO handling for portfolio navigation states
 *
 * Handles SEO optimization including:
 * - Canonical URL consolidation
 * - Shortlink optimization
 * - Robots meta tag management
 * - Duplicate content prevention
 *
 * @package visual-portfolio
 */

// phpcs:ignore WordPress.Security.NonceVerification.Recommended

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
	 * Sets up all necessary WordPress hooks and filters for SEO optimization.
	 */
	public function init() {
		add_filter( 'get_canonical_url', array( $this, 'optimize_canonical_url' ), 10, 2 );
		add_filter( 'get_shortlink', array( $this, 'optimize_shortlink' ), 10, 3 );

		// Add robots meta for filtered/paginated pages.
		add_action( 'wp_head', array( $this, 'add_robots_meta' ), 1 );
	}

	/**
	 * Optimize canonical URL - Remove VP parameters to point to main page.
	 *
	 * This prevents duplicate content issues by ensuring all filtered/paginated
	 * variations point to the main page as their canonical URL.
	 *
	 * @param string $canonical_url Canonical URL.
	 * @param object $post          Current Post Object.
	 * @return string Clean canonical URL without VP parameters.
	 */
	public function optimize_canonical_url( $canonical_url, $post ) {
		return $this->get_clean_canonical_url( $canonical_url, $post->ID );
	}

	/**
	 * Optimize shortlink - Remove VP parameters.
	 *
	 * Ensures shortlinks are clean and don't include VP-specific parameters.
	 *
	 * @param string $shortlink Shortlink URL.
	 * @param int    $id        Post ID, or 0 for the current post.
	 * @param string $context   The context for the link.
	 * @return string Clean shortlink URL.
	 */
	public function optimize_shortlink( $shortlink, $id, $context ) {
		return 0 === $id && 'query' === $context ?
			$this->get_clean_canonical_url( $shortlink, get_queried_object_id() ) :
			$shortlink;
	}

	/**
	 * Get clean canonical URL without VP parameters.
	 *
	 * Removes all Visual Portfolio specific query parameters from URLs
	 * to create clean canonical URLs.
	 *
	 * @param string $url     Original URL.
	 * @param int    $post_id Post ID.
	 * @return string Clean URL without VP parameters.
	 */
	private function get_clean_canonical_url( $url, $post_id ) {
		if ( $this->has_vp_parameters() && $this->is_vp_page( $post_id ) ) {
			// Remove all VP parameters from the canonical URL.
			$url = remove_query_arg( array( 'vp_page', 'vp_filter', 'vp_sort', 'vp_search' ), $url );
		}
		return $url;
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
			$this->has_vp_parameters() &&
			$this->is_vp_page( get_queried_object_id() ) &&
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
	 * Check if current page has VP parameters.
	 *
	 * Determines if the current request contains any Visual Portfolio
	 * specific query parameters.
	 *
	 * @return bool True if VP parameters are present, false otherwise.
	 */
	private function has_vp_parameters() {
		return isset( $_GET ) && (
			isset( $_GET['vp_page'] ) ||
			isset( $_GET['vp_filter'] ) ||
			isset( $_GET['vp_sort'] ) ||
			isset( $_GET['vp_search'] )
		);
	}

	/**
	 * Check if current page is a VP page.
	 *
	 * Determines if the current page contains Visual Portfolio content
	 * that requires SEO optimization.
	 *
	 * @param int $post_id Post ID.
	 * @return bool True if this is a VP page, false otherwise.
	 */
	private function is_vp_page( $post_id ) {
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
