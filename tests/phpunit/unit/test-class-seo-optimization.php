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
}
