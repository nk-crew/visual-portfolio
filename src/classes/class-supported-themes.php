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
                    'url'  => visual_portfolio()->plugin_url . 'assets/css/theme-twentytwentytwo.min.css',
                );
                break;
            case 'twentytwentyone':
                $result = array(
                    'name' => 'vpf-twentytwentyone',
                    'url'  => visual_portfolio()->plugin_url . 'assets/css/theme-twentytwentyone.min.css',
                );
                break;
            case 'twentytwenty':
                $result = array(
                    'name' => 'vpf-twentytwenty',
                    'url'  => visual_portfolio()->plugin_url . 'assets/css/theme-twentytwenty.min.css',
                );
                break;
            case 'twentynineteen':
                $result = array(
                    'name' => 'vpf-twentynineteen',
                    'url'  => visual_portfolio()->plugin_url . 'assets/css/theme-twentynineteen.min.css',
                );
                break;
            case 'twentyseventeen':
                $result = array(
                    'name' => 'vpf-twentyseventeen',
                    'url'  => visual_portfolio()->plugin_url . 'assets/css/theme-twentyseventeen.min.css',
                );
                break;
            case 'twentysixteen':
                $result = array(
                    'name' => 'vpf-twentysixteen',
                    'url'  => visual_portfolio()->plugin_url . 'assets/css/theme-twentysixteen.min.css',
                );
                break;
            case 'twentyfifteen':
                $result = array(
                    'name' => 'vpf-twentyfifteen',
                    'url'  => visual_portfolio()->plugin_url . 'assets/css/theme-twentyfifteen.min.css',
                );
                break;
            case 'airtifact':
                $result = array(
                    'name' => 'vpf-airtifact',
                    'url'  => visual_portfolio()->plugin_url . 'assets/css/theme-airtifact.min.css',
                );
                break;
            case 'betheme':
                $result = array(
                    'name' => 'vpf-betheme',
                    'url'  => visual_portfolio()->plugin_url . 'assets/css/theme-betheme.min.css',
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
            wp_enqueue_style( $theme_compat['name'], $theme_compat['url'], array(), VISUAL_PORTFOLIO_VERSION );
            wp_style_add_data( $theme_compat['name'], 'rtl', 'replace' );
            wp_style_add_data( $theme_compat['name'], 'suffix', '.min' );
        }
    }
}

new Visual_Portfolio_Supported_Themes();
