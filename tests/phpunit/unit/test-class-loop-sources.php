<?php
/**
 * Tests for what a Gallery Loop does with sources other than posts and
 * images: the sort handed to the source's own query, the controls a source
 * leaves out, a source nothing answers for, and a site the family is not
 * registered on.
 *
 * @package Visual Portfolio
 */

/**
 * Loop sources test case.
 */
class ClassLoopSources extends WP_UnitTestCase {
	use Visual_Portfolio_Loop_Blocks_Trait;

	/**
	 * Images of the source.
	 *
	 * @var array
	 */
	private static $images = array();

	/**
	 * WordPress version before a test changed it.
	 *
	 * @var string
	 */
	private $wp_version = '';

	/**
	 * Create the attachments and a Portfolio post once for the whole case.
	 *
	 * @return void
	 */
	public static function wpSetUpBeforeClass() {
		foreach ( array( 'Forest', 'City' ) as $title ) {
			self::$images[] = array(
				'id'    => self::factory()->attachment->create_upload_object( dirname( __DIR__ ) . '/fixtures/image.png' ),
				'title' => $title,
			);
		}

		self::factory()->post->create(
			array(
				'post_type'   => 'portfolio',
				'post_status' => 'publish',
				'post_title'  => 'A Portfolio post',
			)
		);
	}

	/**
	 * Skip where the family is not registered.
	 *
	 * @return void
	 */
	public function set_up() {
		parent::set_up();

		$this->skip_without_loop_blocks();

		$this->wp_version = $GLOBALS['wp_version'];
	}

	/**
	 * Forget the state of the previous request.
	 *
	 * @return void
	 */
	public function tear_down() {
		unset( $_GET['vp-1-sort'], $_GET['vp_sort'] );

		$GLOBALS['wp_version'] = $this->wp_version;

		$this->reset_loop_cache();

		parent::tear_down();
	}

	/**
	 * Serialized loop of the given source around the given blocks.
	 *
	 * @param string $query_type - source of the loop.
	 * @param string $inner      - serialized blocks inside the loop.
	 *
	 * @return string
	 */
	private function get_loop( $query_type, $inner ) {
		$loop = array(
			'block_id'    => 'sources-test',
			'queryId'     => 1,
			'queryType'   => $query_type,
			'baseQuery'   => array( 'perPage' => 10 ),
			'imagesQuery' => array( 'images' => self::$images ),
		);

		return sprintf(
			'<!-- wp:visual-portfolio/loop %1$s --><div class="wp-block-visual-portfolio-loop vp-block-loop">%2$s<!-- wp:visual-portfolio/item-template --><!-- wp:visual-portfolio/item-title /--><!-- /wp:visual-portfolio/item-template --></div><!-- /wp:visual-portfolio/loop -->',
			wp_json_encode( $loop ),
			$inner
		);
	}

	/**
	 * Render one control alone, in the context of a loop of the given source.
	 *
	 * @param string $name       - block name without the namespace.
	 * @param string $query_type - source of the loop.
	 *
	 * @return string
	 */
	private function render_control( $name, $query_type ) {
		$block = new WP_Block(
			array(
				'blockName'    => 'visual-portfolio/' . $name,
				'attrs'        => array(),
				'innerBlocks'  => array(),
				'innerHTML'    => '',
				'innerContent' => array(),
			),
			array(
				'vp/blockId'     => 'sources-test',
				'vp/queryId'     => 1,
				'vp/queryType'   => $query_type,
				'vp/baseQuery'   => array( 'perPage' => 10 ),
				'vp/imagesQuery' => array( 'images' => self::$images ),
			)
		);

		return $block->render();
	}

	/**
	 * The sort the free plugin resolved reaches the query filters, from the
	 * parameter of the gallery that asks.
	 *
	 * @return void
	 */
	public function test_the_active_sort_reaches_the_query_filters() {
		$handed = array();

		foreach ( array( 'vpf_extend_options_before_query_args', 'vpf_extend_query_args' ) as $hook ) {
			add_filter(
				$hook,
				function ( $value, $options = null ) use ( $hook, &$handed ) {
					$options = 'vpf_extend_query_args' === $hook ? $options : $value;

					$handed[ $hook ] = $options['active_sort'] ?? null;

					return $value;
				},
				10,
				2
			);
		}

		$_GET['vp_sort'] = 'date';

		do_blocks( $this->get_loop( 'images', '' ) );

		$this->assertSame(
			array(
				'vpf_extend_options_before_query_args' => null,
				'vpf_extend_query_args'                => null,
			),
			$handed,
			'A loop does not read the classic parameter.'
		);

		$_GET['vp-1-sort'] = 'title';

		$this->reset_loop_cache();
		do_blocks( $this->get_loop( 'images', '' ) );

		$this->assertSame(
			array(
				'vpf_extend_options_before_query_args' => 'title',
				'vpf_extend_query_args'                => 'title',
			),
			$handed
		);

		unset( $_GET['vp-1-sort'] );

		$_GET['vp_sort'] = 'title';

		Visual_Portfolio_Get::get_query_params(
			Visual_Portfolio_Get::get_options(
				array(
					'block_id'       => 'classic',
					'content_source' => 'images',
					'images'         => self::$images,
				)
			)
		);

		$this->assertSame( 'title', $handed['vpf_extend_query_args'] );
	}

