<?php
/**
 * Tests for the query options a loop adds to a posts source.
 *
 * @package Visual Portfolio
 */

/**
 * Authors, keyword and the page ceiling.
 *
 * None of these is a legacy control, so they only reach the query through the
 * loop-only list in `Visual_Portfolio_Security`. Without it they are dropped
 * silently and the gallery looks unfiltered.
 */
class ClassGetPortfolioQueryFilters extends WP_UnitTestCase {
	/**
	 * Author of the posts that should be found.
	 *
	 * @var int
	 */
	private static $author = 0;

	/**
	 * Author of the posts that should not.
	 *
	 * @var int
	 */
	private static $other_author = 0;

	/**
	 * Create the authors and their posts.
	 *
	 * @param WP_UnitTest_Factory $factory - test factory.
	 *
	 * @return void
	 */
	public static function wpSetUpBeforeClass( $factory ) {
		self::$author       = $factory->user->create( array( 'role' => 'author' ) );
		self::$other_author = $factory->user->create( array( 'role' => 'author' ) );

		$factory->post->create_many(
			3,
			array(
				'post_author' => self::$author,
				'post_title'  => 'Seaside gallery',
			)
		);

		$factory->post->create_many(
			4,
			array(
				'post_author' => self::$other_author,
				'post_title'  => 'Mountain gallery',
			)
		);
	}

	/**
	 * Clean up the per-request state the pipeline keeps.
	 *
	 * @return void
	 */
	public function tear_down() {
		$this->reset_loop_state();

		parent::tear_down();
	}

	/**
	 * Reset the statics that survive a single request.
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
	 * Resolve a loop with the given query.
	 *
	 * @param array $query - `postsQuery` overrides.
	 * @param int   $per_page - items per page.
	 *
	 * @return array
	 */
	private function get_result( $query, $per_page = 10 ) {
		$this->reset_loop_state();

		$atts = Visual_Portfolio_Convert_Attributes::modern_to_legacy(
			array(
				'queryType'  => 'posts',
				'baseQuery'  => array_merge( array( 'perPage' => $per_page ), $query['baseQuery'] ?? array() ),
				'postsQuery' => array_merge( array( 'source' => 'post' ), $query['postsQuery'] ?? array() ),
			),
			true
		);

		$atts['block_id'] = 'query-filters-test';

		return Visual_Portfolio_Get::get_loop_items( $atts );
	}

	/**
	 * A list of authors keeps only their posts.
	 *
	 * @return void
	 */
	public function test_authors_narrow_the_query() {
		$result = $this->get_result( array( 'postsQuery' => array( 'authors' => array( self::$author ) ) ) );

		$this->assertCount( 3, $result['items'] );

		foreach ( $result['items'] as $item ) {
			$this->assertSame( self::$author, (int) get_post_field( 'post_author', $item['post_id'] ) );
		}
	}

	/**
	 * An author id arriving as a string still narrows the query.
	 *
	 * The editor stores tokens, and a token is a string.
	 *
	 * @return void
	 */
	public function test_authors_accept_string_ids() {
		$result = $this->get_result( array( 'postsQuery' => array( 'authors' => array( (string) self::$author ) ) ) );

		$this->assertCount( 3, $result['items'] );
	}

	/**
	 * A keyword keeps only the posts whose text carries it.
	 *
	 * @return void
	 */
	public function test_keyword_narrows_the_query() {
		$result = $this->get_result( array( 'postsQuery' => array( 'keyword' => 'Seaside' ) ) );

		$this->assertCount( 3, $result['items'] );

		foreach ( $result['items'] as $item ) {
			$this->assertStringContainsString( 'Seaside', get_the_title( $item['post_id'] ) );
		}
	}

	/**
	 * No keyword leaves the query alone.
	 *
	 * @return void
	 */
	public function test_empty_keyword_changes_nothing() {
		$result = $this->get_result( array( 'postsQuery' => array( 'keyword' => '' ) ) );

		$this->assertCount( 7, $result['items'] );
	}

	/**
	 * The ceiling caps the pages a gallery reports.
	 *
	 * @return void
	 */
	public function test_max_pages_caps_the_page_count() {
		$without = $this->get_result( array(), 2 );

		$this->assertSame( 4, $without['max_pages'] );

		$with = $this->get_result( array( 'baseQuery' => array( 'maxPagesLimit' => 2 ) ), 2 );

		$this->assertSame( 2, $with['max_pages'] );
	}

	/**
	 * A ceiling above the real count does not raise it.
	 *
	 * @return void
	 */
	public function test_max_pages_never_adds_pages() {
		$result = $this->get_result( array( 'baseQuery' => array( 'maxPagesLimit' => 9 ) ), 2 );

		$this->assertSame( 4, $result['max_pages'] );
	}

	/**
	 * Zero means no ceiling, the way the core Query block reads it.
	 *
	 * @return void
	 */
	public function test_zero_max_pages_lifts_the_ceiling() {
		$result = $this->get_result( array( 'baseQuery' => array( 'maxPagesLimit' => 0 ) ), 2 );

		$this->assertSame( 4, $result['max_pages'] );
	}
}
