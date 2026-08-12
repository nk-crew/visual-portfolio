<?php
/**
 * Tests for the filter item counts.
 *
 * The counts next to the filter items describe the gallery, not the current
 * view: they are resolved from the unfiltered, unpaged set, so the numbers stay
 * still while the visitor clicks through filters and pages.
 *
 * @package Visual Portfolio
 */

/**
 * Filter counts test case.
 */
class ClassGetPortfolioFilterCounts extends WP_UnitTestCase {
	/**
	 * Attachment the images source points at.
	 *
	 * @var int
	 */
	private static $attachment_id = 0;

	/**
	 * Create the attachment shared by the images tests.
	 *
	 * @param WP_UnitTest_Factory $factory - test factory.
	 *
	 * @return void
	 */
	public static function wpSetUpBeforeClass( $factory ) {
		self::$attachment_id = $factory->attachment->create_object(
			array(
				'file'           => 'filter-counts.jpg',
				'post_mime_type' => 'image/jpeg',
			)
		);
	}

	/**
	 * Clean the request state between tests.
	 *
	 * @return void
	 */
	public function tear_down() {
		unset( $_GET['vp_page'], $_GET['vp_filter'], $_REQUEST['vp_page'], $_REQUEST['vp_filter'] );

		parent::tear_down();
	}

	/**
	 * Build the image items of the `images` content source.
	 *
	 * @param array $categories_per_image - categories of every image, one entry per image.
	 *
	 * @return array
	 */
	private function get_images( $categories_per_image ) {
		$images = array();

		foreach ( $categories_per_image as $index => $categories ) {
			$images[] = array(
				'id'         => self::$attachment_id,
				'title'      => 'Image ' . ( $index + 1 ),
				'categories' => (array) $categories,
			);
		}

		return $images;
	}

	/**
	 * Attributes of an images gallery.
	 *
	 * @param array $images - image items.
	 * @param int   $per_page - items per page.
	 *
	 * @return array
	 */
	private function get_images_atts( $images, $per_page = 2 ) {
		return array(
			'block_id'       => 'filter-counts-images',
			'content_source' => 'images',
			'images'         => $images,
			'items_count'    => $per_page,
			'pagination'     => 'paged',
		);
	}

	/**
	 * Resolve the filter counts the way `Visual_Portfolio_Get::filter()` does.
	 *
	 * @param array $atts - portfolio attributes.
	 *
	 * @return array slug => count.
	 */
	private function get_counts( $atts ) {
		$options    = Visual_Portfolio_Get::get_options( $atts );
		$query_opts = Visual_Portfolio_Get::get_query_params( $options, true );
		$active     = Visual_Portfolio_Get::get_filter_active_item( $query_opts );

		if ( 'images' === $options['content_source'] ) {
			$terms = Visual_Portfolio_Get::get_images_terms( $query_opts, $active );
		} else {
			$terms = Visual_Portfolio_Get::get_posts_terms( new WP_Query( $query_opts ), $active );
		}

		$counts = array();

		foreach ( $terms['terms'] as $slug => $term ) {
			$counts[ $slug ] = $term['count'];
		}

		return $counts;
	}

	/**
	 * Number of images the filter actually returns for the current request.
	 *
	 * @param array $atts - portfolio attributes.
	 *
	 * @return int
	 */
	private function count_filtered_images( $atts ) {
		$query_opts = Visual_Portfolio_Get::get_query_params( Visual_Portfolio_Get::get_options( $atts ) );

		return count( $query_opts['images'] );
	}

	/**
	 * Create posts in categories and return the gallery attributes.
	 *
	 * @return array
	 */
	private function get_posts_atts() {
		$cats = $this->factory->term->create(
			array(
				'taxonomy' => 'category',
				'name'     => 'Counts Cats',
			)
		);
		$dogs = $this->factory->term->create(
			array(
				'taxonomy' => 'category',
				'name'     => 'Counts Dogs',
			)
		);

		$posts = $this->factory->post->create_many( 5 );

		wp_set_object_terms( $posts[0], array( $cats ), 'category' );
		wp_set_object_terms( $posts[1], array( $cats, $dogs ), 'category' );
		wp_set_object_terms( $posts[2], array( $dogs ), 'category' );
		wp_set_object_terms( $posts[3], array( $dogs ), 'category' );
		wp_set_object_terms( $posts[4], array( $dogs ), 'category' );

		return array(
			'block_id'       => 'filter-counts-posts',
			'content_source' => 'post-based',
			'posts_source'   => 'post',
			'items_count'    => 2,
			'pagination'     => 'paged',
		);
	}

