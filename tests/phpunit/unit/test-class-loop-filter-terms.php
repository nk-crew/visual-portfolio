<?php
/**
 * Tests for the terms the loop filter lists: resolved when the page renders,
 * merged with the items saved in the block, and cached for visitors.
 *
 * @package Visual Portfolio
 */

/**
 * Loop filter terms test case.
 */
class ClassLoopFilterTerms extends WP_UnitTestCase {
	use Visual_Portfolio_Loop_Blocks_Trait;

	/**
	 * Category ids by slug.
	 *
	 * @var array
	 */
	private static $categories = array();

	/**
	 * Post ids, in the order they were created.
	 *
	 * @var array
	 */
	private static $posts = array();

	/**
	 * Markup of the last render.
	 *
	 * @var string
	 */
	private $last_html = '';

	/**
	 * Four published posts over three categories, and a private one in a
	 * fourth.
	 *
	 * @param WP_UnitTest_Factory $factory - test factory.
	 *
	 * @return void
	 */
	public static function wpSetUpBeforeClass( $factory ) {
		foreach ( array( 'alpha', 'beta', 'gamma', 'delta', 'empty' ) as $slug ) {
			self::$categories[ $slug ] = $factory->category->create(
				array(
					'slug' => $slug,
					'name' => ucfirst( $slug ),
				)
			);
		}

		$layout = array(
			array( 'alpha' ),
			array( 'alpha', 'beta' ),
			array( 'beta' ),
			array( 'gamma' ),
		);

		foreach ( $layout as $index => $slugs ) {
			self::$posts[] = $factory->post->create(
				array(
					'post_title'    => 'Post ' . ( $index + 1 ),
					'post_date'     => gmdate( 'Y-m-d H:i:s', strtotime( '2026-01-01' ) + $index * DAY_IN_SECONDS ),
					'post_category' => array_map(
						static function ( $slug ) {
							return self::$categories[ $slug ];
						},
						$slugs
					),
				)
			);
		}

		self::$posts[] = $factory->post->create(
			array(
				'post_title'    => 'Private post',
				'post_status'   => 'private',
				'post_category' => array( self::$categories['delta'] ),
			)
		);
	}

	/**
	 * Skip where the family is not registered, and start every test from an
	 * empty cache.
	 *
	 * @return void
	 */
	public function set_up() {
		parent::set_up();

		$this->skip_without_loop_blocks();

		Visual_Portfolio_Filter_Terms::forget();
	}

	/**
	 * Log the user out after the tests that log one in.
	 *
	 * @return void
	 */
	public function tear_down() {
		wp_set_current_user( 0 );

		parent::tear_down();
	}

	/**
	 * Render a posts loop with a filter and return the filter's items.
	 *
	 * @param array  $posts_query - `postsQuery` of the loop.
	 * @param string $items       - serialized filter item blocks saved in the filter.
	 *
	 * @return array Items as `label (count)`, or `label` without a count, in
	 *               the order they are printed.
	 */
	private function render_filter( $posts_query, $items = '' ) {
		$loop = array(
			'block_id'   => 'filter-terms',
			'queryId'    => 7,
			'queryType'  => 'posts',
			'baseQuery'  => array( 'perPage' => 2 ),
			'postsQuery' => $posts_query,
		);

		$html = do_blocks(
			sprintf(
				'<!-- wp:visual-portfolio/loop %1$s --><div class="wp-block-visual-portfolio-loop vp-block-loop"><!-- wp:visual-portfolio/loop-filter {"showCount":true} -->%2$s<!-- /wp:visual-portfolio/loop-filter --><!-- wp:visual-portfolio/item-template --><!-- wp:visual-portfolio/item-title /--><!-- /wp:visual-portfolio/item-template --></div><!-- /wp:visual-portfolio/loop -->',
				wp_json_encode( $loop ),
				$items
			)
		);

		$this->last_html = $html;

		preg_match_all( '/<(a|span)[^>]*class="[^"]*vp-block-loop-filter-item[^"]*"[^>]*>(.*?)<\/\1>/s', $html, $matches );

		return array_map(
			static function ( $inner ) {
				return trim( preg_replace( '/<span class="vp-block-loop-filter-count">(\d+)<\/span>/', ' ($1)', $inner ) );
			},
			$matches[2]
		);
	}

	/**
	 * A saved filter item block for a category.
	 *
	 * @param string $slug       - category slug.
	 * @param array  $attributes - extra attributes.
	 *
	 * @return string
	 */
	private function saved_item( $slug, $attributes = array() ) {
		return sprintf(
			'<!-- wp:visual-portfolio/loop-filter-item %s /-->',
			wp_json_encode(
				array_merge(
					array(
						'text'       => ucfirst( $slug ),
						'filter'     => $slug,
						'taxonomyId' => self::$categories[ $slug ],
					),
					$attributes
				)
			)
		);
	}

	/**
	 * A category that has items but no saved item follows the saved ones, in
	 * the style of the first saved term item, and counts are counted now.
	 *
	 * @return void
	 */
	public function test_a_new_term_follows_the_saved_items_in_their_style() {
		$items = $this->render_filter(
			array( 'source' => 'post' ),
			'<!-- wp:visual-portfolio/loop-filter-item {"text":"All"} /-->' . $this->saved_item(
				'alpha',
				array(
					'text'            => 'Alpha label',
					'count'           => 99,
					'backgroundColor' => 'vivid-red',
				)
			)
		);

		$this->assertSame( array( 'All', 'Alpha label (2)', 'Beta (2)', 'Gamma (1)' ), $items );
		$this->assertMatchesRegularExpression( '/<a [^>]*href="[^"]*beta[^"]*"[^>]*class="[^"]*has-vivid-red-background-color/', $this->last_html );
	}

