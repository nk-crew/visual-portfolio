<?php
/**
 * Tests for building and changing Gallery Loops outside the editor.
 *
 * @package Visual Portfolio
 */

require_once dirname( __DIR__ ) . '/trait-loop-blocks.php';

/**
 * Test case for Visual_Portfolio_Loop_Gallery.
 */
class Test_Class_Loop_Gallery extends WP_UnitTestCase {
	use Visual_Portfolio_Loop_Blocks_Trait;

	/**
	 * Image attachments.
	 *
	 * @var array
	 */
	private static $image_ids = array();

	/**
	 * Create the images once.
	 *
	 * @param WP_UnitTest_Factory $factory - factory.
	 */
	public static function wpSetUpBeforeClass( $factory ) {
		for ( $i = 0; $i < 4; $i++ ) {
			self::$image_ids[] = $factory->attachment->create_upload_object( dirname( __DIR__ ) . '/fixtures/image.png' );
		}
	}

	/**
	 * Skip without the loop family.
	 */
	public function set_up() {
		parent::set_up();
		$this->skip_without_loop_blocks();
	}

	/**
	 * An images source of the first images.
	 *
	 * @param int $count - how many images.
	 *
	 * @return array
	 */
	private function images_source( $count ) {
		return array(
			'type'   => 'images',
			'images' => array_map(
				function ( $id ) {
					return array( 'id' => $id );
				},
				array_slice( self::$image_ids, 0, $count )
			),
		);
	}

	/**
	 * Every block of a tree, flat.
	 *
	 * @param array $blocks - blocks.
	 *
	 * @return array
	 */
	private function flatten( $blocks ) {
		$flat = array();

		foreach ( $blocks as $block ) {
			$flat[] = $block;
			$flat   = array_merge( $flat, $this->flatten( $block['innerBlocks'] ) );
		}

		return $flat;
	}

	/**
	 * Image ids of a loop.
	 *
	 * @param array $loop - loop block.
	 *
	 * @return array
	 */
	private function image_ids( $loop ) {
		return array_map( 'intval', array_column( $loop['attrs']['imagesQuery']['images'], 'id' ) );
	}

	/**
	 * Loops are found inside groups and columns, and one saved without an id
	 * is named by its position.
	 */
	public function test_finds_nested_loops_and_names_loops_without_id() {
		$blocks = parse_blocks(
			'<!-- wp:visual-portfolio/loop {"block_id":"first","queryType":"images"} --><div class="vp-block-loop"></div><!-- /wp:visual-portfolio/loop -->' .
			'<!-- wp:group --><div class="wp-block-group"><!-- wp:columns --><div class="wp-block-columns"><!-- wp:column --><div class="wp-block-column">' .
			'<!-- wp:visual-portfolio/loop {"queryType":"posts"} --><div class="vp-block-loop"></div><!-- /wp:visual-portfolio/loop -->' .
			'</div><!-- /wp:column --></div><!-- /wp:columns --></div><!-- /wp:group -->'
		);

		$found = Visual_Portfolio_Loop_Gallery::find_loops( $blocks );

		$this->assertCount( 2, $found );
		$this->assertSame( array( 1, 0, 0, 0 ), $found[1]['path'] );
		$this->assertSame( 'first', Visual_Portfolio_Loop_Gallery::get_gallery_id( $found[0]['block'], 0 ) );
		$this->assertSame( 'loop-2', Visual_Portfolio_Loop_Gallery::get_gallery_id( $found[1]['block'], 1 ) );
		$this->assertSame( 'posts', Visual_Portfolio_Loop_Gallery::find_loop( $blocks, 'loop-2' )['block']['attrs']['queryType'] );
		$this->assertNull( Visual_Portfolio_Loop_Gallery::find_loop( $blocks, 'loop-3' ) );
	}

