<?php
/**
 * Tests for selector control attribute value validation in Security class.
 *
 * Tests that:
 * 1. Invalid/unknown selector values fall back to defaults.
 * 2. String boolean options like 'true'/'false' work correctly as select values.
 * 3. Selectors with dynamic value_callback skip strict validation.
 *
 * @package Visual Portfolio
 */

/**
 * Test case for selector control attribute validation.
 */
class Test_Class_Security_Selector extends WP_UnitTestCase {
	/**
	 * Set up test environment.
	 *
	 * @return void
	 */
	public function set_up() {
		parent::set_up();

		// Clear cached controls to pick up fresh registrations.
		$reflection = new ReflectionClass( 'Visual_Portfolio_Controls' );
		$cached     = $reflection->getProperty( 'cached_all_registered_controls' );
		$cached->setAccessible( true );
		$cached->setValue( null, array() );

		$registered = $reflection->getProperty( 'registered_fields' );
		$registered->setAccessible( true );
		$registered->setValue( null, array() );

		// Register test controls.
		$this->register_test_controls();
	}

	/**
	 * Register controls for testing selector validation scenarios.
	 */
	private function register_test_controls() {
		// 1. Standard select control with static options (e.g. posts_order_by).
		Visual_Portfolio_Controls::register(
			array(
				'type'    => 'select',
				'name'    => 'posts_order_by',
				'default' => 'post_date',
				'options' => array(
					'post_date'     => 'Date',
					'title'         => 'Title',
					'id'            => 'ID',
					'comment_count' => 'Comments Count',
					'modified'      => 'Modified',
					'menu_order'    => 'Menu Order',
					'post__in'      => 'Manual Selection',
					'rand'          => 'Random',
				),
			)
		);

		// 2. Select control with string boolean options (e.g. show_date).
		Visual_Portfolio_Controls::register(
			array(
				'type'    => 'select',
				'name'    => 'items_style_default__show_date',
				'default' => 'false',
				'options' => array(
					'false' => 'Hide',
					'true'  => 'Default',
					'human' => 'Human Format',
				),
			)
		);

		// 3. Select control with string boolean options (e.g. show_read_more).
		Visual_Portfolio_Controls::register(
			array(
				'type'    => 'select',
				'name'    => 'items_style_default__show_read_more',
				'default' => 'false',
				'options' => array(
					'false'    => 'Hide',
					'true'     => 'Always Display',
					'more_tag' => 'Display when used More tag',
				),
			)
		);

		// 4. Select control with dynamic value_callback (e.g. post_types_set).
		Visual_Portfolio_Controls::register(
			array(
				'type'           => 'select',
				'name'           => 'post_types_set',
				'default'        => array( 'post' ),
				'value_callback' => array( $this, 'mock_dynamic_callback' ),
				'multiple'       => true,
			)
		);

		// 5. Single select with dynamic value_callback (e.g. posts_taxonomies).
		Visual_Portfolio_Controls::register(
			array(
				'type'           => 'select',
				'name'           => 'dynamic_single_select',
				'default'        => '',
				'value_callback' => array( $this, 'mock_dynamic_callback' ),
				'options'        => array(),
			)
		);

		// 6. Icons selector control (e.g. items_style).
		Visual_Portfolio_Controls::register(
			array(
				'type'    => 'icons_selector',
				'name'    => 'items_style',
				'default' => 'fade',
				'options' => array(
					array(
						'value' => 'default',
						'title' => 'Default',
					),
					array(
						'value' => 'fade',
						'title' => 'Fade',
					),
					array(
						'value' => 'fly',
						'title' => 'Fly',
					),
				),
			)
		);

		// 7. Icons selector control (e.g. sort).
		Visual_Portfolio_Controls::register(
			array(
				'type'    => 'icons_selector',
				'name'    => 'sort',
				'default' => 'dropdown',
				'options' => array(
					array(
						'value' => 'default',
						'title' => 'Default',
					),
					array(
						'value' => 'dropdown',
						'title' => 'Dropdown',
					),
				),
			)
		);
	}

