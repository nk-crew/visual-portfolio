<?php
/**
 * Prepare placeholder and lazy load.
 *
 * @package visual-portfolio/images
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Visual_Portfolio_Images
 */
class Visual_Portfolio_Images {
	/**
	 * When image process in progress with method get_attachment_image, this variable will be 'true'.
	 *
	 * @var bool
	 */
	public static $image_processing = false;

	/**
	 * Allow Visual Portfolio images to use lazyload.
	 *
	 * @var bool
	 */
	public static $allow_vp_lazyload = false;

	/**
	 * Allow WordPress images to use lazyload.
	 *
	 * @var bool
	 */
	public static $allow_wp_lazyload = false;

	/**
	 * The list of exclusions from the plugin settings.
	 *
	 * @var array
	 */
	public static $lazyload_user_exclusions = array();

	/**
	 * Visual_Portfolio_Images constructor.
	 */
	public static function construct() {
		add_action( 'wp', 'Visual_Portfolio_Images::init_lazyload' );
		add_action( 'after_setup_theme', 'Visual_Portfolio_Images::add_image_sizes' );
		add_filter( 'image_size_names_choose', 'Visual_Portfolio_Images::image_size_names_choose' );

		/**
		 * Allow `data:` inside image src attribute.
		 * Don't place this hook inside the `wp` hook.
		 *
		 * @link https://wordpress.org/support/topic/lazy-load-404-error-with-image-like-png/#post-16439422
		 */
		add_filter( 'kses_allowed_protocols', 'Visual_Portfolio_Images::kses_allowed_protocols', 15 );
	}

	/**
	 * Add image sizes.
	 */
	public static function add_image_sizes() {
		$sm       = Visual_Portfolio_Settings::get_option( 'sm', 'vp_images' );
		$md       = Visual_Portfolio_Settings::get_option( 'md', 'vp_images' );
		$lg       = Visual_Portfolio_Settings::get_option( 'lg', 'vp_images' );
		$xl       = Visual_Portfolio_Settings::get_option( 'xl', 'vp_images' );
		$sm_popup = Visual_Portfolio_Settings::get_option( 'sm_popup', 'vp_images' );
		$md_popup = Visual_Portfolio_Settings::get_option( 'md_popup', 'vp_images' );
		$xl_popup = Visual_Portfolio_Settings::get_option( 'xl_popup', 'vp_images' );

		// custom image sizes.
		add_image_size( 'vp_sm', $sm, 9999 );
		add_image_size( 'vp_md', $md, 9999 );
		add_image_size( 'vp_lg', $lg, 9999 );
		add_image_size( 'vp_xl', $xl, 9999 );
		add_image_size( 'vp_sm_popup', $sm_popup, 9999 );
		add_image_size( 'vp_md_popup', $md_popup, 9999 );
		add_image_size( 'vp_xl_popup', $xl_popup, 9999 );
	}

	/**
	 * Custom image sizes
	 *
	 * @param array $sizes - registered image sizes.
	 *
	 * @return array
	 */
	public static function image_size_names_choose( $sizes ) {
		return array_merge(
			$sizes,
			array(
				'vp_sm' => esc_html__( 'Small (VP)', 'visual-portfolio' ),
				'vp_md' => esc_html__( 'Medium (VP)', 'visual-portfolio' ),
				'vp_lg' => esc_html__( 'Large (VP)', 'visual-portfolio' ),
				'vp_xl' => esc_html__( 'Extra Large (VP)', 'visual-portfolio' ),
			)
		);
	}

	/**
	 * Get blocked attributes to prevent our images lazy loading.
	 */
	public static function get_image_blocked_attributes() {
		$blocked_attributes = array(
			'data-skip-lazy',
			'data-no-lazy',
			'data-src',
			'data-srcset',
			'data-lazy-original',
			'data-lazy-src',
			'data-lazysrc',
			'data-lazyload',
			'data-bgposition',
			'data-envira-src',
			'fullurl',
			'lazy-slider-img',
		);

		/**
		 * Allow plugins and themes to tell lazy images to skip an image with a given attribute.
		 */
		return apply_filters( 'vpf_lazyload_images_blocked_attributes', $blocked_attributes );
	}

