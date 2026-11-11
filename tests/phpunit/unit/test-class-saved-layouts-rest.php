<?php
/**
 * Tests for the Saved Layouts library REST API.
 *
 * @package Visual Portfolio
 */

/**
 * Saved Layouts REST test case.
 */
class ClassSavedLayoutsRest extends WP_UnitTestCase {
	use Visual_Portfolio_Loop_Blocks_Trait;

	/**
	 * Layout markup with one image.
	 *
	 * @param int $image - attachment id.
	 *
	 * @return string
	 */
	private function layout_content( $image ) {
		return sprintf(
			'<!-- wp:visual-portfolio/loop {"queryType":"images","imagesQuery":{"images":[{"id":%d},{"id":999999},{"imgUrl":"https://example.com/a.jpg"}]}} --><div class="wp-block-visual-portfolio-loop vp-block-loop"><!-- wp:visual-portfolio/item-template {"layoutType":"justified"} --><!-- wp:visual-portfolio/item-title /--><!-- /wp:visual-portfolio/item-template --></div><!-- /wp:visual-portfolio/loop -->',
			$image
		);
	}

	/**
	 * Every test needs the routes, the post type and an editor.
	 *
	 * @return void
	 */
	public function set_up() {
		parent::set_up();

		$this->skip_without_loop_blocks();

		if ( ! post_type_exists( 'vp_lists' ) ) {
			register_post_type(
				'vp_lists',
				array(
					'map_meta_cap' => true,
					'show_in_rest' => true,
				)
			);
		}

		wp_set_current_user( self::factory()->user->create( array( 'role' => 'administrator' ) ) );

		do_action( 'rest_api_init', rest_get_server() );
	}

	/**
	 * Dispatch a request.
	 *
	 * @param string $method - HTTP method.
	 * @param string $route - route.
	 * @param array  $params - parameters.
	 *
	 * @return WP_REST_Response
	 */
	private function request( $method, $route, $params = array() ) {
		$request = new WP_REST_Request( $method, $route );

		foreach ( $params as $key => $value ) {
			$request->set_param( $key, $value );
		}

		return rest_get_server()->dispatch( $request );
	}

	/**
	 * Core's route carries the kind, source, preview settings and usage.
	 */
	public function test_core_route_carries_library_field() {
		$image  = self::factory()->attachment->create_upload_object( dirname( __DIR__ ) . '/fixtures/image.png' );
		$layout = self::factory()->post->create(
			array(
				'post_type'    => 'vp_lists',
				'post_status'  => 'publish',
				'post_content' => $this->layout_content( $image ),
			)
		);
		self::factory()->post->create( array( 'post_content' => '<!-- wp:visual-portfolio/saved {"id":"' . $layout . '"} /-->' ) );

		$field = $this->request( 'GET', '/wp/v2/vp_lists/' . $layout, array( 'context' => 'edit' ) )->get_data()['vpf_layout'];

		$this->assertSame( 'blocks', $field['kind'] );
		$this->assertSame( 'images', $field['source'] );
		$this->assertSame( 'justified', $field['preview']['type'] );
		$this->assertSame(
			array(
				'posts'  => 1,
				'synced' => 0,
			),
			$field['usage']
		);
		$this->assertSame( '[visual_portfolio id="' . $layout . '"]', $field['shortcode'] );
	}

	/**
	 * A block-based layout offers no legacy settings to convert from.
	 */
	public function test_get_layout_has_no_legacy_settings_for_block_layouts() {
		$image  = self::factory()->attachment->create_upload_object( dirname( __DIR__ ) . '/fixtures/image.png' );
		$layout = self::factory()->post->create(
			array(
				'post_type'    => 'vp_lists',
				'post_status'  => 'publish',
				'post_content' => $this->layout_content( $image ),
			)
		);

		$this->assertFalse( $this->request( 'GET', '/visual-portfolio/v1/get_layout', array( 'id' => $layout ) )->get_data()['response'] );
	}

	/**
	 * A copy carries the content and the layout meta under a new title.
	 */
	public function test_duplicate_copies_content_and_meta() {
		$layout = self::factory()->post->create(
			array(
				'post_type'    => 'vp_lists',
				'post_title'   => 'Weddings',
				'post_content' => '<!-- wp:visual-portfolio/saved-editor /-->',
			)
		);
		update_post_meta( $layout, 'vp_layout', 'masonry' );
		update_post_meta( $layout, Visual_Portfolio_Saved_Layouts::LOCK_META, true );

		$copy = $this->request( 'POST', '/visual-portfolio/v1/saved-layouts/' . $layout . '/duplicate' )->get_data()['id'];

		$this->assertSame( 'Weddings (copy)', get_post( $copy )->post_title );
		$this->assertSame( get_post( $layout )->post_content, get_post( $copy )->post_content );
		$this->assertSame( 'masonry', get_post_meta( $copy, 'vp_layout', true ) );
		$this->assertTrue( Visual_Portfolio_Saved_Layouts::is_locked( $copy ) );
	}

