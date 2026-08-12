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
		add_action( 'wp_head', array( $this, 'add_pagination_links' ), 1 );
	}

	/**
	 * Add robots meta for filtered/paginated pages.
	 *
	 * Adds "noindex, follow" meta tag for filtered, sorted, searched, or
	 * paginated portfolio pages to prevent duplicate content indexing
	 * while allowing crawlers to follow links.
	 */
	public function add_robots_meta() {
		if ( $this->is_not_vp_archive( get_queried_object_id() ) && $this->is_narrowed_request() ) {
			echo '<meta name="robots" content="noindex, follow" />' . "\n";
		}
	}

	/**
	 * Add the pagination links of the document head.
	 *
	 * Only for a request that already names a page: the canonical view carries
	 * no page parameter, and finding out whether it even has a second page would
	 * mean running the query of every gallery on every page of the site.
	 *
	 * Where more than one gallery is paged at once the first one wins. A crawler
	 * never gets there - it arrives by following a single pagination link at a
	 * time, so the page it lands on has exactly one paged gallery on it - and for
	 * a visitor clicking around, links in the head do nothing either way.
	 */
	public function add_pagination_links() {
		$paged = $this->get_paged_loop();

		if ( ! $paged ) {
			return;
		}

		$links = array(
			'prev' => Visual_Portfolio_Get::get_pagenum_link( array( 'vp_page' => $paged['page'] - 1 ), $paged['query_id'] ),
		);

		if ( $paged['page'] < $paged['max_pages'] ) {
			$links['next'] = Visual_Portfolio_Get::get_pagenum_link( array( 'vp_page' => $paged['page'] + 1 ), $paged['query_id'] );
		}

		foreach ( $links as $rel => $url ) {
			printf( '<link rel="%1$s" href="%2$s" />' . "\n", esc_attr( $rel ), esc_url( $url ) );
		}
	}

	/**
	 * The Gallery Loop of this page that is showing a page other than the first.
	 *
	 * Loops are read out of the content of the queried post, which is where the
	 * page a visitor paged lives. A loop placed in a template part instead is not
	 * found - it belongs to the template rather than to this document, and its
	 * pages are not pages of this document either.
	 *
	 * @return array|null `page`, `max_pages` and `query_id`, or null.
	 */
	private function get_paged_loop() {
		if ( ! is_singular() || ! $this->has_page_param() ) {
			return null;
		}

		$post = get_post();

		// Cheap enough to run on every page of the site; parsing the blocks of
		// one that holds no gallery is not.
		if ( ! $post || ! has_blocks( $post->post_content ) || false === strpos( $post->post_content, 'wp:visual-portfolio/loop ' ) ) {
			return null;
		}

		foreach ( $this->find_loop_blocks( parse_blocks( $post->post_content ) ) as $block ) {
			$context  = Visual_Portfolio_Block_Loop::get_context_from_attributes( $block['attrs'] ?? array() );
			$query_id = Visual_Portfolio_Block_Loop::get_query_id( $context );
			$page     = Visual_Portfolio_Get::get_current_page_number( $query_id );

			if ( $page < 2 ) {
				continue;
			}

			// The very call the pagination block makes when it renders further
			// down, memoized on the same key - the query runs once for both.
			$max_pages = Visual_Portfolio_Block_Loop_Pagination::get_max_pages( $context );

			// A page beyond the end of the loop shows nothing; there is no series
			// for it to be part of.
			if ( $page > $max_pages ) {
				continue;
			}

			return array(
				'page'      => $page,
				'max_pages' => $max_pages,
				'query_id'  => $query_id,
			);
		}

		return null;
	}

	/**
	 * Whether the request names a page of some gallery at all.
	 *
	 * @return bool
	 */
	private function has_page_param() {
        // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		foreach ( array_keys( $_GET ) as $name ) {
			if ( preg_match( '/^vp[_-](?:[0-9]+-)?page$/', (string) $name ) ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Every Gallery Loop of a parsed block tree, nested ones included.
	 *
	 * @param array $blocks - parsed blocks.
	 *
	 * @return array
	 */
	private function find_loop_blocks( $blocks ) {
		$found = array();

		foreach ( $blocks as $block ) {
			if ( ! is_array( $block ) ) {
				continue;
			}

			if ( 'visual-portfolio/loop' === $block['blockName'] ) {
				$found[] = $block;
			}

			if ( ! empty( $block['innerBlocks'] ) && is_array( $block['innerBlocks'] ) ) {
				$found = array_merge( $found, $this->find_loop_blocks( $block['innerBlocks'] ) );
			}
		}

		return $found;
	}

	/**
	 * Whether the request asks for a filtered, sorted, searched or paged view.
	 *
	 * Both parameter schemes count: the legacy gallery names them `vp_filter`
	 * and friends, a Gallery Loop block names them after its own query id
	 * (`vp-3-filter`), and a duplicate of the same content is a duplicate under
	 * either name.
	 *
	 * @return bool
	 */
	private function is_narrowed_request() {
        // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		foreach ( array_keys( $_GET ) as $name ) {
			$name = (string) $name;

			// A seeded order is the same set of items in a different order -
			// a duplicate of the canonical page under a URL of its own.
			if ( 'vpf_random_seed' === $name ) {
				return true;
			}

			if ( ! preg_match( '/^vp[_-](?:[0-9]+-)?(filter|sort|search|page)$/', $name, $matches ) ) {
				continue;
			}

			// Page one is the canonical view, and every other parameter narrows
			// the content by being there at all.
            // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized, WordPress.Security.ValidatedSanitizedInput.MissingUnslash, WordPress.Security.NonceVerification.Recommended
			if ( 'page' !== $matches[1] || (int) $_GET[ $name ] > 1 ) {
				return true;
			}
		}

		return false;
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
