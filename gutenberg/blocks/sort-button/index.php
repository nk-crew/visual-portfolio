<?php
/**
 * Block Sort Button.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Visual Portfolio Sort Button block.
 */
class Visual_Portfolio_Block_Sort_Button {
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

		Visual_Portfolio_Assets::register_style( 'visual-portfolio-block-sort-button', 'build/gutenberg/blocks/sort-button/style' );
		wp_style_add_data( 'visual-portfolio-block-sort-button', 'rtl', 'replace' );

		Visual_Portfolio_Assets::register_style( 'visual-portfolio-block-sort-button-editor', 'build/gutenberg/blocks/sort-button/editor' );
		wp_style_add_data( 'visual-portfolio-block-sort-button-editor', 'rtl', 'replace' );

		register_block_type_from_metadata(
			visual_portfolio()->plugin_path . 'gutenberg/blocks/sort-button',
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
		// Get attributes with defaults.
		$label  = isset( $attributes['label'] ) ? $attributes['label'] : __( 'Default sorting', 'visual-portfolio' );
		$value  = isset( $attributes['value'] ) ? $attributes['value'] : '';
		$active = isset( $attributes['active'] ) && $attributes['active'];

		// Validate the sort value.
		if ( ! empty( $value ) && ! preg_match( '/^[a-zA-Z0-9_-]*$/', $value ) ) {
			$value = '';
		}

		// Generate the URL for sorting.
		$current_url = remove_query_arg( 'vp_sort' );
		$sort_url    = $value ? add_query_arg( 'vp_sort', $value, $current_url ) : $current_url;

		$active_class = $active ? ' vp-sort__item-active' : '';

		// Get parent block style.
		$parent_style = isset( $block->context['visual-portfolio/sort-buttons-style'] ) ? $block->context['visual-portfolio/sort-buttons-style'] : 'minimal';

		// Enqueue appropriate style.
		wp_enqueue_style( 'visual-portfolio-block-sort-buttons-' . $parent_style );

		return sprintf(
			'<div class="vp-sort__item%1$s"><a href="%2$s" data-vp-sort="%3$s">%4$s</a></div>',
			esc_attr( $active_class ),
			esc_url( $sort_url ),
			esc_attr( $value ),
			esc_html( $label )
		);
	}
}
new Visual_Portfolio_Block_Sort_Button();