	/**
	 * Saved items keep their place and label, and one whose term has nothing
	 * in the gallery is left out.
	 *
	 * @return void
	 */
	public function test_saved_items_keep_their_place_and_skip_empty_terms() {
		$items = $this->render_filter(
			array( 'source' => 'post' ),
			$this->saved_item( 'gamma', array( 'text' => 'G' ) ) . $this->saved_item( 'empty' ) . $this->saved_item( 'beta', array( 'text' => 'B' ) )
		);

		$this->assertSame( array( 'All', 'G (1)', 'B (2)', 'Alpha (2)' ), $items );
	}

	/**
	 * A manual selection lists the terms of the posts it selected.
	 *
	 * @return void
	 */
	public function test_a_manual_selection_lists_the_terms_of_its_posts() {
		$items = $this->render_filter(
			array(
				'source' => 'ids',
				'ids'    => array( self::$posts[0], self::$posts[3] ),
			)
		);

		$this->assertSame( array( 'All', 'Alpha (1)', 'Gamma (1)' ), $items );
	}

	/**
	 * A custom query lists the terms of the posts it returns.
	 *
	 * @return void
	 */
	public function test_a_custom_query_lists_the_terms_of_its_posts() {
		$items = $this->render_filter(
			array(
				'source'      => 'custom_query',
				'customQuery' => 'post_type=post&category_name=beta',
			)
		);

		$this->assertSame( array( 'All', 'Alpha (1)', 'Beta (2)' ), $items );
	}

	/**
	 * A gallery with no term to filter by prints no filter, not even the "All"
	 * item saved in it.
	 *
	 * @return void
	 */
	public function test_a_gallery_with_nothing_to_filter_by_has_no_filter() {
		$items = $this->render_filter(
			array(
				'source' => 'ids',
				'ids'    => array( self::factory()->post->create( array( 'post_type' => 'page' ) ) ),
			),
			'<!-- wp:visual-portfolio/loop-filter-item {"text":"All"} /-->'
		);

		$this->assertSame( array(), $items );
		$this->assertStringNotContainsString( 'vp-block-loop-filter', $this->last_html );
	}

	/**
	 * Visitors are served the cached terms until a post changes the way
	 * WordPress reports it.
	 *
	 * @return void
	 */
	public function test_visitors_get_cached_terms_until_a_post_changes() {
		global $wpdb;

		$this->assertContains( 'Gamma (1)', $this->render_filter( array( 'source' => 'post' ) ) );

		// Behind WordPress' back, so nothing tells the cache.
		$wpdb->insert(
			$wpdb->term_relationships,
			array(
				'object_id'        => self::$posts[2],
				'term_taxonomy_id' => get_term( self::$categories['gamma'] )->term_taxonomy_id,
			)
		);

		$this->assertContains( 'Gamma (1)', $this->render_filter( array( 'source' => 'post' ) ) );

		wp_set_post_categories( self::$posts[0], array( self::$categories['alpha'], self::$categories['gamma'] ) );

		$this->assertContains( 'Gamma (3)', $this->render_filter( array( 'source' => 'post' ) ) );
	}

	/**
	 * A logged-in user sees what they may read, and what they saw is not kept
	 * for visitors.
	 *
	 * @return void
	 */
	public function test_a_logged_in_user_neither_reads_nor_fills_the_cache() {
		$this->assertNotContains( 'Delta (1)', $this->render_filter( array( 'source' => 'post' ) ) );

		wp_set_current_user( self::factory()->user->create( array( 'role' => 'administrator' ) ) );

		$this->assertContains( 'Delta (1)', $this->render_filter( array( 'source' => 'post' ) ) );

		wp_set_current_user( 0 );

		$this->assertNotContains( 'Delta (1)', $this->render_filter( array( 'source' => 'post' ) ) );
	}

	/**
	 * The editor is given the terms of the loop's whole query, a manual
	 * selection included.
	 *
	 * @return void
	 */
	public function test_the_editor_lists_the_terms_of_a_manual_selection() {
		global $wp_rest_server;

		$wp_rest_server = new WP_REST_Server();

		do_action( 'rest_api_init', $wp_rest_server );

		wp_set_current_user( self::factory()->user->create( array( 'role' => 'editor' ) ) );

		$request = new WP_REST_Request( 'POST', '/visual-portfolio/v1/get_filter_items' );
		$request->set_header( 'Content-Type', 'application/json' );
		$request->set_body(
			wp_json_encode(
				array(
					'queryType'  => 'posts',
					'postsQuery' => array(
						'source' => 'ids',
						'ids'    => array( self::$posts[0], self::$posts[3] ),
					),
				)
			)
		);

		$response       = rest_do_request( $request );
		$wp_rest_server = null;
		$labels         = wp_list_pluck( $response->get_data()['response'], 'label' );

		$this->assertSame( array( 'All', 'Alpha', 'Gamma' ), $labels );
	}
}
