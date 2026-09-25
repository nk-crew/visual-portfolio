<?php
/**
 * Tests that the posts query options of a loop change what it renders.
 *
 * Rendered through `do_blocks()`, so each option goes the whole way: from the
 * loop attribute, through the conversion to the legacy option, into the query.
 *
 * @package Visual Portfolio
 */

/**
 * Posts query options test case.
 */
class ClassLoopPostsQueryOptions extends WP_UnitTestCase {
	use Visual_Portfolio_Loop_Blocks_Trait;

	/**
	 * Post ids by title, oldest first.
	 *
	 * @var array
	 */
	private static $posts = array();

	/**
	 * Category ids by name.
	 *
	 * @var array
	 */
	private static $terms = array();

	/**
	 * Four posts a day apart: one in Red, one in Blue, one in both and one in
	 * neither.
	 *
	 * @return void
	 */
	public static function wpSetUpBeforeClass() {
		self::$terms = array(
			'Red'  => self::factory()->category->create( array( 'name' => 'Red' ) ),
			'Blue' => self::factory()->category->create( array( 'name' => 'Blue' ) ),
		);

		$posts = array(
			'Query Red'    => array( self::$terms['Red'] ),
			'Query Blue'   => array( self::$terms['Blue'] ),
			'Query Purple' => array( self::$terms['Red'], self::$terms['Blue'] ),
			'Query Plain'  => array(),
		);
		$day   = 1;

		foreach ( $posts as $title => $categories ) {
			self::$posts[ $title ] = self::factory()->post->create(
				array(
					'post_title'    => $title,
					'post_date'     => sprintf( '2026-01-0%d 10:00:00', $day++ ),
					'post_category' => $categories,
				)
			);
		}
	}

	/**
	 * Skip where the family is not registered.
	 *
	 * @return void
	 */
	public function set_up() {
		parent::set_up();

		$this->skip_without_loop_blocks();
	}

	/**
	 * Forget what the pipeline memoized, as a new request would.
	 *
	 * @return void
	 */
	public function tear_down() {
		foreach ( array( 'loop_items_cache' => array(), 'used_posts' => array(), 'check_main_query' => true ) as $name => $value ) {
			$property = new ReflectionProperty( 'Visual_Portfolio_Get', $name );

			if ( method_exists( $property, 'setAccessible' ) ) {
				$property->setAccessible( true );
			}

			$property->setValue( null, $value );
		}

		parent::tear_down();
	}

	/**
	 * Titles a loop of posts renders, in order.
	 *
	 * @param array $posts_query - `postsQuery` beside the source.
	 *
	 * @return string[]
	 */
	private function render_titles( $posts_query ) {
		$loop = array(
			'block_id'   => 'query-test',
			'queryId'    => 1,
			'queryType'  => 'posts',
			'baseQuery'  => array( 'perPage' => 10 ),
			'postsQuery' => array_merge( array( 'source' => 'post' ), $posts_query ),
		);

		$html = do_blocks(
			sprintf(
				'<!-- wp:visual-portfolio/loop %s --><div class="wp-block-visual-portfolio-loop vp-block-loop"><!-- wp:visual-portfolio/item-template --><!-- wp:visual-portfolio/item-title /--><!-- /wp:visual-portfolio/item-template --></div><!-- /wp:visual-portfolio/loop -->',
				wp_json_encode( $loop )
			)
		);

		preg_match_all( '/Query (?:Red|Blue|Purple|Plain)/', $html, $matches );

		return $matches[0];
	}

	/**
	 * Newest first is the default the other cases are read against.
	 *
	 * @return void
	 */
	public function test_newest_first_by_default() {
		$this->assertSame( array( 'Query Plain', 'Query Purple', 'Query Blue', 'Query Red' ), $this->render_titles( array() ) );
	}

	/**
	 * Two terms joined by OR keep a post in either of them.
	 *
	 * @return void
	 */
	public function test_taxonomies_joined_by_or() {
		$titles = $this->render_titles(
			array(
				'taxonomies'         => array( self::$terms['Red'], self::$terms['Blue'] ),
				'taxonomiesRelation' => 'or',
			)
		);

		$this->assertSame( array( 'Query Purple', 'Query Blue', 'Query Red' ), $titles );
	}

	/**
	 * Two terms joined by AND keep only a post in both.
	 *
	 * @return void
	 */
	public function test_taxonomies_joined_by_and() {
		$titles = $this->render_titles(
			array(
				'taxonomies'         => array( self::$terms['Red'], self::$terms['Blue'] ),
				'taxonomiesRelation' => 'and',
			)
		);

		$this->assertSame( array( 'Query Purple' ), $titles );
	}

	/**
	 * Excluded posts are left out.
	 *
	 * @return void
	 */
	public function test_exclude_ids() {
		$titles = $this->render_titles( array( 'excludeIds' => array( self::$posts['Query Blue'], self::$posts['Query Plain'] ) ) );

		$this->assertSame( array( 'Query Purple', 'Query Red' ), $titles );
	}

	/**
	 * Ascending order puts the oldest first.
	 *
	 * @return void
	 */
	public function test_order_asc() {
		$titles = $this->render_titles(
			array(
				'orderBy' => 'post_date',
				'order'   => 'asc',
			)
		);

		$this->assertSame( array( 'Query Red', 'Query Blue', 'Query Purple', 'Query Plain' ), $titles );
	}

	/**
	 * An offset skips that many of the newest posts.
	 *
	 * @return void
	 */
	public function test_offset() {
		$this->assertSame( array( 'Query Blue', 'Query Red' ), $this->render_titles( array( 'offset' => 2 ) ) );
	}
}
