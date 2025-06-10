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

		Visual_Portfolio_Assets::register_style( 'visual-portfolio-block-filter-item', 'build/gutenberg/blocks/filter-item/style' );
		wp_style_add_data( 'visual-portfolio-block-filter-item', 'rtl', 'replace' );

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
		$show_count = isset( $block->context['visual-portfolio/showCount'] )
			? $block->context['visual-portfolio/showCount']
			: false;

		$wrapper_attributes = get_block_wrapper_attributes(
			array(
				'class'          => $is_active ? 'is-active' : '',
				'href'           => esc_url( $url ),
				'data-vp-filter' => esc_attr( $filter ),
			)
		);

		// For other styles.
		return sprintf(
			'<a %1$s>%2$s%3$s</a>',
			$wrapper_attributes,
			esc_html( $text ),
			$show_count && $count ? '<span class="vp-filter__item-count">' . esc_html( $count ) . '</span>' : ''
		);
	}
}
new Visual_Portfolio_Block_Filter_Item();
