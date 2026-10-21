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
	 * An administrator saves a Saved Layout.
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
			'.a {}alert(1)',
			Visual_Portfolio_Security::sanitize_css( '.a {}</style><script>alert(1)</script>' )
		);
		$this->assertSame( '.a {}\\3c /STYLE', Visual_Portfolio_Security::sanitize_css( '.a {}</STYLE' ) );
	}

	/**
	 * CSS pasted inside a style element or an HTML comment keeps its rules.
	 *
	 * @return void
	 */
	public function test_sanitize_css_keeps_wrapped_rules() {
		$this->assertSame( '.a{b:c}', Visual_Portfolio_Security::sanitize_css( '<style>.a{b:c}</style>' ) );
		$this->assertSame( '.a{b:c}', Visual_Portfolio_Security::sanitize_css( '<style media="(width > 600px)">.a{b:c}</style>' ) );
		$this->assertSame( '  .a{b:c} -->', Visual_Portfolio_Security::sanitize_css( '<!-- .a{b:c} -->' ) );
	}

	/**
	 * A `<` that starts no tag keeps the rules after it.
	 *
	 * @return void
	 */
	public function test_sanitize_css_keeps_less_than() {
		$css = '@media (width <= 768px) { .a{b:c} } .d::before{content:"<"} .e{f:g}';

		$this->assertSame( $css, Visual_Portfolio_Security::sanitize_css( $css ) );
	}

	/**
	 * Removing one sequence cannot assemble another that closes the element.
	 *
	 * @return void
	 */
	public function test_sanitize_css_leaves_no_breakout() {
		foreach ( array( '</st</styleyle>', '</STYLE >', 'a</sty<!---->le>b', '</scr<!--ipt>', '<<!---->!--' ) as $css ) {
			$result = Visual_Portfolio_Security::sanitize_css( $css );

			$this->assertFalse( stripos( $result, '</style' ), $css );
			$this->assertFalse( stripos( $result, '</script' ), $css );
			$this->assertFalse( strpos( $result, '</' ), $css );
			$this->assertFalse( strpos( $result, '<!--' ), $css );
		}
	}

	/**
	 * An ESC byte cannot hide an end tag from the sanitizer on an ISO-2022-JP site.
	 *
	 * @return void
	 */
	public function test_sanitize_css_drops_escape_bytes() {
		$result = Visual_Portfolio_Security::sanitize_css( "<\x1b(B/style><img src=x onerror=alert(1) a\">" );

		$this->assertFalse( strpos( $result, '</' ) );
		$this->assertFalse( strpos( $result, "\x1b" ) );
	}

	/**
	 * An end tag of any element is escaped, not only style and script.
	 *
	 * @return void
	 */
	public function test_sanitize_css_escapes_any_end_tag() {
		$result = Visual_Portfolio_Security::sanitize_css( '</noscript a\'><img src=x onerror=alert(1) b">' );

		$this->assertFalse( strpos( $result, '</' ) );
	}

	/**
	 * Deeply nested end tags are handled in one pass.
	 *
	 * @return void
	 */
	public function test_sanitize_css_nested_input_is_fast() {
		$css = str_repeat( '</', 20000 ) . str_repeat( 'style', 20000 );

		$start  = microtime( true );
		$result = Visual_Portfolio_Security::sanitize_css( $css );

		$this->assertLessThan( 0.1, microtime( true ) - $start );
		$this->assertFalse( strpos( $result, '</' ) );
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

	/**
	 * The frame opens for a user whose only edit capability is on a post type
	 * a theme registers after the plugin's own `init` callbacks.
	 *
	 * @return void
	 */
	public function test_preview_sees_post_types_registered_late_on_init() {
		$this->login_as( 'subscriber' );
		wp_get_current_user()->add_cap( 'edit_vp_sec_things' );

		$_GET     = array( 'vp_preview' => 'vp_preview' );
		$_POST    = array(
			'vp_preview_nonce' => wp_create_nonce( 'vp-ajax-nonce' ),
			'vp_preview_frame' => 'true',
		);
		$_REQUEST = array_merge( $_GET, $_POST );

		// Only the callbacks of this load; the test case restores the hooks.
		remove_all_actions( 'init' );
		remove_all_actions( 'wp_loaded' );

		$preview = new Visual_Portfolio_Preview();

		add_action(
			'init',
			static function () {
				register_post_type(
					'vp_sec_thing',
					array(
						'show_in_rest'    => true,
						'capability_type' => array( 'vp_sec_thing', 'vp_sec_things' ),
						'map_meta_cap'    => true,
					)
				);
			},
			20
		);

		do_action( 'init' );
		do_action( 'wp_loaded' );

		$this->assertTrue( $preview->preview_enabled );
	}

	/**
	 * Post the preview flags with a valid nonce.
	 *
	 * @return void
	 */
	private function post_preview_request() {
		$_POST    = array(
			'vp_preview_nonce' => wp_create_nonce( 'vp-ajax-nonce' ),
			'vp_preview_frame' => 'true',
		);
		$_REQUEST = $_POST;
	}

	/**
	 * Galleries switch to preview mode only for a user who may open the frame.
	 *
	 * @return void
	 */
	public function test_is_preview_requires_edit_capability() {
		$this->login_as( 'subscriber' );
		$this->post_preview_request();
		$this->assertFalse( Visual_Portfolio_Get::is_preview() );

		$this->login_as( 'contributor' );
		$this->post_preview_request();
		$this->assertTrue( Visual_Portfolio_Get::is_preview() );
	}

	/**
	 * Render the preview frame of a gallery that asks for drafts.
	 *
	 * @return string
	 */
	private function render_draft_preview() {
		$_POST    = array(
			'vp_block_id'           => 'vp-sec-preview',
			'vp_content_source'     => 'post-based',
			'vp_posts_source'       => 'custom_query',
			'vp_posts_custom_query' => 'post_type=post&post_status=draft',
		);
		$_REQUEST = $_POST;

		$preview = new Visual_Portfolio_Preview();
		$scripts = $GLOBALS['wp_scripts'] ?? null;
		$styles  = $GLOBALS['wp_styles'] ?? null;

		// Registries of their own, so assets other tests left half registered
		// do not raise dependency notices here.
		$GLOBALS['wp_scripts'] = new WP_Scripts();
		$GLOBALS['wp_styles']  = new WP_Styles();

		ob_start();
		$preview->print_template();
		$html = ob_get_clean();

		$GLOBALS['wp_scripts'] = $scripts;
		$GLOBALS['wp_styles']  = $styles;

		return $html;
	}

	/**
	 * The frame's gallery shows a contributor no other user's draft, and an
	 * administrator the query as asked.
	 *
	 * @return void
	 */
	public function test_preview_gallery_query_is_narrowed_for_contributor() {
		$owner = self::factory()->user->create( array( 'role' => 'editor' ) );

		self::factory()->post->create(
			array(
				'post_author' => $owner,
				'post_status' => 'draft',
				'post_title'  => 'VP Sec Hidden Draft',
			)
		);

		$this->login_as( 'contributor' );
		$this->assertStringNotContainsString( 'VP Sec Hidden Draft', $this->render_draft_preview() );

		$this->login_as( 'administrator' );
		$this->assertStringContainsString( 'VP Sec Hidden Draft', $this->render_draft_preview() );
	}
}
