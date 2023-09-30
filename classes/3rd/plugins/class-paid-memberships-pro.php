<?php
/**
 * Paid Memberships Pro Plugin.
 *
 * @package visual-portfolio/pmp
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Visual_Portfolio_3rd_Paid_Memberships_Pro
 */
class Visual_Portfolio_3rd_Paid_Memberships_Pro {
	/**
	 * Visual_Portfolio_3rd_Paid_Memberships_Pro constructor.
	 */
	public function __construct() {
		add_action( 'init', array( $this, 'fix_pmpromh_redirect_in_preview' ) );
	}

	/**
	 * Remove redirect action from the preview frame.
	 * Because "Paid Memberships Pro - Member Homepages Add On" make their own redirect and our preview frame failed to load.
	 */
	public function fix_pmpromh_redirect_in_preview() {
		if ( ! function_exists( 'pmpromh_template_redirect_homepage' ) ) {
			return;
		}

        // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		if ( ! isset( $_GET['vp_preview'] ) ) {
			return;
		}

		remove_action( 'template_redirect', 'pmpromh_template_redirect_homepage' );
	}
}

new Visual_Portfolio_3rd_Paid_Memberships_Pro();
