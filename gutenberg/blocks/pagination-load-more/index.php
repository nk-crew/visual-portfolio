<?php
/**
 * Block Pagination Load More.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Visual Portfolio Pagination Load More block.
 */
class Visual_Portfolio_Block_Pagination_Load_More {
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
		if ( ! function_exists( 'register_block_type_from_metadata' ) ) {
			return;
		}

		Visual_Portfolio_Assets::register_style( 'visual-portfolio-block-pagination-load-more', 'build/gutenberg/blocks/pagination-load-more/editor' );
		wp_style_add_data( 'visual-portfolio-block-pagination-load-more', 'rtl', 'replace' );

		Visual_Portfolio_Assets::register_style( 'visual-portfolio-block-pagination-load-more-editor', 'build/gutenberg/blocks/pagination-load-more/editor' );
		wp_style_add_data( 'visual-portfolio-block-pagination-load-more-editor', 'rtl', 'replace' );

		register_block_type_from_metadata(
			visual_portfolio()->plugin_path . 'gutenberg/blocks/pagination-load-more',
			array(
				'render_callback' => array( $this, 'block_render' ),
			)
		);

		Visual_Portfolio_Assets::store_used_assets( 'visual-portfolio-pagination-load-more', true, 'script' );
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
		$label             = isset( $attributes['label'] ) ? $attributes['label'] : __( 'Load More', 'visual-portfolio' );
		$loading_label     = isset( $attributes['loadingLabel'] ) ? $attributes['loadingLabel'] : __( 'Loading...', 'visual-portfolio' );
		$show_loading_text = isset( $attributes['showLoadingText'] ) ? $attributes['showLoadingText'] : true;
		$end_list_label    = isset( $attributes['endListLabel'] ) ? $attributes['endListLabel'] : __( 'You ve reached the end of the list', 'visual-portfolio' );

		// Get current page.
		$current_page = max( 1, isset( $_GET['vp_page'] ) ? Visual_Portfolio_Security::sanitize_number( $_GET['vp_page'] ) : 1 );
		if ( $current_page < 1 ) {
			$current_page = 1;
		}

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

		// Find the next page link from the pagination links.
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
				'class' => 'vp-pagination ' . $no_more_class,
			)
		);

		ob_start();
		?>
		<div class="vp-portfolio__pagination-wrap">
			<div <?php echo $wrapper_attributes; ?> data-vp-pagination-type="load-more">
				<div class="vp-pagination__item">
					<a class="vp-pagination__load-more" href="<?php echo esc_url( $next_link ); ?>">
						<span><?php echo wp_kses_post( $label ); ?></span>
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
new Visual_Portfolio_Block_Pagination_Load_More();
