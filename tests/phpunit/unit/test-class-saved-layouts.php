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
	 * @param string $items - serialized blocks inside the item template, an item title when omitted.
	 *
	 * @return string
	 */
	private function loop_markup( $loop, $template, $items = null ) {
		$items = $items ?? '<!-- wp:visual-portfolio/item-title {"metadata":{"vpSyncKey":"title"}} /-->';

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
	 * @param array       $template - item template attributes on top of the defaults.
	 * @param string|null $items - serialized blocks inside the item template.
	 *
	 * @return int
	 */
	private function create_layout( $template = array(), $items = null ) {
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
					),
					$items
				),
			)
		);
	}

	/**
	 * Render a page loop synced with a layout.
	 *
	 * @param int         $layout - layout id.
	 * @param array       $overrides - overridden attributes by sync key.
	 * @param array       $template - the page loop's own item template attributes.
	 * @param string|null $items - the page loop's own blocks inside the item template.
	 *
	 * @return string
	 */
	private function render_synced( $layout, $overrides = array(), $template = array(), $items = null ) {
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
				array_merge( array( 'metadata' => array( 'vpSyncKey' => 'template' ) ), $template ),
				$items
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
	 * Two insertions of one layout get loop ids of their own.
	 */
	public function test_inserted_layouts_get_their_own_loop_ids() {
		$layout = $this->create_layout();
		$output = do_blocks( str_repeat( '<!-- wp:visual-portfolio/saved {"id":"' . $layout . '"} /-->', 2 ) );

		preg_match_all( '/data-wp-router-region="([^"]+)"/', $output, $regions );

		$this->assertCount( 2, $regions[1] );
		$this->assertCount( 2, array_unique( $regions[1] ) );
	}

	/**
	 * The lock is saved through REST, which the editor uses.
	 */
	public function test_lock_saves_through_rest() {
		register_post_type(
			'vp_lists',
			array(
				'map_meta_cap' => true,
				'show_in_rest' => true,
				'supports'     => array( 'title', 'editor' ),
			)
		);
		( new Visual_Portfolio_Saved_Layouts() )->register_meta();

		$layout  = $this->create_layout();
		$request = new WP_REST_Request( 'POST', '/wp/v2/vp_lists/' . $layout );
		$request->set_param( 'meta', array( Visual_Portfolio_Saved_Layouts::LOCK_META => true ) );

		// A fresh server, so the route's controller sees the meta support.
		$GLOBALS['wp_rest_server'] = null;
		$response                  = rest_get_server()->dispatch( $request );

		$this->assertSame( 200, $response->get_status(), wp_json_encode( $response->get_data() ) );
		$this->assertTrue( Visual_Portfolio_Saved_Layouts::is_locked( $layout ) );
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
	 * A block that saves markup renders the page's markup once anything in it
	 * is overridden, and the layout's otherwise. A heading counts, although
	 * core gives it a render callback.
	 */
	public function test_overridden_static_block_renders_page_markup() {
		$layout = $this->create_layout(
			array(),
			'<!-- wp:paragraph {"metadata":{"vpSyncKey":"text"},"className":"layout-text","style":{"elements":{"link":{"color":{"text":"#ff0000"}}}}} --><p class="layout-text">Layout text</p><!-- /wp:paragraph --><!-- wp:heading {"metadata":{"vpSyncKey":"heading"},"style":{"elements":{"link":{"color":{"text":"#00ff00"}}}}} --><h2 class="wp-block-heading">Layout heading</h2><!-- /wp:heading -->'
		);
		$items  = '<!-- wp:paragraph {"metadata":{"vpSyncKey":"text"}} --><p>Page text</p><!-- /wp:paragraph --><!-- wp:heading {"metadata":{"vpSyncKey":"heading"}} --><h2 class="wp-block-heading">Page heading</h2><!-- /wp:heading -->';

		$own = $this->render_synced(
			$layout,
			array(
				'text'    => array( 'content' ),
				'heading' => array( 'content' ),
			),
			array(),
			$items
		);
		$this->assertStringContainsString( 'Page text', $own );
		$this->assertStringContainsString( 'Page heading', $own );
		$this->assertStringNotContainsString( 'Layout text', $own );
		$this->assertStringNotContainsString( 'layout-text', $own );
		$this->assertStringNotContainsString( 'wp-elements-', $own );
		$this->assertStringNotContainsString( 'Layout heading', $own );

		$synced = $this->render_synced( $layout, array(), array(), $items );
		$this->assertMatchesRegularExpression( '/<p class="[^"]*layout-text[^"]*wp-elements-[^"]*">Layout text</', $synced );
		$this->assertMatchesRegularExpression( '/<h2 class="[^"]*wp-elements-[^"]*">Layout heading</', $synced );
		$this->assertStringNotContainsString( 'Page text', $synced );
	}

	/**
	 * An overridden group is the page's block, every attribute and its markup,
	 * while the blocks inside it still follow the layout, also once the layout
	 * adds one.
	 */
	public function test_overridden_group_keeps_merging_inner_blocks() {
		$template = array( 'metadata' => array( 'vpSyncKey' => 'template' ) );
		$layout   = parse_blocks(
			$this->loop_markup(
				array(),
				$template,
				'<!-- wp:group {"metadata":{"vpSyncKey":"group"},"className":"layout-group"} --><div class="wp-block-group layout-group"><!-- wp:paragraph {"metadata":{"vpSyncKey":"text"}} --><p>Layout text</p><!-- /wp:paragraph --></div><!-- /wp:group -->'
			)
		)[0];
		$loop     = parse_blocks(
			$this->loop_markup(
				array( 'savedLayout' => array( 'overrides' => array( 'group' => array( 'className' ) ) ) ),
				$template,
				'<!-- wp:group {"metadata":{"vpSyncKey":"group"},"className":"page-group","tagName":"section"} --><section class="wp-block-group page-group"><!-- wp:paragraph {"metadata":{"vpSyncKey":"text"}} --><p>Page text</p><!-- /wp:paragraph --></section><!-- /wp:group -->'
			)
		)[0];

		$merged = Visual_Portfolio_Saved_Layouts::find_block( Visual_Portfolio_Saved_Layouts::apply_layout( $loop, $layout, false )['innerBlocks'], 'core/group' );
		$own    = Visual_Portfolio_Saved_Layouts::find_block( $loop['innerBlocks'], 'core/group' );

		$this->assertSame( $own['attrs'], $merged['attrs'] );
		$this->assertSame( $own['innerContent'], $merged['innerContent'] );
		$this->assertSame( '<p>Layout text</p>', $merged['innerBlocks'][0]['innerHTML'] );
		$this->assertMatchesRegularExpression( '/^<section class="wp-block-group page-group">.*Layout text/', render_block( $merged ) );

		$grown_layout = parse_blocks(
			$this->loop_markup(
				array(),
				$template,
				'<!-- wp:group {"metadata":{"vpSyncKey":"group"},"className":"layout-group"} --><div class="wp-block-group layout-group"><!-- wp:paragraph {"metadata":{"vpSyncKey":"text"}} --><p>Layout text</p><!-- /wp:paragraph --><!-- wp:paragraph {"metadata":{"vpSyncKey":"added"}} --><p>Added text</p><!-- /wp:paragraph --></div><!-- /wp:group -->'
			)
		)[0];
		$grown        = Visual_Portfolio_Saved_Layouts::find_block( Visual_Portfolio_Saved_Layouts::apply_layout( $loop, $grown_layout, false )['innerBlocks'], 'core/group' );

		$this->assertSame( $own['attrs'], $grown['attrs'] );
		$this->assertMatchesRegularExpression( '/^<section class="wp-block-group page-group">.*Layout text.*Added text.*<\/section>$/s', render_block( $grown ) );
	}

	/**
	 * An overridden group the page saved empty wraps the blocks the layout
	 * later put in it with the page's markup, and a detached loop saves it
	 * that way, the markup the editor saves for the page's attributes.
	 */
	public function test_overridden_empty_group_wraps_layout_blocks() {
		$template = array( 'metadata' => array( 'vpSyncKey' => 'template' ) );
		$layout   = parse_blocks(
			$this->loop_markup(
				array(),
				$template,
				'<!-- wp:group {"metadata":{"vpSyncKey":"group"},"className":"layout-group"} --><div class="wp-block-group layout-group"><!-- wp:paragraph {"metadata":{"vpSyncKey":"text"}} --><p>Layout text</p><!-- /wp:paragraph --></div><!-- /wp:group -->'
			)
		)[0];
		$own      = '<!-- wp:group {"metadata":{"vpSyncKey":"group"},"className":"page-group","tagName":"section"} --><section class="wp-block-group page-group"></section><!-- /wp:group -->';
		$loop     = parse_blocks(
			$this->loop_markup(
				array( 'savedLayout' => array( 'overrides' => array( 'group' => array( 'className' ) ) ) ),
				$template,
				$own
			)
		)[0];

		$merged = Visual_Portfolio_Saved_Layouts::find_block( Visual_Portfolio_Saved_Layouts::apply_layout( $loop, $layout, false )['innerBlocks'], 'core/group' );

		$this->assertSame( parse_blocks( $own )[0]['attrs'], $merged['attrs'] );
		$this->assertMatchesRegularExpression( '/^<section class="wp-block-group page-group">.*Layout text.*<\/section>$/s', render_block( $merged ) );

		$detached = Visual_Portfolio_Saved_Layouts::find_block( Visual_Portfolio_Saved_Layout_Usage::detach_loop( $loop, $layout, false )['innerBlocks'], 'core/group' );

		$this->assertSame(
			'<!-- wp:group {"metadata":{"vpSyncKey":"group"},"className":"page-group","tagName":"section"} --><section class="wp-block-group page-group"><!-- wp:paragraph {"metadata":{"vpSyncKey":"text"}} --><p>Layout text</p><!-- /wp:paragraph --></section><!-- /wp:group -->',
			serialize_block( $detached )
		);
	}

	/**
	 * Merged attributes of the item image of a loop synced with a layout.
	 *
	 * @param array $layout_extensions - the layout's image extensions.
	 * @param array $own_extensions - the page's image extensions.
	 * @param array $overrides - the image's overridden names.
	 *
	 * @return array
	 */
	private function merge_image_extensions( $layout_extensions, $own_extensions, $overrides ) {
		$template = array( 'metadata' => array( 'vpSyncKey' => 'template' ) );
		$image    = function ( $extensions ) {
			return '<!-- wp:visual-portfolio/item-image ' . wp_json_encode(
				array(
					'metadata'   => array( 'vpSyncKey' => 'image' ),
					'extensions' => (object) $extensions,
				)
			) . ' /-->';
		};
		$layout   = parse_blocks( $this->loop_markup( array(), $template, $image( $layout_extensions ) ) )[0];
		$loop     = parse_blocks(
			$this->loop_markup(
				array( 'savedLayout' => array( 'overrides' => array( 'image' => $overrides ) ) ),
				$template,
				$image( $own_extensions )
			)
		)[0];

		return Visual_Portfolio_Saved_Layouts::find_block(
			Visual_Portfolio_Saved_Layouts::apply_layout( $loop, $layout, false )['innerBlocks'],
			'visual-portfolio/item-image'
		)['attrs'];
	}

	/**
	 * An `extensions.<key>` override takes that key alone from the page, or
	 * drops it when the page has none, and the layout keeps the other keys. A
	 * whole `extensions` override still takes the page's object.
	 */
	public function test_extensions_key_override_takes_one_key() {
		$layout_extensions = array(
			'imageFilter' => array( 'normal' => 'grayscale(1)' ),
			'tilt'        => 'direct',
			'blendMode'   => 'multiply',
		);
		$own_extensions    = array(
			'imageFilter' => array( 'normal' => 'sepia(1)' ),
			'tilt'        => 'opposite',
			'hoverTransform' => 'scale(1.05)',
		);

		$this->assertSame(
			array(
				'imageFilter' => array( 'normal' => 'sepia(1)' ),
				'tilt'        => 'direct',
				'hoverTransform' => 'scale(1.05)',
			),
			$this->merge_image_extensions( $layout_extensions, $own_extensions, array( 'extensions.imageFilter', 'extensions.blendMode', 'extensions.hoverTransform' ) )['extensions']
		);

		$this->assertSame(
			$own_extensions,
			$this->merge_image_extensions( $layout_extensions, $own_extensions, array( 'extensions', 'extensions.tilt' ) )['extensions']
		);

		$this->assertSame(
			$layout_extensions,
			$this->merge_image_extensions( $layout_extensions, $own_extensions, array( 'metadata.vpSyncKey', 'extensions.' ) )['extensions']
		);
	}

	/**
	 * Stored overrides keep attribute names and `extensions.<key>` paths, and
	 * drop a path into any other attribute.
	 */
	public function test_sanitize_overrides_keeps_extension_paths_only() {
		$this->assertSame(
			array( 'image' => array( 'extensions', 'extensions.tilt', 'align' ) ),
			Visual_Portfolio_Saved_Layouts::sanitize_overrides(
				array( 'image' => array( 'extensions', 'extensions.tilt', 'style.color', 'extensions.', 'align', 3 ) )
			)
		);
	}

	/**
	 * A block that saves markup is the page's block whole once one key of its
	 * `extensions` is overridden.
	 */
	public function test_extensions_key_override_takes_static_block_whole() {
		$template = array( 'metadata' => array( 'vpSyncKey' => 'template' ) );
		$layout   = parse_blocks( $this->loop_markup( array(), $template, '<!-- wp:paragraph {"metadata":{"vpSyncKey":"text"},"extensions":{"a":1,"b":1}} --><p>Layout text</p><!-- /wp:paragraph -->' ) )[0];
		$loop     = parse_blocks(
			$this->loop_markup(
				array( 'savedLayout' => array( 'overrides' => array( 'text' => array( 'extensions.a' ) ) ) ),
				$template,
				'<!-- wp:paragraph {"metadata":{"vpSyncKey":"text"},"extensions":{"a":2}} --><p>Page text</p><!-- /wp:paragraph -->'
			)
		)[0];

		$merged = Visual_Portfolio_Saved_Layouts::find_block( Visual_Portfolio_Saved_Layouts::apply_layout( $loop, $layout, false )['innerBlocks'], 'core/paragraph' );

		$this->assertSame( array( 'a' => 2 ), $merged['attrs']['extensions'] );
		$this->assertSame( '<p>Page text</p>', $merged['innerHTML'] );
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
