<?php
/**
 * Security sanitization and validation of data
 *
 * @package @@plugin_name
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Class Visual_Portfolio_Security
 */
class Visual_Portfolio_Security {
    /**
     * Visual_Portfolio_Security constructor.
     */
    public function __construct() {
        add_filter( 'wp_kses_allowed_html', array( $this, 'allowed_html' ), 9, 2 );
    }

    /**
     * Returns an array of allowed HTML tags and attributes for a given context.
     *
     * @param string       $allowedtags - Allow Tags for current context.
     * @param string|array $context - The context for which to retrieve tags. Allowed values are 'post',
     *                              'strip', 'data', 'entities', or the name of a field filter such as
     *                              'pre_user_description', or an array of allowed HTML elements and attributes.
     * @return array Array of allowed HTML tags and their allowed attributes.
     */
    public function allowed_html( $allowedtags, $context ) {
        if ( 'vp_popup' === $context ) {
            $kses_defaults = wp_kses_allowed_html( 'post' );

            $kses_popup_attrs = array(
                'class'                     => true,
                'style'                     => true,
                'data-vp-popup-img'         => true,
                'data-vp-popup-img-srcset'  => true,
                'data-vp-popup-img-size'    => true,
                'data-vp-popup-md-img'      => true,
                'data-vp-popup-md-img-size' => true,
                'data-vp-popup-sm-img'      => true,
                'data-vp-popup-sm-img-size' => true,
                'data-vp-popup-video'       => true,
                'data-vp-popup-poster'      => true,
                'data-vp-popup-audio'       => true,
                'data-vp-popup-item-forma'  => true,
                'data-vp-popup-page'        => true,
            );

            $kses_popup = array(
                'div' => $kses_popup_attrs,
            );

            $allowedtags = array_merge( $allowedtags, $kses_defaults, $kses_popup );
        }

        if ( 'vp_svg' === $context ) {
            $kses_defaults = wp_kses_allowed_html( 'post' );

            $kses_svg_attrs = array(
                'x'               => true,
                'y'               => true,
                'd'               => true,
                'r'               => true,
                'width'           => true,
                'height'          => true,
                'rx'              => true,
                'cx'              => true,
                'cy'              => true,
                'stroke'          => true,
                'stroke-width'    => true,
                'fill'            => true,
                'transform'       => true,
                'stroke-linecap'  => true,
                'stroke-linejoin' => true,
            );

            $kses_svg = array(
                'svg'    => array(
                    'class'           => true,
                    'aria-hidden'     => true,
                    'aria-labelledby' => true,
                    'role'            => true,
                    'xmlns'           => true,
                    'width'           => true,
                    'height'          => true,
                    'viewbox'         => true,
                ),
                'g'      => $kses_svg_attrs,
                'path'   => $kses_svg_attrs,
                'rect'   => $kses_svg_attrs,
                'circle' => $kses_svg_attrs,
                'title'  => array(
                    'title' => true,
                ),
            );

            $allowedtags = array_merge( $allowedtags, $kses_defaults, $kses_svg );
        }
        return $allowedtags;
    }
    /**
     * Sanitize hidden attribute.
     *
     * @param string|bool $attribute - Unclear Hidden Attribute.
     * @return string|bool
     */
    public static function sanitize_hidden( $attribute ) {
        $value = false;

        if ( is_bool( $attribute ) ) {
            $value = (bool) $attribute;
        } elseif ( is_string( $attribute ) ) {
            $value = strtolower( $attribute );
            if ( in_array( $value, array( 'false', '0' ), true ) ) {
                $value = false;
            }
            if ( in_array( $value, array( 'true', '1' ), true ) ) {
                $value = true;
            }

            $value = is_bool( $value ) ? (bool) $value : sanitize_text_field( wp_unslash( $attribute ) );
        }

        return $value;
    }

    /**
     * Sanitize Boolean.
     *
     * @param string|bool $attribute - Unclear Boolean Attribute.
     * @return bool
     */
    public static function sanitize_boolean( $attribute ) {
        $value = false;

        if ( is_bool( $attribute ) ) {
            $value = (bool) $attribute;
        } elseif ( is_string( $attribute ) ) {
            $value = strtolower( $attribute );
            if ( in_array( $value, array( 'false', '0' ), true ) ) {
                $value = false;
            }
            if ( in_array( $value, array( 'true', '1' ), true ) ) {
                $value = true;
            }

            $value = (bool) wp_unslash( $value );
        }

        return $value;
    }

    /**
     * Sanitize selector attribute.
     *
     * @param int|float|string $attribute - Unclear Selector Attribute.
     * @return int|float|string
     */
    public static function sanitize_selector( $attribute ) {
        if ( is_numeric( $attribute ) ) {
            if ( false === strpos( $attribute, '.' ) ) {
                $attribute = intval( $attribute );
            } else {
                $attribute = (float) $attribute;
            }
        } else {
            $attribute = sanitize_text_field( wp_unslash( $attribute ) );
        }

        return $attribute;
    }

