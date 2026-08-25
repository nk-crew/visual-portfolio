<?php
/**
 * Tests for the sitemap entries of the Gallery Loop family.
 *
 * @package Visual Portfolio
 */

/**
 * Loop sitemap test case.
 */
class ClassSitemapLoop extends WP_UnitTestCase {
	/**
	 * Attachment ids created for a test.
	 *
	 * @var array
	 */
	private $attachments = array();

	/**
	 * Create the given number of attachments.
	 *
	 * @param int $count - number of attachments.
	 *
	 * @return array Image entries, as the images source stores them.
	 */
	private function get_images( $count ) {
		$images = array();

		for ( $i = 0; $i < $count; $i++ ) {
			$id = self::factory()->attachment->create_upload_object( dirname( __DIR__ ) . '/fixtures/image.png' );

			$this->attachments[] = $id;

			$images[] = array(
				'id'    => $id,
				'title' => 'Loop image ' . ( $i + 1 ),
				'alt'   => 'Loop alt ' . ( $i + 1 ),
			);
		}

		return $images;
	}

	/**
	 * Serialize a Gallery Loop around the given item blocks.
	 *
	 * @param array $attrs       - loop attributes.
	 * @param array $item_blocks - block names inside the item template.
	 *
	 * @return string
	 */
	private function get_loop_markup( $attrs, $item_blocks ) {
		$items = '';

		foreach ( $item_blocks as $name ) {
			$items .= '<!-- wp:' . $name . ' /-->';
		}

		return sprintf(
			'<!-- wp:visual-portfolio/loop %1$s --><div class="wp-block-visual-portfolio-loop vp-block-loop"><!-- wp:visual-portfolio/item-template -->%2$s<!-- /wp:visual-portfolio/item-template --></div><!-- /wp:visual-portfolio/loop -->',
			wp_json_encode( $attrs ),
			$items
		);
	}

	/**
	 * Sitemap images of a page holding the given content.
	 *
	 * @param string $content - post content.
	 *
	 * @return array
	 */
	private function get_sitemap_images( $content ) {
		$post_id = self::factory()->post->create(
			array(
				'post_type'    => 'page',
				'post_content' => $content,
			)
		);

		return ( new Visual_Portfolio_Sitemap() )->add_images_to_sitemap( array(), $post_id );
	}

	/**
	 * An images loop puts its pictures in the sitemap.
	 *
	 * @return void
	 */
	public function test_images_source_is_listed() {
		$images = $this->get_images( 2 );

		$entries = $this->get_sitemap_images(
			$this->get_loop_markup(
				array(
					'block_id'    => 'sitemap-images',
					'queryType'   => 'images',
					'imagesQuery' => array( 'images' => $images ),
				),
				array( 'visual-portfolio/item-image' )
			)
		);

		$this->assertCount( 2, $entries );
		$this->assertSame( 'Loop alt 1', $entries[0]['alt'] );
		$this->assertSame( 'Loop image 2', $entries[1]['title'] );
	}

	/**
	 * A loop nested inside another block is found as well.
	 *
	 * @return void
	 */
	public function test_nested_loop_is_found() {
		$images = $this->get_images( 1 );

		$loop = $this->get_loop_markup(
			array(
				'block_id'    => 'sitemap-nested',
				'queryType'   => 'images',
				'imagesQuery' => array( 'images' => $images ),
			),
			array( 'visual-portfolio/item-cover' )
		);

		$entries = $this->get_sitemap_images(
			'<!-- wp:group --><div class="wp-block-group">' . $loop . '</div><!-- /wp:group -->'
		);

		$this->assertCount( 1, $entries );
	}

	/**
	 * A loop that renders no image tells the sitemap nothing.
	 *
	 * @return void
	 */
	public function test_loop_without_an_image_block_is_skipped() {
		$images = $this->get_images( 2 );

		$entries = $this->get_sitemap_images(
			$this->get_loop_markup(
				array(
					'block_id'    => 'sitemap-titles-only',
					'queryType'   => 'images',
					'imagesQuery' => array( 'images' => $images ),
				),
				array( 'visual-portfolio/item-title' )
			)
		);

		$this->assertSame( array(), $entries );
	}

	/**
	 * A posts loop adds nothing: those posts are in the sitemap already.
	 *
	 * @return void
	 */
	public function test_posts_source_is_not_duplicated() {
		$images = $this->get_images( 1 );

		self::factory()->post->create_many(
			3,
			array( 'meta_input' => array( '_thumbnail_id' => $images[0]['id'] ) )
		);

		$entries = $this->get_sitemap_images(
			$this->get_loop_markup(
				array(
					'block_id'   => 'sitemap-posts',
					'queryType'  => 'posts',
					'postsQuery' => array( 'source' => 'post' ),
				),
				array( 'visual-portfolio/item-image' )
			)
		);

		$this->assertSame( array(), $entries );
	}
}
