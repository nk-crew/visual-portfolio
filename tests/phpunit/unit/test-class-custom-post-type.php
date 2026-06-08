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