	/**
	 * Mock dynamic callback for testing.
	 *
	 * @return array
	 */
	public function mock_dynamic_callback() {
		return array(
			array(
				'value' => 'post',
				'label' => 'Posts',
			),
			array(
				'value' => 'page',
				'label' => 'Pages',
			),
		);
	}

	// =========================================================================
	// Test Case 1: Invalid selector values should fall back to default.
	// =========================================================================

	/**
	 * Test that an invalid value for a select control with static options
	 * resets to the default value.
	 */
	public function test_invalid_select_value_falls_back_to_default() {
		$input  = array( 'posts_order_by' => 'invalid_nonexistent_value' );
		$result = Visual_Portfolio_Security::sanitize_attributes( $input );

		$this->assertEquals(
			'post_date',
			$result['posts_order_by'],
			'An invalid value for posts_order_by should fall back to the default "post_date"'
		);
	}

	/**
	 * Test that various invalid values all reset to default for select controls.
	 */
	public function test_multiple_invalid_values_fall_back_to_default() {
		$invalid_values = array(
			'completely_wrong',
			'123abc',
			'asc_date',
			'POST_DATE', // Case-sensitive check.
			'random_string_xyz',
		);

		foreach ( $invalid_values as $invalid ) {
			$input  = array( 'posts_order_by' => $invalid );
			$result = Visual_Portfolio_Security::sanitize_attributes( $input );

			$this->assertEquals(
				'post_date',
				$result['posts_order_by'],
				"Invalid value '$invalid' for posts_order_by should fall back to default 'post_date'"
			);
		}
	}

	/**
	 * Test that valid values for a select control pass through unchanged.
	 */
	public function test_valid_select_values_pass_through() {
		$valid_values = array( 'post_date', 'title', 'id', 'comment_count', 'modified', 'menu_order', 'rand' );

		foreach ( $valid_values as $valid ) {
			$input  = array( 'posts_order_by' => $valid );
			$result = Visual_Portfolio_Security::sanitize_attributes( $input );

			$this->assertEquals(
				$valid,
				$result['posts_order_by'],
				"Valid value '$valid' for posts_order_by should pass through unchanged"
			);
		}
	}

	/**
	 * Test that an invalid value for icons_selector type resets to default.
	 */
	public function test_invalid_icons_selector_value_falls_back_to_default() {
		$input  = array( 'items_style' => 'nonexistent_style' );
		$result = Visual_Portfolio_Security::sanitize_attributes( $input );

		$this->assertEquals(
			'fade',
			$result['items_style'],
			'An invalid items_style value should fall back to the default "fade"'
		);
	}

	/**
	 * Test that an invalid value for sort icons_selector resets to default.
	 */
	public function test_invalid_sort_value_falls_back_to_default() {
		$input  = array( 'sort' => 'invalid_sort_value' );
		$result = Visual_Portfolio_Security::sanitize_attributes( $input );

		$this->assertEquals(
			'dropdown',
			$result['sort'],
			'An invalid sort value should fall back to the default "dropdown"'
		);
	}

	// =========================================================================
	// Test Case 2: Boolean string option values ('true'/'false') work correctly.
	// =========================================================================

	/**
	 * Test that the string 'true' option value works correctly for show_date.
	 *
	 * This was the bug fixed in PR #208 - when a skin had show_date='true',
	 * the sanitize flow would convert it to boolean true, breaking the option lookup.
	 */
	public function test_true_string_option_passes_for_show_date() {
		$input  = array( 'items_style_default__show_date' => 'true' );
		$result = Visual_Portfolio_Security::sanitize_attributes( $input );

		// After sanitize_attributes, 'true' gets converted to boolean true
		// at the end of the sanitization flow. The key point is it should NOT
		// be reset to default 'false' by sanitize_selector.
		$this->assertTrue(
			true === $result['items_style_default__show_date'],
			'The string "true" option should be accepted and converted to boolean true, not reset to default'
		);
	}

