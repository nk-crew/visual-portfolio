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
	 * Test that fade style overlay fallback link has aria-label.
	 *
	 * @return void
	 */
	public function test_fade_overlay_fallback_link_has_aria_label() {
		$args = array(
			'url'            => 'https://example.com/portfolio-item',
			'url_target'     => false,
			'url_rel'        => false,
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
}
