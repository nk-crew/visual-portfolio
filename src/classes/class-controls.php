<?php
/**
 * Controls
 *
 * @package visual-portfolio
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
                'post_type' => '',
                // checkbox.
                'min' => '',
                'max' => '',
                // textarea.
                'cols' => '',
                'rows' => '',
                // color.
                'alpha' => false,

                // hint.
                'hint'  => false,
                'hint_place' => 'top',

                'class' => '',
            ), $args
        );

        $class = 'vp-control vp-control-' . $args['type'] . ' ' . $args['class'];
        ?>
        <div class="<?php echo esc_attr( $class ); ?>" data-hint="<?php echo esc_attr( $args['hint'] ? : 'false' ); ?>" data-hint-place="<?php echo esc_attr( $args['hint_place'] ? : 'top' ); ?>">
            <?php
            self::print_label( $args );

            if ( method_exists( __CLASS__, 'print_control_' . $args['type'] ) ) {
                call_user_func( array( __CLASS__, 'print_control_' . $args['type'] ), $args );
            }

            self::print_description( $args );
            ?>
        </div>
        <?php
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
        <input type="range" min="<?php echo esc_attr( $args['min'] ); ?>" max="<?php echo esc_attr( $args['max'] ); ?>" id="<?php echo esc_attr( $args['name'] ); ?>" value="<?php echo esc_attr( $args['value'] ); ?>">
        <input type="number" min="<?php echo esc_attr( $args['min'] ); ?>" max="<?php echo esc_attr( $args['max'] ); ?>" value="<?php echo esc_attr( $args['value'] ); ?>">
        <?php
    }

    /**
     * Print control select2.
     *
     * @param array $args - control args.
     */
    public static function print_control_select2( $args = array() ) {
        ?>
        <select name="<?php echo esc_attr( $args['name'] . ( $args['multiple'] ? '[]' : '' ) ); ?>" id="<?php echo esc_attr( $args['name'] ); ?>" class="vp-select2 <?php echo esc_attr( $args['searchable'] ? '' : 'vp-select2-nosearch' ); ?>" data-post-type="<?php echo esc_attr( $args['post_type'] ); ?>" <?php echo esc_attr( $args['multiple'] ? 'multiple' : '' ); ?>>
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
}
