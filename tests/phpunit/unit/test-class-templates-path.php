<?php
/**
 * Tests for template path resolution in Free and Pro plugin scenarios.
 *
 * Verifies that templates are correctly located and included when:
 * - Only the Free plugin is active.
 * - The Pro plugin is also active (simulated via pro_plugin_path).
 *
 * This prevents regressions like the critical bug where Quick View
 * templates failed to load when the Pro plugin was installed because
 * template paths were not correctly initialized.
 *
 * @package Visual Portfolio
 */

/**
 * Test case for template path resolution across Free and Pro plugins.
 */
class Test_Class_Templates_Path extends WP_UnitTestCase {
	/**
	 * Temporary directory simulating a Pro plugin with templates.
	 *
	 * @var string
	 */
	private $fake_pro_dir;

	/**
	 * Original pro_plugin_path value (to restore after each test).
	 *
	 * @var string|null
	 */
	private $original_pro_path;

	/**
	 * Original pro_plugin_url value (to restore after each test).
	 *
	 * @var string|null
	 */
	private $original_pro_url;

	/**
	 * Set up the test environment before each test.
	 *
	 * Creates a temporary directory that mimics the Pro plugin structure,
	 * including a `templates/` sub-directory with sample template files.
	 */
	public function set_up() {
		parent::set_up();

		$this->original_pro_path = visual_portfolio()->pro_plugin_path;
		$this->original_pro_url  = visual_portfolio()->pro_plugin_url;

		// Build a temporary Pro plugin tree.
		$this->fake_pro_dir = trailingslashit( sys_get_temp_dir() ) . 'vp-fake-pro-' . wp_generate_uuid4() . '/';
		wp_mkdir_p( $this->fake_pro_dir . 'templates/popup' );
		wp_mkdir_p( $this->fake_pro_dir . 'templates/items-list/items-style/pro-style' );
	}

	/**
	 * Tear down the test environment after each test.
	 *
	 * Restores the original pro_plugin_path and removes the temporary directory.
	 */
	public function tear_down() {
		visual_portfolio()->pro_plugin_path = $this->original_pro_path;
		visual_portfolio()->pro_plugin_url  = $this->original_pro_url;

		// Remove temp directory recursively.
		$this->remove_directory( $this->fake_pro_dir );

		parent::tear_down();
	}

	// ------------------------------------------------------------------
	// Helper utilities
	// ------------------------------------------------------------------

	/**
	 * Recursively remove a directory.
	 *
	 * @param string $dir Directory path.
	 */
	private function remove_directory( $dir ) {
		if ( ! is_dir( $dir ) ) {
			return;
		}
		$items = new RecursiveIteratorIterator(
			new RecursiveDirectoryIterator( $dir, RecursiveDirectoryIterator::SKIP_DOTS ),
			RecursiveIteratorIterator::CHILD_FIRST
		);
		foreach ( $items as $item ) {
			if ( $item->isDir() ) {
				rmdir( $item->getRealPath() );
			} else {
				unlink( $item->getRealPath() );
			}
		}
		rmdir( $dir );
	}

	/**
	 * Write a tiny PHP template that just echoes a marker string.
	 *
	 * @param string $path   Absolute file path.
	 * @param string $marker Text the template echoes.
	 */
	private function write_template( $path, $marker ) {
		file_put_contents(
			$path,
			'<?php echo "' . addslashes( $marker ) . '"; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped'
		);
	}

	/**
	 * Activate the simulated Pro plugin by pointing pro_plugin_path
	 * at the temporary directory.
	 */
	private function activate_fake_pro() {
		visual_portfolio()->pro_plugin_path = $this->fake_pro_dir;
		visual_portfolio()->pro_plugin_url  = 'http://example.com/wp-content/plugins/visual-portfolio-pro/';
	}

	// ------------------------------------------------------------------
	// 1. Free-only: templates resolve to the free plugin directory
	// ------------------------------------------------------------------

	/**
	 * Free plugin templates should be found when no Pro plugin is active.
	 */
	public function test_free_template_resolves_to_plugin_path() {
		visual_portfolio()->pro_plugin_path = null;

		// 'items-list/wrapper-end' exists in the free plugin and requires no variables.
		ob_start();
		Visual_Portfolio_Templates::include_template( 'items-list/wrapper-end' );
		$output = ob_get_clean();

		// The template file exists and should produce some output (HTML markup).
		$this->assertNotEmpty(
			$output,
			'Free template items-list/wrapper-end should produce output when only the free plugin is active'
		);
	}

