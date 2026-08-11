<?php
/**
 * Block Item Categories.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Visual Portfolio Item Categories block.
 */
class Visual_Portfolio_Block_Item_Categories {
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
		Visual_Portfolio_Assets::register_style( 'visual-portfolio-block-item-categories', 'build/gutenberg/blocks/item-categories/style' );
		wp_style_add_data( 'visual-portfolio-block-item-categories', 'rtl', 'replace' );

		register_block_type_from_metadata(
			visual_portfolio()->plugin_path . 'gutenberg/blocks/item-categories',
			array(
				'render_callback' => array( $this, 'block_render' ),
			)
		);
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
		$categories = isset( $block->context['vp/itemCategories'] ) ? $block->context['vp/itemCategories'] : array();

		if ( ! is_array( $categories ) || empty( $categories ) ) {
			return '';
		}

		$links = array();

		foreach ( $categories as $category ) {
			$label = isset( $category['label'] ) ? (string) $category['label'] : '';

			if ( '' === trim( $label ) ) {
				continue;
			}

			// The url is built by the items pipeline and points back into this
			// loop's filter. Sources that have no filter to link to fall back to
			// plain text.
			$url = isset( $category['url'] ) ? $category['url'] : '';

			$links[] = $url
				? sprintf( '<a href="%1$s">%2$s</a>', esc_url( $url ), esc_html( $label ) )
				: esc_html( $label );
		}

		if ( empty( $links ) ) {
			return '';
		}

		$classes = array();

		if ( ! empty( $attributes['textAlign'] ) ) {
			$classes[] = 'has-text-align-' . $attributes['textAlign'];
		}

		if ( isset( $attributes['style']['elements']['link']['color']['text'] ) ) {
			$classes[] = 'has-link-color';
		}

		$separator = isset( $attributes['separator'] ) ? $attributes['separator'] : ', ';

		return sprintf(
			'<div %1$s>%2$s</div>',
			get_block_wrapper_attributes( array( 'class' => implode( ' ', $classes ) ) ),
			implode( esc_html( $separator ), $links )
		);
	}
}
new Visual_Portfolio_Block_Item_Categories();
