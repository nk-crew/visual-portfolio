<?php
/**
 * Tests for what the Gallery Loop family hands to the outside: the texts WPML
 * translates, the pattern category a white label renames, the translations of
 * the editor scripts, and the prefetch switch.
 *
 * @package Visual Portfolio
 */

/**
 * Loop integrations test case.
 */
class ClassLoopIntegrations extends WP_UnitTestCase {
	use Visual_Portfolio_Loop_Blocks_Trait;

	/**
	 * Scripts registry before the test replaced it.
	 *
	 * @var WP_Scripts|null
	 */
	private $scripts;

	/**
	 * Skip where the family is not registered.
	 *
	 * @return void
	 */
	public function set_up() {
		parent::set_up();

		$this->skip_without_loop_blocks();

		// Pro turns prefetching on; these tests say for themselves whether
		// anything does.
		remove_all_filters( 'vpf_loop_prefetch' );

		$this->scripts = $GLOBALS['wp_scripts'] ?? null;
	}

	/**
	 * Put back the scripts registry and the screen.
	 *
	 * @return void
	 */
	public function tear_down() {
		$GLOBALS['wp_scripts'] = $this->scripts;

		set_current_screen( 'front' );

		parent::tear_down();
	}

	/**
	 * Every text a user writes into a loop block is listed for WPML, nested keys
	 * the way the classic block's images are.
	 *
	 * @return void
	 */
	public function test_wpml_config_lists_the_texts_of_the_loop_blocks() {
		$xml = simplexml_load_file( visual_portfolio()->plugin_path . 'wpml-config.xml' );

		$this->assertInstanceOf( SimpleXMLElement::class, $xml );

		$keys = array();

		foreach ( $xml->xpath( '/wpml-config/gutenberg-blocks/gutenberg-block' ) as $block ) {
			$type = (string) $block['type'];

			if ( 0 !== strpos( $type, 'visual-portfolio/' ) || 'visual-portfolio/block' === $type ) {
				continue;
			}

			$this->assertSame( '1', (string) $block['translate'], $type );

			foreach ( $block->xpath( './/key[not(key)]' ) as $leaf ) {
				$path = array();

				foreach ( $leaf->xpath( 'ancestor-or-self::key' ) as $key ) {
					$path[] = (string) $key['name'];
				}

				$keys[ $type ][] = implode( '.', $path );
			}
		}

		$this->assertSame(
			array(
				'visual-portfolio/loop'                     => array(
					'imagesQuery.images.*.title',
					'imagesQuery.images.*.description',
					'imagesQuery.images.*.alt',
					'imagesQuery.images.*.author',
					'imagesQuery.images.*.categories',
				),
				'visual-portfolio/loop-filter-item'         => array( 'text' ),
				'visual-portfolio/loop-sort'                => array( 'labels.*' ),
				'visual-portfolio/loop-search'              => array( 'placeholder', 'label' ),
				'visual-portfolio/loop-pagination-next'     => array( 'label' ),
				'visual-portfolio/loop-pagination-previous' => array( 'label' ),
				'visual-portfolio/loop-pagination-trigger'  => array( 'label', 'loadingLabel' ),
				'visual-portfolio/item-read-more'           => array( 'text' ),
				'visual-portfolio/item-meta'                => array( 'prefix', 'suffix' ),
				'visual-portfolio/item-author'              => array( 'prefix' ),
				'visual-portfolio/item-categories'          => array( 'separator' ),
				'visual-portfolio/item-date'                => array( 'format' ),
			),
			$keys
		);
	}

	/**
	 * The pattern category carries the name a white label gave the plugin.
	 *
	 * @return void
	 */
	public function test_pattern_category_follows_the_plugin_name() {
		$name = visual_portfolio()->plugin_name;

		visual_portfolio()->plugin_name = 'Acme Galleries';

		try {
			( new Visual_Portfolio_Gutenberg() )->register_block_patterns();

			$category = WP_Block_Pattern_Categories_Registry::get_instance()->get_registered( 'visual-portfolio' );

			$this->assertSame( 'Acme Galleries', $category['label'] );
		} finally {
			visual_portfolio()->plugin_name = $name;

			( new Visual_Portfolio_Gutenberg() )->register_block_patterns();
		}
	}

	/**
	 * The editor scripts load their JSON translations, from the plugin's own
	 * folder first and the language packs after it.
	 *
	 * @return void
	 */
	public function test_editor_scripts_load_their_translations() {
		$GLOBALS['wp_scripts'] = new WP_Scripts();

		set_current_screen( 'post' );
		add_filter( 'should_load_block_editor_scripts_and_styles', '__return_true' );

		( new Visual_Portfolio_Gutenberg() )->enqueue_block_editor_assets();

		foreach ( array( 'visual-portfolio-gutenberg', 'visual-portfolio-gutenberg-custom-post-meta' ) as $handle ) {
			$script = wp_scripts()->registered[ $handle ];

			$this->assertSame( 'visual-portfolio', $script->textdomain, $handle );
			$this->assertSame( visual_portfolio()->plugin_path . 'languages', $script->translations_path, $handle );
		}
	}

	/**
	 * Render a loop that has an id, so the store is attached to it.
	 *
	 * @return string
	 */
	private function render_loop() {
		return do_blocks(
			sprintf(
				'<!-- wp:visual-portfolio/loop %s --><div class="wp-block-visual-portfolio-loop vp-block-loop"></div><!-- /wp:visual-portfolio/loop -->',
				wp_json_encode(
					array(
						'block_id'  => 'prefetch-test',
						'queryId'   => 1,
						'queryType' => 'images',
					)
				)
			)
		);
	}

	/**
	 * A loop prefetches only where the site says so, and the site is asked with
	 * the options of that loop.
	 *
	 * @return void
	 */
	public function test_prefetch_is_on_only_when_the_filter_says_so() {
		$html = $this->render_loop();

		$this->assertStringContainsString( 'data-wp-router-region="vp-loop-prefetch-test"', $html );
		$this->assertStringNotContainsString( 'initPrefetch', $html );

		$handed = null;

		add_filter(
			'vpf_loop_prefetch',
			function ( $prefetch, $options ) use ( &$handed ) {
				$handed = $options;

				return $prefetch;
			},
			10,
			2
		);

		$this->assertStringNotContainsString( 'initPrefetch', $this->render_loop() );
		$this->assertSame( 'images', $handed['content_source'] );

		add_filter( 'vpf_loop_prefetch', '__return_true', 20 );

		$this->assertStringContainsString( 'data-wp-init---prefetch="callbacks.initPrefetch"', $this->render_loop() );
	}
}