	/**
	 * Test that the string 'false' option value works correctly for show_date.
	 */
	public function test_false_string_option_passes_for_show_date() {
		$input  = array( 'items_style_default__show_date' => 'false' );
		$result = Visual_Portfolio_Security::sanitize_attributes( $input );

		// 'false' gets converted to boolean false at the end of sanitization.
		$this->assertFalse(
			$result['items_style_default__show_date'],
			'The string "false" option should be accepted and converted to boolean false'
		);
	}

	/**
	 * Test that the 'human' option value works correctly for show_date.
	 */
	public function test_human_option_passes_for_show_date() {
		$input  = array( 'items_style_default__show_date' => 'human' );
		$result = Visual_Portfolio_Security::sanitize_attributes( $input );

		$this->assertEquals(
			'human',
			$result['items_style_default__show_date'],
			'The "human" option value should pass through sanitization unchanged'
		);
	}

	/**
	 * Test that boolean true input maps to 'true' option key in sanitize_selector.
	 *
	 * When WordPress meta stores true as boolean, the sanitize_selector should
	 * recognize it as matching the 'true' key in options and NOT reset to default.
	 * Note: sanitize_text_field converts boolean true to '1', but the key point
	 * is that the value is not reset to the default value ('false').
	 */
	public function test_boolean_true_maps_to_true_option_key() {
		$control = array(
			'type'    => 'select',
			'default' => 'false',
			'options' => array(
				'false' => 'Hide',
				'true'  => 'Default',
				'human' => 'Human Format',
			),
		);

		$result = Visual_Portfolio_Security::sanitize_selector( true, $control );

		// Boolean true should NOT be reset to the default value 'false'.
		// sanitize_text_field converts true to '1', which is the expected encoding.
		$this->assertNotEquals(
			'false',
			$result,
			'Boolean true should NOT be reset to default "false"'
		);
		$this->assertNotEquals(
			false,
			$result,
			'Boolean true should NOT be reset to boolean false'
		);
	}

	/**
	 * Test that boolean false input maps to 'false' option key in sanitize_selector.
	 *
	 * Note: sanitize_text_field converts boolean false to '', but the key point
	 * is that the value is not reset to a different default. Since the default
	 * IS 'false', both outcomes (empty string or 'false') are acceptable.
	 */
	public function test_boolean_false_maps_to_false_option_key() {
		$control = array(
			'type'    => 'select',
			'default' => 'false',
			'options' => array(
				'false' => 'Hide',
				'true'  => 'Default',
				'human' => 'Human Format',
			),
		);

		$result = Visual_Portfolio_Security::sanitize_selector( false, $control );

		// Boolean false maps to 'false' option key. sanitize_text_field converts it to ''.
		// In either case, the value should NOT be 'true' or 'human' (wrong default).
		$this->assertNotEquals(
			'true',
			$result,
			'Boolean false should not become "true"'
		);
		$this->assertNotEquals(
			'human',
			$result,
			'Boolean false should not become "human"'
		);
	}

	/**
	 * Test that invalid value for show_date falls back to default.
	 */
	public function test_invalid_show_date_value_falls_back_to_default() {
		$input  = array( 'items_style_default__show_date' => 'invalid_date_format' );
		$result = Visual_Portfolio_Security::sanitize_attributes( $input );

		// 'false' default gets converted to boolean false at end of sanitization.
		$this->assertFalse(
			$result['items_style_default__show_date'],
			'An invalid show_date value should fall back to the default "false" (converted to boolean false)'
		);
	}

	/**
	 * Test that 'true' option for show_read_more works correctly.
	 */
	public function test_true_string_option_passes_for_show_read_more() {
		$input  = array( 'items_style_default__show_read_more' => 'true' );
		$result = Visual_Portfolio_Security::sanitize_attributes( $input );

		$this->assertTrue(
			true === $result['items_style_default__show_read_more'],
			'The "true" option for show_read_more should be accepted'
		);
	}

