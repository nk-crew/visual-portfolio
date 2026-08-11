<?php
/**
 * Tests for Visual_Portfolio_Get::get_loop_items
 *
 * @package Visual Portfolio
 */

/**
 * Loop items pipeline test case.
 */
class ClassGetPortfolioLoopItems extends WP_UnitTestCase {
	/**
	 * Attachment used by the images source.
	 *
	 * @var int
	 */
	private static $attachment_id = 0;

	/**
	 * Create the attachment shared by the images tests.
	 *
	 * @param WP_UnitTest_Factory $factory - test factory.
	 *
	 * @return void
	 */
	public static function wpSetUpBeforeClass( $factory ) {
		self::$attachment_id = $factory->attachment->create_object(
			array(
				'file'           => 'loop-items.jpg',
				'post_mime_type' => 'image/jpeg',
			)
		);
	}

	/**
	 * Clean up the request and the per-request caches between tests.
	 *
	 * @return void
	 */
	public function tear_down() {
		unset( $_GET['vp_page'], $_GET['vp_filter'], $_GET['vp_sort'], $_REQUEST['vp_page'], $_REQUEST['vp_filter'], $_REQUEST['vp_sort'] );

		$this->reset_loop_state();

		parent::tear_down();
	}

	/**
	 * Reset the static state the pipeline keeps per request.
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
	 * Build loop attributes the same way the item-template block does.
	 *
	 * @param string $query_type - modern content source.
	 * @param int    $per_page - items per page.
	 * @param array  $query - `postsQuery` or `imagesQuery` overrides.
	 * @param string $block_id - loop block id.
	 *
	 * @return array
	 */
	private function get_atts( $query_type, $per_page, $query = array(), $block_id = 'loop-test' ) {
		$group = 'images' === $query_type ? 'imagesQuery' : 'postsQuery';

		$atts = Visual_Portfolio_Convert_Attributes::modern_to_legacy(
			array(
				'queryType' => $query_type,
				'baseQuery' => array( 'perPage' => $per_page ),
				$group      => $query,
			),
			true
		);

		$atts['block_id'] = $block_id;

		return $atts;
	}

	/**
	 * Build the image items the `images` content source expects.
	 *
	 * @param int    $count - number of images.
	 * @param string $category - category assigned to every image.
	 *
	 * @return array
	 */
	private function get_images( $count, $category = '' ) {
		$images = array();

		for ( $i = 0; $i < $count; $i++ ) {
			$images[] = array(
				'id'         => self::$attachment_id,
				'title'      => 'Image ' . ( $i + 1 ),
				'categories' => $category ? array( $category ) : array(),
			);
		}

		return $images;
	}

	/**
	 * Posts are sliced to the requested page.
	 *
	 * @return void
	 */
	public function test_posts_are_sliced_per_page() {
		$this->factory->post->create_many( 7 );

		$atts = $this->get_atts( 'posts', 3, array( 'source' => 'post' ) );

		$result = Visual_Portfolio_Get::get_loop_items( $atts );

		$this->assertCount( 3, $result['items'] );
		$this->assertSame( 3, $result['max_pages'] );
		$this->assertSame( 1, $result['start_page'] );

		$_GET['vp_page'] = '3';
		$this->reset_loop_state();

		$result = Visual_Portfolio_Get::get_loop_items( $atts );

		$this->assertCount( 1, $result['items'] );
		$this->assertSame( 3, $result['start_page'] );
	}

	/**
	 * Images are sliced to the requested page as well.
	 *
	 * A loop has no `pagination` option of its own, and without one the images
	 * branch used to slice from a negative offset.
	 *
	 * @return void
	 */
	public function test_images_are_sliced_per_page() {
		$atts = $this->get_atts( 'images', 2, array( 'images' => $this->get_images( 5 ) ) );

		$result = Visual_Portfolio_Get::get_loop_items( $atts );

		$this->assertCount( 2, $result['items'] );
		$this->assertSame( 'Image 1', $result['items'][0]['title'] );

		$_GET['vp_page'] = '2';
		$this->reset_loop_state();

		$result = Visual_Portfolio_Get::get_loop_items( $atts );

		$this->assertCount( 2, $result['items'] );
		$this->assertSame( 'Image 3', $result['items'][0]['title'] );
	}

