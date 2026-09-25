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
	 * Author of Query Blue and Query Purple.
	 *
	 * @var int
	 */
	private static $author = 0;

	/**
	 * Four posts a day apart: one in Red, one in Blue, one in both and one in
	 * neither. Blue and Purple have their own author, Red is an image and Blue
	 * a video, the other two are standard.
	 *
	 * @return void
	 */
	public static function wpSetUpBeforeClass() {
		self::$author = self::factory()->user->create( array( 'role' => 'author' ) );

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
					'post_author'   => in_array( $title, array( 'Query Blue', 'Query Purple' ), true ) ? self::$author : 1,
				)
			);
		}

		set_post_format( self::$posts['Query Red'], 'image' );
		set_post_format( self::$posts['Query Blue'], 'video' );
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

	/**
	 * Authors keep only the posts they wrote.
	 *
	 * @return void
	 */
	public function test_authors() {
		$this->assertSame( array( 'Query Purple', 'Query Blue' ), $this->render_titles( array( 'authors' => array( self::$author ) ) ) );
	}

	/**
	 * Authors narrow the current query too.
	 *
	 * @return void
	 */
	public function test_authors_narrow_the_current_query() {
		$this->go_to( get_category_link( self::$terms['Red'] ) );

		$titles = $this->render_titles(
			array(
				'source'  => 'current_query',
				'authors' => array( self::$author ),
			)
		);

		$this->assertSame( array( 'Query Purple' ), $titles );
	}

	/**
	 * Authors narrow a manual selection too, as the Pro setting did for a
	 * classic gallery before the setting came to the free plugin.
	 *
	 * @return void
	 */
	public function test_authors_narrow_a_manual_selection() {
		$titles = $this->render_titles(
			array(
				'source'  => 'ids',
				'ids'     => array_values( self::$posts ),
				'authors' => array( self::$author ),
			)
		);

		sort( $titles );

		$this->assertSame( array( 'Query Blue', 'Query Purple' ), $titles );
	}

	/**
	 * Standard is the absence of a format, and formats join by OR.
	 *
	 * @return void
	 */
	public function test_formats() {
		$this->assertSame( array( 'Query Plain', 'Query Purple', 'Query Red' ), $this->render_titles( array( 'formats' => array( 'standard', 'image' ) ) ) );
	}

	/**
	 * Formats and taxonomies both have to match.
	 *
	 * @return void
	 */
	public function test_formats_and_taxonomies() {
		$titles = $this->render_titles(
			array(
				'taxonomies' => array( self::$terms['Blue'] ),
				'formats'    => array( 'standard' ),
			)
		);

		$this->assertSame( array( 'Query Purple' ), $titles );
	}

	/**
	 * An excluded term leaves out every post in it.
	 *
	 * @return void
	 */
	public function test_excluded_terms() {
		$this->assertSame( array( 'Query Plain', 'Query Blue' ), $this->render_titles( array( 'excludeTaxonomies' => array( self::$terms['Red'] ) ) ) );
	}

	/**
	 * An excluded term wins over an included one.
	 *
	 * @return void
	 */
	public function test_excluded_terms_and_taxonomies() {
		$titles = $this->render_titles(
			array(
				'taxonomies'        => array( self::$terms['Blue'] ),
				'excludeTaxonomies' => array( self::$terms['Red'] ),
			)
		);

		$this->assertSame( array( 'Query Blue' ), $titles );
	}

	/**
	 * Include, the default, puts a sticky post first on the first page.
	 *
	 * @return void
	 */
	public function test_sticky_include() {
		stick_post( self::$posts['Query Red'] );

		$this->assertSame( array( 'Query Red', 'Query Plain', 'Query Purple', 'Query Blue' ), $this->render_titles( array( 'sticky' => '' ) ) );
	}

	/**
	 * Ignore keeps a sticky post where its date puts it.
	 *
	 * @return void
	 */
	public function test_sticky_ignore() {
		stick_post( self::$posts['Query Red'] );

		$this->assertSame( array( 'Query Plain', 'Query Purple', 'Query Blue', 'Query Red' ), $this->render_titles( array( 'sticky' => 'ignore' ) ) );
	}

	/**
	 * Exclude leaves the sticky posts out.
	 *
	 * @return void
	 */
	public function test_sticky_exclude() {
		stick_post( self::$posts['Query Red'] );

		$this->assertSame( array( 'Query Plain', 'Query Purple', 'Query Blue' ), $this->render_titles( array( 'sticky' => 'exclude' ) ) );
	}

	/**
	 * Only keeps the sticky posts alone.
	 *
	 * @return void
	 */
	public function test_sticky_only() {
		stick_post( self::$posts['Query Red'] );

		$this->assertSame( array( 'Query Red' ), $this->render_titles( array( 'sticky' => 'only' ) ) );
	}

	/**
	 * Only with nothing pinned finds nothing, rather than every post.
	 *
	 * @return void
	 */
	public function test_sticky_only_without_sticky_posts() {
		$this->assertSame( array(), $this->render_titles( array( 'sticky' => 'only' ) ) );
	}

	/**
	 * Only posts can be sticky, so another source ignores the choice.
	 *
	 * @return void
	 */
	public function test_sticky_is_for_the_posts_source_alone() {
		stick_post( self::$posts['Query Red'] );

		$titles = $this->render_titles(
			array(
				'source'       => 'post_types_set',
				'postTypesSet' => array( 'post' ),
				'sticky'       => 'exclude',
			)
		);

		$this->assertContains( 'Query Red', $titles );
	}
}
