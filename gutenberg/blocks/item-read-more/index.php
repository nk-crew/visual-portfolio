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
	 * Name the item a link points at, for a reader listing the links.
	 *
	 * "Read more" says nothing about which item it opens, the way core's Read
	 * More block names the post it links to.
	 *
	 * @param array $context - block context.
	 *
	 * @return string Empty when the item has no title.
	 */
	private static function get_screen_reader_name( $context ) {
		$title = trim( wp_strip_all_tags( (string) ( $context['vp/itemTitle'] ?? '' ) ) );

		if ( '' === $title ) {
			return '';
		}

		return sprintf(
			'<span class="screen-reader-text">%s</span>',
			sprintf(
				// translators: %s gallery item title.
				esc_html__( ': %s', 'visual-portfolio' ),
				esc_html( $title )
			)
		);
	}

	/**
	 * Wrap the label in whatever a click on it is supposed to do.
	 *
	 * A popup trigger points at the full size image: without the lightbox module
	 * a click opens the picture, which is all the lightbox would have shown.
	 *
	 * @param string $label      - rendered label, arrow included.
	 * @param array  $attributes - block attributes.
	 * @param array  $context    - block context.
	 *
	 * @return string Empty when the click action has nothing to reach.
	 */
	private function get_click_wrapper( $label, $attributes, $context ) {
		$action = $attributes['clickAction'] ?? 'url';

		if ( 'none' === $action ) {
			return '<span>' . $label . '</span>';
		}

		$label .= self::get_screen_reader_name( $context );

		if ( 'popup' === $action ) {
			$trigger = Visual_Portfolio_Popup::get_trigger_attributes( $context );

			// An item the lightbox has nothing to show - a Pro source that
			// refused it, an image that no longer exists - leaves nothing to
			// read more of.
			if ( empty( $trigger ) ) {
				return '';
			}

			return sprintf(
				'<a href="%1$s" data-vp-popup="%2$s">%3$s</a>',
				esc_url( $trigger['href'] ),
				esc_attr( $trigger['data-vp-popup'] ),
				$label
			);
		}

		if ( empty( $context['vp/itemUrl'] ) ) {
			return '';
		}

		return sprintf(
			'<a href="%1$s" target="%2$s"%3$s>%4$s</a>',
			esc_url( $context['vp/itemUrl'] ),
			esc_attr( $attributes['linkTarget'] ?? '_self' ),
			empty( $attributes['rel'] ) ? '' : ' rel="' . esc_attr( $attributes['rel'] ) . '"',
			$label
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
		// An untouched block shows the words the editor offers as its
		// placeholder. A `block.json` default cannot carry them: attribute
		// defaults are not part of the metadata a catalogue is built from, so
		// they would ship in English whatever the site speaks. A block whose
		// text was deliberately cleared still renders nothing.
		$text = (string) ( $attributes['text'] ?? __( 'Read more', 'visual-portfolio' ) );

		if ( '' === trim( $text ) ) {
			return '';
		}

		// `$text` comes from a `RichText`, so it is already markup.
		$label = wp_kses_post( $text );

		if ( ! empty( $attributes['showArrow'] ) ) {
			// Decorative - the link text already carries the meaning. Picking the
			// glyph here keeps RTL right without a direction-aware stylesheet.
			$label .= ' <span aria-hidden="true">' . ( is_rtl() ? '&larr;' : '&rarr;' ) . '</span>';
		}

		$link = $this->get_click_wrapper( $label, $attributes, $block->context );

		if ( '' === $link ) {
			return '';
		}

		$classes = array();

		if ( isset( $attributes['style']['elements']['link']['color']['text'] ) ) {
			$classes[] = 'has-link-color';
		}

		return sprintf(
			'<div %1$s>%2$s</div>',
			get_block_wrapper_attributes( array( 'class' => implode( ' ', $classes ) ) ),
			$link
		);
	}
}
new Visual_Portfolio_Block_Item_Read_More();