	/**
	 * `vp_filter` narrows the items.
	 *
	 * @return void
	 */
	public function test_filter_narrows_items() {
		$images = array_merge( $this->get_images( 2, 'Cats' ), $this->get_images( 3, 'Dogs' ) );

		$atts = $this->get_atts( 'images', 10, array( 'images' => $images ) );

		$_GET['vp_filter'] = 'cats';

		$result = Visual_Portfolio_Get::get_loop_items( $atts );

		$this->assertCount( 2, $result['items'] );
	}

	/**
	 * `vp_sort` reorders the items.
	 *
	 * @return void
	 */
	public function test_sort_reorders_items() {
		$this->factory->post->create( array( 'post_title' => 'Alpha' ) );
		$this->factory->post->create( array( 'post_title' => 'Beta' ) );

		$atts = $this->get_atts( 'posts', 10, array( 'source' => 'post' ) );

		$_GET['vp_sort'] = 'title';

		$result = Visual_Portfolio_Get::get_loop_items( $atts );

		$titles = wp_list_pluck( $result['items'], 'title' );

		$this->assertSame( array( 'Alpha', 'Beta' ), $titles );
	}

	/**
	 * Every item gets an excerpt, without the legacy `show_excerpt` skin option.
	 *
	 * @return void
	 */
	public function test_excerpt_is_filled() {
		$this->factory->post->create(
			array(
				'post_title'   => 'Excerpt post',
				'post_content' => 'One two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen seventeen.',
				'post_excerpt' => '',
			)
		);

		$result = Visual_Portfolio_Get::get_loop_items( $this->get_atts( 'posts', 10, array( 'source' => 'post' ) ) );

		$excerpt = $result['items'][0]['excerpt'];

		$this->assertNotEmpty( $excerpt );
		$this->assertStringEndsWith( '...', $excerpt );
		$this->assertSame( 15, count( explode( ' ', str_replace( '...', '', trim( $excerpt ) ) ) ) );
	}

	/**
	 * A manual excerpt wins over the trimmed content.
	 *
	 * @return void
	 */
	public function test_manual_excerpt_is_used() {
		$this->factory->post->create(
			array(
				'post_content' => 'Full content that should not be used.',
				'post_excerpt' => 'Handwritten excerpt.',
			)
		);

		$result = Visual_Portfolio_Get::get_loop_items( $this->get_atts( 'posts', 10, array( 'source' => 'post' ) ) );

		$this->assertSame( 'Handwritten excerpt.', $result['items'][0]['excerpt'] );
	}

	/**
	 * Two loops with different attributes do not share a memoized result.
	 *
	 * @return void
	 */
	public function test_memoization_does_not_leak_between_queries() {
		$this->factory->post->create_many( 6 );

		$first  = Visual_Portfolio_Get::get_loop_items( $this->get_atts( 'posts', 2, array( 'source' => 'post' ), 'loop-a' ) );
		$second = Visual_Portfolio_Get::get_loop_items( $this->get_atts( 'posts', 4, array( 'source' => 'post' ), 'loop-b' ) );

		$this->assertCount( 2, $first['items'] );
		$this->assertCount( 4, $second['items'] );
	}

	/**
	 * The same attributes resolve the query once per request.
	 *
	 * @return void
	 */
	public function test_memoization_reuses_the_result() {
		$this->factory->post->create_many( 3 );

		$atts = $this->get_atts( 'posts', 3, array( 'source' => 'post' ) );

		$calls = 0;

		$counter = function ( $result, $options ) use ( &$calls ) {
			$calls++;

			return $result;
		};

		add_filter( 'vpf_loop_items', $counter, 10, 2 );

		Visual_Portfolio_Get::get_loop_items( $atts );
		Visual_Portfolio_Get::get_loop_items( $atts );

		remove_filter( 'vpf_loop_items', $counter, 10 );

		$this->assertSame( 1, $calls );
	}

	/**
	 * A filtered request does not reuse the unfiltered result.
	 *
	 * @return void
	 */
	public function test_memoization_keys_on_request_state() {
		$images = array_merge( $this->get_images( 2, 'Cats' ), $this->get_images( 3, 'Dogs' ) );

		$atts = $this->get_atts( 'images', 10, array( 'images' => $images ) );

		$this->assertCount( 5, Visual_Portfolio_Get::get_loop_items( $atts )['items'] );

		$_REQUEST['vp_filter'] = 'cats';
		$_GET['vp_filter']     = 'cats';

		$this->assertCount( 2, Visual_Portfolio_Get::get_loop_items( $atts )['items'] );
	}

