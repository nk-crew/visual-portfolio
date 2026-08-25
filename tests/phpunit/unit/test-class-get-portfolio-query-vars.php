<?php
/**
 * Tests for the namespaced loop query parameters of Visual_Portfolio_Get
 *
 * @package Visual Portfolio
 */

/**
 * Loop query parameters test case.
 */
class ClassGetPortfolioQueryVars extends WP_UnitTestCase {
	/**
	 * Server variables as the test suite set them up.
	 *
	 * @var array
	 */
	private $server = array();

	/**
	 * Remember the request the suite runs with.
	 *
	 * @return void
	 */
	public function set_up() {
		parent::set_up();

		$this->server = $_SERVER;
	}

	/**
	 * Drop the request state a test wrote.
	 *
	 * @return void
	 */
	public function tear_down() {
		$_GET     = array();
		$_REQUEST = array();
		$_SERVER  = $this->server;

		parent::tear_down();
	}

	/**
	 * Pretend the request came in for the given URL.
	 *
	 * `get_pagenum_link()` builds on `REQUEST_URI`, so a test that checks what a
	 * control link keeps has to say what the visitor is looking at.
	 *
	 * @param string $query - query string, without the leading question mark.
	 *
	 * @return void
	 */
	private function visit( $query = '' ) {
		$_SERVER['HTTP_HOST']   = 'example.org';
		$_SERVER['REQUEST_URI'] = '/gallery/' . ( $query ? '?' . $query : '' );

		parse_str( $query, $params );

		$_GET     = $params;
		$_REQUEST = $params;
	}

	/**
	 * Without an id the helpers speak the legacy, page-global names.
	 *
	 * @return void
	 */
	public function test_legacy_names_without_a_query_id() {
		$this->assertSame( 'vp_page', Visual_Portfolio_Get::get_query_var_name( 'page' ) );
		$this->assertSame( 'vp_filter', Visual_Portfolio_Get::get_query_var_name( 'filter' ) );
		$this->assertSame( 'vp_sort', Visual_Portfolio_Get::get_query_var_name( 'sort' ) );
	}

	/**
	 * With an id every parameter is named after the loop.
	 *
	 * @return void
	 */
	public function test_namespaced_names_with_a_query_id() {
		$this->assertSame( 'vp-3-page', Visual_Portfolio_Get::get_query_var_name( 'page', 3 ) );
		$this->assertSame( 'vp-3-filter', Visual_Portfolio_Get::get_query_var_name( 'filter', 3 ) );
		$this->assertSame( 'vp-3-sort', Visual_Portfolio_Get::get_query_var_name( 'sort', 3 ) );

		// The attribute arrives from the editor as a number, and out of saved
		// content as whatever the post carries.
		$this->assertSame( 'vp-3-page', Visual_Portfolio_Get::get_query_var_name( 'page', '3' ) );
	}

	/**
	 * An id that cannot name a parameter falls back to the legacy names.
	 *
	 * @return void
	 */
	public function test_unusable_query_ids_fall_back() {
		foreach ( array( null, '', 0, -1, false, true, 'loop', array( 1 ), '2; drop', '<script>' ) as $query_id ) {
			$this->assertNull( Visual_Portfolio_Get::sanitize_query_id( $query_id ) );
			$this->assertSame( 'vp_page', Visual_Portfolio_Get::get_query_var_name( 'page', $query_id ) );
		}
	}

	/**
	 * The page number is read out of the parameter of the asking loop.
	 *
	 * @return void
	 */
	public function test_page_number_is_read_per_loop() {
		$this->visit( 'vp_page=4&vp-1-page=2&vp-2-page=3' );

		$this->assertSame( 4, Visual_Portfolio_Get::get_current_page_number() );
		$this->assertSame( 2, Visual_Portfolio_Get::get_current_page_number( 1 ) );
		$this->assertSame( 3, Visual_Portfolio_Get::get_current_page_number( 2 ) );

		// A loop nobody paged is on page one, whatever the other loops do.
		$this->assertSame( 1, Visual_Portfolio_Get::get_current_page_number( 9 ) );
	}

	/**
	 * The filter and the sort are read per loop as well.
	 *
	 * @return void
	 */
	public function test_filter_and_sort_are_read_per_loop() {
		$this->visit( 'vp_filter=legacy&vp_sort=title&vp-1-filter=cats&vp-1-sort=date_desc' );

		$this->assertSame( 'legacy', Visual_Portfolio_Get::get_filter_active_item( array() ) );
		$this->assertSame( 'title', Visual_Portfolio_Get::get_current_sort() );

		$this->assertSame( 'cats', Visual_Portfolio_Get::get_filter_active_item( array(), 1 ) );
		$this->assertSame( 'date_desc', Visual_Portfolio_Get::get_current_sort( 1 ) );

		$this->assertFalse( Visual_Portfolio_Get::get_filter_active_item( array(), 2 ) );
		$this->assertSame( '', Visual_Portfolio_Get::get_current_sort( 2 ) );
	}

