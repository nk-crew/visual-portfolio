<?php
/**
 * Tests for the two post exclusions of a loop query.
 *
 * @package Visual Portfolio
 */

/**
 * "Avoid duplicates" and "Exclude the current post" test case.
 *
 * The two overlap on a single post, where the page's own list is that post.
 * They are meant to be chosen independently, so each combination is pinned here.
 */
class ClassGetPortfolioExclusions extends WP_UnitTestCase {
	/**
	 * The post the gallery sits on.
	 *
	 * @var int
	 */
	private static $current_post = 0;

	/**
	 * Another post, so a query has something left to return.
	 *
	 * @var int
	 */
	private static $other_post = 0;

	/**
	 * Create the two posts shared by every test.
	 *
	 * @param WP_UnitTest_Factory $factory - test factory.
	 *
	 * @return void
	 */
	public static function wpSetUpBeforeClass( $factory ) {
		self::$other_post   = $factory->post->create( array( 'post_title' => 'Other post' ) );
		self::$current_post = $factory->post->create( array( 'post_title' => 'Current post' ) );
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
	 * `check_main_query` is a one-shot latch: without resetting it, the second
	 * test in a run would never look at the main query at all.
	 *
	 * @return void
	 */
	private function reset_loop_state() {
		foreach ( array( 'loop_items_cache' => array(), 'used_posts' => array(), 'check_main_query' => true ) as $name => $value ) {
			$property = new ReflectionProperty( 'Visual_Portfolio_Get', $name );

			if ( method_exists( $property, 'setAccessible' ) ) {
				$property->setAccessible( true );
			}

			$property->setValue( null, $value );
		}
	}

	/**
	 * Build loop attributes the way the loop block does.
	 *
	 * @param array $query - `postsQuery` overrides.
	 *
	 * @return array
	 */
	private function get_atts( $query ) {
		$atts = Visual_Portfolio_Convert_Attributes::modern_to_legacy(
			array(
				'queryType'  => 'posts',
				'baseQuery'  => array( 'perPage' => 10 ),
				'postsQuery' => array_merge( array( 'source' => 'post' ), $query ),
			),
			true
		);

		$atts['block_id'] = 'exclusions-test';

		return $atts;
	}

	/**
	 * Ids of the posts a loop with the given query returns.
	 *
	 * @param array $query - `postsQuery` overrides.
	 *
	 * @return array
	 */
	private function get_ids( $query ) {
		$this->reset_loop_state();

		$result = Visual_Portfolio_Get::get_loop_items( $this->get_atts( $query ) );

		return wp_list_pluck( $result['items'], 'post_id' );
	}

	/**
	 * On a single post, avoiding duplicates alone leaves that post in.
	 *
	 * The page's own list is the post being viewed, and hiding it is what the
	 * other switch is for.
	 *
	 * @return void
	 */
	public function test_avoid_duplicates_keeps_the_current_post() {
		$this->go_to( get_permalink( self::$current_post ) );

		$ids = $this->get_ids(
			array(
				'avoidDuplicates' => true,
				'excludeCurrent'  => false,
			)
		);

		$this->assertContains( self::$current_post, $ids, 'Avoiding duplicates should not hide the post being viewed.' );
	}

	/**
	 * The dedicated switch hides it, with duplicates avoided.
	 *
	 * @return void
	 */
	public function test_both_options_exclude_the_current_post() {
		$this->go_to( get_permalink( self::$current_post ) );

		$ids = $this->get_ids(
			array(
				'avoidDuplicates' => true,
				'excludeCurrent'  => true,
			)
		);

		$this->assertNotContains( self::$current_post, $ids );
		$this->assertContains( self::$other_post, $ids );
	}

	/**
	 * The dedicated switch hides it on its own too.
	 *
	 * @return void
	 */
	public function test_exclude_current_alone_excludes_the_current_post() {
		$this->go_to( get_permalink( self::$current_post ) );

		$ids = $this->get_ids(
			array(
				'avoidDuplicates' => false,
				'excludeCurrent'  => true,
			)
		);

		$this->assertNotContains( self::$current_post, $ids );
		$this->assertContains( self::$other_post, $ids );
	}

	/**
	 * Neither option leaves the query alone.
	 *
	 * @return void
	 */
	public function test_neither_option_excludes_anything() {
		$this->go_to( get_permalink( self::$current_post ) );

		$ids = $this->get_ids(
			array(
				'avoidDuplicates' => false,
				'excludeCurrent'  => false,
			)
		);

		$this->assertContains( self::$current_post, $ids );
		$this->assertContains( self::$other_post, $ids );
	}

	/**
	 * On an archive the page's own list still counts as shown.
	 *
	 * Nothing there is "the current post", so avoiding duplicates keeps the
	 * job it has always done.
	 *
	 * @return void
	 */
	public function test_avoid_duplicates_still_skips_the_archive_list() {
		$this->go_to( home_url( '/' ) );

		$ids = $this->get_ids(
			array(
				'avoidDuplicates' => true,
				'excludeCurrent'  => false,
			)
		);

		$this->assertNotContains( self::$current_post, $ids, 'A post listed by the page itself is a duplicate.' );
		$this->assertNotContains( self::$other_post, $ids );
	}

	/**
	 * A gallery without the switch keeps the behaviour it always had.
	 *
	 * The legacy block has no "Exclude the current post" option, so avoiding
	 * duplicates has to go on hiding the post being viewed for it.
	 *
	 * @return void
	 */
	public function test_options_without_the_switch_keep_hiding_the_current_post() {
		$this->go_to( get_permalink( self::$current_post ) );
		$this->reset_loop_state();

		$atts = $this->get_atts( array( 'avoidDuplicates' => true ) );

		unset( $atts['posts_exclude_current'] );

		$result = Visual_Portfolio_Get::get_loop_items( $atts );
		$ids    = wp_list_pluck( $result['items'], 'post_id' );

		$this->assertNotContains( self::$current_post, $ids );
	}
}
