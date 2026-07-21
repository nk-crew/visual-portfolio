<?php
/**
 * Tests for Visual_Portfolio_Dashboard.
 *
 * @package Visual Portfolio
 */

/**
 * Dashboard widgets test case.
 */
class Test_Visual_Portfolio_Dashboard extends WP_UnitTestCase {
	/**
	 * Original general settings option.
	 *
	 * @var mixed
	 */
	protected $original_vp_general;

	/**
	 * Original timezone_string option.
	 *
	 * @var mixed
	 */
	protected $original_timezone_string;

	/**
	 * Original gmt_offset option.
	 *
	 * @var mixed
	 */
	protected $original_gmt_offset;

	/**
	 * Preserve option state.
	 */
	public function set_up() {
		parent::set_up();

		$this->original_vp_general       = get_option( 'vp_general' );
		$this->original_timezone_string  = get_option( 'timezone_string' );
		$this->original_gmt_offset       = get_option( 'gmt_offset' );
		Visual_Portfolio_Custom_Post_Type::remove_roles_and_caps();
		wp_set_current_user( 1 );
	}

	/**
	 * Restore option state.
	 */
	public function tear_down() {
		if ( false === $this->original_vp_general ) {
			delete_option( 'vp_general' );
		} else {
			update_option( 'vp_general', $this->original_vp_general );
		}

		update_option( 'timezone_string', $this->original_timezone_string );
		update_option( 'gmt_offset', $this->original_gmt_offset );

		Visual_Portfolio_Custom_Post_Type::remove_roles_and_caps();

		parent::tear_down();
	}

	/**
	 * Enable portfolio post type for tests.
	 *
	 * @return void
	 */
	private function enable_portfolio_post_type() {
		update_option(
			'vp_general',
			array(
				'register_portfolio_post_type' => 'on',
			)
		);

		if ( ! post_type_exists( 'portfolio' ) ) {
			$custom_post_type = new Visual_Portfolio_Custom_Post_Type();
			$custom_post_type->add_custom_post_type();
		}

		Visual_Portfolio_Custom_Post_Type::sync_roles_and_caps( true );
		wp_set_current_user( 0 );
		wp_set_current_user( 1 );
	}

	/**
	 * Dashboard widgets are hidden when portfolio post type is disabled.
	 */
	public function test_should_show_portfolio_dashboard_widgets_returns_false_when_post_type_disabled() {
		update_option(
			'vp_general',
			array(
				'register_portfolio_post_type' => 'off',
			)
		);

		$this->assertFalse( Visual_Portfolio_Dashboard::should_show_portfolio_dashboard_widgets() );
	}

	/**
	 * Dashboard widgets are available for users who can edit portfolios.
	 */
	public function test_should_show_portfolio_dashboard_widgets_returns_true_for_administrator() {
		$this->enable_portfolio_post_type();

		$this->assertTrue( Visual_Portfolio_Dashboard::should_show_portfolio_dashboard_widgets() );
	}

	/**
	 * Portfolio count is added to the At a Glance widget.
	 */
	public function test_add_portfolio_glance_item_includes_published_count() {
		$this->enable_portfolio_post_type();

		$this->factory->post->create(
			array(
				'post_type'   => 'portfolio',
				'post_status' => 'publish',
				'post_title'  => 'Published Portfolio',
			)
		);

		$this->factory->post->create(
			array(
				'post_type'   => 'portfolio',
				'post_status' => 'draft',
				'post_title'  => 'Draft Portfolio',
			)
		);

		$dashboard = new Visual_Portfolio_Dashboard();

		$items = $dashboard->add_portfolio_glance_item( array() );

		$this->assertCount( 1, $items );
		$this->assertStringContainsString( 'portfolio-count', $items[0] );
		$this->assertStringContainsString( 'edit.php?post_type=portfolio', $items[0] );
		$this->assertStringContainsString( '1', $items[0] );
	}

	/**
	 * Portfolio activity widget lists published items only, with Activity-style footer.
	 *
	 * Footer "All" matches the portfolio list screen (includes private/future, excludes trash).
	 */
	public function test_render_recent_portfolio_activity_widget_outputs_recent_items() {
		$this->enable_portfolio_post_type();

		$older_post_id = $this->factory->post->create(
			array(
				'post_type'   => 'portfolio',
				'post_status' => 'publish',
				'post_title'  => 'Older Portfolio',
				'post_date'   => '2026-03-01 10:00:00',
			)
		);

		$newer_post_id = $this->factory->post->create(
			array(
				'post_type'   => 'portfolio',
				'post_status' => 'publish',
				'post_title'  => 'Newer Portfolio',
				'post_date'   => '2026-03-10 10:00:00',
			)
		);

		$this->factory->post->create(
			array(
				'post_type'   => 'portfolio',
				'post_status' => 'draft',
				'post_title'  => 'Draft Portfolio',
				'post_date'   => '2026-03-15 10:00:00',
			)
		);

		$this->factory->post->create(
			array(
				'post_type'   => 'portfolio',
				'post_status' => 'private',
				'post_title'  => 'Private Portfolio',
				'post_date'   => '2026-03-12 10:00:00',
			)
		);

		$this->factory->post->create(
			array(
				'post_type'   => 'portfolio',
				'post_status' => 'future',
				'post_title'  => 'Scheduled Portfolio',
				'post_date'   => '2030-03-20 10:00:00',
			)
		);

		$this->factory->post->create(
			array(
				'post_type'   => 'portfolio',
				'post_status' => 'trash',
				'post_title'  => 'Trashed Portfolio',
				'post_date'   => '2026-03-05 10:00:00',
			)
		);

		$dashboard = new Visual_Portfolio_Dashboard();

		set_current_screen( 'dashboard' );

		ob_start();
		$dashboard->render_recent_portfolio_activity_widget();
		$output = ob_get_clean();

		$this->assertStringContainsString( 'vpf-dashboard-activity-title', $output );
		$this->assertStringContainsString( 'vpf-dashboard-activity-date', $output );
		$this->assertStringContainsString( 'vpf-dashboard-activity-thumb', $output );
		$this->assertStringContainsString( 'vp-portfolio__thumbnail', $output );

		$this->assertStringContainsString( 'Newer Portfolio', $output );
		$this->assertStringContainsString( 'Older Portfolio', $output );
		$this->assertStringNotContainsString( 'Draft Portfolio', $output );
		$this->assertStringNotContainsString( 'post-state', $output );
		$this->assertStringNotContainsString( 'post-new.php?post_type=portfolio', $output );

		$this->assertStringContainsString( 'post.php?post=' . $newer_post_id, $output );
		$this->assertStringContainsString( 'post.php?post=' . $older_post_id, $output );

		$newer_pos = strpos( $output, 'Newer Portfolio' );
		$older_pos = strpos( $output, 'Older Portfolio' );

		$this->assertNotFalse( $newer_pos );
		$this->assertNotFalse( $older_pos );
		$this->assertLessThan( $older_pos, $newer_pos );

		$this->assertStringContainsString( 'subsubsub', $output );
		$this->assertStringContainsString( 'vpf-dashboard-widget-footer', $output );
		// All matches list screen: publish + draft + private + future (excludes trash).
		$this->assertStringContainsString( 'All <span class="count">(5)</span>', $output );
		$this->assertStringContainsString( 'Published <span class="count">(2)</span>', $output );
		$this->assertStringContainsString( 'Drafts <span class="count">(1)</span>', $output );
		$this->assertStringContainsString( 'post_status=publish', $output );
		$this->assertStringContainsString( 'post_status=draft', $output );
	}

