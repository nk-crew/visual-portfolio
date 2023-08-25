<?php
/**
 * Imagify Plugin.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Class Visual_Portfolio_3rd_Imagify
 */
class Visual_Portfolio_3rd_Imagify {
    /**
     * Visual_Portfolio_3rd_Imagify constructor.
     */
    public function __construct() {
        // Fix lazyload attributes.
        //
        // Thanks to:
        // - https://wordpress.org/support/topic/all-images-are-grey/
        // - https://wordpress.org/support/topic/all-images-are-grey-again/.
        add_filter( 'imagify_picture_attributes', array( $this, 'imagify_picture_attributes' ) );
        add_filter( 'imagify_picture_img_attributes', array( $this, 'imagify_picture_img_attributes' ), 10, 2 );
    }

    /**
     * Remove lazyload class from the picture tag.
     *
     * @param array $attributes image tag attributes.
     *
     * @return array
     */
    public function imagify_picture_attributes( $attributes ) {
        if ( isset( $attributes['class'] ) && strpos( $attributes['class'], 'vp-lazyload' ) !== false ) {
            $attributes['class'] = str_replace( 'vp-lazyload', '', $attributes['class'] );
        }

        return $attributes;
    }

    /**
     * Restore lazyload class to the img tag.
     *
     * @param array $attributes image tag attributes.
     * @param array $image image data.
     *
     * @return array
     */
    public function imagify_picture_img_attributes( $attributes, $image ) {
        if ( isset( $image['attributes']['class'] ) && strpos( $image['attributes']['class'], 'vp-lazyload' ) !== false ) {
            if ( isset( $attributes['class'] ) ) {
                $attributes['class'] .= ' ';
            } else {
                $attributes['class'] = '';
            }

            $attributes['class'] .= 'vp-lazyload';
        }

        return $attributes;
    }
}

new Visual_Portfolio_3rd_Imagify();
