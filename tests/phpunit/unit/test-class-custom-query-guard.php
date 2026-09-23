<?php
/**
 * Tests for the custom query guard: a custom query saved by a user who cannot
 * read other users' private posts asks for no status visitors may not see.
 *
 * @package Visual Portfolio
 */

/**
 * Custom query guard test case.
 */
class ClassCustomQueryGuard extends WP_UnitTestCase {
	/**
	 * Log the user out after every test.
	 *
	 * @return void
	 */
	public function tear_down() {
		global $wp_rest_server;

		$wp_rest_server = null;

		wp_set_current_user( 0 );

		parent::tear_down();
	}

	/**
	 * A Gallery Loop block with the given custom query.
	 *
	 * @param string $query - custom query.
	 *
	 * @return string
	 */
	private function loop_block( $query ) {
		return sprintf(
			'<!-- wp:visual-portfolio/loop %s --><div class="wp-block-visual-portfolio-loop vp-block-loop"></div><!-- /wp:visual-portfolio/loop -->',
			wp_json_encode(
				array(
					'block_id'   => 'guard',
					'postsQuery' => array(
						'source'      => 'custom_query',
						'customQuery' => $query,
					),
				)
			)
		);
	}

	/**
	 * Save a page with the given content as the given role, and return what
	 * was stored.
	 *
	 * @param string      $content - post content.
	 * @param string|null $role    - role of the user saving, none for no user.
	 *
	 * @return string
	 */
	private function save_as( $content, $role ) {
		wp_set_current_user( $role ? self::factory()->user->create( array( 'role' => $role ) ) : 0 );

		$post_id = wp_insert_post(
			wp_slash(
				array(
					'post_type'    => 'page',
					'post_status'  => 'draft',
					'post_title'   => 'Guarded',
					'post_content' => $content,
				)
			)
		);

		return get_post( $post_id )->post_content;
	}

	/**
	 * Custom queries of the blocks stored in a post, in document order.
	 *
	 * @param string $content - post content.
	 *
	 * @return array
	 */
	private function stored_queries( $content ) {
		$queries = array();

		$walk = static function ( $blocks ) use ( &$walk, &$queries ) {
			foreach ( $blocks as $block ) {
				if ( isset( $block['attrs']['postsQuery']['customQuery'] ) ) {
					$queries[] = $block['attrs']['postsQuery']['customQuery'];
				} elseif ( isset( $block['attrs']['posts_custom_query'] ) ) {
					$queries[] = $block['attrs']['posts_custom_query'];
				}

				$walk( $block['innerBlocks'] );
			}
		};

		$walk( parse_blocks( $content ) );

		return $queries;
	}

	/**
	 * The statuses a stored custom query ends up asking for.
	 *
	 * @param string $query - stored custom query.
	 *
	 * @return mixed
	 */
	private function asked_statuses( $query ) {
		$vars = array();

		parse_str( html_entity_decode( $query ), $vars );

		return $vars['post_status'] ?? null;
	}

	/**
	 * A user who cannot read other users' private posts saves a query that
	 * asks for published posts only, in a Gallery Loop at any depth and in a
	 * classic block alike.
	 *
	 * @return void
	 */
	public function test_an_author_saves_published_statuses_only() {
		$content = '<!-- wp:group --><div class="wp-block-group">' . $this->loop_block( 'post_type=post&post_status=draft,publish' ) . '</div><!-- /wp:group -->'
			. '<!-- wp:visual-portfolio/block {"block_id":"classic","content_source":"post-based","posts_source":"custom_query","posts_custom_query":"post_type=post&post.status=private"} /-->';

		$queries = $this->stored_queries( $this->save_as( $content, 'author' ) );

		$this->assertSame( 'post_status=publish&post_type=post', $queries[0] );
		$this->assertSame( 'publish', $this->asked_statuses( $queries[0] ) );
		$this->assertSame( 'publish', $this->asked_statuses( $queries[1] ) );
	}

	/**
	 * A query for one post checks no status on its own, so it is given one;
	 * one for an attachment also gets the status an attachment has.
	 *
	 * @return void
	 */
	public function test_a_query_for_one_post_is_given_published_statuses() {
		$queries = $this->stored_queries( $this->save_as( $this->loop_block( 'p=123' ) . $this->loop_block( 'attachment_id=123' ), 'author' ) );

		$this->assertSame( 'publish', $this->asked_statuses( $queries[0] ) );
		$this->assertSame( 'publish,inherit', $this->asked_statuses( $queries[1] ) );
	}

	/**
	 * A status hidden past the vars `parse_str()` reads is not read back.
	 *
	 * @return void
	 */
	public function test_a_long_query_cannot_outrun_the_guard() {
		$padding = '';

		for ( $i = 0; $i < 1200; $i++ ) {
			$padding .= '&k' . $i . '=1';
		}

		$queries = $this->stored_queries(
			$this->save_as(
				$this->loop_block( 'post_type=post&post_status=draft,private' . $padding ) . $this->loop_block( 'p=123' . $padding ),
				'author'
			)
		);

		foreach ( $queries as $query ) {
			$vars = array();

			parse_str( html_entity_decode( $query ), $vars );

			$this->assertSame( 'publish', $vars['post_status'] );
		}
	}

