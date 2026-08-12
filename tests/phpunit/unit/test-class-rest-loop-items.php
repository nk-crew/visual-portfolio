<?php
/**
 * Tests for the `get_loop_items` REST route of Visual_Portfolio_Rest
 *
 * @package Visual Portfolio
 */

/**
 * Loop items REST endpoint test case.
 */
class ClassRestLoopItems extends WP_UnitTestCase {
	use Visual_Portfolio_Loop_Blocks_Trait;

	/**
	 * Route the editor preview asks for its items.
	 *
	 * Registered with a trailing slash, but `register_rest_route()` trims it and
	 * `rest_api_loaded()` untrailingslashits the incoming path.
	 */
	const ROUTE = '/visual-portfolio/v1/get_loop_items';

	/**
	 * Attachment used by the images source.
	 *
	 * @var int
	 */
	private static $attachment_id = 0;

	/**
	 * User allowed to preview a loop.
	 *
	 * @var int
	 */
	private static $editor_id = 0;

	/**
	 * Create the user and the attachment shared by the tests.
	 *
	 * @param WP_UnitTest_Factory $factory - test factory.
	 *
	 * @return void
	 */
	public static function wpSetUpBeforeClass( $factory ) {
		self::$editor_id = $factory->user->create( array( 'role' => 'editor' ) );

		self::$attachment_id = $factory->attachment->create_object(
			array(
				'file'           => 'rest-loop-items.jpg',
				'post_mime_type' => 'image/jpeg',
			)
		);

		// The attachment factory generates no derivatives, and without them every
		// size would resolve to the same full URL - which would let a broken
		// `imageSizes` pass unnoticed.
		wp_update_attachment_metadata(
			self::$attachment_id,
			array(
				'file'   => 'rest-loop-items.jpg',
				'width'  => 1600,
				'height' => 1200,
				'sizes'  => array(
					'thumbnail' => array(
						'file'      => 'rest-loop-items-150x150.jpg',
						'width'     => 150,
						'height'    => 150,
						'mime-type' => 'image/jpeg',
					),
					'medium'    => array(
						'file'      => 'rest-loop-items-300x225.jpg',
						'width'     => 300,
						'height'    => 225,
						'mime-type' => 'image/jpeg',
					),
					'large'     => array(
						'file'      => 'rest-loop-items-1024x768.jpg',
						'width'     => 1024,
						'height'    => 768,
						'mime-type' => 'image/jpeg',
					),
				),
			)
		);
	}

	/**
	 * Boot a REST server and authenticate, so every test drives the real route.
	 *
	 * @return void
	 */
	public function set_up() {
		parent::set_up();

		$this->skip_without_loop_blocks();

		global $wp_rest_server;

		$wp_rest_server = new WP_REST_Server();

		do_action( 'rest_api_init', $wp_rest_server );

		wp_set_current_user( self::$editor_id );
	}

	/**
	 * Drop everything the endpoint leaves behind a request.
	 *
	 * @return void
	 */
	public function tear_down() {
		global $wp_rest_server;

		$this->delete_preview_transients();

		$wp_rest_server = null;

		wp_set_current_user( 0 );

		$_GET     = array();
		$_REQUEST = array();

		$this->reset_loop_state();

		parent::tear_down();
	}

	/**
	 * Drop every preview transient the endpoint wrote.
	 *
	 * Swept out of the options table rather than tracked through a hook: the
	 * action that announces a written transient was renamed in WordPress 6.8,
	 * and the endpoint keeps its cache key to itself.
	 *
	 * @return void
	 */
	private function delete_preview_transients() {
		global $wpdb;

		$names = $wpdb->get_col(
			$wpdb->prepare(
				"SELECT option_name FROM $wpdb->options WHERE option_name LIKE %s",
				$wpdb->esc_like( '_transient_vpf_loop_preview_' ) . '%'
			)
		);

		foreach ( $names as $name ) {
			delete_transient( substr( $name, strlen( '_transient_' ) ) );
		}
	}

	/**
	 * Reset the static state the pipeline keeps per request.
	 *
	 * A test process is one PHP request, so without this the pipeline would
	 * answer a second dispatch from its own memoization and hide whatever the
	 * endpoint cache does.
	 *
	 * @return void
	 */
	private function reset_loop_state() {
		foreach ( array( 'loop_items_cache', 'used_posts' ) as $name ) {
			$property = new ReflectionProperty( 'Visual_Portfolio_Get', $name );

			if ( method_exists( $property, 'setAccessible' ) ) {
				$property->setAccessible( true );
			}

			$property->setValue( null, array() );
		}
	}