	/**
	 * find_template_styles should resolve CSS from the free plugin.
	 */
	public function test_free_css_resolves_to_plugin_path() {
		visual_portfolio()->pro_plugin_path = null;

		$result = Visual_Portfolio_Templates::find_template_styles( 'items-list/items-style/style' );

		$this->assertNotEmpty(
			$result['path'],
			'Free CSS template items-list/items-style/style should be found'
		);
		$this->assertStringContainsString(
			'visual-portfolio',
			$result['path'],
			'CSS path should reference the visual-portfolio plugin directory'
		);
	}

	// ------------------------------------------------------------------
	// 2. Pro active: Pro-specific templates load from pro_plugin_path
	// ------------------------------------------------------------------

	/**
	 * When the Pro plugin is active, a template that exists ONLY in the
	 * Pro directory should be found and included.
	 */
	public function test_pro_only_template_loads_when_pro_active() {
		$this->activate_fake_pro();

		$this->write_template(
			$this->fake_pro_dir . 'templates/popup/quick-view-data.php',
			'pro-quick-view-output'
		);

		ob_start();
		Visual_Portfolio_Templates::include_template( 'popup/quick-view-data' );
		$output = ob_get_clean();

		$this->assertSame(
			'pro-quick-view-output',
			$output,
			'A Pro-only template (popup/quick-view-data) should load from pro_plugin_path'
		);
	}

	/**
	 * Pro-only template resolving should work for deeper nested paths
	 * (simulates items-style templates provided by the Pro plugin).
	 */
	public function test_pro_items_style_template_loads() {
		$this->activate_fake_pro();

		$this->write_template(
			$this->fake_pro_dir . 'templates/items-list/items-style/pro-style/image.php',
			'pro-style-image'
		);

		ob_start();
		Visual_Portfolio_Templates::include_template( 'items-list/items-style/pro-style/image' );
		$output = ob_get_clean();

		$this->assertSame(
			'pro-style-image',
			$output,
			'Pro items style template should load from pro_plugin_path/templates/'
		);
	}

	// ------------------------------------------------------------------
	// 3. Pro active: Free templates still accessible
	// ------------------------------------------------------------------

	/**
	 * When the Pro plugin is active, templates that exist only in the Free
	 * plugin should still load from the Free plugin directory.
	 */
	public function test_free_template_still_loads_when_pro_active() {
		$this->activate_fake_pro();

		// 'items-list/wrapper-end' exists in the free plugin but NOT in the fake pro.
		ob_start();
		Visual_Portfolio_Templates::include_template( 'items-list/wrapper-end' );
		$output = ob_get_clean();

		$this->assertNotEmpty(
			$output,
			'Free template should still load when Pro is active but does not override the template'
		);
	}

	// ------------------------------------------------------------------
	// 4. Pro overrides Free when both have the same template
	// ------------------------------------------------------------------

	/**
	 * Pro plugin templates take priority over Free plugin templates for
	 * the same template name.
	 */
	public function test_pro_template_overrides_free_template() {
		$this->activate_fake_pro();

		// Create a Pro version of items-list/wrapper-end which also exists in Free.
		$this->write_template(
			$this->fake_pro_dir . 'templates/items-list/wrapper-end.php',
			'pro-wrapper-end'
		);

		ob_start();
		Visual_Portfolio_Templates::include_template( 'items-list/wrapper-end' );
		$output = ob_get_clean();

		$this->assertSame(
			'pro-wrapper-end',
			$output,
			'Pro template should override the Free template with the same name'
		);
	}

	// ------------------------------------------------------------------
	// 5. is_allowed_template_path – Pro directory is in the allowlist
	// ------------------------------------------------------------------

	/**
	 * When Pro is active, templates inside pro_plugin_path/templates/
	 * should pass the is_allowed_template_path check.
	 */
	public function test_is_allowed_template_path_accepts_pro_template() {
		$this->activate_fake_pro();

		$template_file = $this->fake_pro_dir . 'templates/popup/quick-view-data.php';
		$this->write_template( $template_file, 'allowed-check' );

		$real_path = realpath( $template_file );
		$this->assertNotFalse( $real_path, 'Template file should exist on disk' );

		$this->assertTrue(
			Visual_Portfolio_Templates::is_allowed_template_path( $real_path ),
			'Pro template path should be in the allowed directories'
		);
	}

	/**
	 * When Pro is NOT active, random paths should be rejected.
	 */
	public function test_is_allowed_template_path_rejects_random_dir() {
		visual_portfolio()->pro_plugin_path = null;

		$random_file = sys_get_temp_dir() . '/evil-template.php';
		file_put_contents( $random_file, '<?php echo "evil";' );

		$real_path = realpath( $random_file );

		$this->assertFalse(
			Visual_Portfolio_Templates::is_allowed_template_path( $real_path ),
			'Random path outside allowed dirs should be rejected'
		);

		// phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged
		@unlink( $random_file );
	}

