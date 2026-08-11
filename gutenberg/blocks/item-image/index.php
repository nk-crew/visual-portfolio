<?php
/**
 * Block Item Image.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Visual Portfolio Item Image block.
 */
class Visual_Portfolio_Block_Item_Image {
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
		Visual_Portfolio_Assets::register_style( 'visual-portfolio-block-item-image', 'build/gutenberg/blocks/item-image/style' );
		wp_style_add_data( 'visual-portfolio-block-item-image', 'rtl', 'replace' );

		register_block_type_from_metadata(
			visual_portfolio()->plugin_path . 'gutenberg/blocks/item-image',
			array(
				'render_callback' => array( $this, 'block_render' ),
			)
		);
	}

	/**
	 * Inline styles of the image itself.
	 *
	 * Cropping happens on the `img`, not on the figure: the aspect ratio is the
	 * box, `object-fit` and the focal point decide what of the image survives it.
	 *
	 * @param array $attributes  - block attributes.
	 * @param mixed $focal_point - focal point of the item, `array( 'x', 'y' )` or empty.
	 *
	 * @return string
	 */
	private function get_image_styles( $attributes, $focal_point ) {
		$aspect_ratio = preg_replace( '#[^0-9./ ]#', '', (string) ( $attributes['aspectRatio'] ?? '' ) );

		if ( '' === $aspect_ratio ) {
			return '';
		}

		$scale  = $attributes['scale'] ?? 'cover';
		$scale  = in_array( $scale, array( 'cover', 'contain', 'fill' ), true ) ? $scale : 'cover';
		$styles = array(
			'aspect-ratio:' . $aspect_ratio,
			'width:100%',
			'height:100%',
			'object-fit:' . $scale,
		);

		if ( isset( $focal_point['x'], $focal_point['y'] ) ) {
			$styles[] = sprintf(
				'object-position:%1$s%% %2$s%%',
				100 * (float) $focal_point['x'],
				100 * (float) $focal_point['y']
			);
		}

		return implode( ';', $styles );
	}

	/**
	 * Overlay above the image.
	 *
	 * The class names are the ones core uses for the same job, so a theme that
	 * styles cover overlays styles these too.
	 *
	 * @param array $attributes - block attributes.
	 *
	 * @return string
	 */
	private function get_overlay( $attributes ) {
		$dim_ratio      = isset( $attributes['dimRatio'] ) ? (int) $attributes['dimRatio'] : 0;
		$color          = $attributes['overlayColor'] ?? '';
		$custom_color   = $attributes['customOverlayColor'] ?? '';
		$gradient       = $attributes['gradient'] ?? '';
		$custom_grad    = $attributes['customGradient'] ?? '';
		$has_background = $color || $custom_color || $gradient || $custom_grad;

		if ( $dim_ratio <= 0 || ! $has_background ) {
			return '';
		}

		$classes = array(
			'wp-block-visual-portfolio-item-image__overlay',
			'has-background-dim',
			'has-background-dim-' . $dim_ratio,
		);
		$styles  = array();

		if ( $gradient || $custom_grad ) {
			$classes[] = 'has-background-gradient';

			if ( $gradient ) {
				$classes[] = 'has-' . $gradient . '-gradient-background';
			} else {
				$styles[] = 'background:' . $custom_grad;
			}
		} elseif ( $color ) {
			$classes[] = 'has-' . $color . '-background-color';
		} else {
			$styles[] = 'background-color:' . $custom_color;
		}

		return sprintf(
			'<span class="%1$s"%2$s aria-hidden="true"></span>',
			esc_attr( implode( ' ', $classes ) ),
			empty( $styles ) ? '' : ' style="' . esc_attr( implode( ';', $styles ) ) . '"'
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
		$context = $block->context;

		$img_attr   = array();
		$img_styles = $this->get_image_styles( $attributes, $context['vp/itemFocalPoint'] ?? '' );

		if ( '' !== $img_styles ) {
			$img_attr['style'] = $img_styles;
		}

		// Only a custom alt is passed on - without the attribute the attachment
		// answers with its own, which is what an image without one should use.
		if ( ! empty( $context['vp/itemImgAlt'] ) ) {
			$img_attr['alt'] = $context['vp/itemImgAlt'];
		}

		$img_id = $context['vp/itemImgId'] ?? '';
		$size   = $attributes['sizeSlug'] ?? 'large';
		$image  = '';

		// Not `wp_get_attachment_image()`: this one adds the `wp-image-{ID}` class
		// core needs to attach srcset and sizes, our lazy loading needs to find the
		// image, and it is where the Pro sources hook their remote images in.
		if ( $img_id ) {
			$image = Visual_Portfolio_Images::get_attachment_image( $img_id, $size, false, $img_attr );
		}

		// The global No Image fallback of the plugin settings.
		if ( ! $image && ! empty( $context['vp/itemNoImgId'] ) ) {
			$image = Visual_Portfolio_Images::get_attachment_image( $context['vp/itemNoImgId'], $size, false, $img_attr );
		}

		// An item without an image renders nothing at all - an empty item is a
		// valid gallery item.
		if ( ! $image ) {
			return '';
		}

		// The assets walker only knows about galleries of the legacy block, so the
		// lazy loading scripts of this one are requested here.
		if ( Visual_Portfolio_Settings::get_option( 'lazy_loading', 'vp_images' ) ) {
			Visual_Portfolio_Assets::enqueue_lazyload_assets();
		}

		$image .= $this->get_overlay( $attributes );

		if ( ! empty( $attributes['isLink'] ) && ! empty( $context['vp/itemUrl'] ) ) {
			$image = sprintf(
				'<a href="%1$s" target="%2$s"%3$s%4$s>%5$s</a>',
				esc_url( $context['vp/itemUrl'] ),
				esc_attr( $attributes['linkTarget'] ?? '_self' ),
				empty( $attributes['rel'] ) ? '' : ' rel="' . esc_attr( $attributes['rel'] ) . '"',
				empty( $context['vp/itemAriaLabel'] ) ? '' : ' aria-label="' . esc_attr( $context['vp/itemAriaLabel'] ) . '"',
				$image
			);
		}

		return sprintf( '<figure %1$s>%2$s</figure>', get_block_wrapper_attributes(), $image );
	}
}
new Visual_Portfolio_Block_Item_Image();
