<?php
/**
 * Tests for the welcome screen redirect URL.
 *
 * @package Visual Portfolio
 */

/**
 * Welcome screen test case.
 */
class WelcomeScreenTest extends WP_UnitTestCase {
	/**
	 * Original general settings option.
	 *
	 * @var mixed
	 */
	protected $original_vp_general;

	/**
	 * Preserve option state.
	 */
	public function setUp(): void {
		parent::setUp();

		$this->original_vp_general = get_option( 'vp_general' );
	}

	/**
	 * Restore option state.
	 */
	public function tearDown(): void {
		if ( false === $this->original_vp_general ) {
			delete_option( 'vp_general' );
		} else {
			update_option( 'vp_general', $this->original_vp_general );
		}

		parent::tearDown();
	}

	/**
	 * Use edit.php when Portfolio CPT is enabled.
	 */
	public function test_get_welcome_page_url_for_registered_portfolio_post_type() {
		update_option(
			'vp_general',
			array(
				'register_portfolio_post_type' => 'on',
			)
		);

		$this->assertSame(
			admin_url( 'edit.php?post_type=portfolio&page=visual-portfolio-welcome' ),
			Visual_Portfolio_Welcome_Screen::get_welcome_page_url()
		);
	}

	/**
	 * Use admin.php when Portfolio CPT is disabled.
	 */
	public function test_get_welcome_page_url_for_unregistered_portfolio_post_type() {
		update_option(
			'vp_general',
			array(
				'register_portfolio_post_type' => 'off',
			)
		);

		$this->assertSame(
			admin_url( 'admin.php?page=visual-portfolio-welcome' ),
			Visual_Portfolio_Welcome_Screen::get_welcome_page_url()
		);
	}
}