	/**
	 * Every shipped layout, given images, starts the way the editor's setup
	 * starts it: lightbox clicks, no pagination, every image on one page.
	 */
	public function test_every_layout_with_images_gets_the_editor_defaults() {
		$layouts = Visual_Portfolio_Loop_Gallery::get_layouts();

		$this->assertGreaterThanOrEqual( 14, count( $layouts ) );

		foreach ( array_keys( $layouts ) as $slug ) {
			$loop = Visual_Portfolio_Loop_Gallery::create( $slug, array( 'source' => $this->images_source( 3 ) ), array() );
			$flat = $this->flatten( $loop['innerBlocks'] );

			$this->assertSame( 'images', $loop['attrs']['queryType'], $slug );
			$this->assertSame( -1, $loop['attrs']['baseQuery']['perPage'], $slug );
			$this->assertSame( array_slice( self::$image_ids, 0, 3 ), $this->image_ids( $loop ), $slug );
			$this->assertNotContains( Visual_Portfolio_Loop_Gallery::PAGINATION, array_column( $flat, 'blockName' ), $slug );

			foreach ( $flat as $block ) {
				if ( in_array( $block['blockName'], Visual_Portfolio_Loop_Gallery::CLICKABLE, true ) ) {
					$this->assertSame( 'popup', $block['attrs']['clickAction'], $slug );
				}
			}

			// The markup still parses back to the same loop.
			$reparsed = parse_blocks( serialize_block( $loop ) );
			$this->assertSame( $loop['attrs'], $reparsed[0]['attrs'], $slug );
		}
	}

	/**
	 * A new loop takes ids no other loop of the post has, even when the post
	 * already holds a loop from the same layout.
	 */
	public function test_new_loop_gets_ids_free_in_the_post() {
		$first  = Visual_Portfolio_Loop_Gallery::create( 'visual-portfolio/gallery-masonry-classic', array( 'source' => $this->images_source( 1 ) ), array() );
		$blocks = array(
			array_merge( $first, array( 'attrs' => array_merge( $first['attrs'], array( 'block_id' => 'vppatmasonryclassic' ) ) ) ),
		);
		$second = Visual_Portfolio_Loop_Gallery::create( 'visual-portfolio/gallery-masonry-classic', array( 'source' => $this->images_source( 1 ) ), $blocks );

		$this->assertSame( 1, $first['attrs']['queryId'] );
		$this->assertSame( 2, $second['attrs']['queryId'] );
		$this->assertNotSame( 'vppatmasonryclassic', $second['attrs']['block_id'] );
		$this->assertMatchesRegularExpression( '/^[a-f0-9]{8}$/', $second['attrs']['block_id'] );
	}

	/**
	 * A posts source maps onto the posts query, and a lightbox click on a
	 * posts gallery becomes a link to the item.
	 */
	public function test_posts_source_maps_to_posts_query() {
		$loop = Visual_Portfolio_Loop_Gallery::create(
			'visual-portfolio/gallery-masonry-classic',
			array(
				'source' => array(
					'type'  => 'posts',
					'ids'   => array( 12, 7 ),
					'terms' => array( 3 ),
				),
			),
			array()
		);

		$this->assertSame( 'posts', $loop['attrs']['queryType'] );
		$this->assertSame( 'ids', $loop['attrs']['postsQuery']['source'] );
		$this->assertSame( array( 12, 7 ), $loop['attrs']['postsQuery']['ids'] );
		$this->assertSame( array( 3 ), $loop['attrs']['postsQuery']['taxonomies'] );
		$this->assertSame( 'post__in', $loop['attrs']['postsQuery']['orderBy'] );

		$image = $this->flatten( $loop['innerBlocks'] );
		$image = array_values( wp_list_filter( $image, array( 'blockName' => 'visual-portfolio/item-image' ) ) );
		$this->assertSame( 'url', $image[0]['attrs']['clickAction'] );

		$described = Visual_Portfolio_Loop_Gallery::describe( $loop );
		$this->assertSame( array( 12, 7 ), $described['source']['ids'] );
		$this->assertFalse( $described['settings']['lightbox'] );
	}