	/**
	 * Sort on a Taxonomies loop and Filter on a Social loop render nothing,
	 * where the same blocks render on a loop of images, until the source says
	 * it supports them.
	 *
	 * @return void
	 */
	public function test_a_control_the_source_leaves_out_renders_nothing() {
		add_filter(
			'vpf_custom_filter_terms',
			function () {
				return array(
					'terms' => array(
						array(
							'filter' => 'nature',
							'label'  => 'Nature',
							'count'  => 1,
						),
					),
				);
			}
		);

		$this->assertStringContainsString( 'vp-block-loop-sort', $this->render_control( 'loop-sort', 'images' ) );
		$this->assertStringContainsString( 'vp-block-loop-filter', $this->render_control( 'loop-filter', 'images' ) );
		$this->assertSame( '', $this->render_control( 'loop-sort', 'taxonomies' ) );
		$this->assertSame( '', $this->render_control( 'loop-filter', 'social-stream' ) );

		add_filter(
			'vpf_loop_source_supports',
			function ( $supports ) {
				$supports['taxonomies']['sort'] = true;

				return $supports;
			}
		);

		$this->assertStringContainsString( 'vp-block-loop-sort', $this->render_control( 'loop-sort', 'taxonomies' ) );
	}

	/**
	 * A source no extension answers for shows No Results, not Portfolio posts.
	 *
	 * @return void
	 */
	public function test_a_source_nothing_answers_for_shows_no_results() {
		$no_results = '<!-- wp:visual-portfolio/loop-no-results --><!-- wp:paragraph --><p>Nothing here.</p><!-- /wp:paragraph --><!-- /wp:visual-portfolio/loop-no-results -->';

		foreach ( array( 'taxonomies', 'social-stream' ) as $source ) {
			$this->reset_loop_cache();

			$html = do_blocks( $this->get_loop( $source, $no_results ) );

			$this->assertStringContainsString( 'Nothing here.', $html, $source );
			$this->assertStringNotContainsString( 'A Portfolio post', $html, $source );
		}
	}

	/**
	 * Below the version the family needs, a saved loop and a control saved
	 * outside one print nothing, while the blocks around them print as usual.
	 *
	 * @return void
	 */
	public function test_the_family_prints_nothing_where_it_is_not_supported() {
		$no_results = '<!-- wp:visual-portfolio/loop-no-results --><!-- wp:paragraph --><p>Nothing here.</p><!-- /wp:paragraph --><!-- /wp:visual-portfolio/loop-no-results -->';
		$end        = '<!-- wp:visual-portfolio/loop-pagination --><!-- wp:visual-portfolio/loop-pagination-end --><!-- wp:paragraph --><p>That is all.</p><!-- /wp:paragraph --><!-- /wp:visual-portfolio/loop-pagination-end --><!-- /wp:visual-portfolio/loop-pagination -->';
		$content    = '<!-- wp:paragraph --><p>Before.</p><!-- /wp:paragraph -->'
			. $this->get_loop( 'images', $no_results . $end )
			. $no_results;

		$GLOBALS['wp_version'] = '7.0.2';

		$this->assertFalse( visual_portfolio()->supports_loop_blocks() );
		$this->assertSame( '<p class="wp-block-paragraph">Before.</p>', trim( do_blocks( $content ) ) );
	}

	/**
	 * Forget the memoized items, as a new request would.
	 *
	 * @return void
	 */
	private function reset_loop_cache() {
		$property = new ReflectionProperty( 'Visual_Portfolio_Get', 'loop_items_cache' );

		if ( method_exists( $property, 'setAccessible' ) ) {
			$property->setAccessible( true );
		}

		$property->setValue( null, array() );
	}
}
