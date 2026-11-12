<?php
/**
 * Tests for Visual_Portfolio_Custom_Post_Type role sync.
 *
 * @package Visual Portfolio
 */

/**
 * Test case for portfolio role synchronization.
 */
class Test_Visual_Portfolio_Custom_Post_Type extends WP_UnitTestCase {
	/**
	 * Reset custom roles and capabilities before each test.
	 *
	 * @return void
	 */
	public function set_up() {
		parent::set_up();

		Visual_Portfolio_Custom_Post_Type::remove_roles_and_caps();
	}

	/**
	 * Reset custom roles and capabilities after each test.
	 *
	 * @return void
	 */
	public function tear_down() {
		Visual_Portfolio_Custom_Post_Type::remove_roles_and_caps();

		parent::tear_down();
	}

	/**
	 * Test custom roles and capabilities are synced.
	 *
	 * @return void
	 */
	public function test_sync_roles_and_caps_adds_expected_roles_and_capabilities() {
		Visual_Portfolio_Custom_Post_Type::sync_roles_and_caps( true );

		$portfolio_manager = get_role( 'portfolio_manager' );
		$portfolio_author  = get_role( 'portfolio_author' );
		$administrator     = get_role( 'administrator' );
		$editor            = get_role( 'editor' );

		$this->assertNotNull( $portfolio_manager );
		$this->assertNotNull( $portfolio_author );
		$this->assertTrue( $portfolio_manager->has_cap( 'edit_portfolios' ) );
		$this->assertTrue( $portfolio_manager->has_cap( 'edit_vp_lists' ) );
		$this->assertTrue( $portfolio_author->has_cap( 'edit_portfolios' ) );
		$this->assertFalse( $portfolio_author->has_cap( 'edit_vp_lists' ) );
		$this->assertTrue( $administrator->has_cap( 'edit_portfolios' ) );
		$this->assertTrue( $administrator->has_cap( 'edit_vp_lists' ) );
		$this->assertTrue( $editor->has_cap( 'edit_portfolios' ) );
		$this->assertFalse( $editor->has_cap( 'edit_vp_lists' ) );
	}

	/**
	 * Test disabling portfolio post type keeps manager role for Saved Layouts.
	 *
	 * @return void
	 */
	public function test_sync_roles_after_settings_update_removes_custom_roles_and_capabilities() {
		if ( visual_portfolio()->is_pro() ) {
			$this->markTestSkipped( 'Pro keeps the portfolio capabilities for its own post types.' );
		}

		Visual_Portfolio_Custom_Post_Type::sync_roles_and_caps( true );
		Visual_Portfolio_Custom_Post_Type::sync_roles_after_settings_update(
			array(
				'register_portfolio_post_type' => true,
			),
			array(
				'register_portfolio_post_type' => false,
			)
		);

		$portfolio_manager = get_role( 'portfolio_manager' );

		$this->assertNotNull( $portfolio_manager );
		$this->assertNull( get_role( 'portfolio_author' ) );
		$this->assertFalse( $portfolio_manager->has_cap( 'edit_portfolios' ) );
		$this->assertTrue( $portfolio_manager->has_cap( 'edit_vp_lists' ) );
		$this->assertFalse( get_role( 'administrator' )->has_cap( 'edit_portfolios' ) );
		$this->assertTrue( get_role( 'administrator' )->has_cap( 'edit_vp_lists' ) );
		$this->assertFalse( get_role( 'editor' )->has_cap( 'edit_portfolios' ) );
		$this->assertFalse( Visual_Portfolio_Custom_Post_Type::has_custom_roles_or_caps() );
	}

