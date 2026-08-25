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
	 * Cropping happens on the `img`, not on the figure: the aspect ratio, or a
	 * width and a height, are the box, and `object-fit` with the focal point
	 * decide what of the image survives it.
	 *
	 * @param array $attributes  - block attributes.
	 * @param mixed $focal_point - focal point of the item, `array( 'x', 'y' )` or empty.
	 *
	 * @return string
	 */
	private function get_image_styles( $attributes, $focal_point ) {
		$aspect_ratio = preg_replace( '#[^0-9./ ]#', '', (string) ( $attributes['aspectRatio'] ?? '' ) );
		$width        = empty( $attributes['width'] ) ? '' : safecss_filter_attr( 'width:' . $attributes['width'] );
		$height       = empty( $attributes['height'] ) ? '' : safecss_filter_attr( 'height:' . $attributes['height'] );

		if ( '' === $aspect_ratio && '' === $width && '' === $height ) {
			return '';
		}

		$scale  = $attributes['scale'] ?? 'cover';
		$scale  = in_array( $scale, array( 'cover', 'contain', 'fill' ), true ) ? $scale : 'cover';
		$styles = array();

		// The order of `wp-includes/blocks/post-featured-image.php`: a ratio
		// takes the whole width, and a width or a height of its own overrides
		// what the ratio said - the later declaration is the one that counts.
		if ( '' !== $aspect_ratio ) {
			$styles[] = 'aspect-ratio:' . $aspect_ratio;
			$styles[] = 'width:100%';
		}

		if ( '' !== $height ) {
			$styles[] = $height;
		} elseif ( '' !== $width ) {
			$styles[] = 'height:auto';
		}

		if ( '' !== $width ) {
			$styles[] = $width;
		}

		$styles[] = 'object-fit:' . $scale;

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
	 * Wrap the image in whatever a click on it is supposed to do.
	 *
	 * A popup trigger is an anchor as much as a link is, and it points at the
	 * full size image: without the lightbox module a click opens the picture,
	 * which is all the lightbox would have shown anyway.
	 *
	 * @param string $image      - rendered image, overlay included.
	 * @param array  $attributes - block attributes.
	 * @param array  $context    - block context.
	 *
	 * @return string
	 */
	private function get_click_wrapper( $image, $attributes, $context ) {
		$action = $attributes['clickAction'] ?? 'none';

		if ( 'url' === $action && ! empty( $context['vp/itemUrl'] ) ) {
			return sprintf(
				'<a href="%1$s" target="%2$s"%3$s%4$s>%5$s</a>',
				esc_url( $context['vp/itemUrl'] ),
				esc_attr( $attributes['linkTarget'] ?? '_self' ),
				empty( $attributes['rel'] ) ? '' : ' rel="' . esc_attr( $attributes['rel'] ) . '"',
				empty( $context['vp/itemAriaLabel'] ) ? '' : ' aria-label="' . esc_attr( $context['vp/itemAriaLabel'] ) . '"',
				$image
			);
		}

		if ( 'popup' !== $action ) {
			return $image;
		}

		$trigger = Visual_Portfolio_Popup::get_trigger_attributes( $context );

		// An item the lightbox has nothing to show - a Pro source that refused
		// it, an image that no longer exists - is not made clickable.
		if ( empty( $trigger ) ) {
			return $image;
		}

		return sprintf(
			'<a href="%1$s" data-vp-popup="%2$s"%3$s>%4$s</a>',
			esc_url( $trigger['href'] ),
			esc_attr( $trigger['data-vp-popup'] ),
			empty( $context['vp/itemAriaLabel'] ) ? '' : ' aria-label="' . esc_attr( $context['vp/itemAriaLabel'] ) . '"',
			$image
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

		// How urgent this picture is, decided by the item template from where the
		// item sits in the gallery.
		$img_attr   = is_array( $context['vp/itemImageLoading'] ?? null ) ? $context['vp/itemImageLoading'] : array();
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

		$image .= visual_portfolio_get_item_overlay(
			'wp-block-visual-portfolio-item-image__overlay',
			array(
				'dimRatio'       => $attributes['dimRatio'] ?? 0,
				'color'          => $attributes['overlayColor'] ?? '',
				'customColor'    => $attributes['customOverlayColor'] ?? '',
				'gradient'       => $attributes['gradient'] ?? '',
				'customGradient' => $attributes['customGradient'] ?? '',
			)
		);
		$image  = $this->get_click_wrapper( $image, $attributes, $context );

		return sprintf( '<figure %1$s>%2$s</figure>', get_block_wrapper_attributes(), $image );
	}
}
new Visual_Portfolio_Block_Item_Image();
