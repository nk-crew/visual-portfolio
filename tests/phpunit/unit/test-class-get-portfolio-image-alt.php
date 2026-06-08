<?php
/**
 * Tests image alt behavior in query params and popup data.
 *
 * @package Visual Portfolio
 */

/**
 * Test case for image alt behavior in Visual_Portfolio_Get.
 */
class Test_Class_Get_Portfolio_Image_Alt extends WP_UnitTestCase {
	/**
	 * Item alt should override attachment alt for Image Alt source.
	 */
	public function test_image_alt_source_prefers_item_level_alt() {
		$attach_id = $this->wp_insert_attachment(
			dirname( dirname( __FILE__ ) ) . '/fixtures/image.png'
		);

		update_post_meta( $attach_id, '_wp_attachment_image_alt', 'Attachment alt' );

		$query = Visual_Portfolio_Get::get_query_params(
			array(
				'content_source'             => 'images',
				'images'                     => array(
					array(
						'id'          => $attach_id,
						'imgUrl'      => wp_get_attachment_image_url( $attach_id, 'full' ),
						'alt'         => 'Item alt',
						'description' => 'Item description',
					),
				),
				'images_titles_source'       => 'alt',
				'images_descriptions_source' => 'alt',
				'images_order_by'            => 'default',
				'images_order_direction'     => 'asc',
				'items_count'                => 10,
			),
			true
		);

		$this->assertNotEmpty( $query['images'] );
		$this->assertSame( 'Item alt', $query['images'][0]['title'] );
		$this->assertSame( 'Item alt', $query['images'][0]['description'] );
	}

	/**
	 * Attachment alt should be used for legacy items without local alt.
	 */
	public function test_image_alt_source_falls_back_to_attachment_alt_for_legacy_items() {
		$attach_id = $this->wp_insert_attachment(
			dirname( dirname( __FILE__ ) ) . '/fixtures/image.png'
		);

		update_post_meta( $attach_id, '_wp_attachment_image_alt', 'Attachment alt' );

		$query = Visual_Portfolio_Get::get_query_params(
			array(
				'content_source'             => 'images',
				'images'                     => array(
					array(
						'id'          => $attach_id,
						'imgUrl'      => wp_get_attachment_image_url( $attach_id, 'full' ),
						'description' => 'Legacy description',
					),
				),
				'images_titles_source'       => 'alt',
				'images_descriptions_source' => 'alt',
				'images_order_by'            => 'default',
				'images_order_direction'     => 'asc',
				'items_count'                => 10,
			),
			true
		);

		$this->assertNotEmpty( $query['images'] );
		$this->assertSame( 'Attachment alt', $query['images'][0]['title'] );
		$this->assertSame( 'Attachment alt', $query['images'][0]['description'] );
	}

	/**
	 * Empty item alt should fall back to attachment alt.
	 */
	public function test_image_alt_source_falls_back_to_attachment_alt_for_empty_item_alt() {
		$attach_id = $this->wp_insert_attachment(
			dirname( dirname( __FILE__ ) ) . '/fixtures/image.png'
		);

		update_post_meta( $attach_id, '_wp_attachment_image_alt', 'Attachment alt' );

		$query = Visual_Portfolio_Get::get_query_params(
			array(
				'content_source'             => 'images',
				'images'                     => array(
					array(
						'id'     => $attach_id,
						'imgUrl' => wp_get_attachment_image_url( $attach_id, 'full' ),
						'alt'    => '',
					),
				),
				'images_titles_source'       => 'alt',
				'images_descriptions_source' => 'alt',
				'images_order_by'            => 'default',
				'images_order_direction'     => 'asc',
				'items_count'                => 10,
			),
			true
		);

		$this->assertNotEmpty( $query['images'] );
		$this->assertSame( 'Attachment alt', $query['images'][0]['title'] );
		$this->assertSame( 'Attachment alt', $query['images'][0]['description'] );
	}

	/**
	 * Popup image alt should prefer the item-level alt value.
	 */
	public function test_popup_image_prefers_item_level_alt() {
		$attach_id = $this->wp_insert_attachment(
			dirname( dirname( __FILE__ ) ) . '/fixtures/image.png'
		);

		update_post_meta( $attach_id, '_wp_attachment_image_alt', 'Attachment alt' );

		$popup_image = Visual_Portfolio_Get::get_popup_image(
			$attach_id,
			array(
				'image_id'          => $attach_id,
				'img_size_popup'    => 'full',
				'img_size_md_popup' => 'full',
				'img_size_sm_popup' => 'full',
				'title'             => '',
				'content'           => '',
				'author'            => '',
				'author_url'        => '',
				'alt'               => 'Item alt',
			)
		);

		$this->assertSame( 'Item alt', $popup_image['alt'] );
	}

	/**
	 * Insert a WordPress attachment for tests.
	 *
	 * @param string $image_url Absolute path to the image fixture.
	 * @return bool|int
	 */
	private function wp_insert_attachment( $image_url ) {
		$upload_dir = wp_upload_dir();
		$image_data = file_get_contents( $image_url );
		$filename   = basename( $image_url );

		if ( wp_mkdir_p( $upload_dir['path'] ) ) {
			$file = $upload_dir['path'] . '/' . $filename;
		} else {
			$file = $upload_dir['basedir'] . '/' . $filename;
		}

		file_put_contents( $file, $image_data );

		$wp_filetype = wp_check_filetype( $filename, null );
		$attachment  = array(
			'post_mime_type' => $wp_filetype['type'],
			'post_title'     => sanitize_file_name( $filename ),
			'post_content'   => '',
			'post_status'    => 'inherit',
		);

		$attach_id = wp_insert_attachment( $attachment, $file );

		if ( ! is_wp_error( $attach_id ) ) {
			require_once ABSPATH . 'wp-admin/includes/image.php';

			$attach_data = wp_generate_attachment_metadata( $attach_id, $file );
			wp_update_attachment_metadata( $attach_id, $attach_data );
		}

		return is_wp_error( $attach_id ) ? false : $attach_id;
	}
}