	/**
	 * Build the modern payload the loop block sends to the endpoint.
	 *
	 * @param string $query_type - modern content source.
	 * @param int    $per_page - items per page.
	 * @param array  $query - `postsQuery` or `imagesQuery` overrides.
	 *
	 * @return array
	 */
	private function get_body( $query_type, $per_page, $query = array() ) {
		$group = 'images' === $query_type ? 'imagesQuery' : 'postsQuery';

		return array(
			'queryType' => $query_type,
			'baseQuery' => array( 'perPage' => $per_page ),
			$group      => $query,
		);
	}

	/**
	 * Build the image items the `images` content source expects.
	 *
	 * @param int $count - number of images.
	 *
	 * @return array
	 */
	private function get_images( $count ) {
		$images = array();

		for ( $i = 0; $i < $count; $i++ ) {
			$images[] = array(
				'id'         => self::$attachment_id,
				'title'      => 'Image ' . ( $i + 1 ),
				'categories' => array(),
			);
		}

		return $images;
	}

	/**
	 * Dispatch a request the way the editor does.
	 *
	 * Goes through `rest_do_request()` rather than the handler, so routing, the
	 * permission callback and the JSON body parsing are all exercised.
	 *
	 * @param array $body - modern loop attributes.
	 * @param array $query - request state, as the query string carries it.
	 *
	 * @return WP_REST_Response
	 */
	private function dispatch( $body, $query = array() ) {
		$request = new WP_REST_Request( 'POST', self::ROUTE );

		$request->set_header( 'content-type', 'application/json' );
		$request->set_body( (string) wp_json_encode( $body ) );

		if ( ! empty( $query ) ) {
			$request->set_query_params( $query );

			// The pipeline reads the state out of the request, not out of the
			// REST parameters - the same code answers a page load.
			foreach ( $query as $name => $value ) {
				$_GET[ $name ]     = $value;
				$_REQUEST[ $name ] = $value;
			}
		}

		return rest_do_request( $request );
	}

	/**
	 * Unwrap the items of a successful response.
	 *
	 * @param WP_REST_Response $response - dispatched response.
	 *
	 * @return array
	 */
	private function get_items( $response ) {
		$data = $response->get_data();

		$this->assertTrue( $data['success'] );

		return $data['response']['items'];
	}

	/**
	 * The route exists only where the loop block family does.
	 *
	 * @return void
	 */
	public function test_route_is_registered() {
		$routes = rest_get_server()->get_routes();

		$this->assertSame(
			visual_portfolio()->supports_loop_blocks(),
			isset( $routes[ self::ROUTE ] )
		);
	}

	/**
	 * A posts query answers with the page of items and the page count.
	 *
	 * @return void
	 */
	public function test_posts_query_returns_items_and_max_pages() {
		$this->factory->post->create_many( 7 );

		$response = $this->dispatch( $this->get_body( 'posts', 3, array( 'source' => 'post' ) ) );

		$this->assertSame( 200, $response->get_status() );

		$data = $response->get_data();

		$this->assertTrue( $data['success'] );
		$this->assertCount( 3, $data['response']['items'] );
		$this->assertSame( 3, $data['response']['max_pages'] );
	}

	/**
	 * Items arrive with the context keys of the item blocks, unprefixed.
	 *
	 * The editor reads the same keys the rendered item blocks get through block
	 * context - a renamed or namespaced key here silently breaks the preview.
	 *
	 * @return void
	 */
	public function test_item_carries_unprefixed_context_keys() {
		$post_id = $this->factory->post->create( array( 'post_title' => 'Context post' ) );

		$items = $this->get_items( $this->dispatch( $this->get_body( 'posts', 3, array( 'source' => 'post' ) ) ) );

		$this->assertCount( 1, $items );

		$expected = array(
			'itemId',
			'itemPostId',
			'itemImgId',
			'itemImgUrl',
			'itemImgAlt',
			'itemNoImgId',
			'itemFocalPoint',
			'itemUrl',
			'itemAriaLabel',
			'itemTitle',
			'itemContent',
			'itemExcerpt',
			'itemCategories',
			'itemFormat',
			'itemVideoUrl',
			'itemAuthor',
			'itemAuthorUrl',
			'itemAuthorAvatar',
			'itemPublishedTime',
			'itemCommentsCount',
			'itemCommentsUrl',
			'itemViewsCount',
			'itemReadingTime',
			'imageSizes',
		);

		foreach ( $expected as $key ) {
			$this->assertArrayHasKey( $key, $items[0] );
		}

		// Block context is namespaced, a REST response is not - nothing may keep
		// the `vp/` prefix the mapper starts from.
		foreach ( array_keys( $items[0] ) as $key ) {
			$this->assertStringStartsNotWith( 'vp/', $key );
		}

		$this->assertSame( $post_id, $items[0]['itemPostId'] );
		$this->assertSame( 'Context post', $items[0]['itemTitle'] );
		$this->assertSame(
			array( 'thumbnail', 'medium', 'large', 'full' ),
			array_keys( $items[0]['imageSizes'] )
		);
	}

