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

	/**
	 * A background request right after activation leaves the welcome screen to
	 * the next page the user opens, which redirects once.
	 */
	public function test_the_redirect_waits_for_a_page_request() {
		$redirects = array();
		$capture   = static function ( $location ) use ( &$redirects ) {
			$redirects[] = $location;

			return false;
		};
		$screen    = new Visual_Portfolio_Welcome_Screen();

		set_transient( '_visual_portfolio_welcome_screen_activation_redirect', true, 30 );
		add_filter( 'wp_redirect', $capture );

		add_filter( 'wp_doing_ajax', '__return_true' );
		$screen->redirect_to_welcome_screen();
		remove_filter( 'wp_doing_ajax', '__return_true' );

		$this->assertSame( array(), $redirects );
		$this->assertNotFalse( get_transient( '_visual_portfolio_welcome_screen_activation_redirect' ) );

		$screen->redirect_to_welcome_screen();
		$screen->redirect_to_welcome_screen();

		remove_filter( 'wp_redirect', $capture );

		$this->assertSame( array( Visual_Portfolio_Welcome_Screen::get_welcome_page_url() ), $redirects );
	}
}