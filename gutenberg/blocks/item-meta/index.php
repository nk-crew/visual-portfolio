<?php
/**
 * Block Item Meta.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Visual Portfolio Item Meta block.
 */
class Visual_Portfolio_Block_Item_Meta {
	/**
	 * Context key every meta type reads its value from.
	 *
	 * @var array
	 */
	const VALUE_CONTEXT = array(
		'comments'     => 'vp/itemCommentsCount',
		'views'        => 'vp/itemViewsCount',
		'reading-time' => 'vp/itemReadingTime',
	);

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
		Visual_Portfolio_Assets::register_style( 'visual-portfolio-block-item-meta', 'build/gutenberg/blocks/item-meta/style' );
		wp_style_add_data( 'visual-portfolio-block-item-meta', 'rtl', 'replace' );

		register_block_type_from_metadata(
			visual_portfolio()->plugin_path . 'gutenberg/blocks/item-meta',
			array(
				'render_callback' => array( $this, 'block_render' ),
			)
		);
	}

	/**
	 * Whether a meta value is worth a line of its own.
	 *
	 * Sources that do not carry the value at all answer with an empty string,
	 * and a post nobody has commented on or read answers with a zero.
	 *
	 * @param mixed $value - raw context value.
	 *
	 * @return bool
	 */
	private static function is_empty_value( $value ) {
		if ( null === $value || '' === trim( (string) $value ) ) {
			return true;
		}

		// `< 1` minutes of reading is not a zero - it is a real answer.
		return is_numeric( $value ) && 0 === (int) $value;
	}

	/**
	 * The phrase a meta value reads as.
	 *
	 * @param string $meta_type - meta type of the block.
	 * @param mixed  $value - raw context value.
	 *
	 * @return string unescaped text.
	 */
	private static function get_text( $meta_type, $value ) {
		if ( 'views' === $meta_type ) {
			return sprintf(
				// translators: %s number of views.
				_n( '%s View', '%s Views', (int) $value, 'visual-portfolio' ),
				number_format_i18n( (int) $value )
			);
		}

		if ( 'reading-time' === $meta_type ) {
			// `Visual_Portfolio_Custom_Post_Meta::get_reading_time()` answers with
			// the string `< 1` for anything shorter than a minute.
			$is_text = ! is_numeric( $value );

			return sprintf(
				// translators: %s reading time in minutes.
				_n( '%s Min Read', '%s Mins Read', $is_text ? 1 : (int) $value, 'visual-portfolio' ),
				$is_text ? (string) $value : number_format_i18n( (int) $value )
			);
		}

		if ( ! (int) $value ) {
			return __( 'No Comments', 'visual-portfolio' );
		}

		return sprintf(
			// translators: %s number of comments.
			_n( '%s Comment', '%s Comments', (int) $value, 'visual-portfolio' ),
			number_format_i18n( (int) $value )
		);
	}

	/**
	 * The icon of a meta type.
	 *
	 * Kept in step with `gutenberg/block-icons/item-meta-*.svg`, which the editor
	 * renders - the same mark on both sides of the editor boundary.
	 *
	 * @param string $meta_type - meta type of the block.
	 *
	 * @return string
	 */
	private static function get_icon( $meta_type ) {
		$open  = '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">';
		$close = '</svg>';

		if ( 'views' === $meta_type ) {
			return $open .
				'<circle cx="10" cy="10" r="2.5" fill="currentColor" />' .
				'<path d="M1 10C1 10 4.27273 3 10 3C15.7273 3 19 10 19 10C19 10 15.7273 17 10 17C4.27273 17 1 10 1 10Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="transparent" />' .
				$close;
		}

		if ( 'reading-time' === $meta_type ) {
			return $open .
				'<path d="M2.60001 16.8823C2.60001 16.3207 2.84403 15.7821 3.2784 15.3849C3.71277 14.9878 4.30189 14.7647 4.91618 14.7647H17.4235" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="transparent" />' .
				'<path d="M4.91618 1H17.4235V19H4.91618C4.30189 19 3.71277 18.7629 3.2784 18.341C2.84403 17.919 2.60001 17.3467 2.60001 16.75V3.25C2.60001 2.65326 2.84403 2.08097 3.2784 1.65901C3.71277 1.23705 4.30189 1 4.91618 1V1Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="transparent" />' .
				$close;
		}

		return $open .
			'<path d="M4 15V15C2.34315 15 1 13.6569 1 12V4C1 2.34315 2.34315 1 4 1H16C17.6569 1 19 2.34315 19 4V12C19 13.6569 17.6569 15 16 15H11.5" stroke="currentColor" stroke-width="1.5" fill="transparent" />' .
			'<path d="M3.5 15H5.20001V19L9.5 15H14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="transparent" />' .
			$close;
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
		$meta_type = isset( $attributes['metaType'] ) ? (string) $attributes['metaType'] : 'comments';

		if ( ! isset( self::VALUE_CONTEXT[ $meta_type ] ) ) {
			return '';
		}

		$value = $block->context[ self::VALUE_CONTEXT[ $meta_type ] ] ?? '';

		if ( self::is_empty_value( $value ) && empty( $attributes['showZero'] ) ) {
			return '';
		}

		$text = esc_html( $attributes['prefix'] ?? '' ) .
			esc_html( self::get_text( $meta_type, $value ) ) .
			esc_html( $attributes['suffix'] ?? '' );

		// The value spells the meaning out, so the mark next to it is decorative.
		$icon = empty( $attributes['showIcon'] ) ? '' : self::get_icon( $meta_type );

		$inner = $icon . '<span>' . $text . '</span>';
		$url   = 'comments' === $meta_type ? ( $block->context['vp/itemCommentsUrl'] ?? '' ) : '';

		if ( ! empty( $attributes['isLink'] ) && $url ) {
			$output = sprintf( '<a href="%1$s">%2$s</a>', esc_url( $url ), $inner );
		} else {
			$output = sprintf( '<span>%s</span>', $inner );
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
new Visual_Portfolio_Block_Item_Meta();
