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

		$uses_context = array( 'vp/itemCommentsUrl' );

		foreach ( self::get_meta_types() as $meta_type ) {
			$uses_context[] = $meta_type['context'];
		}

		register_block_type_from_metadata(
			visual_portfolio()->plugin_path . 'gutenberg/blocks/item-meta',
			array(
				'render_callback' => array( $this, 'block_render' ),

				// The editor hands a block only the context it names, so the key
				// of a type an extension adds has to be named here as well.
				'uses_context'    => array_values( array_unique( $uses_context ) ),
			)
		);
	}

	/**
	 * The meta types this install offers.
	 *
	 * @return array type name => array( 'context', 'text', 'icon' ).
	 */
	public static function get_meta_types() {
		$icons = visual_portfolio()->plugin_path . 'gutenberg/block-icons/item-meta-';

		/**
		 * Filters the meta types of the item meta block.
		 *
		 * A type is keyed by its name, the value of the `metaType` attribute,
		 * and gives:
		 *
		 * - `context` - the context key the item carries the value in.
		 * - `text`    - callable( $value, $attributes ) returning the unescaped
		 *               phrase the value reads as.
		 * - `icon`    - path to the SVG file of its mark.
		 *
		 * A block saved with a type the list lacks renders nothing.
		 *
		 * @param array $types meta types.
		 */
		return (array) apply_filters(
			'vpf_item_meta_types',
			array(
				'comments'     => array(
					'context' => 'vp/itemCommentsCount',
					'text'    => array( __CLASS__, 'get_comments_text' ),
					'icon'    => $icons . 'comments.svg',
				),
				'views'        => array(
					'context' => 'vp/itemViewsCount',
					'text'    => array( __CLASS__, 'get_views_text' ),
					'icon'    => $icons . 'views.svg',
				),
				'reading-time' => array(
					'context' => 'vp/itemReadingTime',
					'text'    => array( __CLASS__, 'get_reading_time_text' ),
					'icon'    => $icons . 'reading-time.svg',
				),
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
	 * The phrase a number of comments reads as.
	 *
	 * @param mixed $value - raw context value.
	 *
	 * @return string unescaped text.
	 */
	public static function get_comments_text( $value ) {
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
	 * The phrase a number of views reads as.
	 *
	 * @param mixed $value - raw context value.
	 *
	 * @return string unescaped text.
	 */
	public static function get_views_text( $value ) {
		return sprintf(
			// translators: %s number of views.
			_n( '%s View', '%s Views', (int) $value, 'visual-portfolio' ),
			number_format_i18n( (int) $value )
		);
	}

	/**
	 * The phrase a reading time reads as.
	 *
	 * @param mixed $value - raw context value.
	 *
	 * @return string unescaped text.
	 */
	public static function get_reading_time_text( $value ) {
		// `Visual_Portfolio_Custom_Post_Meta::get_reading_time()` answers with
		// the string `< 1` for anything shorter than a minute.
		$is_text = ! is_numeric( $value );

		return sprintf(
			// translators: %s reading time in minutes.
			_n( '%s Min Read', '%s Mins Read', $is_text ? 1 : (int) $value, 'visual-portfolio' ),
			$is_text ? (string) $value : number_format_i18n( (int) $value )
		);
	}

	/**
	 * The icon of a meta type.
	 *
	 * The same file the editor imports, so the mark is identical on both sides
	 * of the editor boundary. It ships with the plugin that adds the type, and
	 * is read once per request rather than once per item.
	 *
	 * @param string $path - path to the SVG file.
	 *
	 * @return string
	 */
	private static function get_icon( $path ) {
		static $cache = array();

		if ( isset( $cache[ $path ] ) ) {
			return $cache[ $path ];
		}

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

		$cache[ $path ] = $icon;

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
		$types     = self::get_meta_types();

		if ( ! isset( $types[ $meta_type ] ) ) {
			return '';
		}

		$type  = $types[ $meta_type ];
		$value = $block->context[ $type['context'] ] ?? '';

		if ( self::is_empty_value( $value ) && empty( $attributes['showZero'] ) ) {
			return '';
		}

		$text = esc_html( $attributes['prefix'] ?? '' ) .
			esc_html( call_user_func( $type['text'], $value, $attributes ) ) .
			esc_html( $attributes['suffix'] ?? '' );

		$icon = empty( $attributes['showIcon'] ) ? '' : self::get_icon( $type['icon'] );

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
