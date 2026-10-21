<?php
/**
 * Capability checks of the REST routes, form handlers and preview.
 *
 * @package Visual Portfolio
 */

/**
 * A nonce proves the request came from the site, not that the user may make it.
 */
class Test_Visual_Portfolio_Security_Capabilities extends WP_UnitTestCase {
	/**
	 * Fresh REST server and request state.
	 *
	 * @return void
	 */
	public function set_up() {
		parent::set_up();

		global $wp_rest_server;

		$wp_rest_server = new WP_REST_Server();

		do_action( 'rest_api_init', $wp_rest_server );

		// Registered on `init`, which the test suite does not run again after
		// it resets the post types.
		if ( ! post_type_exists( 'vp_lists' ) ) {
			register_post_type( 'vp_lists', array( 'map_meta_cap' => true ) );
		}

		$_POST    = array();
		$_GET     = array();
		$_REQUEST = array();
	}

	/**
	 * Drop the request state.
	 *
	 * @return void
	 */
	public function tear_down() {
		$_POST    = array();
		$_GET     = array();
		$_REQUEST = array();

		set_current_screen( 'front' );

		parent::tear_down();
	}

	/**
	 * Create a user and log in as them.
	 *
	 * @param string $role - role name.
	 *
	 * @return int user id.
	 */
	private function login_as( $role ) {
		$user_id = self::factory()->user->create( array( 'role' => $role ) );

		wp_set_current_user( $user_id );

		return $user_id;
	}

	/**
	 * Send custom CSS to the update_layout route.
	 *
	 * @param int $post_id - post to write to.
	 *
	 * @return WP_REST_Response
	 */
	private function update_layout( $post_id ) {
		$request = new WP_REST_Request( 'POST', '/visual-portfolio/v1/update_layout' );

		$request->set_param( 'post_id', $post_id );
		$request->set_param( 'data', array( 'vp_custom_css' => '.vp-sec {}' ) );

		return rest_do_request( $request );
	}

	/**
	 * The route does not write layout meta to a post that is not a Saved Layout.
	 *
	 * @return void
	 */
	public function test_update_layout_refuses_other_post_types() {
		$user_id = $this->login_as( 'editor' );
		$post_id = self::factory()->post->create( array( 'post_author' => $user_id ) );

		$response = $this->update_layout( $post_id );

		$this->assertSame( 403, $response->get_status() );
		$this->assertSame( '', get_post_meta( $post_id, 'vp_custom_css', true ) );
	}

	/**
	 * A visitor is refused as unauthenticated.
	 *
	 * @return void
	 */
	public function test_update_layout_refuses_visitor() {
		$post_id = self::factory()->post->create( array( 'post_type' => 'vp_lists' ) );

		wp_set_current_user( 0 );

		$response = $this->update_layout( $post_id );

		$this->assertSame( 401, $response->get_status() );
		$this->assertSame( '', get_post_meta( $post_id, 'vp_custom_css', true ) );
	}

	/**
	 * An editor saves a Saved Layout.
	 *
	 * @return void
	 */
	public function test_update_layout_writes_saved_layout() {
		$this->login_as( 'administrator' );
		$post_id = self::factory()->post->create( array( 'post_type' => 'vp_lists' ) );

		$response = $this->update_layout( $post_id );

		$this->assertSame( 200, $response->get_status() );
		$this->assertSame( '.vp-sec {}', get_post_meta( $post_id, 'vp_custom_css', true ) );
	}

	/**
	 * CSS keeps nesting and child selectors and cannot close its style element.
	 *
	 * @return void
	 */
	public function test_sanitize_css() {
		$this->assertSame(
			'.a > .b { &:hover { color: red; } }',
			Visual_Portfolio_Security::sanitize_css( '.a > .b { &:hover { color: red; } }' )
		);
		$this->assertSame(
			'.a {}',
			Visual_Portfolio_Security::sanitize_css( '.a {}</style><script>alert(1)</script>' )
		);
		$this->assertSame( '.a {}', Visual_Portfolio_Security::sanitize_css( '.a {}</STYLE' ) );
	}

	/**
	 * Post the permalink settings form.
	 *
	 * @return void
	 */
	private function post_permalinks_form() {
		$_POST = array(
			'permalink_structure' => '/%postname%/',
			'vp-permalinks-nonce' => wp_create_nonce( 'vp-permalinks' ),
			'vp_category_slug'    => 'vp-sec-category',
			'vp_tag_slug'         => 'vp-sec-tag',
			'portfolio_permalink' => '/vp-sec-base',
		);

		set_current_screen( 'options-permalink' );

		$mapping = new Visual_Portfolio_Archive_Mapping();
		$mapping->permalink_settings_save();
	}

	/**
	 * Only a user of the permalinks screen saves the portfolio permalinks.
	 *
	 * @return void
	 */
	public function test_permalink_settings_save_requires_manage_options() {
		delete_option( 'portfolio_permalinks' );

		$this->login_as( 'editor' );
		$this->post_permalinks_form();

		$this->assertFalse( get_option( 'portfolio_permalinks' ) );

		$this->login_as( 'administrator' );
		$this->post_permalinks_form();

		$this->assertSame( 'vp-sec-category', get_option( 'portfolio_permalinks' )['category_base'] );
	}

	/**
	 * The video format field is saved only on a post the user may edit.
	 *
	 * @return void
	 */
	public function test_video_format_save_requires_edit_post() {
		$owner   = self::factory()->user->create( array( 'role' => 'editor' ) );
		$post_id = self::factory()->post->create( array( 'post_author' => $owner ) );

		$this->login_as( 'contributor' );

		$_POST = array(
			'vp_format_video_nonce' => wp_create_nonce( 'class-custom-post-meta.php' ),
			'_vp_format_video_url'  => 'https://example.com/vp-sec',
		);

		Visual_Portfolio_Custom_Post_Meta::save_post_format_metaboxes( $post_id );

		$this->assertSame( '', get_post_meta( $post_id, '_vp_format_video_url', true ) );

		wp_set_current_user( $owner );
		$_POST['vp_format_video_nonce'] = wp_create_nonce( 'class-custom-post-meta.php' );

		Visual_Portfolio_Custom_Post_Meta::save_post_format_metaboxes( $post_id );

		$this->assertSame( 'https://example.com/vp-sec', get_post_meta( $post_id, '_vp_format_video_url', true ) );
	}

	/**
	 * Whether a preview request with a valid nonce turns the preview on.
	 *
	 * @return bool
	 */
	private function preview_enabled() {
		$_GET     = array( 'vp_preview' => 'vp_preview' );
		$_POST    = array(
			'vp_preview_nonce' => wp_create_nonce( 'vp-ajax-nonce' ),
			'vp_preview_frame' => 'true',
		);
		$_REQUEST = array_merge( $_GET, $_POST );

		$preview = new Visual_Portfolio_Preview();
		$preview->is_preview_check();

		return $preview->preview_enabled;
	}

	/**
	 * Only a user who edits content renders the editor preview frame.
	 *
	 * @return void
	 */
	public function test_preview_requires_edit_capability() {
		$this->login_as( 'subscriber' );
		$this->assertFalse( $this->preview_enabled() );

		$this->login_as( 'contributor' );
		$this->assertTrue( $this->preview_enabled() );
	}
}
