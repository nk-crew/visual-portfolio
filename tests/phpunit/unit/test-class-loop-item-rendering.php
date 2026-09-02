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

		// One image per request is asked for first, and every test here is a
		// request of its own - the flag is process-wide and core never resets it
		// between them.
		wp_high_priority_element_flag( true );

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
	private function render_loop( $item_blocks, $layout = array(), $siblings = '' ) {
		$loop = array(
			'block_id'    => 'render-test',
			'queryId'     => 1,
			'queryType'   => 'images',
			'baseQuery'   => array( 'perPage' => count( self::$images ) ),
			'imagesQuery' => array( 'images' => self::$images ),
		);

		return do_blocks(
			sprintf(
				'<!-- wp:visual-portfolio/loop %1$s --><div class="wp-block-visual-portfolio-loop vp-block-loop"><!-- wp:visual-portfolio/item-template %2$s -->%3$s<!-- /wp:visual-portfolio/item-template -->%4$s</div><!-- /wp:visual-portfolio/loop -->',
				wp_json_encode( $loop ),
				wp_json_encode( $layout ),
				$item_blocks,
				$siblings
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
			array( 'layoutColumnCount' => 3 )
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
			array( 'layoutColumnCount' => 5 )
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
			array( 'layoutColumnCount' => 2 )
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
			array( 'layoutColumnCount' => 1 )
		);

		$this->assertStringContainsString( 'vp-lazyload', $output );

		// The one image that is not a placeholder is the one marked urgent.
		$this->assertSame( 1, substr_count( $output, 'fetchpriority="high"' ) );
		$this->assertSame( count( self::$images ) - 1, substr_count( $output, 'vp-lazyload' ) );
	}

	/**
	 * A cover puts its content over the picture.
	 *
	 * @return void
	 */
	public function test_cover_places_content_over_the_image() {
		$output = $this->render_loop(
			'<!-- wp:visual-portfolio/item-cover --><!-- wp:visual-portfolio/item-title /--><!-- /wp:visual-portfolio/item-cover -->'
		);

		$this->assertStringContainsString( 'vp-effect-fade', $output );
		$this->assertStringContainsString( 'vp-show-content-hover', $output );
		$this->assertStringContainsString( 'is-position-center-center', $output );

		// The ratio travels as a variable, so a stylesheet can hand it to the
		// media box when the card is laid out some other way. Written inline as
		// the property, it would outweigh that stylesheet.
		$this->assertStringContainsString( '--vp-cover-aspect-ratio:1', $output );
		$this->assertStringNotContainsString( 'style="aspect-ratio', $output );
	}

	/**
	 * A carousel with no effect is the item and its blocks, and nothing else.
	 *
	 * @return void
	 */
	public function test_a_plain_carousel_renders_no_effect_boxes() {
		$output = $this->render_loop(
			'<!-- wp:visual-portfolio/item-image /-->',
			array( 'layoutType' => 'carousel' )
		);

		$this->assertStringContainsString( 'vp-layout-carousel', $output );
		$this->assertStringNotContainsString( 'vp-carousel-effect', $output );
		$this->assertStringNotContainsString( '__slide', $output );
		$this->assertStringNotContainsString( '__card', $output );
	}

	/**
	 * An effect wraps every item in the two boxes it is drawn on, and numbers
	 * them - a stacking effect deals the items into a pile, and the pile has to
	 * know which card is which.
	 *
	 * @return void
	 */
	public function test_an_effect_wraps_and_numbers_the_slides() {
		$output = $this->render_loop(
			'<!-- wp:visual-portfolio/item-image /-->',
			array(
				'layoutType'     => 'carousel',
				'carouselEffect' => 'coverflow',
			)
		);

		$this->assertStringContainsString( 'vp-carousel-effect', $output );
		$this->assertStringContainsString( 'vp-carousel-coverflow', $output );

		$count = count( self::$images );

		$this->assertSame( $count, substr_count( $output, 'wp-block-visual-portfolio-item-template__slide' ) );
		$this->assertSame( $count, substr_count( $output, 'wp-block-visual-portfolio-item-template__card' ) );

		for ( $index = 0; $index < $count; $index++ ) {
			$this->assertStringContainsString( sprintf( '--vp-slide-index:%d', $index ), $output );
		}
	}

	/**
	 * An effect this install does not have is not an effect.
	 *
	 * The name is filtered, so a gallery saved with a Pro effect on a site
	 * without Pro has to fall back to the carousel rather than to a class with
	 * no stylesheet behind it.
	 *
	 * @return void
	 */
	public function test_an_unknown_effect_is_dropped() {
		$output = $this->render_loop(
			'<!-- wp:visual-portfolio/item-image /-->',
			array(
				'layoutType'     => 'carousel',
				'carouselEffect' => 'acme-unknown',
			)
		);

		$this->assertStringContainsString( 'vp-layout-carousel', $output );
		$this->assertStringNotContainsString( 'vp-carousel-effect', $output );
		$this->assertStringNotContainsString( 'acme-unknown', $output );
	}

	/**
	 * An effect that spreads one slide over the width of the gallery takes the
	 * column count with it.
	 *
	 * Left to a count, the slideshow and the decks were drawn as several
	 * fractions of themselves side by side.
	 *
	 * @return void
	 */
	public function test_a_single_slide_effect_takes_the_column_count() {
		$layout = array(
			'layoutType'        => 'carousel',
			'layoutColumnsMode' => 'auto',
			'layoutColumnCount' => 3,
			'carouselEffect'    => 'slideshow',
		);

		$output = $this->render_loop( '<!-- wp:visual-portfolio/item-image /-->', $layout );

		$this->assertStringContainsString( '--vp-layout-columns:1', $output );
		$this->assertStringNotContainsString( 'vp-layout-auto-columns', $output );

		// Cover flow is the other kind: the count is how many cards fit across
		// the gallery, so it keeps whatever was set.
		$layout['layoutColumnsMode'] = 'manual';
		$layout['carouselEffect']    = 'coverflow';

		$output = $this->render_loop( '<!-- wp:visual-portfolio/item-image /-->', $layout );

		$this->assertStringContainsString( '--vp-layout-columns:3', $output );
	}

	/**
	 * A carousel is drawn inside the one box of it that stays put, and the
	 * controls are blocks beside that box rather than markup inside it.
	 *
	 * @return void
	 */
	public function test_the_carousel_is_drawn_inside_a_frame() {
		$output = $this->render_loop(
			'<!-- wp:visual-portfolio/item-image /-->',
			array( 'layoutType' => 'carousel' ),
			'<!-- wp:visual-portfolio/loop-carousel-nav --><!-- wp:visual-portfolio/loop-carousel-previous /--><!-- wp:visual-portfolio/loop-carousel-indicator /--><!-- wp:visual-portfolio/loop-carousel-next /--><!-- /wp:visual-portfolio/loop-carousel-nav -->'
		);

		$frame = strpos( $output, 'wp-block-visual-portfolio-item-template__carousel-frame' );

		$this->assertNotFalse( $frame );

		// The controls come after the gallery here, and nothing but their own
		// place in the post says so - they are siblings of the item template.
		$this->assertGreaterThan(
			$frame,
			strpos( $output, 'vp-block-loop-carousel-nav' )
		);

		// Every one of them moves the scroll container through the scroll API,
		// so every one of them is rendered switched off.
		$this->assertSame( 4, substr_count( $output, 'vp-carousel-control-idle' ) );

		$this->assertStringContainsString( 'data-wp-on--click="actions.carouselPrev"', $output );
		$this->assertStringContainsString( 'data-wp-on--click="actions.carouselNext"', $output );

		// The dots are the view module's: how many slides there are is the item
		// template's answer, and a Load More changes it afterwards anyway.
		$this->assertStringContainsString( 'vp-block-loop-carousel-indicator--dots', $output );
		$this->assertStringNotContainsString( 'vp-block-loop-carousel-dot"', $output );
	}

	/**
	 * A control dropped inside the item template is not an item: it is
	 * rendered once, after the list and inside the frame, which is what lays
	 * it over the slides.
	 *
	 * @return void
	 */
	public function test_controls_inside_the_template_are_rendered_once_inside_the_frame() {
		$output = $this->render_loop(
			'<!-- wp:visual-portfolio/item-image /--><!-- wp:visual-portfolio/loop-carousel-nav {"showOnHover":true} --><!-- wp:visual-portfolio/loop-carousel-previous {"icon":"arrow","appearance":"filled"} /--><!-- wp:visual-portfolio/loop-carousel-next /--><!-- /wp:visual-portfolio/loop-carousel-nav --><!-- wp:visual-portfolio/loop-carousel-indicator {"appearance":"plain"} /-->',
			array( 'layoutType' => 'carousel' )
		);

		// Five items, one row and one indicator.
		$this->assertSame( 1, substr_count( $output, 'vp-block-loop-carousel-nav' ) );
		$this->assertSame( 1, substr_count( $output, 'vp-block-loop-carousel-indicator--dots' ) );
		$this->assertSame( 5, substr_count( $output, 'wp-block-visual-portfolio-item-template__item' ) );

		// After the list and before the frame closes.
		$list_end  = strpos( $output, '</ul>' );
		$frame_end = strpos( $output, '</div>', $list_end );
		$nav       = strpos( $output, 'vp-block-loop-carousel-nav' );

		$this->assertGreaterThan( $list_end, $nav );
		$this->assertLessThan( $frame_end, $nav );

		// The settings become classes.
		$this->assertStringContainsString( 'vp-block-loop-carousel-nav is-shown-on-hover', $output );
		$this->assertStringContainsString( 'vp-block-loop-carousel-previous has-arrow-icon is-filled', $output );
		$this->assertStringContainsString( 'vp-block-loop-carousel-indicator--dots is-plain', $output );
	}

	/**
	 * A control that was switched off renders nothing at all. It cannot be
	 * deleted, so hiding is the only way one is taken off a page.
	 *
	 * @return void
	 */
	public function test_a_hidden_carousel_control_renders_nothing() {
		$output = $this->render_loop(
			'<!-- wp:visual-portfolio/item-image /-->',
			array( 'layoutType' => 'carousel' ),
			'<!-- wp:visual-portfolio/loop-carousel-previous {"isHidden":true} /--><!-- wp:visual-portfolio/loop-carousel-next /-->'
		);

		$this->assertStringNotContainsString( 'vp-block-loop-carousel-previous', $output );
		$this->assertStringContainsString( 'vp-block-loop-carousel-next', $output );
	}

	/**
	 * A row whose every control was switched off is not a row at all: the gap
	 * its layout draws and the margin around it would be left behind.
	 *
	 * @return void
	 */
	public function test_an_empty_carousel_nav_renders_nothing() {
		$output = $this->render_loop(
			'<!-- wp:visual-portfolio/item-image /-->',
			array( 'layoutType' => 'carousel' ),
			'<!-- wp:visual-portfolio/loop-carousel-nav --><!-- wp:visual-portfolio/loop-carousel-previous {"isHidden":true} /--><!-- /wp:visual-portfolio/loop-carousel-nav -->'
		);

		$this->assertStringNotContainsString( 'vp-block-loop-carousel-nav', $output );
	}
}
