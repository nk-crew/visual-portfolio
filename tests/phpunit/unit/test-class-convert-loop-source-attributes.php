<?php
/**
 * Tests for the `vpf_convert_loop_source_attributes` filter.
 *
 * @package Visual Portfolio
 */

/**
 * Loop source attributes test case.
 */
class ClassConvertLoopSourceAttributes extends WP_UnitTestCase {
	/**
	 * Options a `vpf_extend_query_args` hook was called with.
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
		remove_all_filters( 'vpf_convert_loop_source_attributes' );
		remove_all_filters( 'vpf_extend_query_args' );

		parent::tear_down();
	}

	/**
	 * The fixture both the PHP filter and its JS twin are written against.
	 *
	 * @return array
	 */
	private function get_fixture() {
		$path = dirname( __DIR__, 2 ) . '/fixtures/loop-source-attributes.json';

		return json_decode( file_get_contents( $path ), true ); // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
	}

	/**
	 * Register the source mapping the fixture describes.
	 *
	 * A stand-in for what Pro social does: it answers to its own query type
	 * only, renames itself to a content source the query engine knows, and
	 * spreads its `sourceQuery` over the options its `vpf_extend_query_args`
	 * hooks read.
	 *
	 * @return void
	 */
	private function register_source() {
		add_filter(
			'vpf_convert_loop_source_attributes',
			function ( $legacy, $query_type, $source_query ) {
				if ( 'acme/social' !== $query_type ) {
					return $legacy;
				}

				$network = $source_query['network'] ?? '';

				$legacy['content_source']                    = 'social-stream';
				$legacy[ 'social_' . $network . '_username' ] = $source_query['username'] ?? '';
				$legacy[ 'social_' . $network . '_count' ]    = $source_query['count'] ?? 0;
				$legacy['social_cache_expiration']            = $source_query['cacheExpiration'] ?? 0;

				return $legacy;
			},
			10,
			3
		);
	}

	/**
	 * `sourceQuery` becomes the legacy options the fixture expects.
	 *
	 * @return void
	 */
	public function test_source_query_is_mapped() {
		$fixture = $this->get_fixture();

		$this->register_source();

		$legacy = Visual_Portfolio_Convert_Attributes::modern_to_legacy( $fixture['modern'] );

		foreach ( $fixture['legacy'] as $key => $value ) {
			$this->assertSame( $value, $legacy[ $key ] ?? null, $key );
		}

		// The shared settings keep converting the usual way.
		$this->assertSame( 12, $legacy['items_count'] );
	}

	/**
	 * The mapping also runs when the defaults are filled in.
	 *
	 * `get_loop_items()` converts with defaults, so a source that skipped this
	 * path would work in the front end and not in the editor preview.
	 *
	 * @return void
	 */
	public function test_source_query_is_mapped_with_defaults() {
		$fixture = $this->get_fixture();

		$this->register_source();

		$legacy = Visual_Portfolio_Convert_Attributes::modern_to_legacy( $fixture['modern'], true );

		foreach ( $fixture['legacy'] as $key => $value ) {
			$this->assertSame( $value, $legacy[ $key ] ?? null, $key );
		}
	}

	/**
	 * A source only ever sees its own loops.
	 *
	 * @return void
	 */
	public function test_built_in_sources_are_left_alone() {
		$this->register_source();

		$legacy = Visual_Portfolio_Convert_Attributes::modern_to_legacy(
			array(
				'queryType'  => 'posts',
				'baseQuery'  => array( 'perPage' => 6 ),
				'postsQuery' => array( 'source' => 'post' ),
			)
		);

		$this->assertSame( 'post-based', $legacy['content_source'] );
		$this->assertArrayNotHasKey( 'social_cache_expiration', $legacy );
	}

	/**
	 * Nothing is mapped when no source claims the query type.
	 *
	 * This is the loop of a plugin that got deactivated: it must convert
	 * without notices and without inventing options.
	 *
	 * @return void
	 */
	public function test_unknown_source_converts_untouched() {
		$fixture = $this->get_fixture();

		$legacy = Visual_Portfolio_Convert_Attributes::modern_to_legacy( $fixture['modern'] );

		$this->assertSame( 'acme/social', $legacy['content_source'] );
		$this->assertArrayNotHasKey( 'social_cache_expiration', $legacy );
	}

	/**
	 * The mapped options reach the query the source extends.
	 *
	 * @return void
	 */
	public function test_mapped_options_reach_query_params() {
		$fixture = $this->get_fixture();

		$this->register_source();

		add_filter(
			'vpf_extend_query_args',
			function ( $query_opts, $options ) {
				$this->captured_options = $options;

				return $query_opts;
			},
			10,
			2
		);

		Visual_Portfolio_Get::get_query_params(
			Visual_Portfolio_Convert_Attributes::modern_to_legacy( $fixture['modern'], true )
		);

		foreach ( $fixture['legacy'] as $key => $value ) {
			$this->assertSame( $value, $this->captured_options[ $key ] ?? null, $key );
		}
	}
}
