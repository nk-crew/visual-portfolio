<?php
/**
 * Block Item Cover.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Visual Portfolio Item Cover block.
 */
class Visual_Portfolio_Block_Item_Cover {
	/**
	 * Interactivity API store of the block.
	 *
	 * Its own namespace, not the one of the loop: the only thing it does is
	 * measure where the pointer entered a single cover.
	 */
	const STORE = 'visual-portfolio/item-cover';

	/**
	 * Script module of the `fly` effect.
	 */
	const VIEW_MODULE = 'visual-portfolio-block-item-cover-view';

	/**
	 * The nine positions of the content, as core Cover names them.
	 *
	 * @var array
	 */
	private static $content_positions = array(
		'top left'      => 'is-position-top-left',
		'top center'    => 'is-position-top-center',
		'top right'     => 'is-position-top-right',
		'center left'   => 'is-position-center-left',
		'center'        => 'is-position-center-center',
		'center center' => 'is-position-center-center',
		'center right'  => 'is-position-center-right',
		'bottom left'   => 'is-position-bottom-left',
		'bottom center' => 'is-position-bottom-center',
		'bottom right'  => 'is-position-bottom-right',
	);

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
		Visual_Portfolio_Assets::register_style( 'visual-portfolio-block-item-cover', 'build/gutenberg/blocks/item-cover/style' );
		wp_style_add_data( 'visual-portfolio-block-item-cover', 'rtl', 'replace' );

		$view_module = 'build/gutenberg/blocks/item-cover/view';
		$asset       = Visual_Portfolio_Assets::get_asset_file( $view_module, 'script' );

		// Registered, never declared as `viewScriptModule`: metadata would enqueue
		// it for every cover, and only the `fly` effect has anything to run.
		wp_register_script_module(
			self::VIEW_MODULE,
			visual_portfolio()->plugin_url . $view_module . '.js',
			$asset['dependencies'],
			$asset['version']
		);

