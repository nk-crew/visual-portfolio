<?php
/**
 * Block Filter.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Visual Portfolio Filter block.
 */
class Visual_Portfolio_Block_Filter {
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
			visual_portfolio()->plugin_path . 'gutenberg/blocks/filter',
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
		// Get items from inner blocks.
		$items = array();
		if ( isset( $block->inner_blocks ) ) {
			foreach ( $block->inner_blocks as $inner_block ) {
				if ( 'visual-portfolio/filter-item' === $inner_block->name ) {
					$item_attrs = $inner_block->attributes;

					$items[] = array(
						'filter'      => $item_attrs['filter'] ?? '*',
						'url'         => $item_attrs['url'] ?? '#',
						'label'       => $item_attrs['text'] ?? '',
						'count'       => $item_attrs['count'] ?? 0,
						'active'      => $item_attrs['isActive'] ?? false,
						'class'       => 'vp-filter__item' . ( $item_attrs['isActive'] ? ' vp-filter__item-active' : '' ),
						'taxonomy'    => '',
						'id'          => $item_attrs['taxonomyId'] ?? 0,
						'parent'      => $item_attrs['parentId'] ?? 0,
					);
				}
			}
		}

		$wrapper_attributes = get_block_wrapper_attributes(
			array(
				'class'  => 'vp-portfolio__filter-wrap',
			)
		);

		return '<div ' . $wrapper_attributes . '>' . $content . '</div>';
	}
}
new Visual_Portfolio_Block_Filter();
