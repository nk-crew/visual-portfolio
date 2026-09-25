<?php
/**
 * Tests for images of the Media source that are not in the Media Library.
 *
 * An image inserted from a URL, or carried over from a core Gallery, is stored
 * with its address and no attachment id. The suite turns notices and warnings
 * into failures, so every render below also proves that such an entry reads
 * no key it does not have.
 *
 * @package Visual Portfolio
 */

/**
 * External images test case.
 */
class ClassExternalImages extends WP_UnitTestCase {
	use Visual_Portfolio_Loop_Blocks_Trait;

	const URL = 'https://example.org/outside/photo.jpg';

	/**
	 * Take our own lazy loading out of the picture, so the rendered `img` is
	 * the one the blocks build.
	 *
	 * @return void
	 */
	public function set_up() {
		parent::set_up();

		update_option( 'vp_images', array( 'lazy_loading' => '' ) );
		Visual_Portfolio_Images::init_lazyload();

		// What the free plugin does on its own: Pro opens its media from
		// this filter when it runs the suite.
		remove_all_filters( 'vpf_popup_output' );
	}

	/**
	 * Drop the per-request memo of the pipeline.
	 *
	 * @return void
	 */
	public function tear_down() {
		$property = new ReflectionProperty( 'Visual_Portfolio_Get', 'loop_items_cache' );

		if ( method_exists( $property, 'setAccessible' ) ) {
			$property->setAccessible( true );
		}

		$property->setValue( null, array() );

		parent::tear_down();
	}

	/**
	 * The entry the manager stores for an image inserted from a URL.
	 *
	 * @return array
	 */
	private function get_entry() {
		return array(
			'imgUrl'          => self::URL,
			'imgThumbnailUrl' => self::URL,
			'width'           => 800,
			'height'          => 600,
			'alt'             => 'A photo from elsewhere',
			'title'           => 'Outside',
		);
	}

	/**
	 * Render a loop of the external image around the given item blocks.
	 *
	 * @param string $item_blocks - serialized blocks inside the item template.
	 *
	 * @return string
	 */
	private function render_loop( $item_blocks ) {
		$loop = array(
			'block_id'    => 'external-test',
			'queryType'   => 'images',
			'baseQuery'   => array( 'perPage' => 1 ),
			'imagesQuery' => array( 'images' => array( $this->get_entry() ) ),
		);

		return do_blocks(
			sprintf(
				'<!-- wp:visual-portfolio/loop %1$s --><div class="wp-block-visual-portfolio-loop vp-block-loop"><!-- wp:visual-portfolio/item-template -->%2$s<!-- /wp:visual-portfolio/item-template --></div><!-- /wp:visual-portfolio/loop -->',
				wp_json_encode( $loop ),
				$item_blocks
			)
		);
	}

	/**
	 * The `img` of the external image, as attribute name to value.
	 *
	 * @param string $html - markup.
	 *
	 * @return array
	 */
	private function get_image( $html ) {
		$processor = new WP_HTML_Tag_Processor( $html );

		while ( $processor->next_tag( 'img' ) ) {
			if ( self::URL !== $processor->get_attribute( 'src' ) ) {
				continue;
			}

			$attributes = array();

			foreach ( array( 'src', 'alt', 'width', 'height' ) as $name ) {
				$attributes[ $name ] = $processor->get_attribute( $name );
			}

			return $attributes;
		}

		$this->fail( 'The markup holds no image of the address: ' . $html );
	}

	/**
	 * The item image and the item cover draw the picture from its address,
	 * with the alt text and the size stored with it.
	 *
	 * @return void
	 */
	public function test_loop_renders_the_image_from_its_address() {
		$this->skip_without_loop_blocks();

		$expected = array(
			'src'    => self::URL,
			'alt'    => 'A photo from elsewhere',
			'width'  => '800',
			'height' => '600',
		);

		$this->assertSame( $expected, $this->get_image( $this->render_loop( '<!-- wp:visual-portfolio/item-image /-->' ) ) );
		$this->assertSame( $expected, $this->get_image( $this->render_loop( '<!-- wp:visual-portfolio/item-cover /-->' ) ) );
	}

	/**
	 * The lightbox opens the image at its address, and the address is what a
	 * click opens without the lightbox.
	 *
	 * @return void
	 */
	public function test_loop_lightbox_opens_the_image_from_its_address() {
		$this->skip_without_loop_blocks();

		$output = $this->render_loop( '<!-- wp:visual-portfolio/item-image {"clickAction":"popup"} /-->' );

		$this->assertStringContainsString( '<a href="' . self::URL . '" data-vp-popup', $output );

		$processor = new WP_HTML_Tag_Processor( $output );

		$this->assertTrue( $processor->next_tag( array( 'class_name' => 'vp-portfolio__item-popup' ) ) );
		$this->assertSame( self::URL, $processor->get_attribute( 'data-vp-popup-img' ) );
		$this->assertSame( '800x600', $processor->get_attribute( 'data-vp-popup-img-size' ) );
		$this->assertSame( '', $processor->get_attribute( 'data-vp-popup-img-srcset' ) );
	}

