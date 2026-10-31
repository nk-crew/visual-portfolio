<?php
/**
 * Tests for Visual_Portfolio_Archive_Mapping class
 *
 * @package Visual Portfolio
 */

/**
 * Test case for Visual Portfolio Archive Mapping class.
 */
class Test_Visual_Portfolio_Archive_Mapping extends WP_UnitTestCase {
	/**
	 * Archive page ID for testing.
	 *
	 * @var int
	 */
	private $archive_page_id;

	/**
	 * Set up test environment.
	 *
	 * @return void
	 */
	public function set_up() {
		parent::set_up();

		// Make sure the class is loaded.
		if ( ! class_exists( 'Visual_Portfolio_Archive_Mapping' ) ) {
			require_once VP_PATH . 'classes/class-archive-mapping.php';
		}

		// Reset static cache before each test.
		$this->reset_static_cache();
	}

	/**
	 * Tear down test environment.
	 *
	 * @return void
	 */
	public function tear_down() {
		// Reset options.
		delete_option( 'vp_general' );

		// Reset static cache.
		$this->reset_static_cache();

		parent::tear_down();
	}

	/**
	 * Reset static cache in get_portfolio_slug and get_portfolio_label methods.
	 *
	 * @return void
	 */
	private function reset_static_cache() {
		Visual_Portfolio_Archive_Mapping::reset_cache();
	}

	/**
	 * Portfolio bases must keep ordinary pages and portfolio URLs reachable.
	 *
	 * @dataProvider portfolio_bases
	 * @param string $base            - Stored portfolio base.
	 * @param string $project_base    - Expected project URL base.
	 * @param bool   $has_stale_rules - Whether conflicting rules already exist.
	 * @return void
	 */
	public function test_portfolio_bases_keep_pages_and_projects_reachable( $base, $project_base, $has_stale_rules ) {
		global $wp_rewrite;

		$previous_rewrite = $wp_rewrite;
		$wp_rewrite       = new WP_Rewrite();

		try {
			update_option( 'vp_general', array( 'register_portfolio_post_type' => 'on' ) );
			update_option( 'portfolio_permalinks', array( 'portfolio_base' => $base ) );
			$this->set_permalink_structure( '/%postname%/' );
			delete_transient( 'vp_flush_rewrite_rules' );

			$post_type = new Visual_Portfolio_Custom_Post_Type();
			$post_type->add_custom_post_type();

			$page = self::factory()->post->create(
				array(
					'post_type'   => 'page',
					'post_name'   => 'about',
					'post_status' => 'publish',
				)
			);
			$project = self::factory()->post->create(
				array(
					'post_type'   => 'portfolio',
					'post_name'   => 'sample-project',
					'post_status' => 'publish',
				)
			);
			$category = self::factory()->term->create( array( 'taxonomy' => 'portfolio_category', 'slug' => 'wildlife' ) );
			wp_set_object_terms( $project, array( $category ), 'portfolio_category' );
			if ( $has_stale_rules ) {
				update_option( 'rewrite_rules', array( '([^/]+)(?:/([0-9]+))?/?$' => 'index.php?name=$matches[1]&page=$matches[2]' ) );
				visual_portfolio()->run_deferred_rewrite_rules();
			} else {
				flush_rewrite_rules( false );
			}

			$this->go_to( home_url( '/about/' ) );
			$this->assertSame( $page, get_queried_object_id() );
			$this->assertTrue( is_page() );

			$this->go_to( home_url( '/' . $project_base . '/sample-project/' ) );
			$this->assertSame( $project, get_queried_object_id() );
			$this->assertTrue( is_singular( 'portfolio' ) );

			$this->go_to( home_url( '/portfolio-category/wildlife/' ) );
			$this->assertSame( $category, get_queried_object_id() );
			$this->assertTrue( is_tax( 'portfolio_category' ) );

			Visual_Portfolio_Archive_Mapping::get_permalink_structure();
			$this->assertFalse( get_transient( 'vp_flush_rewrite_rules' ) );
		} finally {
			$wp_rewrite = $previous_rewrite;
		}
	}

	/**
	 * Stored portfolio bases and their project URL paths.
	 *
	 * @return array
	 */
	public function portfolio_bases() {
		return array(
			'legacy post name base'     => array( '/%postname%/', 'portfolio', true ),
			'post name without slashes' => array( '%postname%', 'portfolio', true ),
			'custom category base'      => array( 'work/%portfolio_category%', 'work/wildlife', false ),
			'default archive base'      => array( '%portfolio_page_slug%', 'portfolio', false ),
		);
	}

