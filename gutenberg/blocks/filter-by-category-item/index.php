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
	 * Get the `vp_filter` query value for the given item.
	 *
	 * Posts are filtered by `taxonomy:slug`, media and social items by the
	 * category slug alone. The value is built the same way as
	 * `Visual_Portfolio_Get::get_posts_terms()` builds it, so URLs stay
	 * identical to the ones the legacy filter produces.
	 *
	 * @param array  $attributes - block attributes.
	 * @param string $query_type - content source of the parent loop.
	 *
	 * @return string|false Query value, or false when the term is gone.
	 */
	private static function get_filter_value( $attributes, $query_type ) {
		$filter = $attributes['filter'] ?? '*';

		// The "All" item resets the filter.
		if ( '*' === $filter ) {
			return '';
		}

		$taxonomy_id = isset( $attributes['taxonomyId'] ) ? (int) $attributes['taxonomyId'] : 0;

		// Posts are filtered by `taxonomy:slug`. A bare slug is silently ignored
		// by the query, so an item without a resolvable term renders nothing
		// rather than a link that looks like a filter and does not filter.
		if ( 'posts' === $query_type ) {
			$term = $taxonomy_id ? get_term( $taxonomy_id ) : false;

			if ( ! $term || is_wp_error( $term ) ) {
				return false;
			}

			return rawurlencode( $term->taxonomy . ':' ) . $term->slug;
		}

		return rawurlencode( $filter );
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
		$filter = $attributes['filter'] ?? '*';
		$count  = isset( $attributes['count'] ) ? (int) $attributes['count'] : 0;
		$is_all = '*' === $filter;
		$text   = $attributes['text'] ?? '';

		// Get showCount from parent block context. The parent still provides it
		// under its old, longer key too, for blocks that consume that one.
		$show_count = ! empty( $block->context['vp/showCount'] );

		// The filter value and URL are resolved on every request, since the
		// permalink saved in the editor is wrong for templates and patterns,
		// and goes stale when the post slug changes.
		$filter_value = self::get_filter_value( $attributes, $block->context['vp/queryType'] ?? 'posts' );

		// The term this item points at was deleted, there is nothing to filter by.
		if ( false === $filter_value ) {
			return '';
		}

		$filter_link = Visual_Portfolio_Get::get_pagenum_link(
			array(
				'vp_filter' => $filter_value,
				'vp_page'   => 1,
			)
		);

		// Determine if this item should be active.
		$current_filter = Visual_Portfolio_Get::get_filter_active_item( array() );

		if ( $is_all ) {
			// The "All" item is active only when no filter is set in the URL.
			$is_active = ! $current_filter;
		} else {
			$is_active = $current_filter && rawurldecode( $filter_value ) === $current_filter;
		}

		// Get block wrapper attributes but override the class completely.
		$wrapper_attributes = get_block_wrapper_attributes(
			array(
				'class' => 'vp-block-filter-by-category-item' . ( $is_active ? ' is-active' : '' ),
			)
		);

		$output_text = wp_kses_post( $text );

		// Build the count display.
		if ( $show_count && ! $is_all && $count > 0 ) {
			$output_text .= '<span class="vp-block-filter-by-category-count">' . esc_html( number_format_i18n( $count ) ) . '</span>';
		}

		// The active item is not a link, so an `aria-label` on it would be
		// ignored - `aria-current` carries the state instead.
		if ( $is_active ) {
			return sprintf(
				'<span aria-current="page" %1$s>%2$s</span>',
				$wrapper_attributes,
				$output_text
			);
		}

		if ( $is_all ) {
			$aria_label = __( 'Display all items', 'visual-portfolio' );
		} else {
			$aria_label = sprintf(
				// translators: %s filter name.
				__( 'Filter by %s', 'visual-portfolio' ),
				wp_strip_all_tags( $text )
			);
		}

		return sprintf(
			'<a aria-label="%1$s" href="%2$s" %3$s>%4$s</a>',
			esc_attr( $aria_label ),
			esc_url( $filter_link ),
			$wrapper_attributes,
			$output_text
		);
	}
}
new Visual_Portfolio_Block_Filter_By_Category_Item();
