<?php
/**
 * Keeps the gallery abilities in step with the Gallery Loop blocks.
 *
 * The blocks change often. Each test here fails when the blocks gain
 * something the abilities have not decided about: an attribute, a layout
 * type, a content source, or a default the editor applies. The failure names
 * what to decide and where.
 *
 * @package Visual Portfolio
 */

require_once dirname( __DIR__ ) . '/trait-loop-blocks.php';

/**
 * Test case for the coverage of Visual_Portfolio_Abilities.
 */
class Test_Class_Abilities_Coverage extends WP_UnitTestCase {
	use Visual_Portfolio_Loop_Blocks_Trait;

	/**
	 * How the abilities treat every attribute of the loop and the item
	 * template: the vocabulary field that carries it, or why none does.
	 *
	 * @var array
	 */
	const ATTRIBUTES = array(
		'loop'          => array(
			'block_id'              => 'gallery_id',
			'queryId'               => 'assigned on write, see get_free_query_id()',
			'queryType'             => 'source.type',
			'baseQuery'             => 'settings.per_page',
			'postsQuery'            => 'source (posts)',
			'imagesQuery'           => 'source.images',
			'sourceQuery'           => 'source.settings',
			'lightbox'              => 'lightbox look stays in the editor; settings.lightbox switches it on',
			'preview_image_example' => 'editor preview only',
			'previewLayout'         => 'editor preview only',
			'extensions'            => 'Pro and extensions, through vpf_gallery_ability_apply',
			'savedLayout'           => 'saved_layout; overrides follow the settings a call changes',
		),
		'item-template' => array(
			'layoutType'                  => 'layout (a pattern); reported as layout_type',
			'layoutColumnsMode'           => 'settings.columns sets manual',
			'layoutColumnCount'           => 'settings.columns',
			'layoutColumnCountTablet'     => 'carried by the layout',
			'layoutColumnCountMobile'     => 'carried by the layout',
			'layoutMinimumColumnWidth'    => 'carried by the layout',
			'layoutAutoFit'               => 'carried by the layout',
			'layoutTiles'                 => 'carried by the layout',
			'layoutTilesTablet'           => 'carried by the layout',
			'layoutTilesMobile'           => 'carried by the layout',
			'verticalAlignment'           => 'carried by the layout',
			'justifiedRowHeight'          => 'carried by the layout',
			'justifiedRowHeightTolerance' => 'carried by the layout',
			'justifiedMaxRowsCount'       => 'carried by the layout',
			'justifiedLastRow'            => 'carried by the layout',
			'carouselAutoWidth'           => 'carried by the layout',
			'carouselSnapAlign'           => 'carried by the layout',
			'carouselFreeScroll'          => 'carried by the layout',
			'carouselEffect'              => 'carried by the layout',
			'carouselRepeat'              => 'carried by the layout',
			'carouselAutoplay'            => 'carried by the layout',
			'carouselAutoplayDelay'       => 'carried by the layout',
			'carouselPeek'                => 'carried by the layout',
			'carouselEdgeFade'            => 'carried by the layout',
			'carouselContainer'           => 'carried by the layout',
			'carouselContainerWidth'      => 'carried by the layout',
			'carouselSlideHeight'         => 'carried by the layout',
			'carouselStretchSlides'       => 'carried by the layout',
			'carouselSlidesPerGroup'      => 'carried by the layout',
			'extensions'                  => 'Pro and extensions, through vpf_gallery_ability_apply',
		),
	);

	/**
	 * Layout types, and whether `settings.columns` applies to them.
	 *
	 * @var array
	 */
	const LAYOUT_TYPES = array(
		'grid'      => true,
		'masonry'   => true,
		'carousel'  => true,
		'tiles'     => false,
		'justified' => false,
	);

	/**
	 * Skip without the loop family.
	 */
	public function set_up() {
		parent::set_up();
		$this->skip_without_loop_blocks();
	}

