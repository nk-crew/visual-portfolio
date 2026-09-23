<?php
/**
 * Tests for the two ways the filter and the sort show their choices: as links,
 * and as a select in a form that works without JavaScript.
 *
 * @package Visual Portfolio
 */

/**
 * Loop controls display test case.
 */
class ClassLoopControlsDisplay extends WP_UnitTestCase {
	use Visual_Portfolio_Loop_Blocks_Trait;

	/**
	 * Images of the source, three in Nature and two in City.
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
		foreach ( array( 'Nature', 'City', 'Nature', 'City', 'Nature' ) as $index => $category ) {
			self::$images[] = array(
				'id'         => self::factory()->attachment->create_upload_object( dirname( __DIR__ ) . '/fixtures/image.png' ),
				'title'      => 'Image ' . ( $index + 1 ),
				'categories' => array( $category ),
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
	 * Forget the state of the previous request.
	 *
	 * @return void
	 */
	public function tear_down() {
		unset( $_GET['vp-1-filter'], $_GET['vp-1-sort'] );

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
	 * Render the gallery with the given controls before its items.
	 *
	 * @param string $controls - serialized control blocks.
	 *
	 * @return string
	 */
	private function render_loop( $controls ) {
		$loop = array(
			'block_id'    => 'controls-test',
			'queryId'     => 1,
			'queryType'   => 'images',
			'baseQuery'   => array( 'perPage' => 10 ),
			'imagesQuery' => array( 'images' => self::$images ),
		);

		$this->reset_loop_state();

		return do_blocks(
			sprintf(
				'<!-- wp:visual-portfolio/loop %1$s --><div class="wp-block-visual-portfolio-loop vp-block-loop">%2$s<!-- wp:visual-portfolio/item-template --><!-- wp:visual-portfolio/item-title /--><!-- /wp:visual-portfolio/item-template --></div><!-- /wp:visual-portfolio/loop -->',
				wp_json_encode( $loop ),
				$controls
			)
		);
	}

	/**
	 * Options of the select that writes the given parameter.
	 *
	 * @param string $html - rendered page.
	 * @param string $name - parameter the select writes.
	 *
	 * @return array Options as `[ value, text, selected ]`.
	 */
	private function get_options( $html, $name ) {
		preg_match( '/<select name="' . preg_quote( $name, '/' ) . '"[^>]*>(.*?)<\/select>/s', $html, $select );
		preg_match_all( '/<option [^>]*value="([^"]*)"([^>]*)>([^<]*)<\/option>/', $select[1] ?? '', $matches, PREG_SET_ORDER );

		return array_map(
			static function ( $match ) {
				return array( $match[1], html_entity_decode( $match[3] ), false !== strpos( $match[2], 'selected' ) );
			},
			$matches
		);
	}

	/**
	 * A filter shown as a dropdown lists its items as options, in their order
	 * and with their labels and counts, leaves hidden ones out, and marks the
	 * active one.
	 *
	 * @return void
	 */
	public function test_a_filter_shown_as_a_dropdown_lists_its_items() {
		$filter = '<!-- wp:visual-portfolio/loop-filter {"displayAsDropdown":true,"showCount":true} -->'
			. '<!-- wp:visual-portfolio/loop-filter-item {"text":"All"} /-->'
			. '<!-- wp:visual-portfolio/loop-filter-item {"text":"Outdoors","filter":"nature"} /-->'
			. '<!-- wp:visual-portfolio/loop-filter-item {"text":"City","filter":"city","metadata":{"blockVisibility":false}} /-->'
			. '<!-- /wp:visual-portfolio/loop-filter -->';

		$html = $this->render_loop( $filter );

		$this->assertSame(
			array(
				array( '', 'All', true ),
				array( 'nature', 'Outdoors (3)', false ),
			),
			$this->get_options( $html, 'vp-1-filter' )
		);
		$this->assertStringContainsString( 'class="vp-block-loop-filter__submit"', $html );
		$this->assertStringNotContainsString( 'vp-block-loop-filter-item', $html );

		$_GET['vp-1-filter'] = 'nature';

		$this->assertSame(
			array(
				array( '', 'All', false ),
				array( 'nature', 'Outdoors (3)', true ),
			),
			$this->get_options( $this->render_loop( $filter ), 'vp-1-filter' )
		);
	}

	/**
	 * Without "All" a dropdown asks for a category until one is chosen, so the
	 * first category is not shown as chosen, and can still be picked.
	 *
	 * @return void
	 */
	public function test_a_dropdown_without_all_asks_for_a_category() {
		$filter = '<!-- wp:visual-portfolio/loop-filter {"displayAsDropdown":true,"showAllItem":false} /-->';

		$this->assertSame(
			array(
				array( '', 'Select category', true ),
				array( 'nature', 'Nature', false ),
				array( 'city', 'City', false ),
			),
			$this->get_options( $this->render_loop( $filter ), 'vp-1-filter' )
		);

		$_GET['vp-1-filter'] = 'city';

		$this->assertSame(
			array(
				array( 'nature', 'Nature', false ),
				array( 'city', 'City', true ),
			),
			$this->get_options( $this->render_loop( $filter ), 'vp-1-filter' )
		);
	}

	/**
	 * The "All" option of a dropdown submits an empty filter without
	 * JavaScript, which shows every item.
	 *
	 * @return void
	 */
	public function test_an_empty_filter_shows_every_item() {
		$_GET['vp-1-filter'] = '';

		$this->assertSame( 5, preg_match_all( '/<li [^>]*wp-block-visual-portfolio-item-template__item/', $this->render_loop( '' ) ) );
	}

	/**
	 * A sort shown as links marks the active order as text and links the
	 * others.
	 *
	 * @return void
	 */
	public function test_a_sort_shown_as_links_marks_the_active_order() {
		$sort = '<!-- wp:visual-portfolio/loop-sort {"displayAsDropdown":false,"options":["","title"]} /-->';

		$this->assertMatchesRegularExpression(
			'/<nav [^>]*aria-label="Sort items"[^>]*><span aria-current="page" class="vp-block-loop-sort__item is-active">Default sorting<\/span><a href="[^"]*vp-1-sort=title" class="vp-block-loop-sort__item" [^>]*data-wp-on--click="actions.navigate">Sort by title \(A-Z\)<\/a><\/nav>/',
			$this->render_loop( $sort )
		);

		$_GET['vp-1-sort'] = 'title';

		$this->assertMatchesRegularExpression(
			'/<a href="[^"]*" class="vp-block-loop-sort__item" [^>]*>Default sorting<\/a><span aria-current="page" class="vp-block-loop-sort__item is-active">Sort by title \(A-Z\)<\/span>/',
			$this->render_loop( $sort )
		);
	}

	/**
	 * A sort select without the default order asks for an order while none is
	 * chosen, so its first order can still be picked.
	 *
	 * @return void
	 */
	public function test_a_sort_without_the_default_order_asks_for_one() {
		$sort = '<!-- wp:visual-portfolio/loop-sort {"options":["title","title_desc"]} /-->';

		$this->assertSame(
			array(
				array( '', 'Select sorting', true ),
				array( 'title', 'Sort by title (A-Z)', false ),
				array( 'title_desc', 'Sort by title (Z-A)', false ),
			),
			$this->get_options( $this->render_loop( $sort ), 'vp-1-sort' )
		);

		$_GET['vp-1-sort'] = 'title';

		$this->assertSame(
			array(
				array( 'title', 'Sort by title (A-Z)', true ),
				array( 'title_desc', 'Sort by title (Z-A)', false ),
			),
			$this->get_options( $this->render_loop( $sort ), 'vp-1-sort' )
		);
	}

	/**
	 * Blocks saved before the setting existed keep their look: the filter as
	 * links, the sort as a select.
	 *
	 * @return void
	 */
	public function test_saved_controls_keep_their_look() {
		$html = $this->render_loop( '<!-- wp:visual-portfolio/loop-filter /--><!-- wp:visual-portfolio/loop-sort /-->' );

		$this->assertMatchesRegularExpression( '/<nav [^>]*class="[^"]*vp-block-loop-filter[^"]*"[^>]*>.*?<a [^>]*class="[^"]*vp-block-loop-filter-item/s', $html );
		$this->assertCount( 5, $this->get_options( $html, 'vp-1-sort' ) );
	}
}