	/**
	 * Images: an active filter does not narrow the counts.
	 *
	 * @return void
	 */
	public function test_images_counts_ignore_the_active_filter() {
		$atts = $this->get_images_atts(
			$this->get_images(
				array(
					array( 'Cats' ),
					array( 'Cats', 'Dogs' ),
					array( 'Dogs' ),
					array( 'Dogs' ),
					array( 'Birds' ),
				)
			)
		);

		$expected = array(
			'cats'  => 2,
			'dogs'  => 3,
			'birds' => 1,
		);

		$this->assertSame( $expected, $this->get_counts( $atts ) );

		$_GET['vp_filter'] = 'cats';

		$this->assertSame( $expected, $this->get_counts( $atts ) );
	}

	/**
	 * Images: paging does not narrow the counts either.
	 *
	 * @return void
	 */
	public function test_images_counts_ignore_the_current_page() {
		$atts = $this->get_images_atts(
			$this->get_images(
				array(
					array( 'Cats' ),
					array( 'Cats' ),
					array( 'Dogs' ),
					array( 'Dogs' ),
					array( 'Dogs' ),
				)
			)
		);

		$expected = array(
			'cats' => 2,
			'dogs' => 3,
		);

		$this->assertSame( $expected, $this->get_counts( $atts ) );

		$_GET['vp_page'] = '3';

		$this->assertSame( $expected, $this->get_counts( $atts ) );
	}

	/**
	 * Images: labels that slugify to one term are counted as one term.
	 *
	 * The filter matches on the slug, so a count taken per label promised fewer
	 * items than the filter went on to show.
	 *
	 * @return void
	 */
	public function test_images_counts_merge_labels_sharing_a_slug() {
		$atts = $this->get_images_atts(
			$this->get_images(
				array(
					array( 'Cats' ),
					array( 'cats' ),
					array( 'CATS' ),
				)
			),
			10
		);

		$counts = $this->get_counts( $atts );

		$this->assertSame( array( 'cats' => 3 ), $counts );

		$_GET['vp_filter'] = 'cats';

		$this->assertSame( $counts['cats'], $this->count_filtered_images( $atts ) );
	}

	/**
	 * Images: one image is one item of a term, however many labels point at it.
	 *
	 * @return void
	 */
	public function test_images_count_an_image_once_per_term() {
		$atts = $this->get_images_atts(
			$this->get_images(
				array(
					array( 'Cats', 'cats' ),
					array( 'Cats' ),
				)
			),
			10
		);

		$counts = $this->get_counts( $atts );

		$this->assertSame( array( 'cats' => 2 ), $counts );

		$_GET['vp_filter'] = 'cats';

		$this->assertSame( $counts['cats'], $this->count_filtered_images( $atts ) );
	}

	/**
	 * Images: an image counts in every term it belongs to.
	 *
	 * @return void
	 */
	public function test_images_count_every_term_of_an_image() {
		$atts = $this->get_images_atts(
			$this->get_images( array( array( 'Cats', 'Dogs' ) ) ),
			10
		);

		$this->assertSame(
			array(
				'cats' => 1,
				'dogs' => 1,
			),
			$this->get_counts( $atts )
		);
	}

	/**
	 * Posts: an active filter does not narrow the counts.
	 *
	 * @return void
	 */
	public function test_posts_counts_ignore_the_active_filter() {
		$atts = $this->get_posts_atts();

		$expected = array(
			rawurlencode( 'category:' ) . 'counts-cats' => 2,
			rawurlencode( 'category:' ) . 'counts-dogs' => 4,
		);

		$this->assertSame( $expected, $this->get_counts( $atts ) );

		$_GET['vp_filter'] = 'category:counts-cats';

		$this->assertSame( $expected, $this->get_counts( $atts ) );
	}

	/**
	 * Posts: paging does not narrow the counts either.
	 *
	 * @return void
	 */
	public function test_posts_counts_ignore_the_current_page() {
		$atts = $this->get_posts_atts();

		$expected = array(
			rawurlencode( 'category:' ) . 'counts-cats' => 2,
			rawurlencode( 'category:' ) . 'counts-dogs' => 4,
		);

		$this->assertSame( $expected, $this->get_counts( $atts ) );

		$_GET['vp_page'] = '3';

		$this->assertSame( $expected, $this->get_counts( $atts ) );
	}
}
