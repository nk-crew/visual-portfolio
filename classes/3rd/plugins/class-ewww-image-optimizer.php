<?php
/**
 * EWWW Image Optimizer Plugin.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Visual_Portfolio_3rd_Ewww_Image_Optimizer
 */
class Visual_Portfolio_3rd_Ewww_Image_Optimizer {
	/**
	 * Visual_Portfolio_3rd_Ewww_Image_Optimizer constructor.
	 */
	public function __construct() {
		if ( ! function_exists( 'ewww_image_optimizer_get_option' ) || ! ewww_image_optimizer_get_option( 'ewww_image_optimizer_lazy_load' ) ) {
			return;
		}

		// Disable our lazyload if EWWW lazyload used.
		add_filter( 'vpf_images_lazyload', '__return_false' );
		add_filter( 'vpf_enqueue_plugin_lazysizes', '__return_false' );
	}
}

new Visual_Portfolio_3rd_Ewww_Image_Optimizer();
