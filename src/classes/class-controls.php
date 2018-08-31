<?php
/**
 * Controls
 *
 * @package @@plugin_name
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Class Visual_Portfolio_Controls
 */
class Visual_Portfolio_Controls {
    /**
     * Registered user fields to print it in the future.
     *
     * @var array
     */
    private static $registered_fields = array();

    /**
     * Default control args.
     *
     * @var array
     */
    private static $default_args = array(
        // category for registered fields.
        'category' => '',

        'type' => 'text',
        'label' => false,
        'description' => false,
        'name' => '',
        'value' => '',
        'value_callback' => '',
        'placeholder' => '',
        'readonly' => false,

        // control-specific args.
        // select.
        'options' => array(),
        'searchable' => false,
        'multiple' => false,
        'tags' => false,
        'post_type' => '',
        // range.
        'min' => '',
        'max' => '',
        'step' => '1',
        // textarea.
        'cols' => '',
        'rows' => '',
        // color.
        'alpha' => false,
        // align.
        'extended' => false,

        // hint.
        'hint'  => false,
        'hint_place' => 'top',

        // condition.
        'condition' => array(
            /**
             * Array of arrays with data:
             *  'control' - control name.
             *  'operator' - operator (==, !==, >, <, >=, <=).
             *  'value' - condition value.
             */
        ),

        // style.
        'style' => array(
            /**
             * Array of arrays with data:
             *  'element' - CSS selector string (.vp-portfolio__item, .vp-portfolio__item-overlay, etc).
             *  'property' - CSS property (color, font-size, etc).
             */
        ),

        'class' => '',
        'wrapper_class' => '',
    );

    /**
     * Visual_Portfolio_Controls constructor.
     */
    public function __construct() {
    }

    /**
     * Try to get value using users callback function.
     *
     * @param string $callback - users callback.
     * @return mixed
     */
    private static function get_value_callback( $callback ) {
        if ( isset( $callback ) && is_callable( $callback ) ) {
            return call_user_func( $callback );
        } else {
            return null;
        }
    }

    /**
     * Print control html.
     *
     * @param array $args - control args.
     */
    public static function get( $args = array() ) {
        $args = array_merge( self::$default_args, $args );

        // value from callback function.
        if ( isset( $args['value_callback'] ) ) {
            $new_val = self::get_value_callback( $args['value_callback'] );

            if ( null !== $new_val && is_array( $new_val ) ) {
                $args = array_merge( $args, $new_val );
            }
        }

        $class = 'vp-control vp-control-' . $args['type'] . ' ' . $args['class'];

        if ( $args['wrapper_class'] ) {
            ?>
            <div class="<?php echo esc_attr( $args['wrapper_class'] ); ?>" <?php self::print_condition( $args ); ?>>
            <?php
        }

        ?>
            <div class="<?php echo esc_attr( $class ); ?>"
                 data-hint="<?php echo esc_attr( $args['hint'] ? : 'false' ); ?>"
                 data-hint-place="<?php echo esc_attr( $args['hint_place'] ? : 'top' ); ?>"
                    <?php
                    if ( ! $args['wrapper_class'] ) {
                        self::print_condition( $args );
                    }
                    ?>
            >
                <?php
                self::print_label( $args );

                self::print_style( $args );

                if ( method_exists( __CLASS__, 'print_control_' . $args['type'] ) ) {
                    call_user_func( array( __CLASS__, 'print_control_' . $args['type'] ), $args );
                }

                self::print_description( $args );
                ?>
            </div>
        <?php

        if ( $args['wrapper_class'] ) {
            ?>
            </div>
            <?php
        }
    }

    /**
     * Register control to print in the future.
     *
     * @param array $args - control args.
     */
    public static function register( $args = array() ) {
        if ( ! isset( $args['name'] ) ) {
            return;
        }
        self::$registered_fields[ $args['name'] ] = $args;
    }

    /**
     * Get all registered controls.
     */
    public static function get_registered_array() {
        return self::$registered_fields;
    }

    /**
     * Print registered controls.
     *
     * @param bool $category - print specific category.
     */
    public static function get_registered( $category = false ) {
        $registered_array = self::get_registered_array();
        foreach ( $registered_array as $field ) {
            if ( ! $category || isset( $field['category'] ) && $category === $field['category'] ) {
                $field['value'] = self::get_registered_value( $field['name'] );

                self::get( $field );
            }
        }
    }

