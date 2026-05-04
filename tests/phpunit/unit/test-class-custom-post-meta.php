<?php
/**
 * Tests for Visual_Portfolio_Custom_Post_Meta class.
 *
 * @package Visual Portfolio
 */

/**
 * Test case for custom post meta helpers.
 */
class Test_Visual_Portfolio_Custom_Post_Meta extends WP_UnitTestCase {
	/**
	 * Test calculate_words_count does not depend on the WordPress Loop globals.
	 */
	public function test_calculate_words_count_without_loop_globals() {
		$post_id = self::factory()->post->create(
			array(
				'post_content' => 'Alpha beta <strong>gamma</strong>',
			)
		);

		global $multipage, $page, $pages;

		$had_multipage = isset( $multipage );
		$had_page      = isset( $page );
		$had_pages     = isset( $pages );
		$old_multipage = $had_multipage ? $multipage : null;
		$old_page      = $had_page ? $page : null;
		$old_pages     = $had_pages ? $pages : null;

		$multipage = 0;
		$page      = 1;
		$pages     = null;

		try {
			$this->assertSame( 3, Visual_Portfolio_Custom_Post_Meta::calculate_words_count( $post_id ) );
		} finally {
			if ( $had_multipage ) {
				$multipage = $old_multipage;
			} else {
				unset( $multipage );
			}

			if ( $had_page ) {
				$page = $old_page;
			} else {
				unset( $page );
			}

			if ( $had_pages ) {
				$pages = $old_pages;
			} else {
				unset( $pages );
			}
		}
	}

	/**
	 * Test calculate_words_count does not run content pagination filters.
	 */
	public function test_calculate_words_count_ignores_content_pagination_filters() {
		$post_id = self::factory()->post->create(
			array(
				'post_content' => 'Alpha beta <strong>gamma</strong>',
			)
		);

		$filter = static function ( ...$args ) {
			return null;
		};

		add_filter( 'content_pagination', $filter );

		try {
			$this->assertSame( 3, Visual_Portfolio_Custom_Post_Meta::calculate_words_count( $post_id ) );
		} finally {
			remove_filter( 'content_pagination', $filter );
		}
	}

	/**
	 * Test calculate_words_count returns 0 for empty content.
	 */
	public function test_calculate_words_count_empty_content() {
		$post_id = self::factory()->post->create(
			array(
				'post_content' => '',
			)
		);

		$this->assertSame( 0, Visual_Portfolio_Custom_Post_Meta::calculate_words_count( $post_id ) );
	}
}