	/**
	 * A new layout replaces what draws the items and keeps the gallery: its
	 * ids, its source and its images.
	 */
	public function test_layout_change_keeps_ids_and_source() {
		$loop    = Visual_Portfolio_Loop_Gallery::create( 'visual-portfolio/gallery-masonry-classic', array( 'source' => $this->images_source( 2 ) ), array() );
		$updated = Visual_Portfolio_Loop_Gallery::update( $loop, array( 'layout' => 'visual-portfolio/gallery-tiles-mosaic' ), array( $loop ) );

		$this->assertSame( $loop['attrs']['block_id'], $updated['attrs']['block_id'] );
		$this->assertSame( $loop['attrs']['queryId'], $updated['attrs']['queryId'] );
		$this->assertSame( $this->image_ids( $loop ), $this->image_ids( $updated ) );
		$this->assertSame( 'tiles', Visual_Portfolio_Loop_Gallery::describe( $updated )['layout_type'] );

		// The wrapper is the loop's own, so the block stays what it saved.
		$this->assertSame( $loop['innerContent'][0], $updated['innerContent'][0] );
		$this->assertSame( end( $loop['innerContent'] ), end( $updated['innerContent'] ) );
	}

	/**
	 * A loop saved with no inner blocks takes a layout's blocks inside its
	 * wrapper, not after it.
	 */
	public function test_layout_change_fills_an_empty_loop() {
		$blocks  = parse_blocks( '<!-- wp:visual-portfolio/loop {"queryType":"images"} --><div class="vp-block-loop"></div><!-- /wp:visual-portfolio/loop -->' );
		$updated = Visual_Portfolio_Loop_Gallery::update( $blocks[0], array( 'layout' => 'visual-portfolio/gallery-grid-classic' ), $blocks );
		$markup  = serialize_block( $updated );

		$this->assertStringStartsWith( '<!-- wp:visual-portfolio/loop', $markup );
		$this->assertMatchesRegularExpression( '#<div class="vp-block-loop"><!-- wp:visual-portfolio/item-template.*</div><!-- /wp:visual-portfolio/loop -->$#s', $markup );
		$this->assertNotEmpty( $updated['attrs']['block_id'] );
		$this->assertSame( 1, $updated['attrs']['queryId'] );
	}

	/**
	 * Images are added once, removed by id, and reordered with the ones the
	 * order leaves out kept after it; the same call twice equals one call.
	 */
	public function test_image_operations_are_repeatable() {
		list( $a, $b, $c, $d ) = self::$image_ids;

		$loop  = Visual_Portfolio_Loop_Gallery::create( 'visual-portfolio/gallery-grid-classic', array( 'source' => $this->images_source( 3 ) ), array() );
		$input = array(
			'add_images'    => array( array( 'id' => $d ), array( 'id' => $a ) ),
			'remove_images' => array( $b ),
			'order'         => array( $d, 999999, $d ),
		);

		$once  = Visual_Portfolio_Loop_Gallery::update( $loop, $input, array( $loop ) );
		$twice = Visual_Portfolio_Loop_Gallery::update( $once, $input, array( $once ) );

		$this->assertSame( array( $d, $a, $c ), $this->image_ids( $once ) );
		$this->assertSame( serialize_block( $once ), serialize_block( $twice ) );
	}

	/**
	 * Image operations on a gallery of posts are refused.
	 */
	public function test_image_operations_need_an_images_gallery() {
		$loop   = Visual_Portfolio_Loop_Gallery::create( 'visual-portfolio/gallery-posts-classic', array( 'source' => array( 'type' => 'posts' ) ), array() );
		$result = Visual_Portfolio_Loop_Gallery::update( $loop, array( 'order' => array( 1 ) ), array( $loop ) );

		$this->assertWPError( $result );
		$this->assertSame( 'vpf_not_images_gallery', $result->get_error_code() );
	}

