<?php
/**
 * Tests that a randomly ordered loop keeps its order across its links.
 *
 * MySQL draws a new order on every request unless it is seeded, so a link
 * without the seed would show the second page of a different shuffle, with
 * items of the first page on it again.
 *
 * @package Visual Portfolio
 */

/**
 * Random seed links test case.
 */
class ClassLoopRandomSeedLinks extends WP_UnitTestCase {
	use Visual_Portfolio_Loop_Blocks_Trait;

	/**
	 * Posts of the loop, three pages of three.
	 */
	const POSTS = 9;

	/**
	 * Create the posts once for the whole case.
	 *
	 * @return void
	 */
	public static function wpSetUpBeforeClass() {
		$category = self::factory()->category->create( array( 'name' => 'Seed Category' ) );

		for ( $i = 1; $i <= self::POSTS; $i++ ) {
			self::factory()->post->create(
				array(
					'post_title'    => 'Seed Post ' . $i,
					'post_category' => array( $category ),
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
		$this->reset_request();
	}

	/**
	 * Leave no request state to the next test.
	 *
	 * @return void
	 */
	public function tear_down() {
		$this->reset_request();

		parent::tear_down();
	}

	/**
	 * Start a request of its own: its parameters, and what the pipeline
	 * memoized for the last one, the seed included.
	 *
	 * @param array $params - query string of the request.
	 *
	 * @return void
	 */
	private function reset_request( $params = array() ) {
		$_GET     = $params;
		$_REQUEST = $params;

		$state = array(
			array( 'Visual_Portfolio_Get', 'loop_items_cache', array() ),
			array( 'Visual_Portfolio_Get', 'used_posts', array() ),
			array( 'Visual_Portfolio_Get', 'check_main_query', true ),
			array( 'Visual_Portfolio_Get', 'rand_seed_session', false ),
			array( 'Visual_Portfolio_Filter_Terms', 'resolved', array() ),
		);

		foreach ( $state as list( $class, $name, $value ) ) {
			$property = new ReflectionProperty( $class, $name );

			if ( method_exists( $property, 'setAccessible' ) ) {
				$property->setAccessible( true );
			}

			$property->setValue( null, $value );
		}
	}

	/**
	 * Render the random loop with a filter, a sort shown as links and paged
	 * pagination.
	 *
	 * @return string
	 */
	private function render_loop() {
		$loop = array(
			'block_id'   => 'seed-test',
			'queryId'    => 1,
			'queryType'  => 'posts',
			'baseQuery'  => array( 'perPage' => 3 ),
			'postsQuery' => array(
				'source'  => 'post',
				'orderBy' => 'rand',
			),
		);

		return do_blocks(
			sprintf(
				'<!-- wp:visual-portfolio/loop %s --><div class="wp-block-visual-portfolio-loop vp-block-loop"><!-- wp:visual-portfolio/loop-filter {"showAllItem":true} /--><!-- wp:visual-portfolio/loop-sort {"displayAsDropdown":false} /--><!-- wp:visual-portfolio/item-template --><!-- wp:visual-portfolio/item-title /--><!-- /wp:visual-portfolio/item-template --><!-- wp:visual-portfolio/loop-pagination --><!-- wp:visual-portfolio/loop-pagination-previous /--><!-- wp:visual-portfolio/loop-pagination-numbers /--><!-- wp:visual-portfolio/loop-pagination-next /--><!-- /wp:visual-portfolio/loop-pagination --></div><!-- /wp:visual-portfolio/loop -->',
				wp_json_encode( $loop )
			)
		);
	}

	/**
	 * Addresses of the links with the given class, or of the page numbers,
	 * which carry none of their own.
	 *
	 * @param string $html  - rendered loop.
	 * @param string $class - class of the links, or `page-number`.
	 *
	 * @return string[]
	 */
	private function get_hrefs( $html, $class ) {
		$processor = new WP_HTML_Tag_Processor( $html );
		$hrefs     = array();

		while ( $processor->next_tag( 'a' ) ) {
			$matches = 'page-number' === $class
				? 0 === strpos( (string) $processor->get_attribute( 'aria-label' ), 'Page ' )
				: $processor->has_class( $class );

			if ( $matches ) {
				$hrefs[] = html_entity_decode( (string) $processor->get_attribute( 'href' ) );
			}
		}

		return $hrefs;
	}

	/**
	 * Titles of the rendered items.
	 *
	 * @param string $html - rendered loop.
	 *
	 * @return string[]
	 */
	private function get_titles( $html ) {
		preg_match_all( '/Seed Post \d+/', $html, $matches );

		return $matches[0];
	}

	/**
	 * Every filter, sort and page link carries the seed of the request.
	 *
	 * @return void
	 */
	public function test_every_control_link_carries_the_seed() {
		$html = $this->render_loop();
		$seed = (string) Visual_Portfolio_Get::get_random_seed();

		$links = array(
			'filter' => $this->get_hrefs( $html, 'vp-block-loop-filter-item' ),
			'sort'   => $this->get_hrefs( $html, 'vp-block-loop-sort__item' ),
			'page'   => array_merge(
				$this->get_hrefs( $html, 'page-number' ),
				$this->get_hrefs( $html, 'vp-block-loop-pagination-next' )
			),
		);

		foreach ( $links as $role => $hrefs ) {
			$this->assertNotEmpty( $hrefs, "The loop prints no {$role} link." );

			foreach ( $hrefs as $href ) {
				wp_parse_str( (string) wp_parse_url( $href, PHP_URL_QUERY ), $params );

				$this->assertSame( $seed, $params['vpf_random_seed'] ?? null, "A {$role} link has lost the seed: {$href}" );
			}
		}
	}

	/**
	 * Following Next from the first page walks the same shuffle: no item comes
	 * twice, and the three pages show every post.
	 *
	 * @return void
	 */
	public function test_next_pages_show_none_of_the_earlier_items() {
		$seen = array();
		$html = $this->render_loop();

		for ( $page = 1; $page <= 3; $page++ ) {
			$titles = $this->get_titles( $html );

			$this->assertCount( 3, $titles, "Page {$page} does not show a full page." );
			$this->assertSame( array(), array_intersect( $titles, $seen ), "Page {$page} repeats an item of an earlier page." );

			$seen = array_merge( $seen, $titles );

			if ( 3 === $page ) {
				break;
			}

			$next = $this->get_hrefs( $html, 'vp-block-loop-pagination-next' );

			$this->assertCount( 1, $next );

			wp_parse_str( (string) wp_parse_url( $next[0], PHP_URL_QUERY ), $params );
			$this->reset_request( $params );

			$html = $this->render_loop();
		}

		$this->assertCount( self::POSTS, array_unique( $seen ) );
	}
}
