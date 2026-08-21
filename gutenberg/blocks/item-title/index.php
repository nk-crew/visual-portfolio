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
	 * Wrap the title in whatever a click on it is supposed to do.
	 *
	 * A popup trigger points at the full size image: without the lightbox module
	 * a click opens the picture, which is all the lightbox would have shown.
	 *
	 * @param string $title      - rendered title.
	 * @param array  $attributes - block attributes.
	 * @param array  $context    - block context.
	 *
	 * @return string
	 */
	private function get_click_wrapper( $title, $attributes, $context ) {
		// A title saved before the click action existed keeps meaning what its
		// link toggle said - only an unset action falls back to it.
		$action = $attributes['clickAction'] ?? ( empty( $attributes['isLink'] ) ? 'none' : 'url' );

		if ( 'url' === $action && ! empty( $context['vp/itemUrl'] ) ) {
			return sprintf(
				'<a href="%1$s" target="%2$s"%3$s>%4$s</a>',
				esc_url( $context['vp/itemUrl'] ),
				esc_attr( $attributes['linkTarget'] ?? '_self' ),
				empty( $attributes['rel'] ) ? '' : ' rel="' . esc_attr( $attributes['rel'] ) . '"',
				$title
			);
		}

		if ( 'popup' !== $action ) {
			return $title;
		}

		$trigger = Visual_Portfolio_Popup::get_trigger_attributes( $context );

		// An item the lightbox has nothing to show - a Pro source that refused
		// it, an image that no longer exists - is not made clickable.
		if ( empty( $trigger ) ) {
			return $title;
		}

		return sprintf(
			'<a href="%1$s" data-vp-popup="%2$s">%3$s</a>',
			esc_url( $trigger['href'] ),
			esc_attr( $trigger['data-vp-popup'] ),
			$title
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

		$title = $this->get_click_wrapper( wp_kses_post( $title ), $attributes, $block->context );

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
