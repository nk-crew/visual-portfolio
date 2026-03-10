<?php
/**
 * Welcome Screen.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Visual_Portfolio_Welcome_Screen
 */
class Visual_Portfolio_Welcome_Screen {
	/**
	 * Get feature cards for the welcome screen.
	 *
	 * @return array
	 */
	private function get_feature_cards() {
		return array(
			array(
				'title'       => esc_html__( 'Visual gallery builder', 'visual-portfolio' ),
				'description' => esc_html__( 'Create galleries, portfolios, and post grids visually in Gutenberg with live preview and flexible controls.', 'visual-portfolio' ),
			),
			array(
				'title'       => esc_html__( 'Flexible layouts and styles', 'visual-portfolio' ),
				'description' => esc_html__( 'Mix grid, masonry, justified, slider, and tiles layouts with polished hover styles for different creative workflows.', 'visual-portfolio' ),
			),
			array(
				'title'       => esc_html__( 'Dynamic query builder', 'visual-portfolio' ),
				'description' => esc_html__( 'Display portfolio items, blog posts, or any post type and filter them by taxonomy, author, date, and more.', 'visual-portfolio' ),
			),
			array(
				'title'       => esc_html__( 'Fast by design', 'visual-portfolio' ),
				'description' => esc_html__( 'Assets are loaded only where needed, so galleries stay lightweight and feel native on the front end.', 'visual-portfolio' ),
			),
			array(
				'title'       => esc_html__( 'Advanced media experience', 'visual-portfolio' ),
				'description' => esc_html__( 'Present images, videos, and audio in one portfolio with responsive lightbox behavior and touch-friendly navigation.', 'visual-portfolio' ),
			),
			array(
				'title'       => esc_html__( 'Filtering, sorting, and pagination', 'visual-portfolio' ),
				'description' => esc_html__( 'Help visitors explore larger collections with category filters, sort controls, load more, and infinite scrolling.', 'visual-portfolio' ),
			),
		);
	}

	/**
	 * Get Pro feature highlights.
	 *
	 * @return array
	 */
	private function get_pro_highlights() {
		return array(
			esc_html__( 'Social feeds integrations', 'visual-portfolio' ),
			esc_html__( 'Proofing and client-friendly workflows', 'visual-portfolio' ),
			esc_html__( 'Watermarks, age gate, and right click protection', 'visual-portfolio' ),
			esc_html__( 'Popup deep linking for shareable views', 'visual-portfolio' ),
			esc_html__( 'Popup support for posts and pages', 'visual-portfolio' ),
			esc_html__( 'Custom hover images, filters, and extra visual effects', 'visual-portfolio' ),
			esc_html__( 'AJAX search, cache, and advanced query controls', 'visual-portfolio' ),
			esc_html__( 'White label and developer-friendly extensibility', 'visual-portfolio' ),
		);
	}

	/**
	 * Visual_Portfolio_Welcome_Screen constructor.
	 */
	public function __construct() {
		add_action( 'admin_init', array( $this, 'redirect_to_welcome_screen' ) );
		add_action( 'admin_menu', array( $this, 'welcome_screen_page' ) );
		add_action( 'admin_head', array( $this, 'welcome_screen_remove_page' ) );
	}

	/**
	 * Redirect to Welcome page after activation.
	 */
	public function redirect_to_welcome_screen() {
		// Bail if no activation redirect.
		if ( ! get_transient( '_visual_portfolio_welcome_screen_activation_redirect' ) ) {
			return;
		}

		// Delete the redirect transient.
		delete_transient( '_visual_portfolio_welcome_screen_activation_redirect' );

		// Bail if activating from network, or bulk.
        // phpcs:ignore WordPress.Security.NonceVerification.Recommended
		if ( is_network_admin() || isset( $_GET['activate-multi'] ) ) {
			return;
		}

		// Redirect to welcome page.
		wp_safe_redirect( add_query_arg( array( 'page' => 'visual-portfolio-welcome' ), admin_url( Visual_Portfolio_Custom_Post_Type::get_menu_slug() ) ) );
	}

	/**
	 * Add welcome screen page.
	 */
	public function welcome_screen_page() {
		add_submenu_page(
			Visual_Portfolio_Custom_Post_Type::get_menu_slug(),
			esc_html__( 'Visual Portfolio Welcome Screen', 'visual-portfolio' ),
			esc_html__( 'Visual Portfolio Welcome Screen', 'visual-portfolio' ),
			'manage_options',
			'visual-portfolio-welcome',
			array( $this, 'welcome_screen_page_content' )
		);
	}

	/**
	 * Remove welcome screen page from admin menu.
	 */
	public function welcome_screen_remove_page() {
		remove_submenu_page( Visual_Portfolio_Custom_Post_Type::get_menu_slug(), 'visual-portfolio-welcome' );
	}