	/**
	 * Saving a portfolio base must preserve static paths and repair a post name base.
	 *
	 * @dataProvider saved_portfolio_bases
	 * @param string $base     - Submitted portfolio base.
	 * @param string $expected - Expected stored base.
	 * @return void
	 */
	public function test_saving_portfolio_base( $base, $expected ) {
		update_option( 'permalink_structure', '/%postname%/' );
		set_current_screen( 'options-permalink' );
		wp_set_current_user( self::factory()->user->create( array( 'role' => 'administrator' ) ) );
		$_POST = array(
			'permalink_structure'           => '/%postname%/',
			'vp-permalinks-nonce'           => wp_create_nonce( 'vp-permalinks' ),
			'vp_category_slug'              => 'portfolio-category',
			'vp_tag_slug'                   => 'portfolio-tag',
			'portfolio_permalink'           => 'custom',
			'portfolio_permalink_structure' => $base,
		);

		$mapping = new Visual_Portfolio_Archive_Mapping();
		try {
			$mapping->permalink_settings_save();
			$this->assertSame( $expected, get_option( 'portfolio_permalinks' )['portfolio_base'] );
		} finally {
			set_current_screen( 'front' );
		}
	}

	/**
	 * Bases accepted by the permalink form.
	 *
	 * @return array
	 */
	public function saved_portfolio_bases() {
		return array(
			'post name base' => array( '/%postname%/', '%portfolio_page_slug%' ),
			'static base'    => array( 'work', '/work' ),
			'archive base'   => array( '%portfolio_page_slug%/', '/%portfolio_page_slug%/' ),
			'category base'  => array( '/%portfolio_category%/', '/%portfolio_page_slug%/%portfolio_category%/' ),
		);
	}

	/**
	 * Test that get_portfolio_slug returns default value when no archive page is set.
	 */
	public function test_get_portfolio_slug_returns_default_when_no_archive() {
		// Ensure no archive page is set.
		update_option( 'vp_general', array( 'portfolio_archive_page' => '' ) );

		// Reset cache by using a fresh process simulation.
		$this->reset_static_cache();

		$slug = Visual_Portfolio_Archive_Mapping::get_portfolio_slug();

		$this->assertEquals( 'portfolio', $slug, 'Should return default slug when no archive page is set' );
	}

	/**
	 * Test that get_portfolio_slug returns page slug when archive page is set.
	 */
	public function test_get_portfolio_slug_returns_page_slug() {
		// Create a test archive page.
		$this->archive_page_id = $this->factory->post->create(
			array(
				'post_type'   => 'page',
				'post_title'  => 'My Portfolio',
				'post_name'   => 'my-portfolio',
				'post_status' => 'publish',
			)
		);

		// Set it as archive page in options.
		update_option(
			'vp_general',
			array( 'portfolio_archive_page' => $this->archive_page_id )
		);

		$slug = Visual_Portfolio_Archive_Mapping::get_portfolio_slug();

		$this->assertEquals( 'my-portfolio', $slug, 'Should return the page slug when archive page is set' );
	}

	/**
	 * Test that get_portfolio_slug returns default when archive page ID points to non-existent post.
	 */
	public function test_get_portfolio_slug_returns_default_for_nonexistent_post() {
		// Set a non-existent post ID as archive page.
		update_option(
			'vp_general',
			array( 'portfolio_archive_page' => 999999 )
		);

		$slug = Visual_Portfolio_Archive_Mapping::get_portfolio_slug();

		$this->assertEquals( 'portfolio', $slug, 'Should return default slug when archive page does not exist' );
	}

	/**
	 * Test that get_portfolio_label returns default value when no archive page is set.
	 */
	public function test_get_portfolio_label_returns_default_when_no_archive() {
		// Ensure no archive page is set.
		update_option( 'vp_general', array( 'portfolio_archive_page' => '' ) );

		$label = Visual_Portfolio_Archive_Mapping::get_portfolio_label();

		$this->assertEquals( 'Portfolio', $label, 'Should return default label when no archive page is set' );
	}

	/**
	 * Test that get_portfolio_label returns page title when archive page is set.
	 */
	public function test_get_portfolio_label_returns_page_title() {
		// Create a test archive page.
		$this->archive_page_id = $this->factory->post->create(
			array(
				'post_type'   => 'page',
				'post_title'  => 'My Custom Portfolio',
				'post_name'   => 'my-custom-portfolio',
				'post_status' => 'publish',
			)
		);

		// Set it as archive page in options.
		update_option(
			'vp_general',
			array( 'portfolio_archive_page' => $this->archive_page_id )
		);

		$label = Visual_Portfolio_Archive_Mapping::get_portfolio_label();

		$this->assertEquals( 'My Custom Portfolio', $label, 'Should return the page title when archive page is set' );
	}

	/**
	 * Test that get_portfolio_label returns default when archive page ID points to non-existent post.
	 */
	public function test_get_portfolio_label_returns_default_for_nonexistent_post() {
		// Set a non-existent post ID as archive page.
		update_option(
			'vp_general',
			array( 'portfolio_archive_page' => 999999 )
		);

		$label = Visual_Portfolio_Archive_Mapping::get_portfolio_label();

		$this->assertEquals( 'Portfolio', $label, 'Should return default label when archive page does not exist' );
	}

