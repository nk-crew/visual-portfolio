<?php
/**
 * Tests for Visual_Portfolio_Get::calculate_max_pages
 *
 * @package Visual Portfolio
 */

/**
 * Max pages test case.
 */
class ClassGetPortfolioMaxPages extends WP_UnitTestCase {
	/**
	 * Clean up the request between tests.
	 *
	 * @return void
	 */
	public function tear_down() {
		unset( $_GET['vp_filter'] );

		parent::tear_down();
	}

	/**
	 * Build legacy options the same way the Gallery Loop block does.
	 *
	 * @param string $query_type - modern content source.
	 * @param int    $per_page - items per page.
	 * @param array  $query - `postsQuery` or `imagesQuery` overrides.
	 *
	 * @return array
	 */
	private function get_options( $query_type, $per_page, $query = array() ) {
		$group = 'images' === $query_type ? 'imagesQuery' : 'postsQuery';

		return Visual_Portfolio_Convert_Attributes::modern_to_legacy(
			array(
				'queryType' => $query_type,
				'baseQuery' => array( 'perPage' => $per_page ),
				$group      => $query,
			),
			true
		);
	}

	/**
	 * Build the image items the `images` content source expects.
	 *
	 * @param int    $count - number of images.
	 * @param string $category - category assigned to every image.
	 *
	 * @return array
	 */
	private function get_images( $count, $category = '' ) {
		$images = array();

		for ( $i = 0; $i < $count; $i++ ) {
			$images[] = array(
				'id'         => $i + 1,
				'categories' => $category ? array( $category ) : array(),
			);
		}

		return $images;
	}

	/**
	 * A query that fits on one page reports a single page.
	 *
	 * @return void
	 */
	public function test_single_page() {
		$max_pages = Visual_Portfolio_Get::calculate_max_pages(
			$this->get_options( 'images', 6, array( 'images' => $this->get_images( 4 ) ) )
		);

		$this->assertSame( 1, $max_pages );
	}

	/**
	 * Images are split into pages of `items_count`.
	 *
	 * @return void
	 */
	public function test_images_are_paged() {
		$max_pages = Visual_Portfolio_Get::calculate_max_pages(
			$this->get_options( 'images', 4, array( 'images' => $this->get_images( 10 ) ) )
		);

		$this->assertSame( 3, $max_pages );
	}

	/**
	 * Images may arrive as a JSON encoded string.
	 *
	 * @return void
	 */
	public function test_images_as_json_string() {
		$options           = $this->get_options( 'images', 2, array( 'images' => array() ) );
		$options['images'] = wp_json_encode( $this->get_images( 5 ) );

		$this->assertSame( 3, Visual_Portfolio_Get::calculate_max_pages( $options ) );
	}

	/**
	 * Posts are counted with a real query, and the count follows the content.
	 *
	 * This is what makes the pagination blocks correct without re-saving the
	 * post they live in.
	 *
	 * @return void
	 */
	public function test_posts_are_paged() {
		self::factory()->post->create_many( 7 );

		$options = $this->get_options( 'posts', 3, array( 'source' => 'post' ) );

		$this->assertSame( 3, Visual_Portfolio_Get::calculate_max_pages( $options ) );

		// Publishing more posts adds a page, without touching the options.
		self::factory()->post->create_many( 3 );

		$this->assertSame( 4, Visual_Portfolio_Get::calculate_max_pages( $options ) );
	}

	/**
	 * An active `vp_filter` narrows the query, so it changes the page count.
	 *
	 * @return void
	 */
	public function test_active_filter_is_applied() {
		$options = $this->get_options(
			'images',
			2,
			array(
				'images' => array_merge(
					$this->get_images( 2, 'Nature' ),
					$this->get_images( 6, 'City' )
				),
			)
		);

		$this->assertSame( 4, Visual_Portfolio_Get::calculate_max_pages( $options ) );

		$_GET['vp_filter'] = Visual_Portfolio_Get::create_slug( 'Nature' );

		$this->assertSame( 1, Visual_Portfolio_Get::calculate_max_pages( $options ) );
	}

	/**
	 * Malformed options never divide by zero or report less than one page.
	 *
	 * @return void
	 */
	public function test_malformed_options() {
		$options = $this->get_options( 'images', 0, array( 'images' => $this->get_images( 3 ) ) );

		$this->assertSame( 1, Visual_Portfolio_Get::calculate_max_pages( $options ) );

		// No content source at all.
		$this->assertSame( 1, Visual_Portfolio_Get::calculate_max_pages( array() ) );
	}
}