	/**
	 * Add welcome screen page content.
	 */
	public function welcome_screen_page_content() {
		$is_pro_context = visual_portfolio()->is_pro();
		$feature_cards  = $this->get_feature_cards();
		$pro_highlights = $this->get_pro_highlights();

		if ( function_exists( 'print_emoji_detection_script' ) ) {
			print_emoji_detection_script();
		}
		$go_pro_links = array(
			'head'          => Visual_Portfolio_Admin::get_plugin_site_url(
				array(
					'utm_medium'   => 'welcome_page',
					'utm_campaign' => 'go_pro_head',
				)
			),
			'more_features' => Visual_Portfolio_Admin::get_plugin_site_url(
				array(
					'sub_path'     => '',
					'utm_medium'   => 'welcome_page',
					'utm_campaign' => 'more_features',
				)
			),
			'docs'          => Visual_Portfolio_Admin::get_plugin_site_url(
				array(
					'sub_path'     => 'docs/getting-started',
					'utm_medium'   => 'welcome_page',
					'utm_campaign' => 'docs',
				)
			),
			'foot'          => Visual_Portfolio_Admin::get_plugin_site_url(
				array(
					'utm_medium'   => 'settings_page',
					'utm_campaign' => 'go_pro_foot',
				)
			),
		);
		?>
		<div class="vpf-welcome-screen <?php echo $is_pro_context ? 'is-pro-context' : 'is-free-context'; ?>">
			<div class="vpf-welcome-head">
				<div class="vpf-welcome-head-inner">
					<div class="vpf-welcome-head-label">
						<?php
						echo $is_pro_context
							? esc_html__( 'Included with Pro', 'visual-portfolio' )
							: esc_html__( 'Free version active', 'visual-portfolio' );
						?>
					</div>
					<h2 class="vpf-welcome-head-title">
						<?php
						echo $is_pro_context
							? esc_html__( 'You already have access to premium portfolio tools.', 'visual-portfolio' )
							: esc_html__( 'Build a modern portfolio experience in WordPress.', 'visual-portfolio' );
						?>
					</h2>
					<div class="vpf-welcome-subtitle">
						<?php
						echo $is_pro_context
							? esc_html__( 'Use this screen as a quick overview of the core workflows and the premium advantages already unlocked in your setup.', 'visual-portfolio' )
							: esc_html__( 'Create galleries, post grids, and polished portfolio layouts with a workflow that stays visual from setup to launch.', 'visual-portfolio' );
						?>
					</div>

					<div class="vpf-welcome-content-buttons">
						<?php if ( ! $is_pro_context ) { ?>
							<a class="is-primary" target="_blank" rel="noopener noreferrer" href="<?php echo esc_url( $go_pro_links['more_features'] ); ?>"><?php echo esc_html__( 'Compare Free vs Pro', 'visual-portfolio' ); ?></a>
						<?php } ?>
						<a class="<?php echo $is_pro_context ? 'is-primary' : 'is-secondary'; ?>" target="_blank" rel="noopener noreferrer" href="<?php echo esc_url( $go_pro_links['docs'] ); ?>"><?php echo esc_html__( 'Documentation', 'visual-portfolio' ); ?></a>
					</div>
				</div>
			</div>

			<div class="vpf-welcome-content">
				<ul class="vpf-welcome-content-features">
					<?php foreach ( $feature_cards as $index => $feature_card ) { ?>
						<li>
							<span><?php echo esc_html( str_pad( (string) ( $index + 1 ), 2, '0', STR_PAD_LEFT ) ); ?></span>
							<strong><?php echo esc_html( $feature_card['title'] ); ?></strong>
							<p><?php echo esc_html( $feature_card['description'] ); ?></p>
						</li>
					<?php } ?>
				</ul>
			</div>

			<div class="vpf-welcome-foot-pro-info">
				<h2>
					<?php
					echo $is_pro_context
						? esc_html__( 'Your Pro advantages', 'visual-portfolio' )
						: esc_html__( 'Need more advanced portfolio tools?', 'visual-portfolio' );
					?>
				</h2>
				<p class="vpf-welcome-foot-description">
					<?php
					echo $is_pro_context
						? esc_html__( 'These premium capabilities are already included because you are using Visual Portfolio Pro.', 'visual-portfolio' )
						: esc_html__( 'Pro expands the same workflow with features aimed at client work, content protection, social sources, and deeper customization.', 'visual-portfolio' );
					?>
				</p>
				<ul>
					<?php foreach ( $pro_highlights as $pro_highlight ) { ?>
						<li><?php echo esc_html( $pro_highlight ); ?></li>
					<?php } ?>
				</ul>
				<?php if ( ! $is_pro_context ) { ?>
					<a target="_blank" rel="noopener noreferrer" href="<?php echo esc_url( $go_pro_links['head'] ); ?>"><?php echo esc_html__( 'See Pro details', 'visual-portfolio' ); ?></a>
				<?php } ?>
			</div>
		</div>
		<?php
	}
}

new Visual_Portfolio_Welcome_Screen();
