<?php
/**
 * Saved Layout previews of the library.
 *
 * @package visual-portfolio/saved-layout-preview
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Visual_Portfolio_Saved_Layout_Preview
 *
 * A front-end page with one layout rendered on it the way a page renders it,
 * with the theme's styles and the gallery's scripts. The library shows it in
 * a scaled frame as the layout's preview.
 */
class Visual_Portfolio_Saved_Layout_Preview {
	/**
	 * Query parameter that carries the layout id.
	 */
	const PARAM = 'vp_layout_preview';

	/**
	 * Nonce action of a preview URL.
	 */
	const NONCE = 'vp-layout-preview';

	/**
	 * Constructor.
	 */
	public function __construct() {
		// After the plugin registers its scripts on `template_redirect`, so
		// the gallery's assets are known when it renders.
		add_action( 'template_redirect', array( $this, 'keep_url' ), 1 );
		add_action( 'template_redirect', array( $this, 'maybe_render' ), 20 );

		// Core sets up the admin bar on `template_redirect` at priority 0.
		add_filter( 'show_admin_bar', array( $this, 'hide_admin_bar' ) );
	}

	/**
	 * Show no admin bar in a preview.
	 *
	 * @param bool $show - whether to show the admin bar.
	 *
	 * @return bool
	 */
	public function hide_admin_bar( $show ) {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- hides the admin bar only.
		return isset( $_GET[ self::PARAM ] ) ? false : $show;
	}

	/**
	 * Keep core from redirecting a preview to the canonical URL of the page
	 * it is requested on, which drops its parameters.
	 */
	public function keep_url() {
		// phpcs:ignore WordPress.Security.NonceVerification.Recommended -- verified before rendering.
		if ( isset( $_GET[ self::PARAM ] ) ) {
			remove_action( 'template_redirect', 'redirect_canonical' );
		}
	}

	/**
	 * URL of a layout's preview for the current user.
	 *
	 * @param int $id - layout id.
	 *
	 * @return string
	 */
	public static function get_url( $id ) {
		return add_query_arg(
			array(
				self::PARAM => (int) $id,
				'ver'       => (int) get_post_modified_time( 'U', true, $id ),
				'_wpnonce'  => wp_create_nonce( self::NONCE ),
			),
			trailingslashit( home_url( '/' ) )
		);
	}

	/**
	 * Print the preview page when one is requested.
	 */
	public function maybe_render() {
		// phpcs:disable WordPress.Security.NonceVerification.Recommended -- verified below.
		if ( ! isset( $_GET[ self::PARAM ] ) ) {
			return;
		}

		$id    = (int) $_GET[ self::PARAM ];
		$nonce = isset( $_GET['_wpnonce'] ) ? sanitize_key( $_GET['_wpnonce'] ) : '';
		// phpcs:enable WordPress.Security.NonceVerification.Recommended

		if (
			! wp_verify_nonce( $nonce, self::NONCE ) ||
			Visual_Portfolio_Saved_Layouts::POST_TYPE !== get_post_type( $id ) ||
			! current_user_can( 'edit_post', $id )
		) {
			wp_die( esc_html__( 'This preview is not available.', 'visual-portfolio' ), '', array( 'response' => 403 ) );
		}

		nocache_headers();
		add_filter( 'wp_robots', 'wp_robots_no_robots' );

		// Rendered before `wp_head`, so the styles the gallery enqueues print in the head.
		$gallery = Visual_Portfolio_Get::get( array( 'id' => $id ) );

		visual_portfolio()->include_template(
			'preview/saved-layout',
			array(
				'id'      => $id,
				'gallery' => $gallery,
				'origin'  => self::get_origin( admin_url() ),
			)
		);

		exit;
	}

	/**
	 * Scheme, host and port of a URL.
	 *
	 * @param string $url - URL.
	 *
	 * @return string
	 */
	private static function get_origin( $url ) {
		$parts = wp_parse_url( $url );

		if ( empty( $parts['scheme'] ) || empty( $parts['host'] ) ) {
			return '';
		}

		return $parts['scheme'] . '://' . $parts['host'] . ( empty( $parts['port'] ) ? '' : ':' . $parts['port'] );
	}
}

new Visual_Portfolio_Saved_Layout_Preview();