	/**
	 * A custom query written to a post's meta, which the shortcode and the
	 * Saved block read from any post, is checked too.
	 *
	 * @return void
	 */
	public function test_a_custom_query_in_meta_is_checked() {
		wp_set_current_user( self::factory()->user->create( array( 'role' => 'author' ) ) );

		$post_id = self::factory()->post->create( array( 'post_author' => get_current_user_id() ) );

		add_post_meta( $post_id, 'vp_posts_custom_query', 'post_type=post&post_status=draft' );

		$this->assertSame( 'publish', $this->asked_statuses( get_post_meta( $post_id, 'vp_posts_custom_query', true ) ) );
	}

	/**
	 * A user who reads other users' private posts keeps what they wrote, and
	 * a save without a user is left alone.
	 *
	 * @return void
	 */
	public function test_a_reader_of_private_posts_and_a_save_without_a_user_keep_the_query() {
		$content = $this->loop_block( 'post_type=post&post_status=draft,private' );

		$this->assertSame( 'draft,private', $this->asked_statuses( $this->stored_queries( $this->save_as( $content, 'editor' ) )[0] ) );
		$this->assertSame( 'draft,private', $this->asked_statuses( $this->stored_queries( $this->save_as( $content, null ) )[0] ) );
	}

	/**
	 * Content that needs no change leaves the guard as it came, not serialized
	 * again.
	 *
	 * @return void
	 */
	public function test_content_that_needs_no_change_is_not_rewritten() {
		$content = "<!-- wp:paragraph -->\n<p>Before</p>\n<!-- /wp:paragraph -->\n\n" . $this->loop_block( 'post_type=post&category_name=news' );

		wp_set_current_user( self::factory()->user->create( array( 'role' => 'author' ) ) );

		$data = apply_filters( 'wp_insert_post_data', array( 'post_content' => wp_slash( $content ) ), array(), array(), false );

		$this->assertSame( $content, wp_unslash( $data['post_content'] ) );
	}

	/**
	 * The page count the editor asks for counts only what the user may read.
	 *
	 * @return void
	 */
	public function test_the_page_count_counts_readable_posts_only() {
		global $wp_rest_server;

		$owner = self::factory()->user->create( array( 'role' => 'editor' ) );

		self::factory()->post->create_many(
			3,
			array(
				'post_status' => 'draft',
				'post_author' => $owner,
			)
		);

		wp_set_current_user( self::factory()->user->create( array( 'role' => 'contributor' ) ) );

		$wp_rest_server = new WP_REST_Server();

		do_action( 'rest_api_init', $wp_rest_server );

		$request = new WP_REST_Request( 'POST', '/visual-portfolio/v1/get_max_pages' );
		$request->set_header( 'Content-Type', 'application/json' );
		$request->set_body(
			wp_json_encode(
				array(
					'queryType'  => 'posts',
					'baseQuery'  => array( 'perPage' => 1 ),
					// The whole query, as the editor sends it.
					'postsQuery' => array(
						'source'             => 'custom_query',
						'postTypesSet'       => array( 'post' ),
						'ids'                => array(),
						'excludeIds'         => array(),
						'order'              => 'desc',
						'orderBy'            => 'post_date',
						'offset'             => 0,
						'taxonomies'         => array(),
						'taxonomiesRelation' => 'or',
						'avoidDuplicates'    => false,
						'excludeCurrent'     => false,
						'keyword'            => '',
						'customQuery'        => 'post_type=post&post_status=draft',
					),
				)
			)
		);

		$this->assertLessThan( 3, rest_do_request( $request )->get_data()['max_pages'] );
	}

	/**
	 * A Saved Layout's custom query is checked when its editor saves it.
	 *
	 * @return void
	 */
	public function test_a_saved_layout_keeps_published_statuses_only() {
		global $wp_rest_server;

		// Registered on `init`, which the test suite does not run again after
		// resetting the post types.
		if ( ! post_type_exists( 'vp_lists' ) ) {
			register_post_type( 'vp_lists', array( 'map_meta_cap' => true ) );
		}

		$author = self::factory()->user->create( array( 'role' => 'administrator' ) );
		$layout = self::factory()->post->create(
			array(
				'post_type'   => 'vp_lists',
				'post_author' => $author,
			)
		);

		// An administrator who cannot read private posts, the way a site can
		// narrow the role.
		$user = new WP_User( $author );
		$user->add_cap( 'read_private_posts', false );
		$user->add_cap( 'read_private_pages', false );

		wp_set_current_user( $author );

		$wp_rest_server = new WP_REST_Server();

		do_action( 'rest_api_init', $wp_rest_server );

		$request = new WP_REST_Request( 'POST', '/visual-portfolio/v1/update_layout' );
		$request->set_param( 'post_id', $layout );
		$request->set_param( 'data', array( 'vp_posts_custom_query' => 'post_type=post&post_status=private' ) );

		rest_do_request( $request );

		$this->assertSame( 'publish', $this->asked_statuses( get_post_meta( $layout, 'vp_posts_custom_query', true ) ) );
	}
}