    /**
     * Get registered control value.
     *
     * @param string   $name - field name.
     * @param int|bool $post_id - post id to get meta data.
     *
     * @return mixed
     */
    public static function get_registered_value( $name, $post_id = false ) {
        if ( ! $post_id ) {
            global $post;
            $post_id = $post->ID;
        }

        // get meta data.
        $result = get_post_meta( $post_id, $name, true );

        // registered data.
        $registered_array = self::get_registered_array();
        $registered_data = isset( $registered_array[ $name ] ) ? $registered_array[ $name ] : false;

        // find default.
        $default = null;
        if ( isset( $registered_data ) ) {
            $default = isset( $registered_data['default'] ) ? $registered_data['default'] : $default;
        }
        if ( '' === $result && null !== $default ) {
            $result = $default;
        }

        // filter.
        $result = apply_filters( 'vpf_get_layout_option', $result, $name, $post_id );

        // fix for gallery array.
        if ( isset( $registered_data['type'] ) && 'gallery' === $registered_data['type'] ) {
            $result = (array) ( is_string( $result ) ? json_decode( $result, true ) : $result );
        }

        // fix bool values.
        if ( 'false' === $result || '' === $result ) {
            $result = false;
        }
        if ( 'true' === $result ) {
            $result = true;
        }

        return $result;
    }

    /**
     * Print condition attribute.
     *
     * @param array $args - control args.
     */
    public static function print_condition( $args = array() ) {
        $condition_attr = '';
        if ( $args['condition'] && ! empty( $args['condition'] ) ) {
            foreach ( $args['condition'] as $cond ) {
                if ( ! empty( $cond ) && isset( $cond['control'] ) ) {
                    $control = $cond['control'];
                    $operator = isset( $cond['operator'] ) ? $cond['operator'] : '==';
                    $value = isset( $cond['value'] ) ? $cond['value'] : 'true';

                    if ( ! empty( $condition_attr ) ) {
                        $condition_attr .= ' && ';
                    }

                    $condition_attr .= '[name="' . $control . '"] ' . $operator . ' ' . $value;
                }
            }
        }
        if ( $condition_attr ) {
            ?>
            data-cond="<?php echo esc_attr( $condition_attr ? $condition_attr : '' ); ?>"
            <?php
        }
    }

    /**
     * Print control label.
     *
     * @param array $args - control args.
     */
    public static function print_label( $args = array() ) {
        if ( ! $args['label'] ) {
            return;
        }
        ?>
        <label for="<?php echo esc_attr( $args['name'] ); ?>"><?php echo esc_html( $args['label'] ); ?></label>
        <?php
    }

    /**
     * Print control style.
     *
     * @param array $args - control args.
     */
    public static function print_style( $args = array() ) {
        if ( ! $args['style'] || empty( $args['style'] ) ) {
            return;
        }
        ?>
        <div class="vp-control-style">
            <?php
            foreach ( $args['style'] as $style ) {
                ?>
                <input type="hidden"
                       name="<?php echo esc_attr( $args['name'] ); ?>__style[]"
                       data-style-from="[name='<?php echo esc_attr( $args['name'] ); ?>']"
                       data-style-element="<?php echo esc_attr( $style['element'] ); ?>"
                       data-style-property="<?php echo esc_attr( $style['property'] ); ?>"
                       value=""
                >
                <?php
            }
            ?>
        </div>
        <?php
    }

    /**
     * Print control description.
     *
     * @param array $args - control args.
     */
    public static function print_description( $args = array() ) {
        if ( ! $args['description'] ) {
            return;
        }
        ?>
        <div class="vp-control-description"><?php echo wp_kses_post( $args['description'] ); ?></div>
        <?php
    }

    /**
     * Print control HTML.
     *
     * @param array $args - control args.
     */
    public static function print_control_html( $args = array() ) {
        echo wp_kses_post( $args['value'] );
    }

    /**
     * Print control hidden.
     *
     * @param array $args - control args.
     */
    public static function print_control_hidden( $args = array() ) {
        ?>
        <input type="hidden" name="<?php echo esc_attr( $args['name'] ); ?>" id="<?php echo esc_attr( $args['name'] ); ?>" value="<?php echo esc_attr( $args['value'] ); ?>">
        <?php
    }

