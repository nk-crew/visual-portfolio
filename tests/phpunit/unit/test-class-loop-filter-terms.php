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
	 * Forget what this process remembered of the last request, the way a new
	 * request starts: the random seed and the terms resolved so far.
	 *
	 * @return void
	 */
	private function new_request() {
		foreach ( array( array( 'Visual_Portfolio_Get', 'rand_seed_session', false ), array( 'Visual_Portfolio_Filter_Terms', 'resolved', array() ) ) as list( $class, $name, $value ) ) {
			$property = new ReflectionProperty( $class, $name );

			if ( method_exists( $property, 'setAccessible' ) ) {
				$property->setAccessible( true );
			}

			$property->setValue( null, $value );
		}
	}

	/**
	 * Labels of the filter items the editor endpoint answers with.
	 *
	 * @param array $posts_query - `postsQuery` of the loop.
	 *
	 * @return array
	 */
	private function request_labels( $posts_query ) {
		global $wp_rest_server;

		$wp_rest_server = new WP_REST_Server();

		do_action( 'rest_api_init', $wp_rest_server );

		$request = new WP_REST_Request( 'POST', '/visual-portfolio/v1/get_filter_items' );
		$request->set_header( 'Content-Type', 'application/json' );
		$request->set_body(
			wp_json_encode(
				array(
					'queryType'  => 'posts',
					'postsQuery' => $posts_query,
				)
			)
		);

		$response       = rest_do_request( $request );
		$wp_rest_server = null;

		return wp_list_pluck( $response->get_data()['response'], 'label' );
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
	 * An item hidden with the block's Hide option keeps its term off the
	 * filter instead of coming back as a new term.
	 *
	 * @return void
	 */
	public function test_a_hidden_item_keeps_its_term_off_the_filter() {
		$items = $this->render_filter(
			array( 'source' => 'post' ),
			$this->saved_item( 'beta', array( 'metadata' => array( 'blockVisibility' => false ) ) )
		);

		$this->assertSame( array( 'All', 'Alpha (2)', 'Gamma (1)' ), $items );
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
	 * The filter reads the options the items read, so a plugin that changes
	 * them changes both.
	 *
	 * @return void
	 */
	public function test_the_filter_reads_the_options_the_items_read() {
		$select_first = static function ( $options ) {
			$options['posts_source'] = 'ids';
			$options['posts_ids']    = array( self::$posts[0] );

			return $options;
		};

		add_filter( 'vpf_get_options', $select_first );

		$items = $this->render_filter( array( 'source' => 'post' ) );

		remove_filter( 'vpf_get_options', $select_first );

		$this->assertSame( array( 'All', 'Alpha (1)' ), $items );
	}

	/**
	 * A loop that leaves out the post being viewed leaves its terms out too.
	 *
	 * @return void
	 */
	public function test_the_current_post_is_left_out_when_the_loop_leaves_it_out() {
		$this->go_to( get_permalink( self::$posts[3] ) );

		$items = $this->render_filter(
			array(
				'source'         => 'post',
				'excludeCurrent' => true,
			)
		);

		$this->assertSame( array( 'All', 'Alpha (2)', 'Beta (2)' ), $items );
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
	 * A random order does not change which terms there are, so two requests
	 * with different seeds share one cached answer.
	 *
	 * @return void
	 */
	public function test_a_random_order_shares_the_cache() {
		global $wpdb;

		$query = array(
			'source'  => 'post',
			'orderBy' => 'rand',
		);

		$this->assertContains( 'Gamma (1)', $this->render_filter( $query ) );

		// Behind WordPress' back, so only a new count would see it.
		$wpdb->insert(
			$wpdb->term_relationships,
			array(
				'object_id'        => self::$posts[2],
				'term_taxonomy_id' => get_term( self::$categories['gamma'] )->term_taxonomy_id,
			)
		);

		$this->new_request();

		$this->assertContains( 'Gamma (1)', $this->render_filter( $query ) );
	}

	/**
	 * Saving a post no visitor sees keeps the cached terms, and a post leaving
	 * the public view takes its terms with it.
	 *
	 * @return void
	 */
	public function test_only_changes_a_visitor_sees_refresh_the_terms() {
		$draft = self::factory()->post->create(
			array(
				'post_status'   => 'draft',
				'post_category' => array( self::$categories['delta'] ),
			)
		);

		$this->assertContains( 'Gamma (1)', $this->render_filter( array( 'source' => 'post' ) ) );

		$version = get_transient( Visual_Portfolio_Filter_Terms::VERSION_KEY );

		wp_update_post(
			array(
				'ID'         => $draft,
				'post_title' => 'Still a draft',
			)
		);

		$this->assertSame( $version, get_transient( Visual_Portfolio_Filter_Terms::VERSION_KEY ) );

		wp_update_post(
			array(
				'ID'          => self::$posts[3],
				'post_status' => 'draft',
			)
		);

		$this->assertNotContains( 'Gamma (1)', $this->render_filter( array( 'source' => 'post' ) ) );
	}

	/**
	 * A logged-in user is counted for themselves, their own private posts
	 * included, and what they saw is not kept for visitors.
	 *
	 * @return void
	 */
	public function test_logged_in_users_are_counted_for_themselves() {
		$author = self::factory()->user->create( array( 'role' => 'author' ) );

		self::factory()->post->create(
			array(
				'post_status'   => 'private',
				'post_author'   => $author,
				'post_category' => array( self::$categories['empty'] ),
			)
		);

		$this->assertNotContains( 'Delta (1)', $this->render_filter( array( 'source' => 'post' ) ) );

		wp_set_current_user( self::factory()->user->create( array( 'role' => 'administrator' ) ) );

		$this->assertContains( 'Delta (1)', $this->render_filter( array( 'source' => 'post' ) ) );

		wp_set_current_user( $author );

		$this->assertContains( 'Empty (1)', $this->render_filter( array( 'source' => 'post' ) ) );

		wp_set_current_user( 0 );

		$items = $this->render_filter( array( 'source' => 'post' ) );

		$this->assertNotContains( 'Delta (1)', $items );
		$this->assertNotContains( 'Empty (1)', $items );
	}

	/**
	 * A gallery of the current query lists the terms of the archive it is on.
	 *
	 * @return void
	 */
	public function test_a_current_query_archive_lists_its_terms() {
		$this->go_to( get_category_link( self::$categories['alpha'] ) );

		$this->assertSame( array( 'All', 'Alpha (2)', 'Beta (1)' ), $this->render_filter( array( 'source' => 'current_query' ) ) );
	}

	/**
	 * Editing a published post refreshes the terms, since it can move the post
	 * into a gallery a keyword narrows.
	 *
	 * @return void
	 */
	public function test_editing_a_published_post_refreshes_the_terms() {
		$query = array(
			'source'  => 'post',
			'keyword' => 'Special',
		);

		$this->assertSame( array(), $this->render_filter( $query ) );

		wp_update_post(
			array(
				'ID'         => self::$posts[3],
				'post_title' => 'Special post',
			)
		);

		$this->new_request();

		$this->assertSame( array( 'All', 'Gamma (1)' ), $this->render_filter( $query ) );
	}

	/**
	 * Address vars a query does not read share the cached answer.
	 *
	 * @return void
	 */
	public function test_address_vars_that_change_nothing_share_the_cache() {
		global $wpdb;

		$this->go_to( get_category_link( self::$categories['alpha'] ) );

		$this->assertContains( 'Alpha (2)', $this->render_filter( array( 'source' => 'current_query' ) ) );

		$wpdb->insert(
			$wpdb->term_relationships,
			array(
				'object_id'        => self::$posts[3],
				'term_taxonomy_id' => get_term( self::$categories['alpha'] )->term_taxonomy_id,
			)
		);

		$this->go_to( add_query_arg( 'pb', '2', get_category_link( self::$categories['alpha'] ) ) );
		$this->new_request();

		$this->assertContains( 'Alpha (2)', $this->render_filter( array( 'source' => 'current_query' ) ) );
	}

	/**
	 * Search flags change which posts a query returns, so they keep two
	 * galleries apart.
	 *
	 * @return void
	 */
	public function test_search_flags_keep_galleries_apart() {
		$exact = $this->render_filter(
			array(
				'source'      => 'custom_query',
				'customQuery' => 'post_type=post&s=Post&exact=1',
			)
		);

		$loose = $this->render_filter(
			array(
				'source'      => 'custom_query',
				'customQuery' => 'post_type=post&s=Post',
			)
		);

		$this->assertSame( array(), $exact );
		$this->assertSame( array( 'All', 'Alpha (2)', 'Beta (2)', 'Gamma (1)' ), $loose );
	}

	/**
	 * A query for unpublished statuses, and a render in the admin, are counted
	 * on every render and never fill the visitors' answer.
	 *
	 * @return void
	 */
	public function test_unpublished_statuses_stay_out_of_the_cache() {
		self::factory()->post->create(
			array(
				'post_status'   => 'draft',
				'post_category' => array( self::$categories['delta'] ),
			)
		);

		$this->assertContains(
			'Delta (1)',
			$this->render_filter(
				array(
					'source'      => 'custom_query',
					'customQuery' => 'post_type=post&post_status=draft,publish',
				)
			)
		);

		set_current_screen( 'edit-post' );

		$this->assertContains( 'Delta (1)', $this->render_filter( array( 'source' => 'post' ) ) );

		set_current_screen( 'front' );

		$this->assertNotContains( 'Delta (1)', $this->render_filter( array( 'source' => 'post' ) ) );
	}

	/**
	 * A query for one post by id counts no draft for a visitor, although
	 * `WP_Query` skips its status check when it is asked for ids.
	 *
	 * @return void
	 */
	public function test_a_query_for_one_draft_counts_nothing_for_visitors() {
		$draft = self::factory()->post->create(
			array(
				'post_status'   => 'draft',
				'post_category' => array( self::$categories['delta'] ),
			)
		);

		$this->assertSame(
			array(),
			$this->render_filter(
				array(
					'source'      => 'custom_query',
					'customQuery' => 'p=' . $draft,
				)
			)
		);
	}

	/**
	 * A window of dates moves with the clock, so it is counted on every render.
	 *
	 * @return void
	 */
	public function test_a_date_window_is_counted_on_every_render() {
		global $wpdb;

		$last_years = static function ( $args ) {
			$args['date_query'] = array( array( 'after' => '-100 years' ) );

			return $args;
		};

		add_filter( 'vpf_extend_query_args', $last_years );

		$this->assertContains( 'Gamma (1)', $this->render_filter( array( 'source' => 'post' ) ) );

		$wpdb->insert(
			$wpdb->term_relationships,
			array(
				'object_id'        => self::$posts[2],
				'term_taxonomy_id' => get_term( self::$categories['gamma'] )->term_taxonomy_id,
			)
		);

		$this->new_request();

		$items = $this->render_filter( array( 'source' => 'post' ) );

		remove_filter( 'vpf_extend_query_args', $last_years );

		$this->assertContains( 'Gamma (2)', $items );
	}

	/**
	 * The editor is given the terms of the loop's whole query, a manual
	 * selection included.
	 *
	 * @return void
	 */
	public function test_the_editor_lists_the_terms_of_a_manual_selection() {
		wp_set_current_user( self::factory()->user->create( array( 'role' => 'editor' ) ) );

		$labels = $this->request_labels(
			array(
				'source' => 'ids',
				'ids'    => array( self::$posts[0], self::$posts[3] ),
			)
		);

		$this->assertSame( array( 'All', 'Alpha', 'Gamma' ), $labels );
	}

	/**
	 * A custom query in the editor of someone who cannot read other users'
	 * drafts counts none of them.
	 *
	 * @return void
	 */
	public function test_the_editor_hides_drafts_a_contributor_cannot_read() {
		$draft = self::factory()->post->create(
			array(
				'post_status'   => 'draft',
				'post_category' => array( self::$categories['delta'] ),
			)
		);

		$query = array(
			'source'      => 'custom_query',
			'customQuery' => 'post_type=post&post_status=draft,publish&category_name=delta',
		);

		wp_set_current_user( self::factory()->user->create( array( 'role' => 'contributor' ) ) );

		$this->assertSame( array( 'All' ), $this->request_labels( $query ) );

		// `parse_str()` reads a dot as an underscore.
		$this->assertSame(
			array( 'All' ),
			$this->request_labels(
				array(
					'source'      => 'custom_query',
					'customQuery' => 'post_type=post&post.status=draft,publish&category_name=delta',
				)
			)
		);

		// A query for one post checks no status unless it is given one.
		$this->assertSame(
			array( 'All' ),
			$this->request_labels(
				array(
					'source'      => 'custom_query',
					'customQuery' => 'p=' . $draft,
				)
			)
		);

		wp_set_current_user( self::factory()->user->create( array( 'role' => 'editor' ) ) );

		$this->assertSame( array( 'All', 'Delta' ), $this->request_labels( $query ) );
	}
}
