<?php
/**
 * Tests for the Gallery Search block and the term it hands to the query: read
 * only when an extension applies it, rendered only where it can search.
 *
 * @package Visual Portfolio
 */

/**
 * Loop search test case.
 */
class ClassLoopSearch extends WP_UnitTestCase {
	use Visual_Portfolio_Loop_Blocks_Trait;

	/**
	 * Images of the source.
	 *
	 * @var array
	 */
	private static $images = array();

	/**
	 * What the query filters were handed as `loop_search`, by filter.
	 *
	 * @var array
	 */
	private $handed = array();

	/**
	 * Options the query filters were handed last.
	 *
	 * @var array
	 */
	private $options = array();

	/**
	 * Create the attachments once for the whole case.
	 *
	 * @return void
	 */
	public static function wpSetUpBeforeClass() {
		foreach ( array( 'Forest', 'City', 'Forest path' ) as $title ) {
			self::$images[] = array(
				'id'    => self::factory()->attachment->create_upload_object( dirname( __DIR__ ) . '/fixtures/image.png' ),
				'title' => $title,
			);
		}
	}

	/**
	 * Skip where the family is not registered, and listen to the query filters.
	 *
	 * @return void
	 */
	public function set_up() {
		parent::set_up();

		$this->skip_without_loop_blocks();

		// Pro handles the search; these tests say for themselves whether
		// anything does.
		remove_all_filters( 'vpf_loop_search' );

		$this->handed = array();

		foreach ( array( 'vpf_extend_options_before_query_args', 'vpf_extend_query_args' ) as $hook ) {
			add_filter(
				$hook,
				function ( $value, $options = null ) use ( $hook ) {
					$options = 'vpf_extend_query_args' === $hook ? $options : $value;

					$this->handed[ $hook ] = $options['loop_search'] ?? null;
					$this->options         = $options;

					return $value;
				},
				10,
				2
			);
		}
	}

	/**
	 * Forget the state of the previous request.
	 *
	 * @return void
	 */
	public function tear_down() {
		unset( $_GET['vp-1-search'], $_GET['vp-1-page'], $_GET['vp-1-sort'], $_GET['vp-2-page'], $_GET['vp_search'] );

		parent::tear_down();
	}

	/**
	 * Render a gallery of the images with the given search block before its
	 * items.
	 *
	 * @param string $search - serialized search block.
	 *
	 * @return string
	 */
	private function render_loop( $search = '<!-- wp:visual-portfolio/loop-search /-->' ) {
		$property = new ReflectionProperty( 'Visual_Portfolio_Get', 'loop_items_cache' );

		if ( method_exists( $property, 'setAccessible' ) ) {
			$property->setAccessible( true );
		}

		$property->setValue( null, array() );

		$loop = array(
			'block_id'    => 'search-test',
			'queryId'     => 1,
			'queryType'   => 'images',
			'baseQuery'   => array( 'perPage' => 10 ),
			'imagesQuery' => array( 'images' => self::$images ),
		);

		return do_blocks(
			sprintf(
				'<!-- wp:visual-portfolio/loop %1$s --><div class="wp-block-visual-portfolio-loop vp-block-loop">%2$s<!-- wp:visual-portfolio/item-template --><!-- wp:visual-portfolio/item-title /--><!-- /wp:visual-portfolio/item-template --></div><!-- /wp:visual-portfolio/loop -->',
				wp_json_encode( $loop ),
				$search
			)
		);
	}

	/**
	 * Render the search block alone, in the context of a loop.
	 *
	 * @param array $context - block context.
	 *
	 * @return string
	 */
	private function render_search( $context ) {
		$block = new WP_Block(
			array(
				'blockName'    => 'visual-portfolio/loop-search',
				'attrs'        => array(),
				'innerBlocks'  => array(),
				'innerHTML'    => '',
				'innerContent' => array(),
			),
			$context
		);

		return $block->render();
	}

