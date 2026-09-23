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
	 * Fade is one of the free effects, and like the slideshow it spreads one
	 * slide over the width of the gallery.
	 *
	 * @return void
	 */
	public function test_fade_is_a_free_effect_that_owns_the_width() {
		$output = $this->render_loop(
			'<!-- wp:visual-portfolio/item-image /-->',
			array(
				'layoutType'        => 'carousel',
				'layoutColumnsMode' => 'manual',
				'layoutColumnCount' => 3,
				'carouselEffect'    => 'fade',
			)
		);

		$this->assertStringContainsString( 'vp-carousel-fade', $output );
		$this->assertStringContainsString( '--vp-layout-columns:1', $output );
	}

	/**
	 * A carousel with an effect brings the script that keeps its timelines
	 * where the browser has none, and a plain one does not.
	 *
	 * @return void
	 */
	public function test_an_effect_brings_the_timelines_script() {
		wp_dequeue_script( Visual_Portfolio_Block_Item_Template::TIMELINES );

		$this->render_loop( '<!-- wp:visual-portfolio/item-image /-->', array( 'layoutType' => 'carousel' ) );

		$this->assertFalse( wp_script_is( Visual_Portfolio_Block_Item_Template::TIMELINES, 'enqueued' ) );

		$this->render_loop(
			'<!-- wp:visual-portfolio/item-image /-->',
			array(
				'layoutType'     => 'carousel',
				'carouselEffect' => 'slideshow',
			)
		);

		$this->assertTrue( wp_script_is( Visual_Portfolio_Block_Item_Template::TIMELINES, 'enqueued' ) );
	}

	/**
	 * An effect that pins its slides in place cannot be run round.
	 *
	 * The loop moves the slides one end has run out of to the other, and a
	 * pinned slide stays where it is - so a deck that repeated was drawn as
	 * an empty list. An effect says so with `repeat => false`, and the loop
	 * is left out along with the seam it would have loaded up front.
	 *
	 * @return void
	 */
	public function test_an_effect_that_pins_its_slides_leaves_the_loop_out() {
		$add_deck = function ( $effects ) {
			$effects['acme-deck'] = array(
				'columns' => false,
				'repeat'  => false,
			);

			return $effects;
		};

		// An install adds its effect before the block is registered, and the
		// schema lists it from then on. A filter added here is too late for
		// that, so the list is widened by hand the way registration does it.
		$block_type = WP_Block_Type_Registry::get_instance()->get_registered( 'visual-portfolio/item-template' );
		$schema     = $block_type->attributes['carouselEffect'];

		add_filter( 'vpf_carousel_effects', $add_deck );
		$block_type->attributes['carouselEffect']['enum'] = array_merge( array( 'none' ), array_keys( Visual_Portfolio_Block_Item_Template::get_carousel_effects() ) );

		try {
			$output = $this->render_loop(
				'<!-- wp:visual-portfolio/item-image /-->',
				array(
					'layoutType'     => 'carousel',
					'carouselEffect' => 'acme-deck',
					'carouselRepeat' => true,
				)
			);
		} finally {
			remove_filter( 'vpf_carousel_effects', $add_deck );
			$block_type->attributes['carouselEffect'] = $schema;
		}

		$this->assertStringContainsString( 'vp-carousel-acme-deck', $output );
		$this->assertStringNotContainsString( 'data-vp-carousel-repeat', $output );
		$this->assertStringNotContainsString( 'data-skip-lazy', $output );

		// An effect that says nothing about it repeats, the way it always did.
		$output = $this->render_loop(
			'<!-- wp:visual-portfolio/item-image /-->',
			array(
				'layoutType'     => 'carousel',
				'carouselEffect' => 'coverflow',
				'carouselRepeat' => true,
			)
		);

		$this->assertStringContainsString( 'data-vp-carousel-repeat="true"', $output );
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
	 * A count for a narrower screen is Pro's to write; the free plugin prints
	 * none, and ignores one that arrives in the attributes.
	 *
	 * @return void
	 */
	public function test_the_free_plugin_writes_no_screen_count() {
		// Under Pro the same suite runs with Pro's module writing them.
		if ( class_exists( 'Visual_Portfolio_Pro_Responsive_Layout' ) ) {
			$this->markTestSkipped( 'Pro writes the screen counts on this install.' );
		}

		$output = $this->render_loop(
			'<!-- wp:visual-portfolio/item-image /-->',
			array(
				'layoutType'              => 'grid',
				'layoutColumnsMode'       => 'manual',
				'layoutColumnCount'       => 4,
				'layoutColumnCountTablet' => 2,
			)
		);

		$this->assertStringContainsString( '--vp-layout-columns:4', $output );
		$this->assertStringNotContainsString( '--vp-layout-columns-tablet', $output );
		$this->assertStringNotContainsString( 'vp-has-tablet-columns', $output );
	}

	/**
	 * The rules a count set for a screen applies by are the free plugin's,
	 * for Pro to write the classes of: at the breakpoints the theme declares
	 * for its responsive styles, or the ones the editor falls back to - and
	 * as the same ranges, so the tablet count is the tablet's alone.
	 *
	 * @return void
	 */
	public function test_a_screen_count_applies_at_the_breakpoints_the_editor_previews() {
		$this->skip_without_loop_blocks();

		$queries = Visual_Portfolio_Block_Item_Template::get_screen_queries();

		$this->assertSame( array( 'tablet', 'mobile' ), array_keys( $queries ) );
		$this->assertSame( '@media (480px < width <= 782px)', $queries['tablet'] );
		$this->assertSame( '@media (width <= 480px)', $queries['mobile'] );

		// The rules ride along with the block stylesheet, after it, so they
		// are printed wherever the stylesheet is - the editor canvas included.
		wp_styles()->add_data( Visual_Portfolio_Block_Item_Template::STYLE, 'after', array() );

		( new Visual_Portfolio_Block_Item_Template() )->add_screen_columns_style();

		$rules = implode( '', (array) wp_styles()->get_data( Visual_Portfolio_Block_Item_Template::STYLE, 'after' ) );

		$this->assertStringContainsString( '@media (480px < width <= 782px){.wp-block-visual-portfolio-item-template.vp-has-tablet-columns{--vp-layout-current-columns:var(--vp-layout-columns-tablet)}}', $rules );
		$this->assertStringContainsString( '@media (width <= 480px){.wp-block-visual-portfolio-item-template.vp-has-mobile-columns{--vp-layout-current-columns:var(--vp-layout-columns-mobile)}}', $rules );
	}

	/**
	 * A theme that moves the breakpoints moves the counts with them.
	 *
	 * @return void
	 */
	public function test_a_screen_count_follows_the_breakpoints_of_the_theme() {
		$this->skip_without_loop_blocks();

		$filter = static function ( $theme_json ) {
			return $theme_json->update_with(
				array(
					'version'  => WP_Theme_JSON::LATEST_SCHEMA,
					'settings' => array(
						'viewport' => array(
							'mobile' => '600px',
							'tablet' => '1024px',
						),
					),
				)
			);
		};

		add_filter( 'wp_theme_json_data_theme', $filter );
		WP_Theme_JSON_Resolver::clean_cached_data();

		try {
			$queries = Visual_Portfolio_Block_Item_Template::get_screen_queries();
		} finally {
			remove_filter( 'wp_theme_json_data_theme', $filter );
			WP_Theme_JSON_Resolver::clean_cached_data();
		}

		$this->assertSame( '@media (600px < width <= 1024px)', $queries['tablet'] );
		$this->assertSame( '@media (width <= 600px)', $queries['mobile'] );
	}

	/**
	 * The thumbnails are a strip of buttons naming a slide each, in the order
	 * the slides are in - an item with no picture keeps its place, or every
	 * press after it would reach the wrong slide.
	 *
	 * @return void
	 */
	public function test_the_thumbnails_name_every_slide_in_order() {
		$output = $this->render_loop(
			'<!-- wp:visual-portfolio/item-image /-->',
			array( 'layoutType' => 'carousel' ),
			'<!-- wp:visual-portfolio/loop-carousel-thumbnails /-->'
		);

		// Five items, five thumbnails, numbered from zero.
		$this->assertSame( 5, substr_count( $output, 'vp-block-loop-carousel-thumb"' ) );

		foreach ( range( 0, 4 ) as $index ) {
			$this->assertStringContainsString( 'data-vp-slide="' . $index . '"', $output );
		}

		$this->assertStringContainsString( 'data-wp-on--click="actions.carouselGoTo"', $output );
		$this->assertStringContainsString( '--vp-carousel-thumb-height:72px', $output );

		// Switched off until a carousel is running under it, like every other
		// control.
		$this->assertStringContainsString( 'vp-carousel-control-idle', $output );
	}

	/**
	 * The progress bar can be dragged, so it is a slider and not a progress
	 * bar: ARIA gives `progressbar` no way to set a value, and nothing would
	 * offer a visitor the arrow keys it answers to.
	 *
	 * @return void
	 */
	public function test_the_progress_bar_is_a_slider() {
		$output = $this->render_loop(
			'<!-- wp:visual-portfolio/item-image /-->',
			array( 'layoutType' => 'carousel' ),
			'<!-- wp:visual-portfolio/loop-carousel-indicator {"indicator":"progress"} /-->'
		);

		$this->assertStringContainsString( 'role="slider"', $output );
		$this->assertStringNotContainsString( 'role="progressbar"', $output );
		$this->assertStringContainsString( 'aria-orientation="horizontal"', $output );
		$this->assertStringContainsString( 'aria-valuemin="0"', $output );
		$this->assertStringContainsString( 'aria-valuemax="100"', $output );
		$this->assertStringContainsString( 'data-vp-position-label', $output );

		// Focusable without a script running is safe: every control is
		// rendered switched off, and a control that is not drawn cannot take
		// focus.
		$this->assertStringContainsString( 'tabindex="0"', $output );
		$this->assertStringContainsString( 'vp-carousel-control-idle', $output );
	}

	/**
	 * A bar that may not be dragged is a progress bar again: nothing offers a
	 * visitor keys it does not answer.
	 *
	 * @return void
	 */
	public function test_a_progress_bar_that_cannot_be_dragged_is_not_a_slider() {
		$output = $this->render_loop(
			'<!-- wp:visual-portfolio/item-image /-->',
			array( 'layoutType' => 'carousel' ),
			'<!-- wp:visual-portfolio/loop-carousel-indicator {"indicator":"progress","isDraggable":false} /-->'
		);

		$this->assertStringContainsString( 'role="progressbar"', $output );
		$this->assertStringNotContainsString( 'role="slider"', $output );
		$this->assertStringNotContainsString( 'is-draggable', $output );

		// The carousel itself is still reachable by keyboard; the bar is not.
		$this->assertSame( 1, substr_count( $output, 'tabindex' ) );
	}

	/**
	 * The play and pause button carries both of its names on the markup, so
	 * the module needs no translations of its own, and is rendered as though
	 * the carousel were running.
	 *
	 * @return void
	 */
	public function test_the_play_and_pause_button_carries_both_of_its_names() {
		$output = $this->render_loop(
			'<!-- wp:visual-portfolio/item-image /-->',
			array(
				'layoutType'       => 'carousel',
				'carouselAutoplay' => true,
			),
			'<!-- wp:visual-portfolio/loop-carousel-autoplay /-->'
		);

		$this->assertStringContainsString( 'data-wp-on--click="actions.carouselAutoplayToggle"', $output );
		$this->assertStringContainsString( 'data-vp-play-label', $output );
		$this->assertStringContainsString( 'data-vp-pause-label', $output );

		// Switched off until a carousel is running under it, like every other
		// control - and a carousel with no autoplay never wakes this one.
		$this->assertStringContainsString( 'vp-carousel-control-idle', $output );
	}

	/**
	 * The settings of the button become classes, the way an arrow's do.
	 *
	 * @return void
	 */
	public function test_the_play_and_pause_button_settings_become_classes() {
		$output = $this->render_loop(
			'<!-- wp:visual-portfolio/item-image /-->',
			array(
				'layoutType'       => 'carousel',
				'carouselAutoplay' => true,
			),
			'<!-- wp:visual-portfolio/loop-carousel-autoplay {"icon":"play-stop","showOnHover":true} /-->'
		);

		$this->assertStringContainsString( 'has-stop-icon', $output );
		$this->assertStringContainsString( 'is-shown-on-hover', $output );
	}

	/**
	 * The counter is rendered as an empty pair of numbers, and out of the
	 * reach of a screen reader: the arrows and the dots already say where the
	 * carousel is.
	 *
	 * @return void
	 */
	public function test_a_counter_is_rendered_empty_and_hidden_from_a_reader() {
		$output = $this->render_loop(
			'<!-- wp:visual-portfolio/item-image /-->',
			array( 'layoutType' => 'carousel' ),
			'<!-- wp:visual-portfolio/loop-carousel-indicator {"indicator":"counter"} /-->'
		);

		$this->assertStringContainsString( 'vp-block-loop-carousel-indicator--counter', $output );
		$this->assertStringContainsString( 'aria-hidden="true"', $output );
		$this->assertStringContainsString( '<span class="vp-block-loop-carousel-counter-current"></span>', $output );
		$this->assertStringContainsString( '<span class="vp-block-loop-carousel-counter-total"></span>', $output );

		// Switched off until a carousel is running under it, like every other
		// control.
		$this->assertStringContainsString( 'vp-carousel-control-idle', $output );
	}

	/**
	 * How many slides an arrow moves is written only when it is not the one
	 * slide a carousel has always moved, so the markup of a gallery already
	 * published stays exactly as it was.
	 *
	 * @return void
	 */
	public function test_a_step_of_one_writes_nothing_and_a_bigger_step_writes_itself() {
		$plain = $this->render_loop(
			'<!-- wp:visual-portfolio/item-image /-->',
			array( 'layoutType' => 'carousel' )
		);

		$this->assertStringNotContainsString( 'data-vp-carousel-group', $plain );

		$grouped = $this->render_loop(
			'<!-- wp:visual-portfolio/item-image /-->',
			array(
				'layoutType'             => 'carousel',
				'carouselSlidesPerGroup' => 4,
			)
		);

		$this->assertStringContainsString( 'data-vp-carousel-group="4"', $grouped );

		// Zero asks for a whole screen, which the module measures.
		$screen = $this->render_loop(
			'<!-- wp:visual-portfolio/item-image /-->',
			array(
				'layoutType'             => 'carousel',
				'carouselSlidesPerGroup' => 0,
			)
		);

		$this->assertStringContainsString( 'data-vp-carousel-group="0"', $screen );
	}

	/**
	 * A slide takes the height it was given, and the blocks inside it fill
	 * that height rather than sitting at the top of it.
	 *
	 * @return void
	 */
	public function test_a_slide_takes_a_height_and_its_blocks_fill_it() {
		$output = $this->render_loop(
			'<!-- wp:visual-portfolio/item-image /-->',
			array(
				'layoutType'            => 'carousel',
				'carouselSlideHeight'   => '420px',
				'carouselStretchSlides' => true,
			)
		);

		$this->assertStringContainsString( '--vp-carousel-slide-height:420px', $output );
		$this->assertStringContainsString( 'vp-carousel-stretch-slides', $output );
	}

	/**
	 * The height is typed, so it is reduced to what a CSS length can be made
	 * of before it reaches an inline style, and nothing is printed when there
	 * is nothing usable left.
	 *
	 * @return void
	 */
	public function test_a_typed_slide_height_is_reduced_to_a_length() {
		$output = $this->render_loop(
			'<!-- wp:visual-portfolio/item-image /-->',
			array(
				'layoutType'          => 'carousel',
				'carouselSlideHeight' => '420px;background:url(javascript:alert(1))',
			)
		);

		// What is left is a nonsense identifier rather than a declaration:
		// with no colon, no brackets and no semicolon there is nothing to end
		// the height with and nothing to fetch.
		$this->assertStringContainsString(
			'--vp-carousel-slide-height:420pxbackgroundurljavascriptalert1',
			$output
		);
		$this->assertStringNotContainsString( 'url(', $output );
		$this->assertStringNotContainsString( 'javascript:', $output );

		$empty = $this->render_loop(
			'<!-- wp:visual-portfolio/item-image /-->',
			array(
				'layoutType'          => 'carousel',
				'carouselSlideHeight' => '',
			)
		);

		$this->assertStringNotContainsString( '--vp-carousel-slide-height', $empty );
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
			'<!-- wp:visual-portfolio/item-image /--><!-- wp:visual-portfolio/loop-carousel-nav {"showOnHover":true} --><!-- wp:visual-portfolio/loop-carousel-previous {"icon":"arrow","className":"is-style-filled"} /--><!-- wp:visual-portfolio/loop-carousel-next /--><!-- /wp:visual-portfolio/loop-carousel-nav --><!-- wp:visual-portfolio/loop-carousel-indicator {"className":"is-style-filled"} /-->',
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
		$this->assertStringContainsString( 'vp-block-loop-carousel-previous has-arrow-icon', $output );
		$this->assertStringContainsString( 'is-style-filled', $output );
		$this->assertSame( 2, substr_count( $output, 'is-style-filled' ) );
	}

	/**
	 * A carousel that repeats loads the slides at its seam up front: they are
	 * shown before the first slide, moved there by a transform, where nothing
	 * that loads an image on sight looks. The rest load as they always did.
	 *
	 * @return void
	 */
	public function test_a_repeating_carousel_loads_the_slides_at_its_seam_up_front() {
		$output = $this->render_loop(
			'<!-- wp:visual-portfolio/item-image /-->',
			array(
				'layoutType'     => 'carousel',
				'carouselRepeat' => true,
			)
		);

		// Three across, so the seam holds three slides: half a screenful and
		// one more. With five images that is the last three, plus the two of
		// the first row that are not among them.
		$this->assertSame( 5, substr_count( $output, 'loading="eager"' ) );
		$this->assertSame( 3, substr_count( $output, 'data-skip-lazy' ) );

		// The seam is at the end of the list, so the first slide is never one
		// of them - it is the one the others are drawn in front of.
		$first = strpos( $output, 'wp-block-visual-portfolio-item-template__item' );
		$second = strpos( $output, 'wp-block-visual-portfolio-item-template__item', $first + 1 );

		$this->assertGreaterThan( $second, strpos( $output, 'data-skip-lazy' ) );
	}

	/**
	 * The seam is sized by the frame and not by the gallery, so a long
	 * carousel does not load every image it has.
	 *
	 * @return void
	 */
	public function test_the_seam_is_sized_by_the_frame_rather_than_the_gallery() {
		$narrow = $this->render_loop(
			'<!-- wp:visual-portfolio/item-image /-->',
			array(
				'layoutType'        => 'carousel',
				'layoutColumnsMode' => 'manual',
				'layoutColumnCount' => 1,
				'carouselRepeat'    => true,
			)
		);

		// One slide across: the seam is the last two.
		$this->assertSame( 2, substr_count( $narrow, 'data-skip-lazy' ) );

		$wide = $this->render_loop(
			'<!-- wp:visual-portfolio/item-image /-->',
			array(
				'layoutType'        => 'carousel',
				'layoutColumnsMode' => 'manual',
				'layoutColumnCount' => 4,
				'carouselRepeat'    => true,
			)
		);

		// Four across, so three.
		$this->assertSame( 3, substr_count( $wide, 'data-skip-lazy' ) );

		// A carousel that does not repeat has no seam at all.
		$plain = $this->render_loop(
			'<!-- wp:visual-portfolio/item-image /-->',
			array( 'layoutType' => 'carousel' )
		);

		$this->assertStringNotContainsString( 'data-skip-lazy', $plain );
	}

	/**
	 * Slides of their own width have no step the loop could be counted in,
	 * so the loop is left out for them. Whether the slides fit the frame is
	 * the frame's to say, so five slides at six across still carry the
	 * request: three columns on a desktop are one on a phone.
	 *
	 * @return void
	 */
	public function test_the_loop_is_left_out_where_nothing_can_move_round() {
		$fits = $this->render_loop(
			'<!-- wp:visual-portfolio/item-image /-->',
			array(
				'layoutType'        => 'carousel',
				'layoutColumnsMode' => 'manual',
				'layoutColumnCount' => 6,
				'carouselRepeat'    => true,
			)
		);

		$this->assertStringContainsString( 'data-vp-carousel-repeat="true"', $fits );

		$own_width = $this->render_loop(
			'<!-- wp:visual-portfolio/item-image /-->',
			array(
				'layoutType'        => 'carousel',
				'layoutColumnsMode' => 'manual',
				'layoutColumnCount' => 2,
				'carouselRepeat'    => true,
				'carouselAutoWidth' => true,
			)
		);

		$this->assertStringNotContainsString( 'data-vp-carousel-repeat', $own_width );
		$this->assertStringContainsString( 'vp-carousel-auto-width', $own_width );

		$loops = $this->render_loop(
			'<!-- wp:visual-portfolio/item-image /-->',
			array(
				'layoutType'        => 'carousel',
				'layoutColumnsMode' => 'manual',
				'layoutColumnCount' => 2,
				'carouselRepeat'    => true,
			)
		);

		$this->assertStringContainsString( 'data-vp-carousel-repeat="true"', $loops );
	}

	/**
	 * Each axis of the gap is one length however the editor stored it: the
	 * columns in `--vp-layout-gap`, the rows in `--vp-layout-row-gap`, a zero
	 * with a unit, a preset as the theme's variable.
	 *
	 * @return void
	 */
	public function test_the_gap_is_printed_per_axis() {
		$axial = $this->render_loop(
			'<!-- wp:visual-portfolio/item-image /-->',
			array(
				'layoutColumnsMode' => 'manual',
				'layoutColumnCount' => 3,
				'style'             => array( 'spacing' => array( 'blockGap' => array( 'top' => '2.5rem', 'left' => '3rem' ) ) ),
			)
		);

		$this->assertStringContainsString( '--vp-layout-gap:3rem;--vp-layout-row-gap:2.5rem"', $axial );

		// One value for both axes is the gap of the columns, and the rows
		// follow it without a variable of their own.
		$single = $this->render_loop(
			'<!-- wp:visual-portfolio/item-image /-->',
			array(
				'style' => array( 'spacing' => array( 'blockGap' => '2rem' ) ),
			)
		);

		$this->assertStringContainsString( '--vp-layout-gap:2rem;', $single );
		$this->assertStringNotContainsString( '--vp-layout-row-gap', $single );

		$none = $this->render_loop(
			'<!-- wp:visual-portfolio/item-image /-->',
			array(
				'style' => array( 'spacing' => array( 'blockGap' => '0' ) ),
			)
		);

		$this->assertStringContainsString( '--vp-layout-gap:0px;', $none );

		$preset = $this->render_loop(
			'<!-- wp:visual-portfolio/item-image /-->',
			array(
				'style' => array( 'spacing' => array( 'blockGap' => array( 'left' => 'var:preset|spacing|40' ) ) ),
			)
		);

		$this->assertStringContainsString( '--vp-layout-gap:var(--wp--preset--spacing--40);', $preset );

		// Rows alone: the columns keep the theme's gap.
		$rows = $this->render_loop(
			'<!-- wp:visual-portfolio/item-image /-->',
			array(
				'style' => array( 'spacing' => array( 'blockGap' => array( 'top' => '2.5rem' ) ) ),
			)
		);

		$this->assertStringNotContainsString( '--vp-layout-gap:', $rows );
		$this->assertStringContainsString( '--vp-layout-row-gap:2.5rem', $rows );
	}

	/**
	 * A grid places short items where it is told, and only a grid does: the
	 * other layouts have no rows of items to align.
	 *
	 * @return void
	 */
	public function test_a_grid_aligns_its_items_vertically() {
		$grid = $this->render_loop(
			'<!-- wp:visual-portfolio/item-image /-->',
			array( 'verticalAlignment' => 'center' )
		);

		$this->assertStringContainsString( 'are-vertically-aligned-center', $grid );

		$masonry = $this->render_loop(
			'<!-- wp:visual-portfolio/item-image /-->',
			array(
				'layoutType'        => 'masonry',
				'verticalAlignment' => 'center',
			)
		);

		$this->assertStringNotContainsString( 'are-vertically-aligned', $masonry );

		$unset = $this->render_loop( '<!-- wp:visual-portfolio/item-image /-->' );

		$this->assertStringNotContainsString( 'are-vertically-aligned', $unset );
	}

	/**
	 * A control is taken off a page the way any block is: hidden through the
	 * editor's own block visibility, which the control blocks leave enabled.
	 *
	 * @return void
	 */
	public function test_a_carousel_control_hidden_by_the_editor_renders_nothing() {
		$output = $this->render_loop(
			'<!-- wp:visual-portfolio/item-image /-->',
			array( 'layoutType' => 'carousel' ),
			'<!-- wp:visual-portfolio/loop-carousel-previous {"metadata":{"blockVisibility":false}} /--><!-- wp:visual-portfolio/loop-carousel-next /-->'
		);

		$this->assertStringNotContainsString( 'vp-block-loop-carousel-previous', $output );
		$this->assertStringContainsString( 'vp-block-loop-carousel-next', $output );
	}

	/**
	 * A row whose every control was hidden is not a row at all: the gap its
	 * layout draws and the margin around it would be left behind.
	 *
	 * @return void
	 */
	public function test_an_empty_carousel_nav_renders_nothing() {
		$output = $this->render_loop(
			'<!-- wp:visual-portfolio/item-image /-->',
			array( 'layoutType' => 'carousel' ),
			'<!-- wp:visual-portfolio/loop-carousel-nav --><!-- wp:visual-portfolio/loop-carousel-previous {"metadata":{"blockVisibility":false}} /--><!-- /wp:visual-portfolio/loop-carousel-nav -->'
		);

		$this->assertStringNotContainsString( 'vp-block-loop-carousel-nav', $output );

		$with_control = $this->render_loop(
			'<!-- wp:visual-portfolio/item-image /-->',
			array( 'layoutType' => 'carousel' ),
			'<!-- wp:visual-portfolio/loop-carousel-nav --><!-- wp:visual-portfolio/loop-carousel-previous /--><!-- /wp:visual-portfolio/loop-carousel-nav -->'
		);

		$this->assertStringContainsString( 'vp-block-loop-carousel-nav', $with_control );
	}
}