	/**
	 * An export imports back as new layouts, without images the site lacks.
	 */
	public function test_export_then_import_round_trip() {
		$image  = self::factory()->attachment->create_upload_object( dirname( __DIR__ ) . '/fixtures/image.png' );
		$layout = self::factory()->post->create(
			array(
				'post_type'    => 'vp_lists',
				'post_title'   => 'Exported',
				'post_content' => $this->layout_content( $image ),
			)
		);

		$file = $this->request( 'GET', '/visual-portfolio/v1/saved-layouts/export', array( 'ids' => array( $layout ) ) )->get_data();

		$this->assertSame( 'visual-portfolio/saved-layouts', $file['type'] );
		$this->assertSame( 1, $file['version'] );

		$result = $this->request( 'POST', '/visual-portfolio/v1/saved-layouts/import', array( 'file' => $file ) )->get_data();

		$this->assertCount( 1, $result['created'] );
		$this->assertSame( 1, $result['droppedImages'] );

		$imported = get_post( $result['created'][0] );
		$loop     = Visual_Portfolio_Saved_Layouts::find_block( parse_blocks( $imported->post_content ), 'visual-portfolio/loop' );

		$this->assertSame( 'Exported', $imported->post_title );
		$this->assertSame(
			array(
				array( 'id' => $image ),
				array( 'imgUrl' => 'https://example.com/a.jpg' ),
			),
			$loop['attrs']['imagesQuery']['images']
		);
	}

	/**
	 * Editors without the Saved Layout capabilities read published layouts to
	 * sync with, but not drafts, and the library field stays out of view.
	 */
	public function test_editors_read_published_layouts_for_sync() {
		// Saved Layouts have capabilities of their own, which editors lack.
		register_post_type(
			'vp_lists',
			array(
				'map_meta_cap'    => true,
				'show_in_rest'    => true,
				'capability_type' => 'vp_list',
			)
		);

		$image     = self::factory()->attachment->create_upload_object( dirname( __DIR__ ) . '/fixtures/image.png' );
		$published = self::factory()->post->create(
			array(
				'post_type'    => 'vp_lists',
				'post_status'  => 'publish',
				'post_title'   => 'Published',
				'post_content' => $this->layout_content( $image ),
			)
		);
		$draft     = self::factory()->post->create(
			array(
				'post_type'    => 'vp_lists',
				'post_status'  => 'draft',
				'post_title'   => 'Draft',
				'post_author'  => self::factory()->user->create( array( 'role' => 'administrator' ) ),
				'post_content' => $this->layout_content( $image ),
			)
		);

		wp_set_current_user( self::factory()->user->create( array( 'role' => 'editor' ) ) );

		$this->assertSame( 200, $this->request( 'GET', '/visual-portfolio/v1/saved-layouts/' . $published . '/sync-source' )->get_status() );
		$this->assertSame( 403, $this->request( 'GET', '/visual-portfolio/v1/saved-layouts/' . $draft . '/sync-source' )->get_status() );
		$this->assertSame( 404, $this->request( 'GET', '/visual-portfolio/v1/saved-layouts/999999/sync-source' )->get_status() );

		// Trashing an unpublished layout does not open it.
		wp_trash_post( $draft );
		$this->assertSame( 403, $this->request( 'GET', '/visual-portfolio/v1/saved-layouts/' . $draft . '/sync-source' )->get_status() );
		$this->assertSame(
			array( 'Published' ),
			wp_list_pluck( $this->request( 'GET', '/visual-portfolio/v1/saved-layouts/choices' )->get_data(), 'title' )
		);

		wp_set_current_user( 0 );

		$this->assertArrayNotHasKey( 'vpf_layout', $this->request( 'GET', '/wp/v2/vp_lists/' . $published )->get_data() );
	}

	/**
	 * Restore brings a layout back with the status it had.
	 */
	public function test_restore_keeps_the_previous_status() {
		$layout = self::factory()->post->create(
			array(
				'post_type'   => 'vp_lists',
				'post_status' => 'publish',
			)
		);

		wp_trash_post( $layout );

		$response = $this->request( 'POST', '/visual-portfolio/v1/saved-layouts/' . $layout . '/restore' );

		$this->assertSame( 'publish', $response->get_data()['status'] );
		$this->assertSame( '', get_post_meta( $layout, '_wp_trash_meta_status', true ) );
	}

	/**
	 * A file of another kind is refused.
	 */
	public function test_import_refuses_other_files() {
		$response = $this->request( 'POST', '/visual-portfolio/v1/saved-layouts/import', array( 'file' => array( 'type' => 'something-else' ) ) );

		$this->assertSame( 400, $response->get_status() );
	}

	/**
	 * A user who cannot edit layouts reaches none of the routes.
	 */
	public function test_routes_refuse_users_without_access() {
		$layout = self::factory()->post->create( array( 'post_type' => 'vp_lists' ) );

		wp_set_current_user( self::factory()->user->create( array( 'role' => 'subscriber' ) ) );

		$this->assertSame( 403, $this->request( 'GET', '/visual-portfolio/v1/saved-layouts/' . $layout . '/usage' )->get_status() );
		$this->assertSame( 403, $this->request( 'POST', '/visual-portfolio/v1/saved-layouts/' . $layout . '/duplicate' )->get_status() );
		$this->assertSame( 403, $this->request( 'GET', '/visual-portfolio/v1/saved-layouts/export', array( 'ids' => array( $layout ) ) )->get_status() );
		$this->assertSame( 403, $this->request( 'POST', '/visual-portfolio/v1/saved-layouts/import', array( 'file' => array() ) )->get_status() );
	}
}
