<?php
/**
 * Plugin Name:  Visual Portfolio
 * Description:  Portfolio post type with visual editor
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
        load_plugin_textdomain( '@@text_domain', false, basename( dirname( __FILE__ ) ) . '/languages' );

        // register images sizes.
        $this->add_image_sizes();

        // include helper files.
        $this->include_dependencies();

        // init classes.
        new Visual_Portfolio_Settings();
        new Visual_Portfolio_Rest();
        new Visual_Portfolio_Get();
        new Visual_Portfolio_Shortcode();
        new Visual_Portfolio_Preview();
        new Visual_Portfolio_Admin();
        new Visual_Portfolio_TinyMCE();
        new Visual_Portfolio_VC();
    }

    /**
     * Init hooks
     */
    public function init_hooks() {
        add_action( 'admin_init', array( $this, 'admin_init' ) );

        // template_redirect is used instead of wp_enqueue_scripts just because some plugins use it and included an old isotope plugin. So, it was conflicted.
        add_action( 'template_redirect', array( $this, 'register_scripts' ), 9 );
        add_action( 'wp_enqueue_scripts', array( $this, 'wp_enqueue_scripts' ), 9 );
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
     * Register scripts that will be used in the future when portfolio will be printed.
     */
    public function register_scripts() {
        $vp_deps = array( 'jquery', 'imagesloaded' );
        $vp_style_deps = array();

        // Isotope.
        if ( apply_filters( 'vpf_enqueue_plugin_isotope', true ) ) {
            wp_register_script( 'isotope', visual_portfolio()->plugin_url . 'assets/vendor/isotope/isotope.pkgd.min.js', array( 'jquery' ), '3.0.6', true );

            $vp_deps[] = 'isotope';
        }

        // fjGallery.
        if ( apply_filters( 'vpf_enqueue_plugin_flickr_justified_gallery', true ) ) {
            wp_register_script( 'flickr-justified-gallery', visual_portfolio()->plugin_url . 'assets/vendor/flickr-justified-gallery/fjGallery.min.js', array( 'jquery' ), '1.0.2', true );

            $vp_deps[] = 'flickr-justified-gallery';
        }

        // Object Fit Images.
        if ( apply_filters( 'vpf_enqueue_plugin_object_fit_images', true ) ) {
            wp_register_script( 'object-fit-images', visual_portfolio()->plugin_url . 'assets/vendor/object-fit-images/ofi.min.js', '', '3.2.4', true );

            $vp_deps[] = 'object-fit-images';
        }

        // PhotoSwipe.
        if ( apply_filters( 'vpf_enqueue_plugin_photoswipe', true ) ) {
            wp_register_style( 'photoswipe', visual_portfolio()->plugin_url . 'assets/vendor/photoswipe/photoswipe.css', '', '4.1.3' );
            wp_register_style( 'photoswipe-default-skin', visual_portfolio()->plugin_url . 'assets/vendor/photoswipe/default-skin/default-skin.css', array( 'photoswipe' ), '4.1.3' );
            wp_register_script( 'photoswipe', visual_portfolio()->plugin_url . 'assets/vendor/photoswipe/photoswipe.min.js', '', '4.1.3', true );
            wp_register_script( 'photoswipe-ui-default', visual_portfolio()->plugin_url . 'assets/vendor/photoswipe/photoswipe-ui-default.min.js', array( 'photoswipe' ), '4.1.3', true );

            $vp_deps[] = 'photoswipe-ui-default';
            $vp_style_deps[] = 'photoswipe-default-skin';
        }

        // Swiper.
        if ( apply_filters( 'vpf_enqueue_plugin_swiper', true ) ) {
            wp_register_style( 'swiper', visual_portfolio()->plugin_url . 'assets/vendor/swiper/css/swiper.min.css', '', '4.5.0' );
            wp_register_script( 'swiper', visual_portfolio()->plugin_url . 'assets/vendor/swiper/js/swiper.min.js', '', '4.5.0', true );

            $vp_deps[] = 'swiper';
            $vp_style_deps[] = 'swiper';
        }

        // Font Awesome.
        if ( apply_filters( 'vpf_enqueue_plugin_font_awesome', true ) ) {
            wp_register_script( 'font-awesome-v4-shims', visual_portfolio()->plugin_url . 'assets/vendor/font-awesome/v4-shims.min.js', array(), '5.8.1', true );
            wp_register_script( 'font-awesome', visual_portfolio()->plugin_url . 'assets/vendor/font-awesome/all.min.js', array( 'font-awesome-v4-shims' ), '5.8.1', true );

            $vp_deps[] = 'font-awesome';
        }

        // LazySizes.
        if ( apply_filters( 'vpf_enqueue_plugin_lazysizes', true ) ) {
            wp_register_script( 'lazysizes-object-fit-cover', visual_portfolio()->plugin_url . 'assets/js/lazysizes-object-fit-cover.min.js', array(), '4.1.0', true );
            wp_register_script( 'lazysizes', visual_portfolio()->plugin_url . 'assets/vendor/lazysizes/lazysizes.min.js', array(), '4.1.7', true );

            $vp_deps[] = 'lazysizes-object-fit-cover';
            $vp_deps[] = 'lazysizes';
        }

        // Visual Portfolio.
        wp_register_script( '@@plugin_name', visual_portfolio()->plugin_url . 'assets/js/script.min.js', $vp_deps, '@@plugin_version', true );
        wp_register_style( '@@plugin_name', visual_portfolio()->plugin_url . 'assets/css/style.min.css', $vp_style_deps, '@@plugin_version' );

        // Visual Portfolio data.
        $data_init = array(
            '__' => array(
                'couldnt_retrieve_vp' => esc_attr( 'Couldn\'t retrieve Visual Portfolio ID.', '@@text_domain' ),
                'pswp_close' => esc_attr( 'Close (Esc)', '@@text_domain' ),
                'pswp_share' => esc_attr( 'Share', '@@text_domain' ),
                'pswp_fs' => esc_attr( 'Toggle fullscreen', '@@text_domain' ),
                'pswp_zoom' => esc_attr( 'Zoom in/out', '@@text_domain' ),
                'pswp_prev' => esc_attr( 'Previous (arrow left)', '@@text_domain' ),
                'pswp_next' => esc_attr( 'Next (arrow right)', '@@text_domain' ),
                'pswp_share_fb' => esc_attr( 'Share on Facebook', '@@text_domain' ),
                'pswp_share_tw' => esc_attr( 'Tweet', '@@text_domain' ),
                'pswp_share_pin' => esc_attr( 'Pin it', '@@text_domain' ),
            ),
            'settingsPopupGallery' => array(
                'show_arrows'            => Visual_Portfolio_Settings::get_option( 'show_arrows', 'vp_popup_gallery', true ),
                'show_counter'           => Visual_Portfolio_Settings::get_option( 'show_counter', 'vp_popup_gallery', true ),
                'show_zoom_button'       => Visual_Portfolio_Settings::get_option( 'show_zoom_button', 'vp_popup_gallery', true ),
                'show_fullscreen_button' => Visual_Portfolio_Settings::get_option( 'show_fullscreen_button', 'vp_popup_gallery', true ),
                'show_share_button'      => Visual_Portfolio_Settings::get_option( 'show_share_button', 'vp_popup_gallery', true ),
                'show_close_button'      => Visual_Portfolio_Settings::get_option( 'show_close_button', 'vp_popup_gallery', true ),
            ),
        );
        wp_localize_script( '@@plugin_name', 'VPData', $data_init );
    }

    /**
     * Enqueue main style to prevent first-page load layout issues if the page contains portfolio.
     */
    public function wp_enqueue_scripts() {
        wp_enqueue_style( '@@plugin_name' );
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
     * Add image sizes.
     */
    public function add_image_sizes() {
        // custom image sizes.
        add_image_size( 'vp_sm', 500, 500 );
        add_image_size( 'vp_md', 800, 800 );
        add_image_size( 'vp_lg', 1280, 1280 );
        add_image_size( 'vp_xl', 1920, 1920 );
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
            $sizes, array(
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
        require_once( $this->plugin_path . 'classes/class-extend.php' );
        require_once( $this->plugin_path . 'classes/class-images.php' );
        require_once( $this->plugin_path . 'classes/class-settings.php' );
        require_once( $this->plugin_path . 'classes/class-rest.php' );
        require_once( $this->plugin_path . 'classes/class-get-portfolio.php' );
        require_once( $this->plugin_path . 'classes/class-shortcode.php' );
        require_once( $this->plugin_path . 'classes/class-preview.php' );
        require_once( $this->plugin_path . 'classes/class-admin.php' );
        require_once( $this->plugin_path . 'classes/class-controls.php' );
        require_once( $this->plugin_path . 'classes/class-tinymce.php' );
        require_once( $this->plugin_path . 'classes/class-vc.php' );
        require_once( $this->plugin_path . 'classes/class-migration.php' );
    }

    /**
     * Include template
     *
     * @param string $template_name file name.
     * @param array  $args args for template.
     */
    public function include_template( $template_name, $args = array() ) {
        if ( ! empty( $args ) && is_array( $args ) ) {
	        // phpcs:ignore
            extract( $args );
        }

        // template in theme folder.
        $template = locate_template( array( '/visual-portfolio/' . $template_name . '.php' ) );

        // default template.
        if ( ! $template ) {
            $template = $this->plugin_path . 'templates/' . $template_name . '.php';
        }

        // Allow 3rd party plugin filter template file from their plugin.
        $template = apply_filters( 'vpf_include_template', $template, $template_name, $args );

        if ( file_exists( $template ) ) {
            include $template;
        }
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
        $template = '';

        if ( file_exists( get_stylesheet_directory() . '/visual-portfolio/' . $template_name . '.css' ) ) {
            // Child Theme (or just theme).
            $template = trailingslashit( get_stylesheet_directory_uri() ) . 'visual-portfolio/' . $template_name . '.css';
        } else if ( file_exists( get_template_directory() . '/visual-portfolio/' . $template_name . '.css' ) ) {
            // Parent Theme (if parent exists).
            $template = trailingslashit( get_template_directory_uri() ) . 'visual-portfolio/' . $template_name . '.css';
        } else if ( file_exists( $this->plugin_path . 'templates/' . $template_name . '.css' ) ) {
            // Default file in plugin folder.
            $template = $this->plugin_url . 'templates/' . $template_name . '.css';
        }

        // Allow 3rd party plugin filter template file from their plugin.
        $template = apply_filters( 'vpf_include_template_style', $template, $template_name, $deps, $ver, $media );

        if ( $template ) {
            wp_enqueue_style( $handle, $template, $deps, $ver, $media );
        }
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
        if ( function_exists( '_wp_oembed_get_object' ) ) {
            require_once( ABSPATH . WPINC . '/class-oembed.php' );
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

        $oembed = _wp_oembed_get_object();
        $provider = $oembed->get_provider( $url, $args );
        $data = $oembed->fetch( $provider, $url, $args );

        if ( $data ) {
            $data = (array) $data;
            if ( ! isset( $data['url'] ) ) {
                $data['url'] = $url;
            }
            if ( ! isset( $data['provider'] ) ) {
                $data['provider'] = $provider;
            }
            // Convert url to hostname, eg: "youtube" instead of "https://youtube.com/".
            $data['provider-name'] = pathinfo( str_replace( array( 'www.' ), '', parse_url( $url, PHP_URL_HOST ) ), PATHINFO_FILENAME );
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
