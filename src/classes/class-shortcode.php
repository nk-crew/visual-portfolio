<?php
/**
 * Shortcode
 *
 * @package visual-portfolio/shortcode
 */
class Visual_Portfolio_Shortcode {
    /**
     * Visual_Portfolio_Shortcode constructor.
     */
    public function __construct() {
        // add shortcode.
        add_shortcode( 'visual_portfolio', array( $this, 'get_shortcode_out' ) );
    }

    /**
     * Shortcode Output
     *
     * @param array $atts shortcode attributes.
     * @return string
     */
    public function get_shortcode_out( $atts = array() ) {
        $atts = shortcode_atts(array(
            'id' => '',
        ), $atts);

        return Visual_Portfolio_Get::get( $atts['id'] );
    }
}
