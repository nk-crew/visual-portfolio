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
     * Visual_Portfolio_Controls constructor.
     */
    public function __construct() {
    }

    /**
     * Print control html.
     *
     * @param array $args - control args.
     */
    public static function get( $args = array() ) {
        $args = array_merge(
            array(
                'type' => 'text',
                'label' => false,
                'description' => false,
                'name' => '',
                'value' => '',
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

                'class' => '',
                'wrapper_class' => '',
            ), $args
        );

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
                    $selected = $args['value'] == $check_val;
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
        <textarea name="<?php echo esc_attr( $args['name'] ); ?>" style="display: none;"><?php echo esc_textarea( json_encode( $images, JSON_UNESCAPED_UNICODE ) ); ?></textarea>

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
                Visual_Portfolio_Controls::get(
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
}