	/**
	 * An images query answers as well, with a URL per registered size.
	 *
	 * @return void
	 */
	public function test_images_query_returns_items_with_every_image_size() {
		$body = $this->get_body( 'images', 6, array( 'images' => $this->get_images( 2 ) ) );

		$items = $this->get_items( $this->dispatch( $body ) );

		$this->assertCount( 2, $items );
		$this->assertSame( 'Image 1', $items[0]['itemTitle'] );
		$this->assertSame( self::$attachment_id, $items[0]['itemImgId'] );

		$sizes = $items[0]['imageSizes'];

		$this->assertStringContainsString( 'rest-loop-items-150x150.jpg', $sizes['thumbnail'] );
		$this->assertStringContainsString( 'rest-loop-items-300x225.jpg', $sizes['medium'] );
		$this->assertStringContainsString( 'rest-loop-items-1024x768.jpg', $sizes['large'] );
		$this->assertStringContainsString( 'rest-loop-items.jpg', $sizes['full'] );
	}

	/**
	 * A string image id survives the mapping and every size falls back to the URL.
	 *
	 * The Pro social sources address remote images by ids such as
	 * `vpf_pro_social_123`. There is no attachment to resolve, so casting the id
	 * or trusting `wp_get_attachment_image_src()` would empty the preview.
	 *
	 * @return void
	 */
	public function test_string_image_id_falls_back_to_the_item_url() {
		$remote_url = 'https://cdn.example.com/social/photo.jpg';

		$custom_items = function ( $items, $each_item_args ) {
			return array(
				array_merge(
					$each_item_args,
					array(
						'uid'      => 'social-1',
						'title'    => 'Social item',
						'image_id' => 'vpf_pro_social_123',
					)
				),
			);
		};

		// The URL of a remote image arrives with the context filter, the same way
		// the Pro plugin supplies it.
		$item_context = function ( $context, $item ) use ( $remote_url ) {
			if ( 'vpf_pro_social_123' === ( $item['image_id'] ?? '' ) ) {
				$context['vp/itemImgUrl'] = $remote_url;
			}

			return $context;
		};

		add_filter( 'vpf_custom_items', $custom_items, 10, 2 );
		add_filter( 'vpf_loop_item_context', $item_context, 10, 2 );

		$items = $this->get_items( $this->dispatch( $this->get_body( 'images', 6 ) ) );

		remove_filter( 'vpf_custom_items', $custom_items, 10 );
		remove_filter( 'vpf_loop_item_context', $item_context, 10 );

		$this->assertCount( 1, $items );
		$this->assertSame( 'vpf_pro_social_123', $items[0]['itemImgId'] );
		$this->assertSame(
			array(
				'thumbnail' => $remote_url,
				'medium'    => $remote_url,
				'large'     => $remote_url,
				'full'      => $remote_url,
			),
			$items[0]['imageSizes']
		);
	}

	/**
	 * A body without a query type is refused instead of resolving a default query.
	 *
	 * @return void
	 */
	public function test_missing_content_source_is_an_error() {
		$response = $this->dispatch( array( 'baseQuery' => array( 'perPage' => 3 ) ) );

		$data = $response->get_data();

		$this->assertSame( 401, $response->get_status() );
		$this->assertFalse( $data['success'] );
		$this->assertSame( 'missing_params', $data['error_code'] );
	}

	/**
	 * A visitor cannot read the items of a gallery that is still being edited.
	 *
	 * @return void
	 */
	public function test_logged_out_user_is_refused() {
		$this->factory->post->create_many( 2 );

		wp_set_current_user( 0 );

		$response = $this->dispatch( $this->get_body( 'posts', 3, array( 'source' => 'post' ) ) );

		$this->assertTrue( $response->is_error() );
		$this->assertSame( 401, $response->get_status() );
		$this->assertSame( 'not_allowed', $response->as_error()->get_error_code() );
	}