	/**
	 * Test that 'more_tag' option for show_read_more works correctly.
	 */
	public function test_more_tag_option_passes_for_show_read_more() {
		$input  = array( 'items_style_default__show_read_more' => 'more_tag' );
		$result = Visual_Portfolio_Security::sanitize_attributes( $input );

		$this->assertEquals(
			'more_tag',
			$result['items_style_default__show_read_more'],
			'The "more_tag" option for show_read_more should pass through unchanged'
		);
	}

	/**
	 * Test that invalid value for show_read_more falls back to default.
	 */
	public function test_invalid_show_read_more_value_falls_back_to_default() {
		$input  = array( 'items_style_default__show_read_more' => 'invalid_value' );
		$result = Visual_Portfolio_Security::sanitize_attributes( $input );

		$this->assertFalse(
			$result['items_style_default__show_read_more'],
			'An invalid show_read_more value should fall back to default "false" (converted to boolean false)'
		);
	}

	// =========================================================================
	// Test Case 3: Select controls with value_callback skip strict validation.
	// =========================================================================

	/**
	 * Test that a select control with value_callback accepts arbitrary values.
	 *
	 * Controls with dynamic callbacks fetch their options asynchronously,
	 * so the server-side sanitizer can't validate against a static options list.
	 */
	public function test_dynamic_callback_select_accepts_arbitrary_single_value() {
		$control = array(
			'type'           => 'select',
			'default'        => '',
			'value_callback' => array( $this, 'mock_dynamic_callback' ),
			'options'        => array(),
		);

		// Dynamic selectors should accept any sanitized text value.
		$result = Visual_Portfolio_Security::sanitize_selector( 'custom_dynamic_value', $control );

		$this->assertEquals(
			'custom_dynamic_value',
			$result,
			'Controls with value_callback should accept arbitrary values without resetting to default'
		);
	}

	/**
	 * Test that a select control with value_callback accepts values not in options.
	 */
	public function test_dynamic_callback_select_does_not_reset_unknown_value() {
		$control = array(
			'type'           => 'select',
			'default'        => 'fallback',
			'value_callback' => array( $this, 'mock_dynamic_callback' ),
			'options'        => array(
				'option_a' => 'Option A',
			),
		);

		// Even though 'unknown_value' is not in options, it should not be reset
		// because value_callback is set.
		$result = Visual_Portfolio_Security::sanitize_selector( 'unknown_value', $control );

		$this->assertEquals(
			'unknown_value',
			$result,
			'Dynamic callback controls should not reset unknown values to default'
		);
	}

	/**
	 * Test that a select control WITHOUT value_callback DOES reset unknown values.
	 */
	public function test_static_select_resets_unknown_value() {
		$control = array(
			'type'    => 'select',
			'default' => 'option_a',
			'options' => array(
				'option_a' => 'Option A',
				'option_b' => 'Option B',
			),
		);

		$result = Visual_Portfolio_Security::sanitize_selector( 'unknown_value', $control );

		$this->assertEquals(
			'option_a',
			$result,
			'Static select controls should reset unknown values to default'
		);
	}

	/**
	 * Test that sanitize_attributes works for dynamic callback selects end-to-end.
	 */
	public function test_sanitize_attributes_dynamic_callback_accepts_arbitrary_value() {
		$input  = array( 'dynamic_single_select' => 'some_arbitrary_taxonomy_term' );
		$result = Visual_Portfolio_Security::sanitize_attributes( $input );

		$this->assertEquals(
			'some_arbitrary_taxonomy_term',
			$result['dynamic_single_select'],
			'sanitize_attributes should accept arbitrary values for dynamic callback controls'
		);
	}

	// =========================================================================
	// Test Case 4: reset_control_attribute_to_default behavior.
	// =========================================================================

	/**
	 * Test reset_control_attribute_to_default with string attribute.
	 */
	public function test_reset_to_default_with_string_attribute() {
		$control = array(
			'default' => 'my_default',
		);

		$result = Visual_Portfolio_Security::reset_control_attribute_to_default( 'wrong_value', $control );

		$this->assertEquals(
			'my_default',
			$result,
			'Non-boolean attributes should be reset to the control default'
		);
	}

