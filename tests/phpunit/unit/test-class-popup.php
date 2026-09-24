<?php
/**
 * Tests for the lightbox of the Gallery Loop family
 *
 * @package Visual Portfolio
 */

/**
 * Loop popup test case.
 */
class ClassPopup extends WP_UnitTestCase {
	use Visual_Portfolio_Loop_Blocks_Trait;

	/**
	 * Nothing in here exists below the family's WordPress requirement.
	 *
	 * @return void
	 */
	public function set_up() {
		parent::set_up();

		$this->skip_without_loop_blocks();
	}

	/**
	 * Attachment the gallery is built from.
	 *
	 * @var int
	 */
	private static $attachment_id = 0;

	/**
	 * Create the attachment shared by the tests.
	 *
	 * @param WP_UnitTest_Factory $factory - test factory.
	 *
	 * @return void
	 */
	public static function wpSetUpBeforeClass( $factory ) {
		self::$attachment_id = $factory->attachment->create_object(
			array(
				'file'           => 'popup.jpg',
				'post_mime_type' => 'image/jpeg',
				'post_excerpt'   => 'Caption of the picture',
			)
		);
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
	 * An item of the images source, as the pipeline builds one.
	 *
	 * @param array $overrides - values to change.
	 *
	 * @return array
	 */
	private function get_item( $overrides = array() ) {
		return array_merge(
			Visual_Portfolio_Get::default_item_args( array() ),
			array(
				'uid'         => 'popup-item',
				'image_id'    => self::$attachment_id,
				'title'       => 'Item title',
				'alt'         => '',
				'allow_popup' => true,
			),
			$overrides
		);
	}

	/**
	 * The options an images loop resolves its items with.
	 *
	 * @return array
	 */
	private function get_options() {
		return Visual_Portfolio_Get::get_options(
			array(
				'content_source' => 'images',
				'block_id'       => 'popup-test',
			)
		);
	}

	/**
	 * An image item carries the `<template>` the classic lightbox reads, and
	 * the full size image a click opens without it.
	 *
	 * @return void
	 */
	public function test_image_item_carries_the_classic_template() {
		$url   = wp_get_attachment_url( self::$attachment_id );
		$popup = Visual_Portfolio_Popup::get_item_popup( $this->get_item(), $this->get_options() );

		$this->assertSame( $url, $popup['src'] );
		$this->assertStringContainsString( '<template class="vp-portfolio__item-popup"', $popup['markup'] );
		$this->assertStringContainsString( 'data-vp-popup-img="' . esc_url( $url ) . '"', $popup['markup'] );

		// The item title leads unless the loop picks another source.
		$this->assertStringContainsString( '<h3 class="vp-portfolio__item-popup-title">Item title</h3>', $popup['markup'] );
	}

	/**
	 * A video item is the video, not the picture that stands for it.
	 *
	 * @return void
	 */
	public function test_video_item_carries_the_video_url() {
		$popup = Visual_Portfolio_Popup::get_item_popup(
			$this->get_item( array( 'video' => 'https://youtu.be/aBcDeFgHiJk' ) ),
			$this->get_options()
		);

		$this->assertSame( 'https://youtu.be/aBcDeFgHiJk', $popup['src'] );
		$this->assertStringContainsString( 'data-vp-popup-video="https://youtu.be/aBcDeFgHiJk"', $popup['markup'] );
	}

	/**
	 * An item the pipeline refused a popup gets none.
	 *
	 * @return void
	 */
	public function test_item_without_a_popup_returns_nothing() {
		$popup = Visual_Portfolio_Popup::get_item_popup(
			$this->get_item( array( 'allow_popup' => false ) ),
			$this->get_options()
		);

		$this->assertSame( array(), $popup );
	}

	/**
	 * The caption follows the sources of the loop, and a source the classic
	 * templates do not know is the default.
	 *
	 * @return void
	 */
	public function test_caption_follows_the_sources_of_the_loop() {
		$options = $this->get_options();

		$caption = Visual_Portfolio_Popup::get_item_popup(
			$this->get_item(),
			$options,
			array(
				'title'       => 'caption',
				'description' => 'none',
			)
		);

		$this->assertStringContainsString( '<h3 class="vp-portfolio__item-popup-title">Caption of the picture</h3>', $caption['markup'] );
		$this->assertStringNotContainsString( 'vp-portfolio__item-popup-description', $caption['markup'] );

		$unknown = Visual_Portfolio_Popup::get_item_popup( $this->get_item(), $options, array( 'title' => 'no-such-source' ) );

		$this->assertStringContainsString( '<h3 class="vp-portfolio__item-popup-title">Item title</h3>', $unknown['markup'] );
	}

	/**
	 * The markup goes through `vpf_popup_output`, the filter Pro extends the
	 * classic lightbox with, and the no-JS address follows what it changed.
	 *
	 * @return void
	 */
	public function test_popup_output_is_filtered() {
		$filter = static function ( $output ) {
			return str_replace( 'data-vp-popup-img="', 'data-vp-popup-pid="7" data-vp-popup-img="https://example.org/custom.jpg" data-vp-popup-old="', $output );
		};

		add_filter( 'vpf_popup_output', $filter );

		$popup = Visual_Portfolio_Popup::get_item_popup( $this->get_item(), $this->get_options() );

		remove_filter( 'vpf_popup_output', $filter );

		$this->assertStringContainsString( 'data-vp-popup-pid="7"', $popup['markup'] );
		$this->assertSame( 'https://example.org/custom.jpg', $popup['src'] );
	}

	/**
	 * An item the pipeline allows no popup still reaches the filter, which is
	 * how Pro opens its media for an image with a link, and any root the
	 * classic lightbox reads counts.
	 *
	 * @return void
	 */
	public function test_filter_can_give_a_popup_to_an_item_without_one() {
		$filter = static function ( $output ) {
			return $output ? $output : '<div class="vp-portfolio__item-popup" data-vp-popup-img="https://example.org/media.jpg"></div>';
		};

		add_filter( 'vpf_popup_output', $filter );

		$popup = Visual_Portfolio_Popup::get_item_popup(
			$this->get_item( array( 'allow_popup' => false ) ),
			$this->get_options()
		);

		remove_filter( 'vpf_popup_output', $filter );

		$this->assertSame( 'https://example.org/media.jpg', $popup['src'] );
	}

	/**
	 * Every click action renders the thing it names.
	 *
	 * @return void
	 */
	public function test_click_action_decides_what_an_item_is() {
		$popup = do_blocks( $this->get_loop_markup( 'popup' ) );
		$url   = do_blocks( $this->get_loop_markup( 'url' ) );
		$none  = do_blocks( $this->get_loop_markup( 'none' ) );

		$this->assertStringContainsString( ' data-vp-popup', $popup );
		$this->assertStringContainsString( 'vp-portfolio__item-popup', $popup );
		$this->assertStringNotContainsString( 'data-vp-popup', $url );
		$this->assertStringNotContainsString( 'vp-portfolio__item-popup', $url );
		$this->assertStringNotContainsString( 'data-vp-popup', $none );

		// A trigger is a link to the full size image, which is what a click
		// without any JavaScript on the page opens.
		$this->assertStringContainsString(
			'href="' . esc_url( wp_get_attachment_url( self::$attachment_id ) ) . '"',
			$popup
		);

		// `none` is the only one of the three that leaves the image alone.
		$this->assertStringNotContainsString( '<a ', $none );
	}

	/**
	 * An image with a link of its own follows it, as the classic gallery does.
	 *
	 * @return void
	 */
	public function test_item_with_a_link_of_its_own_follows_it() {
		$output = do_blocks( $this->get_loop_markup( 'popup', array( 'url' => 'https://example.org/elsewhere/' ) ) );

		$this->assertStringContainsString( '<a href="https://example.org/elsewhere/"', $output );
		$this->assertStringNotContainsString( 'data-vp-popup', $output );
	}

	/**
	 * A trigger loads the lightbox the classic gallery uses.
	 *
	 * @return void
	 */
	public function test_trigger_loads_the_lightbox() {
		wp_dequeue_script( Visual_Portfolio_Popup::SCRIPT );

		do_blocks( $this->get_loop_markup( 'url' ) );

		$this->assertFalse( wp_script_is( Visual_Portfolio_Popup::SCRIPT, 'enqueued' ) );

		do_blocks( $this->get_loop_markup( 'popup' ) );

		$this->assertTrue( wp_script_is( Visual_Portfolio_Popup::SCRIPT, 'enqueued' ) );
	}

	/**
	 * Under Enfold a loop keeps the theme's lightbox off its images.
	 *
	 * @return void
	 */
	public function test_enfold_lightbox_is_kept_off_a_loop() {
		$enfold = new Visual_Portfolio_3rd_Enfold();

		$this->assertStringContainsString(
			'class="vp-block-loop noLightbox"',
			$enfold->disable_loop_lightbox( '<div class="vp-block-loop"><a href="a.jpg"></a></div>' )
		);
	}

	/**
	 * Serialized markup of a loop whose items carry the given click action.
	 *
	 * @param string $click_action - `none`, `url` or `popup`.
	 * @param array  $image        - values of the image to change.
	 *
	 * @return string
	 */
	private function get_loop_markup( $click_action, $image = array() ) {
		$attributes = array(
			'block_id'    => 'popup-test-' . $click_action,
			'queryType'   => 'images',
			'baseQuery'   => array( 'perPage' => 1 ),
			'imagesQuery' => array(
				'images' => array(
					array_merge(
						array(
							'id'         => self::$attachment_id,
							'title'      => 'Item title',
							'categories' => array(),
						),
						$image
					),
				),
			),
		);

		return '<!-- wp:visual-portfolio/loop ' . wp_json_encode( $attributes ) . ' -->
<div class="wp-block-visual-portfolio-loop vp-block-loop">
<!-- wp:visual-portfolio/item-template -->
<!-- wp:visual-portfolio/item-image ' . wp_json_encode( array( 'clickAction' => $click_action ) ) . ' /-->
<!-- /wp:visual-portfolio/item-template -->
</div>
<!-- /wp:visual-portfolio/loop -->';
	}
}
