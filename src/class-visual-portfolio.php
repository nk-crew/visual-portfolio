<?php
/**
 * Plugin Name:  Visual Portfolio, Posts & Image Gallery
 * Description:  Modern gallery and portfolio plugin with advanced layouts editor. Clean and powerful gallery styles with enormous settings in the Gutenberg block.
 * Version:      @@plugin_version
 * Author:       nK
 * Author URI:   https://nkdev.info
 * License:      GPLv2 or later
 * License URI:  https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:  @@text_domain
 *
 * @package @@plugin_name
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Visual Portfolio Class
 */
class Visual_Portfolio {
    /**
     * The single class instance.
     *
     * @var $instance
     */
    private static $instance = null;

    /**
     * Main Instance
     * Ensures only one instance of this class exists in memory at any one time.
     */
    public static function instance() {
        if ( is_null( self::$instance ) ) {
            self::$instance = new self();
            self::$instance->init();
        }
        return self::$instance;
    }

    /**
     * Basename of plugin main file
     *
     * @var $plugin_basename
     */
    public $plugin_basename;

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
     * Path to the pro plugin directory
     *
     * @var $plugin_path
     */
    public $pro_plugin_path;

    /**
     * URL to the pro plugin directory
     *
     * @var $plugin_url
     */
    public $pro_plugin_url;

    /**
     * Visual_Portfolio constructor.
     */
    public function __construct() {
        /* We do nothing here! */
    }

    /**
     * Init options
     */
    public function init() {
        $this->plugin_basename = plugin_basename( __FILE__ );
        $this->plugin_path     = plugin_dir_path( __FILE__ );
        $this->plugin_url      = plugin_dir_url( __FILE__ );

        if ( function_exists( 'visual_portfolio_pro' ) ) {
            $this->pro_plugin_path = plugin_dir_path( WP_PLUGIN_DIR . '/visual-portfolio-pro/class-visual-portfolio-pro.php' );
            $this->pro_plugin_url  = plugin_dir_url( WP_PLUGIN_DIR . '/visual-portfolio-pro/class-visual-portfolio-pro.php' );
        }

        // load textdomain.
        load_plugin_textdomain( '@@text_domain', false, basename( dirname( __FILE__ ) ) . '/languages' );

        // include helper files.
        $this->include_dependencies();

        // register images sizes.
        $this->add_image_sizes();
    }

    /**
     * Activation Hook
     */
    public function activation_hook() {
        flush_rewrite_rules();
    }

    /**
     * Deactivation Hook
     */
    public function deactivation_hook() {
        flush_rewrite_rules();
    }

    /**
     * Add image sizes.
     */
    public function add_image_sizes() {
        $sm       = Visual_Portfolio_Settings::get_option( 'sm', 'vp_images' );
        $md       = Visual_Portfolio_Settings::get_option( 'md', 'vp_images' );
        $lg       = Visual_Portfolio_Settings::get_option( 'lg', 'vp_images' );
        $xl       = Visual_Portfolio_Settings::get_option( 'xl', 'vp_images' );
        $sm_popup = Visual_Portfolio_Settings::get_option( 'sm_popup', 'vp_images' );
        $md_popup = Visual_Portfolio_Settings::get_option( 'md_popup', 'vp_images' );
        $xl_popup = Visual_Portfolio_Settings::get_option( 'xl_popup', 'vp_images' );

        // custom image sizes.
        add_image_size( 'vp_sm', $sm, 9999 );
        add_image_size( 'vp_md', $md, 9999 );
        add_image_size( 'vp_lg', $lg, 9999 );
        add_image_size( 'vp_xl', $xl, 9999 );
        add_image_size( 'vp_sm_popup', $sm_popup, 9999 );
        add_image_size( 'vp_md_popup', $md_popup, 9999 );
        add_image_size( 'vp_xl_popup', $xl_popup, 9999 );

        add_filter( 'image_size_names_choose', array( $this, 'image_size_names_choose' ) );
    }

    /**
     * Custom image sizes
     *
     * @param array $sizes - registered image sizes.
     *
     * @return array
     */
    public function image_size_names_choose( $sizes ) {
        return array_merge(
            $sizes,
            array(
                'vp_sm' => esc_html__( 'Small (VP)', '@@text_domain' ),
                'vp_md' => esc_html__( 'Medium (VP)', '@@text_domain' ),
                'vp_lg' => esc_html__( 'Large (VP)', '@@text_domain' ),
                'vp_xl' => esc_html__( 'Extra Large (VP)', '@@text_domain' ),
            )
        );
    }

