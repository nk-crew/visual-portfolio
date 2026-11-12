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
	 * @param int   $per_page - items per page.
	 *
	 * @return string[]
	 */
	private function render_titles( $posts_query, $per_page = 10 ) {
		$loop = array(
			'block_id'   => 'query-test',
			'queryId'    => 1,
			'queryType'  => 'posts',
			'baseQuery'  => array( 'perPage' => $per_page ),
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
	 * An excluded post stays out of the sticky posts, and a list the exclusions
	 * empty finds nothing rather than every post.
	 *
	 * @return void
	 */
	public function test_sticky_only_keeps_its_exclusions() {
		stick_post( self::$posts['Query Red'] );
		stick_post( self::$posts['Query Blue'] );

		$this->assertSame(
			array( 'Query Blue' ),
			$this->render_titles(
				array(
					'sticky'     => 'only',
					'excludeIds' => array( self::$posts['Query Red'] ),
				)
			)
		);
		$this->assertSame(
			array(),
			$this->render_titles(
				array(
					'sticky'     => 'only',
					'excludeIds' => array( self::$posts['Query Red'], self::$posts['Query Blue'] ),
				)
			)
		);
	}

	/**
	 * Formats narrow only post types that have them.
	 *
	 * @return void
	 */
	public function test_formats_leave_a_set_without_them_alone() {
		$this->assertSame(
			array( 'Query Red' ),
			$this->render_titles(
				array(
					'source'       => 'post_types_set',
					'postTypesSet' => array( 'post', 'page' ),
					'formats'      => array( 'image' ),
				)
			)
		);

		// A post type that lost its formats keeps the saved choice harmless.
		remove_post_type_support( 'post', 'post-formats' );

		$titles = $this->render_titles( array( 'formats' => array( 'image' ) ) );

		add_post_type_support( 'post', 'post-formats' );

		$this->assertSame( array( 'Query Plain', 'Query Purple', 'Query Blue', 'Query Red' ), $titles );
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
	 * Titles a query lists, in order.
	 *
	 * @param array $args - `WP_Query` arguments.
	 *
	 * @return string[]
	 */
	private function query_titles( $args ) {
		return wp_list_pluck( ( new WP_Query( $args ) )->posts, 'post_title' );
	}

	/**
	 * WordPress pins sticky posts on the first page of a query for several
	 * post types the way it does for posts alone, and not on a later page or
	 * when told to ignore them. The set relies on this to match the Posts
	 * source with the same arguments.
	 *
	 * @return void
	 */
	public function test_wordpress_pins_sticky_posts_for_several_post_types() {
		stick_post( self::$posts['Query Red'] );

		foreach ( array( 'post', array( 'post', 'page' ) ) as $post_type ) {
			$args = array(
				'post_type'      => $post_type,
				'posts_per_page' => 2,
			);

			$this->assertSame( array( 'Query Red', 'Query Plain', 'Query Purple' ), $this->query_titles( $args ) );
			$this->assertSame( array( 'Query Blue', 'Query Red' ), $this->query_titles( array_merge( $args, array( 'paged' => 2 ) ) ) );
			$this->assertSame( array( 'Query Plain', 'Query Purple' ), $this->query_titles( array_merge( $args, array( 'ignore_sticky_posts' => true ) ) ) );
		}
	}

	/**
	 * Each sticky choice and what a loop of posts renders with it.
	 *
	 * @return array
	 */
	public function sticky_choices() {
		return array(
			'include' => array( '', array( 'Query Red', 'Query Plain', 'Query Purple', 'Query Blue' ) ),
			'ignore'  => array( 'ignore', array( 'Query Plain', 'Query Purple', 'Query Blue', 'Query Red' ) ),
			'exclude' => array( 'exclude', array( 'Query Plain', 'Query Purple', 'Query Blue' ) ),
			'only'    => array( 'only', array( 'Query Red' ) ),
		);
	}

	/**
	 * A post types set that includes posts renders each sticky choice the way
	 * the Posts source does.
	 *
	 * @dataProvider sticky_choices
	 *
	 * @param string   $sticky - `postsQuery.sticky`.
	 * @param string[] $expected - titles the Posts source renders.
	 *
	 * @return void
	 */
	public function test_sticky_choice_of_a_set_with_posts( $sticky, $expected ) {
		stick_post( self::$posts['Query Red'] );

		$set = array(
			'source'       => 'post_types_set',
			'postTypesSet' => array( 'post', 'page' ),
			'sticky'       => $sticky,
		);

		$this->assertSame( $expected, $this->render_titles( array( 'sticky' => $sticky ) ) );
		$this->assertSame( $expected, $this->render_titles( $set ) );
	}

	/**
	 * On a later page a set lists by date, as the Posts source does, and
	 * Include is the only choice that pins on the first.
	 *
	 * @return void
	 */
	public function test_sticky_posts_of_a_set_across_pages() {
		stick_post( self::$posts['Query Red'] );

		$set = array(
			'source'       => 'post_types_set',
			'postTypesSet' => array( 'post', 'page' ),
		);

		$pages = array();

		foreach ( array( 1, 2 ) as $page ) {
			$_GET['vp-1-page'] = $page;

			foreach ( array( '', 'ignore' ) as $sticky ) {
				$pages[ $page ][ $sticky ] = array(
					'post' => $this->render_titles( array( 'sticky' => $sticky ), 2 ),
					'set'  => $this->render_titles( array_merge( $set, array( 'sticky' => $sticky ) ), 2 ),
				);
			}
		}

		unset( $_GET['vp-1-page'] );

		$this->assertSame( array( 'Query Red', 'Query Plain', 'Query Purple' ), $pages[1]['']['set'] );
		$this->assertSame( array( 'Query Plain', 'Query Purple' ), $pages[1]['ignore']['set'] );
		$this->assertSame( array( 'Query Blue', 'Query Red' ), $pages[2]['']['set'] );
		$this->assertSame( array( 'Query Blue', 'Query Red' ), $pages[2]['ignore']['set'] );

		foreach ( $pages as $page => $choices ) {
			foreach ( $choices as $sticky => $titles ) {
				$this->assertSame( $titles['post'], $titles['set'], "Page $page, sticky '$sticky'" );
			}
		}
	}

	/**
	 * The query arguments a sticky choice adds, for a set with posts and for
	 * one without.
	 *
	 * @return void
	 */
	public function test_sticky_query_args_follow_whether_a_set_has_posts() {
		stick_post( self::$posts['Query Red'] );

		$args = function ( $set, $sticky ) {
			return Visual_Portfolio_Get::get_query_params(
				Visual_Portfolio_Get::get_options(
					array(
						'block_id'       => 'sticky-args',
						'content_source' => 'post-based',
						'posts_source'   => 'post_types_set',
						'post_types_set' => $set,
						'posts_sticky'   => $sticky,
					)
				)
			);
		};
		$red  = array( self::$posts['Query Red'] );

		$include = $args( array( 'post', 'page' ), '' );
		$this->assertArrayNotHasKey( 'ignore_sticky_posts', $include );
		$this->assertArrayNotHasKey( 'post__in', $include );

		$this->assertTrue( $args( array( 'post', 'page' ), 'ignore' )['ignore_sticky_posts'] );
		$this->assertSame( $red, array_values( $args( array( 'post', 'page' ), 'exclude' )['post__not_in'] ) );

		$only = $args( array( 'post', 'page' ), 'only' );
		$this->assertSame( $red, $only['post__in'] );
		$this->assertTrue( $only['ignore_sticky_posts'] );

		foreach ( array( 'ignore', 'exclude', 'only' ) as $sticky ) {
			$without = $args( array( 'page' ), $sticky );

			$this->assertArrayNotHasKey( 'ignore_sticky_posts', $without, $sticky );
			$this->assertArrayNotHasKey( 'post__in', $without, $sticky );
			$this->assertNotContains( self::$posts['Query Red'], (array) ( $without['post__not_in'] ?? array() ), $sticky );
		}
	}
}
