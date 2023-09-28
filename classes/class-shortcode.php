<?php
/**
 * Shortcode
 *
 * @package visual-portfolio/shortcode
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Visual_Portfolio_Shortcode
 */
class Visual_Portfolio_Shortcode {
	/**
	 * Visual_Portfolio_Shortcode constructor.
	 */
	public function __construct() {
		// add shortcode.
		add_shortcode( 'visual_portfolio', array( $this, 'get_shortcode_out' ) );
		add_shortcode( 'visual_portfolio_filter', array( $this, 'get_shortcode_filter_out' ) );
		add_shortcode( 'visual_portfolio_sort', array( $this, 'get_shortcode_sort_out' ) );
	}

	/**
	 * Shortcode Output
	 *
	 * @param array $atts shortcode attributes.
	 * @return string
	 */
	public function get_shortcode_out( $atts = array() ) {
		$atts = shortcode_atts(
			array(
				'id'     => '',
				'class'  => '',
				'vc_css' => '',
			),
			$atts
		);

		return Visual_Portfolio_Get::get( $atts );
	}

	/**
	 * Shortcode Filter Output
	 *
	 * @param array $atts shortcode attributes.
	 * @return string
	 */
	public function get_shortcode_filter_out( $atts = array() ) {
		$atts = shortcode_atts(
			array(
				'id'         => '',
				'type'       => 'default',
				'align'      => 'center',
				'show_count' => false,
				'text_all'   => esc_attr__( 'All', 'visual-portfolio' ),
				'class'      => '',
			),
			$atts
		);

		return Visual_Portfolio_Get::get_filter( $atts );
	}

	/**
	 * Shortcode Sort Output
	 *
	 * @param array $atts shortcode attributes.
	 * @return string
	 */
	public function get_shortcode_sort_out( $atts = array() ) {
		$atts = shortcode_atts(
			array(
				'id'    => '',
				'type'  => 'default',
				'align' => 'center',
				'class' => '',
			),
			$atts
		);

		return Visual_Portfolio_Get::get_sort( $atts );
	}
}

new Visual_Portfolio_Shortcode();
