<?php
/**
 * Tests for ClassSort
 *
 * @package Visual Portfolio
 */

/**
 * Sort test case.
 */
class ClassSort extends WP_UnitTestCase {
	/**
	 * Get fixture for test.
	 *
	 * @param string $filename - name of json file
	 * @return array
	 */
	public function get_json_array( $filename ) {
		$filepath = dirname( dirname( __FILE__ ) ) . '/fixtures/sort/' . $filename . '.json';
		$json     = file_get_contents( $filepath );
		// Decode the JSON file
		$json_data = json_decode( $json, true );

		return $json_data;
	}

	/**
	 * Test for sort array with equal elements.
	 *
	 * @return void
	 */
	public function test_sort_equal() {
		// Read the JSON file
		$equal_array        = $this->get_json_array( 'equal' );
		$equal_sorted_array = $this->get_json_array( 'equal-sorted' );
		$sorted_array_asc   = Visual_Portfolio_Get::sort_array_by_field( $equal_array, 'title', 'asc' );
		$sorted_array_desc  = Visual_Portfolio_Get::sort_array_by_field( $equal_array, 'title', 'desc' );

		$this->assertEquals(
            $equal_array,
			$sorted_array_asc
        );

		$this->assertEquals(
            $equal_sorted_array,
			$sorted_array_desc
        );
	}

	/**
	 * Test for sort array with empty elements.
	 *
	 * @return void
	 */
	public function test_sort_empty() {
		$empty_array        = $this->get_json_array( 'empty' );
		$empty_sorted_array = $this->get_json_array( 'empty-desc' );
		$sorted_array_asc   = Visual_Portfolio_Get::sort_array_by_field( $empty_array, 'title', 'asc' );
		$sorted_array_desc  = Visual_Portfolio_Get::sort_array_by_field( $empty_array, 'title', 'desc' );

		$this->assertEquals(
            $empty_array,
			$sorted_array_asc
        );

		$this->assertEquals(
            $empty_sorted_array,
			$sorted_array_desc
        );
	}

	/**
	 * Test for sort array with complex elements.
	 *
	 * @return void
	 */
	public function test_sort_complex() {
		$complex_array             = $this->get_json_array( 'complex' );
		$complex_sorted_array_asc  = $this->get_json_array( 'complex-sorted-asc' );
		$complex_sorted_array_desc = $this->get_json_array( 'complex-sorted-desc' );
		$sorted_array_asc   = Visual_Portfolio_Get::sort_array_by_field( $complex_array, 'title', 'asc' );
		$sorted_array_desc  = Visual_Portfolio_Get::sort_array_by_field( $complex_array, 'title', 'desc' );

		$this->assertEquals(
            $complex_sorted_array_asc,
			$sorted_array_asc
        );

		$this->assertEquals(
            $complex_sorted_array_desc,
			$sorted_array_desc
        );
	}
}
