<?php
/**
 * A3 Lazy Load Plugin.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Visual_Portfolio_3rd_A3_Lazy_Load
 */
class Visual_Portfolio_3rd_A3_Lazy_Load {
	/**
	 * Visual_Portfolio_3rd_A3_Lazy_Load constructor.
	 */
	public function __construct() {
		// Fix conflict with lazy loading.
		add_filter( 'a3_lazy_load_skip_images_classes', array( $this, 'a3_lazy_load_skip_images_classes' ) );
	}

	/**
	 * Add lazyload class to skip.
	 *
	 * @param string $classes classes.
	 *
	 * @return string
	 */
	public function a3_lazy_load_skip_images_classes( $classes ) {
		if ( '' !== $classes && ! empty( $classes ) ) {
			$classes .= ',';
		}

		$classes .= 'vp-lazyload';

		return $classes;
	}
}

new Visual_Portfolio_3rd_A3_Lazy_Load();
