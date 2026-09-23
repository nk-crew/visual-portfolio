<?php
/**
 * Block Carousel Thumbnails.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Visual Portfolio Carousel Thumbnails block.
 */
class Visual_Portfolio_Block_Loop_Carousel_Thumbnails {
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
		register_block_type_from_metadata(
			visual_portfolio()->plugin_path . 'gutenberg/blocks/loop-carousel-thumbnails',
			array(
				'render_callback' => array( $this, 'block_render' ),
			)
		);
	}

	/**
	 * Block output
	 *
	 * The strip is a sibling of the item template and has no items of its own,
	 * so it resolves the query a second time. That costs nothing: the item
	 * template asked for the same items with the same context in this request,
	 * and `get_loop_items()` memoizes per request.
	 *
	 * @param array    $attributes - block attributes.
	 * @param string   $content - block content.
	 * @param WP_Block $block - block instance.
	 *
	 * @return string
	 */
	public function block_render( $attributes, $content, $block ) {
		$atts = Visual_Portfolio_Gutenberg::transform_context_to_attributes( $block->context );

		if ( empty( $atts ) ) {
			return '';
		}

		$result = Visual_Portfolio_Get::get_loop_items( $atts, Visual_Portfolio_Block_Loop::get_query_id( $block->context ) );

		if ( ! is_array( $result ) || empty( $result['items'] ) ) {
			return '';
		}

		$size = $attributes['sizeSlug'] ?? 'thumbnail';
		/* translators: %d: slide number. */
		$label  = __( 'Go to slide %d', 'visual-portfolio' );
		$thumbs = '';
		$index  = 0;

		foreach ( $result['items'] as $item ) {
			$image = '';

			// The same call the image block makes, so the remote sources of Pro
			// hook in the same way and srcset still works.
			if ( ! empty( $item['image_id'] ) ) {
				$image = Visual_Portfolio_Images::get_attachment_image(
					$item['image_id'],
					$size,
					false,
					array(
						'alt'     => $item['alt'] ?? '',
						'loading' => 'lazy',
					)
				);
			}

			if ( ! $image && ! empty( $item['no_image'] ) ) {
				$image = Visual_Portfolio_Images::get_attachment_image( $item['no_image'], $size, false, array( 'alt' => '' ) );
			}

			// An item with no picture is still a slide, and its button is still
			// drawn: the place of a thumbnail in the strip is the place of the
			// slide it names, and one skipped would send every press after it
			// to the wrong slide.
			$thumbs .= sprintf(
				'<button type="button" class="vp-block-loop-carousel-thumb" data-vp-slide="%1$d" aria-current="%2$s" aria-label="%3$s">%4$s</button>',
				$index,
				0 === $index ? 'true' : 'false',
				esc_attr( sprintf( $label, $index + 1 ) ),
				$image
			);

			++$index;
		}

		// The pictures are lazy loaded like those of the items, and a carousel
		// whose items carry no picture of their own has requested nothing yet.
		if ( Visual_Portfolio_Settings::get_option( 'lazy_loading', 'vp_images' ) ) {
			Visual_Portfolio_Assets::enqueue_lazyload_assets();
		}

		$classes = array( 'vp-block-loop-carousel-thumbnails' );

		if ( ! empty( $attributes['showOnHover'] ) ) {
			$classes[] = Visual_Portfolio_Block_Loop_Carousel_Nav::SHOW_ON_HOVER_CLASS;
		}

		// Typed in the editor and printed into an inline style, so it is
		// reduced to what a ratio can be made of first.
		$ratio = preg_replace( '/[^0-9\/.]/', '', (string) ( $attributes['aspectRatio'] ?? '1' ) );

		if ( '' === $ratio ) {
			$ratio = '1';
		}

		$styles = sprintf(
			'--vp-carousel-thumb-height:%dpx;--vp-carousel-thumb-ratio:%s;',
			max( 24, min( 200, (int) ( $attributes['thumbHeight'] ?? 72 ) ) ),
			$ratio
		);

		return sprintf(
			'<div %1$s>%2$s</div>',
			Visual_Portfolio_Block_Loop_Carousel_Nav::control_attributes(
				implode( ' ', $classes ),
				'thumbnails',
				array(
					'style'               => $styles,
					'data-wp-interactive' => Visual_Portfolio_Block_Item_Template::VIEW_MODULE_STORE,
					'data-wp-on--click'   => 'actions.carouselGoTo',
				)
			),
			$thumbs
		);
	}
}
new Visual_Portfolio_Block_Loop_Carousel_Thumbnails();
