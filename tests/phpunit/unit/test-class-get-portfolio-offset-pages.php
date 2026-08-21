<?php
/**
 * Tests for how `posts_offset` affects the page count.
 *
 * @package Visual Portfolio
 */

/**
 * Offset and page count test case.
 *
 * The offset is a registered control, so every post-based gallery carries a
 * value for it - but only a post-type source hands it to `WP_Query`. The page
 * count has to follow the query, not the stored option.
 */
class ClassGetPortfolioOffsetPages extends WP_UnitTestCase {
	/**
	 * Nine posts, so six per page makes two pages.
	 *
	 * @var array
	 */
	private static $post_ids = array();

	/**
	 * Create the posts shared by the tests.
	 *
	 * @param WP_UnitTest_Factory $factory - test factory.
	 *
	 * @return void
	 */
	public static function wpSetUpBeforeClass( $factory ) {
		self::$post_ids = $factory->post->create_many( 9 );
	}

	/**
	 * Page count of a gallery with the given source and offset.
	 *
	 * @param string $source - `posts_source` value.
	 * @param int    $offset - stored offset.
	 *
	 * @return int
	 */
	private function get_max_pages( $source, $offset ) {
		$config = Visual_Portfolio_Get::get_output_config(
			array(
				'block_id'       => 'offset-pages-test',
				'content_source' => 'post-based',
				'posts_source'   => $source,
				'posts_ids'      => self::$post_ids,
				'items_count'    => 6,
				'pagination'     => 'paged',
				'posts_offset'   => $offset,
			)
		);

		return (int) $config['options']['max_pages'];
	}

	/**
	 * A source that never applies the offset keeps all of its pages.
	 *
	 * @return void
	 */
	public function test_a_source_that_ignores_the_offset_keeps_its_pages() {
		$this->assertSame( 2, $this->get_max_pages( 'ids', 0 ) );
		$this->assertSame( 2, $this->get_max_pages( 'ids', 3 ) );
	}

	/**
	 * A post-type source, which does apply it, still loses the skipped pages.
	 *
	 * @return void
	 */
	public function test_a_post_type_source_still_counts_the_offset() {
		$this->assertSame( 2, $this->get_max_pages( 'post', 0 ) );
		$this->assertSame( 1, $this->get_max_pages( 'post', 3 ) );
	}
}