	/**
	 * Activity date "Today" uses site timezone, not UTC calendar day.
	 *
	 * On America/New_York, a local evening publish falls on the next UTC day;
	 * comparing current_time()/wp_date() to gmdate() on a true Unix timestamp
	 * would miss "Today".
	 */
	public function test_get_portfolio_activity_date_label_today_uses_site_timezone() {
		$this->enable_portfolio_post_type();

		update_option( 'timezone_string', 'America/New_York' );
		update_option( 'gmt_offset', '0' );

		$today_local = wp_date( 'Y-m-d' );
		$post_id     = $this->factory->post->create(
			array(
				'post_type'   => 'portfolio',
				'post_status' => 'publish',
				'post_title'  => 'Late Local Portfolio',
				'post_date'   => $today_local . ' 23:30:00',
			)
		);

		$post      = get_post( $post_id );
		$timestamp = get_post_time( 'U', true, $post );

		// Preconditions: UTC day differs from site-local day.
		$this->assertNotSame( gmdate( 'Y-m-d', $timestamp ), $today_local );
		$this->assertSame( $today_local, wp_date( 'Y-m-d', $timestamp ) );

		$dashboard = new Visual_Portfolio_Dashboard();
		$method    = new ReflectionMethod( Visual_Portfolio_Dashboard::class, 'get_portfolio_activity_date_label' );
		$method->setAccessible( true );

		$this->assertSame( __( 'Today', 'visual-portfolio' ), $method->invoke( $dashboard, $post ) );
	}

	/**
	 * Activity year branch uses site timezone year, not UTC year.
	 */
	public function test_get_portfolio_activity_date_label_year_uses_site_timezone() {
		$this->enable_portfolio_post_type();

		update_option( 'timezone_string', 'America/New_York' );
		update_option( 'gmt_offset', '0' );

		// Dec 31 evening ET is already Jan 1 UTC — site year must win over gmdate year.
		$post_id = $this->factory->post->create(
			array(
				'post_type'   => 'portfolio',
				'post_status' => 'publish',
				'post_title'  => 'New Year Eve Portfolio',
				'post_date'   => '2025-12-31 23:30:00',
			)
		);

		$post      = get_post( $post_id );
		$timestamp = get_post_time( 'U', true, $post );

		$this->assertSame( '2026', gmdate( 'Y', $timestamp ) );
		$this->assertSame( '2025', wp_date( 'Y', $timestamp ) );

		$dashboard = new Visual_Portfolio_Dashboard();
		$method    = new ReflectionMethod( Visual_Portfolio_Dashboard::class, 'get_portfolio_activity_date_label' );
		$method->setAccessible( true );

		$label = $method->invoke( $dashboard, $post );

		$this->assertStringContainsString( '2025', $label );
		$this->assertStringNotContainsString( 'Today', $label );
	}

	/**
	 * Early local morning stays on the site calendar day (no double timezone shift).
	 */
	public function test_get_portfolio_activity_date_label_early_morning_keeps_site_day() {
		$this->enable_portfolio_post_type();

		update_option( 'timezone_string', 'America/New_York' );
		update_option( 'gmt_offset', '0' );

		$post_id = $this->factory->post->create(
			array(
				'post_type'   => 'portfolio',
				'post_status' => 'publish',
				'post_title'  => 'Early Local Portfolio',
				'post_date'   => '2026-03-10 01:00:00',
			)
		);

		$post      = get_post( $post_id );
		$dashboard = new Visual_Portfolio_Dashboard();
		$method    = new ReflectionMethod( Visual_Portfolio_Dashboard::class, 'get_portfolio_activity_date_label' );
		$method->setAccessible( true );

		$label = $method->invoke( $dashboard, $post );

		$this->assertSame( wp_date( __( 'M jS', 'visual-portfolio' ), get_post_time( 'U', true, $post ) ), $label );
		$this->assertStringContainsString( '10', $label );
	}
}