	/**
	 * Init Lazyload
	 */
	public static function init_lazyload() {
		// Don't lazy load for feeds, previews and admin side.
		if ( is_feed() || is_preview() || is_admin() ) {
			return;
		}

		// Don't add on AMP endpoint.
		if ( function_exists( 'is_amp_endpoint' ) && is_amp_endpoint() ) {
			return;
		}

		// Disable using filter.
		// Same filter used in `class-assets.php`.
		if ( ! apply_filters( 'vpf_images_lazyload', true ) ) {
			return;
		}

		self::$allow_vp_lazyload = ! ! Visual_Portfolio_Settings::get_option( 'lazy_loading', 'vp_images' );
		self::$allow_wp_lazyload = 'full' === Visual_Portfolio_Settings::get_option( 'lazy_loading', 'vp_images' );

		// Check for plugin settings.
		if ( ! self::$allow_vp_lazyload && ! self::$allow_wp_lazyload ) {
			return;
		}

		$lazyload_exclusions = Visual_Portfolio_Settings::get_option( 'lazy_loading_excludes', 'vp_images' );
		if ( $lazyload_exclusions ) {
			self::$lazyload_user_exclusions = explode( "\n", $lazyload_exclusions );

			add_filter( 'vpf_lazyload_skip_image_with_attributes', 'Visual_Portfolio_Images::add_lazyload_exclusions', 10, 2 );
		}

		if ( self::$allow_wp_lazyload ) {
			add_filter( 'the_content', 'Visual_Portfolio_Images::add_image_placeholders', 9999 );
			add_filter( 'post_thumbnail_html', 'Visual_Portfolio_Images::add_image_placeholders', 9999 );
			add_filter( 'get_avatar', 'Visual_Portfolio_Images::add_image_placeholders', 9999 );
			add_filter( 'widget_text', 'Visual_Portfolio_Images::add_image_placeholders', 9999 );
			add_filter( 'get_image_tag', 'Visual_Portfolio_Images::add_image_placeholders', 9999 );
		}

		add_action( 'wp_kses_allowed_html', 'Visual_Portfolio_Images::allow_lazy_attributes' );
		add_action( 'wp_head', 'Visual_Portfolio_Images::add_nojs_fallback' );
	}

	/**
	 * Get the URL of an image attachment.
	 *
	 * @param int          $attachment_id Image attachment ID.
	 * @param string|array $size          Optional. Image size to retrieve. Accepts any valid image size, or an array
	 *                                    of width and height values in pixels (in that order). Default 'thumbnail'.
	 * @param bool         $icon          Optional. Whether the image should be treated as an icon. Default false.
	 *
	 * @return string|false Attachment URL or false if no image is available.
	 */
	public static function wp_get_attachment_image_url( $attachment_id, $size = 'thumbnail', $icon = false ) {
		$mime_type = get_post_mime_type( $attachment_id );

		// Prevent usage of resized GIFs, since GIFs animated only in full size.
		if ( $mime_type && 'image/gif' === $mime_type ) {
			$size = 'full';
		}

		return wp_get_attachment_image_url( $attachment_id, $size, $icon );
	}

	/**
	 * Allow attributes of Lazy Load for wp_kses.
	 *
	 * @param array $allowed_tags The allowed tags and their attributes.
	 *
	 * @return array
	 */
	public static function allow_lazy_attributes( $allowed_tags ) {
		if ( ! isset( $allowed_tags['img'] ) ) {
			return $allowed_tags;
		}

		// But, if images are allowed, ensure that our attributes are allowed!
		$img_attributes = array_merge(
			$allowed_tags['img'],
			array(
				'data-src'     => 1,
				'data-sizes'   => 1,
				'data-srcset'  => 1,
				'data-no-lazy' => 1,
				'loading'      => 1,
			)
		);

		$allowed_tags['img'] = $img_attributes;

		return $allowed_tags;
	}

	/**
	 * Fix img src attribute correction in wp_kses.
	 *
	 * @param array $protocols protocols array.
	 *
	 * @return array
	 */
	public static function kses_allowed_protocols( $protocols ) {
		$protocols[] = 'data';
		return $protocols;
	}

	/**
	 * Add image placeholders.
	 *
	 * @param string $content Content.
	 * @return string
	 */
	public static function add_image_placeholders( $content ) {
		// This is a pretty simple regex, but it works.
		//
		// 1. Find <img> tags
		// 2. Exclude tags, placed inside <noscript>.
		$content = preg_replace_callback( '#(?<!noscript\>)<(img)([^>]+?)(>(.*?)</\\1>|[\/]?>)#si', 'Visual_Portfolio_Images::process_image', $content );

		return $content;
	}

