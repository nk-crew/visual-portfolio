<?php
/**
 * Supported themes.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Visual_Portfolio_Supported_Themes
 */
class Visual_Portfolio_Supported_Themes {
	/**
	 * Visual_Portfolio_Supported_Themes constructor.
	 */
	public function __construct() {
		add_action( 'wp_enqueue_scripts', array( $this, 'wp_enqueue_scripts' ) );
	}

	/**
	 * Get Theme Compatibility Style
	 */
	public function get_theme_compatibility_style() {
		$result = false;

		switch ( get_template() ) {
			case 'twentytwentytwo':
				$result = array(
					'name' => 'vpf-twentytwentytwo',
					'url'  => 'build/assets/css/theme-twentytwentytwo',
				);
				break;
			case 'twentytwentyone':
				$result = array(
					'name' => 'vpf-twentytwentyone',
					'url'  => 'build/assets/css/theme-twentytwentyone',
				);
				break;
			case 'twentytwenty':
				$result = array(
					'name' => 'vpf-twentytwenty',
					'url'  => 'build/assets/css/theme-twentytwenty',
				);
				break;
			case 'twentynineteen':
				$result = array(
					'name' => 'vpf-twentynineteen',
					'url'  => 'build/assets/css/theme-twentynineteen',
				);
				break;
			case 'twentyseventeen':
				$result = array(
					'name' => 'vpf-twentyseventeen',
					'url'  => 'build/assets/css/theme-twentyseventeen',
				);
				break;
			case 'twentysixteen':
				$result = array(
					'name' => 'vpf-twentysixteen',
					'url'  => 'build/assets/css/theme-twentysixteen',
				);
				break;
			case 'twentyfifteen':
				$result = array(
					'name' => 'vpf-twentyfifteen',
					'url'  => 'assets/css/theme-twentyfifteen',
				);
				break;
			case 'airtifact':
				$result = array(
					'name' => 'vpf-airtifact',
					'url'  => 'assets/css/theme-airtifact',
				);
				break;
			case 'betheme':
				$result = array(
					'name' => 'vpf-betheme',
					'url'  => 'assets/css/theme-betheme',
				);
				break;
		}

		return $result;
	}

	/**
	 * Enqueue styles
	 */
	public function wp_enqueue_scripts() {
		$theme_compat = $this->get_theme_compatibility_style();
		if ( $theme_compat ) {
			Visual_Portfolio_Assets::enqueue_style( $theme_compat['name'], $theme_compat['url'] );
			wp_style_add_data( $theme_compat['name'], 'rtl', 'replace' );
			wp_style_add_data( $theme_compat['name'], 'suffix', '.min' );
		}
	}
}

new Visual_Portfolio_Supported_Themes();
