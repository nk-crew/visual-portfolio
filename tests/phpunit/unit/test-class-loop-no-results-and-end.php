<?php
/**
 * Tests for the two blocks a loop shows at its ends: No Results for a gallery
 * with nothing in it, and End of List on the last page of one that has pages.
 *
 * @package Visual Portfolio
 */

/**
 * No Results and End of List test case.
 */
class ClassLoopNoResultsAndEnd extends WP_UnitTestCase {
	use Visual_Portfolio_Loop_Blocks_Trait;

	/**
	 * Images of the source.
	 *
	 * @var array
	 */
	private static $images = array();

	/**
	 * Create the attachments once for the whole case.
	 *
	 * @return void
	 */
	public static function wpSetUpBeforeClass() {
		for ( $i = 0; $i < 5; $i++ ) {
			self::$images[] = array(
				'id' => self::factory()->attachment->create_upload_object( dirname( __DIR__ ) . '/fixtures/image.png' ),
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
	 * Forget the page and the memoized items of the previous render.
	 *
	 * @return void
	 */
	public function tear_down() {
		unset( $_GET['vp-1-page'] );

		$this->reset_loop_state();

		parent::tear_down();
	}

	/**
	 * Forget what the pipeline memoized, as a new request would.
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
	 * Render a gallery of the given images, three to a page, with the given
	 * blocks after its item template.
	 *
	 * @param array  $images   - images of the gallery.
	 * @param string $siblings - serialized blocks after the item template.
	 *
	 * @return string
	 */
	private function render_loop( $images, $siblings ) {
		$loop = array(
			'block_id'    => 'ends-test',
			'queryId'     => 1,
			'queryType'   => 'images',
			'baseQuery'   => array( 'perPage' => 3 ),
			'imagesQuery' => array( 'images' => $images ),
		);

		return do_blocks(
			sprintf(
				'<!-- wp:visual-portfolio/loop %1$s --><div class="wp-block-visual-portfolio-loop vp-block-loop"><!-- wp:visual-portfolio/item-template --><!-- wp:visual-portfolio/item-image /--><!-- /wp:visual-portfolio/item-template -->%2$s</div><!-- /wp:visual-portfolio/loop -->',
				wp_json_encode( $loop ),
				$siblings
			)
		);
	}

	/**
	 * No Results speaks for a gallery that found nothing, and only for one.
	 *
	 * @return void
	 */
	public function test_no_results_shows_only_for_an_empty_gallery() {
		$no_results = '<!-- wp:visual-portfolio/loop-no-results --><!-- wp:paragraph --><p>Nothing here.</p><!-- /wp:paragraph --><!-- /wp:visual-portfolio/loop-no-results -->';

		$empty = $this->render_loop( array(), $no_results );

		$this->assertStringContainsString( 'Nothing here.', $empty );

		$full = $this->render_loop( self::$images, $no_results );

		$this->assertStringNotContainsString( 'Nothing here.', $full );
	}

	/**
	 * End of List is on the last page and nowhere before it.
	 *
	 * @return void
	 */
	public function test_the_end_of_the_list_is_on_its_last_page() {
		$pagination = '<!-- wp:visual-portfolio/loop-pagination --><!-- wp:visual-portfolio/loop-pagination-trigger /--><!-- wp:visual-portfolio/loop-pagination-end --><!-- wp:paragraph --><p>That is all.</p><!-- /wp:paragraph --><!-- /wp:visual-portfolio/loop-pagination-end --><!-- /wp:visual-portfolio/loop-pagination -->';

		$first = $this->render_loop( self::$images, $pagination );

		$this->assertStringNotContainsString( 'That is all.', $first );
		$this->assertStringContainsString( 'vp-block-loop-pagination-trigger', $first );

		$this->reset_loop_state();

		$_GET['vp-1-page'] = '2';

		$last = $this->render_loop( self::$images, $pagination );

		$this->assertStringContainsString( 'That is all.', $last );
		$this->assertStringContainsString( 'vp-block-loop-pagination-end', $last );
		$this->assertStringNotContainsString( 'vp-block-loop-pagination-trigger', $last );
	}

	/**
	 * A gallery that fits one page has no list to reach the end of.
	 *
	 * @return void
	 */
	public function test_a_single_page_has_no_end_of_the_list() {
		$pagination = '<!-- wp:visual-portfolio/loop-pagination --><!-- wp:visual-portfolio/loop-pagination-end --><!-- wp:paragraph --><p>That is all.</p><!-- /wp:paragraph --><!-- /wp:visual-portfolio/loop-pagination-end --><!-- /wp:visual-portfolio/loop-pagination -->';

		$output = $this->render_loop( array_slice( self::$images, 0, 2 ), $pagination );

		$this->assertStringNotContainsString( 'That is all.', $output );
	}
}