		register_block_type_from_metadata(
			visual_portfolio()->plugin_path . 'gutenberg/blocks/item-cover',
			array(
				'render_callback' => array( $this, 'block_render' ),
			)
		);
	}

	/**
	 * The image behind the content.
	 *
	 * Rendered the same way `item-image` renders its image, which is the one path
	 * that carries srcset, `wp-image-{id}`, our lazy loading and the remote images
	 * of the Pro sources.
	 *
	 * @param array $attributes - block attributes.
	 * @param array $context    - block context.
	 *
	 * @return string
	 */
	private function get_image( $attributes, $context ) {
		$scale = $attributes['backgroundSize'] ?? 'cover';
		$scale = in_array( $scale, array( 'cover', 'contain', 'fill' ), true ) ? $scale : 'cover';

		// An explicit focal point of this block wins over the one stored with the
		// image: it is the setting the user just dragged, looking at this cover.
		$focal_point = $attributes['focalPoint'] ?? null;

		if ( ! isset( $focal_point['x'], $focal_point['y'] ) ) {
			$focal_point = $context['vp/itemFocalPoint'] ?? null;
		}

		$styles = array( 'object-fit:' . $scale );

		if ( isset( $focal_point['x'], $focal_point['y'] ) ) {
			$styles[] = sprintf(
				'object-position:%1$s%% %2$s%%',
				100 * (float) $focal_point['x'],
				100 * (float) $focal_point['y']
			);
		}

		$img_attr = array_merge(
			// How urgent this picture is, decided by the item template from where
			// the item sits in the gallery.
			is_array( $context['vp/itemImageLoading'] ?? null ) ? $context['vp/itemImageLoading'] : array(),
			array(
				'class' => 'wp-block-visual-portfolio-item-cover__image-background',
				'style' => implode( ';', $styles ),
			)
		);

		// Only a custom alt is passed on - without the attribute the attachment
		// answers with its own, which is what an image without one should use.
		if ( ! empty( $context['vp/itemImgAlt'] ) ) {
			$img_attr['alt'] = $context['vp/itemImgAlt'];
		}

		$img_id = $context['vp/itemImgId'] ?? '';
		$size   = $attributes['sizeSlug'] ?? 'large';
		$image  = '';

		if ( $img_id ) {
			$image = Visual_Portfolio_Images::get_attachment_image( $img_id, $size, false, $img_attr );
		}

		// The global No Image fallback of the plugin settings.
		if ( ! $image && ! empty( $context['vp/itemNoImgId'] ) ) {
			$image = Visual_Portfolio_Images::get_attachment_image( $context['vp/itemNoImgId'], $size, false, $img_attr );
		}

		// The assets walker only knows about galleries of the legacy block, so the
		// lazy loading scripts of this one are requested here.
		if ( $image && Visual_Portfolio_Settings::get_option( 'lazy_loading', 'vp_images' ) ) {
			Visual_Portfolio_Assets::enqueue_lazyload_assets();
		}

		return $image;
	}

	/**
	 * One of the two overlays above the image.
	 *
	 * The class names are the ones core uses for the same job, so a theme that
	 * styles cover overlays styles these too. The hover overlay carries its
	 * opacity as a custom property instead: it is the value the stylesheet
	 * animates to, and a class cannot be read back at hover time.
	 *
	 * @param array $overlay  - resolved overlay values, see `block_render()`.
	 * @param bool  $is_hover - whether this is the overlay of the hover state.
	 *
	 * @return string
	 */
	private function get_overlay( $overlay, $is_hover = false ) {
		$dim_ratio      = (int) $overlay['dimRatio'];
		$has_background = $overlay['color'] || $overlay['customColor'] || $overlay['gradient'] || $overlay['customGradient'];

		if ( $dim_ratio <= 0 || ! $has_background ) {
			return '';
		}

		$classes = array( 'wp-block-visual-portfolio-item-cover__overlay' );
		$styles  = array();

		if ( $is_hover ) {
			$classes[] = 'wp-block-visual-portfolio-item-cover__overlay--hover';
			$styles[]  = '--vp-hover-overlay-opacity:' . round( $dim_ratio / 100, 2 );
		} else {
			$classes[] = 'has-background-dim';
			$classes[] = 'has-background-dim-' . $dim_ratio;
		}

		if ( $overlay['gradient'] || $overlay['customGradient'] ) {
			$classes[] = 'has-background-gradient';

			if ( $overlay['gradient'] ) {
				$classes[] = 'has-' . $overlay['gradient'] . '-gradient-background';
			} else {
				$styles[] = 'background:' . $overlay['customGradient'];
			}
		} elseif ( $overlay['color'] ) {
			$classes[] = 'has-' . $overlay['color'] . '-background-color';
		} else {
			$styles[] = 'background-color:' . $overlay['customColor'];
		}

		return sprintf(
			'<span class="%1$s"%2$s aria-hidden="true"></span>',
			esc_attr( implode( ' ', $classes ) ),
			empty( $styles ) ? '' : ' style="' . esc_attr( implode( ';', $styles ) ) . '"'
		);
	}

	/**
	 * What a click on the cover does.
	 *
	 * A sibling that covers the whole cover, not a wrapper around it: the content
	 * on top may hold links of its own, and an anchor inside an anchor is invalid
	 * markup. Being focusable it is also what reveals the content of a hover
	 * cover to a keyboard, through `:focus-within` - which is why a cover with no
	 * click action still hides nothing from a keyboard, it simply has nothing to
	 * hide behind.
	 *
	 * A popup trigger is the same anchor pointing at the full size image: with
	 * no lightbox module a click opens the picture.
	 *
	 * @param array $attributes - block attributes.
	 * @param array $context    - block context.
	 *
	 * @return string
	 */
	private function get_trigger( $attributes, $context ) {
		$action = $attributes['clickAction'] ?? 'none';

		// The anchor has no text of its own, so the label is not optional.
		$aria_label = $context['vp/itemAriaLabel'] ?? '';

		if ( 'url' === $action && ! empty( $context['vp/itemUrl'] ) ) {
			return sprintf(
				'<a class="wp-block-visual-portfolio-item-cover__link" href="%1$s" target="%2$s"%3$s aria-label="%4$s"></a>',
				esc_url( $context['vp/itemUrl'] ),
				esc_attr( $attributes['linkTarget'] ?? '_self' ),
				empty( $attributes['rel'] ) ? '' : ' rel="' . esc_attr( $attributes['rel'] ) . '"',
				esc_attr( $aria_label )
			);
		}

		if ( 'popup' !== $action ) {
			return '';
		}

		$trigger = Visual_Portfolio_Popup::get_trigger_attributes( $context );

		// An item the lightbox has nothing to show - a Pro source that refused
		// it, an image that no longer exists - is not made clickable.
		if ( empty( $trigger ) ) {
			return '';
		}

		return sprintf(
			'<a class="wp-block-visual-portfolio-item-cover__link" href="%1$s" data-vp-popup="%2$s" aria-label="%3$s"></a>',
			esc_url( $trigger['href'] ),
			esc_attr( $trigger['data-vp-popup'] ),
			esc_attr( $aria_label )
		);
	}

	/**
	 * The proportions of a rendered image.
	 *
	 * Read back off the tag rather than looked up: it is the one place every
	 * image path meets, including the remote images the Pro sources render
	 * through `vpf_wp_get_attachment_image`, which no attachment lookup knows.
	 *
	 * @param string $image - rendered image tag.
	 *
	 * @return string Ratio as `width/height`, or an empty string.
	 */
	private function get_image_ratio( $image ) {
		if ( ! $image ) {
			return '';
		}

		$processor = new WP_HTML_Tag_Processor( $image );

		if ( ! $processor->next_tag( 'img' ) ) {
			return '';
		}

		$width  = (int) $processor->get_attribute( 'width' );
		$height = (int) $processor->get_attribute( 'height' );

		return $width > 0 && $height > 0 ? $width . '/' . $height : '';
	}

	/**
	 * Attributes of the cover itself.
	 *
	 * @param array  $attributes   - block attributes.
	 * @param string $effect       - resolved effect.
	 * @param string $show_content - resolved reveal mode.
	 * @param string $aspect_ratio - resolved aspect ratio, already sanitized.
	 * @param bool   $has_link     - whether the cover rendered its link.
	 *
	 * @return array
	 */
	private function get_wrapper_attributes( $attributes, $effect, $show_content, $aspect_ratio, $has_link ) {
		$classes = array(
			'vp-effect-' . $effect,
			'vp-show-content-' . $show_content,
		);

		if ( $has_link ) {
			$classes[] = 'vp-has-link';
		}

		$position = $attributes['contentPosition'] ?? 'center';

		if ( isset( self::$content_positions[ $position ] ) ) {
			$classes[] = self::$content_positions[ $position ];
		}

		if ( ! empty( $attributes['verticalAlignment'] ) ) {
			$classes[] = 'is-vertically-aligned-' . preg_replace( '/[^a-z]/', '', (string) $attributes['verticalAlignment'] );
		}

		$styles = array();

		// A raw CSS length typed in the editor, printed into an inline style -
		// keep it to what a length can be made of.
		$min_height = preg_replace( '/[^0-9a-z.%\-]/i', '', (string) ( $attributes['minHeight'] ?? '' ) );

		if ( '' !== $min_height ) {
			$styles[] = 'min-height:' . $min_height;
		}

		// The ratio is published as a variable beside the property it sets, so a
		// stylesheet that lays the card out some other way can hand it to
		// another box.
		if ( '' !== $aspect_ratio ) {
			$styles[] = '--vp-cover-aspect-ratio:' . $aspect_ratio;
			$styles[] = 'aspect-ratio:' . $aspect_ratio;
		}

		$wrapper = array(
			// `get_block_wrapper_attributes()` escapes the values itself.
			'class' => implode( ' ', $classes ),
			'style' => implode( ';', $styles ),
		);

		if ( 'fly' !== $effect ) {
			return $wrapper;
		}

		// The side the pointer came in from, written by the script module. Until
		// it is there the stylesheet leaves the content alone, which is what
		// makes a cover without JavaScript a cover with its content shown.
		$wrapper['data-wp-interactive'] = self::STORE;
		$wrapper['data-wp-context']     = wp_json_encode( array( 'flyFrom' => '' ) );
		$wrapper['data-wp-init']        = 'callbacks.armFly';

		// Not the async variants: the side has to be on the element in the same
		// frame the pointer enters it, or the first transition runs the old way.
		$wrapper['data-wp-on--mouseenter']    = 'actions.setFlySide';
		$wrapper['data-wp-on--mouseleave']    = 'actions.setFlySide';
		$wrapper['data-wp-bind--data-vp-fly'] = 'context.flyFrom';

		return $wrapper;
	}

	/**
	 * The gap between the blocks the cover holds.
	 *
	 * Block spacing reaches CSS through the layout support, which core's Cover
	 * block has and this one does not: the gap belongs to the box holding the
	 * blocks, never to the card around it. The conversion is the one layout
	 * performs, down to the characters a length may not be made of.
	 *
	 * @param array $attributes - block attributes.
	 *
	 * @return string CSS length, or an empty string when there is none.
	 */
	private function get_block_gap( $attributes ) {
		$gap = $attributes['style']['spacing']['blockGap'] ?? '';

		if ( ! is_string( $gap ) || '' === $gap ) {
			return '';
		}

		if ( str_contains( $gap, 'var:preset|spacing|' ) ) {
			$slug = preg_replace( '/[^a-z0-9-]/', '', strtolower( substr( $gap, strrpos( $gap, '|' ) + 1 ) ) );

			return '' === $slug ? '' : 'var(--wp--preset--spacing--' . $slug . ')';
		}

		return preg_match( '%[\\\\(&=#<>]|-\s|/\*%', $gap ) ? '' : $gap;
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

		$effect = $attributes['effect'] ?? 'fade';
		$effect = in_array( $effect, array( 'none', 'fade', 'fly', 'emerge' ), true ) ? $effect : 'fade';

		$show_content = $attributes['showContent'] ?? 'hover';
		$show_content = in_array( $show_content, array( 'always', 'hover', 'never' ), true ) ? $show_content : 'hover';

		if ( 'fly' === $effect ) {
			wp_enqueue_script_module( self::VIEW_MODULE );
		}

		$image = $this->get_image( $attributes, $context );

		$aspect_ratio = trim( preg_replace( '#[^0-9./ ]#', '', (string) ( $attributes['aspectRatio'] ?? '' ) ) );

		// A cover with no ratio of its own takes the one of its image, so the box
		// is exactly the picture - which is what a masonry column is made of. The
		// grid patterns set a ratio and get their even rows instead.
		if ( '' === $aspect_ratio ) {
			$aspect_ratio = $this->get_image_ratio( $image );
		}

		$media = $image;

		$media .= $this->get_overlay(
			array(
				'dimRatio'       => $attributes['dimRatio'] ?? 0,
				'color'          => $attributes['overlayColor'] ?? '',
				'customColor'    => $attributes['customOverlayColor'] ?? '',
				'gradient'       => $attributes['gradient'] ?? '',
				'customGradient' => $attributes['customGradient'] ?? '',
			)
		);

		$media .= $this->get_overlay(
			array(
				'dimRatio'       => $attributes['hoverDimRatio'] ?? 0,
				'color'          => $attributes['hoverOverlayColor'] ?? '',
				'customColor'    => $attributes['customHoverOverlayColor'] ?? '',
				'gradient'       => $attributes['hoverGradient'] ?? '',
				'customGradient' => $attributes['customHoverGradient'] ?? '',
			),
			true
		);

		// The picture and everything painted on it are one box, so a stylesheet
		// that moves the content out from under the overlays can shape and stop
		// them both at once.
		$output = sprintf(
			'<div class="wp-block-visual-portfolio-item-cover__media">%s</div>',
			$media
		);

		// Content nobody is ever shown is content nothing has to announce either,
		// so it is left out rather than hidden.
		if ( 'never' !== $show_content ) {
			$gap = $this->get_block_gap( $attributes );

			$output .= sprintf(
				'<div class="wp-block-visual-portfolio-item-cover__inner"%1$s>%2$s</div>',
				'' === $gap ? '' : ' style="gap:' . esc_attr( $gap ) . '"',
				$content
			);
		}

		$link    = $this->get_trigger( $attributes, $context );
		$output .= $link;

		return sprintf(
			'<div %1$s>%2$s</div>',
			get_block_wrapper_attributes( $this->get_wrapper_attributes( $attributes, $effect, $show_content, $aspect_ratio, '' !== $link ) ),
			$output
		);
	}
}
new Visual_Portfolio_Block_Item_Cover();
