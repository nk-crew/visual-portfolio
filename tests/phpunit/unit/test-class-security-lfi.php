<?php
/**
 * Tests for LFI Path Traversal vulnerability in Security class.
 *
 * Tests that icons_selector type controls properly reject path traversal
 * sequences (../) which could allow Local File Inclusion attacks.
 *
 * @package Visual Portfolio
 */

/**
 * Test case for LFI path traversal sanitization in Security class.
 */
class Test_Class_Security_LFI extends WP_UnitTestCase {
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

		// Ensure controls are registered (they are registered in Admin class via hooks).
		// We need at least the items_style, filter, sort, pagination_style controls.
		$this->ensure_controls_registered();
	}

	/**
	 * Ensure the necessary controls are registered for testing.
	 *
	 * This registers minimal icons_selector controls that mirror the real
	 * plugin controls used in template path construction.
	 */
	private function ensure_controls_registered() {
		$controls = Visual_Portfolio_Controls::get_registered_array();

		// Register items_style control if not already registered.
		if ( ! isset( $controls['items_style'] ) ) {
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
						array(
							'value' => 'emerge',
							'title' => 'Emerge',
						),
					),
				)
			);
		}

		// Register filter control if not already registered.
		if ( ! isset( $controls['filter'] ) ) {
			Visual_Portfolio_Controls::register(
				array(
					'type'    => 'icons_selector',
					'name'    => 'filter',
					'default' => 'minimal',
					'options' => array(
						array(
							'value' => 'default',
							'title' => 'Default',
						),
						array(
							'value' => 'minimal',
							'title' => 'Minimal',
						),
					),
				)
			);
		}

		// Register sort control if not already registered.
		if ( ! isset( $controls['sort'] ) ) {
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

		// Register pagination_style control if not already registered.
		if ( ! isset( $controls['pagination_style'] ) ) {
			Visual_Portfolio_Controls::register(
				array(
					'type'    => 'icons_selector',
					'name'    => 'pagination_style',
					'default' => 'minimal',
					'options' => array(
						array(
							'value' => 'default',
							'title' => 'Default',
						),
						array(
							'value' => 'minimal',
							'title' => 'Minimal',
						),
					),
				)
			);
		}
	}

	/**
	 * Test that sanitize_attributes rejects path traversal in items_style.
	 *
	 * The items_style value is used in template path construction:
	 *   include_template('items-list/items-style/' . $items_style . '/image')
	 *
	 * Path traversal like "../../wp-includes" would allow LFI.
	 */
	public function test_sanitize_attributes_rejects_path_traversal_in_items_style() {
		$traversal_payloads = array(
			'../../../../../../wp-includes',
			'../../../etc',
			'../../wp-config',
			'../wp-content/debug.log',
			'items-list/../../wp-includes',
		);

		foreach ( $traversal_payloads as $payload ) {
			$input  = array( 'items_style' => $payload );
			$result = Visual_Portfolio_Security::sanitize_attributes( $input );

			$this->assertStringNotContainsString(
				'..',
				$result['items_style'],
				"Path traversal payload '$payload' should be rejected for items_style"
			);
		}
	}

	/**
	 * Test that sanitize_attributes allows valid items_style values.
	 */
	public function test_sanitize_attributes_allows_valid_items_style_values() {
		$valid_values = array( 'fade', 'fly', 'emerge', 'default' );

		foreach ( $valid_values as $value ) {
			$input  = array( 'items_style' => $value );
			$result = Visual_Portfolio_Security::sanitize_attributes( $input );

			$this->assertEquals(
				$value,
				$result['items_style'],
				"Valid items_style value '$value' should pass sanitization unchanged"
			);
		}
	}

	/**
	 * Test that sanitize_attributes rejects path traversal in filter.
	 */
	public function test_sanitize_attributes_rejects_path_traversal_in_filter() {
		$input  = array( 'filter' => '../../../etc' );
		$result = Visual_Portfolio_Security::sanitize_attributes( $input );

		$this->assertStringNotContainsString(
			'..',
			$result['filter'],
			"Path traversal should be rejected for filter option"
		);
	}

	/**
	 * Test that sanitize_attributes rejects path traversal in sort.
	 */
	public function test_sanitize_attributes_rejects_path_traversal_in_sort() {
		$input  = array( 'sort' => '../../../etc' );
		$result = Visual_Portfolio_Security::sanitize_attributes( $input );

		$this->assertStringNotContainsString(
			'..',
			$result['sort'],
			"Path traversal should be rejected for sort option"
		);
	}

	/**
	 * Test that sanitize_attributes rejects path traversal in pagination_style.
	 */
	public function test_sanitize_attributes_rejects_path_traversal_in_pagination_style() {
		$input  = array( 'pagination_style' => '../../../etc' );
		$result = Visual_Portfolio_Security::sanitize_attributes( $input );

		$this->assertStringNotContainsString(
			'..',
			$result['pagination_style'],
			"Path traversal should be rejected for pagination_style option"
		);
	}

	/**
	 * Test that items_style with traversal is reset to default value.
	 */
	public function test_items_style_traversal_resets_to_default() {
		$input  = array( 'items_style' => '../../../../../../wp-includes' );
		$result = Visual_Portfolio_Security::sanitize_attributes( $input );

		// Should be reset to the default value 'fade'.
		$this->assertEquals(
			'fade',
			$result['items_style'],
			"Path traversal in items_style should reset value to default 'fade'"
		);
	}

	/**
	 * Test that unknown items_style values are rejected (not just traversal).
	 */
	public function test_unknown_items_style_values_are_rejected() {
		$input  = array( 'items_style' => 'nonexistent_style' );
		$result = Visual_Portfolio_Security::sanitize_attributes( $input );

		$this->assertNotEquals(
			'nonexistent_style',
			$result['items_style'],
			"Unknown items_style value should be rejected and reset to default"
		);
	}

	/**
	 * Test that vp_ prefix is properly stripped during sanitization.
	 *
	 * The preview frame sends POST data with vp_ prefix (e.g. vp_items_style).
	 * sanitize_attributes() strips this prefix but should still validate.
	 */
	public function test_vp_prefixed_items_style_traversal_is_rejected() {
		$input  = array( 'vp_items_style' => '../../../../../../wp-includes' );
		$result = Visual_Portfolio_Security::sanitize_attributes( $input );

		// After stripping vp_ prefix, should validate the value.
		$this->assertStringNotContainsString(
			'..',
			$result['items_style'] ?? '',
			"Path traversal in vp_items_style (with prefix) should be rejected"
		);
	}
}