    /**
     * Print control text.
     *
     * @param array $args - control args.
     */
    public static function print_control_text( $args = array() ) {
        ?>
        <input type="text" name="<?php echo esc_attr( $args['name'] ); ?>" id="<?php echo esc_attr( $args['name'] ); ?>" value="<?php echo esc_attr( $args['value'] ); ?>" placeholder="<?php echo esc_attr( $args['placeholder'] ); ?>" class="vp-input" <?php echo esc_attr( $args['readonly'] ? 'readonly' : '' ); ?>>
        <?php
    }

    /**
     * Print control url.
     *
     * @param array $args - control args.
     */
    public static function print_control_url( $args = array() ) {
        ?>
        <input type="url" name="<?php echo esc_attr( $args['name'] ); ?>" id="<?php echo esc_attr( $args['name'] ); ?>" value="<?php echo esc_attr( $args['value'] ); ?>" placeholder="<?php echo esc_attr( $args['placeholder'] ); ?>" class="vp-input" <?php echo esc_attr( $args['readonly'] ? 'readonly' : '' ); ?>>
        <?php
    }

    /**
     * Print control textarea.
     *
     * @param array $args - control args.
     */
    public static function print_control_textarea( $args = array() ) {
        ?>
        <textarea name="<?php echo esc_attr( $args['name'] ); ?>" id="<?php echo esc_attr( $args['name'] ); ?>" cols="<?php echo esc_attr( $args['cols'] ); ?>" rows="<?php echo esc_attr( $args['rows'] ); ?>" <?php echo esc_attr( $args['readonly'] ? 'readonly' : '' ); ?>><?php echo esc_textarea( $args['value'] ); ?></textarea>
        <?php
    }

    /**
     * Print control checkbox.
     *
     * @param array $args - control args.
     */
    public static function print_control_checkbox( $args = array() ) {
        ?>
        <input type="hidden" name="<?php echo esc_attr( $args['name'] ); ?>" id="<?php echo esc_attr( $args['name'] ); ?>_hidden" value="false">
        <input type="checkbox" name="<?php echo esc_attr( $args['name'] ); ?>" id="<?php echo esc_attr( $args['name'] ); ?>" value="true" <?php checked( $args['value'] ); ?>>
        <?php
    }

    /**
     * Print control toggle.
     *
     * @param array $args - control args.
     */
    public static function print_control_toggle( $args = array() ) {
        ?>
        <div class="vp-toggle">
            <input type="hidden" name="<?php echo esc_attr( $args['name'] ); ?>" id="<?php echo esc_attr( $args['name'] ); ?>_hidden" value="false">
            <input type="checkbox" name="<?php echo esc_attr( $args['name'] ); ?>" id="<?php echo esc_attr( $args['name'] ); ?>" value="true" <?php checked( $args['value'] ); ?>>
            <span class="vp-toggle__track"></span>
            <span class="vp-toggle__thumb"></span>
        </div>
        <?php
    }

    /**
     * Print control range.
     *
     * @param array $args - control args.
     */
    public static function print_control_range( $args = array() ) {
        ?>
        <input type="hidden" name="<?php echo esc_attr( $args['name'] ); ?>" value="<?php echo esc_attr( $args['value'] ); ?>">
        <input type="range" min="<?php echo esc_attr( $args['min'] ); ?>" max="<?php echo esc_attr( $args['max'] ); ?>" step="<?php echo esc_attr( $args['step'] ); ?>" id="<?php echo esc_attr( $args['name'] ); ?>" value="<?php echo esc_attr( $args['value'] ); ?>">
        <input type="number" step="any" value="<?php echo esc_attr( $args['value'] ); ?>">
        <?php
    }

