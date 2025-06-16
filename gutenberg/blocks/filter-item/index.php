<?php
/**
 * Block Filter Item.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Visual Portfolio Filter item block.
 */
class Visual_Portfolio_Block_Filter_Item {
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

		Visual_Portfolio_Assets::register_style( 'visual-portfolio-block-filter-item', 'build/gutenberg/blocks/filter-item/style' );
		wp_style_add_data( 'visual-portfolio-block-filter-item', 'rtl', 'replace' );

		register_block_type_from_metadata(
			visual_portfolio()->plugin_path . 'gutenberg/blocks/filter-item',
			array(
				'render_callback' => array( $this, 'block_render' ),
				'supports'        => array(
					'html' => false,
				),
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
		if ( isset( $block->context['visual-portfolio-filter/showCount'] ) ) {
			$show_count = $block->context['visual-portfolio-filter/showCount'];
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

		$classes = isset( $attributes['className'] ) ? explode( ' ', $attributes['className'] ) : array();

		// Build CSS classes array - start fresh.
		$classes[] = 'wp-block-visual-portfolio-filter-item';

		if ( $should_be_active ) {
			$classes[] = 'is-active';
		}

		// Background color preset.
		if ( isset( $attributes['backgroundColor'] ) && ! empty( $attributes['backgroundColor'] ) ) {
			$classes[] = 'has-' . $attributes['backgroundColor'] . '-background-color';
			$classes[] = 'has-background';
		}

		// Get block wrapper attributes but override the class completely.
		$wrapper_attributes = get_block_wrapper_attributes(
			array(
				'data-vp-filter' => $filter,
				'class'          => implode( ' ', $classes ),
			)
		);

		// Replace any existing class attribute with our controlled classes.
		$wrapper_attributes = preg_replace(
			'/class="[^"]*"/',
			'class="' . esc_attr( implode( ' ', $classes ) ) . '"',
			$wrapper_attributes
		);

		// If no class attribute existed, add it.
		if ( strpos( $wrapper_attributes, 'class=' ) === false ) {
			$wrapper_attributes = 'class="' . esc_attr( implode( ' ', $classes ) ) . '" ' . $wrapper_attributes;
		}

		$styles = '';
		if ( function_exists( 'wp_style_engine_get_styles' ) && isset( $attributes['style'] ) ) {
			$style_engine = wp_style_engine_get_styles( $attributes['style'] );

			if ( ! empty( $style_engine['css'] ) ) {
				$styles = ' style="' . esc_attr( $style_engine['css'] ) . '"';
			}
		}

		// Build the count display.
		$count_html = '';
		if ( $show_count && ! $is_all && $count > 0 ) {
			$count_html = '<span class="vp-filter__item-count">(' . $count . ')</span>';
		}

		// Build the complete HTML output.
		$link_attributes = '';
		if ( ! empty( $url ) ) {
			$link_attributes = ' href="' . esc_url( $url ) . '"';
		}

		$html = sprintf(
			'<div %s%s><a%s>%s</a>%s</div>',
			$wrapper_attributes,
			$styles,
			$link_attributes,
			wp_kses_post( $text ),
			$count_html
		);

		return $html;
	}
}
new Visual_Portfolio_Block_Filter_Item();
