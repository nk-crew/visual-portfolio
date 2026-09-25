<?php
/**
 * Block Item Categories.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Visual Portfolio Item Categories block.
 */
class Visual_Portfolio_Block_Item_Categories {
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
		Visual_Portfolio_Assets::register_style( 'visual-portfolio-block-item-categories', 'build/gutenberg/blocks/item-categories/style' );
		wp_style_add_data( 'visual-portfolio-block-item-categories', 'rtl', 'replace' );

		register_block_type_from_metadata(
			visual_portfolio()->plugin_path . 'gutenberg/blocks/item-categories',
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
		$categories = isset( $block->context['vp/itemCategories'] ) ? $block->context['vp/itemCategories'] : array();
		$taxonomy   = (string) ( $attributes['taxonomy'] ?? '' );
		$post_id    = (int) ( $block->context['vp/itemPostId'] ?? 0 );

		// An image has no taxonomy, and keeps the categories typed into it.
		if ( '' !== $taxonomy && $post_id ) {
			$categories = self::get_terms( $post_id, $taxonomy, Visual_Portfolio_Block_Loop::get_query_id( $block->context ) );
		}

		if ( ! is_array( $categories ) || empty( $categories ) ) {
			return '';
		}

		$links = array();

		foreach ( $categories as $category ) {
			$label = isset( $category['label'] ) ? (string) $category['label'] : '';

			if ( '' === trim( $label ) ) {
				continue;
			}

			// The url is built by the items pipeline and points back into this
			// loop's filter. Sources that have no filter to link to fall back to
			// plain text.
			$url = isset( $category['url'] ) ? $category['url'] : '';

			$links[] = $url
				? sprintf( '<a href="%1$s">%2$s</a>', esc_url( $url ), esc_html( $label ) )
				: esc_html( $label );
		}

		if ( empty( $links ) ) {
			return '';
		}

		// Zero shows them all.
		$limit = (int) ( $attributes['limit'] ?? 0 );

		if ( $limit > 0 ) {
			$links = array_slice( $links, 0, $limit );
		}

		$classes = array();

		if ( isset( $attributes['style']['elements']['link']['color']['text'] ) ) {
			$classes[] = 'has-link-color';
		}

		$separator = isset( $attributes['separator'] ) ? $attributes['separator'] : ', ';

		return sprintf(
			'<div %1$s>%2$s</div>',
			get_block_wrapper_attributes( array( 'class' => implode( ' ', $classes ) ) ),
			implode( esc_html( $separator ), $links )
		);
	}

	/**
	 * Terms of one taxonomy of a post, each linked to the loop's filter.
	 *
	 * Any taxonomy, not only the ones the filter lists: the filter parameter
	 * narrows the loop by whichever taxonomy it names.
	 *
	 * @param int      $post_id  - post of the item.
	 * @param string   $taxonomy - taxonomy name.
	 * @param int|null $query_id - id of the loop.
	 *
	 * @return array `label` and `url` of each term.
	 */
	private static function get_terms( $post_id, $taxonomy, $query_id ) {
		$terms = get_the_terms( $post_id, $taxonomy );

		if ( ! is_array( $terms ) ) {
			return array();
		}

		$categories = array();

		foreach ( $terms as $term ) {
			// Built the way the items pipeline builds the categories of an item.
			$categories[] = array(
				'label' => $term->name,
				'url'   => Visual_Portfolio_Get::get_pagenum_link(
					array(
						'vp_filter' => rawurlencode( $term->taxonomy . ':' ) . $term->slug,
						'vp_page'   => 1,
					),
					$query_id
				),
			);
		}

		return $categories;
	}
}
new Visual_Portfolio_Block_Item_Categories();
