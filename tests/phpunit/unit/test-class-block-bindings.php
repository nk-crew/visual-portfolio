<?php
/**
 * Tests for the `visual-portfolio/item` block bindings source
 *
 * @package Visual Portfolio
 */

/**
 * Block bindings source test case.
 */
class ClassBlockBindings extends WP_UnitTestCase {
	/**
	 * Attachment the gallery is built from.
	 *
	 * @var int
	 */
	private static $attachment_id = 0;

	/**
	 * Create the attachment shared by the tests.
	 *
	 * @param WP_UnitTest_Factory $factory - test factory.
	 *
	 * @return void
	 */
	public static function wpSetUpBeforeClass( $factory ) {
		self::$attachment_id = $factory->attachment->create_object(
			array(
				'file'           => 'bindings.jpg',
				'post_mime_type' => 'image/jpeg',
			)
		);
	}

	/**
	 * Drop the per-request memo of the pipeline.
	 *
	 * @return void
	 */
	public function tear_down() {
		$property = new ReflectionProperty( 'Visual_Portfolio_Get', 'loop_items_cache' );

		if ( method_exists( $property, 'setAccessible' ) ) {
			$property->setAccessible( true );
		}

		$property->setValue( null, array() );

		parent::tear_down();
	}

	/**
	 * The registered source, or null when the family is not registered.
	 *
	 * @return WP_Block_Bindings_Source|null
	 */
	private function get_source() {
		return get_block_bindings_source( Visual_Portfolio_Block_Bindings::SOURCE );
	}

	/**
	 * A block instance carrying the given context.
	 *
	 * @param array $context - block context.
	 *
	 * @return WP_Block
	 */
	private function get_block( $context ) {
		$block = new WP_Block(
			array(
				'blockName' => 'core/paragraph',
				'attrs'     => array(),
			),
			$context
		);

		// WordPress copies the keys a source declares out of the available
		// context and into the block context right before it asks the source
		// for a value. A bare Paragraph declares no context of its own, so
		// without this the block would arrive here empty.
		$block->context = $context;

		return $block;
	}

	/**
	 * The source exists wherever the loop family does.
	 *
	 * @return void
	 */
	public function test_source_is_registered() {
		$this->assertSame(
			visual_portfolio()->supports_loop_blocks(),
			null !== $this->get_source()
		);
	}

	/**
	 * The source asks for every context key an item can carry.
	 *
	 * Only the declared keys reach `$block->context`, so a key the item template
	 * maps and the source does not declare is a value nothing can bind to.
	 *
	 * @return void
	 */
	public function test_uses_context_covers_the_item_context() {
		$mapped = array_keys(
			Visual_Portfolio_Block_Item_Template::map_item_to_context(
				array( 'uid' => 'item-1' ),
				array( 'content_source' => 'images' )
			)
		);

		$declared = Visual_Portfolio_Block_Item_Template::get_context_keys();

		$this->assertSame( array(), array_diff( $mapped, $declared ) );
		$this->assertSame( $declared, $this->get_source()->uses_context );
	}

	/**
	 * The unprefixed name of an item value is what a binding carries.
	 *
	 * @return void
	 */
	public function test_value_is_read_by_the_short_key() {
		$block = $this->get_block(
			array(
				'vp/itemTitle'  => 'Gallery item',
				'vp/itemUrl'    => 'https://example.org/item/',
				'vp/itemImgUrl' => 'https://example.org/item.jpg',
				'vp/itemAuthor' => 'Jane',
			)
		);

		$source = $this->get_source();

		$this->assertSame( 'Gallery item', $source->get_value( array( 'key' => 'title' ), $block, 'content' ) );
		$this->assertSame( 'https://example.org/item/', $source->get_value( array( 'key' => 'url' ), $block, 'url' ) );
		$this->assertSame( 'https://example.org/item.jpg', $source->get_value( array( 'key' => 'imgUrl' ), $block, 'url' ) );
		$this->assertSame( 'Jane', $source->get_value( array( 'key' => 'author' ), $block, 'content' ) );
	}

	/**
	 * The full context key is accepted too.
	 *
	 * @return void
	 */
	public function test_value_is_read_by_the_context_key() {
		$block = $this->get_block( array( 'vp/itemTitle' => 'Gallery item' ) );

		$this->assertSame(
			'Gallery item',
			$this->get_source()->get_value( array( 'key' => 'vp/itemTitle' ), $block, 'content' )
		);
	}

	/**
	 * A number is bound as text rather than refused.
	 *
	 * @return void
	 */
	public function test_numeric_value_is_returned_as_a_string() {
		$block = $this->get_block( array( 'vp/itemCommentsCount' => 12 ) );

		$this->assertSame(
			'12',
			$this->get_source()->get_value( array( 'key' => 'commentsCount' ), $block, 'content' )
		);
	}

	/**
	 * Nothing to bind leaves the attribute as the block saved it.
	 *
	 * @return void
	 */
	public function test_unresolvable_bindings_return_null() {
		$source = $this->get_source();
		$block  = $this->get_block(
			array(
				'vp/itemTitle'      => 'Gallery item',
				'vp/itemCategories' => array( array( 'label' => 'Cats' ) ),
			)
		);

		// No key at all.
		$this->assertNull( $source->get_value( array(), $block, 'content' ) );
		$this->assertNull( $source->get_value( array( 'key' => '' ), $block, 'content' ) );

		// A key of an item value that does not exist.
		$this->assertNull( $source->get_value( array( 'key' => 'somethingElse' ), $block, 'content' ) );

		// A list has no single rendering - binding it would print "Array".
		$this->assertNull( $source->get_value( array( 'key' => 'categories' ), $block, 'content' ) );

		// Outside a gallery item there is no item.
		$this->assertNull( $source->get_value( array( 'key' => 'title' ), $this->get_block( array() ), 'content' ) );
	}

	/**
	 * A bound core block renders the data of the item it stands in.
	 *
	 * The end to end shape of the feature: the binding is written by hand into
	 * the block markup, which is the only way a custom source is used.
	 *
	 * @return void
	 */
	public function test_bound_paragraph_renders_the_item_title() {
		$content = do_blocks( $this->get_loop_markup() );

		$this->assertStringContainsString( 'Bound image title', $content );
		$this->assertStringNotContainsString( 'Placeholder', $content );
	}

	/**
	 * Serialized markup of a loop with a bound paragraph in its item template.
	 *
	 * @return string
	 */
	private function get_loop_markup() {
		$attributes = array(
			'block_id'    => 'bindings-test',
			'queryType'   => 'images',
			'baseQuery'   => array( 'perPage' => 1 ),
			'imagesQuery' => array(
				'images' => array(
					array(
						'id'         => self::$attachment_id,
						'title'      => 'Bound image title',
						'categories' => array(),
					),
				),
			),
		);

		$binding = array(
			'metadata' => array(
				'bindings' => array(
					'content' => array(
						'source' => Visual_Portfolio_Block_Bindings::SOURCE,
						'args'   => array( 'key' => 'title' ),
					),
				),
			),
		);

		return '<!-- wp:visual-portfolio/loop ' . wp_json_encode( $attributes ) . ' -->
<div class="wp-block-visual-portfolio-loop vp-block-loop">
<!-- wp:visual-portfolio/item-template -->
<!-- wp:paragraph ' . wp_json_encode( $binding ) . ' -->
<p>Placeholder</p>
<!-- /wp:paragraph -->
<!-- /wp:visual-portfolio/item-template -->
</div>
<!-- /wp:visual-portfolio/loop -->';
	}
}