	/**
	 * With Pro active, disabling the portfolio post type keeps the
	 * administrator's and editor's portfolio capabilities.
	 *
	 * @return void
	 */
	public function test_sync_roles_after_settings_update_keeps_portfolio_capabilities_with_pro() {
		if ( ! visual_portfolio()->is_pro() ) {
			$this->markTestSkipped( 'Runs with Pro active.' );
		}

		Visual_Portfolio_Custom_Post_Type::sync_roles_and_caps( true );
		Visual_Portfolio_Custom_Post_Type::sync_roles_after_settings_update(
			array(
				'register_portfolio_post_type' => true,
			),
			array(
				'register_portfolio_post_type' => false,
			)
		);

		$this->assertTrue( get_role( 'administrator' )->has_cap( 'edit_portfolios' ) );
		$this->assertTrue( get_role( 'editor' )->has_cap( 'edit_portfolios' ) );
		$this->assertTrue( get_role( 'administrator' )->has_cap( 'edit_vp_lists' ) );
	}

	/**
	 * Pro's Social Items and Proofing use the portfolio capabilities, so with the
	 * Portfolio post type off the administrator keeps them while Pro is active
	 * and loses them on the first sync after Pro is gone.
	 *
	 * @return void
	 */
	public function test_sync_roles_without_portfolio_keeps_portfolio_capabilities_while_pro_is_active() {
		$sync = new ReflectionMethod( 'Visual_Portfolio_Custom_Post_Type', 'sync_roles_without_portfolio_post_type' );
		$sync->setAccessible( true );

		Visual_Portfolio_Custom_Post_Type::sync_roles_and_caps( true );
		$sync->invoke( null, true, true );

		$this->assertTrue( get_role( 'administrator' )->has_cap( 'edit_portfolios' ) );
		$this->assertTrue( get_role( 'editor' )->has_cap( 'edit_portfolios' ) );
		$this->assertTrue( get_role( 'portfolio_manager' )->has_cap( 'edit_portfolios' ) );
		$this->assertNotNull( get_role( 'portfolio_author' ) );

		$sync->invoke( null, false, false );

		$this->assertFalse( get_role( 'administrator' )->has_cap( 'edit_portfolios' ) );
		$this->assertFalse( get_role( 'editor' )->has_cap( 'edit_portfolios' ) );
		$this->assertNull( get_role( 'portfolio_author' ) );
		$this->assertTrue( get_role( 'administrator' )->has_cap( 'edit_vp_lists' ) );
	}

	/**
	 * Pro activated on a site that had the Portfolio post type off restores the
	 * administrator's and editor's portfolio capabilities.
	 *
	 * @return void
	 */
	public function test_sync_roles_without_portfolio_restores_portfolio_capabilities_when_pro_is_activated() {
		$sync = new ReflectionMethod( 'Visual_Portfolio_Custom_Post_Type', 'sync_roles_without_portfolio_post_type' );
		$sync->setAccessible( true );

		$sync->invoke( null, true, false );
		$this->assertFalse( get_role( 'administrator' )->has_cap( 'edit_portfolios' ) );

		$sync->invoke( null, false, true );

		$this->assertTrue( get_role( 'administrator' )->has_cap( 'edit_portfolios' ) );
		$this->assertTrue( get_role( 'editor' )->has_cap( 'edit_portfolios' ) );
		$this->assertFalse( get_role( 'editor' )->has_cap( 'edit_vp_lists' ) );
	}

	/**
	 * Test full cleanup removes Saved Layouts capabilities too.
	 *
	 * @return void
	 */
	public function test_remove_roles_and_caps_removes_all_plugin_capabilities() {
		Visual_Portfolio_Custom_Post_Type::sync_roles_and_caps( true );
		Visual_Portfolio_Custom_Post_Type::remove_roles_and_caps();

		$this->assertNull( get_role( 'portfolio_manager' ) );
		$this->assertNull( get_role( 'portfolio_author' ) );
		$this->assertFalse( get_role( 'administrator' )->has_cap( 'edit_portfolios' ) );
		$this->assertFalse( get_role( 'administrator' )->has_cap( 'edit_vp_lists' ) );
	}
}