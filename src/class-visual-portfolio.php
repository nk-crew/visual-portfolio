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

        // clear caches.
        $this->clear_expired_caches();

        // init classes.
        new Visual_Portfolio_Get;
        new Visual_Portfolio_Shortcode;
        new Visual_Portfolio_Admin;
    }

    /**
     * Init hooks
     */
    public function init_hooks() {
        add_action( 'admin_init', array( $this, 'admin_init' ) );
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
        require_once( $this->plugin_path . 'classes/class-get-portfolio.php' );
        require_once( $this->plugin_path . 'classes/class-shortcode.php' );
        require_once( $this->plugin_path . 'classes/class-admin.php' );
    }

    /**
     * Get template part
     *
     * @param string $template_name file name.
     * @param array  $args args for template.
     */
    public function get_template_part( $template_name, $args = array() ) {
        // template in theme folder.
        $template = locate_template( array( '/visual-portfolio/' . $template_name . '.php', $template_name . '.php' ) );

        // default template.
        if ( ! $template ) {
            $template = $this->plugin_path . 'templates/' . $template_name . '.php';
        }

        // Allow 3rd party plugin filter template file from their plugin.
        $template = apply_filters( 'vp_include_template', $template, $template_name, $args );

        include $template;
    }


    /**
     * Get all options
     */
    private function get_options() {
        $options_slug = 'visual_portfolio_options';
        return unserialize( get_option( $options_slug, 'a:0:{}' ) );
    }
    /**
     * Update option
     *
     * @param mixed $name name of the option.
     * @param mixed $value value of the option.
     */
    public function update_option( $name, $value ) {
        $options_slug = 'visual_portfolio_options';
        $options = self::get_options();
        $options[ self::sanitize_key( $name ) ] = $value;
        update_option( $options_slug, serialize( $options ) );
    }
    /**
     * Get option
     *
     * @param mixed $name name of the option.
     * @param mixed $default default option value.
     *
     * @return mixed
     */
    public function get_option( $name, $default = null ) {
        $options = self::get_options();
        $name = self::sanitize_key( $name );
        return isset( $options[ $name ] ) ? $options[ $name ] : $default;
    }
    /**
     * Sanitize value
     *
     * @param mixed $key value to sanitize.
     *
     * @return mixed
     */
    private function sanitize_key( $key ) {
        return preg_replace( '/[^A-Za-z0-9\_]/i', '', str_replace( array( '-', ':' ), '_', $key ) );
    }


    /**
     * Get all caches
     * $time in seconds
     */
    private function get_caches() {
        $caches_slug = 'cache';
        return $this->get_option( $caches_slug, array() );
    }
    /**
     * Set cache
     *
     * @param mixed $name name of the cache option.
     * @param mixed $value value of the option.
     * @param int   $time time in seconds to cache value.
     */
    public function set_cache( $name, $value, $time = 3600 ) {
        if ( ! $time || $time <= 0 ) {
            return;
        }
        $caches_slug = 'cache';
        $caches = self::get_caches();

        $caches[ self::sanitize_key( $name ) ] = array(
        'value'   => $value,
        'expired' => time() + ( (int) $time ? $time : 0),
        );
        $this->update_option( $caches_slug, $caches );
    }
    /**
     * Get cache
     *
     * @param mixed $name name of the cache option.
     * @param mixed $default default value if there is no cache option.
     *
     * @return mixed
     */
    public function get_cache( $name, $default = null ) {
        $caches = self::get_caches();
        $name = self::sanitize_key( $name );
        return isset( $caches[ $name ]['value'] ) ? $caches[ $name ]['value'] : $default;
    }
    /**
     * Clear selected cache
     *
     * @param mixed $name name of the cache option.
     */
    public function clear_cache( $name ) {
        $caches_slug = 'cache';
        $caches = self::get_caches();
        $name = self::sanitize_key( $name );
        if ( isset( $caches[ $name ] ) ) {
            $caches[ $name ] = null;
            $this->update_option( $caches_slug, $caches );
        }
    }
    /**
     * Clear all expired caches
     */
    public function clear_expired_caches() {
        $caches_slug = 'cache';
        $caches = self::get_caches();
        foreach ( $caches as $k => $cache ) {
            if ( isset( $cache ) && isset( $cache['expired'] ) && $cache['expired'] < time() ) {
                $caches[ $k ] = null;
            }
        }
        $this->update_option( $caches_slug, $caches );
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
