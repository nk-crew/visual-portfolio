<?php
/**
 * Tests for a Gallery Loop that shows the portfolio archive. Its controls read
 * the page and the category from the archive's addresses, and link to them.
 *
 * @package Visual Portfolio
 */

/**
 * Loop on the portfolio archive test case.
 */
class ClassLoopArchive extends WP_UnitTestCase {
	use Visual_Portfolio_Loop_Blocks_Trait;

	/**
	 * Context of a loop of the current query.
	 *
	 * @var array
	 */
	private $context = array(
		'vp/queryId'    => 7,
		'vp/queryType'  => 'posts',
		'vp/postsQuery' => array( 'source' => 'current_query' ),
	);

	/**
	 * State of the request before the test.
	 *
	 * @var array
	 */
	private $request = array();

	/**
	 * The archive page.
	 *
	 * @var int
	 */
	private $archive = 0;

	/**
	 * An archive page on pretty permalinks.
	 *
	 * @return void
	 */
	public function set_up() {
		parent::set_up();

		$this->skip_without_loop_blocks();

		global $wp_query;

		$this->request = array( $wp_query->query, $wp_query->query_vars, $_SERVER['HTTP_HOST'] ?? null, $_SERVER['REQUEST_URI'] ?? null );

		$this->set_permalink_structure( '/%postname%/' );

		$this->archive = self::factory()->post->create(
			array(
				'post_type'   => 'page',
				'post_name'   => 'portfolio',
				'post_status' => 'publish',
			)
		);

		update_post_meta( $this->archive, '_vp_post_type_mapped', 'portfolio' );
		update_option( 'vp_general', array( 'portfolio_archive_page' => $this->archive ) );
	}

	/**
	 * Put the request back.
	 *
	 * @return void
	 */
	public function tear_down() {
		global $wp_query;

		list( $wp_query->query, $wp_query->query_vars, $host, $uri ) = $this->request;

		$_SERVER['HTTP_HOST']   = $host;
		$_SERVER['REQUEST_URI'] = $uri;

		delete_option( 'vp_general' );

		parent::tear_down();
	}

	/**
	 * Address the request the way the archive's rules resolve it.
	 *
	 * @param string $uri   - requested path and query.
	 * @param array  $query - vars the rules give the main query.
	 *
	 * @return void
	 */
	private function request( $uri, $query ) {
		global $wp_query;

		$home = wp_parse_url( home_url() );

		// The host the site answers on, so the address and the links agree.
		$_SERVER['HTTP_HOST']   = $home['host'] . ( isset( $home['port'] ) ? ':' . $home['port'] : '' );
		$_SERVER['REQUEST_URI'] = $uri;

		$wp_query->query      = $query;
		$wp_query->query_vars = array_merge( $wp_query->query_vars, $query );
	}

	/**
	 * The controls of the archive's loop link to the archive's addresses: a
	 * category to its own, "All" to the archive, a page under the current
	 * category, and the rest of the query string along.
	 *
	 * @return void
	 */
	public function test_an_archive_loop_links_to_the_archive_addresses() {
		$this->request(
			'/portfolio-category/nature/page/2/?vp-7-sort=title',
			array(
				'vp_page_archive' => '1',
				'vp_page_query'   => '2',
				'vp_filter'       => 'portfolio_category:nature',
			)
		);

		$this->assertSame(
			array(
				home_url( '/portfolio-category/people/?vp-7-sort=title' ),
				home_url( '/portfolio/?vp-7-sort=title' ),
				home_url( '/portfolio-category/nature/page/3/?vp-7-sort=title' ),
				home_url( '/portfolio-category/nature/?vp-7-sort=title' ),
				home_url( '/portfolio-category/nature/' ),
			),
			array(
				Visual_Portfolio_Block_Loop::get_link(
					array(
						'vp_filter' => rawurlencode( 'portfolio_category:' ) . 'people',
						'vp_page'   => 1,
					),
					$this->context
				),
				Visual_Portfolio_Block_Loop::get_link(
					array(
						'vp_filter' => '',
						'vp_page'   => 1,
					),
					$this->context
				),
				Visual_Portfolio_Block_Loop::get_link( array( 'vp_page' => 3 ), $this->context ),
				Visual_Portfolio_Block_Loop::get_link( array( 'vp_page' => 1 ), $this->context ),
				Visual_Portfolio_Block_Loop::get_link(
					array(
						'vp_sort' => '',
						'vp_page' => 1,
					),
					$this->context
				),
			)
		);
	}

	/**
	 * "All" leads to the archive's address, which a parent page does not move,
	 * and a category keeps the `index.php` of PATHINFO permalinks.
	 *
	 * @return void
	 */
	public function test_archive_links_take_the_addresses_the_rules_answer() {
		wp_update_post(
			array(
				'ID'          => $this->archive,
				'post_parent' => self::factory()->post->create(
					array(
						'post_type' => 'page',
						'post_name' => 'work',
					)
				),
			)
		);

		$this->request( '/portfolio-category/nature/', array( 'vp_page_archive' => '1' ) );

		$this->assertSame(
			home_url( '/portfolio/' ),
			Visual_Portfolio_Block_Loop::get_link(
				array(
					'vp_filter' => '',
					'vp_page'   => 1,
				),
				$this->context
			)
		);

		$this->set_permalink_structure( '/index.php/%postname%/' );

		$this->assertSame(
			home_url( '/index.php/portfolio-category/people/' ),
			Visual_Portfolio_Block_Loop::get_link(
				array(
					'vp_filter' => rawurlencode( 'portfolio_category:' ) . 'people',
					'vp_page'   => 1,
				),
				$this->context
			)
		);
	}

