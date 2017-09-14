<?php
/**
 * Plugin Name:  Visual Portfolio
 * Description:  Portfolio post type with visual editor
 * Version:      1.0.0
 * Author:       nK
 * Author URI:   https://nkdev.info
 * License:      GPLv2 or later
 * License URI:  https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:  visual-portfolio
 *
 * @package visual-portfolio
 */

define( 'NK_VP_DOMAIN', 'visual-portfolio' );

// Make sure we don't expose any info if called directly.
if ( ! function_exists( 'add_action' ) ) {
    echo 'Hi there!  I\'m just a plugin, not much I can do when called directly.';
    exit;
}


/**
 * Visual Portfolio Class
 */
class Visual_Portfolio {
    /**
     * The single class instance.
     *
     * @var $_instance
     */
    private static $_instance = null;

    /**
     * Main Instance
     * Ensures only one instance of this class exists in memory at any one time.
     */
    public static function instance() {
        if ( is_null( self::$_instance ) ) {
            self::$_instance = new self();
            self::$_instance->init_options();
            self::$_instance->init_hooks();
        }
        return self::$_instance;
    }

    /**
     * Path to the plugin directory
     *
     * @var $plugin_path
     */
    public $plugin_path;

    /**
     * URL to the plugin directory
     *
     * @var $plugin_url
     */
    public $plugin_url;

    /**
     * Plugin name
     *
     * @var $plugin_name
     */
    public $plugin_name;

    /**
     * Plugin version
     *
     * @var $plugin_version
     */
    public $plugin_version;

    /**
     * Plugin slug
     *
     * @var $plugin_slug
     */
    public $plugin_slug;

    /**
     * Plugin name sanitized
     *
     * @var $plugin_name_sanitized
     */
    public $plugin_name_sanitized;

    /**
     * Visual_Portfolio constructor.
     */
    public function __construct() {
        /* We do nothing here! */
    }

    /**
     * Init options
     */
    public function init_options() {
        $this->plugin_path = plugin_dir_path( __FILE__ );
        $this->plugin_url = plugin_dir_url( __FILE__ );

        // load textdomain.
        load_plugin_textdomain( NK_VP_DOMAIN, false, basename( dirname( __FILE__ ) ) . '/languages' );

        // include helper files.
        $this->include_dependencies();

        // init classes.
        new Visual_Portfolio_Settings();
        new Visual_Portfolio_Get();
        new Visual_Portfolio_Shortcode();
        new Visual_Portfolio_Admin();
    }

    /**
     * Init hooks
     */
    public function init_hooks() {
        add_action( 'admin_init', array( $this, 'admin_init' ) );
        add_filter( 'query_vars', array( $this, 'add_wp_var' ) );
        add_action( 'template_redirect', array( $this, 'display_custom_css' ) );
        register_deactivation_hook( __FILE__, array( $this, 'rewrite_rules' ) );
        register_activation_hook( __FILE__, array( $this, 'rewrite_rules' ) );
    }

    /**
     * Rewrite rules for the portfolio custom post type
     */
    public function rewrite_rules() {
        flush_rewrite_rules();
    }

    /**
     * Init variables
     */
    public function admin_init() {
        // get current plugin data.
        $data = get_plugin_data( __FILE__ );
        $this->plugin_name = $data['Name'];
        $this->plugin_version = $data['Version'];
        $this->plugin_slug = plugin_basename( __FILE__, '.php' );
        $this->plugin_name_sanitized = basename( __FILE__, '.php' );
    }

    /**
     * Include dependencies
     */
    private function include_dependencies() {
        require_once( $this->plugin_path . 'classes/class-settings.php' );
        require_once( $this->plugin_path . 'classes/class-get-portfolio.php' );
        require_once( $this->plugin_path . 'classes/class-shortcode.php' );
        require_once( $this->plugin_path . 'classes/class-admin.php' );
    }

    /**
     * Include template
     *
     * @param string $template_name file name.
     * @param array  $args args for template.
     */
    public function include_template( $template_name, $args = array() ) {
        if ( ! empty( $args ) && is_array( $args ) ) {
            extract( $args );
        }

        // template in theme folder.
        $template = locate_template( array( '/visual-portfolio/' . $template_name . '.php' ) );

        // default template.
        if ( ! $template ) {
            $template = $this->plugin_path . 'templates/' . $template_name . '.php';
        }

        // Allow 3rd party plugin filter template file from their plugin.
        $template = apply_filters( 'vp_include_template', $template, $template_name, $args );

        include $template;
    }

    /**
     * Include template style
     *
     * @param string       $handle style handle name.
     * @param string       $template_name file name.
     * @param array|string $dependencies dependencies array.
     * @param string       $version version string.
     * @param string       $media media string.
     */
    public function include_template_style( $handle, $template_name, $dependencies = '', $version = '', $media = '' ) {
        if ( file_exists( get_stylesheet_directory() . '/visual-portfolio/' . $template_name . '.css' ) ) {
            // Child Theme (or just theme).
            $template = trailingslashit( get_stylesheet_directory_uri() ) . '/visual-portfolio/' . $template_name . '.css';
        } else if ( file_exists( get_template_directory() . '/visual-portfolio/' . $template_name . '.css' ) ) {
            // Parent Theme (if parent exists).
            $template = trailingslashit( get_template_directory_uri() ) . 'visual-portfolio/' . $template_name . '.css';
        } else {
            // Default file in plugin folder.
            $template = $this->plugin_url . 'templates/' . $template_name . '.css';
        }

        // Allow 3rd party plugin filter template file from their plugin.
        $template = apply_filters( 'vp_include_template_style', $template, $template_name, $dependencies, $version, $media );

        wp_enqueue_style( $handle, $template, $dependencies, $version, $media );
    }

    /**
     * Include custom CSS
     *
     * @param int $id - VP post id.
     */
    public function include_custom_css( $id ) {
        $css = get_post_meta( $id, 'vp_custom_css', true );

        if ( $css ) {
            if ( function_exists( 'icl_object_id' ) ) {
                $css_base_url = site_url();
                if ( is_ssl() ) {
                    $css_base_url = site_url( '/', 'https' );
                }
            } else {
                $css_base_url = get_bloginfo( 'url' );
                if ( is_ssl() ) {
                    $css_base_url = str_replace( 'http://', 'https://', $css_base_url );
                }
            }
            wp_register_style( 'vp-custom-css-' . $id, $css_base_url . '?vp_custom_css=css&vp_custom_css_id=' . $id );
            wp_enqueue_style( 'vp-custom-css-' . $id );
        }
    }

    /**
     * Display custom CSS
     */
    public function display_custom_css() {
        $custom_css = get_query_var( 'vp_custom_css' );
        $id = get_query_var( 'vp_custom_css_id' );
        $css = get_post_meta( $id, 'vp_custom_css', true );

        if ( 'css' === $custom_css ) {
            header( 'Content-type: text/css' );
            $css = wp_kses( $css, array( '\'', '\"' ) );
            $css = str_replace( '&gt;' , '>' , $css );
            echo $css;
            exit;
        }
    }

    /**
     * Register custom query vars
     *
     * @param array $public_query_vars - query vars.
     *
     * @return array
     */
    public static function add_wp_var( $public_query_vars ) {
        $public_query_vars[] = 'vp_custom_css';
        $public_query_vars[] = 'vp_custom_css_id';
        return $public_query_vars;
    }
}

/**
 * Function works with the Visual_Portfolio class instance
 *
 * @return object Visual_Portfolio
 */
function visual_portfolio() {
    return Visual_Portfolio::instance();
}
add_action( 'plugins_loaded', 'visual_portfolio' );
