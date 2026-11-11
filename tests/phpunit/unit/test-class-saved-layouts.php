<?php
/**
 * Tests for Saved Layouts built from Gallery Loop blocks.
 *
 * @package Visual Portfolio
 */

/**
 * Saved Layouts test case.
 */
class ClassSavedLayouts extends WP_UnitTestCase {
	use Visual_Portfolio_Loop_Blocks_Trait;

	/**
	 * Images of the layout.
	 *
	 * @var array
	 */
	private static $layout_images = array();

	/**
	 * Images of the page's own loop.
	 *
	 * @var array
	 */
	private static $own_images = array();

	/**
	 * Create the attachments once for the whole case.
	 *
	 * @return void
	 */
	public static function wpSetUpBeforeClass() {
		for ( $i = 1; $i <= 2; $i++ ) {
			self::$layout_images[] = array(
				'id'    => self::factory()->attachment->create_upload_object( dirname( __DIR__ ) . '/fixtures/image.png' ),
				'title' => 'Layout Image ' . $i,
			);
			self::$own_images[]    = array(
				'id'    => self::factory()->attachment->create_upload_object( dirname( __DIR__ ) . '/fixtures/image.png' ),
				'title' => 'Own Image ' . $i,
			);
		}
	}

	/**
	 * Every test needs the loop family and an editor.
	 *
	 * @return void
	 */
	public function set_up() {
		parent::set_up();

		$this->skip_without_loop_blocks();

		// The test case resets the post types after every test.
		if ( ! post_type_exists( 'vp_lists' ) ) {
			register_post_type( 'vp_lists', array( 'map_meta_cap' => true ) );
		}

		wp_set_current_user( self::factory()->user->create( array( 'role' => 'administrator' ) ) );
	}

	/**
	 * Serialized loop.
	 *
	 * @param array  $loop - loop attributes.
	 * @param array  $template - item template attributes.
	 * @param string $items - serialized blocks inside the item template.
	 *
	 * @return string
	 */
	private function loop_markup( $loop, $template, $items = '<!-- wp:visual-portfolio/item-title {"metadata":{"vpSyncKey":"title"}} /-->' ) {
		return sprintf(
			'<!-- wp:visual-portfolio/loop %1$s --><div class="wp-block-visual-portfolio-loop vp-block-loop"><!-- wp:visual-portfolio/item-template %2$s -->%3$s<!-- /wp:visual-portfolio/item-template --></div><!-- /wp:visual-portfolio/loop -->',
			wp_json_encode( (object) $loop ),
			wp_json_encode( (object) $template ),
			$items
		);
	}

	/**
	 * Loop attributes showing a set of images.
	 *
	 * @param array  $images - images.
	 * @param string $block_id - block id.
	 *
	 * @return array
	 */
	private function images_loop( $images, $block_id ) {
		return array(
			'block_id'    => $block_id,
			'queryId'     => 1,
			'queryType'   => 'images',
			'baseQuery'   => array( 'perPage' => 10 ),
			'imagesQuery' => array( 'images' => $images ),
		);
	}

	/**
	 * A published block-based layout: masonry, four columns, item titles.
	 *
	 * @param array $template - item template attributes on top of the defaults.
	 *
	 * @return int
	 */
	private function create_layout( $template = array() ) {
		return self::factory()->post->create(
			array(
				'post_type'    => 'vp_lists',
				'post_status'  => 'publish',
				'post_content' => $this->loop_markup(
					array_merge( $this->images_loop( self::$layout_images, 'layout' ), array( 'lightbox' => array( 'captions' => false ) ) ),
					array_merge(
						array(
							'layoutType'        => 'masonry',
							'layoutColumnsMode' => 'manual',
							'layoutColumnCount' => 4,
							'metadata'          => array( 'vpSyncKey' => 'template' ),
						),
						$template
					)
				),
			)
		);
	}

