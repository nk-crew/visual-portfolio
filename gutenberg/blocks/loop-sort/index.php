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
	 * Block output
	 *
	 * The options are the same for every sort block, so the attributes and the
	 * inner content are not used.
	 *
	 * @param array  $attributes - block attributes.
	 * @param string $content - block content.
	 * @param object $block - block instance.
	 *
	 * @return string
	 */
	public function block_render( $attributes, $content, $block ) {
		$wrapper_attributes = get_block_wrapper_attributes(
			array(
				'class' => 'vp-block-loop-sort',
			)
		);

		$options = '';

		// Get active item.
		$active_item = Visual_Portfolio_Get::get_current_sort();

		foreach ( Visual_Portfolio_Get::get_sort_items() as $slug => $label ) {
			$url = Visual_Portfolio_Block_Loop::add_random_seed(
				Visual_Portfolio_Get::get_sort_item_url( $slug ),
				$block->context
			);

			$is_active = ! $active_item && ! $slug ? true : $active_item === $slug;

			$options .= '<option data-vp-url="' . esc_url( $url ) . '" value="' . esc_attr( $slug ) . '" ' . selected( $is_active, true, false ) . '>';
			$options .= esc_html( $label );
			$options .= '</option>';
		}

		// The only control of the family that is not a link: the store reads the
		// URL of the selected option instead of an href.
		return sprintf(
			'<div %1$s><select aria-label="%2$s" data-wp-interactive="%3$s" data-wp-on--change="actions.navigate">%4$s</select></div>',
			$wrapper_attributes,
			esc_attr__( 'Sort items', 'visual-portfolio' ),
			esc_attr( Visual_Portfolio_Block_Loop::STORE ),
			$options
		);
	}
}
new Visual_Portfolio_Block_Loop_Sort();
