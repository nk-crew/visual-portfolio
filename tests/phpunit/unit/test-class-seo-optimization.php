<?php
/**
 * Tests for Visual_Portfolio_SEO_Optimization
 *
 * @package Visual Portfolio
 */

/**
 * Robots meta test case.
 */
class ClassSeoOptimization extends WP_UnitTestCase {
	/**
	 * Drop the request state a test wrote.
	 *
	 * @return void
	 */
	public function tear_down() {
		$_GET = array();

		parent::tear_down();
	}

	/**
	 * Whether the robots meta is printed for the given query string.
	 *
	 * @param string $query - query string, without the leading question mark.
	 *
	 * @return bool
	 */
	private function has_noindex( $query ) {
		parse_str( $query, $params );

		$_GET = $params;

		$seo = new Visual_Portfolio_SEO_Optimization();

		ob_start();
		$seo->add_robots_meta();
		$output = ob_get_clean();

		return false !== strpos( $output, 'noindex' );
	}

	/**
	 * The canonical view of a page stays indexable.
	 *
	 * @return void
	 */
	public function test_untouched_page_is_indexable() {
		$this->assertFalse( $this->has_noindex( '' ) );
		$this->assertFalse( $this->has_noindex( 'utm_source=newsletter' ) );

		// Page one is the canonical view under either naming.
		$this->assertFalse( $this->has_noindex( 'vp_page=1' ) );
		$this->assertFalse( $this->has_noindex( 'vp-2-page=1' ) );
	}

	/**
	 * The legacy parameters keep their rules.
	 *
	 * @return void
	 */
	public function test_legacy_parameters_are_noindexed() {
		$this->assertTrue( $this->has_noindex( 'vp_filter=category%3Acats' ) );
		$this->assertTrue( $this->has_noindex( 'vp_sort=title' ) );
		$this->assertTrue( $this->has_noindex( 'vp_search=cats' ) );
		$this->assertTrue( $this->has_noindex( 'vp_page=2' ) );
	}

	/**
	 * A view narrowed by a single loop is a duplicate as well.
	 *
	 * @return void
	 */
	public function test_namespaced_parameters_are_noindexed() {
		$this->assertTrue( $this->has_noindex( 'vp-1-filter=category%3Acats' ) );
		$this->assertTrue( $this->has_noindex( 'vp-1-sort=title' ) );
		$this->assertTrue( $this->has_noindex( 'vp-12-page=3' ) );

		// One loop paged past its first page is enough.
		$this->assertTrue( $this->has_noindex( 'vp-1-page=1&vp-2-page=2' ) );
	}

	/**
	 * A parameter that only looks like ours does not hide the page.
	 *
	 * @return void
	 */
	public function test_unrelated_parameters_are_ignored() {
		$this->assertFalse( $this->has_noindex( 'vp_page_query=2' ) );
		$this->assertFalse( $this->has_noindex( 'vpfilter=cats' ) );
		$this->assertFalse( $this->has_noindex( 'my_vp_filter=cats' ) );
	}

	/**
	 * A seeded order is the canonical page shuffled - a duplicate of it.
	 *
	 * @return void
	 */
	public function test_random_seed_is_noindexed() {
		$this->assertTrue( $this->has_noindex( 'vpf_random_seed=1234' ) );
	}

	/**
	 * Publish a page holding one paged Gallery Loop.
	 *
	 * @param int $per_page - items per page.
	 * @param int $count    - number of posts to page through.
	 *
	 * @return int Post id.
	 */
	private function create_loop_page( $per_page, $count ) {
		self::factory()->post->create_many( $count );

		$attrs = array(
			'block_id'   => 'seo-loop',
			'queryId'    => 1,
			'queryType'  => 'posts',
			'baseQuery'  => array( 'perPage' => $per_page ),
			'postsQuery' => array( 'source' => 'post' ),
		);

		return self::factory()->post->create(
			array(
				'post_type'    => 'page',
				'post_content' => sprintf(
					'<!-- wp:visual-portfolio/loop %s --><div class="wp-block-visual-portfolio-loop vp-block-loop"><!-- wp:visual-portfolio/item-template --><!-- wp:visual-portfolio/item-title /--><!-- /wp:visual-portfolio/item-template --></div><!-- /wp:visual-portfolio/loop -->',
					wp_json_encode( $attrs )
				),
			)
		);
	}

	/**
	 * The pagination links of the document head, for the current request.
	 *
	 * @param int    $post_id - page holding the loop.
	 * @param string $query   - query string, without the leading question mark.
	 *
	 * @return string
	 */
	private function get_pagination_links( $post_id, $query ) {
		parse_str( $query, $params );

		// A test site runs on plain permalinks, so the page is addressed by a
		// query string of its own and the parameters are added to it.
		$this->go_to( add_query_arg( $params, get_permalink( $post_id ) ) );

		$_GET = $params;

		$seo = new Visual_Portfolio_SEO_Optimization();

		ob_start();
		$seo->add_pagination_links();

		return ob_get_clean();
	}

	/**
	 * A paged loop names the page before it and the page after it.
	 *
	 * @return void
	 */
	public function test_paged_loop_links_its_neighbours() {
		$post_id = $this->create_loop_page( 2, 6 );

		$links = $this->get_pagination_links( $post_id, 'vp-1-page=2' );

		$this->assertStringContainsString( 'rel="next"', $links );
		$this->assertStringContainsString( 'vp-1-page=3', $links );

		// Page one is the canonical view, so the link back to it carries no
		// page parameter at all.
		$this->assertStringContainsString( 'rel="prev"', $links );
		$this->assertDoesNotMatchRegularExpression( '/rel="prev"[^>]*vp-1-page/', $links );
	}

	/**
	 * The last page has nothing after it.
	 *
	 * @return void
	 */
	public function test_last_page_has_no_next() {
		$post_id = $this->create_loop_page( 2, 6 );

		$links = $this->get_pagination_links( $post_id, 'vp-1-page=3' );

		$this->assertStringContainsString( 'rel="prev"', $links );
		$this->assertStringNotContainsString( 'rel="next"', $links );
	}

	/**
	 * The canonical view says nothing: it would cost a query on every page of
	 * the site to find out whether there even is a second one.
	 *
	 * @return void
	 */
	public function test_first_page_is_silent() {
		$post_id = $this->create_loop_page( 2, 6 );

		$this->assertSame( '', $this->get_pagination_links( $post_id, '' ) );
		$this->assertSame( '', $this->get_pagination_links( $post_id, 'vp-1-page=1' ) );
	}

	/**
	 * A page beyond the end of the loop is not part of the series.
	 *
	 * @return void
	 */
	public function test_page_past_the_end_is_silent() {
		$post_id = $this->create_loop_page( 2, 6 );

		$this->assertSame( '', $this->get_pagination_links( $post_id, 'vp-1-page=9' ) );
	}
}
