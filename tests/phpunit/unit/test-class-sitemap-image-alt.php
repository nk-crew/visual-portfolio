<?php
/**
 * Tests sitemap image alt priority.
 *
 * @package Visual Portfolio
 */

/**
 * Test case for sitemap image alt priority.
 */
class Test_Class_Sitemap_Image_Alt extends WP_UnitTestCase {
	/**
	 * Sitemap should prefer item alt, then description, then attachment alt.
	 */
	public function test_sitemap_prefers_item_alt_then_description_then_attachment_alt() {
		$first_id  = $this->wp_insert_attachment( dirname( dirname( __FILE__ ) ) . '/fixtures/image.png' );
		$second_id = $this->wp_insert_attachment( dirname( dirname( __FILE__ ) ) . '/fixtures/image.png' );
		$third_id  = $this->wp_insert_attachment( dirname( dirname( __FILE__ ) ) . '/fixtures/image.png' );

		update_post_meta( $first_id, '_wp_attachment_image_alt', 'Attachment alt one' );
		update_post_meta( $second_id, '_wp_attachment_image_alt', 'Attachment alt two' );
		update_post_meta( $third_id, '_wp_attachment_image_alt', 'Attachment alt three' );

		$block = serialize_block(
			array(
				'blockName'    => 'visual-portfolio/block',
				'attrs'        => array(
					'block_id'       => 'test-custom-image-alt',
					'content_source' => 'images',
					'images'         => array(
						array(
							'id'          => $first_id,
							'imgUrl'      => wp_get_attachment_image_url( $first_id, 'full' ),
							'title'       => 'First image',
							'alt'         => 'Item alt',
							'description' => 'First description',
						),
						array(
							'id'          => $second_id,
							'imgUrl'      => wp_get_attachment_image_url( $second_id, 'full' ),
							'title'       => 'Second image',
							'description' => 'Legacy description',
						),
						array(
							'id'     => $third_id,
							'imgUrl' => wp_get_attachment_image_url( $third_id, 'full' ),
							'title'  => 'Third image',
						),
					),
				),
				'innerBlocks'  => array(),
				'innerHTML'    => '',
				'innerContent' => array(),
			)
		);

		$post_id = self::factory()->post->create(
			array(
				'post_type'    => 'page',
				'post_content' => $block,
			)
		);

		$sitemap_images = ( new Visual_Portfolio_Sitemap() )->add_images_to_sitemap( array(), $post_id );

		$this->assertCount( 3, $sitemap_images );
		$this->assertSame( 'Item alt', $sitemap_images[0]['alt'] );
		$this->assertSame( 'Legacy description', $sitemap_images[1]['alt'] );
		$this->assertSame( 'Attachment alt three', $sitemap_images[2]['alt'] );
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