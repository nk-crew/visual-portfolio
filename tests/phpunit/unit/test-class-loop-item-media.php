<?php
/**
 * Tests for the media of the item image and item cover blocks: what extends
 * their picture, and the badge that names an item's format.
 *
 * @package Visual Portfolio
 */

/**
 * Item media test case.
 */
class ClassLoopItemMedia extends WP_UnitTestCase {
	use Visual_Portfolio_Loop_Blocks_Trait;

	/**
	 * Attachment of the images.
	 *
	 * @var int
	 */
	private static $attachment_id = 0;

	/**
	 * Create the attachment once for the whole case.
	 *
	 * @return void
	 */
	public static function wpSetUpBeforeClass() {
		self::$attachment_id = self::factory()->attachment->create_upload_object( dirname( __DIR__ ) . '/fixtures/image.png' );
	}

	/**
	 * Loop blocks only, and no lazy loading placeholders in the markup.
	 *
	 * @return void
	 */
	public function set_up() {
		parent::set_up();

		$this->skip_without_loop_blocks();

		update_option( 'vp_images', array( 'lazy_loading' => '' ) );
		Visual_Portfolio_Images::init_lazyload();
	}

	/**
	 * Drop the filters a test added.
	 *
	 * @return void
	 */
	public function tear_down() {
		remove_all_filters( 'vpf_loop_item_picture' );

		parent::tear_down();
	}

	/**
	 * Render a loop of the given images around one item block.
	 *
	 * @param array  $images     - images of the source.
	 * @param string $item_block - serialized block inside the item template.
	 *
	 * @return string
	 */
	private function render_loop( $images, $item_block ) {
		$loop = array(
			'block_id'    => 'media-test',
			'queryId'     => 1,
			'queryType'   => 'images',
			'baseQuery'   => array( 'perPage' => count( $images ) ),
			'imagesQuery' => array( 'images' => $images ),
		);

		return do_blocks(
			sprintf(
				'<!-- wp:visual-portfolio/loop %1$s --><div class="wp-block-visual-portfolio-loop vp-block-loop"><!-- wp:visual-portfolio/item-template -->%2$s<!-- /wp:visual-portfolio/item-template --></div><!-- /wp:visual-portfolio/loop -->',
				wp_json_encode( $loop ),
				$item_block
			)
		);
	}

	/**
	 * What a filter adds to the picture lands inside the link, before the
	 * overlay, and the filter learns which block is asking.
	 *
	 * @return void
	 */
	public function test_the_picture_takes_what_a_filter_adds() {
		$names = array();

		add_filter(
			'vpf_loop_item_picture',
			function ( $picture, $context, $attributes, $block_name ) use ( &$names ) {
				$names[] = $block_name;

				return $picture . '<span class="e2e-extra-media"></span>';
			},
			10,
			4
		);

		$images = array(
			array(
				'id'    => self::$attachment_id,
				'title' => 'One',
			),
		);

		$image = $this->render_loop( $images, '<!-- wp:visual-portfolio/item-image {"clickAction":"url"} /-->' );

		$this->assertMatchesRegularExpression( '#<a [^>]*><img [^>]*><span class="e2e-extra-media"></span></a>#', $image );

		$cover = $this->render_loop( $images, '<!-- wp:visual-portfolio/item-cover --><!-- wp:visual-portfolio/item-title /--><!-- /wp:visual-portfolio/item-cover -->' );

		$this->assertMatchesRegularExpression( '#__media"><img [^>]*><span class="e2e-extra-media"></span>#', $cover );
		$this->assertSame( array( 'visual-portfolio/item-image', 'visual-portfolio/item-cover' ), $names );
	}

	/**
	 * An item without an image renders what a filter gives it, and nothing
	 * without one.
	 *
	 * @return void
	 */
	public function test_a_filter_gives_a_picture_to_an_item_without_an_image() {
		$images = array(
			array(
				'id'    => PHP_INT_MAX,
				'title' => 'No file',
			),
		);

		$this->assertStringNotContainsString( '<figure', $this->render_loop( $images, '<!-- wp:visual-portfolio/item-image /-->' ) );

		$crops = array();

		add_filter(
			'vpf_loop_item_picture',
			static function ( $picture, $context, $attributes, $block_name, $img_attr ) use ( &$crops ) {
				$crops[] = $img_attr['style'] ?? '';

				return '' === $picture ? '<img class="e2e-stand-in" alt="">' : $picture;
			},
			10,
			5
		);

		$this->assertMatchesRegularExpression( '#<figure [^>]*><img class="e2e-stand-in" alt="">#', $this->render_loop( $images, '<!-- wp:visual-portfolio/item-image {"aspectRatio":"4/3"} /-->' ) );

		// The stand-in can take the crop of the block.
		$this->assertStringContainsString( 'aspect-ratio:4/3', $crops[0] );
	}

	/**
	 * A cover whose only picture came from a filter still loads its lazy
	 * loading scripts.
	 *
	 * @return void
	 */
	public function test_a_filtered_cover_picture_brings_the_lazy_loading() {
		update_option( 'vp_images', array( 'lazy_loading' => 'vp' ) );
		Visual_Portfolio_Images::init_lazyload();
		Visual_Portfolio_Assets::remove_stored_assets( 'visual-portfolio-lazyload' );

		add_filter(
			'vpf_loop_item_picture',
			static function ( $picture ) {
				return '' === $picture ? '<img class="vp-lazyload" alt="">' : $picture;
			}
		);

		$this->render_loop(
			array(
				array(
					'id'    => PHP_INT_MAX,
					'title' => 'No file',
				),
			),
			'<!-- wp:visual-portfolio/item-cover --><!-- wp:visual-portfolio/item-title /--><!-- /wp:visual-portfolio/item-cover -->'
		);

		$stored = new ReflectionProperty( 'Visual_Portfolio_Assets', 'stored_assets' );
		$stored->setAccessible( true );

		$this->assertArrayHasKey( 'visual-portfolio-lazyload', $stored->getValue()['script'] );
	}

	/**
	 * The badge names a video, in the corner asked for, and leaves a still
	 * picture alone.
	 *
	 * @return void
	 */
	public function test_the_badge_names_a_video_and_not_a_picture() {
		$images = array(
			array(
				'id'        => self::$attachment_id,
				'title'     => 'Video',
				'format'    => 'video',
				'video_url' => 'https://www.youtube.com/watch?v=mSC6GwizOag',
			),
			array(
				'id'    => self::$attachment_id,
				'title' => 'Picture',
			),
		);

		$output = $this->render_loop( $images, '<!-- wp:visual-portfolio/item-image {"showFormatBadge":true,"formatBadgePosition":"bottom-left"} /-->' );

		$this->assertSame( 1, substr_count( $output, 'vp-item-format-badge' ) );
		$this->assertStringContainsString( '<span class="vp-item-format-badge is-position-bottom-left" role="img" aria-label="Video">', $output );

		$cover = $this->render_loop( $images, '<!-- wp:visual-portfolio/item-cover {"showFormatBadge":true} --><!-- wp:visual-portfolio/item-title /--><!-- /wp:visual-portfolio/item-cover -->' );

		$this->assertSame( 1, substr_count( $cover, 'vp-item-format-badge is-position-top-right' ) );

		// Off by default.
		$this->assertStringNotContainsString( 'vp-item-format-badge', $this->render_loop( $images, '<!-- wp:visual-portfolio/item-image /-->' ) );
	}
}
