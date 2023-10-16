<?php
/**
 * Ask Review Notice.
 *
 * @package visual-portfolio
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
		?>
		<div class="notice notice-info vpf-admin-notice" id="vpf-review-plugin-notice">
			<div class="vpf-admin-notice-icon">
				<i class="dashicons-visual-portfolio"></i>
			</div>
			<div class="vpf-admin-notice-content">
				<h3><?php esc_html_e( 'Satisfied using Visual Portfolio?', 'visual-portfolio' ); ?></h3>
				<p>
					<?php
						// translators: %s - Plugin name.
						echo wp_kses_post( sprintf( __( 'Hey, we noticed you\'ve been using %s for more than two weeks now – that\'s awesome!', 'visual-portfolio' ), '<strong>' . _x( 'Visual Portfolio', 'plugin name inside the review notice', 'visual-portfolio' ) . '</strong>' ) );
					?>
					<br>
					<?php esc_html_e( 'Could you please do us a BIG favor and give it a rating on WordPress.org to help us spread the word and boost our motivation?', 'visual-portfolio' ); ?>
				</p>
				<p>
					<a href="https://wordpress.org/support/plugin/visual-portfolio/reviews/?filter=5#new-post" class="vpf-review-plugin-notice-dismiss" data-vpf-review-action="yes" target="_blank" rel="noopener noreferrer">
						<strong>
							<?php esc_html_e( 'Yes, you deserve it', 'visual-portfolio' ); ?>
						</strong>
					</a>
					<br>
					<a href="#" class="vpf-review-plugin-notice-dismiss" data-vpf-review-action="later">
						<?php esc_html_e( 'No, maybe later', 'visual-portfolio' ); ?>
					</a><br>
					<a href="#" class="vpf-review-plugin-notice-dismiss" data-vpf-review-action="already">
						<?php esc_html_e( 'I already did', 'visual-portfolio' ); ?>
					</a>
				</p>
			</div>
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

		Visual_Portfolio_Assets::enqueue_script( 'visual-portfolio-ask-review-notice', 'build/assets/admin/js/ask-review-notice' );
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