    /**
     * Sanitize number attribute.
     *
     * @param string|int|float $attribute - Unclear Number Attribute.
     * @return int|float
     */
    public static function sanitize_number( $attribute ) {
        $attribute = preg_replace( '/[^0-9.-]/', '', wp_unslash( $attribute ) );
        if ( false === strpos( $attribute, '.' ) ) {
            $attribute = intval( $attribute );
        } else {
            $attribute = (float) $attribute;
        }

        return $attribute;
    }

    /**
     * Escape SVG Icon.
     *
     * @param string $svg - Unclear SVG Icon.
     * @return string
     */
    public static function wp_kses_svg( $svg ) {
        return wp_kses( $svg, 'vp_svg' );
    }

    /**
     * Escape Popup HTML.
     *
     * @param string $popup - Unclear popup.
     * @return string
     */
    public static function wp_kses_popup( $popup ) {
        return wp_kses( $popup, 'vp_popup' );
    }

    /**
     * Sanitize Element Selector.
     *
     * @param array $attribute - Unclear Element Selector Attribute.
     * @return array
     */
    public static function sanitize_elements_selector( $attribute ) {
        $key = 'layout_elements';
        if ( ! empty( $attribute ) && is_array( $attribute ) ) {
            $controls                      = Visual_Portfolio_Controls::get_registered_array();
            $hight_level_allowed_locations = array_keys( $controls[ $key ]['locations'] );
            foreach ( $attribute as $locations_key => $locations ) {
                if (
                    false !== array_search( $locations_key, $hight_level_allowed_locations, true ) &&
                    ! empty( $locations ) &&
                    is_array( $locations )
                ) {

                    $low_level_allowed_locations = array( 'elements' );

                    if (
                        isset( $controls[ $key ]['locations'][ $locations_key ]['align'] ) &&
                        ! empty( $controls[ $key ]['locations'][ $locations_key ]['align'] )
                    ) {
                        $low_level_allowed_locations = array_merge(
                            $low_level_allowed_locations,
                            array( 'align' )
                        );
                        $allowed_align_protocol      = $controls[ $key ]['locations'][ $locations_key ]['align'];
                    }

                    foreach ( $locations as $location_key => $location ) {
                        if (
                            false !== array_search( $location_key, $low_level_allowed_locations, true )
                        ) {
                            if (
                                'align' === $location_key &&
                                isset( $allowed_align_protocol ) &&
                                false !== array_search( $location, $allowed_align_protocol, true )
                            ) {
                                $attribute[ $locations_key ][ $location_key ] = sanitize_text_field( wp_unslash( $location ) );
                            } elseif (
                                'elements' === $location_key &&
                                is_array( $location )
                            ) {
                                foreach ( $location as $item_key => $item ) {
                                    if (
                                        false !== array_search( $locations_key, $controls[ $key ]['options'][ $item ]['allowed_locations'], true ) &&
                                        isset( $controls[ $key ]['options'][ $item ]['allowed_locations'] )
                                    ) {
                                        $attribute[ $locations_key ][ $location_key ][ $item_key ] = sanitize_text_field( wp_unslash( $item ) );
                                    } else {
                                        unset( $attribute[ $locations_key ][ $location_key ][ $item_key ] );
                                    }
                                }
                            } else {
                                unset( $attribute[ $locations_key ][ $location_key ] );
                            }
                        } else {
                            unset( $attribute[ $locations_key ][ $location_key ] );
                        }
                    }
                } else {
                    unset( $attribute[ $locations_key ] );
                }
            }
        } else {
            $attribute = array();
        }

        return $attribute;
    }

    /**
     * Sanitize Gallery.
     *
     * @param array $attribute - Unclear Gallery Attribute.
     * @return array
     */
    public static function sanitize_gallery( $attribute ) {
        if ( isset( $attribute ) && ! empty( $attribute ) ) {
            foreach ( $attribute as $key => $gallery_item ) {
                if ( isset( $gallery_item ) && ! empty( $gallery_item ) ) {
                    foreach ( $gallery_item as $attribute_key => $media_attribute ) {
                        switch ( $attribute_key ) {
                            case 'imgUrl':
                            case 'imgThumbnailUrl':
                            case 'video_url':
                            case 'author_url':
                            case 'post_url':
                            case 'url':
                                $attribute[ $key ][ $attribute_key ] = esc_url_raw( wp_unslash( $media_attribute ) );
                                break;
                            case 'hover_image_focal_point':
                            case 'focalPoint':
                                if ( isset( $media_attribute ) && ! empty( $media_attribute ) ) {
                                    foreach ( $media_attribute as $focal_key => $focal_point ) {
                                        $attribute[ $key ][ $attribute_key ][ $focal_key ] = self::sanitize_number( $focal_point );
                                    }
                                } else {
                                    $attribute[ $key ][ $attribute_key ] = null;
                                }
                                break;
                            case 'custom_popup_image':
                            case 'hover_image':
                                $attribute[ $key ][ $attribute_key ] = self::sanitize_number( $media_attribute );
                                break;
                            case 'categories':
                                if ( isset( $media_attribute ) && ! empty( $media_attribute ) ) {
                                    foreach ( $media_attribute as $category_key => $category ) {
                                        $attribute[ $key ][ $attribute_key ][ $category_key ] = sanitize_text_field( wp_unslash( $category ) );
                                    }
                                } else {
                                    $attribute[ $key ][ $attribute_key ] = null;
                                }
                                break;
                            case 'title':
                            case 'description':
                                $attribute[ $key ][ $attribute_key ] = wp_kses_post( wp_unslash( $media_attribute ) );
                                break;
                            case 'id':
                            case 'author':
                            case 'format':
                            case 'deep_link_pid':
                            default:
                                $attribute[ $key ][ $attribute_key ] = sanitize_text_field( wp_unslash( $media_attribute ) );
                                break;
                        }
                    }
                }
            }
        } else {
            $attribute = array();
        }
        return $attribute;
    }