	/**
	 * "All" leads to the front page only while the front page shows the
	 * archive, not after the site went back to its latest posts.
	 *
	 * @return void
	 */
	public function test_all_leads_to_the_front_page_only_while_it_shows_the_archive() {
		$this->request( '/portfolio-category/nature/', array( 'vp_page_archive' => '1' ) );

		$all = array(
			'vp_filter' => '',
			'vp_page'   => 1,
		);

		update_option( 'page_on_front', $this->archive );
		update_option( 'show_on_front', 'page' );

		$this->assertSame( home_url( '/' ), Visual_Portfolio_Block_Loop::get_link( $all, $this->context ) );

		update_option( 'show_on_front', 'posts' );

		$this->assertSame( home_url( '/portfolio/' ), Visual_Portfolio_Block_Loop::get_link( $all, $this->context ) );
	}

	/**
	 * Page numbers leave out a page parameter the current URL carries, and keep
	 * what another filter of the links adds.
	 *
	 * @return void
	 */
	public function test_page_numbers_drop_a_stale_page_and_keep_what_filters_add() {
		$this->request( '/portfolio/?vp-7-page=2', array( 'vp_page_archive' => '1' ) );

		$extend = static function ( $link ) {
			return add_query_arg( 'lang', 'de', $link );
		};

		add_filter( 'paginate_links', $extend );

		$links = Visual_Portfolio_Get::get_pagination_links(
			array(
				'start_page' => 2,
				'max_pages'  => 3,
				'page_link'  => Visual_Portfolio_Block_Loop::get_link( array( 'vp_page' => 999999999 ), $this->context ),
			),
			array(
				'pagination_paged__show_arrows'  => false,
				'pagination_paged__show_numbers' => true,
			),
			7
		);

		remove_filter( 'paginate_links', $extend );

		$this->assertSame(
			array( home_url( '/portfolio/page/1/?lang=de' ), home_url( '/portfolio/page/3/?lang=de' ) ),
			array_values( array_filter( wp_list_pluck( $links, 'url' ) ) )
		);
	}

	/**
	 * A sort shown as links starts the archive over at its first page, with
	 * or without the slash the permalinks end in.
	 *
	 * @return void
	 */
	public function test_archive_sort_links_start_over_at_the_first_page() {
		$this->set_permalink_structure( '/%postname%' );
		$this->request(
			'/portfolio-category/nature/page/2',
			array(
				'vp_page_archive' => '1',
				'vp_page_query'   => '2',
				'vp_filter'       => 'portfolio_category:nature',
			)
		);

		$sort = new WP_Block(
			array(
				'blockName'    => 'visual-portfolio/loop-sort',
				'attrs'        => array(
					'displayAsDropdown' => false,
					'options'           => array( '', 'title' ),
				),
				'innerBlocks'  => array(),
				'innerHTML'    => '',
				'innerContent' => array(),
			),
			$this->context
		);

		$this->assertStringContainsString( 'href="' . esc_url( home_url( '/portfolio-category/nature?vp-7-sort=title' ) ) . '"', $sort->render() );
	}

	/**
	 * The page and the category of the address are the loop's current ones,
	 * whichever rule read the page.
	 *
	 * @return void
	 */
	public function test_an_archive_loop_reads_its_state_from_the_address() {
		$this->request(
			'/portfolio-category/nature/page/2/',
			array(
				'vp_page_archive' => '1',
				'vp_page_query'   => '2',
				'vp_filter'       => 'portfolio_category:nature',
			)
		);

		$this->assertSame( 2, Visual_Portfolio_Block_Loop::get_current_page( $this->context ) );
		$this->assertSame( 'portfolio_category:nature', Visual_Portfolio_Block_Loop::get_active_filter( $this->context ) );

		$this->request(
			'/portfolio/page/3/',
			array(
				'vp_page_archive' => '1',
				'vp_page_query'   => '',
				'paged'           => '3',
			)
		);

		$this->assertSame( 3, Visual_Portfolio_Block_Loop::get_current_page( $this->context ) );
	}

	/**
	 * A loop that is not the archive's keeps its own parameters on the same
	 * page.
	 *
	 * @return void
	 */
	public function test_a_loop_of_its_own_keeps_its_parameters() {
		$this->request(
			'/portfolio/page/2/',
			array(
				'vp_page_archive' => '1',
				'vp_page_query'   => '2',
			)
		);

		$context = array_merge( $this->context, array( 'vp/postsQuery' => array( 'source' => 'post' ) ) );

		$this->assertSame( home_url( '/portfolio/page/2/?vp-7-page=3' ), Visual_Portfolio_Block_Loop::get_link( array( 'vp_page' => 3 ), $context ) );
		$this->assertSame( 1, Visual_Portfolio_Block_Loop::get_current_page( $context ) );
	}

	/**
	 * The filter of the archive counts the whole archive, not the category of
	 * the address, and options without a source are not an archive.
	 *
	 * @return void
	 */
	public function test_the_archive_filter_counts_the_whole_archive() {
		$this->assertSame(
			array( 'post_type' => 'portfolio' ),
			Visual_Portfolio_Archive_Mapping::without_address_terms(
				array(
					'post_type'          => 'portfolio',
					'portfolio_category' => 'nature',
					'vp_category'        => 'nature',
					'vp_filter'          => 'portfolio_category:nature',
					'taxonomy'           => 'portfolio_category',
					'term'               => 'nature',
				)
			)
		);

		$this->assertFalse( Visual_Portfolio_Archive_Mapping::is_archive( array() ) );
	}
}