    /**
     * Include dependencies
     */
    private function include_dependencies() {
        // Deprecations run before all features.
        require_once $this->plugin_path . 'classes/class-deprecated.php';

        require_once $this->plugin_path . 'gutenberg/utils/control-condition-check/index.php';
        require_once $this->plugin_path . 'gutenberg/utils/control-get-value/index.php';
        require_once $this->plugin_path . 'gutenberg/utils/controls-dynamic-css/index.php';
        require_once $this->plugin_path . 'classes/class-templates.php';
        require_once $this->plugin_path . 'classes/class-parse-blocks.php';
        require_once $this->plugin_path . 'classes/class-assets.php';
        require_once $this->plugin_path . 'classes/class-images.php';
        require_once $this->plugin_path . 'classes/class-settings.php';
        require_once $this->plugin_path . 'classes/class-rest.php';
        require_once $this->plugin_path . 'classes/class-get-portfolio.php';
        require_once $this->plugin_path . 'classes/class-gutenberg.php';
        require_once $this->plugin_path . 'classes/class-gutenberg-saved.php';
        require_once $this->plugin_path . 'classes/class-shortcode.php';
        require_once $this->plugin_path . 'classes/class-preview.php';
        require_once $this->plugin_path . 'classes/class-custom-post-type.php';
        require_once $this->plugin_path . 'classes/class-custom-post-meta.php';
        require_once $this->plugin_path . 'classes/class-admin.php';
        require_once $this->plugin_path . 'classes/class-controls.php';
        require_once $this->plugin_path . 'classes/class-tinymce.php';
        require_once $this->plugin_path . 'classes/class-vc.php';
        require_once $this->plugin_path . 'classes/class-elementor.php';
        require_once $this->plugin_path . 'classes/class-supported-themes.php';
        require_once $this->plugin_path . 'classes/class-breakpoints.php';
        require_once $this->plugin_path . 'classes/class-wpml.php';

        // Migration run after all features.
        require_once $this->plugin_path . 'classes/class-migration.php';
    }

    /**
     * Include template
     *
     * @param string $template_name file name.
     * @param array  $args args for template.
     */
    public function include_template( $template_name, $args = array() ) {
        Visual_Portfolio_Templates::include_template( $template_name, $args );
    }

    /**
     * Find css template file
     *
     * @param string $template_name file name.
     *
     * @return string
     */
    public function find_template_styles( $template_name ) {
        return Visual_Portfolio_Templates::find_template_styles( $template_name );
    }

    /**
     * Include template style
     *
     * @param string           $handle style handle name.
     * @param string           $template_name file name.
     * @param array            $deps dependencies array.
     * @param string|bool|null $ver version string.
     * @param string           $media media string.
     */
    public function include_template_style( $handle, $template_name, $deps = array(), $ver = false, $media = 'all' ) {
        Visual_Portfolio_Templates::include_template_style( $handle, $template_name, $deps, $ver, $media );
    }

    /**
     * Get oEmbed data
     *
     * @param string $url - url of oembed.
     * @param int    $width - width of oembed.
     * @param int    $height - height of oembed.
     *
     * @return array|bool|false|object
     */
    public function get_oembed_data( $url, $width = null, $height = null ) {
        $cache_name = 'vp_oembed_data_' . $url . ( $width ? $width : '' ) . ( $height ? $height : '' );
        $cached     = get_transient( $cache_name );

        if ( $cached ) {
            return $cached;
        }

        if ( function_exists( '_wp_oembed_get_object' ) ) {
            require_once ABSPATH . WPINC . '/class-oembed.php';
        }

        $args = array();
        if ( $width ) {
            $args['width'] = $width;
        }
        if ( $height ) {
            $args['height'] = $height;
        }

        // If height is not given, but the width is, use 1080p aspect ratio. And vice versa.
        if ( $width && ! $height ) {
            $args['height'] = $width * ( 1080 / 1920 );
        }
        if ( ! $width && $height ) {
            $args['width'] = $height * ( 1920 / 1080 );
        }

        $oembed   = _wp_oembed_get_object();
        $provider = $oembed->get_provider( $url, $args );
        $data     = $oembed->fetch( $provider, $url, $args );

        if ( $data ) {
            $data = (array) $data;
            if ( ! isset( $data['url'] ) ) {
                $data['url'] = $url;
            }
            if ( ! isset( $data['provider'] ) ) {
                $data['provider'] = $provider;
            }

            // Convert url to hostname, eg: "youtube" instead of "https://youtube.com/".
            $data['provider-name'] = pathinfo( str_replace( array( 'www.' ), '', wp_parse_url( $url, PHP_URL_HOST ) ), PATHINFO_FILENAME );

            // save cache.
            set_transient( $cache_name, $data, DAY_IN_SECONDS );

            return $data;
        }

        return false;
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

register_deactivation_hook( __FILE__, array( visual_portfolio(), 'activation_hook' ) );
register_activation_hook( __FILE__, array( visual_portfolio(), 'deactivation_hook' ) );
