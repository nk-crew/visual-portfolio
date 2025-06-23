<?php
/**
 * Block Pagination Infinite.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Visual Portfolio Pagination Infinite block.
 */
class Visual_Portfolio_Block_Pagination_Infinite {
	/**
	 * Constructor.
	 */
	public function __construct() {
		add_action( 'init', array( $this, 'register_block' ), 11 );
	}

	/**
	 * Register Block.
	 */
	public function register_block() {
		Visual_Portfolio_Assets::register_style( 'visual-portfolio-block-pagination-infinite', 'build/gutenberg/blocks/pagination-infinite/editor' );
		wp_style_add_data( 'visual-portfolio-block-pagination-infinite', 'rtl', 'replace' );

		Visual_Portfolio_Assets::register_style( 'visual-portfolio-block-pagination-infinite-editor', 'build/gutenberg/blocks/pagination-infinite/editor' );
		wp_style_add_data( 'visual-portfolio-block-pagination-infinite-editor', 'rtl', 'replace' );

		register_block_type_from_metadata(
			visual_portfolio()->plugin_path . 'gutenberg/blocks/pagination-infinite',
			array(
				'render_callback' => array( $this, 'block_render' ),
			)
		);

		Visual_Portfolio_Assets::store_used_assets( 'visual-portfolio-pagination-infinite', true, 'script' );
	}

	/**
	 * Block output
	 *
	 * @param array  $attributes - block attributes.
	 * @param string $content - block content.
	 * @param object $block - block instance.
	 *
	 * @return string
	 */
	public function block_render( $attributes, $content, $block ) {
		$max_pages = Visual_Portfolio_Block_Paged_Pagination::get_max_pages( $block->context );

		// Get attributes with defaults.
		$loading_label     = isset( $attributes['loadingLabel'] ) ? $attributes['loadingLabel'] : __( 'Loading...', 'visual-portfolio' );
		$show_loading_text = isset( $attributes['showLoadingText'] ) ? $attributes['showLoadingText'] : true;
		$load_more_label   = isset( $attributes['loadMoreLabel'] ) ? $attributes['loadMoreLabel'] : __( 'Load More', 'visual-portfolio' );
		$end_list_label    = isset( $attributes['endListLabel'] ) ? $attributes['endListLabel'] : __( 'You ve reached the end of the list', 'visual-portfolio' );

		// Get current page.
		$current_page = max( 1, isset( $_GET['vp_page'] ) ? Visual_Portfolio_Security::sanitize_number( $_GET['vp_page'] ) : 1 );
		if ( $current_page < 1 ) {
			$current_page = 1;
		}

		// Prepare pagination links.
		$pagination_links = Visual_Portfolio_Get::get_pagination_links(
			array(
				'start_page' => $current_page,
				'max_pages'  => $max_pages,
			),
			array(
				'pagination_paged__show_arrows'  => true,
				'pagination_paged__show_numbers' => false,
			)
		);

		// Find the next page link.
		$next_link = '';
		foreach ( $pagination_links as $link ) {
			if ( $link['is_next_arrow'] ) {
				$next_link = $link['url'] ? esc_url( $link['url'] ) : '#';
				break;
			}
		}

		// Determine if we're on the last page.
		$is_last_page  = $current_page >= $max_pages;
		$no_more_class = $is_last_page ? ' vp-pagination__no-more' : '';

		$wrapper_attributes = get_block_wrapper_attributes(
			array(
				'class' => $no_more_class,
			)
		);

		ob_start();
		?>
		<div class="vp-portfolio__pagination-wrap">
			<div <?php echo $wrapper_attributes; ?> data-vp-pagination-type="infinite">
				<div class="vp-pagination__item">
					<a class="vp-pagination__load-more" href="<?php echo esc_url( $next_link ); ?>">
						<span><?php echo wp_kses_post( $load_more_label ); ?></span>
						<span class="vp-pagination__load-more-loading">
							<span class="vp-spinner"></span>
							<?php if ( $show_loading_text ) : ?>
								<span class="vp-screen-reader-text"><?php echo esc_html( $loading_label ); ?></span>
							<?php endif; ?>
						</span>
						<span class="vp-pagination__load-more-no-more">
							<?php echo wp_kses_post( $end_list_label ); ?>
						</span>
					</a>
				</div>
			</div>
		</div>
		<?php
		return ob_get_clean();
	}
}
new Visual_Portfolio_Block_Pagination_Infinite();
