<?php
/**
 * Block Sort.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Visual Portfolio Sort block.
 */
class Visual_Portfolio_Block_Loop_Sort {
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
		Visual_Portfolio_Assets::register_style( 'visual-portfolio-block-loop-sort', 'build/gutenberg/blocks/loop-sort/style' );
		wp_style_add_data( 'visual-portfolio-block-loop-sort', 'rtl', 'replace' );

		register_block_type_from_metadata(
			visual_portfolio()->plugin_path . 'gutenberg/blocks/loop-sort',
			array(
				'render_callback' => array( $this, 'block_render' ),
			)
		);
	}

	/**
	 * Resolve which of the available sort options the block shows, in order.
	 *
	 * An empty selection means every available option: the set can grow after
	 * the block was saved - Pro and themes extend it - and a block that pinned
	 * the four built-in slugs would never show what arrives later.
	 *
	 * @param array $attributes - block attributes.
	 * @param array $available - available options, slug => label.
	 *
	 * @return array slug => label.
	 */
	private static function get_shown_options( $attributes, $available ) {
		$selected = isset( $attributes['options'] ) && is_array( $attributes['options'] ) ? $attributes['options'] : array();
		$labels   = isset( $attributes['labels'] ) && is_array( $attributes['labels'] ) ? $attributes['labels'] : array();
		$shown    = array();

		foreach ( $available as $slug => $label ) {
			// Numeric-looking slugs arrive from the array key as integers.
			$slug = (string) $slug;

			if ( ! empty( $selected ) && ! in_array( $slug, $selected, true ) ) {
				continue;
			}

			if ( isset( $labels[ $slug ] ) && is_string( $labels[ $slug ] ) && '' !== trim( $labels[ $slug ] ) ) {
				$label = $labels[ $slug ];
			}

			$shown[ $slug ] = $label;
		}

		return $shown;
	}

	/**
	 * Block output
	 *
	 * @param array    $attributes - block attributes.
	 * @param string   $content - block content.
	 * @param WP_Block $block - block instance.
	 *
	 * @return string
	 */
	public function block_render( $attributes, $content, $block ) {
		$loop_options = Visual_Portfolio_Gutenberg::transform_context_to_attributes( $block->context );
		$available    = Visual_Portfolio_Get::get_loop_sort_options( $loop_options );
		$shown        = self::get_shown_options( $attributes, $available );

		// Every selected option is gone from the available set - a select with
		// nothing to choose from sorts nothing.
		if ( empty( $shown ) ) {
			return '';
		}

		$wrapper_attributes = get_block_wrapper_attributes(
			array(
				'class' => 'vp-block-loop-sort',
			)
		);

		$options  = '';
		$query_id = Visual_Portfolio_Block_Loop::get_query_id( $block->context );

		// Get active item.
		$active_item = Visual_Portfolio_Get::get_current_sort( $query_id );

		foreach ( $shown as $slug => $label ) {
			$url = Visual_Portfolio_Block_Loop::add_random_seed(
				Visual_Portfolio_Get::get_sort_item_url( $slug, $loop_options, $query_id ),
				$block->context
			);

			$is_active = ! $active_item && ! $slug ? true : $active_item === $slug;

			$options .= '<option data-vp-url="' . esc_url( $url ) . '" value="' . esc_attr( $slug ) . '" ' . selected( $is_active, true, false ) . '>';
			$options .= esc_html( $label );
			$options .= '</option>';
		}

		$sort_name = Visual_Portfolio_Get::get_query_var_name( 'sort', $query_id );
		$page_name = Visual_Portfolio_Get::get_query_var_name( 'page', $query_id );
		$seed      = Visual_Portfolio_Block_Loop::get_control_random_seed( $block->context );

		// A form is what makes the only control of the family that is not a link
		// work without JavaScript: submitting it lands on the very URL the
		// selected option carries. The two parameters this loop writes itself are
		// left out - a new order starts at page one - and everything else in the
		// query string is carried along, including the state of the other loops
		// on the page.
		$hidden = Visual_Portfolio_Block_Loop::get_preserved_inputs(
			array( $sort_name, $page_name ),
			$seed ? array( 'vpf_random_seed' => $seed ) : array()
		);

		// With the store running, changing the select swaps the loop and the
		// button has nothing left to do. It is rendered shown and hidden from
		// there rather than the other way round: a module that never arrives has
		// to leave a working form behind, not a dead one.
		return sprintf(
			'<div %1$s><form method="get" action="%2$s" data-wp-interactive="%3$s">%4$s<select name="%5$s" aria-label="%6$s" data-wp-on--change="actions.navigate">%7$s</select><button type="submit" class="vp-block-loop-sort__submit" data-wp-bind--hidden="state.isEnhanced">%8$s</button></form></div>',
			$wrapper_attributes,
			esc_url( Visual_Portfolio_Block_Loop::get_form_action() ),
			esc_attr( Visual_Portfolio_Block_Loop::STORE ),
			$hidden,
			esc_attr( $sort_name ),
			esc_attr__( 'Sort items', 'visual-portfolio' ),
			$options,
			esc_html__( 'Sort', 'visual-portfolio' )
		);
	}
}
new Visual_Portfolio_Block_Loop_Sort();