    /**
     * Print control select2.
     *
     * @param array $args - control args.
     */
    public static function print_control_select2( $args = array() ) {
        ?>
        <select name="<?php echo esc_attr( $args['name'] . ( $args['multiple'] ? '[]' : '' ) ); ?>" id="<?php echo esc_attr( $args['name'] ); ?>" class="vp-select2 <?php echo esc_attr( $args['searchable'] ? '' : 'vp-select2-nosearch' ); ?> <?php echo esc_attr( $args['tags'] ? 'vp-select2-tags' : '' ); ?>" data-post-type="<?php echo esc_attr( $args['post_type'] ); ?>" <?php echo esc_attr( $args['multiple'] ? 'multiple' : '' ); ?>>
            <?php
            foreach ( (array) $args['options'] as $type => $title ) :
                $check_val = $type;

                if ( 'true' === $check_val ) {
                    $check_val = true;
                }

                if ( 'false' === $check_val ) {
                    $check_val = false;
                }

                $selected = false;

                if ( $args['multiple'] ) {
                    if ( $args['value'] && is_array( $args['value'] ) && in_array( $check_val, $args['value'] ) ) {
                        $selected = true;
                    }
                } else {
                    $selected = $args['value'] === $check_val;
                }

                ?>
                <option value="<?php echo esc_attr( $type ); ?>" <?php selected( $selected ); ?>>
                    <?php echo esc_html( $title ); ?>
                </option>
                <?php
            endforeach;
            ?>
        </select>
        <?php
    }

    /**
     * Print control color.
     *
     * @param array $args - control args.
     */
    public static function print_control_color( $args = array() ) {
        ?>
        <input class="vp-input vp-color-picker" data-alpha="<?php echo esc_attr( $args['alpha'] ? 'true' : 'false' ); ?>" name="<?php echo esc_attr( $args['name'] ); ?>" type="text" id="<?php echo esc_attr( $args['name'] ); ?>" placeholder="<?php echo esc_attr( $args['placeholder'] ); ?>" value="<?php echo esc_attr( $args['value'] ); ?>">
        <?php
    }

    /**
     * Print control images dropdown.
     *
     * @param array $args - control args.
     */
    public static function print_control_images_dropdown( $args = array() ) {
        ?>
        <div class="vp-control-image-dropdown">
            <span class="vp-control-image-dropdown__preview">
                <?php
                // selected image.
                foreach ( (array) $args['options'] as $data ) {
                    if ( $args['value'] === $data['value'] ) {
                        ?>
                        <img src="<?php echo esc_url( $data['url'] ); ?>" alt="">
                        <?php
                        break;
                    }
                }
                ?>
            </span>
            <span class="vp-control-image-dropdown__title"><?php echo esc_html( $args['placeholder'] ); ?></span>
            <div class="vp-control-image-dropdown__content">
                <div>
                    <select class="vp-image-picker" name="<?php echo esc_attr( $args['name'] ); ?>" id="<?php echo esc_attr( $args['name'] ); ?>">
                        <?php
                        // selected image.
                        foreach ( (array) $args['options'] as $data ) {
                            ?>
                            <option data-img-src="<?php echo esc_url( $data['url'] ); ?>" data-img-alt="<?php echo esc_attr( $data['value'] ); ?>" value="<?php echo esc_attr( $data['value'] ); ?>" <?php selected( $args['value'] === $data['value'] ); ?>><?php echo esc_html( $data['value'] ); ?></option>
                            <?php
                        }
                        ?>
                    </select>
                </div>
            </div>
        </div>
        <?php
    }

