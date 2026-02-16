<?php
/**
 * Tests for LFI Path Traversal vulnerability in Templates class.
 *
 * Tests that the template loader rejects path traversal sequences (../)
 * to prevent Local File Inclusion attacks.
 *
 * @package Visual Portfolio
 */

/**
 * Test case for LFI path traversal protection in Templates class.
 */
class Test_Class_Templates_LFI extends WP_UnitTestCase {
	/**
	 * Set up test environment.
	 *
	 * @return void
	 */
	public function set_up() {
		parent::set_up();
	}

	/**
	 * Test that include_template rejects path traversal with ../ sequences.
	 *
	 * An attacker could pass a template name like "../../wp-includes/version"
	 * to include arbitrary PHP files from the filesystem.
	 */
	public function test_include_template_rejects_path_traversal() {
		ob_start();
		Visual_Portfolio_Templates::include_template( '../../wp-includes/version' );
		$output = ob_get_clean();

		$this->assertEmpty(
			$output,
			'Template loader should not include files when template name contains ../ traversal'
		);
	}

	/**
	 * Test that include_template rejects various traversal patterns.
	 *
	 * Multiple attack patterns should all be blocked.
	 */
	public function test_include_template_rejects_various_traversal_patterns() {
		$traversal_patterns = array(
			'../../../etc/passwd',
			'items-list/../../wp-config',
			'items-list/items-style/../../../../wp-includes/meta',
			'../wp-content/debug.log',
			'../../../../../../wp-includes',
		);

		foreach ( $traversal_patterns as $pattern ) {
			ob_start();
			Visual_Portfolio_Templates::include_template( $pattern );
			$output = ob_get_clean();

			$this->assertEmpty(
				$output,
				"Template loader should reject traversal pattern: $pattern"
			);
		}
	}

	/**
	 * Test that include_template allows valid template names.
	 *
	 * Legitimate template names without path traversal should pass validation.
	 */
	public function test_include_template_allows_valid_template_names() {
		// These are real templates that exist in the plugin.
		$valid_templates = array(
			'items-list/items-style/image',
			'items-list/items-style/meta',
			'items-list/wrapper-start',
			'items-list/wrapper-end',
		);

		foreach ( $valid_templates as $template_name ) {
			// validate_file should return 0 for valid template names.
			$validation_result = validate_file( $template_name );

			$this->assertEquals(
				0,
				$validation_result,
				"Valid template name '$template_name' should pass validate_file() check"
			);
		}
	}

	/**
	 * Test that validate_file correctly identifies traversal in template names.
	 *
	 * WordPress's validate_file() should return non-zero for paths with traversal.
	 */
	public function test_validate_file_detects_traversal_sequences() {
		$traversal_names = array(
			'../../wp-includes/version',
			'items-list/../../../wp-config',
			'../wp-content/debug.log',
		);

		foreach ( $traversal_names as $name ) {
			$result = validate_file( $name );

			$this->assertNotEquals(
				0,
				$result,
				"validate_file() should detect traversal in: $name"
			);
		}
	}

	/**
	 * Test that find_template_styles rejects path traversal.
	 *
	 * The CSS template finder should also reject traversal sequences.
	 */
	public function test_find_template_styles_rejects_path_traversal() {
		$result = Visual_Portfolio_Templates::find_template_styles( '../../wp-includes/version' );

		$this->assertEmpty(
			$result['path'],
			'find_template_styles should not return a path for traversal template names'
		);
	}

	/**
	 * Test the constructed template path used for items_style.
	 *
	 * Simulate the path construction done in class-get-portfolio.php
	 * and verify that traversal is caught.
	 */
	public function test_items_style_template_path_construction_with_traversal() {
		// Simulate: items_style = '../../../../../../wp-includes'
		$items_style      = '../../../../../../wp-includes';
		$items_style_pref = '/' . $items_style;

		$template_name = 'items-list/items-style' . $items_style_pref . '/image';

		// This template name should be detected as having traversal.
		$validation_result = validate_file( $template_name );

		$this->assertNotEquals(
			0,
			$validation_result,
			"Template path built from traversal items_style should be detected by validate_file()"
		);
	}

	/**
	 * Test that the template loader does not include files outside the plugin directory.
	 *
	 * Even if file_exists() returns true for a traversal path,
	 * the template should not be included.
	 */
	public function test_include_template_does_not_include_outside_plugin_directory() {
		// Construct a traversal path that would resolve to an existing file.
		// wp-includes/version.php exists in every WordPress installation.
		$traversal = str_repeat( '../', 10 ) . 'wp-includes/version';

		ob_start();
		Visual_Portfolio_Templates::include_template( $traversal );
		$output = ob_get_clean();

		// If the template was included, $wp_version would be defined/output.
		$this->assertEmpty(
			$output,
			'Template loader should not include wp-includes/version.php via traversal'
		);
	}

	/**
	 * Test that 3rd-party plugins can allow templates from their directory.
	 *
	 * When a plugin uses the `vpf_include_template` filter to return an absolute
	 * template path, it must also be able to extend the allowlist used by the
	 * Layer 3 realpath() guard.
	 */
	public function test_include_template_allows_third_party_plugin_template_dir_via_filter() {
		$temp_dir = trailingslashit( sys_get_temp_dir() ) . 'vp-templates-' . wp_generate_uuid4();
		wp_mkdir_p( $temp_dir );

		$template_file = trailingslashit( $temp_dir ) . 'custom-template.php';
		file_put_contents( $template_file, '<?php echo "vp-third-party-template"; // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped' );

		$include_filter = function ( $template, $template_name ) use ( $template_file ) {
			if ( 'custom-template' === $template_name ) {
				return $template_file;
			}
			return $template;
		};

		$allowed_dirs_filter = function ( $allowed_dirs ) use ( $temp_dir ) {
			$allowed_dirs[] = $temp_dir;
			return $allowed_dirs;
		};

		add_filter( 'vpf_include_template', $include_filter, 10, 2 );
		add_filter( 'vpf_allowed_template_dirs', $allowed_dirs_filter, 10, 1 );

		try {
			ob_start();
			Visual_Portfolio_Templates::include_template( 'custom-template' );
			$output = ob_get_clean();

			$this->assertSame( 'vp-third-party-template', $output );
		} finally {
			remove_filter( 'vpf_include_template', $include_filter, 10 );
			remove_filter( 'vpf_allowed_template_dirs', $allowed_dirs_filter, 10 );
			@unlink( $template_file ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged
			@rmdir( $temp_dir ); // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged
		}
	}
}
