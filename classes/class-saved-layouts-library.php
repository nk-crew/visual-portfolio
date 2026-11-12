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
 * The screen is a React page, `assets/admin/pages/saved-layouts/`.
 */
class Visual_Portfolio_Saved_Layouts_Library {
	/**
	 * Admin page slug.
	 */
	const PAGE = 'vpf-saved-layouts';

	/**
	 * Script and style handle.
	 */
	const HANDLE = 'visual-portfolio-saved-layouts';

	/**
	 * Hook suffix of the page.
	 *
	 * @var string
	 */
	private $hook_suffix = '';

	/**
	 * Constructor.
	 */
	public function __construct() {
		if ( ! self::is_available() ) {
			return;
		}

		// menu.
		add_action( 'admin_menu', array( $this, 'admin_menu' ), 13 );
		add_filter( 'submenu_file', array( $this, 'highlight_menu' ) );
		add_action( 'load-edit.php', array( $this, 'redirect_list_table' ) );

		// assets.
		add_action( 'admin_enqueue_scripts', array( $this, 'enqueue' ) );
	}

	/**
	 * Whether the library replaces the post type list on this site.
	 *
	 * New Saved Layouts are Gallery Loop blocks, which need WordPress 7.1.
	 *
	 * @return bool
	 */
	public static function is_available() {
		return visual_portfolio()->supports_loop_blocks();
	}

	/**
	 * URL of the library.
	 *
	 * @return string
	 */
	public static function get_url() {
		return admin_url( 'admin.php?page=' . self::PAGE );
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

		$this->hook_suffix = (string) add_submenu_page(
			$parent,
			esc_html__( 'Saved Layouts', 'visual-portfolio' ),
			esc_html__( 'Saved Layouts', 'visual-portfolio' ),
			'edit_vp_lists',
			self::PAGE,
			array( $this, 'render' ),
			$position
		);
	}

	/**
	 * Mount point of the page.
	 */
	public function render() {
		echo '<div id="vpf-saved-layouts"></div>';
	}

	/**
	 * Load the page's script and styles on the page only.
	 *
	 * @param string $hook_suffix - current admin page.
	 */
	public function enqueue( $hook_suffix ) {
		if ( ! $this->hook_suffix || $hook_suffix !== $this->hook_suffix ) {
			return;
		}

		$asset = require visual_portfolio()->plugin_path . 'build/assets/admin/pages/saved-layouts.asset.php';

		wp_enqueue_script(
			self::HANDLE,
			visual_portfolio()->plugin_url . 'build/assets/admin/pages/saved-layouts.js',
			$asset['dependencies'],
			$asset['version'],
			true
		);
		wp_set_script_translations( self::HANDLE, 'visual-portfolio', visual_portfolio()->plugin_path . 'languages' );
		wp_enqueue_style(
			self::HANDLE,
			visual_portfolio()->plugin_url . 'build/assets/admin/pages/saved-layouts.css',
			array( 'wp-components', 'visual-portfolio-admin-page' ),
			$asset['version']
		);
	}

	/**
	 * Mark the library current in the plugin menu while it is open.
	 *
	 * @param string|null $submenu_file - current submenu item.
	 *
	 * @return string|null
	 */
	public function highlight_menu( $submenu_file ) {
		global $plugin_page;

		return self::PAGE === $plugin_page ? self::PAGE : $submenu_file;
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

		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- only reads which list to open.
		$is_trash = isset( $_GET['post_status'] ) && 'trash' === $_GET['post_status'];

		wp_safe_redirect( $is_trash ? add_query_arg( 'status', 'trash', self::get_url() ) : self::get_url() );
		exit;
	}
}

new Visual_Portfolio_Saved_Layouts_Library();
