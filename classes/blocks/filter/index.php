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
		// Get attributes with defaults from block.json.
		$filter_style = isset( $attributes['filter'] ) ? $attributes['filter'] : 'minimal';
		$show_count   = isset( $attributes['filter_show_count'] ) ? $attributes['filter_show_count'] : false;

		// Store base filter assets.
		Visual_Portfolio_Assets::store_used_assets(
			'visual-portfolio-filter',
			'items-list/filter/style',
			'template_style'
		);

		// Store style-specific assets if not default.
		if ( 'default' !== $filter_style ) {
			Visual_Portfolio_Assets::store_used_assets(
				'visual-portfolio-filter-' . $filter_style,
				'items-list/filter/' . $filter_style . '/style',
				'template_style'
			);
		}

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

		// Prepare template arguments.
		$args = array(
			'class'      => 'vp-filter',
			'items'      => $items,
			'show_count' => $show_count,
			'opts'       => $attributes,
		);

		// Try to load style-specific template.
		if ( 'default' !== $filter_style ) {
			ob_start();
			echo '<div class="vp-portfolio__filter-wrap">';
			visual_portfolio()->include_template(
				'items-list/filter/' . $filter_style . '/filter',
				$args
			);
			echo '</div>';
			$output = ob_get_clean();

			if ( ! empty( $output ) ) {
				return $output;
			}
		}

		// Fallback to default template.
		ob_start();
		echo '<div class="vp-portfolio__filter-wrap">';
		visual_portfolio()->include_template(
			'items-list/filter/filter',
			$args
		);
		echo '</div>';
		return ob_get_clean();
	}
}
new Visual_Portfolio_Block_Filter();