	/**
	 * Without an extension that applies it, the block renders nothing and the
	 * term reaches no query. The extension is what turns both on.
	 *
	 * @return void
	 */
	public function test_without_an_extension_a_search_changes_nothing() {
		$_GET['vp-1-search'] = 'Forest';

		$html = $this->render_loop();

		$this->assertStringNotContainsString( 'vp-block-loop-search', $html );
		$this->assertSame( 3, preg_match_all( '/<li [^>]*wp-block-visual-portfolio-item-template__item/', $html ) );
		$this->assertSame(
			array(
				'vpf_extend_options_before_query_args' => null,
				'vpf_extend_query_args'                => null,
			),
			$this->handed
		);

		add_filter( 'vpf_loop_search', '__return_true' );

		$this->assertStringContainsString( 'vp-block-loop-search', $this->render_loop() );
		$this->assertSame( 'Forest', $this->handed['vpf_extend_query_args'] );
	}

	/**
	 * With an extension, the block is a labelled GET form that holds the
	 * current term and carries every other parameter but the page along.
	 *
	 * @return void
	 */
	public function test_with_an_extension_the_block_is_a_labelled_form() {
		add_filter( 'vpf_loop_search', '__return_true' );

		$_GET['vp-1-search'] = 'Forest "path"';
		$_GET['vp-1-page']   = '2';
		$_GET['vp-1-sort']   = 'title';
		$_GET['vp-2-page']   = '3';

		$html = $this->render_loop( '<!-- wp:visual-portfolio/loop-search {"label":"Find images","placeholder":"Type a name"} /-->' );

		$this->assertMatchesRegularExpression(
			'/<form role="search" method="get" action="[^"?]*" [^>]*class="[^"]*vp-block-loop-search[^"]*"[^>]*data-wp-on--submit="actions.search">(.*?)<label><span class="vp-block-loop-search__label">Find images<\/span><input type="search" class="vp-block-loop-search__input" name="vp-1-search" value="Forest &quot;path&quot;" placeholder="Type a name" maxlength="100" data-wp-on--input="actions.search" data-wp-on--compositionend="actions.search" \/><\/label><\/form>/s',
			$html
		);

		preg_match( '/<form role="search".*?<\/form>/s', $html, $form );
		preg_match_all( '/<input type="hidden" name="([^"]*)" value="([^"]*)" \/>/', $form[0], $hidden, PREG_SET_ORDER );

		$this->assertSame(
			array(
				'vp-1-sort' => 'title',
				'vp-2-page' => '3',
			),
			array_column( $hidden, 2, 1 )
		);
	}

	/**
	 * The term reaches both query filters as `loop_search`, sanitized and cut
	 * to length. A classic gallery is handed nothing, whatever the request.
	 *
	 * @return void
	 */
	public function test_the_term_is_handed_to_the_query_filters() {
		add_filter( 'vpf_loop_search', '__return_true' );

		$_GET['vp-1-search'] = '  <b>Forest</b> ' . str_repeat( 'a', 200 );

		$this->render_loop();

		$expected = 'Forest ' . str_repeat( 'a', 93 );

		$this->assertSame(
			array(
				'vpf_extend_options_before_query_args' => $expected,
				'vpf_extend_query_args'                => $expected,
			),
			$this->handed
		);

		$_GET['vp_search'] = 'Forest';

		Visual_Portfolio_Get::get_query_params( array_diff_key( $this->options, array( 'loop_search' => true ) ) );

		$this->assertNull( $this->handed['vpf_extend_query_args'] );
	}

	/**
	 * Sources with no text to match render no search, and neither does a loop
	 * without a query id, which could only read the parameter every gallery
	 * on the page shares.
	 *
	 * @return void
	 */
	public function test_the_block_renders_only_where_it_can_search() {
		add_filter( 'vpf_loop_search', '__return_true' );

		$this->assertStringContainsString(
			'<form role="search"',
			$this->render_search(
				array(
					'vp/queryId'   => 1,
					'vp/queryType' => 'images',
				)
			)
		);

		foreach ( array( 'social-stream', 'taxonomies' ) as $source ) {
			$this->assertSame(
				'',
				$this->render_search(
					array(
						'vp/queryId'   => 1,
						'vp/queryType' => $source,
					)
				),
				$source
			);
		}

		$this->assertSame( '', $this->render_search( array( 'vp/queryType' => 'images' ) ) );
	}
}
