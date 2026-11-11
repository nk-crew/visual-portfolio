<?php
/**
 * Tests for the `gallery_file_matches` REST route of Visual_Portfolio_Rest
 *
 * @package Visual Portfolio
 */

/**
 * Bulk import duplicate lookup test case.
 */
class ClassRestGalleryFileMatches extends WP_UnitTestCase {
	const ROUTE = '/visual-portfolio/v1/gallery_file_matches';

	/**
	 * Fixture uploaded as the gallery's image.
	 *
	 * @var string
	 */
	private $fixture = '';

	/**
	 * Attachment made from the fixture.
	 *
	 * @var int
	 */
	private $attachment_id = 0;

	/**
	 * Upload the fixture and route requests to a fresh server.
	 *
	 * @return void
	 */
	public function set_up() {
		parent::set_up();

		global $wp_rest_server;

		$wp_rest_server = new WP_REST_Server();

		do_action( 'rest_api_init', $wp_rest_server );

		wp_set_current_user( self::factory()->user->create( array( 'role' => 'author' ) ) );

		$this->fixture       = dirname( __DIR__ ) . '/fixtures/image.png';
		$this->attachment_id = self::factory()->attachment->create_upload_object( $this->fixture );
	}

	/**
	 * Drop the upload and the server.
	 *
	 * @return void
	 */
	public function tear_down() {
		global $wp_rest_server;

		wp_delete_attachment( $this->attachment_id, true );

		$wp_rest_server = null;

		wp_set_current_user( 0 );

		parent::tear_down();
	}

	/**
	 * Ask the route which of the files the gallery holds.
	 *
	 * @param array $ids   - attachment ids of the gallery.
	 * @param array $files - `{ name, size }` of each file.
	 * @return WP_REST_Response
	 */
	private function match( $ids, $files ) {
		$request = new WP_REST_Request( 'POST', self::ROUTE );

		$request->set_body_params(
			array(
				'ids'   => $ids,
				'files' => $files,
			)
		);

		return rest_get_server()->dispatch( $request );
	}

	/**
	 * The name the upload was saved under.
	 *
	 * @return string
	 */
	private function uploaded_name() {
		return wp_basename( get_attached_file( $this->attachment_id ) );
	}

	/**
	 * A file of the same name and size matches; one of another size does not.
	 *
	 * @return void
	 */
	public function test_matches_name_and_size() {
		$size     = filesize( $this->fixture );
		$response = $this->match(
			array( $this->attachment_id ),
			array(
				array(
					'name' => 'other.png',
					'size' => $size,
				),
				array(
					'name' => $this->uploaded_name(),
					'size' => $size,
				),
				array(
					'name' => $this->uploaded_name(),
					'size' => $size + 1,
				),
			)
		);

		$this->assertSame( 200, $response->get_status() );
		$this->assertSame( array( 1 ), $response->get_data()['response']['matches'] );
	}

	/**
	 * A name WordPress would sanitize on upload matches the sanitized one.
	 *
	 * @return void
	 */
	public function test_matches_the_sanitized_name() {
		$name = $this->uploaded_name();

		$response = $this->match(
			array( $this->attachment_id ),
			array(
				array(
					'name' => ' ' . $name,
					'size' => filesize( $this->fixture ),
				),
			)
		);

		$this->assertSame( array( 0 ), $response->get_data()['response']['matches'] );
	}

	/**
	 * A second upload of a name WordPress saved with `-1` still matches it.
	 *
	 * @return void
	 */
	public function test_matches_a_name_taken_twice() {
		$second = self::factory()->attachment->create_upload_object( $this->fixture );
		$name   = wp_basename( $this->fixture );

		$this->assertNotSame( $name, wp_basename( get_attached_file( $second ) ) );

		$response = $this->match(
			array( $second ),
			array(
				array(
					'name' => $name,
					'size' => filesize( $this->fixture ),
				),
			)
		);

		wp_delete_attachment( $second, true );

		$this->assertSame( array( 0 ), $response->get_data()['response']['matches'] );
	}

	/**
	 * An attachment the user may not read tells nothing about its file.
	 *
	 * @return void
	 */
	public function test_skips_an_attachment_the_user_cannot_read() {
		$owner   = self::factory()->user->create( array( 'role' => 'editor' ) );
		$private = self::factory()->post->create(
			array(
				'post_status' => 'private',
				'post_author' => $owner,
			)
		);

		wp_update_post(
			array(
				'ID'          => $this->attachment_id,
				'post_parent' => $private,
				'post_author' => $owner,
			)
		);

		$response = $this->match(
			array( $this->attachment_id ),
			array(
				array(
					'name' => $this->uploaded_name(),
					'size' => filesize( $this->fixture ),
				),
			)
		);

		$this->assertSame( array(), $response->get_data()['response']['matches'] );
	}

	/**
	 * A user who cannot upload cannot ask.
	 *
	 * @return void
	 */
	public function test_refuses_a_user_without_upload_files() {
		wp_set_current_user( self::factory()->user->create( array( 'role' => 'contributor' ) ) );

		$response = $this->match( array( $this->attachment_id ), array() );

		$this->assertSame( 403, $response->get_status() );
	}
}
