<?php
/**
 * Block Item Date.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Visual Portfolio Item Date block.
 */
class Visual_Portfolio_Block_Item_Date {
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
		Visual_Portfolio_Assets::register_style( 'visual-portfolio-block-item-date', 'build/gutenberg/blocks/item-date/style' );
		wp_style_add_data( 'visual-portfolio-block-item-date', 'rtl', 'replace' );

		register_block_type_from_metadata(
			visual_portfolio()->plugin_path . 'gutenberg/blocks/item-date',
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
		$published_time = isset( $block->context['vp/itemPublishedTime'] ) ? $block->context['vp/itemPublishedTime'] : '';

		// An item never edited after publishing, and an image or a social item,
		// which have no such date, show the date they have.
		if ( 'modified' === ( $attributes['displayType'] ?? '' ) && ! empty( $block->context['vp/itemModifiedTime'] ) ) {
			$published_time = $block->context['vp/itemModifiedTime'];
		}

		if ( ! $published_time ) {
			return '';
		}

		$format = ! empty( $attributes['format'] ) ? $attributes['format'] : get_option( 'date_format' );

		// `vp/itemPublishedTime` is a MySQL-format string in site time. `mysql2date()`
		// runs it through `wp_date()` with the site timezone, so both the offset and
		// the translated month names come out right.
		$formatted = mysql2date( $format, $published_time );
		$machine   = mysql2date( 'c', $published_time );

		// `human-diff` is a format core's picker offers and PHP cannot read. Core's
		// own date blocks answer it with a relative time, and so does this one.
		if ( 'human-diff' === $format ) {
			$published = date_create( $published_time, wp_timezone() );
			$formatted = '';

			// A date that cannot be read shows nothing, as it does in any format.
			if ( $published ) {
				$timestamp = $published->getTimestamp();

				$formatted = $timestamp > time()
					// translators: %s: human-readable time difference.
					? sprintf( __( '%s from now', 'visual-portfolio' ), human_time_diff( $timestamp ) )
					// translators: %s: human-readable time difference.
					: sprintf( __( '%s ago', 'visual-portfolio' ), human_time_diff( $timestamp ) );
			}
		}

		if ( ! $formatted ) {
			return '';
		}

		$output = sprintf(
			'<time datetime="%1$s">%2$s</time>',
			esc_attr( $machine ),
			esc_html( $formatted )
		);

		$url = isset( $block->context['vp/itemUrl'] ) ? $block->context['vp/itemUrl'] : '';

		if ( ! empty( $attributes['isLink'] ) && $url ) {
			$output = sprintf( '<a href="%1$s">%2$s</a>', esc_url( $url ), $output );
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
new Visual_Portfolio_Block_Item_Date();
