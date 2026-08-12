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
	 * An image item carries everything the lightbox draws it with.
	 *
	 * @return void
	 */
	public function test_image_item_carries_its_full_size() {
		$data = Visual_Portfolio_Popup::get_item_data( $this->get_item(), array() );

		$this->assertSame( 'image', $data['type'] );
		$this->assertSame( wp_get_attachment_url( self::$attachment_id ), $data['src'] );
		$this->assertSame( 'Item title', $data['title'] );
		$this->assertSame( 'Caption of the picture', $data['caption'] );
	}

	/**
	 * A video item is the video, not the picture that stands for it.
	 *
	 * @return void
	 */
	public function test_video_item_carries_the_video_url() {
		$data = Visual_Portfolio_Popup::get_item_data(
			$this->get_item( array( 'video' => 'https://youtu.be/aBcDeFgHiJk' ) ),
			array()
		);

		$this->assertSame( 'video', $data['type'] );
		$this->assertSame( 'https://youtu.be/aBcDeFgHiJk', $data['src'] );

		// The image of the item is what is shown until the video plays.
		$this->assertNotEmpty( $data['poster'] );
	}

	/**
	 * An item the pipeline refused a popup gets none.
	 *
	 * A gallery whose images link somewhere is the case that produces this: an
	 * image with a URL of its own is an image that leads to it.
	 *
	 * @return void
	 */
	public function test_item_without_a_popup_returns_nothing() {
		$data = Visual_Portfolio_Popup::get_item_data(
			$this->get_item( array( 'allow_popup' => false ) ),
			array()
		);

		$this->assertSame( array(), $data );
	}

	/**
	 * The data is filterable, which is how Pro adds what free has no idea about.
	 *
	 * @return void
	 */
	public function test_popup_data_is_filterable() {
		$filter = static function ( $data ) {
			$data['embedUrl'] = 'https://example.org/embed/';

			return $data;
		};

		add_filter( 'vpf_loop_item_popup_data', $filter );

		$data = Visual_Portfolio_Popup::get_item_data( $this->get_item(), array() );

		remove_filter( 'vpf_loop_item_popup_data', $filter );

		$this->assertSame( 'https://example.org/embed/', $data['embedUrl'] );
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

		$this->assertStringContainsString( 'data-vp-popup=', $popup );
		$this->assertStringNotContainsString( 'data-vp-popup=', $url );
		$this->assertStringNotContainsString( 'data-vp-popup=', $none );

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
	 * The loop a trigger stands in listens for it.
	 *
	 * One listener for the whole loop, so that an item appended after the page
	 * was hydrated opens the lightbox as well.
	 *
	 * @return void
	 */
	public function test_loop_of_a_trigger_carries_the_listener() {
		$popup = do_blocks( $this->get_loop_markup( 'popup' ) );
		$url   = do_blocks( $this->get_loop_markup( 'url' ) );

		$this->assertStringContainsString(
			'data-wp-on--click="visual-portfolio/popup::actions.openPopup"',
			$popup
		);

		// Nothing to open, nothing to listen for.
		$this->assertStringNotContainsString( 'openPopup', $url );
	}

	/**
	 * Serialized markup of a loop whose items carry the given click action.
	 *
	 * @param string $click_action - `none`, `url` or `popup`.
	 *
	 * @return string
	 */
	private function get_loop_markup( $click_action ) {
		$attributes = array(
			'block_id'    => 'popup-test-' . $click_action,
			'queryType'   => 'images',
			'baseQuery'   => array( 'perPage' => 1 ),
			'imagesQuery' => array(
				'images' => array(
					array(
						'id'         => self::$attachment_id,
						'title'      => 'Item title',
						'categories' => array(),
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
