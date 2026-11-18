<?php
/**
 * Tests for the stylesheets Visual_Portfolio_Admin enqueues.
 *
 * @package Visual Portfolio
 */

/**
 * The admin stylesheet as WordPress prints it.
 */
class Test_Visual_Portfolio_Admin_Styles extends WP_UnitTestCase {
	/**
	 * Styles WordPress had before the test.
	 *
	 * @var WP_Styles|null
	 */
	protected $styles;

	/**
	 * Start from an empty style queue.
	 */
	public function set_up() {
		parent::set_up();

		global $wp_styles;

		$this->styles = $wp_styles;
		$wp_styles    = new WP_Styles();
	}

	/**
	 * Put back the style queue.
	 */
	public function tear_down() {
		global $wp_styles;

		$wp_styles = $this->styles;

		parent::tear_down();
	}

	/**
	 * A right-to-left admin gets the mirrored stylesheet the build makes.
	 */
	public function test_rtl_admin_prints_the_rtl_stylesheet() {
		set_current_screen( 'dashboard' );
		wp_styles()->text_direction = 'rtl';

		( new Visual_Portfolio_Admin() )->admin_enqueue_scripts();

		ob_start();
		wp_styles()->do_item( 'visual-portfolio-admin' );
		$html = ob_get_clean();

		$this->assertStringContainsString( 'build/assets/admin/css/style-rtl.css', $html );
	}
}