	/**
	 * Columns apply where the layout counts columns; the lightbox off leaves
	 * a picture of an images gallery with no click.
	 */
	public function test_settings() {
		$tiles = Visual_Portfolio_Loop_Gallery::create(
			'visual-portfolio/gallery-tiles-mosaic',
			array(
				'source'   => $this->images_source( 1 ),
				'settings' => array( 'columns' => 5 ),
			),
			array()
		);
		$grid  = Visual_Portfolio_Loop_Gallery::create(
			'visual-portfolio/gallery-masonry-captions',
			array(
				'source'   => $this->images_source( 1 ),
				'settings' => array(
					'columns'  => 5,
					'lightbox' => false,
					'per_page' => 8,
				),
			),
			array()
		);

		$this->assertArrayNotHasKey( 'columns', Visual_Portfolio_Loop_Gallery::describe( $tiles )['settings'] );
		$this->assertSame(
			array(
				'per_page' => 8,
				'lightbox' => false,
				'columns'  => 5,
			),
			Visual_Portfolio_Loop_Gallery::describe( $grid )['settings']
		);

		$template = array_values( wp_list_filter( $this->flatten( $grid['innerBlocks'] ), array( 'blockName' => Visual_Portfolio_Loop_Gallery::TEMPLATE ) ) );
		$this->assertSame( 'manual', $template[0]['attrs']['layoutColumnsMode'] );
	}

	/**
	 * Without Pro, its sources are offered as requiring it and refused.
	 */
	public function test_pro_sources_require_pro() {
		if ( visual_portfolio()->is_pro() ) {
			$this->markTestSkipped( 'Pro describes its own sources.' );
		}

		$sources = Visual_Portfolio_Loop_Gallery::get_vocabulary()['sources'];

		$this->assertTrue( $sources['social-stream']['requires_pro'] );
		$this->assertFalse( $sources['social-stream']['available'] );

		$result = Visual_Portfolio_Loop_Gallery::create( 'visual-portfolio/gallery-grid-classic', array( 'source' => array( 'type' => 'social-stream' ) ), array() );

		$this->assertWPError( $result );
		$this->assertSame( 'vpf_requires_pro', $result->get_error_code() );
	}

	/**
	 * A source and a setting added through the vocabulary filter reach the
	 * loop through the apply filter.
	 */
	public function test_filters_add_a_source() {
		$vocabulary = function ( $vocabulary ) {
			$vocabulary['sources']['acme'] = array(
				'label'        => 'Acme',
				'description'  => 'Acme feed.',
				'available'    => true,
				'requires_pro' => false,
			);

			return $vocabulary;
		};
		$apply      = function ( $loop, $input ) {
			if ( 'acme' === ( $input['source']['type'] ?? '' ) ) {
				$loop['attrs']['sourceQuery'] = array( 'feed' => $input['source']['feed'] );
			}

			return $loop;
		};

		add_filter( 'vpf_gallery_ability_vocabulary', $vocabulary );
		add_filter( 'vpf_gallery_ability_apply', $apply, 10, 2 );

		$loop = Visual_Portfolio_Loop_Gallery::create(
			'visual-portfolio/gallery-grid-classic',
			array(
				'source' => array(
					'type' => 'acme',
					'feed' => 'news',
				),
			),
			array()
		);

		remove_filter( 'vpf_gallery_ability_vocabulary', $vocabulary );
		remove_filter( 'vpf_gallery_ability_apply', $apply );

		$this->assertSame( 'acme', $loop['attrs']['queryType'] );
		$this->assertSame( array( 'feed' => 'news' ), $loop['attrs']['sourceQuery'] );
		$this->assertSame(
			array(
				'type'     => 'acme',
				'settings' => array( 'feed' => 'news' ),
			),
			Visual_Portfolio_Loop_Gallery::describe( $loop )['source']
		);
	}
}
