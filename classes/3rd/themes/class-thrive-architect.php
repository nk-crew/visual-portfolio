<?php
/**
 * Thrive Architect Theme Builder.
 * This builder overrides page output and we can't enqueue inline dynamic styles using `wp_add_inline_style`
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Visual_Portfolio_3rd_Thrive_Architect
 */
class Visual_Portfolio_3rd_Thrive_Architect {
	/**
	 * Visual_Portfolio_3rd_Thrive_Architect constructor.
	 */
	public function __construct() {
		add_action( 'init', array( $this, 'init' ) );
	}

	/**
	 * Init action.
	 */
	public function init() {
		if ( ! function_exists( 'tcb_custom_editable_content' ) ) {
			return;
		}

		add_filter( 'vpf_enqueue_dynamic_styles_inline_style', '__return_false' );
	}
}

new Visual_Portfolio_3rd_Thrive_Architect();
