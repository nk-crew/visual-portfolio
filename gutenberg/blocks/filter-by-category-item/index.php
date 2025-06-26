<?php
/**
 * Block Filter by Category Item.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Visual Portfolio Filter by Category Item block.
 */
class Visual_Portfolio_Block_Filter_By_Category_Item {
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
		register_block_type_from_metadata(
			visual_portfolio()->plugin_path . 'gutenberg/blocks/filter-by-category-item',
			array(
				'render_callback' => array( $this, 'block_render' ),
			)
		);
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
		// Extract attributes with defaults.
		$filter    = isset( $attributes['filter'] ) ? $attributes['filter'] : '*';
		$count     = isset( $attributes['count'] ) ? intval( $attributes['count'] ) : 0;
		$is_all    = isset( $attributes['isAll'] ) ? $attributes['isAll'] : false;
		$text      = isset( $attributes['text'] ) ? $attributes['text'] : '';
		$url       = isset( $attributes['url'] ) ? $attributes['url'] : '';
		$is_active = isset( $attributes['isActive'] ) ? $attributes['isActive'] : false;

		// Get showCount from parent block context.
		$show_count = false;
		if ( isset( $block->context['visual-portfolio-filter-by-category/showCount'] ) ) {
			$show_count = $block->context['visual-portfolio-filter-by-category/showCount'];
		}

		// Get current filter from URL and extract the actual value.
		$current_filter = '';
		if ( isset( $_GET['vp_filter'] ) && ! empty( $_GET['vp_filter'] ) ) {
			$is_active      = false;
			$current_filter = sanitize_text_field( urldecode( $_GET['vp_filter'] ) );

			// Remove taxonomy prefix (e.g., 'portfolio_category:mountains' -> 'mountains').
			if ( false !== strpos( $current_filter, ':' ) ) {
				$parts          = explode( ':', $current_filter );
				$current_filter = end( $parts );
			}
		}

		// Determine if this item should be active.
		$should_be_active = false;

		if ( '*' === $filter ) {
			// "All" filter is active only when no filter is set in URL
			$should_be_active = empty( $current_filter );
		} else {
			// Specific filter is active when it matches the URL parameter.
			$should_be_active = ( ! empty( $current_filter ) && $current_filter === $filter );

			if ( ! $should_be_active ) {
				$should_be_active = $is_active;
			}
		}

		// Get block wrapper attributes but override the class completely.
		$wrapper_attributes = get_block_wrapper_attributes(
			array(
				'class' => 'vp-block-filter-by-category-item' . ( $should_be_active ? ' is-active' : '' ),
			)
		);

		$output_text = $text;

		// Build the count display.
		if ( $show_count && ! $is_all && $count > 0 ) {
			$output_text = $output_text . '<span class="vp-block-filter-by-category-count">' . $count . '</span>';
		}

		$output = '';

		$filter_link = '#';
		if ( ! empty( $url ) ) {
			$filter_link = esc_url( $url );
		}

		if ( $should_be_active ) {
			$aria_label = '*' === $filter ? esc_attr__( 'Currently displaying all items', 'visual-portfolio' ) : sprintf(
				// translators: %1$s filter name, %2$s item count.
				esc_attr__( 'Currently filtering by %1$s, %2$s items', 'visual-portfolio' ),
				esc_attr( $text ),
				$count
			);

			$output = sprintf(
				'<span aria-label="%1$s" aria-current="page" %2$s>%3$s</span>',
				$aria_label,
				$wrapper_attributes,
				$output_text
			);
		} else {
			$aria_label = '*' === $filter ? esc_attr__( 'Display all items', 'visual-portfolio' ) : sprintf(
				// translators: %1$s filter name, %2$s item count.
				esc_attr__( 'Filter by %1$s, %2$s items', 'visual-portfolio' ),
				esc_attr( $text ),
				$count
			);

			$output = sprintf(
				'<a aria-label="%1$s" href="%2$s" %3$s>%4$s</a>',
				$aria_label,
				$filter_link,
				$wrapper_attributes,
				$output_text
			);
		}

		return $output;
	}
}
new Visual_Portfolio_Block_Filter_By_Category_Item();
