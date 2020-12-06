<?php
/**
 * Prepare placeholder and lazy load.
 *
 * @package @@plugin_name/images
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
     * Visual_Portfolio_Images constructor.
     */
    public static function construct() {
        add_action( 'wp', 'Visual_Portfolio_Images::init_lazyload' );

        self::add_image_sizes();
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

        add_filter( 'image_size_names_choose', 'Visual_Portfolio_Images::image_size_names_choose' );
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
                'vp_sm' => esc_html__( 'Small (VP)', '@@text_domain' ),
                'vp_md' => esc_html__( 'Medium (VP)', '@@text_domain' ),
                'vp_lg' => esc_html__( 'Large (VP)', '@@text_domain' ),
                'vp_xl' => esc_html__( 'Extra Large (VP)', '@@text_domain' ),
            )
        );
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

        self::$allow_vp_lazyload = ! ! Visual_Portfolio_Settings::get_option( 'lazy_loading', 'vp_images' );
        self::$allow_wp_lazyload = 'full' === Visual_Portfolio_Settings::get_option( 'lazy_loading', 'vp_images' );

        // Check for plugin settings.
        if ( ! self::$allow_vp_lazyload && ! self::$allow_wp_lazyload ) {
            return;
        }

        // disable using filter.
        if ( ! apply_filters( 'vpf_images_lazyload', true ) ) {
            return;
        }

        if ( self::$allow_wp_lazyload ) {
            add_filter( 'the_content', 'Visual_Portfolio_Images::add_image_placeholders', 9999 );
            add_filter( 'post_thumbnail_html', 'Visual_Portfolio_Images::add_image_placeholders', 9999 );
            add_filter( 'get_avatar', 'Visual_Portfolio_Images::add_image_placeholders', 9999 );
            add_filter( 'widget_text', 'Visual_Portfolio_Images::add_image_placeholders', 9999 );
            add_filter( 'get_image_tag', 'Visual_Portfolio_Images::add_image_placeholders', 9999 );
        }
        add_filter( 'wp_get_attachment_image_attributes', 'Visual_Portfolio_Images::process_image_attributes', 9999 );

        add_action( 'wp_kses_allowed_html', 'Visual_Portfolio_Images::allow_lazy_attributes' );
        add_filter( 'vpf_image_item_args', 'Visual_Portfolio_Images::vp_kses_allow_lazy_attributes', 15 );
        add_filter( 'vpf_post_item_args', 'Visual_Portfolio_Images::vp_kses_allow_lazy_attributes', 15 );
        add_filter( 'kses_allowed_protocols', 'Visual_Portfolio_Images::kses_allowed_protocols', 15 );
        add_action( 'wp_head', 'Visual_Portfolio_Images::add_nojs_fallback' );

        // ignore Jetpack lazy.
        add_filter( 'jetpack_lazy_images_skip_image_with_attributes', 'Visual_Portfolio_Images::jetpack_lazy_images_skip_image_with_attributes', 15, 2 );
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
     * Allow attributes of Lazy Load for wp_kses used in vp images.
     *
     * @param array $args vp item args.
     *
     * @return array
     */
    public static function vp_kses_allow_lazy_attributes( $args ) {
        $args['image_allowed_html']['noscript'] = array();

        $args['image_allowed_html']['img'] = array_merge(
            $args['image_allowed_html']['img'],
            array(
                'loading'      => array(),
                'data-src'     => array(),
                'data-sizes'   => array(),
                'data-srcset'  => array(),
                'data-no-lazy' => array(),
            )
        );

        return $args;
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
        $content = preg_replace_callback( '#<(img)([^>]+?)(>(.*?)</\\1>|[\/]?>)#si', 'Visual_Portfolio_Images::process_image', $content );

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
                'lazyload',
                'skip-lazy',
                'gazette-featured-content-thumbnail',
            );

            /**
             * Allow plugins and themes to tell lazy images to skip an image with a given class.
             */
            $blocked_classes = apply_filters( 'vpf_lazyload_images_blocked_classes', $blocked_classes );

            if ( ! is_array( $blocked_classes ) || empty( $blocked_classes ) ) {
                return false;
            }

            foreach ( $blocked_classes as $class ) {
                if ( false !== strpos( $attributes['class'], $class ) ) {
                    return true;
                }
            }
        }

        $blocked_attributes = array(
            'data-skip-lazy',
            'data-src',
        );

        foreach ( $blocked_attributes as $attr ) {
            if ( isset( $attributes[ $attr ] ) ) {
                return true;
            }
        }

        // Skip lazy load from VPF images if option disabled.
        if ( ! self::$allow_vp_lazyload && self::$image_processing ) {
            return true;
        }

        // Skip lazy load from WordPress images if option disabled.
        if ( ! self::$allow_wp_lazyload && ! self::$image_processing ) {
            return true;
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
     * Processes images in content by acting as the preg_replace_callback.
     *
     * @param array $matches Matches.
     *
     * @return string The image with updated lazy attributes.
     */
    public static function process_image( $matches ) {
        $old_attributes_str       = $matches[2];
        $old_attributes_kses_hair = wp_kses_hair( $old_attributes_str, wp_allowed_protocols() );

        if ( empty( $old_attributes_kses_hair['src'] ) ) {
            return $matches[0];
        }

        $old_attributes = self::flatten_kses_hair_data( $old_attributes_kses_hair );

        // If we didn't add lazy attributes, just return the original image source.
        if ( ! empty( $old_attributes['class'] ) && false !== strpos( $old_attributes['class'], 'vp-lazyload' ) ) {
            return $matches[0];
        }

        $new_attributes     = self::process_image_attributes( $old_attributes );
        $new_attributes_str = self::build_attributes_string( $new_attributes );

        return sprintf( '<noscript>%1$s</noscript><img %2$s>', $matches[0], $new_attributes_str );
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

        if ( isset( $attributes['srcset'] ) ) {
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
        $attributes['class'] = sprintf( '%s vp-lazyload', empty( $attributes['class'] ) ? '' : $attributes['class'] );

        // Prevent WP Rocket lazy loading.
        if ( defined( 'WP_ROCKET_VERSION' ) ) {
            $attributes['data-no-lazy'] = '1';
        }

        // Prevent WP Smush lazy loading.
        if ( class_exists( 'WP_Smush' ) || class_exists( 'Smush\WP_Smush' ) ) {
            $attributes['class'] .= ' no-lazyload';
        }

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

        if ( ! $image ) {
            $image = wp_get_attachment_image( $attachment_id, $size, $icon, $attr );
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

        $ratio  = self::get_ratio( $width, $height );
        $width  = $ratio['width'];
        $height = $ratio['height'];

        // We need to use base64 to prevent rare cases when users use plugins
        // that replaces http to https in xmlns attribute.
        // phpcs:ignore
        $placeholder = base64_encode( '<svg width="' . $width . '" height="' . $height . '" viewBox="0 0 ' . $width . ' ' . $height . '" fill="none" xmlns="http://www.w3.org/2000/svg"></svg>' );

        $escape_search  = array( '<', '>', '#', '"' );
        $escape_replace = array( '%3c', '%3e', '%23', '\'' );

        return apply_filters(
            'vpf_lazyload_image_placeholder',
            'data:image/svg+xml;base64,' . str_replace( $escape_search, $escape_replace, $placeholder )
        );
    }

    /**
     * GCD
     * https://en.wikipedia.org/wiki/Greatest_common_divisor
     *
     * @param int $width size.
     * @param int $height size.
     * @return float
     */
    public static function greatest_common_divisor( $width, $height ) {
        return ( $width % $height ) ? self::greatest_common_divisor( $height, $width % $height ) : $height;
    }

    /**
     * Get Aspect Ratio of real width and height
     *
     * @param int $width size.
     * @param int $height size.
     * @return array
     */
    public static function get_ratio( $width, $height ) {
        $gcd = self::greatest_common_divisor( $width, $height );

        return array(
            'width'  => $width / $gcd,
            'height' => $height / $gcd,
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
    private static function build_attributes_string( $attributes ) {
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
        // Get ID from class.
        if ( isset( $attributes['class'] ) && preg_match( '/wp-image-(\d*)/i', $attributes['class'], $match ) ) {
            return $match[1];
        }

        if ( isset( $attributes['src'] ) ) {
            // Remove the thumbnail size.
            $src = preg_replace( '~-[0-9]+x[0-9]+(?=\..{2,6})~', '', $attributes['src'] );

            return attachment_url_to_postid( $src );
        }

        return false;
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

    /**
     * Skip Jetpack lazy loading.
     *
     * @param boolean $return     skip lazy Jetpack.
     * @param array   $attributes image attributes.
     *
     * @return boolean
     */
    public static function jetpack_lazy_images_skip_image_with_attributes( $return, $attributes ) {
        return isset( $attributes['data-src'] );
    }
}
Visual_Portfolio_Images::construct();
