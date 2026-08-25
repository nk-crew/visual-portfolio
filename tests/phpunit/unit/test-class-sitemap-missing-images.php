<?php
/**
 * Tests for sitemap entries that have no image behind them.
 *
 * @package Visual Portfolio
 */

/**
 * Missing images sitemap test case.
 *
 * An entry the sitemap cannot name a URL for reaches the SEO plugins as
 * `image:loc => false`, so it must not be built at all.
 */
class ClassSitemapMissingImages extends WP_UnitTestCase {
	/**
	 * Sitemap images of a page holding a gallery with the given attributes.
	 *
	 * @param array $attrs - legacy block attributes.
	 *
	 * @return array
	 */
	private function get_sitemap_images( $attrs ) {
		$post_id = self::factory()->post->create(
			array(
				'post_type'    => 'page',
				'post_content' => serialize_block(
					array(
						'blockName'    => 'visual-portfolio/block',
						'attrs'        => $attrs,
						'innerBlocks'  => array(),
						'innerHTML'    => '',
						'innerContent' => array(),
					)
				),
			)
		);

		return ( new Visual_Portfolio_Sitemap() )->add_images_to_sitemap( array(), $post_id );
	}

	/**
	 * A posts gallery lists the posts that have a featured image, and only those.
	 *
	 * @return void
	 */
	public function test_a_post_without_a_featured_image_is_skipped() {
		$attachment_id = self::factory()->attachment->create_upload_object( dirname( __DIR__ ) . '/fixtures/image.png' );

		self::factory()->post->create_many( 2 );
		self::factory()->post->create( array( 'meta_input' => array( '_thumbnail_id' => $attachment_id ) ) );

		$entries = $this->get_sitemap_images(
			array(
				'block_id'       => 'sitemap-missing-thumbnails',
				'content_source' => 'post-based',
				'posts_source'   => 'post',
			)
		);

		$this->assertCount( 1, $entries );
		$this->assertSame( wp_get_attachment_image_url( $attachment_id, 'full' ), $entries[0]['src'] );
	}

	/**
	 * An images gallery skips a picture whose attachment is gone.
	 *
	 * @return void
	 */
	public function test_an_image_without_a_url_is_skipped() {
		$attachment_id = self::factory()->attachment->create_upload_object( dirname( __DIR__ ) . '/fixtures/image.png' );

		$entries = $this->get_sitemap_images(
			array(
				'block_id'       => 'sitemap-missing-attachment',
				'content_source' => 'images',
				'images'         => array(
					array(
						'id'     => $attachment_id,
						'imgUrl' => wp_get_attachment_image_url( $attachment_id, 'full' ),
						'title'  => 'Kept image',
					),
					array(
						'id'    => $attachment_id + 1000,
						'title' => 'Deleted image',
					),
				),
			)
		);

		$this->assertCount( 1, $entries );
		$this->assertSame( 'Kept image', $entries[0]['title'] );
	}
}
