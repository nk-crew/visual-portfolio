<?php
/**
 * Tests for the extension points a third-party content source needs.
 *
 * A source that is neither posts nor images answers through
 * `vpf_custom_query_result` and maps its settings into legacy options of its
 * own. Both halves have to survive the trip to a page count, or a gallery on
 * such a source renders as a single page for visitors.
 *
 * @package Visual Portfolio
 */

/**
 * Custom source test case.
 */
class ClassLoopCustomSource extends WP_UnitTestCase {
	/**
	 * Options the custom query was asked with.
	 *
	 * @var array
	 */
	private $captured_options = array();

	/**
	 * Drop the hooks a test registered.
	 *
	 * @return void
	 */
	public function tear_down() {
		remove_all_filters( 'vpf_custom_query_result' );
		remove_all_filters( 'vpf_allowed_max_pages_params' );
		remove_all_filters( 'vpf_convert_loop_source_attributes' );

		$this->captured_options = array();

		parent::tear_down();
	}

	/**
	 * Register a source that answers with a query object of its own.
	 *
	 * The shape Pro taxonomies use: a query-like object carrying the number of
	 * pages it found.
	 *
	 * @param int $max_num_pages - pages the source reports.
	 *
	 * @return void
	 */
	private function register_custom_query( $max_num_pages ) {
		add_filter(
			'vpf_custom_query_result',
			function ( $query, $query_opts, $options ) use ( $max_num_pages ) {
				if ( 'acme-taxonomies' !== ( $options['content_source'] ?? '' ) ) {
					return $query;
				}

				$this->captured_options = $options;

				$custom                = new stdClass();
				$custom->max_num_pages = $max_num_pages;

				return $custom;
			},
			10,
			3
		);
	}

	/**
	 * A source with its own query reports its own page count.
	 *
	 * @return void
	 */
	public function test_custom_query_reports_pages() {
		$this->register_custom_query( 4 );

		$options = array(
			'content_source' => 'acme-taxonomies',
			'items_count'    => 6,
		);

		$this->assertSame( 4, Visual_Portfolio_Get::calculate_max_pages( $options ) );
	}

	/**
	 * A source that answers with nothing still reports a page.
	 *
	 * @return void
	 */
	public function test_source_without_query_reports_one_page() {
		$options = array(
			'content_source' => 'acme-taxonomies',
			'items_count'    => 6,
		);

		$this->assertSame( 1, Visual_Portfolio_Get::calculate_max_pages( $options ) );
	}

	/**
	 * A custom query wins over the posts query, exactly as when items are built.
	 *
	 * @return void
	 */
	public function test_custom_query_wins_over_posts() {
		self::factory()->post->create_many( 9 );

		add_filter(
			'vpf_custom_query_result',
			function () {
				$custom                = new stdClass();
				$custom->max_num_pages = 2;

				return $custom;
			}
		);

		$options = Visual_Portfolio_Convert_Attributes::modern_to_legacy(
			array(
				'queryType'  => 'posts',
				'baseQuery'  => array( 'perPage' => 3 ),
				'postsQuery' => array( 'source' => 'post' ),
			),
			true
		);

		// Nine posts, three per page - the source overrules the count anyway.
		$this->assertSame( 2, Visual_Portfolio_Get::calculate_max_pages( $options ) );
	}

	/**
	 * Options of a third-party source survive the allow-list.
	 *
	 * Without the filter every option a source maps its `sourceQuery` into is
	 * stripped before the query is built, and the source is asked to count
	 * items it was never told about.
	 *
	 * @return void
	 */
	public function test_source_options_reach_the_query() {
		$this->register_custom_query( 3 );

		add_filter(
			'vpf_allowed_max_pages_params',
			function ( $config ) {
				$config['acme_account'] = array( 'string', '' );
				$config['acme_count']   = array( 'number', 0 );

				return $config;
			}
		);

		$options = array(
			'content_source' => 'acme-taxonomies',
			'items_count'    => 6,
			'acme_account'   => 'gallery',
			'acme_count'     => 42,
			'acme_unknown'   => 'dropped',
		);

		$this->assertSame( 3, Visual_Portfolio_Get::calculate_max_pages( $options ) );

		$this->assertSame( 'gallery', $this->captured_options['acme_account'] ?? null );
		$this->assertSame( 42, $this->captured_options['acme_count'] ?? null );

		// Everything the source did not register is still dropped.
		$this->assertArrayNotHasKey( 'acme_unknown', $this->captured_options );
	}

	/**
	 * Without the filter the same options are dropped.
	 *
	 * @return void
	 */
	public function test_unregistered_source_options_are_dropped() {
		$this->register_custom_query( 3 );

		Visual_Portfolio_Get::calculate_max_pages(
			array(
				'content_source' => 'acme-taxonomies',
				'items_count'    => 6,
				'acme_account'   => 'gallery',
			)
		);

		$this->assertArrayNotHasKey( 'acme_account', $this->captured_options );
	}
}
