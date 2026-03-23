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
	 * Get context specific copy for the welcome screen.
	 *
	 * @param bool $is_pro_context Whether Pro is active.
	 *
	 * @return array
	 */
	private function get_context_copy( $is_pro_context ) {
		if ( $is_pro_context ) {
			return array(
				'head_label'               => esc_html__( 'Visual Portfolio Pro active', 'visual-portfolio' ),
				'head_title'               => esc_html__( 'Your premium portfolio features are already unlocked.', 'visual-portfolio' ),
				'head_subtitle'            => esc_html__( 'Use the same visual workflow for galleries, post grids, and portfolio layouts, now with the additional Pro features already available on this site.', 'visual-portfolio' ),
				'feature_section_title'    => esc_html__( 'Core workflow included in Pro', 'visual-portfolio' ),
				'feature_section_subtitle' => esc_html__( 'These are the essential Visual Portfolio building blocks you can use across both free and Pro setups.', 'visual-portfolio' ),
				'pro_section_title'        => esc_html__( 'Advantages already included with Pro', 'visual-portfolio' ),
				'pro_section_subtitle'     => esc_html__( 'These premium capabilities are already enabled because you are using Visual Portfolio Pro.', 'visual-portfolio' ),
			);
		}

		return array(
			'head_label'               => esc_html__( 'Free version active', 'visual-portfolio' ),
			'head_title'               => esc_html__( 'Build a modern portfolio experience in WordPress.', 'visual-portfolio' ),
			'head_subtitle'            => esc_html__( 'Create galleries, post grids, and polished portfolio layouts with a workflow that stays visual from setup to launch.', 'visual-portfolio' ),
			'feature_section_title'    => esc_html__( 'Everything you can build right away', 'visual-portfolio' ),
			'feature_section_subtitle' => esc_html__( 'Start with the core Visual Portfolio workflow and expand later only if your projects need more advanced features.', 'visual-portfolio' ),
			'pro_section_title'        => esc_html__( 'Need more advanced portfolio features?', 'visual-portfolio' ),
			'pro_section_subtitle'     => esc_html__( 'Pro expands the same workflow with features aimed at client work, content protection, social sources, and deeper customization.', 'visual-portfolio' ),
		);
	}

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
			array(
				'title'       => esc_html__( 'Video items', 'visual-portfolio' ),
				'description' => esc_html__( 'Add video items to image galleries and post grids, then autoplay them on open or trigger playback on hover.', 'visual-portfolio' ),
			),
			array(
				'title'       => esc_html__( 'Albums and gallery format', 'visual-portfolio' ),
				'description' => esc_html__( 'Build nested galleries and output album-style content across image galleries, posts, and taxonomy grids.', 'visual-portfolio' ),
			),
			array(
				'title'       => esc_html__( 'Taxonomy grids', 'visual-portfolio' ),
				'description' => esc_html__( 'Use taxonomy terms as a dedicated gallery source and turn categories, tags, or custom taxonomies into visual grids.', 'visual-portfolio' ),
			),
			array(
				'title'       => esc_html__( 'Proofing workflows', 'visual-portfolio' ),
				'description' => esc_html__( 'Collaborate with clients on image selections and benefit from self-healing proofing permalinks.', 'visual-portfolio' ),
			),
			array(
				'title'       => esc_html__( 'Content protection', 'visual-portfolio' ),
				'description' => esc_html__( 'Protect galleries with watermarks, age gate rules, and right click protection.', 'visual-portfolio' ),
			),
			array(
				'title'       => esc_html__( 'Advanced popups', 'visual-portfolio' ),
				'description' => esc_html__( 'Use deep linking and open posts or pages in popups alongside your media galleries.', 'visual-portfolio' ),
			),
			array(
				'title'       => esc_html__( 'Social sources and query controls', 'visual-portfolio' ),
				'description' => esc_html__( 'Extend projects with social feeds, advanced query controls, and AJAX-driven performance improvements.', 'visual-portfolio' ),
			),
			array(
				'title'       => esc_html__( 'Branding and effects', 'visual-portfolio' ),
				'description' => esc_html__( 'Unlock hover images, extra visual effects, white label options, and developer-friendly extensibility.', 'visual-portfolio' ),
			),
			array(
				'title'       => esc_html__( 'And more...', 'visual-portfolio' ),
				'description' => esc_html__( 'Get access to many more Pro features for layout control, client work, integrations, performance, and advanced customization.', 'visual-portfolio' ),
			),
		);
	}

	/**
	 * Render Pro highlights section.
	 *
	 * @param array  $copy             Context specific copy.
	 * @param array  $pro_highlights   Pro highlight list.
	 * @param string $cta_link         Optional CTA link.
	 * @param string $cta_label        Optional CTA label.
	 *
	 * @return void
	 */
	private function render_pro_highlights_section( $copy, $pro_highlights, $cta_link = '', $cta_label = '' ) {
		?>
		<div class="vpf-welcome-foot-pro-info">
			<h2><?php echo esc_html( $copy['pro_section_title'] ); ?></h2>
			<p class="vpf-welcome-foot-description"><?php echo esc_html( $copy['pro_section_subtitle'] ); ?></p>
			<ul>
				<?php foreach ( $pro_highlights as $pro_highlight ) { ?>
					<li>
						<strong><?php echo esc_html( $pro_highlight['title'] ); ?></strong>
						<p><?php echo esc_html( $pro_highlight['description'] ); ?></p>
					</li>
				<?php } ?>
			</ul>
			<?php if ( $cta_link && $cta_label ) { ?>
				<a target="_blank" rel="noopener noreferrer" href="<?php echo esc_url( $cta_link ); ?>"><?php echo esc_html( $cta_label ); ?></a>
			<?php } ?>
		</div>
		<?php
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
		$context_copy   = $this->get_context_copy( $is_pro_context );

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
						<?php echo esc_html( $context_copy['head_label'] ); ?>
					</div>
					<h2 class="vpf-welcome-head-title"><?php echo esc_html( $context_copy['head_title'] ); ?></h2>
					<div class="vpf-welcome-subtitle">
						<?php echo esc_html( $context_copy['head_subtitle'] ); ?>
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
				<h2><?php echo esc_html( $context_copy['feature_section_title'] ); ?></h2>
				<p class="vpf-welcome-foot-description"><?php echo esc_html( $context_copy['feature_section_subtitle'] ); ?></p>
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

			<?php
			if ( ! $is_pro_context ) {
				$this->render_pro_highlights_section(
					$context_copy,
					$pro_highlights,
					$go_pro_links['head'],
					esc_html__( 'See Pro details', 'visual-portfolio' )
				);
			} else {
				$this->render_pro_highlights_section( $context_copy, $pro_highlights );
			}
			?>
		</div>
		<?php
	}
}

new Visual_Portfolio_Welcome_Screen();
