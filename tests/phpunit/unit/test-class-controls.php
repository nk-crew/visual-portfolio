<?php
/**
 * Tests for Visual_Portfolio_Controls class
 *
 * @package Visual Portfolio
 */

/**
 * Test case for Visual Portfolio Controls class.
 */
class Test_Visual_Portfolio_Controls extends WP_UnitTestCase {
	/**
	 * Set up test environment.
	 *
	 * @return void
	 */
	public function set_up() {
		parent::set_up();

		// Make sure the class is loaded.
		if ( ! class_exists( 'Visual_Portfolio_Controls' ) ) {
			require_once VP_PATH . 'classes/class-controls.php';
		}
	}

	/**
	 * Test is_boolean_string_field_for_saved_layout method.
	 */
	public function test_is_boolean_string_field_for_saved_layout() {
		// Create a saved layout post for testing.
		$post_id = $this->factory->post->create( array(
			'post_type' => 'vp_lists',
		) );

		// Test various field patterns that should return true.
		$boolean_fields = array(
			'items_style_default__show_date',
			'items_style_classic__show_read_more',
			'items_style_fade__show_categories',
			'items_style_fly__show_excerpt',
			'pagination_paged__show_arrows',
			'pagination_load_more__show_numbers',
			'custom_prefix__show_title',
			'another_prefix__show_author',
			'test__show_icon',
			'prefix__show_count',
		);

		foreach ( $boolean_fields as $field ) {
			$result = $this->invoke_private_method( 'is_boolean_string_field_for_saved_layout', array( $field, $post_id ) );
			$this->assertTrue( $result, "Field $field should be recognized as boolean string field" );
		}

		// Test fields that should return false.
		$non_boolean_fields = array(
			'items_style_default__other_field',
			'show_date', // Missing double underscore prefix.
			'items_style__display_something',
			'random_field_name',
		);

		foreach ( $non_boolean_fields as $field ) {
			$result = $this->invoke_private_method( 'is_boolean_string_field_for_saved_layout', array( $field, $post_id ) );
			$this->assertFalse( $result, "Field $field should NOT be recognized as boolean string field" );
		}

		// Test with non-vp_lists post type (should always return false).
		$regular_post_id = $this->factory->post->create( array(
			'post_type' => 'post',
		) );

		foreach ( $boolean_fields as $field ) {
			$result = $this->invoke_private_method( 'is_boolean_string_field_for_saved_layout', array( $field, $regular_post_id ) );
			$this->assertFalse( $result, "Field $field should return false for non-vp_lists post type" );
		}
	}

	/**
	 * Test fix_boolean_string_values_for_saved_layouts filter.
	 */
	public function test_fix_boolean_string_values_for_saved_layouts() {
		// Create a saved layout post for testing.
		$post_id = $this->factory->post->create( array(
			'post_type' => 'vp_lists',
		) );

		// Test boolean to string conversion for saved layouts.
		$test_cases = array(
			// Input => Expected output for boolean string fields.
			false     => 'false',
			true      => 'true',
			0         => 'false',
			1         => 'true',
			'0'       => 'false',
			'1'       => 'true',
			''        => 'false',
			'false'   => 'false',  // Already correct string.
			'true'    => 'true',   // Already correct string.
			'more_tag' => 'more_tag', // Special value should be preserved.
			'human'    => 'human',    // Special value should be preserved.
		);

		foreach ( $test_cases as $input => $expected ) {
			$result = apply_filters( 'vpf_control_value', $input, 'items_style_default__show_date', $post_id );
			$this->assertEquals( $expected, $result, "Value $input should be converted to '$expected' for boolean string field" );
		}

		// Test that non-boolean fields convert string booleans to actual booleans.
		$regular_field_cases = array(
			'false' => false,
			'true'  => true,
			'other' => 'other', // Non-boolean strings should be preserved.
			123     => 123,     // Numbers should be preserved.
		);

		foreach ( $regular_field_cases as $input => $expected ) {
			$result = apply_filters( 'vpf_control_value', $input, 'regular_field', $post_id );
			$this->assertEquals( $expected, $result, "Value $input should be converted to '$expected' for regular field" );
		}

		// Test with regular post (non-vp_lists) - should convert string booleans to actual booleans.
		$regular_post_id = $this->factory->post->create( array(
			'post_type' => 'post',
		) );

		$result = apply_filters( 'vpf_control_value', 'false', 'items_style_default__show_date', $regular_post_id );
		$this->assertEquals( false, $result, "String 'false' should be converted to boolean false for non-vp_lists post" );

		$result = apply_filters( 'vpf_control_value', 'true', 'items_style_default__show_date', $regular_post_id );
		$this->assertEquals( true, $result, "String 'true' should be converted to boolean true for non-vp_lists post" );
	}

	/**
	 * Test edge cases for boolean conversion.
	 */
	public function test_boolean_conversion_edge_cases() {
		$post_id = $this->factory->post->create( array(
			'post_type' => 'vp_lists',
		) );

		// Test null value.
		$result = apply_filters( 'vpf_control_value', null, 'items_style_default__show_date', $post_id );
		$this->assertEquals( null, $result, "Null should remain null" );

		// Test array value (should be preserved).
		$array_value = array( 'test' => 'value' );
		$result = apply_filters( 'vpf_control_value', $array_value, 'items_style_default__show_date', $post_id );
		$this->assertEquals( $array_value, $result, "Array values should be preserved" );

		// Test object value (should be preserved).
		$object_value = (object) array( 'test' => 'value' );
		$result = apply_filters( 'vpf_control_value', $object_value, 'items_style_default__show_date', $post_id );
		$this->assertEquals( $object_value, $result, "Object values should be preserved" );
	}

	/**
	 * Test all registered control patterns.
	 */
	public function test_all_registered_control_patterns() {
		$post_id = $this->factory->post->create( array(
			'post_type' => 'vp_lists',
		) );

		// Test each registered pattern.
		$patterns = array(
			'__show_date',
			'__show_read_more',
			'__show_categories',
			'__show_excerpt',
			'__show_arrows',
			'__show_numbers',
			'__show_title',
			'__show_author',
			'__show_icon',
			'__show_count',
		);

		foreach ( $patterns as $pattern ) {
			$field_name = 'test_prefix' . $pattern;

			// Test that boolean false is converted to string 'false'.
			$result = apply_filters( 'vpf_control_value', false, $field_name, $post_id );
			$this->assertEquals( 'false', $result, "Pattern $pattern should convert false to 'false'" );

			// Test that boolean true is converted to string 'true'.
			$result = apply_filters( 'vpf_control_value', true, $field_name, $post_id );
			$this->assertEquals( 'true', $result, "Pattern $pattern should convert true to 'true'" );
		}
	}

	/**
	 * Helper method to invoke private/protected methods for testing.
	 *
	 * @param string $method_name The method name.
	 * @param array  $parameters  The parameters to pass.
	 * @return mixed The method result.
	 */
	private function invoke_private_method( $method_name, $parameters ) {
		$class = new ReflectionClass( 'Visual_Portfolio_Controls' );
		$method = $class->getMethod( $method_name );
		$method->setAccessible( true );

		return $method->invokeArgs( null, $parameters );
	}
}