    /**
     * Print control align.
     *
     * @param array $args - control args.
     */
    public static function print_control_align( $args = array() ) {
        ?>
        <select class="vp-select2 vp-select2-nosearch" name="<?php echo esc_attr( $args['name'] ); ?>" id="<?php echo esc_attr( $args['name'] ); ?>">
            <?php if ( $args['extended'] ) : ?>
                <optgroup label="<?php echo esc_attr__( 'Top', '@@text_domain' ); ?>">
                    <option value="top-center" <?php selected( $args['value'], 'top-center' ); ?>>
                        <?php echo esc_html__( 'Center', '@@text_domain' ); ?>
                    </option>
                    <option value="top-left" <?php selected( $args['value'], 'top-left' ); ?>>
                        <?php echo esc_html__( 'Left', '@@text_domain' ); ?>
                    </option>
                    <option value="top-right" <?php selected( $args['value'], 'top-right' ); ?>>
                        <?php echo esc_html__( 'Right', '@@text_domain' ); ?>
                    </option>
                </optgroup>
                <optgroup label="<?php echo esc_attr__( 'Center', '@@text_domain' ); ?>">
            <?php endif; ?>

                <option value="center" <?php selected( $args['value'], 'center' ); ?>>
                    <?php echo esc_html__( 'Center', '@@text_domain' ); ?>
                </option>
                <option value="left" <?php selected( $args['value'], 'left' ); ?>>
                    <?php echo esc_html__( 'Left', '@@text_domain' ); ?>
                </option>
                <option value="right" <?php selected( $args['value'], 'right' ); ?>>
                    <?php echo esc_html__( 'Right', '@@text_domain' ); ?>
                </option>

            <?php if ( $args['extended'] ) : ?>
                </optgroup>
                <optgroup label="<?php echo esc_attr__( 'Bottom', '@@text_domain' ); ?>">
                    <option value="bottom-center" <?php selected( $args['value'], 'bottom-center' ); ?>>
                        <?php echo esc_html__( 'Center', '@@text_domain' ); ?>
                    </option>
                    <option value="bottom-left" <?php selected( $args['value'], 'bottom-left' ); ?>>
                        <?php echo esc_html__( 'Left', '@@text_domain' ); ?>
                    </option>
                    <option value="bottom-right" <?php selected( $args['value'], 'bottom-right' ); ?>>
                        <?php echo esc_html__( 'Right', '@@text_domain' ); ?>
                    </option>
                </optgroup>
            <?php endif; ?>
        </select>

        <?php
    }

