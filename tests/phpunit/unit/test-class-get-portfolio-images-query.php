<?php
/**
 * Tests which attachments the Images content source loads.
 *
 * @package Visual Portfolio
 */

/**
 * Test case for attachment loading in Visual_Portfolio_Get::get_query_params().
 */
class Test_Class_Get_Portfolio_Images_Query extends WP_UnitTestCase {
	/**
	 * Gallery attachments, in the order they are added to the gallery.
	 *
	 * @var array
	 */
	private $attachment_ids = array();

	/**
	 * `post__in` of every attachment query made during a test.
	 *
	 * @var array
	 */
	private $requested_ids = array();

	/**
	 * Create a gallery of 12 attachments with unique titles.
	 */
	public function set_up() {
		parent::set_up();

		$this->attachment_ids = array();
		$this->requested_ids  = array();

		for ( $i = 1; $i <= 12; $i++ ) {
			$id = wp_insert_post(
				array(
					'post_type'      => 'attachment',
					'post_status'    => 'inherit',
					// 7 and 12 are coprime, so every title is unique and the
					// title order differs from the gallery order.
					'post_title'     => sprintf( 'Title %02d', ( $i * 7 ) % 12 ),
					'post_mime_type' => 'image/jpeg',
				)
			);

			update_post_meta( $id, '_wp_attachment_image_alt', sprintf( 'Alt %02d', $i ) );

			$this->attachment_ids[] = $id;
		}

		add_action( 'pre_get_posts', array( $this, 'capture_attachment_query' ) );
	}

	/**
	 * Reset the request and the captured queries.
	 */
	public function tear_down() {
		remove_action( 'pre_get_posts', array( $this, 'capture_attachment_query' ) );

		unset( $_GET['vp_page'] );

		parent::tear_down();
	}

	/**
	 * Remember the attachments each query asked for.
	 *
	 * @param WP_Query $query current query.
	 */
	public function capture_attachment_query( $query ) {
		if ( 'attachment' === $query->get( 'post_type' ) ) {
			$this->requested_ids[] = array_map( 'intval', (array) $query->get( 'post__in' ) );
		}
	}

	/**
	 * Get query params for the gallery.
	 *
	 * @param array $options options to override.
	 *
	 * @return array
	 */
	private function get_query_params( $options = array() ) {
		$images = array();
		foreach ( $this->attachment_ids as $id ) {
			$images[] = array(
				'id'     => $id,
				'imgUrl' => 'https://example.com/image.jpg',
			);
		}

		return Visual_Portfolio_Get::get_query_params(
			array_merge(
				array(
					'content_source'             => 'images',
					'images'                     => $images,
					'images_titles_source'       => 'custom',
					'images_descriptions_source' => 'custom',
					'images_order_by'            => 'default',
					'images_order_direction'     => 'asc',
					'items_count'                => 4,
					'pagination'                 => 'paged',
				),
				$options
			)
		);
	}

	/**
	 * Manual order is known upfront, so only the current page is loaded.
	 */
	public function test_manual_order_loads_only_the_current_page_attachments() {
		$_GET['vp_page'] = 2;

		$query = $this->get_query_params();

		$this->assertCount( 4, $query['images'] );
		$this->assertCount( 1, $this->requested_ids );
		$this->assertSame( array_slice( $this->attachment_ids, 4, 4 ), $this->requested_ids[0] );
	}

	/**
	 * Sorting by attachment data needs every attachment of the gallery.
	 */
	public function test_order_by_image_title_loads_every_attachment() {
		$_GET['vp_page'] = 2;

		$query = $this->get_query_params( array( 'images_order_by' => 'image_title' ) );

		$this->assertCount( 1, $this->requested_ids );
		$this->assertSame( $this->attachment_ids, $this->requested_ids[0] );

		// The page is a slice of the whole gallery sorted by attachment title.
		$sorted = array();
		foreach ( $this->attachment_ids as $id ) {
			$sorted[ get_post_field( 'post_title', $id ) ] = $id;
		}
		ksort( $sorted );

		$this->assertSame(
			array_slice( array_values( $sorted ), 4, 4 ),
			wp_list_pluck( $query['images'], 'id' )
		);
	}

	/**
	 * Images of the current page keep the data stored on their attachments.
	 */
	public function test_current_page_images_keep_attachment_data() {
		$_GET['vp_page'] = 2;

		$query = $this->get_query_params();

		foreach ( $query['images'] as $image ) {
			$this->assertSame( get_post_field( 'post_title', $image['id'] ), $image['image_title'] );
			$this->assertSame( get_post_meta( $image['id'], '_wp_attachment_image_alt', true ), $image['image_alt'] );
			$this->assertNotEmpty( $image['published_time'] );
		}
	}
}
