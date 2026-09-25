<?php
/**
 * Tests for the Query Total block: the count of the loop's own query, with the
 * filter and the page the visitor is on.
 *
 * @package Visual Portfolio
 */

/**
 * Query Total test case.
 */
class ClassLoopQueryTotal extends WP_UnitTestCase {
	use Visual_Portfolio_Loop_Blocks_Trait;

	/**
	 * Term ids of the two categories.
	 *
	 * @var array
	 */
	private $terms = array();

	/**
	 * Five posts, three in `red` and two in `blue`.
	 *
	 * @return void
	 */
	public function set_up() {
		parent::set_up();

		$this->skip_without_loop_blocks();

		foreach ( array( 'red' => 3, 'blue' => 2 ) as $slug => $count ) {
			$term = self::factory()->category->create( array( 'slug' => $slug ) );

			$this->terms[] = $term;

			for ( $i = 0; $i < $count; $i++ ) {
				self::factory()->post->create( array( 'post_category' => array( $term ) ) );
			}
		}
	}

	/**
	 * Forget the request and the memoized items of the previous render.
	 *
	 * @return void
	 */
	public function tear_down() {
		unset( $_GET['vp-1-page'], $_GET['vp-1-filter'] );

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
	 * Render a loop of the five posts, two to a page, with the given blocks
	 * after its item template.
	 *
	 * @param string $siblings - serialized blocks after the item template.
	 *
	 * @return string
	 */
	private function render_loop( $siblings ) {
		$loop = array(
			'block_id'   => 'total-test',
			'queryId'    => 1,
			'queryType'  => 'posts',
			'baseQuery'  => array( 'perPage' => 2 ),
			'postsQuery' => array(
				'source'     => 'post',
				'taxonomies' => $this->terms,
			),
		);

		return do_blocks(
			sprintf(
				'<!-- wp:visual-portfolio/loop %1$s --><div class="wp-block-visual-portfolio-loop vp-block-loop"><!-- wp:visual-portfolio/item-template --><!-- wp:visual-portfolio/item-title /--><!-- /wp:visual-portfolio/item-template -->%2$s</div><!-- /wp:visual-portfolio/loop -->',
				wp_json_encode( $loop ),
				$siblings
			)
		);
	}

	/**
	 * The total counts what the active filter leaves, not the whole gallery.
	 *
	 * @return void
	 */
	public function test_the_total_follows_the_filter() {
		$block = '<!-- wp:visual-portfolio/loop-query-total /-->';

		$this->assertStringContainsString( '>5 items</div>', $this->render_loop( $block ) );

		$this->tear_down_request();

		$_GET['vp-1-filter'] = 'category:red';

		$this->assertStringContainsString( '>3 items</div>', $this->render_loop( $block ) );
	}

	/**
	 * The range names the items of the page on screen.
	 *
	 * @return void
	 */
	public function test_the_range_follows_the_page() {
		$block = '<!-- wp:visual-portfolio/loop-query-total {"displayType":"range-display"} /-->';

		$_GET['vp-1-page'] = '2';

		$this->assertStringContainsString( '>Displaying 3 – 4 of 5</div>', $this->render_loop( $block ) );

		$this->tear_down_request();

		// The last page of the filtered gallery holds one item.
		$_GET['vp-1-page']   = '2';
		$_GET['vp-1-filter'] = 'category:red';

		$this->assertStringContainsString( '>Displaying 3 of 3</div>', $this->render_loop( $block ) );
	}

	/**
	 * The count comes from the query the items already ran.
	 *
	 * @return void
	 */
	public function test_the_total_runs_no_query_of_its_own() {
		$queries = 0;
		$count   = function () use ( &$queries ) {
			++$queries;
		};

		add_action( 'pre_get_posts', $count );

		$this->render_loop( '' );
		$without = $queries;

		$this->tear_down_request();
		$queries = 0;

		$output = $this->render_loop( '<!-- wp:visual-portfolio/loop-query-total /-->' );

		remove_action( 'pre_get_posts', $count );

		$this->assertStringContainsString( '>5 items</div>', $output );
		$this->assertSame( $without, $queries );
	}

	/**
	 * Start the next render as a new request would.
	 *
	 * @return void
	 */
	private function tear_down_request() {
		unset( $_GET['vp-1-page'], $_GET['vp-1-filter'] );

		$property = new ReflectionProperty( 'Visual_Portfolio_Get', 'loop_items_cache' );

		if ( method_exists( $property, 'setAccessible' ) ) {
			$property->setAccessible( true );
		}

		$property->setValue( null, array() );
	}
}