	/**
	 * Returns true when a given array of attributes contains attributes or class signifying lazy images.
	 * should not process the image.
	 *
	 * @param array $attributes all available image attributes.
	 *
	 * @return bool
	 */
	public static function should_skip_image_with_blocked_attributes( $attributes ) {
		// Check for blocked classes.
		if ( ! empty( $attributes['class'] ) ) {
			$blocked_classes = array(
				'lazy',
				'lazyload',
				'lazy-load',
				'skip-lazy',
				'no-lazy',
				'gazette-featured-content-thumbnail',
			);

			/**
			 * Allow plugins and themes to tell lazy images to skip an image with a given class.
			 */
			$blocked_classes = apply_filters( 'vpf_lazyload_images_blocked_classes', $blocked_classes );

			if ( is_array( $blocked_classes ) && ! empty( $blocked_classes ) ) {
				foreach ( $blocked_classes as $class ) {
					if ( false !== strpos( $attributes['class'], $class ) ) {
						return true;
					}
				}
			}
		}

		// Check for blocked src.
		if ( ! empty( $attributes['src'] ) ) {
			$blocked_src = array(
				'/wpcf7_captcha/',
				'timthumb.php?src',
			);

			/**
			 * Allow plugins and themes to tell lazy images to skip an image with a given class.
			 */
			$blocked_src = apply_filters( 'vpf_lazyload_images_blocked_src', $blocked_src );

			if ( is_array( $blocked_src ) && ! empty( $blocked_src ) ) {
				foreach ( $blocked_src as $src ) {
					if ( false !== strpos( $attributes['src'], $src ) ) {
						return true;
					}
				}
			}
		}

		$blocked_attributes = self::get_image_blocked_attributes();

		foreach ( $blocked_attributes as $attr ) {
			if ( isset( $attributes[ $attr ] ) ) {
				return true;
			}
		}

		/**
		 * Allow plugins and themes to conditionally skip processing an image via its attributes.
		 */
		if ( apply_filters( 'vpf_lazyload_skip_image_with_attributes', false, $attributes ) ) {
			return true;
		}

		return false;
	}

	/**
	 * Skip lazy loading using exclusion settings.
	 *
	 * @param boolean $return - default return value.
	 * @param array   $attributes - image attributes.
	 *
	 * @return boolean
	 */
	public static function add_lazyload_exclusions( $return, $attributes ) {
		if ( ! empty( self::$lazyload_user_exclusions ) && ! empty( $attributes ) ) {
			$full_attributes_string = '';

			foreach ( $attributes as $k => $attr ) {
				$full_attributes_string .= ' ' . $k . '="' . $attr . '"';
			}

			foreach ( self::$lazyload_user_exclusions as $exclusion ) {
				if ( $exclusion && false !== strpos( $full_attributes_string, $exclusion ) ) {
					// `true` means - exclude this image from lazy loading.
					return true;
				}
			}
		}

		return $return;
	}

	/**
	 * Processes images in content by acting as the preg_replace_callback.
	 *
	 * @param array $matches Matches.
	 *
	 * @return string The image with updated lazy attributes.
	 */
	public static function process_image( $matches ) {
		$old_attributes_str       = $matches[2];
		$old_attributes_kses_hair = wp_kses_hair( $old_attributes_str, wp_allowed_protocols() );

		$fallback = $matches[0];

		if ( empty( $old_attributes_kses_hair['src'] ) ) {
			return $fallback;
		}

		$old_attributes = self::flatten_kses_hair_data( $old_attributes_kses_hair );

		// Return original image if image is already lazy loaded.
		if ( ! empty( $old_attributes['class'] ) && false !== strpos( $old_attributes['class'], 'vp-lazyload' ) ) {
			return $fallback;
		}

		$new_attributes = self::process_image_attributes( $old_attributes );

		// Return original image if new attributes does not contains the lazyload class.
		if ( empty( $new_attributes['class'] ) || false === strpos( $new_attributes['class'], 'vp-lazyload' ) ) {
			return $fallback;
		}

		// Skip 3rd-party lazy loading from noscript img tag.
		$fallback = str_replace( ' src="', ' data-skip-lazy src="', $fallback );

		$new_attributes_str = self::build_attributes_string( $new_attributes );

		return sprintf( '<noscript>%1$s</noscript><img %2$s>', $fallback, $new_attributes_str );
	}

