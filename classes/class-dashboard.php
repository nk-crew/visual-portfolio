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
			esc_html__( 'Portfolio Activity', 'visual-portfolio' ),
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
				'update_post_meta_cache' => true,
				'update_post_term_cache' => false,
			)
		);

		if ( empty( $recent_portfolios ) ) {
			echo '<p>' . esc_html__( 'No portfolio items yet.', 'visual-portfolio' ) . '</p>';
		} else {
			echo '<ul class="vpf-dashboard-activity">';

			foreach ( $recent_portfolios as $portfolio_post ) {
				$this->render_portfolio_activity_item( $portfolio_post );
			}

			echo '</ul>';
		}

		$this->render_portfolio_activity_footer();
	}

	/**
	 * Render a single portfolio activity list item.
	 *
	 * @param WP_Post $portfolio_post Portfolio post.
	 *
	 * @return void
	 */
	protected function render_portfolio_activity_item( $portfolio_post ) {
		$edit_link = get_edit_post_link( $portfolio_post->ID );
		$title     = get_the_title( $portfolio_post );

		if ( '' === $title ) {
			$title = __( '(no title)', 'visual-portfolio' );
		}

		$item_url = $edit_link ? $edit_link : get_permalink( $portfolio_post );

		echo '<li>';

		printf(
			'<span class="vpf-dashboard-activity-date">%s</span>',
			esc_html( $this->get_portfolio_activity_date_label( $portfolio_post ) )
		);

		echo '<span class="vpf-dashboard-activity-item">';

		if ( $item_url ) {
			printf(
				'<a class="vpf-dashboard-activity-title" href="%1$s"%2$s>%3$s</a>',
				esc_url( $item_url ),
				$edit_link ? ' aria-label="' . esc_attr( sprintf( /* translators: %s: portfolio title */ __( 'Edit “%s”', 'visual-portfolio' ), $title ) ) . '"' : '',
				esc_html( $title )
			);
		} else {
			echo '<span class="vpf-dashboard-activity-title">' . esc_html( $title ) . '</span>';
		}

		if ( $item_url ) {
			printf(
				'<a class="vpf-dashboard-activity-thumb vp-portfolio__thumbnail" href="%s">',
				esc_url( $item_url )
			);
		} else {
			echo '<span class="vpf-dashboard-activity-thumb vp-portfolio__thumbnail">';
		}

		if ( has_post_thumbnail( $portfolio_post ) ) {
			echo get_the_post_thumbnail( $portfolio_post, array( 64, 64 ) );
		}

		echo $item_url ? '</a>' : '</span>';

		echo '</span>';

		echo '</li>';
	}

	/**
	 * Format published date for the portfolio activity list.
	 *
	 * @param WP_Post $portfolio_post Portfolio post.
	 *
	 * @return string
	 */
	protected function get_portfolio_activity_date_label( $portfolio_post ) {
		// Use a true Unix timestamp (GMT) so comparisons and formatting share site timezone via wp_date().
		$time = get_post_time( 'U', true, $portfolio_post );

		if ( ! is_numeric( $time ) ) {
			return get_the_time( get_option( 'date_format' ), $portfolio_post );
		}

		$time      = (int) $time;
		$today     = wp_date( 'Y-m-d' );
		$year      = wp_date( 'Y' );
		$post_day  = wp_date( 'Y-m-d', $time );
		$post_year = wp_date( 'Y', $time );

		if ( $post_day === $today ) {
			return __( 'Today', 'visual-portfolio' );
		}

		if ( $post_year !== $year ) {
			/* translators: Date format for portfolio activity from a different year, see https://www.php.net/manual/datetime.format.php */
			return wp_date( __( 'M jS Y', 'visual-portfolio' ), $time );
		}

		/* translators: Date format for portfolio activity, see https://www.php.net/manual/datetime.format.php */
		return wp_date( __( 'M jS', 'visual-portfolio' ), $time );
	}

	/**
	 * Render Activity-style status links in the widget footer.
	 *
	 * @return void
	 */
	protected function render_portfolio_activity_footer() {
		$post_type_object = get_post_type_object( 'portfolio' );

		if ( ! $post_type_object || ! current_user_can( $post_type_object->cap->edit_posts ) ) {
			return;
		}

		$num_posts = wp_count_posts( 'portfolio' );

		if ( ! $num_posts ) {
			return;
		}

		$published = isset( $num_posts->publish ) ? (int) $num_posts->publish : 0;
		$drafts    = isset( $num_posts->draft ) ? (int) $num_posts->draft : 0;
		$pending   = isset( $num_posts->pending ) ? (int) $num_posts->pending : 0;
		$all       = $published + $drafts + $pending;

		$links = array(
			array(
				'label' => __( 'All', 'visual-portfolio' ),
				'count' => $all,
				'url'   => admin_url( 'edit.php?post_type=portfolio' ),
				'class' => 'all',
			),
			array(
				'label' => __( 'Published', 'visual-portfolio' ),
				'count' => $published,
				'url'   => admin_url( 'edit.php?post_type=portfolio&post_status=publish' ),
				'class' => 'publish',
			),
			array(
				'label' => __( 'Drafts', 'visual-portfolio' ),
				'count' => $drafts,
				'url'   => admin_url( 'edit.php?post_type=portfolio&post_status=draft' ),
				'class' => 'draft',
			),
			array(
				'label' => __( 'Pending', 'visual-portfolio' ),
				'count' => $pending,
				'url'   => admin_url( 'edit.php?post_type=portfolio&post_status=pending' ),
				'class' => 'pending',
			),
		);

		$total = count( $links );

		echo '<ul class="subsubsub vpf-dashboard-widget-footer">';

		foreach ( $links as $index => $link ) {
			$separator = ( $index < $total - 1 ) ? ' |' : '';

			printf(
				'<li class="%1$s"><a href="%2$s">%3$s <span class="count">(%4$s)</span></a>%5$s</li>' . "\n",
				esc_attr( $link['class'] ),
				esc_url( $link['url'] ),
				esc_html( $link['label'] ),
				number_format_i18n( $link['count'] ),
				esc_html( $separator )
			);
		}

		echo '</ul>';
	}
}

new Visual_Portfolio_Dashboard();
