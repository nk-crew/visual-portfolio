<?php
/**
 * Tests for the `get_layout` REST route of Visual_Portfolio_Rest
 *
 * @package Visual Portfolio
 */

/**
 * Saved layout settings REST endpoint test case.
 */
class ClassRestGetLayout extends WP_UnitTestCase {
	/**
	 * Route the editor reads a Saved Layout's settings from.
	 */
	const ROUTE = '/visual-portfolio/v1/get_layout';

	/**
	 * User allowed to edit content.
	 *
	 * @var int
	 */
	private static $editor_id = 0;

	/**
	 * User not allowed to edit content.
	 *
	 * @var int
	 */
	private static $subscriber_id = 0;

	/**
	 * Saved layout with settings of its own.
	 *
	 * @var int
	 */
	private static $layout_id = 0;

	/**
	 * Create the users and the layout shared by the tests.
	 *
	 * @param WP_UnitTest_Factory $factory - test factory.
	 *
	 * @return void
	 */
	public static function wpSetUpBeforeClass( $factory ) {
		self::$editor_id     = $factory->user->create( array( 'role' => 'editor' ) );
		self::$subscriber_id = $factory->user->create( array( 'role' => 'subscriber' ) );
		self::$layout_id     = $factory->post->create(
			array(
				'post_type'   => 'vp_lists',
				'post_status' => 'publish',
			)
		);

		update_post_meta( self::$layout_id, 'vp_layout', 'masonry' );
		update_post_meta( self::$layout_id, 'vp_masonry_columns', '4' );
	}

	/**
	 * Start a REST server for every test.
	 *
	 * @return void
	 */
	public function set_up() {
		parent::set_up();

		// The test case unregisters post types the plugin registers on `init`.
		if ( ! post_type_exists( 'vp_lists' ) ) {
			register_post_type( 'vp_lists', array( 'map_meta_cap' => true ) );
		}

		global $wp_rest_server;

		$wp_rest_server = new WP_REST_Server();

		do_action( 'rest_api_init', $wp_rest_server );
	}

	/**
	 * Drop the REST server and the user.
	 *
	 * @return void
	 */
	public function tear_down() {
		global $wp_rest_server;

		$wp_rest_server = null;

		wp_set_current_user( 0 );

		parent::tear_down();
	}

	/**
	 * Ask the route for a post's settings.
	 *
	 * @param int $id - post id.
	 *
	 * @return WP_REST_Response
	 */
	private function dispatch( $id ) {
		$request = new WP_REST_Request( 'GET', self::ROUTE );
		$request->set_param( 'id', $id );

		return rest_get_server()->dispatch( $request );
	}

	/**
	 * An editor gets the layout's own settings, and the defaults for the rest.
	 *
	 * @return void
	 */
	public function test_returns_saved_and_default_settings() {
		wp_set_current_user( self::$editor_id );

		$response = $this->dispatch( self::$layout_id );
		$data     = $response->get_data();

		$this->assertSame( 200, $response->get_status() );
		$this->assertSame( 'masonry', $data['response']['layout'] );
		$this->assertEquals( 4, $data['response']['masonry_columns'] );
		$this->assertSame( '3|1,1|', $data['response']['tiles_type'] );
	}

	/**
	 * A user who cannot edit content is refused.
	 *
	 * @return void
	 */
	public function test_refuses_a_subscriber() {
		wp_set_current_user( self::$subscriber_id );

		$this->assertSame( 403, $this->dispatch( self::$layout_id )->get_status() );
	}

	/**
	 * A post that is not a Saved Layout is not found.
	 *
	 * @return void
	 */
	public function test_not_found_for_another_post_type() {
		wp_set_current_user( self::$editor_id );

		$page_id = self::factory()->post->create( array( 'post_type' => 'page' ) );

		$this->assertSame( 404, $this->dispatch( $page_id )->get_status() );
	}
}
