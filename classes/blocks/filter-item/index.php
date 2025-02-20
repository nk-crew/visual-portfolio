<?php
/**
 * Block Filter Item.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Visual Portfolio Filter item block.
 */
class Visual_Portfolio_Block_Filter_Item {
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
		if ( ! function_exists( 'register_block_type_from_metadata' ) ) {
			return;
		}

		register_block_type_from_metadata(
			visual_portfolio()->plugin_path . 'gutenberg/blocks/filter-item',
			array(
				'render_callback' => array( $this, 'block_render' ),
			)
		);
	}

	/**
	 * Block output
	 *
	 * @param array  $attributes - block attributes.
	 * @param string $content - block content.
	 * @param object $block - block instance.
	 *
	 * @return string
	 */
	public function block_render( $attributes, $content, $block ) {
		// Get attributes with defaults from block.json.
		$text      = isset( $attributes['text'] ) ? $attributes['text'] : '';
		$filter    = isset( $attributes['filter'] ) ? $attributes['filter'] : '*';
		$url       = isset( $attributes['url'] ) ? $attributes['url'] : '';
		$is_active = isset( $attributes['isActive'] ) ? $attributes['isActive'] : false;
		$count     = isset( $attributes['count'] ) ? (int) $attributes['count'] : 0;

		// Get context values.
		$filter_style = isset( $block->context['visual-portfolio/filter_style'] )
			? $block->context['visual-portfolio/filter_style']
			: 'minimal';
		$show_count   = isset( $block->context['visual-portfolio/filter_show_count'] )
			? $block->context['visual-portfolio/filter_show_count']
			: false;

		// For dropdown style.
		if ( 'dropdown' === $filter_style ) {
			return sprintf(
				'<option class="vp-filter__item%1$s" value="%2$s" data-vp-url="%3$s" data-vp-filter="%2$s"%4$s>%5$s%6$s</option>',
				$is_active ? ' vp-filter__item-active' : '',
				esc_attr( $filter ),
				esc_url( $url ),
				$is_active ? ' selected="selected"' : '',
				esc_html( $text ),
				$show_count && $count ? ' (' . esc_html( $count ) . ')' : ''
			);
		}

		// For other styles.
		return sprintf(
			'<div class="vp-filter__item%1$s"><a href="%2$s" data-vp-filter="%3$s">%4$s%5$s</a></div>',
			$is_active ? ' vp-filter__item-active' : '',
			esc_url( $url ),
			esc_attr( $filter ),
			esc_html( $text ),
			$show_count && $count ? '<span class="vp-filter__item-count">' . esc_html( $count ) . '</span>' : ''
		);
	}
}
new Visual_Portfolio_Block_Filter_Item();
