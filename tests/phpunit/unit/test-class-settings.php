<?php
/**
 * Tests for Visual_Portfolio_Settings.
 *
 * @package Visual Portfolio
 */

/**
 * Settings fields.
 */
class ClassSettings extends WP_UnitTestCase {
	/**
	 * Plugin name before the test changed it.
	 *
	 * @var string
	 */
	private $plugin_name;

	/**
	 * Start every test without cached fields.
	 */
	public function set_up() {
		parent::set_up();

		$this->plugin_name                                 = visual_portfolio()->plugin_name;
		Visual_Portfolio_Settings::$cached_settings_fields = null;
	}

	/**
	 * Restore the plugin name and drop the fields this test cached.
	 */
	public function tear_down() {
		visual_portfolio()->plugin_name                    = $this->plugin_name;
		Visual_Portfolio_Settings::$cached_settings_fields = null;

		parent::tear_down();
	}

	/**
	 * Find the Lazy Loading field of the Images tab.
	 *
	 * @return array
	 */
	private function get_lazy_loading_field() {
		$fields = Visual_Portfolio_Settings::get_settings_fields();

		foreach ( $fields['vp_images'] as $field ) {
			if ( 'lazy_loading' === $field['name'] ) {
				return $field;
			}
		}

		return array();
	}

	/**
	 * Image sizes read the Images tab defaults on `after_setup_theme`, before `init` names the
	 * plugin and before Pro's white label renames it.
	 */
	public function test_lazy_loading_names_the_plugin_set_after_the_first_read() {
		delete_option( 'vp_images' );
		visual_portfolio()->plugin_name = null;

		Visual_Portfolio_Settings::get_option( 'sm', 'vp_images' );

		visual_portfolio()->plugin_name = 'Visual Portfolio';
		$field                          = $this->get_lazy_loading_field();

		$this->assertSame( 'Enable lazy loading for Visual Portfolio layouts only or for the whole website.', $field['desc'] );
		$this->assertSame( 'Visual Portfolio Only', $field['options']['vp'] );

		visual_portfolio()->plugin_name = 'Acme Gallery';

		$this->assertSame( 'Acme Gallery Only', $this->get_lazy_loading_field()['options']['vp'] );
	}
}