	/**
	 * A user who edits content gets the preview.
	 *
	 * @return void
	 */
	public function test_user_who_can_edit_posts_is_allowed() {
		$this->factory->post->create_many( 2 );

		$this->assertTrue( user_can( self::$editor_id, 'edit_posts' ) );

		$response = $this->dispatch( $this->get_body( 'posts', 3, array( 'source' => 'post' ) ) );

		$this->assertFalse( $response->is_error() );
		$this->assertCount( 2, $this->get_items( $response ) );
	}

	/**
	 * A source outside the allowlist gets an empty list, not a failure.
	 *
	 * The block shows its empty state for a source nothing is registered for -
	 * an error would surface in the editor as a broken preview instead.
	 *
	 * @return void
	 */
	public function test_unlisted_source_returns_an_empty_list() {
		$resolved = 0;

		$counter = function () use ( &$resolved ) {
			$resolved++;
		};

		add_action( 'vpf_before_loop_items', $counter );

		$response = $this->dispatch( $this->get_body( 'social-stream', 6 ) );

		remove_action( 'vpf_before_loop_items', $counter );

		$data = $response->get_data();

		$this->assertSame( 200, $response->get_status() );
		$this->assertTrue( $data['success'] );
		$this->assertSame( array(), $data['response']['items'] );
		$this->assertSame( 1, $data['response']['max_pages'] );

		// The allowlist gates the query itself, not just the answer.
		$this->assertSame( 0, $resolved );
	}

	/**
	 * The allowlist filter opens the endpoint to a source the free plugin lacks.
	 *
	 * @return void
	 */
	public function test_source_configs_filter_can_add_a_source() {
		$add_source = function ( $configs ) {
			$configs['social-stream'] = array( 'images' );

			return $configs;
		};

		$custom_items = function ( $items, $each_item_args ) {
			return array(
				array_merge(
					$each_item_args,
					array(
						'uid'   => 'social-1',
						'title' => 'Social item',
					)
				),
			);
		};

		add_filter( 'vpf_rest_loop_items_source_configs', $add_source );
		add_filter( 'vpf_custom_items', $custom_items, 10, 2 );

		$items = $this->get_items( $this->dispatch( $this->get_body( 'social-stream', 6 ) ) );

		remove_filter( 'vpf_rest_loop_items_source_configs', $add_source );
		remove_filter( 'vpf_custom_items', $custom_items, 10 );

		$this->assertCount( 1, $items );
		$this->assertSame( 'Social item', $items[0]['itemTitle'] );
	}

	/**
	 * A repeated request inside the TTL is answered without resolving the query.
	 *
	 * The editor debounces, but the Pro social sources call external APIs - a
	 * cache miss per keystroke is a rate limit.
	 *
	 * @return void
	 */
	public function test_transient_cache_serves_a_repeated_request() {
		$this->factory->post->create_many( 3 );

		$body  = $this->get_body( 'posts', 3, array( 'source' => 'post' ) );
		$calls = 0;

		$counter = function ( $result ) use ( &$calls ) {
			$calls++;

			return $result;
		};

		add_filter( 'vpf_loop_items', $counter );

		$this->dispatch( $body );

		$this->reset_loop_state();

		$second = $this->dispatch( $body );

		remove_filter( 'vpf_loop_items', $counter );

		$this->assertSame( 1, $calls );

		// The cached answer is the whole response, not an empty placeholder.
		$this->assertCount( 3, $this->get_items( $second ) );
	}

	/**
	 * A different body is not served the cached answer of an earlier one.
	 *
	 * @return void
	 */
	public function test_transient_cache_keys_on_the_request_body() {
		$this->factory->post->create_many( 6 );

		$calls = 0;

		$counter = function ( $result ) use ( &$calls ) {
			$calls++;

			return $result;
		};

		add_filter( 'vpf_loop_items', $counter );

		$first = $this->dispatch( $this->get_body( 'posts', 2, array( 'source' => 'post' ) ) );

		$this->reset_loop_state();

		$second = $this->dispatch( $this->get_body( 'posts', 4, array( 'source' => 'post' ) ) );

		remove_filter( 'vpf_loop_items', $counter );

		$this->assertCount( 2, $this->get_items( $first ) );
		$this->assertCount( 4, $this->get_items( $second ) );
		$this->assertSame( 2, $calls );
	}
	/**
	 * A preview of a loop is paged by the parameter of that loop.
	 *
	 * @return void
	 */
	public function test_preview_reads_the_namespaced_page() {
		$body = $this->get_body( 'images', 2, array( 'images' => $this->get_images( 5 ) ) );

		$body['queryId'] = 4;

		$items = $this->get_items( $this->dispatch( $body, array( 'vp-4-page' => '2' ) ) );

		$this->assertSame( 'Image 3', $items[0]['itemTitle'] );
	}

