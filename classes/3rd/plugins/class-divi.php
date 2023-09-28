<?php
/**
 * Divi Plugin.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Visual_Portfolio_Divi
 */
class Visual_Portfolio_Divi {
	/**
	 * Visual_Portfolio_Divi constructor.
	 */
	public function __construct() {
		add_action( 'wp_head', array( $this, 'maybe_fix_images_width' ) );
	}

	/**
	 * Add CSS to fix lazy loaded Divi images widths.
	 * When the image has lazy loading attributes, width is set to 4px, not the actual image size.
	 */
	public function maybe_fix_images_width() {
		if ( ! defined( 'ET_CORE' ) || 'full' !== Visual_Portfolio_Settings::get_option( 'lazy_loading', 'vp_images' ) ) {
			return;
		}

		?>
		<style type="text/css">
			.et-db #et-boc .et-l .et_pb_module .et_pb_image_wrap,
			.et-db #et-boc .et-l .et_pb_module .et_pb_image_wrap img[data-src] {
				width: 100%;
			}
		</style>
		<?php
	}
}

new Visual_Portfolio_Divi();
