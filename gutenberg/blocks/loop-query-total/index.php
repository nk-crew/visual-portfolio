<?php
/**
 * Block Loop Query Total.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Visual Portfolio Loop Query Total block.
 */
class Visual_Portfolio_Block_Loop_Query_Total {
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
			visual_portfolio()->plugin_path . 'gutenberg/blocks/loop-query-total',
			array(
				'render_callback' => array( $this, 'block_render' ),
			)
		);
	}

	/**
	 * Block output
	 *
	 * Counts from the items the item template already resolved in this
	 * request, filter, sort, search and page included, so it runs no query of
	 * its own. Inside the loop's router region, it is swapped with the loop.
	 *
	 * @param array    $attributes - block attributes.
	 * @param string   $content - block content.
	 * @param WP_Block $block - block instance.
	 *
	 * @return string
	 */
	public function block_render( $attributes, $content, $block ) {
		$atts = Visual_Portfolio_Gutenberg::transform_context_to_attributes( $block->context );

		if ( empty( $atts ) ) {
			return '';
		}

		$result = Visual_Portfolio_Get::get_loop_items( $atts, Visual_Portfolio_Block_Loop::get_query_id( $block->context ) );

		// A source that does not say how many items it has shows no count
		// rather than a wrong one.
		if ( ! is_array( $result ) || ! isset( $result['found_items'] ) ) {
			return '';
		}

		$total = (int) $result['found_items'];
		$extra = array( 'class' => 'vp-block-loop-query-total' );

		if ( 'range-display' === ( $attributes['displayType'] ?? '' ) ) {
			$per_page = (int) ( $result['per_page'] ?? 0 );
			$shown    = count( $result['items'] );
			$start    = 0;
			$end      = 0;

			// A page past the end shows nothing, and says so as core does for
			// a query that found nothing.
			if ( $shown ) {
				$start = $per_page > 0 ? ( (int) $result['start_page'] - 1 ) * $per_page + 1 : 1;
				$end   = min( $total, $start + $shown - 1 );
			}

			/* translators: 1: number of the first item shown, 2: number of the last item shown, 3: number of items found. */
			$range = __( 'Displaying %1$s – %2$s of %3$s', 'visual-portfolio' );

			// Load More appends the next page and writes the range again from
			// this text, with the end and the total of the page it fetched.
			$extra['data-vp-range-text']  = $range;
			$extra['data-vp-range-start'] = $start;
			$extra['data-vp-range-end']   = $end;
			$extra['data-vp-range-total'] = $total;

			$output = $start === $end
				/* translators: 1: number of the item shown, 2: number of items found. */
				? sprintf( __( 'Displaying %1$s of %2$s', 'visual-portfolio' ), $start, $total )
				: sprintf( $range, $start, $end, $total );
		} else {
			/* translators: %d: number of items found. */
			$output = sprintf( _n( '%d item', '%d items', $total, 'visual-portfolio' ), $total );
		}

		return sprintf(
			'<div %1$s>%2$s</div>',
			get_block_wrapper_attributes( $extra ),
			esc_html( $output )
		);
	}
}
new Visual_Portfolio_Block_Loop_Query_Total();
