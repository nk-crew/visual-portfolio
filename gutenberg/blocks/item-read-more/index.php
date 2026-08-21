<?php
/**
 * Block Item Read More.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Visual Portfolio Item Read More block.
 */
class Visual_Portfolio_Block_Item_Read_More {
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
		Visual_Portfolio_Assets::register_style( 'visual-portfolio-block-item-read-more', 'build/gutenberg/blocks/item-read-more/style' );
		wp_style_add_data( 'visual-portfolio-block-item-read-more', 'rtl', 'replace' );

		register_block_type_from_metadata(
			visual_portfolio()->plugin_path . 'gutenberg/blocks/item-read-more',
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
		$url = isset( $block->context['vp/itemUrl'] ) ? $block->context['vp/itemUrl'] : '';

		if ( ! $url ) {
			return '';
		}

		// An untouched block shows the words the editor offers as its
		// placeholder. A `block.json` default cannot carry them: attribute
		// defaults are not part of the metadata a catalogue is built from, so
		// they would ship in English whatever the site speaks. A block whose
		// text was deliberately cleared still renders nothing.
		$text = (string) ( $attributes['text'] ?? __( 'Read more', 'visual-portfolio' ) );

		if ( '' === trim( $text ) ) {
			return '';
		}

		$label = esc_html( $text );

		if ( ! empty( $attributes['showArrow'] ) ) {
			// Decorative - the link text already carries the meaning. Picking the
			// glyph here keeps RTL right without a direction-aware stylesheet.
			$label .= ' <span aria-hidden="true">' . ( is_rtl() ? '&larr;' : '&rarr;' ) . '</span>';
		}

		$classes = array();

		if ( ! empty( $attributes['textAlign'] ) ) {
			$classes[] = 'has-text-align-' . $attributes['textAlign'];
		}

		if ( isset( $attributes['style']['elements']['link']['color']['text'] ) ) {
			$classes[] = 'has-link-color';
		}

		return sprintf(
			'<div %1$s><a href="%2$s">%3$s</a></div>',
			get_block_wrapper_attributes( array( 'class' => implode( ' ', $classes ) ) ),
			esc_url( $url ),
			$label
		);
	}
}
new Visual_Portfolio_Block_Item_Read_More();
