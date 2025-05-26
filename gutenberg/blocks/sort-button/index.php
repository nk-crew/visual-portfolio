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
	 *
	 * @return string
	 */
	public function block_render( $attributes, $content ) {
		// Get value attribute.
		$value = isset( $attributes['value'] ) ? $attributes['value'] : '';

		// Check if the vp_sort GET parameter matches this button's value.
		$is_active = isset( $_GET['vp_sort'] ) && $_GET['vp_sort'] === $value;

		// Modify content based on active state.
		if ( $is_active ) {
			// Add the active class if the GET parameter matches.
			if ( strpos( $content, 'vp-sort__item-active' ) === false ) {
				$content = str_replace( 'class="', 'class="vp-sort__item-active ', $content );
			}
		}

		if ( ! $is_active && isset( $_GET['vp_sort'] ) ) {
			// Remove the active class if it was set but GET parameter doesn't match.
			$content = str_replace( 'vp-sort__item-active', '', $content );
		}

		return $content;
	}
}
new Visual_Portfolio_Block_Sort_Button();