	/**
	 * Avoid duplicates skips posts an earlier loop already used.
	 *
	 * @return void
	 */
	public function test_avoid_duplicates_between_loops() {
		$this->factory->post->create_many( 6 );

		$query = array(
			'source' => 'post',
			'avoidDuplicates' => true,
		);

		$first  = Visual_Portfolio_Get::get_loop_items( $this->get_atts( 'posts', 3, $query, 'loop-a' ) );
		$second = Visual_Portfolio_Get::get_loop_items( $this->get_atts( 'posts', 3, $query, 'loop-b' ) );

		$first_ids  = wp_list_pluck( $first['items'], 'post_id' );
		$second_ids = wp_list_pluck( $second['items'], 'post_id' );

		$this->assertCount( 3, $first_ids );
		$this->assertCount( 3, $second_ids );
		$this->assertEmpty( array_intersect( $first_ids, $second_ids ) );
	}

	/**
	 * A random order stays stable while the seed does.
	 *
	 * @return void
	 */
	public function test_random_order_is_stable_for_a_seed() {
		$this->factory->post->create_many( 8 );

		$atts = $this->get_atts(
			'posts',
			8,
			array(
				'source' => 'post',
				'orderBy' => 'rand',
			)
		);

		$_REQUEST['vpf_random_seed'] = '12345';

		$first = wp_list_pluck( Visual_Portfolio_Get::get_loop_items( $atts )['items'], 'post_id' );

		$this->reset_loop_state();

		$second = wp_list_pluck( Visual_Portfolio_Get::get_loop_items( $atts )['items'], 'post_id' );

		unset( $_REQUEST['vpf_random_seed'] );

		$this->assertSame( $first, $second );
		$this->assertSame( '12345', (string) Visual_Portfolio_Get::get_random_seed() );
	}

	/**
	 * An empty source returns an empty item list rather than a failure.
	 *
	 * @return void
	 */
	public function test_empty_result() {
		$result = Visual_Portfolio_Get::get_loop_items( $this->get_atts( 'images', 6, array( 'images' => array() ) ) );

		$this->assertIsArray( $result );
		$this->assertSame( array(), $result['items'] );
	}

	/**
	 * Attributes without an id resolve to nothing.
	 *
	 * @return void
	 */
	public function test_missing_id_returns_false() {
		$this->assertFalse( Visual_Portfolio_Get::get_loop_items( array() ) );
	}

	/**
	 * `vpf_loop_items` can post-process the whole result.
	 *
	 * @return void
	 */
	public function test_loop_items_filter() {
		$this->factory->post->create_many( 3 );

		$truncate = function ( $result ) {
			$result['items'] = array_slice( $result['items'], 0, 1 );

			return $result;
		};

		add_filter( 'vpf_loop_items', $truncate );

		$result = Visual_Portfolio_Get::get_loop_items( $this->get_atts( 'posts', 3, array( 'source' => 'post' ) ) );

		remove_filter( 'vpf_loop_items', $truncate );

		$this->assertCount( 1, $result['items'] );
	}

	/**
	 * The before/after actions fire around the items resolution.
	 *
	 * @return void
	 */
	public function test_before_and_after_actions_fire() {
		$fired = array();

		$before = function () use ( &$fired ) {
			$fired[] = 'before';
		};
		$after  = function () use ( &$fired ) {
			$fired[] = 'after';
		};

		add_action( 'vpf_before_loop_items', $before );
		add_action( 'vpf_after_loop_items', $after );

		Visual_Portfolio_Get::get_loop_items( $this->get_atts( 'images', 6, array( 'images' => $this->get_images( 2 ) ) ) );

		remove_action( 'vpf_before_loop_items', $before );
		remove_action( 'vpf_after_loop_items', $after );

		$this->assertSame( array( 'before', 'after' ), $fired );
	}

	/**
	 * Items carry the categories with URLs that point back into the filter.
	 *
	 * @return void
	 */
	public function test_image_categories_carry_filter_urls() {
		$atts = $this->get_atts( 'images', 6, array( 'images' => $this->get_images( 1, 'Cats' ) ) );

		$result = Visual_Portfolio_Get::get_loop_items( $atts );

		$categories = $result['items'][0]['categories'];

		$this->assertCount( 1, $categories );
		$this->assertSame( 'Cats', $categories[0]['label'] );
		$this->assertSame( 'cats', $categories[0]['slug'] );
		$this->assertStringContainsString( 'vp_filter=cats', $categories[0]['url'] );
	}
}
