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
class Visual_Portfolio_Block_Sort {
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
		Visual_Portfolio_Assets::register_style( 'visual-portfolio-block-sort', 'build/gutenberg/blocks/sort/style' );
		wp_style_add_data( 'visual-portfolio-block-sort', 'rtl', 'replace' );

		Visual_Portfolio_Assets::register_script( 'visual-portfolio-block-sort', 'build/gutenberg/blocks/sort/view' );

		register_block_type_from_metadata(
			visual_portfolio()->plugin_path . 'gutenberg/blocks/sort',
			array(
				'render_callback' => array( $this, 'block_render' ),
			)
		);
	}

	/**
	 * Block output
	 *
	 * The options are the same for every sort block, so neither the attributes
	 * nor the inner content are used.
	 *
	 * @return string
	 */
	public function block_render() {
		$wrapper_attributes = get_block_wrapper_attributes(
			array(
				'class' => 'vp-block-sort',
			)
		);

		$options = '';

		// Get active item.
		$active_item = Visual_Portfolio_Get::get_current_sort();

		foreach ( Visual_Portfolio_Get::get_sort_items() as $slug => $label ) {
			$url = Visual_Portfolio_Get::get_sort_item_url( $slug );

			$is_active = ! $active_item && ! $slug ? true : $active_item === $slug;

			$options .= '<option data-vp-url="' . esc_url( $url ) . '" value="' . esc_attr( $slug ) . '" ' . selected( $is_active, true, false ) . '>';
			$options .= esc_html( $label );
			$options .= '</option>';
		}

		return sprintf(
			'<div %1$s><select aria-label="%2$s">%3$s</select></div>',
			$wrapper_attributes,
			esc_attr__( 'Sort items', 'visual-portfolio' ),
			$options
		);
	}
}
new Visual_Portfolio_Block_Sort();
