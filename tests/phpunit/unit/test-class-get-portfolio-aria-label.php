<?php
/**
 * Tests for aria-label support on overlay links in items templates.
 *
 * @package Visual Portfolio
 */

/**
 * Test case for item overlay links accessibility attributes.
 */
class Test_Class_Get_Portfolio_Aria_Label extends WP_UnitTestCase {
	/**
	 * Invoke private get_item_aria_label helper.
	 *
	 * @param array $args Item args.
	 *
	 * @return string
	 */
	private function get_item_aria_label( $args ) {
		$method = new ReflectionMethod( 'Visual_Portfolio_Get', 'get_item_aria_label' );

		if ( method_exists( $method, 'setAccessible' ) ) {
			$method->setAccessible( true );
		}

		return $method->invoke( null, $args );
	}

	/**
	 * Test that fade style overlay fallback link has aria-label.
	 *
	 * @return void
	 */
	public function test_fade_overlay_fallback_link_has_aria_label() {
		$args = array(
			'url'            => 'https://example.com/portfolio-item',
			'url_target'     => false,
			'url_rel'        => false,
			'aria_label'     => 'Example Portfolio Item',
			'title'          => 'Example Portfolio Item',
			'author'         => '',
			'comments_count' => '',
			'views_count'    => '',
			'reading_time'   => '',
			'excerpt'        => '',
			'categories'     => array(),
		);

		$opts = array(
			'show_author'         => false,
			'show_date'           => false,
			'show_comments_count' => false,
			'show_views_count'    => false,
			'show_reading_time'   => false,
			'show_icon'           => false,
			'show_title'          => false,
			'show_excerpt'        => false,
			'show_categories'     => false,
			'align'               => 'center',
		);

		ob_start();
		Visual_Portfolio_Templates::include_template(
			'items-list/items-style/fade/meta',
			array(
				'args' => $args,
				'opts' => $opts,
			)
		);
		$output = ob_get_clean();

		$this->assertStringContainsString(
			'aria-label="Example Portfolio Item"',
			$output,
			'Overlay fallback link should include aria-label for accessibility.'
		);
	}

	/**
	 * Test that fly style overlay fallback link has aria-label.
	 *
	 * @return void
	 */
	public function test_fly_overlay_fallback_link_has_aria_label() {
		$args = array(
			'url'            => 'https://example.com/portfolio-item',
			'url_target'     => false,
			'url_rel'        => false,
			'aria_label'     => 'Example Portfolio Item',
			'title'          => 'Example Portfolio Item',
			'author'         => '',
			'comments_count' => '',
			'views_count'    => '',
			'reading_time'   => '',
			'excerpt'        => '',
			'categories'     => array(),
		);

		$opts = array(
			'show_author'         => false,
			'show_date'           => false,
			'show_comments_count' => false,
			'show_views_count'    => false,
			'show_reading_time'   => false,
			'show_icon'           => false,
			'show_title'          => false,
			'show_excerpt'        => false,
			'show_categories'     => false,
			'align'               => 'center',
		);

		ob_start();
		Visual_Portfolio_Templates::include_template(
			'items-list/items-style/fly/meta',
			array(
				'args' => $args,
				'opts' => $opts,
			)
		);
		$output = ob_get_clean();

		$this->assertStringContainsString(
			'aria-label="Example Portfolio Item"',
			$output,
			'Overlay fallback link should include aria-label for accessibility.'
		);
	}

	/**
	 * Test generated aria-label for post-based items without title.
	 *
	 * @return void
	 */
	public function test_generated_aria_label_uses_post_type_when_title_empty() {
		$post_id = self::factory()->post->create(
			array(
				'post_title' => 'Test Post',
			)
		);

		$aria_label = $this->get_item_aria_label(
			array(
				'post_id' => $post_id,
				'title'   => '',
				'format'  => 'standard',
				'vp_opts' => array(
					'content_source' => 'post-based',
				),
			)
		);

		$this->assertSame( 'Open Post', $aria_label );
	}

	/**
	 * Test generated aria-label for image source items without title.
	 *
	 * @return void
	 */
	public function test_generated_aria_label_uses_image_for_images_source() {
		$aria_label = $this->get_item_aria_label(
			array(
				'title'   => '',
				'format'  => 'standard',
				'vp_opts' => array(
					'content_source' => 'images',
				),
			)
		);

		$this->assertSame( 'Open image', $aria_label );
	}

	/**
	 * Test generated aria-label for social source items without title.
	 *
	 * @return void
	 */
	public function test_generated_aria_label_uses_social_post_for_social_source() {
		$aria_label = $this->get_item_aria_label(
			array(
				'title'   => '',
				'format'  => 'standard',
				'vp_opts' => array(
					'content_source' => 'social-stream',
				),
			)
		);

		$this->assertSame( 'Open social post', $aria_label );
	}

	/**
	 * Test generated aria-label for video items without title.
	 *
	 * @return void
	 */
	public function test_generated_aria_label_uses_video_for_video_format() {
		$aria_label = $this->get_item_aria_label(
			array(
				'title'   => '',
				'format'  => 'video',
				'vp_opts' => array(
					'content_source' => 'images',
				),
			)
		);

		$this->assertSame( 'Open video', $aria_label );
	}
}