	/**
	 * A link of a loop is written under the names of that loop.
	 *
	 * @return void
	 */
	public function test_pagenum_link_writes_namespaced_parameters() {
		$this->visit();

		$link = Visual_Portfolio_Get::get_pagenum_link( array( 'vp_page' => 2 ), 1 );

		$this->assertStringContainsString( 'vp-1-page=2', $link );
		$this->assertStringNotContainsString( 'vp_page', $link );
	}

	/**
	 * A link of one loop carries the state of the other loops untouched.
	 *
	 * This is what namespacing is for: without it the link below would reset
	 * the second gallery to its first page.
	 *
	 * @return void
	 */
	public function test_pagenum_link_keeps_the_state_of_other_loops() {
		$this->visit( 'vp-1-page=2&vp-2-page=5&vp-2-filter=cats' );

		$link = Visual_Portfolio_Get::get_pagenum_link( array( 'vp_page' => 3 ), 1 );

		$this->assertStringContainsString( 'vp-1-page=3', $link );
		$this->assertStringContainsString( 'vp-2-page=5', $link );
		$this->assertStringContainsString( 'vp-2-filter=cats', $link );
	}

	/**
	 * The default state is dropped from the URL rather than written into it.
	 *
	 * @return void
	 */
	public function test_pagenum_link_drops_the_default_state() {
		$this->visit( 'vp-1-page=3&vp-1-filter=cats&vp-1-sort=title&vp-2-page=2' );

		$link = Visual_Portfolio_Get::get_pagenum_link(
			array(
				'vp_filter' => '',
				'vp_page'   => 1,
			),
			1
		);

		$this->assertStringNotContainsString( 'vp-1-filter', $link );
		$this->assertStringNotContainsString( 'vp-1-page', $link );

		// Only the page and the filter were asked to reset.
		$this->assertStringContainsString( 'vp-1-sort=title', $link );
		$this->assertStringContainsString( 'vp-2-page=2', $link );
	}

	/**
	 * The legacy link keeps working exactly as it did.
	 *
	 * @return void
	 */
	public function test_pagenum_link_without_a_query_id_is_unchanged() {
		$this->visit( 'vp_page=3&vp_filter=cats' );

		$link = Visual_Portfolio_Get::get_pagenum_link(
			array(
				'vp_filter' => '',
				'vp_page'   => 1,
			)
		);

		$this->assertStringNotContainsString( 'vp_filter', $link );
		$this->assertStringNotContainsString( 'vp_page', $link );
	}

	/**
	 * The link filter is told which loop the link belongs to.
	 *
	 * @return void
	 */
	public function test_pagenum_link_filter_receives_the_query_id() {
		$this->visit();

		$seen = array();

		$spy = function ( $url, $query_arg, $query_id ) use ( &$seen ) {
			$seen[] = $query_id;

			return $url;
		};

		add_filter( 'vpf_get_pagenum_link', $spy, 10, 3 );

		Visual_Portfolio_Get::get_pagenum_link( array( 'vp_page' => 2 ), 7 );
		Visual_Portfolio_Get::get_pagenum_link( array( 'vp_page' => 2 ) );

		remove_filter( 'vpf_get_pagenum_link', $spy, 10 );

		$this->assertSame( array( 7, null ), $seen );
	}

	/**
	 * Sort links and pagination links are namespaced through the same helper.
	 *
	 * @return void
	 */
	public function test_control_links_are_namespaced() {
		$this->visit();

		$sort_url = Visual_Portfolio_Get::get_sort_item_url( 'title', array(), 4 );

		$this->assertStringContainsString( 'vp-4-sort=title', $sort_url );

		$links = Visual_Portfolio_Get::get_pagination_links(
			array(
				'start_page' => 1,
				'max_pages'  => 3,
			),
			array(
				'pagination_paged__show_arrows'  => false,
				'pagination_paged__show_numbers' => true,
			),
			4
		);

		$urls = wp_list_pluck( $links, 'url' );
		$urls = implode( ' ', array_filter( $urls ) );

		$this->assertStringContainsString( 'vp-4-page=2', $urls );
		$this->assertStringNotContainsString( 'vp_page', $urls );
	}
}
