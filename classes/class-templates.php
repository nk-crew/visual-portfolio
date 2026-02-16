<?php
/**
 * Methods to work with templates.
 *
 * @package visual-portfolio
 */

/**
 * Visual_Portfolio_Templates
 */
class Visual_Portfolio_Templates {
	/**
	 * Include template
	 *
	 * @param string $template_name file name.
	 * @param array  $args args for template.
	 */
	public static function include_template( $template_name, $args = array() ) {
		// Layer 1: Reject template names containing path traversal sequences.
		if ( validate_file( $template_name ) !== 0 ) {
			return;
		}

		// Allow 3rd party plugin filter template args from their plugin.
		$args = apply_filters( 'vpf_include_template_args', $args, $template_name );

		if ( ! empty( $args ) && is_array( $args ) ) {
	        // phpcs:ignore WordPress.PHP.DontExtract.extract_extract
			extract( $args );
		}

		// template in theme folder.
		$template = locate_template( array( '/visual-portfolio/' . $template_name . '.php' ) );

		// pro plugin template.
		if ( ! $template && visual_portfolio()->pro_plugin_path && file_exists( visual_portfolio()->pro_plugin_path . 'templates/' . $template_name . '.php' ) ) {
			$template = visual_portfolio()->pro_plugin_path . 'templates/' . $template_name . '.php';
		}

		// default template.
		if ( ! $template ) {
			$template = visual_portfolio()->plugin_path . 'templates/' . $template_name . '.php';
		}

		// Allow 3rd party plugin filter template file from their plugin.
		$template = apply_filters( 'vpf_include_template', $template, $template_name, $args );

		if ( file_exists( $template ) ) {
			// Layer 3: Verify the resolved path is within allowed directories.
			$real_path = realpath( $template );

			if ( $real_path && self::is_allowed_template_path( $real_path ) ) {
				include $template;
			}
		}
	}

	/**
	 * Check if a resolved file path is within allowed template directories.
	 *
	 * Layer 3: Prevents inclusion of files outside expected template directories,
	 * even if path traversal bypasses other checks.
	 *
	 * @param string $real_path The resolved (realpath) file path to check.
	 * @return bool True if the path is within an allowed directory.
	 */
	public static function is_allowed_template_path( $real_path ) {
		$normalized_real_path = wp_normalize_path( $real_path );

		if ( ! $normalized_real_path ) {
			return false;
		}

		$allowed_dirs = array(
			visual_portfolio()->plugin_path . 'templates/',
			get_stylesheet_directory() . '/visual-portfolio/',
			get_template_directory() . '/visual-portfolio/',
		);

		if ( visual_portfolio()->pro_plugin_path ) {
			$allowed_dirs[] = visual_portfolio()->pro_plugin_path . 'templates/';
		}

		/**
		 * Filters the list of allowed template directories.
		 *
		 * This is used by the Layer 3 realpath() inclusion guard.
		 * Add your plugin directory here if you return a custom absolute template
		 * path via the `vpf_include_template` filter.
		 *
		 * @since 3.5.2
		 *
		 * @param array  $allowed_dirs Allowed directories (absolute paths).
		 * @param string $real_path    Resolved real path to the included template.
		 */
		$allowed_dirs = (array) apply_filters( 'vpf_allowed_template_dirs', $allowed_dirs, $real_path );

		// Resolve all allowed directories to their real paths.
		$allowed_dirs = array_filter( array_map( 'realpath', $allowed_dirs ) );

		foreach ( $allowed_dirs as $dir ) {
			$normalized_dir = trailingslashit( wp_normalize_path( $dir ) );

			if ( strpos( $normalized_real_path, $normalized_dir ) === 0 ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Find css template file
	 *
	 * @param string $template_name file name.
	 * @return string
	 */
	public static function find_template_styles( $template_name ) {
		// Layer 1: Reject template names containing path traversal sequences.
		if ( validate_file( $template_name ) !== 0 ) {
			return array(
				'path'    => '',
				'version' => '',
			);
		}

		$template         = '';
		$template_version = '';

		if ( file_exists( get_stylesheet_directory() . '/visual-portfolio/' . $template_name . '.css' ) ) {
			// Child Theme (or just theme).
			$template         = trailingslashit( get_stylesheet_directory_uri() ) . 'visual-portfolio/' . $template_name . '.css';
			$template_version = filemtime( get_stylesheet_directory() . '/visual-portfolio/' . $template_name . '.css' );
		} elseif ( file_exists( get_template_directory() . '/visual-portfolio/' . $template_name . '.css' ) ) {
			// Parent Theme (when parent exists).
			$template         = trailingslashit( get_template_directory_uri() ) . 'visual-portfolio/' . $template_name . '.css';
			$template_version = filemtime( get_template_directory() . '/visual-portfolio/' . $template_name . '.css' );
		} elseif ( visual_portfolio()->pro_plugin_path && file_exists( visual_portfolio()->pro_plugin_path . 'templates/' . $template_name . '.css' ) ) {
			// PRO plugin folder.
			$template         = visual_portfolio()->pro_plugin_url . 'templates/' . $template_name . '.css';
			$template_version = filemtime( visual_portfolio()->pro_plugin_path . 'templates/' . $template_name . '.css' );
		} elseif ( file_exists( visual_portfolio()->plugin_path . 'templates/' . $template_name . '.css' ) ) {
			// Default file in plugin folder.
			$template         = visual_portfolio()->plugin_url . 'templates/' . $template_name . '.css';
			$template_version = filemtime( visual_portfolio()->plugin_path . 'templates/' . $template_name . '.css' );
		}

		return array(
			'path'    => $template,
			'version' => $template_version,
		);
	}

	/**
	 * Include template style
	 *
	 * @param string           $handle style handle name.
	 * @param string           $template_name file name.
	 * @param array            $deps dependencies array.
	 * @param string|bool|null $ver version string.
	 * @param string           $media media string.
	 */
	public static function include_template_style( $handle, $template_name, $deps = array(), $ver = false, $media = 'all' ) {
		$template = visual_portfolio()->find_template_styles( $template_name );
		$is_min   = false;

		// maybe find minified style.
		if ( ! $template['path'] ) {
			$template = visual_portfolio()->find_template_styles( $template_name . '.min' );
			$is_min   = true;
		}

		// Get dynamic version.
		if ( ! $ver && $template['version'] ) {
			$ver = $template['version'];
		}
		if ( ! $ver ) {
			$ver = VISUAL_PORTFOLIO_VERSION;
		}

		// Allow 3rd party plugin filter template file from their plugin.
		$template['path'] = apply_filters( 'vpf_include_template_style', $template['path'], $template_name, $deps, $ver, $media );

		if ( $template['path'] ) {
			wp_enqueue_style( $handle, $template['path'], $deps, $ver, $media );
			wp_style_add_data( $handle, 'rtl', 'replace' );

			if ( $is_min ) {
				wp_style_add_data( $handle, 'suffix', '.min' );
			}
		}
	}
}