	/**
	 * Given an array of image attributes, updates the `src`, `srcset`, and `sizes` attributes so
	 * that they load lazily.
	 *
	 * @param array $attributes Attributes.
	 *
	 * @return array The updated image attributes array with lazy load attributes.
	 */
	public static function process_image_attributes( $attributes ) {
		// Skip lazy load from VPF images if option disabled.
		if ( ! self::$allow_vp_lazyload && self::$image_processing ) {
			return $attributes;
		}

		// Skip lazy load from WordPress images if option disabled.
		if ( ! self::$allow_wp_lazyload && ! self::$image_processing ) {
			return $attributes;
		}

		if ( empty( $attributes['src'] ) ) {
			return $attributes;
		}

		if ( self::should_skip_image_with_blocked_attributes( $attributes ) ) {
			return $attributes;
		}

		// Default Placeholder.
		$placeholder   = false;
		$placeholder_w = isset( $attributes['width'] ) ? $attributes['width'] : false;
		$placeholder_h = isset( $attributes['height'] ) ? $attributes['height'] : false;

		// Trying to get image size from metadata.
		if ( ! $placeholder_w || ! $placeholder_h ) {
			$image_id = self::attributes_to_image_id( $attributes );
			$metadata = get_post_meta( $image_id, '_wp_attachment_metadata', true );

			if ( isset( $metadata['width'] ) && isset( $metadata['height'] ) ) {
				$placeholder_w = $metadata['width'];
				$placeholder_h = $metadata['height'];
			}
		}

		if ( $placeholder_w && $placeholder_h ) {
			$placeholder = self::get_image_placeholder( $placeholder_w, $placeholder_h );
		}

		$attributes['data-src'] = $attributes['src'];

		if ( ! empty( $attributes['srcset'] ) ) {
			$attributes['data-srcset'] = $attributes['srcset'];

			if ( $placeholder ) {
				$attributes['srcset'] = $placeholder;
			} else {
				unset( $attributes['srcset'] );
			}

			// In case if the image doesn't have `srcset`, we need to add placeholder to `src`.
		} elseif ( $placeholder ) {
			$attributes['src'] = $placeholder;
		}

		if ( isset( $attributes['sizes'] ) ) {
			unset( $attributes['sizes'] );
		}

		$attributes['data-sizes'] = 'auto';

		// Prevent Native lazy loading.
		$attributes['loading'] = 'eager';

		// Add custom classname.
		$attributes['class']  = empty( $attributes['class'] ) ? '' : ( $attributes['class'] . ' ' );
		$attributes['class'] .= 'vp-lazyload';

		/**
		 * Allow plugins and themes to override the attributes on the image before the content is updated.
		 *
		 * One potential use of this filter is for themes that set `height:auto` on the `img` tag.
		 * With this filter, the theme could get the width and height attributes from the
		 * $attributes array and then add a style tag that sets those values as well, which could
		 * minimize reflow as images load.
		 */
		return apply_filters( 'vpf_lazyload_images_new_attributes', $attributes );
	}

	/**
	 * Get attachment image wrapper.
	 *
	 * @param string|int   $attachment_id attachment image id.
	 * @param string|array $size image size.
	 * @param bool         $icon icon.
	 * @param string|array $attr image attributes.
	 * @param bool         $lazyload DEPRECATED use lazyload tags.
	 *
	 * @return string
	 */
	public static function get_attachment_image( $attachment_id, $size = 'thumbnail', $icon = false, $attr = '', $lazyload = true ) {
		$mime_type = get_post_mime_type( $attachment_id );

		// Prevent usage of resized GIFs, since GIFs animated only in full size.
		if ( $mime_type && 'image/gif' === $mime_type ) {
			$size = 'full';
		}

		self::$image_processing = true;

		$image = apply_filters( 'vpf_wp_get_attachment_image', false, $attachment_id, $size, $attr, $lazyload );

		if ( ! $image && false === strripos( $attachment_id, 'vpf_pro_social' ) ) {
			if ( ! is_array( $attr ) ) {
				$attr = array();
			}
			if ( ! isset( $attr['class'] ) ) {
				$attr['class'] = '';
			}

			// Add class `wp-image-ID` to allow parsers to get current image ID and make manipulations.
			// For example, this class is used in our lazyloading script to determine the image ID.
			$attr['class'] .= ( $attr['class'] ? ' ' : '' ) . 'wp-image-' . $attachment_id;

			$image = wp_get_attachment_image( $attachment_id, $size, $icon, $attr );
		}

		// Maybe prepare lazy load output.
		if ( self::$allow_vp_lazyload ) {
			$image = self::add_image_placeholders( $image );
		}

		self::$image_processing = false;

		return $image;
	}