    /**
     * Print control gallery.
     *
     * @param array $args - control args.
     */
    public static function print_control_gallery( $args = array() ) {
        $images = (array) $args['value'];
        $additional_data = array(
            'title' => array(
                'type'  => 'text',
                'label' => esc_html__( 'Title', '@@text_domain' ),
                'name'  => $args['name'] . '_additional_title',
            ),
            'description' => array(
                'type'  => 'textarea',
                'label' => esc_html__( 'Description', '@@text_domain' ),
                'name'  => $args['name'] . '_additional_description',
            ),
            'categories' => array(
                'type'  => 'select2',
                'label' => esc_html__( 'Categories', '@@text_domain' ),
                'name'  => $args['name'] . '_additional_categories',
                'multiple' => true,
                'tags' => true,
            ),
            'format' => array(
                'type'  => 'select2',
                'label' => esc_html__( 'Format', '@@text_domain' ),
                'name'  => $args['name'] . '_additional_format',
                'default' => 'standard',
                'options' => array(
                    'standard' => esc_html__( 'Standard', '@@text_domain' ),
                    'video' => esc_html__( 'Video', '@@text_domain' ),
                ),
            ),
            'video_url' => array(
                'type'  => 'url',
                'label' => esc_html__( 'Video URL', '@@text_domain' ),
                'placeholder'  => esc_html__( 'https://...', '@@text_domain' ),
                'name'  => $args['name'] . '_additional_video_url',
                'condition' => array(
                    array(
                        'control' => $args['name'] . '_additional_format',
                        'value' => 'video',
                    ),
                ),
            ),
            'url' => array(
                'type'  => 'url',
                'label' => esc_html__( 'URL', '@@text_domain' ),
                'description' => esc_html__( 'By default used full image url, you can use custom one', '@@text_domain' ),
                'placeholder'  => esc_html__( 'https://...', '@@text_domain' ),
                'name'  => $args['name'] . '_additional_url',
            ),
        );

        ?>
        <textarea name="<?php echo esc_attr( $args['name'] ); ?>" style="display: none;"><?php echo esc_textarea( json_encode( $images, defined( 'JSON_UNESCAPED_UNICODE' ) ? JSON_UNESCAPED_UNICODE : 256 ) ); ?></textarea>

        <div class="vp-control-gallery-additional-data">
            <div class="vp-control-gallery-additional-data-preview">
                <div class="vp-control-gallery-additional-data-preview-image">
                    <img src="" alt="">
                </div>
                <div class="vp-control-gallery-additional-data-preview-data">
                    <strong class="vp-control-gallery-additional-data-preview-name"></strong>
                    <div class="vp-control-gallery-additional-data-preview-size"></div>
                    <div class="vp-control-gallery-additional-data-preview-edit">
                        <a href="#" target="_blank"><?php echo esc_html__( 'Edit', '@@text_domain' ); ?></a>
                    </div>
                </div>
            </div>
            <?php
            foreach ( $additional_data as $name => $data_item ) {
                self::get(
                    array_merge( $data_item, array(
                        'value'  => '',
                        'class' => 'vp-no-reload',
                    ) )
                );
            }
            ?>
        </div>
        <div class="vp-control-gallery-items">
            <?php
            foreach ( $images as $data ) :
                if ( ! isset( $data['id'] ) ) {
                    continue;
                }

                $img = wp_get_attachment_image( $data['id'], 'thumbnail' );
                $img_data = wp_prepare_attachment_for_js( $data['id'] );

                ?>
                <div class="vp-control-gallery-items-img" data-image-id="<?php echo esc_attr( $data['id'] ); ?>">
                    <?php
                    echo wp_kses( $img, array(
                        'img' => array(
                            'src'     => array(),
                            'srcset'  => array(),
                            'sizes'   => array(),
                            'alt'     => array(),
                            'class'   => array(),
                            'width'   => array(),
                            'height'  => array(),
                        ),
                    ) );

                    // image meta data.
                    echo '<div style="display: none;" data-meta="width">' . esc_html( $img_data['width'] ) . '</div>';
                    echo '<div style="display: none;" data-meta="height">' . esc_html( $img_data['height'] ) . '</div>';
                    echo '<div style="display: none;" data-meta="filename">' . esc_html( $img_data['filename'] ) . '</div>';
                    echo '<div style="display: none;" data-meta="editLink">' . esc_url( $img_data['editLink'] ) . '</div>';
                    echo '<div style="display: none;" data-meta="filesizeHumanReadable">' . esc_html( $img_data['filesizeHumanReadable'] ) . '</div>';

                    // additional data.
                    foreach ( $additional_data as $name => $data_item ) {
                        $val = isset( $data[ $name ] ) ? $data[ $name ] : ( isset( $data_item['default'] ) ? $data_item['default'] : '' );

                        if ( is_array( $val ) ) {
                            $val = json_encode( $val );
                        }

                        echo '<div style="display: none;" data-additional="' . esc_attr( $name ) . '" ' . ( isset( $data_item['multiple'] ) ? 'data-to-json="true"' : '' ) . '>' . esc_html( $val ) . '</div>';
                    }
                    ?>
                    <div class="vp-control-gallery-items-remove"><span class="dashicons dashicons-minus"></span></div>
                </div>
                <?php
            endforeach;
            ?>
            <div class="vp-control-gallery-items-add"><span class="dashicons dashicons-plus"></span></div>
        </div>
        <div class="vp-control-gallery-items-default" style="display: none;">
            <div class="vp-control-gallery-items-img" data-image-id="">
                <img src="" alt="">

                <div style="display: none;" data-meta="width"></div>
                <div style="display: none;" data-meta="height"></div>
                <div style="display: none;" data-meta="filename"></div>
                <div style="display: none;" data-meta="editLink"></div>
                <div style="display: none;" data-meta="filesizeHumanReadable"></div>

                <?php
                foreach ( $additional_data as $name => $data_item ) {
                    $val = isset( $data_item['default'] ) ? $data_item['default'] : '';
                    echo '<div style="display: none;" data-additional="' . esc_attr( $name ) . '" ' . ( isset( $data_item['multiple'] ) ? 'data-to-json="true"' : '' ) . '>' . esc_html( $val ) . '</div>';
                }
                ?>
                <div class="vp-control-gallery-items-remove"><span class="dashicons dashicons-minus"></span></div>
            </div>
        </div>
        <?php
    }

    /**
     * Print control code editor.
     *
     * @param array $args - control args.
     */
    public static function print_control_code_editor( $args = array() ) {
        ?>
        <textarea class="vp-input" name="<?php echo esc_attr( $args['name'] ); ?>" id="<?php echo esc_attr( $args['name'] ); ?>" cols="<?php echo esc_attr( $args['cols'] ); ?>" rows="<?php echo esc_attr( $args['rows'] ); ?>" placeholder="<?php echo esc_attr( $args['placeholder'] ); ?>"><?php echo esc_html( $args['value'] ); ?></textarea>
        <?php
    }
}
