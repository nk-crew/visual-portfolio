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
     * Visual_Portfolio_Images constructor.
     */
    public static function construct() {
        add_action( 'init', 'Visual_Portfolio_Images::allow_lazy_attributes' );
        add_filter( 'kses_allowed_protocols', 'Visual_Portfolio_Images::kses_allowed_protocols', 15 );
        add_filter( 'wp_get_attachment_image_attributes', 'Visual_Portfolio_Images::add_image_placeholders', 15, 3 );

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
     * Init hooks.
     */
    public static function is_enabled() {
        // check for AMP endpoint.
        if ( function_exists( 'is_amp_endpoint' ) && is_amp_endpoint() ) {
            return false;
        }

        // check plugin settings.
        $enabled = Visual_Portfolio_Settings::get_option( 'lazy_loading', 'vp_images' );
        if ( ! $enabled ) {
            return false;
        }

        // disable using filter.
        if ( ! apply_filters( 'vpf_images_lazyload', true ) ) {
            return false;
        }

        return true;
    }

    /**
     * Allow attributes of Lazy Load for wp_kses.
     */
    public static function allow_lazy_attributes() {
        global $allowedposttags;

        if ( $allowedposttags ) {
            foreach ( $allowedposttags as $key => & $tags ) {
                if ( 'img' === $key ) {
                    $tags['data-src']     = true;
                    $tags['data-sizes']   = true;
                    $tags['data-srcset']  = true;
                    $tags['data-no-lazy'] = true;
                    $tags['loading']      = true;
                }
            }
        }
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
     * Get attachment image wrapper.
     *
     * @param string|int   $attachment_id attachment image id.
     * @param string|array $size image size.
     * @param bool         $icon icon.
     * @param string|array $attr image attributes.
     * @param bool         $lazyload use lazyload tags.
     *
     * @return string
     */
    public static function get_attachment_image( $attachment_id, $size = 'thumbnail', $icon = false, $attr = '', $lazyload = true ) {
        $mime_type = get_post_mime_type( $attachment_id );
        $lazyload  = self::is_enabled() && $lazyload;
        $noscript  = '';

        // Prevent usage of resized GIFs, since GIFs animated only in full size.
        if ( $mime_type && 'image/gif' === $mime_type ) {
            $size = 'full';
        }

        if ( $lazyload ) {
            $noscript = apply_filters( 'vpf_wp_get_attachment_image', false, $attachment_id, $size, $attr, false );

            if ( ! $noscript ) {
                $noscript = wp_get_attachment_image( $attachment_id, $size, $icon, $attr );
            }

            if ( $noscript ) {
                $noscript = '<noscript>' . $noscript . '</noscript>';
            }
        }

        if ( $lazyload ) {
            self::$image_processing = true;
        }

        $image = apply_filters( 'vpf_wp_get_attachment_image', false, $attachment_id, $size, $attr, $lazyload );

        if ( ! $image ) {
            $image = wp_get_attachment_image( $attachment_id, $size, $icon, $attr );
        }

        if ( $lazyload ) {
            self::$image_processing = false;
        }

        return $noscript . $image;
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
        if ( ! self::is_enabled() ) {
            return false;
        }

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

        return 'data:image/svg+xml;base64,' . str_replace( $escape_search, $escape_replace, $placeholder );
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
     * Add placeholder for Visual Portfolio images.
     *
     * @param array        $attr       Attributes for the image markup.
     * @param WP_Post      $attachment Image attachment post.
     * @param string|array $size       Requested size. Image size or array of width and height values
     *                                 (in that order). Default 'thumbnail'.
     *
     * @return array
     */
    public static function add_image_placeholders( $attr, $attachment, $size ) {
        if ( ! self::is_enabled() ) {
            return $attr;
        }

        // Is string.
        if ( ! is_string( $size ) ) {
            return $attr;
        }

        // Use only when called class method get_attachment_image.
        if ( ! self::$image_processing ) {
            return $attr;
        }

        // Lazyload already added.
        if ( strpos( $attr['class'], 'lazyload' ) !== false || isset( $attr['data-src'] ) ) {
            return $attr;
        }

        // Get attachment id.
        $attachment_id = null;

        if ( isset( $attachment->ID ) ) {
            $attachment_id = $attachment->ID;
        } elseif ( isset( $attachment['ID'] ) ) {
            $attachment_id = $attachment['ID'];
        }

        // Default Placeholder.
        $placeholder   = false;
        $placeholder_w = isset( $attr['width'] ) ? $attr['width'] : false;
        $placeholder_h = isset( $attr['height'] ) ? $attr['height'] : false;

        if ( ! $placeholder_w || ! $placeholder_h ) {
            // The right Image Placeholder.
            $metadata = get_post_meta( $attachment_id, '_wp_attachment_metadata', true );

            // generate placeholder.
            if ( isset( $metadata['sizes'][ $size ] ) && isset( $metadata['sizes'][ $size ]['width'] ) && isset( $metadata['sizes'][ $size ]['height'] ) ) {
                $placeholder_w = $metadata['sizes'][ $size ]['width'];
                $placeholder_h = $metadata['sizes'][ $size ]['height'];
            } elseif ( isset( $metadata['width'] ) && isset( $metadata['height'] ) ) {
                $placeholder_w = $metadata['width'];
                $placeholder_h = $metadata['height'];
            }
        }

        if ( $placeholder_w && $placeholder_h ) {
            $placeholder = self::get_image_placeholder( $placeholder_w, $placeholder_h );
        }

        // Prevent WP Rocket lazy loading.
        if ( defined( 'WP_ROCKET_VERSION' ) ) {
            $attr['data-no-lazy'] = '1';
        }

        // Prevent WP Smush lazy loading.
        if ( class_exists( 'WP_Smush' ) || class_exists( 'Smush\WP_Smush' ) ) {
            $attr['class'] .= ' no-lazyload';
        }

        // Prevent Native lazy loading.
        $attr['loading'] = 'eager';

        // lazy placeholder.
        if ( $placeholder ) {
            $attr['data-src'] = $attr['src'];
            $attr['src']      = $placeholder;
        }

        $attr['class'] .= ' vp-lazyload';

        // Src Set and Sizes.
        if ( isset( $attr['sizes'] ) ) {
            $attr['data-sizes'] = 'auto';
            unset( $attr['sizes'] );
        }
        if ( isset( $attr['srcset'] ) ) {
            $attr['data-srcset'] = $attr['srcset'];
            unset( $attr['srcset'] );
        }

        return $attr;
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