	/**
	 * A file of the plugin.
	 *
	 * @param string $path - path from the plugin root.
	 *
	 * @return string
	 */
	private function read( $path ) {
		return (string) file_get_contents( visual_portfolio()->plugin_path . $path ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
	}

	/**
	 * Attributes of a block of the family, from its block.json.
	 *
	 * @param string $block - block folder.
	 *
	 * @return array
	 */
	private function attributes( $block ) {
		return json_decode( $this->read( 'gutenberg/blocks/' . $block . '/block.json' ), true )['attributes'];
	}

	/**
	 * Every attribute of the loop and the item template has a decision.
	 */
	public function test_every_attribute_has_an_ability_decision() {
		foreach ( self::ATTRIBUTES as $block => $decided ) {
			$attributes = array_keys( $this->attributes( $block ) );

			$this->assertSame(
				array(),
				array_values( array_diff( $attributes, array_keys( $decided ) ) ),
				"New attributes on `$block`: decide how AI agents reach them. Add them to the vocabulary in classes/class-loop-gallery.php, or list them in ATTRIBUTES here with the reason they stay out."
			);
			$this->assertSame(
				array(),
				array_values( array_diff( array_keys( $decided ), $attributes ) ),
				"Attributes gone from `$block`: remove them from ATTRIBUTES here and from the abilities that read them."
			);
		}
	}

	/**
	 * Every layout type is known, with or without columns.
	 */
	public function test_every_layout_type_is_known() {
		$types = $this->attributes( 'item-template' )['layoutType']['enum'];

		$this->assertEqualsCanonicalizing(
			array_keys( self::LAYOUT_TYPES ),
			$types,
			'A layout type changed: decide whether settings.columns applies to it (Visual_Portfolio_Loop_Gallery::NO_COLUMNS) and update LAYOUT_TYPES here.'
		);

		foreach ( self::LAYOUT_TYPES as $type => $has_columns ) {
			$this->assertSame( ! $has_columns, in_array( $type, Visual_Portfolio_Loop_Gallery::NO_COLUMNS, true ), $type );
		}
	}

	/**
	 * Every source the editor's picker offers is a source of the abilities.
	 */
	public function test_every_editor_source_is_in_the_vocabulary() {
		$names = array();

		foreach ( glob( visual_portfolio()->plugin_path . 'gutenberg/loop-sources/*.js' ) as $file ) {
			$script = (string) file_get_contents( $file ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents

			// A source registered with its name written in the call.
			preg_match_all( "/registerLoopSource\\(\\s*\\{\\s*name:\\s*'([^']+)'/", $script, $found );
			$names = array_merge( $names, $found[1] );

			// The Pro sources, registered from a list for the teasers.
			if ( preg_match( '/const PRO_SOURCES = \\[(.*?)\\n\\];/s', $script, $list ) ) {
				preg_match_all( "/^\\t\\tname: '([^']+)'/m", $list[1], $found );
				$names = array_merge( $names, $found[1] );
			}
		}

		$this->assertEqualsCanonicalizing( array( 'images', 'posts', 'taxonomies', 'social-stream' ), array_intersect( $names, array( 'images', 'posts', 'taxonomies', 'social-stream' ) ), 'The source scan no longer finds the known sources: fix the patterns above.' );
		$this->assertSame(
			array(),
			array_values( array_diff( $names, array_keys( Visual_Portfolio_Loop_Gallery::get_vocabulary()['sources'] ) ) ),
			'The editor offers a source the abilities do not list: add it to Visual_Portfolio_Loop_Gallery::get_vocabulary().'
		);
	}

	/**
	 * The defaults the abilities apply name the same blocks the editor's
	 * setup does (`gutenberg/blocks/loop/layout-defaults.js`).
	 */
	public function test_layout_defaults_match_the_editor() {
		$script = $this->read( 'gutenberg/blocks/loop/layout-defaults.js' );

		$this->assertSame(
			'f2740c09987dfc2070ec8fb65b10cd6e06196b0f',
			sha1( $script ),
			'gutenberg/blocks/loop/layout-defaults.js changed: make Visual_Portfolio_Loop_Gallery::apply_layout_defaults() do the same, then put the new sha1 of the file here.'
		);

		preg_match( "/PAGINATION_NAME = '([^']+)'/", $script, $pagination );
		preg_match( '/CLICKABLE_NAMES = \\[([^\\]]+)\\]/', $script, $clickable );
		preg_match_all( "/'([^']+)'/", $clickable[1], $clickable_names );

		$this->assertSame( Visual_Portfolio_Loop_Gallery::PAGINATION, $pagination[1] );
		$this->assertSame( Visual_Portfolio_Loop_Gallery::CLICKABLE, $clickable_names[1] );
	}
}