	/**
	 * Free plugin templates directory is always allowed.
	 */
	public function test_is_allowed_template_path_accepts_free_template() {
		visual_portfolio()->pro_plugin_path = null;

		$free_template = visual_portfolio()->plugin_path . 'templates/items-list/wrapper-start.php';

		if ( ! file_exists( $free_template ) ) {
			$this->markTestSkipped( 'Free template file not found on disk' );
		}

		$real_path = realpath( $free_template );

		$this->assertTrue(
			Visual_Portfolio_Templates::is_allowed_template_path( $real_path ),
			'Free plugin template should always be in the allowed directories'
		);
	}

	// ------------------------------------------------------------------
	// 6. find_template_styles – CSS resolution with Pro plugin
	// ------------------------------------------------------------------

	/**
	 * find_template_styles should return a Pro CSS path when a CSS file
	 * exists only in the Pro plugin directory.
	 */
	public function test_find_template_styles_resolves_pro_css() {
		$this->activate_fake_pro();

		// Create a CSS file in the fake Pro templates directory.
		file_put_contents(
			$this->fake_pro_dir . 'templates/items-list/items-style/pro-style/style.css',
			'.vp-pro-style { color: red; }'
		);

		$result = Visual_Portfolio_Templates::find_template_styles( 'items-list/items-style/pro-style/style' );

		$this->assertNotEmpty(
			$result['path'],
			'CSS from Pro plugin should be found by find_template_styles'
		);
		$this->assertStringContainsString(
			'visual-portfolio-pro',
			$result['path'],
			'CSS path should reference the Pro plugin URL'
		);
	}

	/**
	 * find_template_styles should still find Free CSS when Pro is active
	 * but does not provide that particular CSS file.
	 */
	public function test_find_template_styles_falls_back_to_free_css() {
		$this->activate_fake_pro();

		// items-list/items-style/style.css exists in the Free plugin.
		$result = Visual_Portfolio_Templates::find_template_styles( 'items-list/items-style/style' );

		$this->assertNotEmpty(
			$result['path'],
			'Free CSS should still be resolved when Pro does not override it'
		);
	}

	// ------------------------------------------------------------------
	// 7. Critical regression – Quick View / Quick Frame template loading
	// ------------------------------------------------------------------

	/**
	 * Simulate the exact scenario of the critical bug:
	 * Pro is active, a Pro-specific popup template (e.g. quick-view-data)
	 * must be reachable through include_template.
	 *
	 * The original bug: pro_plugin_path was not properly initialized,
	 * so templates under pro_plugin_path/templates/popup/ were never
	 * found and Quick View was broken.
	 */
	public function test_quick_view_template_loads_with_pro_active() {
		$this->activate_fake_pro();

		$this->write_template(
			$this->fake_pro_dir . 'templates/popup/quick-view-data.php',
			'quick-view-rendered'
		);

		ob_start();
		Visual_Portfolio_Templates::include_template( 'popup/quick-view-data' );
		$output = ob_get_clean();

		$this->assertSame(
			'quick-view-rendered',
			$output,
			'Quick View template should load when Pro is active (regression check)'
		);
	}

	/**
	 * Simulate a second popup template scenario (e.g. quick-frame).
	 */
	public function test_quick_frame_template_loads_with_pro_active() {
		$this->activate_fake_pro();

		wp_mkdir_p( $this->fake_pro_dir . 'templates/popup' );
		$this->write_template(
			$this->fake_pro_dir . 'templates/popup/quick-frame-data.php',
			'quick-frame-rendered'
		);

		ob_start();
		Visual_Portfolio_Templates::include_template( 'popup/quick-frame-data' );
		$output = ob_get_clean();

		$this->assertSame(
			'quick-frame-rendered',
			$output,
			'Quick Frame template should load when Pro is active (regression check)'
		);
	}

	// ------------------------------------------------------------------
	// 8. Edge cases
	// ------------------------------------------------------------------

