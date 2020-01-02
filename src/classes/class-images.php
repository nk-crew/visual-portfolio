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
        // Prepare images base64 placeholders.
        // Thanks https://wordpress.org/plugins/powerkit/.
        add_action( 'init', 'Visual_Portfolio_Images::allow_lazy_attributes' );
        add_filter( 'kses_allowed_protocols', 'Visual_Portfolio_Images::kses_allowed_protocols', 15 );
        add_filter( 'wp_update_attachment_metadata', 'Visual_Portfolio_Images::generate_attachment_placeholder', 15 );
        add_filter( 'wp_generate_attachment_metadata', 'Visual_Portfolio_Images::generate_attachment_placeholder', 15 );
        add_filter( 'wp_get_attachment_image_attributes', 'Visual_Portfolio_Images::add_image_placeholders', 15, 3 );

        // ignore Jetpack lazy.
        add_filter( 'jetpack_lazy_images_skip_image_with_attributes', 'Visual_Portfolio_Images::jetpack_lazy_images_skip_image_with_attributes', 15, 2 );
    }

    /**
     * Init hooks.
     */
    public static function is_enabled() {
        // check for AMP endpoint.
        if ( function_exists( 'is_amp_endpoint' ) && is_amp_endpoint() ) {
            return false;
        }

        // check if php GD library installed.
        if ( ! extension_loaded( 'gd' ) || ! function_exists( 'imagecreate' ) ) {
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
                    $tags['data-vpf-src']    = true;
                    $tags['data-vpf-sizes']  = true;
                    $tags['data-vpf-srcset'] = true;
                    $tags['data-no-lazy']    = true;
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
        $lazyload = self::is_enabled() && $lazyload;

        if ( $lazyload ) {
            self::$image_processing = true;
        }

        $image = apply_filters( 'vpf_wp_get_attachment_image_extend', false, $attachment_id, $size, $attr, $lazyload );

        if ( ! $image ) {
            $image = wp_get_attachment_image( $attachment_id, $size, $icon, $attr );
        }

        if ( $lazyload ) {
            self::$image_processing = false;
        }

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
        if ( ! self::is_enabled() ) {
            return false;
        }

        if ( ! (int) $width || ! (int) $height ) {
            return false;
        }

        $ratio  = self::get_ratio( $width, $height );
        $width  = $ratio['width'];
        $height = $ratio['height'];

        $transient = sprintf( 'vpf_image_placeholder_%s_%s', $width, $height );

        $placeholder_image = get_transient( $transient );

        if ( ! $placeholder_image ) {
            ob_start();

            $image      = imagecreate( $width, $height );
            $background = imagecolorallocatealpha( $image, 0, 0, 255, 127 );

            imagepng( $image, null, 9 );
            imagecolordeallocate( $image, $background );
            imagedestroy( $image );

            $placeholder_code = ob_get_clean();

            // phpcs:ignore
            $placeholder_image = 'data:image/png;base64,' . base64_encode( $placeholder_code );

            set_transient( $transient, $placeholder_image );
        }

        return $placeholder_image;
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
     * Attachment metadata filter.
     *
     * @param array $metadata - attachment meta data.
     *
     * @return array
     */
    public static function generate_attachment_placeholder( $metadata ) {
        if ( ! self::is_enabled() ) {
            return $metadata;
        }

        // Generate image full size.
        if ( isset( $metadata['width'] ) && isset( $metadata['height'] ) ) {
            $metadata['placeholder'] = self::get_image_placeholder( $metadata['width'], $metadata['height'] );
        }

        // Generate image sizes.
        if ( isset( $metadata['sizes'] ) ) {
            foreach ( $metadata['sizes'] as $slug => & $size ) {
                // Ignore lqip size.
                if ( preg_match( '/powerkit-lqip/', $slug ) ) {
                    continue;
                }
                // Ignore retina size.
                if ( preg_match( '/-2x$/', $slug ) ) {
                    continue;
                }
                if ( isset( $size['width'] ) && isset( $size['height'] ) ) {
                    $size['placeholder'] = self::get_image_placeholder( $size['width'], $size['height'] );
                }
            }
        }

        return $metadata;
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
        if ( strpos( $attr['class'], 'lazyload' ) !== false || isset( $attr['data-vpf-src'] ) || isset( $attr['data-src'] ) ) {
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
        $placeholder = false;

        // The right Image Placeholder.
        $metadata = get_post_meta( $attachment_id, '_wp_attachment_metadata', true );

        // generate new placeholder.
        if ( ! isset( $metadata['placeholder'] ) ) {
            $metadata = self::generate_attachment_placeholder( $metadata );
            update_post_meta( $attachment_id, '_wp_attachment_metadata', $metadata );
        }

        if ( isset( $metadata['sizes'][ $size ]['placeholder'] ) ) {
            $placeholder = $metadata['sizes'][ $size ]['placeholder'];
        } elseif ( isset( $metadata['placeholder'] ) ) {
            $placeholder = $metadata['placeholder'];
        }

        // Prevent WP Rocket lazy loading.
        if ( defined( 'WP_ROCKET_VERSION' ) ) {
            $attr['data-no-lazy'] = '1';
        }

        // Prevent WP Smush lazy loading.
        if ( class_exists( 'WP_Smush' ) || class_exists( 'Smush\WP_Smush' ) ) {
            $attr['class'] .= ' no-lazyload';
        }

        // lazy placeholder.
        if ( $placeholder ) {
            $attr['data-vpf-src'] = $attr['src'];
            $attr['src']          = $placeholder;
        }

        $attr['class'] .= ' visual-portfolio-lazyload';

        // Src Set and Sizes.
        if ( isset( $attr['sizes'] ) ) {
            $attr['data-vpf-sizes'] = 'auto';
            unset( $attr['sizes'] );
        }
        if ( isset( $attr['srcset'] ) ) {
            $attr['data-vpf-srcset'] = $attr['srcset'];
            unset( $attr['srcset'] );
        }

        return $attr;
    }

    /**
     * Undocumented function
     *
     * @param boolean $return     skip lazy Jetpack.
     * @param array   $attributes image attributes.
     *
     * @return boolean
     */
    public static function jetpack_lazy_images_skip_image_with_attributes( $return, $attributes ) {
        return isset( $attributes['data-vpf-src'] );
    }
}
Visual_Portfolio_Images::construct();
