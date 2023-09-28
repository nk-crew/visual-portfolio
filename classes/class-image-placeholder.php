<?php
/**
 * Image placeholder.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Visual_Portfolio_Image_Placeholder
 */
class Visual_Portfolio_Image_Placeholder {
	/**
	 * Visual_Portfolio_Image_Placeholder constructor.
	 */
	public function __construct() {
		if ( is_admin() ) {
			add_action( 'admin_init', array( $this, 'create_placeholder_image' ), 3 );
		} else {
			add_action( 'wp', array( $this, 'create_placeholder_image' ), 3 );
		}
	}

	/**
	 * Create a placeholder image in the media library.
	 * For code thanks to WooCommerce.
	 */
	public function create_placeholder_image() {
		// Run only on first plugin install.
		// This option added in Migration class.
		if ( get_option( 'vpf_db_version' ) ) {
			return;
		}

		$general_settings = get_option( 'vp_general' );
		if ( ! is_array( $general_settings ) ) {
			$general_settings = array();
		}

		// Don't run when already added placeholder.
		if ( isset( $general_settings['no_image'] ) && $general_settings['no_image'] ) {
			return;
		}

		// Upload placeholder image to Media Library.
		$upload_dir = wp_upload_dir();
		$source     = visual_portfolio()->plugin_path . '/assets/images/placeholder.png';
		$filename   = $upload_dir['basedir'] . '/visual-portfolio/placeholder.png';

		// try to move to /visual-portfolio/ directory.
		if ( ! file_exists( $upload_dir['basedir'] . '/visual-portfolio' ) ) {
            // phpcs:ignore WordPress.PHP.NoSilencedErrors.Discouraged
			@mkdir( $upload_dir['basedir'] . '/visual-portfolio', 0755, true );
		}
		if ( ! file_exists( $upload_dir['basedir'] . '/visual-portfolio' ) ) {
			$filename = $upload_dir['basedir'] . '/visual-portfolio-placeholder.png';
		}

		if ( ! file_exists( $filename ) ) {
			copy( $source, $filename );
		}

		if ( ! file_exists( $filename ) ) {
			return;
		}

		$filetype   = wp_check_filetype( basename( $filename ), null );
		$attachment = array(
			'guid'           => $upload_dir['url'] . '/' . basename( $filename ),
			'post_mime_type' => $filetype['type'],
			'post_title'     => preg_replace( '/\.[^.]+$/', '', basename( $filename ) ),
			'post_content'   => '',
			'post_status'    => 'inherit',
		);
		$attach_id  = wp_insert_attachment( $attachment, $filename );

		// Update settings.
		$general_settings['no_image'] = $attach_id;
		update_option( 'vp_general', $general_settings );

		// Make sure that this file is included, as wp_generate_attachment_metadata() depends on it.
		require_once ABSPATH . 'wp-admin/includes/image.php';

		// Generate the metadata for the attachment, and update the database record.
		$attach_data = wp_generate_attachment_metadata( $attach_id, $filename );
		wp_update_attachment_metadata( $attach_id, $attach_data );
	}
}

new Visual_Portfolio_Image_Placeholder();