	/**
	 * Render a page loop synced with a layout.
	 *
	 * @param int   $layout - layout id.
	 * @param array $overrides - overridden attributes by sync key.
	 * @param array $template - the page loop's own item template attributes.
	 *
	 * @return string
	 */
	private function render_synced( $layout, $overrides = array(), $template = array() ) {
		$loop = array_merge(
			$this->images_loop( self::$own_images, 'page' ),
			array(
				'savedLayout' => array(
					'id'        => $layout,
					'overrides' => $overrides,
				),
			)
		);

		return do_blocks(
			$this->loop_markup(
				$loop,
				array_merge( array( 'metadata' => array( 'vpSyncKey' => 'template' ) ), $template )
			)
		);
	}

	/**
	 * Content without a Gallery Loop is a legacy layout, whatever else it holds.
	 */
	public function test_layout_kind_follows_content() {
		$legacy = self::factory()->post->create(
			array(
				'post_type'    => 'vp_lists',
				'post_content' => '<!-- wp:visual-portfolio/saved-editor /-->',
			)
		);
		$empty  = self::factory()->post->create(
			array(
				'post_type'    => 'vp_lists',
				'post_content' => '',
			)
		);
		$page   = self::factory()->post->create( array( 'post_content' => $this->loop_markup( array(), array() ) ) );

		$this->assertFalse( Visual_Portfolio_Saved_Layouts::is_block_layout( $legacy ) );
		$this->assertFalse( Visual_Portfolio_Saved_Layouts::is_block_layout( $empty ) );
		$this->assertFalse( Visual_Portfolio_Saved_Layouts::is_block_layout( $page ) );
		$this->assertTrue( Visual_Portfolio_Saved_Layouts::is_block_layout( $this->create_layout() ) );
	}

	/**
	 * The shortcode and the Saved Layout block render a block-based layout's
	 * own gallery.
	 */
	public function test_shortcode_and_block_render_block_layout() {
		$layout = $this->create_layout();

		foreach (
			array(
				do_shortcode( '[visual_portfolio id="' . $layout . '"]' ),
				do_blocks( '<!-- wp:visual-portfolio/saved {"id":"' . $layout . '"} /-->' ),
			) as $output
		) {
			$this->assertStringContainsString( 'Layout Image 1', $output );
			$this->assertStringContainsString( 'vp-layout-masonry', $output );
			$this->assertStringContainsString( '--vp-layout-columns:4"', $output );
		}
	}

	/**
	 * A layout that inserts itself renders its gallery once.
	 */
	public function test_self_inclusion_renders_once() {
		$layout = $this->create_layout();
		$post   = get_post( $layout );

		wp_update_post(
			array(
				'ID'           => $layout,
				'post_content' => $post->post_content . '<!-- wp:visual-portfolio/saved {"id":"' . $layout . '"} /-->',
			)
		);

		$output = do_shortcode( '[visual_portfolio id="' . $layout . '"]' );

		$this->assertSame( 1, substr_count( $output, 'data-vp-layout="masonry"' ) );
	}

	/**
	 * A draft layout is visible only to those who can edit it.
	 */
	public function test_draft_layout_renders_for_editors_only() {
		$layout = $this->create_layout();
		wp_update_post(
			array(
				'ID'          => $layout,
				'post_status' => 'draft',
			)
		);

		$this->assertStringContainsString( 'Layout Image 1', Visual_Portfolio_Saved_Layouts::render( $layout ) );

		wp_set_current_user( 0 );

		$this->assertSame( '', Visual_Portfolio_Saved_Layouts::render( $layout ) );
	}

	/**
	 * A synced loop takes the layout's item template and keeps its own images.
	 */
	public function test_synced_loop_takes_layout_settings_and_keeps_its_images() {
		$output = $this->render_synced( $this->create_layout(), array(), array( 'layoutType' => 'grid' ) );

		$this->assertStringContainsString( 'vp-layout-masonry', $output );
		$this->assertStringContainsString( '--vp-layout-columns:4"', $output );
		$this->assertStringContainsString( 'Own Image 1', $output );
		$this->assertStringNotContainsString( 'Layout Image', $output );
	}

