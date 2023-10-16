<?php
/**
 * Jetpack Plugin.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Visual_Portfolio_3rd_Jetpack
 */
class Visual_Portfolio_3rd_Jetpack {
	/**
	 * Visual_Portfolio_3rd_Jetpack constructor.
	 */
	public function __construct() {
		// Fix conflict with lazy loading.
		add_filter( 'jetpack_lazy_images_skip_image_with_attributes', array( $this, 'jetpack_lazy_images_skip_image_with_attributes' ), 15, 2 );

		add_action( 'wp_enqueue_scripts', array( $this, 'wp_enqueue_scripts' ), 20 );
	}

	/**
	 * We need to init the Jetpack lazy loading manually after Visual Portfolio AJAX completed.
	 */
	public function wp_enqueue_scripts() {
		$wp_scripts         = wp_scripts();
		$jetpack_ll_handler = 'jetpack-lazy-images';

		if ( ! isset( $wp_scripts->registered[ $jetpack_ll_handler ] ) ) {
			return;
		}

		Visual_Portfolio_Assets::register_script( 'visual-portfolio-3rd-jetpack', 'build/assets/js/3rd/plugin-jetpack' );

		$wp_scripts->registered[ $jetpack_ll_handler ]->deps[] = 'visual-portfolio-3rd-jetpack';
	}

	/**
	 * Skip Jetpack lazy loading when data-src attribute added to image.
	 *
	 * @param boolean $return     skip lazy Jetpack.
	 * @param array   $attributes image attributes.
	 *
	 * @return boolean
	 */
	public function jetpack_lazy_images_skip_image_with_attributes( $return, $attributes ) {
		return isset( $attributes['data-src'] );
	}
}

new Visual_Portfolio_3rd_Jetpack();
