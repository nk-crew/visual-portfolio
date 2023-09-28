<?php
/**
 * Seo Optimization.
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
	 */
	public function __construct() {
		add_action( 'init', array( $this, 'init' ), 9 );
	}

	/**
	 * Initialize archive.
	 *
	 * @see __construct
	 */
	public function init() {
		add_filter( 'get_canonical_url', array( $this, 'optimize_canonical_url' ), 10, 2 );
		add_filter( 'get_shortlink', array( $this, 'optimize_shortlink' ), 10, 3 );
	}

	/**
	 * Optimize canonical URL.
	 *
	 * @param string $canonical_url - Canonical URL.
	 * @param object $post          - Current Post Object.
	 * @return string
	 */
	public function optimize_canonical_url( $canonical_url, $post ) {
		return $this->optimize_url( $canonical_url, $post->ID );
	}

	/**
	 * Optimize shortlink.
	 *
	 * @param string $shortlink   - Shortlink URL.
	 * @param int    $id          - Post ID, or 0 for the current post.
	 * @param string $context     - The context for the link. One of 'post' or 'query'.
	 * @return string
	 */
	public function optimize_shortlink( $shortlink, $id, $context ) {
		return 0 === $id && 'query' === $context ? $this->optimize_url( $shortlink, get_queried_object_id() ) : $shortlink;
	}

	/**
	 * Optimize url by supported GET variables: vp_page, vp_filter, vp_sort and vp_search.
	 *
	 * @param string $url     - Not optimized URL.
	 * @param int    $post_id - Post ID.
	 * @return string
	 */
	public function optimize_url( $url, $post_id ) {
		if (
			! Visual_Portfolio_Archive_Mapping::is_archive(
				array(
					'content_source' => 'post-based',
					'posts_source'   => 'current_query',
				),
				$post_id
			) &&
            // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			isset( $_GET ) && ! empty( $_GET )
		) {
            // phpcs:ignore WordPress.Security.NonceVerification.Recommended
			foreach ( $_GET as $key => $value ) {
				if ( 'vp_page' === $key || 'vp_filter' === $key || 'vp_sort' === $key || 'vp_search' === $key ) {
                    // phpcs:ignore WordPress.Security.NonceVerification.Recommended
					$url = add_query_arg( array_map( 'sanitize_text_field', wp_unslash( array( $key => $value ) ) ), $url );
				}
			}
		}

		return $url;
	}
}
new Visual_Portfolio_SEO_Optimization();
