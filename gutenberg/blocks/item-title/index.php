<?php
/**
 * Block Item Title.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Visual Portfolio Item Title block.
 */
class Visual_Portfolio_Block_Item_Title {
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
		Visual_Portfolio_Assets::register_style( 'visual-portfolio-block-item-title', 'build/gutenberg/blocks/item-title/style' );
		wp_style_add_data( 'visual-portfolio-block-item-title', 'rtl', 'replace' );

		register_block_type_from_metadata(
			visual_portfolio()->plugin_path . 'gutenberg/blocks/item-title',
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
		$title = isset( $block->context['vp/itemTitle'] ) ? (string) $block->context['vp/itemTitle'] : '';

		if ( '' === trim( $title ) ) {
			return '';
		}

		$title = wp_kses_post( $title );
		$url   = isset( $block->context['vp/itemUrl'] ) ? $block->context['vp/itemUrl'] : '';

		if ( ! empty( $attributes['isLink'] ) && $url ) {
			$title = sprintf(
				'<a href="%1$s" target="%2$s"%3$s>%4$s</a>',
				esc_url( $url ),
				esc_attr( isset( $attributes['linkTarget'] ) ? $attributes['linkTarget'] : '_self' ),
				empty( $attributes['rel'] ) ? '' : ' rel="' . esc_attr( $attributes['rel'] ) . '"',
				$title
			);
		}

		$classes = array();

		if ( ! empty( $attributes['textAlign'] ) ) {
			$classes[] = 'has-text-align-' . $attributes['textAlign'];
		}

		if ( isset( $attributes['style']['elements']['link']['color']['text'] ) ) {
			$classes[] = 'has-link-color';
		}

		$level = isset( $attributes['level'] ) ? (int) $attributes['level'] : 3;
		$level = max( 0, min( 6, $level ) );

		return sprintf(
			'<%1$s %2$s>%3$s</%1$s>',
			0 === $level ? 'p' : 'h' . $level,
			get_block_wrapper_attributes( array( 'class' => implode( ' ', $classes ) ) ),
			$title
		);
	}
}
new Visual_Portfolio_Block_Item_Title();