	/**
	 * Generation placeholder.
	 *
	 * @param int $width  Width of image.
	 * @param int $height Height of image.
	 *
	 * @return string
	 */
	public static function get_image_placeholder( $width = 1, $height = 1 ) {
		if ( ! (int) $width || ! (int) $height ) {
			return false;
		}

		// We need to use base64 to prevent rare cases when users use plugins
		// that replaces http to https in xmlns attribute.
        // phpcs:ignore WordPress.PHP.DiscouragedPHPFunctions.obfuscation_base64_encode
		$placeholder = base64_encode( '<svg width="' . $width . '" height="' . $height . '" viewBox="0 0 ' . $width . ' ' . $height . '" fill="none" xmlns="http://www.w3.org/2000/svg"></svg>' );

		$escape_search  = array( '<', '>', '#', '"' );
		$escape_replace = array( '%3c', '%3e', '%23', '\'' );

		return apply_filters(
			'vpf_lazyload_image_placeholder',
			'data:image/svg+xml;base64,' . str_replace( $escape_search, $escape_replace, $placeholder )
		);
	}

	/**
	 * Flatter KSES hair data.
	 *
	 * @param array $attributes Attributes.
	 *
	 * @return array
	 */
	private static function flatten_kses_hair_data( $attributes ) {
		$flattened_attributes = array();

		foreach ( $attributes as $name => $attribute ) {
			$flattened_attributes[ $name ] = $attribute['value'];
		}

		return $flattened_attributes;
	}

	/**
	 * Build attributes string.
	 *
	 * @param array $attributes Attributes.
	 *
	 * @return string
	 */
	public static function build_attributes_string( $attributes ) {
		$string = array();

		foreach ( $attributes as $name => $value ) {
			if ( '' === $value ) {
				$string[] = sprintf( '%s', $name );
			} else {
				$string[] = sprintf( '%s="%s"', $name, esc_attr( $value ) );
			}
		}

		return implode( ' ', $string );
	}

	/**
	 * Tries to convert an attachment IMG attr into a post object.
	 *
	 * @param array $attributes image attributes.
	 *
	 * @return int|bool
	 */
	private static function attributes_to_image_id( $attributes ) {
		$img_id = false;

		// Get ID from class.
		if ( isset( $attributes['class'] ) && preg_match( '/wp-image-(\d*)/i', $attributes['class'], $match ) ) {
			$img_id = $match[1];
		}

		if ( ! $img_id && isset( $attributes['src'] ) ) {
			// Remove the thumbnail size.
			$src    = preg_replace( '~-[0-9]+x[0-9]+(?=\..{2,6})~', '', $attributes['src'] );
			$img_id = attachment_url_to_postid( $src );

			// Sometimes, when the uploaded image larger than max-size, this image scaled and filename changed to `NAME-scaled.EXT`.
			if ( ! $img_id ) {
				$src    = preg_replace( '~-[0-9]+x[0-9]+(?=\..{2,6})~', '-scaled', $attributes['src'] );
				$img_id = attachment_url_to_postid( $src );
			}
		}

		return $img_id;
	}

	/**
	 * Adds JavaScript to check if the current browser supports JavaScript as well as some styles to hide lazy
	 * images when the browser does not support JavaScript.
	 */
	public static function add_nojs_fallback() {
		?>
		<style type="text/css">
			/* If html does not have either class, do not show lazy loaded images. */
			html:not(.vp-lazyload-enabled):not(.js) .vp-lazyload {
				display: none;
			}
		</style>
		<script>
			document.documentElement.classList.add(
				'vp-lazyload-enabled'
			);
		</script>
		<?php
	}
}
Visual_Portfolio_Images::construct();