	/**
	 * Test reset_control_attribute_to_default with boolean true attribute and 'true' default.
	 */
	public function test_reset_to_default_bool_true_with_true_string_default() {
		$control = array(
			'default' => 'true',
		);

		$result = Visual_Portfolio_Security::reset_control_attribute_to_default( true, $control );

		$this->assertTrue(
			$result,
			'Boolean true with "true" string default should return true'
		);
	}

	/**
	 * Test reset_control_attribute_to_default with boolean false attribute and 'false' default.
	 */
	public function test_reset_to_default_bool_false_with_false_string_default() {
		$control = array(
			'default' => 'false',
		);

		$result = Visual_Portfolio_Security::reset_control_attribute_to_default( false, $control );

		$this->assertFalse(
			$result,
			'Boolean false with "false" string default should return false'
		);
	}

	/**
	 * Test reset_control_attribute_to_default with no default specified.
	 */
	public function test_reset_to_empty_string_when_no_default() {
		$control = array();

		$result = Visual_Portfolio_Security::reset_control_attribute_to_default( 'wrong_value', $control );

		$this->assertEquals(
			'',
			$result,
			'When no default is specified, should reset to empty string'
		);
	}

	// =========================================================================
	// Test Case 5: sanitize_icons_selector behavior.
	// =========================================================================

	/**
	 * Test that invalid icons_selector value resets to default.
	 */
	public function test_sanitize_icons_selector_rejects_invalid_value() {
		$control = array(
			'type'    => 'icons_selector',
			'default' => 'fade',
			'options' => array(
				array(
					'value' => 'default',
					'title' => 'Default',
				),
				array(
					'value' => 'fade',
					'title' => 'Fade',
				),
			),
		);

		$result = Visual_Portfolio_Security::sanitize_icons_selector( 'nonexistent', $control );

		$this->assertEquals(
			'fade',
			$result,
			'Invalid icons_selector value should be reset to default'
		);
	}

	/**
	 * Test that valid icons_selector values pass through.
	 */
	public function test_sanitize_icons_selector_accepts_valid_value() {
		$control = array(
			'type'    => 'icons_selector',
			'default' => 'fade',
			'options' => array(
				array(
					'value' => 'default',
					'title' => 'Default',
				),
				array(
					'value' => 'fade',
					'title' => 'Fade',
				),
			),
		);

		$result = Visual_Portfolio_Security::sanitize_icons_selector( 'default', $control );

		$this->assertEquals(
			'default',
			$result,
			'Valid icons_selector value should pass through unchanged'
		);
	}

	// =========================================================================
	// Integration: Full sanitize_attributes flow.
	// =========================================================================

	/**
	 * Test full sanitize_attributes flow with a mix of valid, invalid, and boolean values.
	 */
	public function test_sanitize_attributes_mixed_values() {
		$input = array(
			'posts_order_by'                      => 'title',      // valid.
			'items_style'                         => 'nonexistent', // invalid icons_selector.
			'items_style_default__show_date'      => 'true',       // valid boolean string option.
			'items_style_default__show_read_more' => 'invalid',    // invalid.
			'sort'                                => 'dropdown',   // valid.
		);

		$result = Visual_Portfolio_Security::sanitize_attributes( $input );

		// Valid select value should pass through.
		$this->assertEquals( 'title', $result['posts_order_by'] );

		// Invalid icons_selector should reset to default.
		$this->assertEquals( 'fade', $result['items_style'] );

		// 'true' string option should be accepted (then converted to boolean true).
		$this->assertTrue( true === $result['items_style_default__show_date'] );

		// Invalid show_read_more should reset to default 'false' (→ boolean false).
		$this->assertFalse( $result['items_style_default__show_read_more'] );

		// Valid icons_selector value should pass through.
		$this->assertEquals( 'dropdown', $result['sort'] );
	}
}