    /**
     * Sanitize Attributes.
     *
     * @param array $attributes - Attributes.
     * @return array
     */
    public static function sanitize_attributes( $attributes = array() ) {
        if ( ! empty( $attributes ) ) {
            $controls = Visual_Portfolio_Controls::get_registered_array();
            foreach ( $attributes as $key => $attribute ) {
                $sanitize_callback = $controls[ $key ]['sanitize_callback'] ?? false;
                if ( $sanitize_callback ) {
                    $finding_class = strripos( $sanitize_callback, '::' );
                    if ( false === $finding_class && is_callable( array( __CLASS__, $sanitize_callback ) ) ) {
                        $attributes[ $key ] = call_user_func( array( __CLASS__, $sanitize_callback ), $attribute );
                    } else {
                        $attributes[ $key ] = call_user_func( $sanitize_callback, $attribute );
                    }
                } else {
                    $type = $controls[ $key ]['type'] ?? false;
                    switch ( $type ) {
                        case 'hidden':
                        case 'checkbox':
                            $attributes[ $key ] = self::sanitize_hidden( $attribute );
                            break;
                        case 'icons_selector':
                        case 'text':
                        case 'radio':
                        case 'align':
                        case 'buttons':
                            $attributes[ $key ] = sanitize_text_field( wp_unslash( $attribute ) );
                            break;
                        case 'textarea':
                            $attributes[ $key ] = sanitize_textarea_field( wp_unslash( $attribute ) );
                            break;
                        case 'aspect_ratio':
                            $attributes[ $key ] = preg_replace( '/[^0-9:]/', '', wp_unslash( $attribute ) );
                            break;
                        case 'number':
                        case 'range':
                            $attributes[ $key ] = self::sanitize_number( $attribute );
                            break;
                        case 'tiles_selector':
                            $attributes[ $key ] = preg_replace( '/[^0-9.,|]/', '', wp_unslash( $attribute ) );
                            break;
                        case 'select':
                            $multiple = isset( $controls[ $key ]['multiple'] ) && ! empty( $controls[ $key ]['multiple'] ) ? $controls[ $key ]['multiple'] : false;

                            if ( $multiple ) {
                                foreach ( $attributes[ $key ] as $attribute_key => $value ) {
                                    $attributes[ $key ][ $attribute_key ] = self::sanitize_selector( $value );
                                }
                            } else {
                                $attributes[ $key ] = self::sanitize_selector( $attributes[ $key ] );
                            }
                            break;
                        case 'elements_selector':
                            $attributes[ $key ] = self::sanitize_elements_selector( $attribute );
                            break;
                        case 'code_editor':
                            // Clear CSS. Maybe there will be an SVG validation error.
                            $attributes[ $key ] = preg_replace( '#</?\w+#', '', wp_unslash( $attribute ) );
                            break;
                        case 'sortable':
                            if ( is_array( $attribute ) && ! empty( $attribute ) ) {
                                foreach ( $attribute as $attribute_key => $value ) {
                                    $attributes[ $key ][ $attribute_key ] = sanitize_text_field( wp_unslash( $value ) );
                                }
                            } else {
                                $attributes[ $key ] = array();
                            }
                            break;
                        case 'gallery':
                            $attributes[ $key ] = self::sanitize_gallery( $attribute );
                            break;
                        case false:
                            if ( 'block_id' === $key ) {
                                $attributes[ $key ] = preg_replace( '/[^a-zA-Z0-9_-]/', '', wp_unslash( $attribute ) );
                            } else {
                                $attributes[ $key ] = sanitize_text_field( wp_unslash( $attribute ) );
                            }
                            break;
                        default:
                            $attributes[ $key ] = sanitize_text_field( wp_unslash( $attribute ) );
                            break;
                    }
                }
            }
        }
        return $attributes;
    }
}
new Visual_Portfolio_Security();