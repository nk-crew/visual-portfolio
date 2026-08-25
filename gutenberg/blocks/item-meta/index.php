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
	 * The same file the editor imports, so the mark is identical on both sides
	 * of the editor boundary. It ships with the plugin, and is read once per
	 * request rather than once per item.
	 *
	 * @param string $meta_type - meta type of the block.
	 *
	 * @return string
	 */
	private static function get_icon( $meta_type ) {
		static $cache = array();

		if ( isset( $cache[ $meta_type ] ) ) {
			return $cache[ $meta_type ];
		}

		$path = visual_portfolio()->plugin_path . 'gutenberg/block-icons/item-meta-' . $meta_type . '.svg';

		// phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
		$icon = is_readable( $path ) ? (string) file_get_contents( $path ) : '';

		if ( '' !== $icon ) {
			// The value spells the meaning out, so the mark next to it is
			// decorative - which the file itself cannot say, being an icon in
			// the inserter as well.
			$processor = new WP_HTML_Tag_Processor( $icon );

			if ( $processor->next_tag( 'svg' ) ) {
				$processor->set_attribute( 'aria-hidden', 'true' );
				$processor->set_attribute( 'focusable', 'false' );

				$icon = $processor->get_updated_html();
			}
		}

		$cache[ $meta_type ] = $icon;

		return $icon;
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

		$icon = empty( $attributes['showIcon'] ) ? '' : self::get_icon( $meta_type );

		$inner = $icon . '<span>' . $text . '</span>';
		$url   = 'comments' === $meta_type ? ( $block->context['vp/itemCommentsUrl'] ?? '' ) : '';

		if ( ! empty( $attributes['isLink'] ) && $url ) {
			$output = sprintf( '<a href="%1$s">%2$s</a>', esc_url( $url ), $inner );
		} else {
			$output = sprintf( '<span>%s</span>', $inner );
		}

		$classes = array();

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