	/**
	 * Without a stored size the lightbox is told 0, which it measures itself.
	 *
	 * @return void
	 */
	public function test_popup_data_without_a_size() {
		$item = array_merge(
			Visual_Portfolio_Get::default_item_args( array() ),
			array(
				'title'        => 'Outside',
				'image_id'     => 0,
				'image_url'    => self::URL,
				'image_width'  => 0,
				'image_height' => 0,
			)
		);

		$data = Visual_Portfolio_Get::get_popup_image( 0, $item );

		$this->assertSame( self::URL, $data['url'] );
		$this->assertSame( '', $data['srcset'] );
		$this->assertSame( 0, $data['width'] );
		$this->assertSame( 0, $data['height'] );
		$this->assertSame( 'Outside', $data['item_title'] );
	}

	/**
	 * The editor preview and the bindings read the address off the context.
	 *
	 * @return void
	 */
	public function test_context_carries_the_address() {
		$this->skip_without_loop_blocks();

		$context = Visual_Portfolio_Block_Item_Template::map_item_to_context(
			array(
				'image_id'     => 0,
				'image_url'    => self::URL,
				'image_width'  => 800,
				'image_height' => 600,
			),
			array()
		);

		$this->assertSame( self::URL, $context['vp/itemImgUrl'] );
		$this->assertSame( 800, $context['vp/itemImgWidth'] );
		$this->assertSame( 600, $context['vp/itemImgHeight'] );
	}

	/**
	 * A classic gallery shows the image rather than the No Image placeholder,
	 * and opens it in its lightbox.
	 *
	 * @return void
	 */
	public function test_classic_block_renders_the_image() {
		$attributes = array(
			'block_id'           => 'external-classic',
			'content_source'     => 'images',
			'images'             => array( $this->get_entry() ),
			'items_click_action' => 'popup_gallery',
		);

		$output = do_blocks( '<!-- wp:visual-portfolio/block ' . wp_json_encode( $attributes ) . ' /-->' );

		$this->assertSame( 'A photo from elsewhere', $this->get_image( $output )['alt'] );
		$this->assertStringContainsString( 'data-vp-popup-img="' . self::URL . '"', $output );
	}

	/**
	 * An image from elsewhere past the first on the page is lazy, as WordPress
	 * makes an attachment image, when the plugin's own lazy loading is off.
	 *
	 * @return void
	 */
	public function test_a_later_image_from_elsewhere_is_lazy() {
		// WordPress keeps the first images of a page eager.
		add_filter( 'wp_omit_loading_attr_threshold', '__return_zero' );

		$image = Visual_Portfolio_Images::get_remote_image( self::URL, array( 'alt' => 'Late' ), 800, 600 );

		remove_filter( 'wp_omit_loading_attr_threshold', '__return_zero' );

		$this->assertStringContainsString( 'loading="lazy"', $image );
	}

	/**
	 * The thumbnails of a classic slider show the image by its address.
	 *
	 * @return void
	 */
	public function test_classic_slider_thumbnails_show_the_image() {
		$attributes = array(
			'block_id'          => 'external-slider',
			'content_source'    => 'images',
			'images'            => array( $this->get_entry() ),
			'layout'            => 'slider',
			'slider_thumbnails' => 'true',
		);

		$output = do_blocks( '<!-- wp:visual-portfolio/block ' . wp_json_encode( $attributes ) . ' /-->' );

		$this->assertMatchesRegularExpression( '#vp-portfolio__thumbnail-img.*?<img [^>]*' . preg_quote( self::URL, '#' ) . '#s', $output );
	}

	/**
	 * The sitemap lists the image by its address.
	 *
	 * @return void
	 */
	public function test_sitemap_lists_the_image() {
		$this->skip_without_loop_blocks();

		$post_id = self::factory()->post->create(
			array(
				'post_type'    => 'page',
				'post_content' => sprintf(
					'<!-- wp:visual-portfolio/loop %s --><div class="wp-block-visual-portfolio-loop vp-block-loop"><!-- wp:visual-portfolio/item-template --><!-- wp:visual-portfolio/item-image /--><!-- /wp:visual-portfolio/item-template --></div><!-- /wp:visual-portfolio/loop -->',
					wp_json_encode(
						array(
							'block_id'    => 'external-sitemap',
							'queryType'   => 'images',
							'imagesQuery' => array( 'images' => array( $this->get_entry() ) ),
						)
					)
				),
			)
		);

		$entries = ( new Visual_Portfolio_Sitemap() )->add_images_to_sitemap( array(), $post_id );

		$this->assertSame(
			array(
				array(
					'src'   => self::URL,
					'alt'   => 'A photo from elsewhere',
					'title' => 'Outside',
				),
			),
			$entries
		);
	}

	/**
	 * The stored size stays a number and the address an address.
	 *
	 * @return void
	 */
	public function test_sanitized_entry_keeps_its_size_and_address() {
		$result = Visual_Portfolio_Security::sanitize_gallery(
			array(
				array(
					'imgUrl' => self::URL . '?w=1" onerror="x',
					'width'  => '800',
					'height' => 600,
				),
			)
		);

		$this->assertSame( 800, $result[0]['width'] );
		$this->assertSame( 600, $result[0]['height'] );
		$this->assertStringStartsWith( self::URL, $result[0]['imgUrl'] );
		$this->assertStringNotContainsString( '"', $result[0]['imgUrl'] );
	}
}