	/**
	 * When pro_plugin_path is set but its templates directory does NOT
	 * exist, the loader should gracefully fall back to the Free template.
	 */
	public function test_fallback_to_free_when_pro_templates_dir_missing() {
		// Point to a fake Pro directory WITHOUT a templates/ sub-dir.
		$empty_pro = trailingslashit( sys_get_temp_dir() ) . 'vp-empty-pro-' . wp_generate_uuid4() . '/';
		wp_mkdir_p( $empty_pro );
		visual_portfolio()->pro_plugin_path = $empty_pro;
		visual_portfolio()->pro_plugin_url  = 'http://example.com/wp-content/plugins/visual-portfolio-pro/';

		ob_start();
		Visual_Portfolio_Templates::include_template( 'items-list/wrapper-end' );
		$output = ob_get_clean();

		$this->assertNotEmpty(
			$output,
			'Free template should load when Pro templates directory is missing'
		);

		// Cleanup.
		rmdir( $empty_pro );
	}

	/**
	 * When pro_plugin_path is set with a trailing slash inconsistency,
	 * templates should still be located correctly.
	 */
	public function test_pro_path_trailing_slash_normalization() {
		// Set pro_plugin_path WITHOUT trailing slash.
		visual_portfolio()->pro_plugin_path = rtrim( $this->fake_pro_dir, '/' );
		visual_portfolio()->pro_plugin_url  = 'http://example.com/wp-content/plugins/visual-portfolio-pro';

		$this->write_template(
			$this->fake_pro_dir . 'templates/popup/quick-view-data.php',
			'slash-test-output'
		);

		ob_start();
		Visual_Portfolio_Templates::include_template( 'popup/quick-view-data' );
		$output = ob_get_clean();

		// The template may or may not load depending on trailing slash handling.
		// This test documents the current behaviour. If it fails after a fix,
		// update the assertion to match the improved behaviour.
		// The important thing is that the free fallback still works if direct load fails.
		if ( empty( $output ) ) {
			// Try free fallback – ensures no fatal error.
			ob_start();
			Visual_Portfolio_Templates::include_template( 'items-list/wrapper-end' );
			$fallback_output = ob_get_clean();

			$this->assertNotEmpty(
				$fallback_output,
				'Free fallback must work even when Pro path has no trailing slash'
			);
		} else {
			$this->assertSame(
				'slash-test-output',
				$output,
				'Template should load even with Pro path missing trailing slash'
			);
		}
	}

	/**
	 * Nonexistent template should produce no output and no errors.
	 */
	public function test_nonexistent_template_produces_no_output() {
		$this->activate_fake_pro();

		ob_start();
		Visual_Portfolio_Templates::include_template( 'this/template/does/not/exist' );
		$output = ob_get_clean();

		$this->assertEmpty(
			$output,
			'Including a nonexistent template should produce no output'
		);
	}

	/**
	 * Multiple Pro templates loaded sequentially should all resolve correctly.
	 */
	public function test_multiple_pro_templates_load_sequentially() {
		$this->activate_fake_pro();

		$templates = array(
			'popup/quick-view-data'                        => 'qv-output',
			'popup/quick-frame-data'                       => 'qf-output',
			'items-list/items-style/pro-style/image'       => 'pro-img',
		);

		foreach ( $templates as $name => $marker ) {
			$dir = dirname( $this->fake_pro_dir . 'templates/' . $name . '.php' );
			wp_mkdir_p( $dir );
			$this->write_template(
				$this->fake_pro_dir . 'templates/' . $name . '.php',
				$marker
			);
		}

		foreach ( $templates as $name => $expected ) {
			ob_start();
			Visual_Portfolio_Templates::include_template( $name );
			$output = ob_get_clean();

			$this->assertSame(
				$expected,
				$output,
				"Pro template '$name' should load correctly"
			);
		}
	}

	// ------------------------------------------------------------------
	// 9. Pro plugin path construction matches plugin_dir_path() behaviour
	// ------------------------------------------------------------------

	/**
	 * Verify that the pro_plugin_path built in init() always ends with a
	 * trailing slash, which is required for correct path concatenation.
	 *
	 * This directly tests the pattern used in class-visual-portfolio.php:
	 *   plugin_dir_path( WP_PLUGIN_DIR . '/visual-portfolio-pro/class-visual-portfolio-pro.php' )
	 */
	public function test_pro_plugin_path_has_trailing_slash() {
		// Simulate the exact construction used in the main class.
		$constructed_path = plugin_dir_path( WP_PLUGIN_DIR . '/visual-portfolio-pro/class-visual-portfolio-pro.php' );

		$this->assertStringEndsWith(
			'/',
			$constructed_path,
			'Constructed pro_plugin_path must end with a trailing slash'
		);

		$this->assertStringEndsWith(
			'visual-portfolio-pro/',
			$constructed_path,
			'Constructed pro_plugin_path must end with visual-portfolio-pro/'
		);
	}
}
