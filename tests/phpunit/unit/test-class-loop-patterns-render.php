<?php
/**
 * Tests that every Gallery Loop pattern renders a gallery.
 *
 * A pattern is saved markup the editor inserts as it is, so a pattern whose
 * blocks no longer render would ship a broken gallery to every page it lands
 * on.
 *
 * @package Visual Portfolio
 */

/**
 * Loop patterns render test case.
 */
class ClassLoopPatternsRender extends WP_UnitTestCase {
	use Visual_Portfolio_Loop_Blocks_Trait;

	/**
	 * Items each source holds. Fewer than the smallest page of any pattern, so
	 * every pattern shows all of them.
	 */
	const ITEMS = 5;

	/**
	 * Images given to the patterns that show images.
	 *
	 * @var array
	 */
	private static $images = array();

	/**
	 * Create the images and the portfolio posts once for the whole case.
	 *
	 * @return void
	 */
	public static function wpSetUpBeforeClass() {
		$term = self::factory()->term->create(
			array(
				'taxonomy' => 'portfolio_category',
				'name'     => 'Pattern Category',
			)
		);

		for ( $i = 0; $i < self::ITEMS; $i++ ) {
			$image = self::factory()->attachment->create_upload_object( dirname( __DIR__ ) . '/fixtures/image.png' );

			self::$images[] = array(
				'id'    => $image,
				'title' => 'Pattern Image ' . ( $i + 1 ),
			);

			$post = self::factory()->post->create(
				array(
					'post_type'  => 'portfolio',
					'post_title' => 'Pattern Project ' . ( $i + 1 ),
				)
			);

			set_post_thumbnail( $post, $image );
			wp_set_object_terms( $post, $term, 'portfolio_category' );
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
	 * Every pattern file the plugin ships, by slug.
	 *
	 * Read from the files rather than the registry, so a pattern the
	 * registration drops is a failure here rather than a test that never runs.
	 *
	 * @return array
	 */
	public function data_pattern_slugs() {
		$data = array();

		foreach ( glob( dirname( dirname( dirname( __DIR__ ) ) ) . '/gutenberg/patterns/*.php' ) as $file ) {
			$slug          = get_file_data( $file, array( 'slug' => 'Slug' ) )['slug'];
			$data[ $slug ] = array( $slug );
		}

		return $data;
	}

	/**
	 * A pattern renders its loop and every item of its source.
	 *
	 * @dataProvider data_pattern_slugs
	 *
	 * @param string $slug - pattern slug.
	 *
	 * @return void
	 */
	public function test_pattern_renders_its_items( $slug ) {
		$pattern = WP_Block_Patterns_Registry::get_instance()->get_registered( $slug );

		$this->assertIsArray( $pattern, "{$slug} is not registered." );
		$this->assertContains( 'visual-portfolio', $pattern['categories'] );

		$blocks = parse_blocks( $pattern['content'] );
		$loops  = array_values(
			array_filter(
				$blocks,
				function ( $block ) {
					return 'visual-portfolio/loop' === $block['blockName'];
				}
			)
		);

		$this->assertCount( 1, $loops, "{$slug} holds no loop at its top level." );

		$index = array_search( $loops[0], $blocks, true );
		$attrs = $loops[0]['attrs'];

		// An images pattern is saved without images, the editor asks for them.
		if ( 'images' === ( $attrs['queryType'] ?? 'posts' ) ) {
			$attrs['imagesQuery']           = $attrs['imagesQuery'] ?? array();
			$attrs['imagesQuery']['images'] = self::$images;
		}

		$blocks[ $index ]['attrs'] = $attrs;

		$output = do_blocks( serialize_blocks( $blocks ) );

		$wrapper = new WP_HTML_Tag_Processor( $output );

		$this->assertTrue( $wrapper->next_tag( array( 'class_name' => 'vp-block-loop' ) ), "{$slug} renders no loop wrapper." );
		$this->assertSame( 'vp-loop-' . $attrs['block_id'], $wrapper->get_attribute( 'data-wp-router-region' ), "{$slug} renders a loop the router cannot find." );
		$this->assertSame( self::ITEMS, substr_count( $output, '<li class="wp-block-visual-portfolio-item-template__item"' ), "{$slug} does not render every item." );
		$this->assertStringNotContainsString( 'No items were found', $output, "{$slug} renders its No Results." );
	}
}
