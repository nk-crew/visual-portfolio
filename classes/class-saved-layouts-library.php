<?php
/**
 * Saved Layouts library screen.
 *
 * @package visual-portfolio/saved-layouts-library
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Visual_Portfolio_Saved_Layouts_Library
 *
 * The screen is a `@wordpress/build` page (`wpPlugin.pages` in `package.json`)
 * booted by core's `@wordpress/boot` module, the way core builds Fonts and
 * Connectors. Its routes live in `routes/`.
 */
class Visual_Portfolio_Saved_Layouts_Library {
	/**
	 * Admin page slug the build generates for the page in wp-admin mode.
	 */
	const PAGE = 'vpf-saved-layouts-wp-admin';

	/**
	 * Constructor.
	 */
	public function __construct() {
		if ( ! self::is_available() ) {
			return;
		}

		require_once visual_portfolio()->plugin_path . 'build/build.php';

		// menu.
		add_action( 'admin_menu', array( $this, 'admin_menu' ), 13 );
		add_action( 'load-edit.php', array( $this, 'redirect_list_table' ) );
	}

	/**
	 * Whether the library replaces the post type list on this site.
	 *
	 * New Saved Layouts are Gallery Loop blocks, which need WordPress 7.1, and
	 * the page boots through `@wordpress/boot`, which core ships since 7.0.
	 *
	 * @return bool
	 */
	public static function is_available() {
		return visual_portfolio()->supports_loop_blocks()
			&& file_exists( visual_portfolio()->plugin_path . 'build/build.php' );
	}

	/**
	 * URL of the library, optionally at one of its routes.
	 *
	 * @param string $route - route path, such as `/`.
	 *
	 * @return string
	 */
	public static function get_url( $route = '' ) {
		$url = admin_url( 'admin.php?page=' . self::PAGE );

		return $route ? add_query_arg( 'p', rawurlencode( $route ), $url ) : $url;
	}

	/**
	 * Put the library where the post type list was in the plugin menu.
	 */
	public function admin_menu() {
		global $submenu;

		$parent   = Visual_Portfolio_Custom_Post_Type::get_menu_slug();
		$position = null;

		foreach ( array_values( $submenu[ $parent ] ?? array() ) as $index => $item ) {
			if ( 'edit.php?post_type=vp_lists' === $item[2] ) {
				$position = $index;
				break;
			}
		}

		remove_submenu_page( $parent, 'edit.php?post_type=vp_lists' );

		add_submenu_page(
			$parent,
			esc_html__( 'Saved Layouts', 'visual-portfolio' ),
			esc_html__( 'Saved Layouts', 'visual-portfolio' ),
			'edit_vp_lists',
			self::PAGE,
			'visual_portfolio_vpf_saved_layouts_wp_admin_render_page',
			$position
		);
	}

	/**
	 * Send the post type list, and every core redirect that lands on it, to
	 * the library.
	 */
	public function redirect_list_table() {
		global $typenow;

		if ( 'vp_lists' !== $typenow ) {
			return;
		}

		wp_safe_redirect( self::get_url() );
		exit;
	}
}

new Visual_Portfolio_Saved_Layouts_Library();
