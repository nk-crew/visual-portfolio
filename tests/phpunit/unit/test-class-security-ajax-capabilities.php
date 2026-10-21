<?php
/**
 * Capability checks of the AJAX handlers.
 *
 * @package Visual Portfolio
 */

/**
 * A nonce proves the request came from the site, not that the user may make it.
 */
class Test_Visual_Portfolio_Security_Ajax_Capabilities extends WP_Ajax_UnitTestCase {
	/**
	 * Requests made by the oEmbed lookup.
	 *
	 * @var int
	 */
	private $http_requests = 0;

	/**
	 * Reset the request state.
	 *
	 * @return void
	 */
	public function set_up() {
		parent::set_up();

		$_POST    = array();
		$_GET     = array();
		$_REQUEST = array();

		$this->http_requests = 0;
	}

	/**
	 * Run an AJAX action and tell how it ended.
	 *
	 * @param string $action - action name.
	 * @param array  $data   - request fields.
	 *
	 * @return array output and the message wp_die() was called with.
	 */
	private function run_ajax( $action, $data ) {
		$_POST    = $data;
		$_REQUEST = $data;
		$_GET     = $data;

		$message = null;

		try {
			$this->_handleAjax( $action );
		} catch ( WPAjaxDieStopException $e ) {
			$message = $e->getMessage();
		} catch ( WPAjaxDieContinueException $e ) {
			$message = $e->getMessage();
		}

		return array(
			'output'  => $this->_last_response,
			'message' => $message,
		);
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
	 * Posts the search for "VPSecSearch" can find.
	 *
	 * @return void
	 */
	private function create_search_posts() {
		$owner = self::factory()->user->create( array( 'role' => 'administrator' ) );

		foreach ( array( 'publish', 'draft', 'private' ) as $status ) {
			self::factory()->post->create(
				array(
					'post_title'  => 'VPSecSearch ' . $status,
					'post_status' => $status,
					'post_author' => $owner,
				)
			);
		}
	}

	/**
	 * A subscriber gets no post list from the dynamic control callback.
	 *
	 * @return void
	 */
	public function test_dynamic_control_refuses_subscriber() {
		$this->create_search_posts();
		$this->login_as( 'subscriber' );

		$result = $this->run_ajax(
			'vp_dynamic_control_callback',
			array(
				'nonce'           => wp_create_nonce( 'vp-ajax-nonce' ),
				'vp_control_name' => 'posts_ids',
				'q'               => 'VPSecSearch',
			)
		);

		$this->assertSame( '-1', $result['message'] );
		$this->assertStringNotContainsString( 'VPSecSearch', $result['output'] );
	}

	/**
	 * A contributor finds published posts but not other users' drafts or private posts.
	 *
	 * @return void
	 */
	public function test_dynamic_control_lists_only_readable_posts() {
		$this->create_search_posts();
		$this->login_as( 'contributor' );

		$result = $this->run_ajax(
			'vp_dynamic_control_callback',
			array(
				'nonce'           => wp_create_nonce( 'vp-ajax-nonce' ),
				'vp_control_name' => 'posts_ids',
				'q'               => 'VPSecSearch',
			)
		);

		$data   = json_decode( $result['output'], true );
		$labels = wp_list_pluck( $data['response']['options'], 'label' );

		$this->assertSame( array( 'VPSecSearch publish' ), array_values( $labels ) );
	}

	/**
	 * A subscriber cannot make the site fetch an oEmbed URL.
	 *
	 * @return void
	 */
	public function test_find_oembed_refuses_subscriber() {
		$this->login_as( 'subscriber' );
		add_filter( 'pre_http_request', array( $this, 'fake_oembed_response' ), 10, 3 );

		$result = $this->run_ajax(
			'vp_find_oembed',
			array(
				'nonce' => wp_create_nonce( 'vp-ajax-nonce' ),
				'q'     => 'https://www.youtube.com/watch?v=vpsecrefused',
			)
		);

		$this->assertSame( '-1', $result['message'] );
		$this->assertSame( 0, $this->http_requests );
	}

	/**
	 * A contributor gets the oEmbed data of a video URL.
	 *
	 * @return void
	 */
	public function test_find_oembed_allows_contributor() {
		// `get_oembed_data()` loads the deprecated `class-oembed.php` on its first call.
		$this->setExpectedDeprecated( 'class-oembed.php' );

		$this->login_as( 'contributor' );
		add_filter( 'pre_http_request', array( $this, 'fake_oembed_response' ), 10, 3 );

		$result = $this->run_ajax(
			'vp_find_oembed',
			array(
				'nonce' => wp_create_nonce( 'vp-ajax-nonce' ),
				'q'     => 'https://www.youtube.com/watch?v=vpsecallowed',
			)
		);

		$data = json_decode( $result['output'], true );

		$this->assertSame( 1, $this->http_requests );
		$this->assertSame( '<iframe></iframe>', $data['html'] );
	}

	/**
	 * Answer an oEmbed request without the network, and refuse any other.
	 *
	 * @param false|array $pre  - preempted response.
	 * @param array       $args - request arguments.
	 * @param string      $url  - request URL.
	 *
	 * @return array|WP_Error
	 */
	public function fake_oembed_response( $pre, $args, $url ) {
		if ( false === strpos( $url, 'youtube.com/oembed' ) ) {
			return new WP_Error( 'vp_test_offline', 'No network in tests.' );
		}

		++$this->http_requests;

		return array(
			'headers'  => array(),
			'body'     => wp_json_encode(
				array(
					'version' => '1.0',
					'type'    => 'video',
					'html'    => '<iframe></iframe>',
				)
			),
			'response' => array(
				'code'    => 200,
				'message' => 'OK',
			),
			'cookies'  => array(),
			'filename' => null,
		);
	}

	/**
	 * Only a user of the settings screen gets the archive page list.
	 *
	 * @return void
	 */
	public function test_pages_list_requires_manage_options() {
		self::factory()->post->create(
			array(
				'post_type'  => 'page',
				'post_title' => 'VPSecPage',
			)
		);

		$this->login_as( 'editor' );

		$refused = $this->run_ajax( 'vp_get_pages_list', array( 'nonce' => wp_create_nonce( 'vp-ajax-nonce' ) ) );

		$this->assertSame( '', $refused['output'] );

		$this->login_as( 'administrator' );

		$allowed = $this->run_ajax( 'vp_get_pages_list', array( 'nonce' => wp_create_nonce( 'vp-ajax-nonce' ) ) );

		$this->assertStringContainsString( 'VPSecPage', $allowed['output'] );
	}

	/**
	 * A subscriber cannot dismiss the review notice for the whole site.
	 *
	 * @return void
	 */
	public function test_ask_review_dismiss_refuses_subscriber() {
		delete_site_option( 'vpf_ask_review_notice_state' );
		$this->login_as( 'subscriber' );

		$result = $this->run_ajax(
			'vpf_dismiss_ask_review_notice',
			array(
				'nonce' => wp_create_nonce( 'vpf_ask_review_notice' ),
				'type'  => 'already',
			)
		);

		$this->assertSame( '-1', $result['message'] );
		$this->assertFalse( get_site_option( 'vpf_ask_review_notice_state' ) );
	}

	/**
	 * An administrator dismisses the review notice.
	 *
	 * @return void
	 */
	public function test_ask_review_dismiss_allows_administrator() {
		delete_site_option( 'vpf_ask_review_notice_state' );
		$this->login_as( 'administrator' );

		$this->run_ajax(
			'vpf_dismiss_ask_review_notice',
			array(
				'nonce' => wp_create_nonce( 'vpf_ask_review_notice' ),
				'type'  => 'already',
			)
		);

		$this->assertSame( 'already', get_site_option( 'vpf_ask_review_notice_state' ) );
	}
}
