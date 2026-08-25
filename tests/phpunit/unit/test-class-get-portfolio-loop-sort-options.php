<?php
/**
 * Tests for Visual_Portfolio_Get::get_loop_sort_options
 *
 * @package Visual Portfolio
 */

/**
 * Loop sort options test case.
 */
class ClassGetPortfolioLoopSortOptions extends WP_UnitTestCase {
	/**
	 * Drop the callbacks a test added.
	 *
	 * @return void
	 */
	public function tear_down() {
		remove_all_filters( 'vpf_loop_sort_options' );
		remove_all_filters( 'vpf_extend_sort_items' );

		parent::tear_down();
	}

	/**
	 * The built-in options are offered in the order they are declared in.
	 *
	 * @return void
	 */
	public function test_built_in_options() {
		$options = Visual_Portfolio_Get::get_loop_sort_options();

		$this->assertSame(
			array( '', 'date_desc', 'date', 'title', 'title_desc' ),
			array_keys( $options )
		);
		$this->assertSame( 'Default sorting', $options[''] );
	}

	/**
	 * The filter can add an option of its own.
	 *
	 * @return void
	 */
	public function test_filter_adds_an_option() {
		add_filter(
			'vpf_loop_sort_options',
			function ( $options ) {
				$options['popular'] = 'Most popular';

				return $options;
			}
		);

		$options = Visual_Portfolio_Get::get_loop_sort_options();

		$this->assertArrayHasKey( 'popular', $options );
		$this->assertSame( 'Most popular', $options['popular'] );
	}

	/**
	 * The filter can take options away.
	 *
	 * @return void
	 */
	public function test_filter_removes_an_option() {
		add_filter(
			'vpf_loop_sort_options',
			function ( $options ) {
				unset( $options['title'], $options['title_desc'] );

				return $options;
			}
		);

		$this->assertSame(
			array( '', 'date_desc', 'date' ),
			array_keys( Visual_Portfolio_Get::get_loop_sort_options() )
		);
	}

	/**
	 * The filter is told which loop it is answering about.
	 *
	 * @return void
	 */
	public function test_filter_receives_the_loop_options() {
		$received = null;

		add_filter(
			'vpf_loop_sort_options',
			function ( $options, $loop_options ) use ( &$received ) {
				$received = $loop_options;

				return $options;
			},
			10,
			2
		);

		Visual_Portfolio_Get::get_loop_sort_options( array( 'content_source' => 'images' ) );

		$this->assertSame( array( 'content_source' => 'images' ), $received );
	}

	/**
	 * A callback that answers with nonsense leaves the block with no options
	 * rather than with a broken one.
	 *
	 * @return void
	 */
	public function test_filter_must_return_an_array() {
		add_filter( 'vpf_loop_sort_options', '__return_false' );

		$this->assertSame( array(), Visual_Portfolio_Get::get_loop_sort_options() );
	}

	/**
	 * The base list is the shared one, so a legacy callback still counts.
	 *
	 * @return void
	 */
	public function test_base_list_is_shared_with_the_legacy_sort() {
		add_filter(
			'vpf_extend_sort_items',
			function ( $items ) {
				$items['legacy'] = 'Legacy option';

				return $items;
			}
		);

		$this->assertArrayHasKey( 'legacy', Visual_Portfolio_Get::get_loop_sort_options() );
	}
}
