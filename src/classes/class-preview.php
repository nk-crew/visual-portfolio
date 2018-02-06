<?php
/**
 * Register fake page for portfolio preview.
 *
 * @package visual-portfolio/preview
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
        add_filter( 'query_vars', array( $this, 'add_wp_var' ) );
        add_filter( 'pre_handle_404', array( $this, 'pre_handle_404' ) );
        add_filter( 'vp_get_option', array( $this, 'filter_preview_option' ), 10, 2 );
        add_action( 'init', array( $this, 'flush_rules_preview_frame' ) );
        add_action( 'template_redirect', array( $this, 'template_redirect' ) );
    }

    /**
     * Register custom query vars
     *
     * @param array $public_query_vars - query vars.
     *
     * @return array
     */
    public static function add_wp_var( $public_query_vars ) {
        $public_query_vars[] = 'vp_preview';
        $public_query_vars[] = 'vp_preview_frame';
        $public_query_vars[] = 'vp_preview_frame_id';
        return $public_query_vars;
    }

    /**
     * Prevent 404 headers if it is vp_preview page.
     *
     * @param bool $val - handle 404 headers.
     *
     * @return bool
     */
    public static function pre_handle_404( $val ) {
        $frame = get_query_var( 'vp_preview_frame' );
        $id = get_query_var( 'vp_preview_frame_id' );
        $pagename = get_query_var( 'vp_preview' );

        if ( 'vp_preview' === $pagename && 'true' === $frame && $id ) {
            $val = true;
        }
        return $val;
    }

    /**
     * Change
     *
     * @param mixed  $val - value of the option.
     * @param string $name - name of the option.
     */
    public function filter_preview_option( $val, $name ) {
        if ( $this->preview_enabled ) {
            // @codingStandardsIgnoreStart
            if ( isset( $_POST[ $name ] ) ) {
                if ( is_array( $_POST[ $name ] ) ) {
                    $val = array_map( 'sanitize_text_field', wp_unslash( $_POST[ $name ] ) );
                } else if ( 'vp_custom_css' === $name ) {
                    $val = wp_kses( wp_unslash( $_POST[ $name ] ), array( '\'', '\"' ) );
                } else {
                    $val = sanitize_text_field( wp_unslash( $_POST[ $name ] ) );
                }
            }
            // @codingStandardsIgnoreEnd
        }

        return $val;
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
     * SITE/vp_preview/?vp_preview_frame=true&vp_preview_frame_id=10
     */
    public function template_redirect() {
        $frame = get_query_var( 'vp_preview_frame' );
        $id = get_query_var( 'vp_preview_frame_id' );
        $pagename = get_query_var( 'vp_preview' );

        if ( 'vp_preview' === $pagename && 'true' === $frame && $id ) {
            $this->print_template( $id );
            exit;
        }
    }

    /**
     * Template of preview page.
     *
     * @param int $id - visual portfolio shortcode id.
     */
    public function print_template( $id ) {
        $this->preview_enabled = true;
        wp_enqueue_script( 'iframe-resizer-content', visual_portfolio()->plugin_url . 'assets/vendor/iframe-resizer/iframeResizer.contentWindow.min.js', '', '', true );
        wp_enqueue_script( 'visual-portfolio-preview', visual_portfolio()->plugin_url . 'assets/js/script-preview.js', array( 'jquery' ), '', true );
        ?>
        <!DOCTYPE html>
        <html <?php language_attributes(); ?> style="margin-top: 0 !important;">
            <head>
                <meta name="viewport" content="width=device-width">

                <?php wp_head(); ?>

                <style type="text/css">
                    html,
                    body {
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    body {
                        background-color: #fff;
                    }
                    body:before {
                        content: none !important;
                    }
                    #wpadminbar {
                        display: none; <?php // @codingStandardsIgnoreLine ?>
                    }
                    #vp_preview {
                        position: relative;
                        z-index: 99999;
                    }
                    .vp-portfolio {
                        margin-top: 0;
                        margin-bottom: 0;
                    }
                </style>
            </head>

            <body>
                <div id="vp_preview">
                    <?php
                        // @codingStandardsIgnoreLine
                        echo Visual_Portfolio_Get::get( array( 'id' => $id ) );
                    ?>
                </div>

                <?php wp_footer(); ?>
            </body>
        </html>
        <?php
    }
}
