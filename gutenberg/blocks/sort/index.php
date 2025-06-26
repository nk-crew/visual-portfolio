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
	 * @param array  $attributes - block attributes.
	 * @param string $content - block content.
	 *
	 * @return string
	 */
	public function block_render( $attributes, $content ) {
		$wrapper_attributes = get_block_wrapper_attributes(
			array(
				'class' => 'vp-block-sort',
			)
		);

		$content = '';

		$sort_items = array(
			''           => esc_html__( 'Default sorting', 'visual-portfolio' ),
			'date_desc'  => esc_html__( 'Sort by date (newest)', 'visual-portfolio' ),
			'date'       => esc_html__( 'Sort by date (oldest)', 'visual-portfolio' ),
			'title'      => esc_html__( 'Sort by title (A-Z)', 'visual-portfolio' ),
			'title_desc' => esc_html__( 'Sort by title (Z-A)', 'visual-portfolio' ),
		);

		// Get active item.
		$active_item = false;

		// phpcs:ignore WordPress.Security.NonceVerification.Recommended
		if ( isset( $_GET['vp_sort'] ) ) {
			// phpcs:ignore WordPress.Security.NonceVerification.Recommended
			$active_item = sanitize_text_field( wp_unslash( $_GET['vp_sort'] ) );
		}

		foreach ( $sort_items as $slug => $label ) {
			$url = Visual_Portfolio_Get::get_pagenum_link(
				array(
					'vp_sort' => rawurlencode( $slug ),
					'vp_page' => 1,
				)
			);

			$is_active = ! $active_item && ! $slug ? true : $active_item === $slug;

			$content .= '<option data-vp-url="' . esc_url( $url ) . '" value="' . esc_attr( $slug ) . '" ' . selected( $is_active, true, false ) . '>';
			$content .= esc_html( $label );
			$content .= '</option>';
		}

		$content = '<select>' . $content . '</select>';

		return sprintf(
			'<div %1$s>%2$s</div>',
			$wrapper_attributes,
			$content
		);
	}
}
new Visual_Portfolio_Block_Sort();