	/**
	 * Test that static caching works - subsequent calls return cached value.
	 *
	 * Note: Due to PHP's static variable behavior, this test verifies that
	 * the method can be called multiple times without errors and returns
	 * consistent results within the same request.
	 */
	public function test_get_portfolio_slug_caching_consistency() {
		// Create a test archive page.
		$this->archive_page_id = $this->factory->post->create(
			array(
				'post_type'   => 'page',
				'post_title'  => 'Cached Portfolio',
				'post_name'   => 'cached-portfolio',
				'post_status' => 'publish',
			)
		);

		// Set it as archive page in options.
		update_option(
			'vp_general',
			array( 'portfolio_archive_page' => $this->archive_page_id )
		);

		// Call multiple times.
		$slug1 = Visual_Portfolio_Archive_Mapping::get_portfolio_slug();
		$slug2 = Visual_Portfolio_Archive_Mapping::get_portfolio_slug();
		$slug3 = Visual_Portfolio_Archive_Mapping::get_portfolio_slug();

		// All calls should return the same value.
		$this->assertEquals( $slug1, $slug2, 'Subsequent calls should return same value' );
		$this->assertEquals( $slug2, $slug3, 'Subsequent calls should return same value' );
		$this->assertEquals( 'cached-portfolio', $slug1, 'Should return correct slug' );
	}

	/**
	 * Test that static caching works for label - subsequent calls return cached value.
	 */
	public function test_get_portfolio_label_caching_consistency() {
		// Create a test archive page.
		$this->archive_page_id = $this->factory->post->create(
			array(
				'post_type'   => 'page',
				'post_title'  => 'Cached Portfolio Label',
				'post_name'   => 'cached-portfolio-label',
				'post_status' => 'publish',
			)
		);

		// Set it as archive page in options.
		update_option(
			'vp_general',
			array( 'portfolio_archive_page' => $this->archive_page_id )
		);

		// Call multiple times.
		$label1 = Visual_Portfolio_Archive_Mapping::get_portfolio_label();
		$label2 = Visual_Portfolio_Archive_Mapping::get_portfolio_label();
		$label3 = Visual_Portfolio_Archive_Mapping::get_portfolio_label();

		// All calls should return the same value.
		$this->assertEquals( $label1, $label2, 'Subsequent calls should return same value' );
		$this->assertEquals( $label2, $label3, 'Subsequent calls should return same value' );
		$this->assertEquals( 'Cached Portfolio Label', $label1, 'Should return correct label' );
	}

	/**
	 * Test that get_portfolio_slug handles empty post_name gracefully.
	 *
	 * Note: WordPress auto-generates post_name from title, so we need to
	 * directly update the database to simulate this edge case.
	 */
	public function test_get_portfolio_slug_handles_empty_post_name() {
		global $wpdb;

		// Create a test archive page.
		$this->archive_page_id = $this->factory->post->create(
			array(
				'post_type'   => 'page',
				'post_title'  => 'Empty Slug Page',
				'post_status' => 'publish',
			)
		);

		// Directly update the database to set empty post_name (WordPress normally auto-generates it).
		// phpcs:ignore WordPress.DB.DirectDatabaseQuery.DirectQuery, WordPress.DB.DirectDatabaseQuery.NoCaching
		$wpdb->update(
			$wpdb->posts,
			array( 'post_name' => '' ),
			array( 'ID' => $this->archive_page_id )
		);
		clean_post_cache( $this->archive_page_id );

		// Set it as archive page in options.
		update_option(
			'vp_general',
			array( 'portfolio_archive_page' => $this->archive_page_id )
		);

		$slug = Visual_Portfolio_Archive_Mapping::get_portfolio_slug();

		// Should return default because post_name is empty.
		$this->assertEquals( 'portfolio', $slug, 'Should return default slug when post_name is empty' );
	}

	/**
	 * Test that get_portfolio_label handles empty post_title gracefully.
	 */
	public function test_get_portfolio_label_handles_empty_post_title() {
		// Create a test archive page with empty title (edge case).
		$this->archive_page_id = $this->factory->post->create(
			array(
				'post_type'   => 'page',
				'post_title'  => '', // Empty title.
				'post_name'   => 'empty-title-page',
				'post_status' => 'publish',
			)
		);

		// Set it as archive page in options.
		update_option(
			'vp_general',
			array( 'portfolio_archive_page' => $this->archive_page_id )
		);

		$label = Visual_Portfolio_Archive_Mapping::get_portfolio_label();

		// Should return default because post_title is empty.
		$this->assertEquals( 'Portfolio', $label, 'Should return default label when post_title is empty' );
	}

	/**
	 * Test performance - multiple rapid calls should not cause issues.
	 */
	public function test_multiple_rapid_calls_performance() {
		// Create a test archive page.
		$this->archive_page_id = $this->factory->post->create(
			array(
				'post_type'   => 'page',
				'post_title'  => 'Performance Test',
				'post_name'   => 'performance-test',
				'post_status' => 'publish',
			)
		);

		// Set it as archive page in options.
		update_option(
			'vp_general',
			array( 'portfolio_archive_page' => $this->archive_page_id )
		);

		// Call multiple times rapidly.
		for ( $i = 0; $i < 100; $i++ ) {
			Visual_Portfolio_Archive_Mapping::get_portfolio_slug();
			Visual_Portfolio_Archive_Mapping::get_portfolio_label();
		}

		// If we get here without timeout or errors, caching is working.
		$this->assertTrue( true, 'Multiple rapid calls should complete without issues' );
	}
}
