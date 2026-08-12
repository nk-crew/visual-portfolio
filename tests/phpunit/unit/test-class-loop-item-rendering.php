<?php
/**
 * Tests for what the item blocks put on the page.
 *
 * Rendered through `do_blocks()` rather than by calling the render callbacks:
 * the item blocks read their data out of the per-item block context, and that
 * context only exists inside the item template.
 *
 * @package Visual Portfolio
 */

/**
 * Item rendering test case.
 */
class ClassLoopItemRendering extends WP_UnitTestCase {
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
			$id = self::factory()->attachment->create_upload_object( dirname( __DIR__ ) . '/fixtures/image.png' );

			self::$images[] = array(
				'id'    => $id,
				'title' => 'Item ' . ( $i + 1 ),
			);
		}
	}

	/**
	 * Take our own lazy loading out of the picture.
	 *
	 * It rewrites every image it touches into a placeholder plus a `<noscript>`
	 * copy of the original, and forces `loading` on both - so counting the
	 * attributes of a rendered gallery would be counting its work, not the
	 * work of the blocks under test. One test switches it back on, to assert
	 * exactly where the two meet.
	 *
	 * @return void
	 */
	public function set_up() {
		parent::set_up();

		$this->skip_without_loop_blocks();

		update_option( 'vp_images', array( 'lazy_loading' => '' ) );
		Visual_Portfolio_Images::init_lazyload();
	}

	/**
	 * Render a loop around the given item blocks.
	 *
	 * @param string $item_blocks - serialized blocks inside the item template.
	 * @param array  $layout      - item template attributes.
	 *
	 * @return string
	 */
	private function render_loop( $item_blocks, $layout = array() ) {
		$loop = array(
			'block_id'    => 'render-test',
			'queryId'     => 1,
			'queryType'   => 'images',
			'baseQuery'   => array( 'perPage' => count( self::$images ) ),
			'imagesQuery' => array( 'images' => self::$images ),
		);

		return do_blocks(
			sprintf(
				'<!-- wp:visual-portfolio/loop %1$s --><div class="wp-block-visual-portfolio-loop vp-block-loop"><!-- wp:visual-portfolio/item-template %2$s -->%3$s<!-- /wp:visual-portfolio/item-template --></div><!-- /wp:visual-portfolio/loop -->',
				wp_json_encode( $loop ),
				wp_json_encode( $layout ),
				$item_blocks
			)
		);
	}

	/**
	 * The first picture is the one worth fetching first, and its row is not
	 * deferred.
	 *
	 * @return void
	 */
	public function test_first_row_is_loaded_eagerly() {
		$output = $this->render_loop(
			'<!-- wp:visual-portfolio/item-image /-->',
			array( 'layoutColumns' => 3 )
		);

		// Exactly one image is urgent - a page where everything is urgent has
		// nothing urgent on it.
		$this->assertSame( 1, substr_count( $output, 'fetchpriority="high"' ) );

		// Three columns, so three images are loaded rather than deferred.
		$this->assertSame( 3, substr_count( $output, 'loading="eager"' ) );

		// And the rest are left to core, which defers them.
		$this->assertSame( 2, substr_count( $output, 'loading="lazy"' ) );
	}

	/**
	 * A wider gallery loads a wider first row.
	 *
	 * @return void
	 */
	public function test_first_row_follows_the_columns() {
		$output = $this->render_loop(
			'<!-- wp:visual-portfolio/item-image /-->',
			array( 'layoutColumns' => 5 )
		);

		$this->assertSame( 5, substr_count( $output, 'loading="eager"' ) );
		$this->assertSame( 0, substr_count( $output, 'loading="lazy"' ) );
	}

	/**
	 * A cover renders its picture the same way.
	 *
	 * @return void
	 */
	public function test_cover_carries_the_loading_attributes() {
		$output = $this->render_loop(
			'<!-- wp:visual-portfolio/item-cover --><!-- wp:visual-portfolio/item-title /--><!-- /wp:visual-portfolio/item-cover -->',
			array( 'layoutColumns' => 2 )
		);

		$this->assertSame( 1, substr_count( $output, 'fetchpriority="high"' ) );
		$this->assertSame( 2, substr_count( $output, 'loading="eager"' ) );
	}

	/**
	 * The urgent picture is the one image our lazy loading leaves alone.
	 *
	 * `fetchpriority="high"` is a blocked attribute of the lazy loader, so the
	 * candidate for the largest paint is never turned into a placeholder that
	 * a script has to swap back.
	 *
	 * @return void
	 */
	public function test_priority_image_is_never_lazy_loaded() {
		update_option( 'vp_images', array( 'lazy_loading' => 'vp' ) );
		Visual_Portfolio_Images::init_lazyload();

		$output = $this->render_loop(
			'<!-- wp:visual-portfolio/item-image /-->',
			array( 'layoutColumns' => 1 )
		);

		$this->assertStringContainsString( 'vp-lazyload', $output );

		// The one image that is not a placeholder is the one marked urgent.
		$this->assertSame( 1, substr_count( $output, 'fetchpriority="high"' ) );
		$this->assertSame( count( self::$images ) - 1, substr_count( $output, 'vp-lazyload' ) );
	}

	/**
	 * A cover puts its content over the picture by default.
	 *
	 * @return void
	 */
	public function test_cover_places_content_over_the_image() {
		$output = $this->render_loop(
			'<!-- wp:visual-portfolio/item-cover --><!-- wp:visual-portfolio/item-title /--><!-- /wp:visual-portfolio/item-cover -->'
		);

		$this->assertStringContainsString( 'vp-content-placement-over', $output );
		$this->assertStringContainsString( 'vp-effect-fade', $output );
		$this->assertStringContainsString( 'vp-show-content-hover', $output );
		$this->assertStringContainsString( 'is-position-center-center', $output );

		// The ratio shapes the card, and the picture fills it.
		$this->assertStringContainsString( 'aspect-ratio:1', $output );
	}

	/**
	 * Content below the picture is content that is simply there.
	 *
	 * @return void
	 */
	public function test_cover_places_content_below_the_image() {
		$output = $this->render_loop(
			'<!-- wp:visual-portfolio/item-cover {"contentPlacement":"below","effect":"fly","contentPosition":"bottom left","verticalAlignment":"bottom"} --><!-- wp:visual-portfolio/item-title /--><!-- /wp:visual-portfolio/item-cover -->'
		);

		$this->assertStringContainsString( 'vp-content-placement-below', $output );

		// Nothing is revealed, so there is no effect and no reveal state.
		$this->assertStringContainsString( 'vp-effect-none', $output );
		$this->assertStringContainsString( 'vp-show-content-always', $output );

		// And no box to place the content in.
		$this->assertStringNotContainsString( 'is-position-bottom-left', $output );
		$this->assertStringNotContainsString( 'is-vertically-aligned-bottom', $output );

		// The content is still rendered, under the picture.
		$this->assertStringContainsString( 'wp-block-visual-portfolio-item-cover__inner', $output );

		// The fly module has nothing to move, so its directives are not there.
		$this->assertStringNotContainsString( 'data-vp-fly', $output );
	}

	/**
	 * With the content below, the ratio shapes the picture instead of the card.
	 *
	 * @return void
	 */
	public function test_cover_ratio_moves_to_the_media_box() {
		$output = $this->render_loop(
			'<!-- wp:visual-portfolio/item-cover {"contentPlacement":"below","aspectRatio":"4/3"} --><!-- wp:visual-portfolio/item-title /--><!-- /wp:visual-portfolio/item-cover -->'
		);

		$this->assertStringContainsString(
			'<div class="wp-block-visual-portfolio-item-cover__media" style="aspect-ratio:4/3">',
			$output
		);
	}
}