	/**
	 * The cached answer of one page is not served for another.
	 *
	 * The key has to be built from the parameters the pipeline will read. Built
	 * from the legacy names while the loop reads `vp-4-page`, every page of a
	 * preview looks like the same request and the editor keeps showing page one.
	 *
	 * @return void
	 */
	public function test_transient_cache_keys_on_the_namespaced_page() {
		$body = $this->get_body( 'images', 2, array( 'images' => $this->get_images( 5 ) ) );

		$body['queryId'] = 4;

		$first = $this->get_items( $this->dispatch( $body ) );

		$this->reset_loop_state();

		$second = $this->get_items( $this->dispatch( $body, array( 'vp-4-page' => '2' ) ) );

		$this->assertSame( 'Image 1', $first[0]['itemTitle'] );
		$this->assertSame( 'Image 3', $second[0]['itemTitle'] );
	}

	/**
	 * Two loops with the same settings do not share a cached page.
	 *
	 * @return void
	 */
	public function test_transient_cache_keys_on_the_query_id() {
		$body = $this->get_body( 'images', 2, array( 'images' => $this->get_images( 5 ) ) );

		$paged            = $body;
		$paged['queryId'] = 4;

		$untouched            = $body;
		$untouched['queryId'] = 5;

		$query = array( 'vp-4-page' => '2' );

		$first = $this->get_items( $this->dispatch( $paged, $query ) );

		$this->reset_loop_state();

		$second = $this->get_items( $this->dispatch( $untouched, $query ) );

		$this->assertSame( 'Image 3', $first[0]['itemTitle'] );
		$this->assertSame( 'Image 1', $second[0]['itemTitle'] );
	}

	/**
	 * A hand-written query cannot be used to read posts the user may not open.
	 *
	 * `custom_query` is handed straight to `WP_Query`, so without a capability
	 * check the preview would give any contributor another author's private
	 * drafts - content they cannot reach anywhere else in the editor.
	 *
	 * @return void
	 */
	public function test_custom_query_cannot_leak_private_posts() {
		$owner = self::factory()->user->create( array( 'role' => 'editor' ) );

		$secret = self::factory()->post->create(
			array(
				'post_title'   => 'Secret private post',
				'post_content' => 'Confidential body text.',
				'post_status'  => 'private',
				'post_author'  => $owner,
			)
		);

		wp_set_current_user( self::factory()->user->create( array( 'role' => 'contributor' ) ) );

		$items = $this->get_items( $this->dispatch_private_custom_query() );

		// Ids rather than titles: WordPress prefixes a private post's title with
		// "Private:", so a title assertion passes even when the post did leak.
		$this->assertNotContains( $secret, wp_list_pluck( $items, 'itemPostId' ) );
	}

	/**
	 * The author of a private post still previews it.
	 *
	 * The capability check has to narrow the query to what this user may read,
	 * not disable the source.
	 *
	 * @return void
	 */
	public function test_custom_query_still_shows_own_private_posts() {
		$author = self::factory()->user->create( array( 'role' => 'editor' ) );

		$own = self::factory()->post->create(
			array(
				'post_title'  => 'My own private post',
				'post_status' => 'private',
				'post_author' => $author,
			)
		);

		wp_set_current_user( $author );

		$items = $this->get_items( $this->dispatch_private_custom_query() );

		$this->assertContains( $own, wp_list_pluck( $items, 'itemPostId' ) );
	}

	/**
	 * Ask the preview for private posts through a hand-written query.
	 *
	 * @return WP_REST_Response
	 */
	private function dispatch_private_custom_query() {
		return $this->dispatch(
			array(
				'queryType'  => 'posts',
				'baseQuery'  => array( 'perPage' => 10 ),
				'postsQuery' => array(
					'source'      => 'custom_query',
					'customQuery' => 'post_status=private',
				),
			)
		);
	}
}
