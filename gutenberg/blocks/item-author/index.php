<?php
/**
 * Block Item Author.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Visual Portfolio Item Author block.
 */
class Visual_Portfolio_Block_Item_Author {
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
		Visual_Portfolio_Assets::register_style( 'visual-portfolio-block-item-author', 'build/gutenberg/blocks/item-author/style' );
		wp_style_add_data( 'visual-portfolio-block-item-author', 'rtl', 'replace' );

		register_block_type_from_metadata(
			visual_portfolio()->plugin_path . 'gutenberg/blocks/item-author',
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
		$author = isset( $block->context['vp/itemAuthor'] ) ? (string) $block->context['vp/itemAuthor'] : '';

		if ( '' === trim( $author ) ) {
			return '';
		}

		$output = esc_html( $author );
		$url    = isset( $block->context['vp/itemAuthorUrl'] ) ? $block->context['vp/itemAuthorUrl'] : '';

		if ( ! empty( $attributes['isLink'] ) && $url ) {
			$output = sprintf(
				'<a href="%1$s" target="%2$s"%3$s>%4$s</a>',
				esc_url( $url ),
				esc_attr( isset( $attributes['linkTarget'] ) ? $attributes['linkTarget'] : '_self' ),
				empty( $attributes['rel'] ) ? '' : ' rel="' . esc_attr( $attributes['rel'] ) . '"',
				$output
			);
		}

		// See the note in `item-read-more`: the default lives here rather than
		// in `block.json`, so it follows the site's language.
		$prefix = (string) ( $attributes['prefix'] ?? __( 'by ', 'visual-portfolio' ) );

		if ( ! empty( $attributes['showPrefix'] ) && '' !== $prefix ) {
			$output = esc_html( $prefix ) . $output;
		}

		$classes = array();

		if ( ! empty( $attributes['textAlign'] ) ) {
			$classes[] = 'has-text-align-' . $attributes['textAlign'];
		}

		if ( isset( $attributes['style']['elements']['link']['color']['text'] ) ) {
			$classes[] = 'has-link-color';
		}

		return sprintf(
			'<div %1$s>%2$s</div>',
			get_block_wrapper_attributes( array( 'class' => implode( ' ', $classes ) ) ),
			$output
		);
	}
}
new Visual_Portfolio_Block_Item_Author();
