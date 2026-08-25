<?php
/**
 * Block Item Description.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Visual Portfolio Item Description block.
 */
class Visual_Portfolio_Block_Item_Description {
	/**
	 * Word count the items pipeline already trimmed `vp/itemExcerpt` to.
	 */
	const DEFAULT_EXCERPT_LENGTH = 15;

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
		Visual_Portfolio_Assets::register_style( 'visual-portfolio-block-item-description', 'build/gutenberg/blocks/item-description/style' );
		wp_style_add_data( 'visual-portfolio-block-item-description', 'rtl', 'replace' );

		register_block_type_from_metadata(
			visual_portfolio()->plugin_path . 'gutenberg/blocks/item-description',
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
		$source = isset( $attributes['source'] ) ? $attributes['source'] : 'excerpt';

		if ( 'content' === $source ) {
			return $this->render_content( $block->context );
		}

		$text = (string) $this->get_excerpt( $attributes, $block->context );

		if ( '' === trim( $text ) ) {
			return '';
		}

		return sprintf(
			'<p %1$s>%2$s</p>',
			get_block_wrapper_attributes(),
			wp_kses_post( $text )
		);
	}

	/**
	 * Render the whole content of an item, the way core's Post Content does.
	 *
	 * `vp/itemContent` is raw post content: blocks and shortcodes in it are
	 * still delimiters until `the_content` has run, and a block-level child of
	 * the result would close a `<p>` early.
	 *
	 * @param array $context - block context.
	 *
	 * @return string
	 */
	private function render_content( $context ) {
		static $seen_ids = array();

		$text    = (string) ( $context['vp/itemContent'] ?? '' );
		$post_id = (int) ( $context['vp/itemPostId'] ?? 0 );

		if ( '' === trim( $text ) ) {
			return '';
		}

		// An item whose content holds the gallery it is rendered in would
		// render itself forever.
		if ( $post_id ) {
			if ( isset( $seen_ids[ $post_id ] ) ) {
				return '';
			}

			$seen_ids[ $post_id ] = true;
		}

		/** This filter is documented in wp-includes/post-template.php */
		// phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- core's content filter, not a hook of ours.
		$text = apply_filters( 'the_content', str_replace( ']]>', ']]&gt;', $text ) );

		unset( $seen_ids[ $post_id ] );

		if ( '' === trim( $text ) ) {
			return '';
		}

		return sprintf(
			'<div %1$s>%2$s</div>',
			get_block_wrapper_attributes(),
			$text
		);
	}

	/**
	 * Resolve the excerpt for the configured length.
	 *
	 * The pipeline hands over `vp/itemExcerpt` already trimmed to the default
	 * length, so any other length has to be rebuilt from scratch. Re-trimming the
	 * context string would throw away a handwritten post excerpt, which
	 * `get_item_excerpt()` prefers over the content.
	 *
	 * @param array $attributes - block attributes.
	 * @param array $context - block context.
	 *
	 * @return string
	 */
	private function get_excerpt( $attributes, $context ) {
		$length = isset( $attributes['excerptLength'] ) ? (int) $attributes['excerptLength'] : self::DEFAULT_EXCERPT_LENGTH;

		if ( self::DEFAULT_EXCERPT_LENGTH === $length ) {
			return isset( $context['vp/itemExcerpt'] ) ? $context['vp/itemExcerpt'] : '';
		}

		return Visual_Portfolio_Get::get_item_excerpt(
			array(
				'post_id' => isset( $context['vp/itemPostId'] ) ? $context['vp/itemPostId'] : 0,
				'content' => isset( $context['vp/itemContent'] ) ? $context['vp/itemContent'] : '',
				'excerpt' => '',
				'opts'    => array( 'excerpt_words_count' => $length ),
			)
		);
	}
}
new Visual_Portfolio_Block_Item_Description();
