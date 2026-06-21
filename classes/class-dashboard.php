<?php
/**
 * Admin Dashboard widgets.
 *
 * @package visual-portfolio/admin
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Visual_Portfolio_Dashboard
 */
class Visual_Portfolio_Dashboard {
	/**
	 * Number of recent portfolio items to show in the activity widget.
	 *
	 * @var int
	 */
	const RECENT_PORTFOLIO_LIMIT = 5;

	/**
	 * Visual_Portfolio_Dashboard constructor.
	 */
	public function __construct() {
		add_action( 'wp_dashboard_setup', array( $this, 'register_dashboard_widgets' ) );
		add_filter( 'dashboard_glance_items', array( $this, 'add_portfolio_glance_item' ) );
	}

	/**
	 * Whether portfolio dashboard widgets should be available for the current user.
	 *
	 * @return bool
	 */
	public static function should_show_portfolio_dashboard_widgets() {
		if ( ! Visual_Portfolio_Custom_Post_Type::portfolio_post_type_is_registered() || ! post_type_exists( 'portfolio' ) ) {
			return false;
		}

		$post_type_object = get_post_type_object( 'portfolio' );

		if ( ! $post_type_object || ! current_user_can( $post_type_object->cap->edit_posts ) ) {
			return false;
		}

		return true;
	}

	/**
	 * Register dashboard widgets.
	 *
	 * @return void
	 */
	public function register_dashboard_widgets() {
		if ( ! self::should_show_portfolio_dashboard_widgets() ) {
			return;
		}

		wp_add_dashboard_widget(
			'vpf_recent_portfolio_activity',
			esc_html__( 'Recent Portfolio Activity', 'visual-portfolio' ),
			array( $this, 'render_recent_portfolio_activity_widget' )
		);
	}

	/**
	 * Add portfolio count to the "At a Glance" dashboard widget.
	 *
	 * @param array $items Existing glance items.
	 *
	 * @return array
	 */
	public function add_portfolio_glance_item( $items ) {
		if ( ! self::should_show_portfolio_dashboard_widgets() ) {
			return $items;
		}

		$post_type_object = get_post_type_object( 'portfolio' );
		$num_posts        = wp_count_posts( 'portfolio' );
		$published        = isset( $num_posts->publish ) ? (int) $num_posts->publish : 0;

		$text = sprintf(
			/* translators: %s: number of portfolio items */
			_n(
				'%s ' . $post_type_object->labels->singular_name, // phpcs:ignore WordPress.WP.I18n.NonSingularStringLiteralSingle
				'%s ' . $post_type_object->labels->name, // phpcs:ignore WordPress.WP.I18n.NonSingularStringLiteralPlural
				$published,
				'visual-portfolio'
			),
			number_format_i18n( $published )
		);

		$edit_url = admin_url( 'edit.php?post_type=portfolio' );

		if ( current_user_can( $post_type_object->cap->edit_posts ) ) {
			$items[] = sprintf( '<a class="portfolio-count" href="%s">%s</a>', esc_url( $edit_url ), esc_html( $text ) );
		} else {
			$items[] = sprintf( '<span class="portfolio-count">%s</span>', esc_html( $text ) );
		}

		return $items;
	}

	/**
	 * Render the recent portfolio activity dashboard widget.
	 *
	 * @return void
	 */
	public function render_recent_portfolio_activity_widget() {
		$recent_portfolios = get_posts(
			array(
				'post_type'              => 'portfolio',
				'post_status'            => 'publish',
				'posts_per_page'         => self::RECENT_PORTFOLIO_LIMIT,
				'orderby'                => 'date',
				'order'                  => 'DESC',
				'no_found_rows'          => true,
				'update_post_meta_cache' => false,
				'update_post_term_cache' => false,
			)
		);

		if ( empty( $recent_portfolios ) ) {
			echo '<p>' . esc_html__( 'No portfolio items published yet.', 'visual-portfolio' ) . '</p>';
		} else {
			echo '<ul>';

			foreach ( $recent_portfolios as $portfolio_post ) {
				$edit_link = get_edit_post_link( $portfolio_post->ID );

				echo '<li>';

				if ( $edit_link ) {
					printf(
						'<a href="%1$s">%2$s</a>',
						esc_url( $edit_link ),
						esc_html( get_the_title( $portfolio_post ) )
					);
				} else {
					echo esc_html( get_the_title( $portfolio_post ) );
				}

				echo ' &mdash; ' . esc_html( get_the_time( get_option( 'date_format' ), $portfolio_post ) );
				echo '</li>';
			}

			echo '</ul>';
		}

		$post_type_object = get_post_type_object( 'portfolio' );

		if ( ! $post_type_object ) {
			return;
		}

		$view_all_url = admin_url( 'edit.php?post_type=portfolio' );
		$add_new_url  = admin_url( 'post-new.php?post_type=portfolio' );

		echo '<p class="vpf-dashboard-widget-footer">';

		if ( current_user_can( $post_type_object->cap->edit_posts ) ) {
			printf(
				'<a href="%1$s">%2$s</a>',
				esc_url( $view_all_url ),
				esc_html__( 'View all', 'visual-portfolio' )
			);
		}

		if ( current_user_can( $post_type_object->cap->create_posts ) ) {
			if ( current_user_can( $post_type_object->cap->edit_posts ) ) {
				echo ' | ';
			}

			printf(
				'<a href="%1$s">%2$s</a>',
				esc_url( $add_new_url ),
				esc_html( $post_type_object->labels->add_new )
			);
		}

		echo '</p>';
	}
}

new Visual_Portfolio_Dashboard();
