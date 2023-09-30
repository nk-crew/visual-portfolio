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
			include $template;
		}
	}

	/**
	 * Find css template file
	 *
	 * @param string $template_name file name.
	 * @return string
	 */
	public static function find_template_styles( $template_name ) {
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
