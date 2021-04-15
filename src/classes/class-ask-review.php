<?php
/**
 * Ask Review Notice.
 *
 * @package @@plugin_name
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Class Visual_Portfolio_Ask_Review_Notice
 */
class Visual_Portfolio_Ask_Review_Notice {
    /**
     * Option name.
     *
     * @var string
     */
    public $option_name = 'vpf_ask_review_notice';

    /**
     * Visual_Portfolio_Ask_Review_Notice constructor.
     */
    public function __construct() {
        add_action( 'admin_notices', array( $this, 'admin_notices' ) );
        add_action( 'admin_enqueue_scripts', array( $this, 'admin_enqueue_scripts' ) );
        add_action( 'wp_ajax_vpf_dismiss_ask_review_notice', array( $this, 'ajax_vpf_dismiss_ask_review_notice' ) );
    }

    /**
     * Check if we can display notice.
     */
    public function is_notice_allowed() {
        $state = get_site_option( $this->option_name . '_state' );
        $time  = (int) get_site_option( $this->option_name . '_time' );

        if ( 'yes' === $state || 'already' === $state ) {
            return false;
        }

        // Save current time if nothing saved.
        if ( ! $time ) {
            $time = time();
            update_site_option( $this->option_name . '_time', $time );
        }

        // Allow notice if plugin used for more then 2 weeks.
        if ( $time < strtotime( '-14 days' ) ) {
            return true;
        }

        return false;
    }

    /**
     * Display admin notice if needed.
     */
    public function admin_notices() {
        if ( ! $this->is_notice_allowed() ) {
            return;
        }

        $message = '<p>';

        // Translators: placeholder is the plugin name.
        $message .= sprintf( esc_html__( 'Hey, we noticed you\'ve been using %s for more than two weeks now – that\'s awesome!', '@@text_domain' ), '<strong>' . _x( 'Visual Portfolio', 'plugin name inside the review notice', '@@text_domain' ) . '</strong>' );
        $message .= '<br>';

        $message .= esc_html__( 'Could you please do us a BIG favor and give it a rating on WordPress.org to help us spread the word and boost our motivation?', '@@text_domain' ) . '</p>
            <p>
                <a href="https://wordpress.org/support/plugin/visual-portfolio/reviews/?filter=5#new-post" class="vpf-review-plugin-notice-dismiss" data-vpf-review-action="yes" target="_blank" rel="noopener noreferrer"><strong>' . esc_html__( 'Yes, you deserve it', '@@text_domain' ) . '</strong></a><br>
                <a href="#" class="vpf-review-plugin-notice-dismiss" data-vpf-review-action="later">' . esc_html__( 'No, maybe later', '@@text_domain' ) . '</a><br>
                <a href="#" class="vpf-review-plugin-notice-dismiss" data-vpf-review-action="already">' . esc_html__( 'I already did', '@@text_domain' ) . '</a>
            </p>';

        ?>
        <div class="notice notice-info" id="vpf-review-plugin-notice">
            <?php
            // phpcs:ignore
            echo $message;
            ?>
        </div>
        <?php
    }

    /**
     * Enqueue script.
     */
    public function admin_enqueue_scripts() {
        if ( is_customize_preview() ) {
            return;
        }

        wp_enqueue_script( 'visual-portfolio-ask-review-notice', visual_portfolio()->plugin_url . 'assets/admin/js/ask-review-notice.min.js', array( 'jquery' ), '@@plugin_version', true );
        wp_localize_script(
            'visual-portfolio-ask-review-notice',
            'VPAskReviewNotice',
            array(
                'nonce' => wp_create_nonce( $this->option_name ),
            )
        );
    }

    /**
     * Handles Ajax request to persist notices dismissal.
     * Uses check_ajax_referer to verify nonce.
     */
    public function ajax_vpf_dismiss_ask_review_notice() {
        check_ajax_referer( $this->option_name, 'nonce' );

        $type = isset( $_POST['type'] ) ? sanitize_text_field( wp_unslash( $_POST['type'] ) ) : 'yes';

        update_site_option( $this->option_name . '_state', $type );

        // Update time if user clicked "No, maybe later" button.
        if ( 'later' === $type ) {
            $time = time();
            update_site_option( $this->option_name . '_time', $time );
        }

        wp_die();
    }
}

new Visual_Portfolio_Ask_Review_Notice();
