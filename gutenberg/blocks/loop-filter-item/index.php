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
class Visual_Portfolio_Block_Loop_Filter_Item {
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
			visual_portfolio()->plugin_path . 'gutenberg/blocks/loop-filter-item',
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

		// Get showCount from parent block context.
		$show_count = ! empty( $block->context['vp/showCount'] );

		// The filter value and URL are resolved on every request, since the
		// permalink saved in the editor is wrong for templates and patterns,
		// and goes stale when the post slug changes.
		$filter_value = self::get_filter_value( $attributes, $block->context['vp/queryType'] ?? 'posts' );

		// The term this item points at was deleted, there is nothing to filter by.
		if ( false === $filter_value ) {
			return '';
		}

		$filter_link = Visual_Portfolio_Block_Loop::get_link(
			array(
				'vp_filter' => $filter_value,
				'vp_page'   => 1,
			),
			$block->context
		);

		// Determine if this item should be active.
		$current_filter = Visual_Portfolio_Block_Loop::get_active_filter( $block->context );

		if ( $is_all ) {
			// The "All" item is active only when no filter is set in the URL.
			$is_active = ! $current_filter;
		} else {
			$is_active = $current_filter && rawurldecode( $filter_value ) === $current_filter;
		}

		// In a filter shown as a dropdown the item is one of its options, which
		// hold text alone, so the styles of the item have nothing to apply to.
		if ( ! empty( $block->context['vp/displayAsDropdown'] ) ) {
			$label = wp_strip_all_tags( $text );

			if ( $show_count && ! $is_all && $count > 0 ) {
				$label = sprintf(
					// translators: 1: category name, 2: number of items in it.
					__( '%1$s (%2$s)', 'visual-portfolio' ),
					$label,
					number_format_i18n( $count )
				);
			}

			// The value is what the form submits without JavaScript.
			return sprintf(
				'<option data-vp-url="%1$s" value="%2$s"%3$s>%4$s</option>',
				esc_url( $filter_link ),
				esc_attr( rawurldecode( $filter_value ) ),
				selected( $is_active, true, false ),
				esc_html( $label )
			);
		}

		// Get block wrapper attributes but override the class completely.
		$wrapper_args = array(
			'class' => 'vp-block-loop-filter-item' . ( $is_active ? ' is-active' : '' ),
		);

		$output_text = wp_kses_post( $text );

		// Build the count display.
		if ( $show_count && ! $is_all && $count > 0 ) {
			$output_text .= '<span class="vp-block-loop-filter-count">' . esc_html( number_format_i18n( $count ) ) . '</span>';
		}

		// The active item is not a link, so an `aria-label` on it would be
		// ignored - `aria-current` carries the state instead.
		if ( $is_active ) {
			return sprintf(
				'<span aria-current="page" %1$s>%2$s</span>',
				get_block_wrapper_attributes( $wrapper_args ),
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

		// The store swaps the loop instead of reloading the page. It is an
		// enhancement of the link, not a replacement: without it the href does
		// the same thing, slower.
		$wrapper_args['data-wp-interactive'] = Visual_Portfolio_Block_Loop::STORE;
		$wrapper_args['data-wp-on--click']   = 'actions.navigate';

		return sprintf(
			'<a aria-label="%1$s" href="%2$s" %3$s>%4$s</a>',
			esc_attr( $aria_label ),
			esc_url( $filter_link ),
			get_block_wrapper_attributes( $wrapper_args ),
			$output_text
		);
	}
}
new Visual_Portfolio_Block_Loop_Filter_Item();
