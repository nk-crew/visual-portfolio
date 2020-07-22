<?php
/**
 * Register fake page for portfolio preview.
 *
 * @package @@plugin_name/preview
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Class Visual_Portfolio_Preview
 */
class Visual_Portfolio_Preview {

    /**
     * Preview enabled.
     *
     * @var bool
     */
    public $preview_enabled = false;

    /**
     * Visual_Portfolio_Preview constructor.
     */
    public function __construct() {
        $this->init_hooks();
    }

    /**
     * Hooks.
     */
    public function init_hooks() {
        add_action( 'init', array( $this, 'is_preview_check' ) );
        add_filter( 'pre_handle_404', array( $this, 'pre_handle_404' ) );
        add_filter( 'vpf_get_options', array( $this, 'filter_preview_option' ) );
        add_action( 'init', array( $this, 'flush_rules_preview_frame' ) );
        add_action( 'template_redirect', array( $this, 'template_redirect' ) );

        add_action( 'wp_print_scripts', array( $this, 'localize_scripts' ), 9 );
    }

    /**
     * Localize scripts with preview URL.
     */
    public function localize_scripts() {
        // prepare preview URL.
        global $wp_rewrite;

        $url = get_site_url();

        if ( ! $wp_rewrite->using_permalinks() ) {
            $url = add_query_arg(
                array(
                    'vp_preview' => 'vp_preview',
                ),
                $url
            );
        } else {
            $url .= '/vp_preview';
        }

        wp_localize_script(
            'visual-portfolio-gutenberg',
            'VPAdminGutenbergVariables',
            array(
                'preview_url' => $url,
            )
        );
        wp_localize_script(
            'visual-portfolio-elementor',
            'VPAdminElementorVariables',
            array(
                'preview_url' => $url,
            )
        );
    }

    /**
     * Check if the page is preview.
     */
    public function is_preview_check() {
        // phpcs:disable
        $frame = isset( $_POST['vp_preview_frame'] ) ? esc_attr( wp_unslash( $_POST['vp_preview_frame'] ) ) : false;
        $id    = isset( $_POST['vp_preview_frame_id'] ) ? esc_attr( wp_unslash( $_POST['vp_preview_frame_id'] ) ) : false;

        // Elementor preview.
        if ( ! $frame && ! $id && isset( $_REQUEST['vp_preview_type'] ) && 'elementor' === $_REQUEST['vp_preview_type'] ) {
            $frame = isset( $_REQUEST['vp_preview_frame'] ) ? esc_attr( wp_unslash( $_REQUEST['vp_preview_frame'] ) ) : false;
            $id    = isset( $_REQUEST['vp_preview_frame_id'] ) ? esc_attr( wp_unslash( $_REQUEST['vp_preview_frame_id'] ) ) : false;
        }
        // phpcs:enable

        $this->preview_enabled = 'true' === $frame;

        if ( $this->preview_enabled ) {
            // Tell WP Super Cache & W3 Total Cache to not cache WPReadable requests.
            if ( ! defined( 'DONOTCACHEPAGE' ) ) {
                // phpcs:ignore
                define( 'DONOTCACHEPAGE', true );
            }
        }
    }

    /**
     * Prevent 404 headers if it is vp_preview page.
     *
     * @param bool $val - handle 404 headers.
     *
     * @return bool
     */
    public function pre_handle_404( $val ) {
        if ( $this->preview_enabled ) {
            $val = true;
        }
        return $val;
    }

    /**
     * Disable infinite loading in preview.
     *
     * @param array $options - options.
     *
     * @return array
     */
    public function filter_preview_option( $options ) {
        if ( $this->preview_enabled && isset( $options['pagination'] ) && 'infinite' === $options['pagination'] ) {
            $options['pagination'] = 'load-more';
        }

        return $options;
    }

    /**
     * Register preview 'vp_preview' page tag.
     */
    public function flush_rules_preview_frame() {
        global $wp_rewrite;

        // add rewrite rule that matches /vp_preview .
        add_rewrite_rule( 'vp_preview/?$', 'index.php?vp_preview=vp_preview', 'top' );

        // add rewrite rule that matches /vp_preview/page/2 .
        add_rewrite_rule( "vp_preview/{$wp_rewrite->pagination_base}/([0-9]{1,})/?$", 'index.php?vp_preview=vp_preview&paged=$matches[1]', 'top' );

        // add endpoint, in this case 'vp_preview' to satisfy our rewrite rule /vp_preview .
        add_rewrite_endpoint( 'vp_preview', EP_PERMALINK | EP_PAGES );

        // flush rules to get this to work properly (do this once, then comment out) .
        $wp_rewrite->flush_rules();
    }

    /**
     * Display preview frame
     * Available by requesting:
     * SITE/vp_preview/ with POST data: `vp_preview_frame=true&vp_preview_frame_id=10`
     */
    public function template_redirect() {
        if ( $this->preview_enabled ) {
            $this->print_template();
            exit;
        }
    }

    /**
     * Template of preview page.
     */
    public function print_template() {
        do_action( 'vpf_preview_template' );

        // Hide admin bar.
        add_filter( 'show_admin_bar', '__return_false' );

        // Enqueue assets.
        wp_enqueue_script( 'iframe-resizer-content', visual_portfolio()->plugin_url . 'assets/vendor/iframe-resizer/iframeResizer.contentWindow.min.js', array(), '4.2.10', true );
        wp_enqueue_script( 'visual-portfolio-preview', visual_portfolio()->plugin_url . 'assets/js/preview.js', array( 'jquery', 'iframe-resizer-content' ), '@@plugin_version', true );

        // Post data for script.
        wp_localize_script(
            'visual-portfolio-preview',
            'vp_preview_post_data',
            // phpcs:ignore
            isset( $_POST ) && ! empty( $_POST ) ? $_POST : array()
        );

        $class_name = 'vp-preview-wrapper';

        // preview type.
        // phpcs:ignore
        $type = isset( $_POST['vp_preview_type'] ) ? esc_attr( wp_unslash( $_POST['vp_preview_type'] ) ) : false;

        if ( $type ) {
            $class_name .= ' vp-preview-type-' . $type;
        }

        // Prepare portfolio post options.
        $options = array();

        // phpcs:disable
        if ( isset( $_POST ) && ! empty( $_POST ) ) {
            // phpcs:ignore
            foreach ( $_POST as $name => $val ) {
                if ( strpos( $name, 'vp_' ) === 0 ) {
                    $options[ preg_replace( '/^vp_/', '', $name ) ] = $val;
                }
            }
        }

        // Elementor preview.
        if ( isset( $_REQUEST['vp_preview_type'] ) && 'elementor' === $_REQUEST['vp_preview_type'] && isset( $_REQUEST['vp_preview_frame_id'] ) ) {
            $options[ 'id' ] = esc_attr( wp_unslash( $_REQUEST['vp_preview_frame_id'] ) );
        }
        // phpcs:enable

        // Register assets.
        Visual_Portfolio_Assets::enqueue( $options );

        // Custom styles.
        visual_portfolio()->include_template_style( 'visual-portfolio-preview', 'preview/style', array(), '@@plugin_version' );

        // Output template.
        visual_portfolio()->include_template(
            'preview/preview',
            array(
                'options'    => $options,
                'class_name' => $class_name,
            )
        );
    }
}