	/**
	 * An overridden attribute keeps the loop's value, or its default when the
	 * loop no longer carries it.
	 */
	public function test_overridden_attribute_wins() {
		$layout = $this->create_layout();

		$own = $this->render_synced(
			$layout,
			array( 'template' => array( 'layoutColumnCount' ) ),
			array( 'layoutColumnCount' => 2 )
		);
		$this->assertStringContainsString( '--vp-layout-columns:2"', $own );
		$this->assertStringContainsString( 'vp-layout-masonry', $own );

		$default = $this->render_synced( $layout, array( 'template' => array( 'layoutColumnCount' ) ) );
		$this->assertStringContainsString( '--vp-layout-columns:3"', $default );
	}

	/**
	 * A locked layout ignores the loop's overrides.
	 */
	public function test_locked_layout_ignores_overrides() {
		$layout = $this->create_layout();
		update_post_meta( $layout, Visual_Portfolio_Saved_Layouts::LOCK_META, true );

		$output = $this->render_synced(
			$layout,
			array( 'template' => array( 'layoutColumnCount' ) ),
			array( 'layoutColumnCount' => 2 )
		);

		$this->assertStringContainsString( '--vp-layout-columns:4"', $output );
	}

	/**
	 * A trashed layout still syncs; a deleted one leaves the loop as it is.
	 */
	public function test_trashed_layout_syncs_and_deleted_layout_does_not() {
		$layout = $this->create_layout();

		wp_trash_post( $layout );
		$this->assertStringContainsString( 'vp-layout-masonry', $this->render_synced( $layout, array(), array( 'layoutType' => 'grid' ) ) );

		wp_delete_post( $layout, true );
		$this->assertStringContainsString( 'vp-layout-grid', $this->render_synced( $layout, array(), array( 'layoutType' => 'grid' ) ) );
	}

	/**
	 * The lightbox comes from the layout unless the loop overrides it.
	 */
	public function test_lightbox_follows_layout_unless_overridden() {
		$layout = $this->create_layout();
		$loop   = array(
			'blockName'   => 'visual-portfolio/loop',
			'attrs'       => array(
				'lightbox'    => array( 'captions' => true ),
				'savedLayout' => array( 'id' => $layout ),
			),
			'innerBlocks' => array(),
		);

		$this->assertSame( array( 'captions' => false ), Visual_Portfolio_Saved_Layouts::apply_layout( $loop )['attrs']['lightbox'] );

		$loop['attrs']['savedLayout']['overrides'] = array( 'loop' => array( 'lightbox' ) );

		$this->assertSame( array( 'captions' => true ), Visual_Portfolio_Saved_Layouts::apply_layout( $loop )['attrs']['lightbox'] );
	}

	/**
	 * Saving a layout keys every block of its item template, keeps the keys it
	 * already has, and gives the same keys to the same content.
	 */
	public function test_sync_keys_are_added_on_save_and_stable() {
		$content = $this->loop_markup(
			array(),
			array(),
			'<!-- wp:visual-portfolio/item-title {"metadata":{"vpSyncKey":"kept"}} /--><!-- wp:visual-portfolio/item-date /-->'
		);

		$first  = self::factory()->post->create(
			array(
				'post_type'    => 'vp_lists',
				'post_content' => $content,
			)
		);
		$second = self::factory()->post->create(
			array(
				'post_type'    => 'vp_lists',
				'post_content' => $content,
			)
		);

		$template = Visual_Portfolio_Saved_Layouts::find_block( parse_blocks( get_post( $first )->post_content ), 'visual-portfolio/item-template' );

		$this->assertNotEmpty( $template['attrs']['metadata']['vpSyncKey'] );
		$this->assertSame( 'kept', $template['innerBlocks'][0]['attrs']['metadata']['vpSyncKey'] );
		$this->assertNotEmpty( $template['innerBlocks'][1]['attrs']['metadata']['vpSyncKey'] );
		$this->assertSame( get_post( $first )->post_content, get_post( $second )->post_content );
	}
}
