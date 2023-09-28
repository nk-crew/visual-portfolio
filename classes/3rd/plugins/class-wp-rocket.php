<?php
/**
 * WP Rocket Plugin.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Visual_Portfolio_3rd_WP_Rocket
 */
class Visual_Portfolio_3rd_WP_Rocket {
	/**
	 * Visual_Portfolio_3rd_WP_Rocket constructor.
	 */
	public function __construct() {
		// Fix conflict with lazy loading.
		add_filter( 'rocket_delay_js_exclusions', array( $this, 'rocket_delay_js_exclusions' ) );
	}

	/**
	 * Exclude all our lazysizes scripts from delayed loading,
	 * because WP Rocket excluded lazysizes automatically, but not other assets,
	 * this causes problems with lazy loading.
	 *
	 * @param array $excluded excluded scripts.
	 *
	 * @return array
	 */
	public function rocket_delay_js_exclusions( $excluded ) {
		$excluded[] = 'visual-portfolio/assets/js/lazysizes';

		return $excluded;
	}
}

new Visual_Portfolio_3rd_WP_Rocket();
