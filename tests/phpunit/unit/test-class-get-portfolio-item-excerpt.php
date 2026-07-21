<?php
/**
 * Tests item excerpt for lightbox popup data.
 *
 * @package Visual Portfolio
 */

/**
 * Test case for Visual_Portfolio_Get::get_item_excerpt and popup payloads.
 */
class Test_Class_Get_Portfolio_Item_Excerpt extends WP_UnitTestCase {
	/**
	 * Post with a manual excerpt should use that text.
	 */
	public function test_post_with_manual_excerpt() {
		$post_id = self::factory()->post->create(
			array(
				'post_title'   => 'Post with excerpt',
				'post_content' => 'One two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen',
				'post_excerpt' => 'Manual excerpt one two three',
			)
		);

		$excerpt = Visual_Portfolio_Get::get_item_excerpt(
			array(
				'post_id' => $post_id,
				'content' => get_post_field( 'post_content', $post_id ),
				'excerpt' => '',
				'opts'    => array(
					'show_excerpt'        => false,
					'excerpt_words_count' => 5,
				),
			)
		);

		$this->assertSame( 'Manual excerpt one two three', $excerpt );
	}

	/**
	 * Post without excerpt should trim content.
	 */
	public function test_post_without_excerpt_trims_content() {
		$content = 'One two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen';
		$post_id = self::factory()->post->create(
			array(
				'post_title'   => 'Post without excerpt',
				'post_content' => $content,
				'post_excerpt' => '',
			)
		);

		$excerpt = Visual_Portfolio_Get::get_item_excerpt(
			array(
				'post_id' => $post_id,
				'content' => $content,
				'excerpt' => '',
				'opts'    => array(
					'show_excerpt'        => false,
					'excerpt_words_count' => 5,
				),
			)
		);

		$this->assertSame( 'One two three four five...', $excerpt );
	}

	/**
	 * Image item with description should trim content.
	 */
	public function test_image_with_description_trims_content() {
		$excerpt = Visual_Portfolio_Get::get_item_excerpt(
			array(
				'post_id' => '',
				'content' => 'One two three four five six seven eight nine ten',
				'excerpt' => '',
				'opts'    => array(
					'show_excerpt'        => false,
					'excerpt_words_count' => 4,
				),
			)
		);

		$this->assertSame( 'One two three four...', $excerpt );
	}

	/**
	 * Image item without description should return empty string.
	 */
	public function test_image_without_description_returns_empty() {
		$excerpt = Visual_Portfolio_Get::get_item_excerpt(
			array(
				'post_id' => '',
				'content' => '',
				'excerpt' => '',
				'opts'    => array(
					'show_excerpt'        => false,
					'excerpt_words_count' => 15,
				),
			)
		);

		$this->assertSame( '', $excerpt );
	}

	/**
	 * Popup image data should include item_excerpt even when show_excerpt is off.
	 */
	public function test_popup_image_includes_item_excerpt_when_show_excerpt_off() {
		$attach_id = $this->wp_insert_attachment(
			dirname( dirname( __FILE__ ) ) . '/fixtures/image.png'
		);

		$popup_image = Visual_Portfolio_Get::get_popup_image(
			$attach_id,
			array(
				'image_id'          => $attach_id,
				'img_size_popup'    => 'full',
				'img_size_md_popup' => 'full',
				'img_size_sm_popup' => 'full',
				'title'             => 'Item title',
				'content'           => 'One two three four five six seven eight nine ten',
				'excerpt'           => '',
				'author'            => '',
				'author_url'        => '',
				'opts'              => array(
					'show_excerpt'        => false,
					'excerpt_words_count' => 5,
				),
			)
		);

		$this->assertSame( 'One two three four five...', $popup_image['item_excerpt'] );
		$this->assertSame( 'One two three four five six seven eight nine ten', $popup_image['item_description'] );
	}

	/**
	 * Popup video data should include item_excerpt.
	 */
	public function test_popup_video_includes_item_excerpt() {
		$attach_id = $this->wp_insert_attachment(
			dirname( dirname( __FILE__ ) ) . '/fixtures/image.png'
		);

		$popup_video = Visual_Portfolio_Get::get_popup_video(
			array(
				'format_video_url' => 'https://example.com/video.mp4',
				'image_id'         => $attach_id,
				'title'            => 'Video title',
				'content'          => 'One two three four five six',
				'excerpt'          => '',
				'author'           => '',
				'author_url'       => '',
				'opts'             => array(
					'show_excerpt'        => false,
					'excerpt_words_count' => 3,
				),
			)
		);

		$this->assertSame( 'One two three...', $popup_video['item_excerpt'] );
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
