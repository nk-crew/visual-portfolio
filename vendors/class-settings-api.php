<?php

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Visual Portfolio Settings API wrapper class
 * based on weDevs Settings API
 *
 * ADDED PR: https://github.com/tareq1988/wordpress-settings-api-class/pull/47
 * ADDED: enqueue scripts manually, without `admin_enqueue_scripts` action.
 * ADDED: new controls such as toggle and number slider.
 *
 * @author Tareq Hasan <tareq@weDevs.com>
 * @link https://tareq.co Tareq Hasan
 */
class Visual_Portfolio_Settings_API {

    /**
     * Settings sections array
     *
     * @var array
     */
    protected $settings_sections = array();

    /**
     * Settings fields array
     *
     * @var array
     */
    protected $settings_fields = array();

    /**
     * Visual_Portfolio_Settings_API constructor.
     */
    public function __construct() {
        // add_action( 'admin_enqueue_scripts', array( $this, 'admin_enqueue_scripts' ) );
    }

    /**
     * Enqueue scripts and styles
     */
    public function admin_enqueue_scripts() {
        wp_enqueue_style( 'wp-color-picker' );

        wp_enqueue_media();
        wp_enqueue_script( 'wp-color-picker' );
        wp_enqueue_script( 'jquery' );
        Visual_Portfolio_Assets::enqueue_script( 'conditionize', 'assets/vendor/conditionize/conditionize.min', array( 'jquery' ), '1.0.5' );

        Visual_Portfolio_Assets::enqueue_style( 'select2', 'assets/vendor/select2/select2.min', array(), '4.0.13' );
        Visual_Portfolio_Assets::enqueue_script( 'select2', 'assets/vendor/select2/select2.min', array( 'jquery' ), '4.0.13' );
    }

    /**
     * Set settings sections
     *
     * @param array $sections setting sections array
     */
    public function set_sections( $sections ) {
        $this->settings_sections = $sections;

        return $this;
    }

    /**
     * Add a single section
     *
     * @param array $section
     */
    public function add_section( $section ) {
        $this->settings_sections[] = $section;

        return $this;
    }

    /**
     * Set settings fields
     *
     * @param array $fields settings fields array
     */
    public function set_fields( $fields ) {
        $this->settings_fields = $fields;

        return $this;
    }

    public function add_field( $section, $field ) {
        $defaults = array(
            'name'   => '',
            'label'  => '',
            'desc'   => '',
            'type'   => 'text',
            'is_pro' => false,
        );

        $arg = wp_parse_args( $field, $defaults );
        $this->settings_fields[ $section ][] = $arg;

        return $this;
    }

    /**
     * Initialize and registers the settings sections and fileds to WordPress
     *
     * Usually this should be called at `admin_init` hook.
     *
     * This function gets the initiated settings sections and fields. Then
     * registers them to WordPress and ready for use.
     */
    public function admin_init() {
        // register settings sections
        foreach ( $this->settings_sections as $section ) {
            if ( false == get_option( $section['id'] ) ) {
                add_option( $section['id'] );
            }

            if ( isset( $section['desc'] ) && ! empty( $section['desc'] ) ) {
                $section['desc'] = '<div class="inside">' . $section['desc'] . '</div>';
                $callback = create_function( '', 'echo "' . str_replace( '"', '\"', $section['desc'] ) . '";' );
            } elseif ( isset( $section['callback'] ) ) {
                $callback = $section['callback'];
            } else {
                $callback = null;
            }

            add_settings_section( $section['id'], $section['title'], $callback, $section['id'] );
        }

        // register settings fields
        foreach ( $this->settings_fields as $section => $field ) {
            foreach ( $field as $option ) {

                $name = $option['name'];
                $type = isset( $option['type'] ) ? $option['type'] : 'text';
                $label = isset( $option['label'] ) ? $option['label'] : '';
                $callback = isset( $option['callback'] ) ? $option['callback'] : array( $this, 'callback_' . $type );
                $class_name = isset( $option['class'] ) ? $option['class'] : $name;
                $is_pro = isset( $option['is_pro'] ) ? $option['is_pro'] : false;

                if ( $is_pro ) {
                    $class_name .= ' vpf-settings-control-pro';
                    $go_pro_url = Visual_Portfolio_Admin::get_plugin_site_url(
                        array(
                            'utm_medium'   => 'settings_page',
                            'utm_campaign' => esc_attr( $name ),
                        )
                    );
                    $label .= '<a class="vpf-settings-control-pro-label" target="_blank" rel="noopener noreferrer" href="' . esc_url( $go_pro_url ) . '">?<span>' . esc_html__( 'This feature is available in the Pro plugin only.', 'visual-portfolio' ) . '</span></a>';
                }

                $args = array(
                    'id'                => $name,
                    'class'             => $class_name,
                    'label_for'         => "{$section}[{$name}]",
                    'desc'              => isset( $option['desc'] ) ? $option['desc'] : '',
                    'name'              => $label,
                    'section'           => $section,
                    'size'              => isset( $option['size'] ) ? $option['size'] : null,
                    'options'           => isset( $option['options'] ) ? $option['options'] : '',
                    'std'               => isset( $option['default'] ) ? $option['default'] : '',
                    'sanitize_callback' => isset( $option['sanitize_callback'] ) ? $option['sanitize_callback'] : '',
                    'type'              => $type,
                    'placeholder'       => isset( $option['placeholder'] ) ? $option['placeholder'] : '',
                    'min'               => isset( $option['min'] ) ? $option['min'] : '',
                    'max'               => isset( $option['max'] ) ? $option['max'] : '',
                    'step'              => isset( $option['step'] ) ? $option['step'] : '',
                    'is_pro'            => isset( $option['is_pro'] ) ? $option['is_pro'] : false,
                    'condition'         => isset( $option['condition'] ) ? $option['condition'] : null,
                    'conditionize'      => isset( $option['condition'] ) ? $this->convert_arguments_to_conditionize_string( $option['condition'] ) : '',
                );

                add_settings_field( "{$section}[{$name}]", $label, $callback, $section, $section, $args );
            }
        }

        // creates our settings in the options table
        foreach ( $this->settings_sections as $section ) {
            register_setting( $section['id'], $section['id'], array( $this, 'sanitize_options' ) );
        }
    }

    /**
     * Get field description for display
     *
     * @param array $args settings field args
     */
    public function get_field_description( $args ) {
        if ( ! empty( $args['desc'] ) ) {
            $desc = sprintf( '<p class="description">%s</p>', $args['desc'] );
        } else {
            $desc = '';
        }

        return $desc;
    }

    /**
     * Displays a text field for a settings field
     *
     * @param array $args settings field args
     */
    public function callback_text( $args ) {

        $value       = esc_attr( $this->get_option( $args['id'], $args['section'], $args['std'] ) );
        $size        = isset( $args['size'] ) && ! is_null( $args['size'] ) ? $args['size'] : 'regular';
        $type        = isset( $args['type'] ) ? $args['type'] : 'text';
        $placeholder = empty( $args['placeholder'] ) ? '' : ' placeholder="' . $args['placeholder'] . '"';

        $html        = sprintf( '<input type="%1$s" class="%2$s-text" id="%3$s[%4$s]" name="%3$s[%4$s]" value="%5$s"%6$s/>', $type, $size, $args['section'], $args['id'], $value, $placeholder );
        $html       .= $this->get_field_description( $args );

        echo $html;
    }

    /**
     * Displays a url field for a settings field
     *
     * @param array $args settings field args
     */
    public function callback_url( $args ) {
        $this->callback_text( $args );
    }

    /**
     * Displays a number field for a settings field
     *
     * @param array $args settings field args
     */
    public function callback_number( $args ) {
        $value       = esc_attr( $this->get_option( $args['id'], $args['section'], $args['std'] ) );
        $size        = isset( $args['size'] ) && ! is_null( $args['size'] ) ? $args['size'] : 'regular';
        $type        = isset( $args['type'] ) ? $args['type'] : 'number';
        $placeholder = empty( $args['placeholder'] ) ? '' : ' placeholder="' . $args['placeholder'] . '"';
        $min         = empty( $args['min'] ) ? '' : ' min="' . $args['min'] . '"';
        $max         = empty( $args['max'] ) ? '' : ' max="' . $args['max'] . '"';
        $step        = empty( $args['max'] ) ? '' : ' step="' . $args['step'] . '"';

        $html        = sprintf( '<input type="%1$s" class="%2$s-number" id="%3$s[%4$s]" name="%3$s[%4$s]" value="%5$s"%6$s%7$s%8$s%9$s/>', $type, $size, $args['section'], $args['id'], $value, $placeholder, $min, $max, $step );
        $html       .= $this->get_field_description( $args );

        echo $html;
    }

    /**
     * Displays a checkbox for a settings field
     *
     * @param array $args settings field args
     */
    public function callback_checkbox( $args ) {

        $value = esc_attr( $this->get_option( $args['id'], $args['section'], $args['std'] ) );

        $html  = '<fieldset>';
        $html  .= sprintf( '<label for="wpuf-%1$s[%2$s]">', $args['section'], $args['id'] );
        $html  .= sprintf( '<input type="hidden" name="%1$s[%2$s]" value="off" />', $args['section'], $args['id'] );
        $html  .= sprintf( '<input type="checkbox" class="checkbox" id="wpuf-%1$s[%2$s]" name="%1$s[%2$s]" value="on" %3$s />', $args['section'], $args['id'], checked( $value, 'on', false ) );
        $html  .= sprintf( '<span class="description">%1$s</span></label>', $args['desc'] );
        $html  .= '</fieldset>';

        echo $html;
    }

    /**
     * Displays a multicheckbox for a settings field
     *
     * @param array $args settings field args
     */
    public function callback_multicheck( $args ) {

        $value = $this->get_option( $args['id'], $args['section'], $args['std'] );
        $html  = '<fieldset>';
        $html .= sprintf( '<input type="hidden" name="%1$s[%2$s]" value="" />', $args['section'], $args['id'] );
        foreach ( $args['options'] as $key => $label ) {
            $checked = isset( $value[ $key ] ) ? $value[ $key ] : '0';
            $html    .= sprintf( '<label for="wpuf-%1$s[%2$s][%3$s]">', $args['section'], $args['id'], $key );
            $html    .= sprintf( '<input type="checkbox" class="checkbox" id="wpuf-%1$s[%2$s][%3$s]" name="%1$s[%2$s][%3$s]" value="%3$s" %4$s />', $args['section'], $args['id'], $key, checked( $checked, $key, false ) );
            $html    .= sprintf( '<span class="description">%1$s</span></label><br>', $label );
        }

        $html .= $this->get_field_description( $args );
        $html .= '</fieldset>';

        echo $html;
    }

    /**
     * Displays a radio button for a settings field
     *
     * @param array $args settings field args
     */
    public function callback_radio( $args ) {

        $value = $this->get_option( $args['id'], $args['section'], $args['std'] );
        $html  = '<fieldset>';

        foreach ( $args['options'] as $key => $label ) {
            $html .= sprintf( '<label for="wpuf-%1$s[%2$s][%3$s]">', $args['section'], $args['id'], $key );
            $html .= sprintf( '<input type="radio" class="radio" id="wpuf-%1$s[%2$s][%3$s]" name="%1$s[%2$s]" value="%3$s" %4$s />', $args['section'], $args['id'], $key, checked( $value, $key, false ) );
            $html .= sprintf( '<span class="description">%1$s</span></label><br>', $label );
        }

        $html .= $this->get_field_description( $args );
        $html .= '</fieldset>';

        echo $html;
    }

    /**
     * Displays a selectbox for a settings field
     *
     * @param array $args settings field args
     */
    public function callback_select( $args ) {

        $value = esc_attr( $this->get_option( $args['id'], $args['section'], $args['std'] ) );
        $classes  = isset( $args['size'] ) && ! is_null( $args['size'] ) ? $args['size'] : 'regular';
        $html  = sprintf( '<select class="%1$s" name="%2$s[%3$s]" id="%2$s[%3$s]">', $classes, $args['section'], $args['id'] );

        foreach ( $args['options'] as $key => $label ) {
            $html .= sprintf( '<option value="%s"%s>%s</option>', $key, selected( $value, $key, false ), $label );
        }

        $html .= sprintf( '</select>' );
        $html .= $this->get_field_description( $args );

        echo $html;
    }

    /**
     * Displays a textarea for a settings field
     *
     * @param array $args settings field args
     */
    public function callback_textarea( $args ) {

        $value       = esc_textarea( $this->get_option( $args['id'], $args['section'], $args['std'] ) );
        $size        = isset( $args['size'] ) && ! is_null( $args['size'] ) ? $args['size'] : 'regular';
        $placeholder = empty( $args['placeholder'] ) ? '' : ' placeholder="' . $args['placeholder'] . '"';

        $html        = sprintf( '<textarea rows="5" cols="55" class="%1$s-text" id="%2$s[%3$s]" name="%2$s[%3$s]"%4$s>%5$s</textarea>', $size, $args['section'], $args['id'], $placeholder, $value );
        $html        .= $this->get_field_description( $args );

        echo $html;
    }

    /**
     * Displays the html for a settings field
     *
     * @param array $args settings field args
     * @return string
     */
    public function callback_html( $args ) {
        echo $this->get_field_description( $args );
    }

    /**
     * Displays the section title for a settings field
     *
     * @param array $args settings field args
     * @return string
     */
    public function callback_section_title( $args ) {
        echo $this->get_field_description( $args );
    }

    /**
     * Displays a rich text textarea for a settings field
     *
     * @param array $args settings field args
     */
    public function callback_wysiwyg( $args ) {

        $value = $this->get_option( $args['id'], $args['section'], $args['std'] );
        $size  = isset( $args['size'] ) && ! is_null( $args['size'] ) ? $args['size'] : '500px';

        echo '<div style="max-width: ' . $size . ';">';

        $editor_settings = array(
            'teeny'         => true,
            'textarea_name' => $args['section'] . '[' . $args['id'] . ']',
            'textarea_rows' => 10,
        );

        if ( isset( $args['options'] ) && is_array( $args['options'] ) ) {
            $editor_settings = array_merge( $editor_settings, $args['options'] );
        }

        wp_editor( $value, $args['section'] . '-' . $args['id'], $editor_settings );

        echo '</div>';

        echo $this->get_field_description( $args );
    }

    /**
     * Displays a file upload field for a settings field
     *
     * @param array $args settings field args
     */
    public function callback_file( $args ) {

        $value = esc_attr( $this->get_option( $args['id'], $args['section'], $args['std'] ) );
        $size  = isset( $args['size'] ) && ! is_null( $args['size'] ) ? $args['size'] : 'regular';
        $id    = $args['section'] . '[' . $args['id'] . ']';
        $label = isset( $args['options']['button_label'] ) ? $args['options']['button_label'] : __( 'Choose File' );

        $html  = sprintf( '<input type="text" class="%1$s-text wpsa-url" id="%2$s[%3$s]" name="%2$s[%3$s]" value="%4$s"/>', $size, $args['section'], $args['id'], $value );
        $html  .= '<input type="button" class="button wpsa-browse" value="' . $label . '" />';
        $html  .= $this->get_field_description( $args );

        echo $html;
    }

    /**
     * Displays a image upload field for a settings field
     *
     * @param array $args settings field args
     */
    public function callback_image( $args ) {

        $value = esc_attr( $this->get_option( $args['id'], $args['section'], $args['std'] ) );
        $size = isset( $args['size'] ) && ! is_null( $args['size'] ) ? $args['size'] : 'regular';
        $id = $args['section'] . '[' . $args['id'] . ']';
        $label = isset( $args['options']['button_label'] ) ? $args['options']['button_label'] : __( 'Choose Image' );
        $label_remove = isset( $args['options']['button_remove_label'] ) ? $args['options']['button_remove_label'] : __( 'Remove Image' );
        $img = wp_get_attachment_image_src( $value, $args['size'] ? $args['size'] : 'thumbnail' );
        $img_url = $img ? $img[0] : '';

        $html  = sprintf( '<input type="hidden" class="%1$s-text wpsa-image-id" id="%2$s" name="%2$s" value="%3$s"/>', $size, $id, $value );
        $html .= '<p class="wpsa-image-preview"><img src="' . $img_url . '" /></p>';
        $html .= '<input type="button" class="button button-primary wpsa-image-browse" value="' . $label . '" />';
        $html .= '<input type="button" class="button button-link wpsa-image-remove" value="' . $label_remove . '" />';
        $html .= $this->get_field_description( $args );

        echo $html;
    }

    /**
     * Displays a password field for a settings field
     *
     * @param array $args settings field args
     */
    public function callback_password( $args ) {
        $value = esc_attr( $this->get_option( $args['id'], $args['section'], $args['std'] ) );
        $size  = isset( $args['size'] ) && ! is_null( $args['size'] ) ? $args['size'] : 'regular';

        $html  = sprintf( '<input type="password" class="%1$s-text" id="%2$s[%3$s]" name="%2$s[%3$s]" value="%4$s"/>', $size, $args['section'], $args['id'], $value );
        $html  .= $this->get_field_description( $args );

        echo $html;
    }

    /**
     * Displays a color picker field for a settings field
     *
     * @param array $args settings field args
     */
    public function callback_color( $args ) {

        $value = esc_attr( $this->get_option( $args['id'], $args['section'], $args['std'] ) );
        $size  = isset( $args['size'] ) && ! is_null( $args['size'] ) ? $args['size'] : 'regular';

        $html  = sprintf( '<input type="text" class="%1$s-text wp-color-picker-field" id="%2$s[%3$s]" name="%2$s[%3$s]" value="%4$s" data-default-color="%5$s" />', $size, $args['section'], $args['id'], $value, $args['std'] );
        $html  .= $this->get_field_description( $args );

        echo $html;
    }


    /**
     * Displays a select box for creating the pages select box
     *
     * @param array $args settings field args
     */
    public function callback_pages( $args ) {

        $dropdown_args = array(
            'selected' => esc_attr( $this->get_option( $args['id'], $args['section'], $args['std'] ) ),
            'name'     => $args['section'] . '[' . $args['id'] . ']',
            'id'       => $args['section'] . '[' . $args['id'] . ']',
            'echo'     => 0,
        );
        $html = wp_dropdown_pages( $dropdown_args );
        echo $html;
    }

    /**
     * Displays a toggle field for a settings field
     *
     * @param array $args settings field args.
     */
    public function callback_toggle( $args ) {
        $value = esc_attr( $this->get_option( $args['id'], $args['section'], $args['std'] ) );

        $html = sprintf( '<label for="wpuf-%1$s[%2$s]" class="vp-toggle-field">', $args['section'], $args['id'] );
        $html .= sprintf( '<input type="hidden" name="%1$s[%2$s]" value="off" />', esc_attr( $args['section'] ), esc_attr( $args['id'] ) );
        $html .= sprintf( '<input type="checkbox" id="wpuf-%1$s[%2$s]" name="%1$s[%2$s]" value="on" %3$s/>', esc_attr( $args['section'] ), esc_attr( $args['id'] ), checked( $value, 'on', false ) );
        $html  .= sprintf( '<span class="vp-toggle-field-slider-round"></span><span class="description">%1$s</span></label>', $args['desc'] );

        echo $html;
    }

    /**
     * Displays a range field for a settings field
     *
     * @param array $args settings field args.
     */
    public function callback_range( $args ) {

        $value       = esc_attr( $this->get_option( $args['id'], $args['section'], $args['std'] ) );
        $size        = isset( $args['size'] ) && ! is_null( $args['size'] ) ? $args['size'] : 'regular';
        $type        = isset( $args['type'] ) ? $args['type'] : 'range';
        $placeholder = empty( $args['placeholder'] ) ? '' : ' placeholder="' . $args['placeholder'] . '"';
        $min         = empty( $args['min'] ) ? '' : ' min="' . $args['min'] . '"';
        $max         = empty( $args['max'] ) ? '' : ' max="' . $args['max'] . '"';
        $step        = empty( $args['max'] ) ? '' : ' step="' . $args['step'] . '"';
        ?>
        <?php
            echo sprintf(
                '<input type="%1$s" class="%2$s-range vp-range-field" id="%3$s[%4$s]" name="%3$s[%4$s]" value="%5$s"%6$s%7$s%8$s%9$s/>',
                esc_attr( $type ),
                esc_attr( $size ),
                esc_attr( $args['section'] ),
                esc_attr( $args['id'] ),
                esc_attr( $value ),
                esc_attr( $placeholder ),
                esc_attr( $min ),
                esc_attr( $max ),
                esc_attr( $step )
            );
            echo sprintf(
                '<input type="number" class="number-range vp-range-number-field" name="%1$s[%2$s]" value="%3$s"%4$s%5$s%6$s%7$s/>',
                esc_attr( $args['section'] ),
                esc_attr( $args['id'] ),
                esc_attr( $value ),
                esc_attr( $placeholder ),
                esc_attr( $min ),
                esc_attr( $max ),
                esc_attr( $step )
            );
            echo wp_kses_post( $this->get_field_description( $args ) );
        ?>
        <?php
    }

    /**
     * Displays a hidden field for a settings field
     *
     * @param array $args settings field args.
     */
    public function callback_hidden( $args ) {

        $value       = esc_attr( $this->get_option( $args['id'], $args['section'], $args['std'] ) );
        $size        = isset( $args['size'] ) && ! is_null( $args['size'] ) ? $args['size'] : 'regular';
        $type        = isset( $args['type'] ) ? $args['type'] : 'hidden';
        $placeholder = empty( $args['placeholder'] ) ? '' : ' placeholder="' . $args['placeholder'] . '"';

        echo sprintf(
            '<input type="%1$s" class="%2$s-text" id="%3$s[%4$s]" name="%3$s[%4$s]" value="%5$s"%6$s/>',
            esc_attr( $type ),
            esc_attr( $size ),
            esc_attr( $args['section'] ),
            esc_attr( $args['id'] ),
            esc_attr( $value ),
            esc_attr( $placeholder )
        );
        echo wp_kses_post( $this->get_field_description( $args ) );
    }

    /**
     * Sanitize callback for Settings API
     *
     * @return mixed
     */
    public function sanitize_options( $options ) {

        if ( ! $options ) {
            return $options;
        }

        foreach ( $options as $option_slug => $option_value ) {
            $sanitize_callback = $this->get_sanitize_callback( $option_slug );

            // If callback is set, call it
            if ( $sanitize_callback ) {
                $options[ $option_slug ] = call_user_func( $sanitize_callback, $option_value );
                continue;
            }
        }

        return $options;
    }

    /**
     * Get sanitization callback for given option slug
     *
     * @param string $slug option slug
     *
     * @return mixed string or bool false
     */
    public function get_sanitize_callback( $slug = '' ) {
        if ( empty( $slug ) ) {
            return false;
        }

        // Iterate over registered fields and see if we can find proper callback
        foreach ( $this->settings_fields as $section => $options ) {
            foreach ( $options as $option ) {
                if ( $option['name'] != $slug ) {
                    continue;
                }

                // Return the callback name
                return isset( $option['sanitize_callback'] ) && is_callable( $option['sanitize_callback'] ) ? $option['sanitize_callback'] : false;
            }
        }

        return false;
    }

    /**
     * Get the value of a settings field
     *
     * @param string $option  settings field name
     * @param string $section the section name this field belongs to
     * @param string $default default text if it's not found
     * @return string
     */
    public function get_option( $option, $section, $default = '' ) {

        $options = get_option( $section );

        if ( isset( $options[ $option ] ) ) {
            return $options[ $option ];
        }

        return $default;
    }

    /**
     * Show navigations as tab
     *
     * Shows all the settings section labels as tab
     */
    public function show_navigation() {
        $html = '<h2 class="nav-tab-wrapper">';

        $count = count( $this->settings_sections );

        // don't show the navigation if only one section exists
        if ( $count === 1 ) {
            return;
        }

        foreach ( $this->settings_sections as $tab ) {
            $html .= sprintf( '<a href="#%1$s" class="nav-tab" id="%1$s-tab">%2$s%3$s</a>', $tab['id'], isset( $tab['icon'] ) ? $tab['icon'] : '', $tab['title'] );
        }

        $html .= '</h2>';

        echo $html;
    }

    /**
     * Tabbable JavaScript codes & Initiate Color Picker
     *
     * This code uses localstorage for displaying active tabs
     */
    public function script() {
        ?>
        <script>
            jQuery(function($) {
                // Initiate Conditionize
                $( '.metabox-holder' ).conditionize();

                // Initiate Color Picker
                $('.wp-color-picker-field').wpColorPicker();

                // Switches option sections
                $('.group').hide();
                var activetab = '';
                if (typeof(localStorage) != 'undefined' ) {
                    activetab = localStorage.getItem("activetab");
                }

                //if url has section id as hash then set it as active or override the current local storage value
                if(window.location.hash){
                    activetab = window.location.hash;
                    if (typeof(localStorage) != 'undefined' ) {
                        localStorage.setItem("activetab", activetab);
                    }
                }

                if (activetab != '' && $(activetab).length ) {
                    $(activetab).fadeIn();
                } else {
                    $('.group:first').fadeIn();
                }
                $('.group .collapsed').each(function(){
                    $(this).find('input:checked').parent().parent().parent().nextAll().each(
                        function(){
                            if ($(this).hasClass('last')) {
                                $(this).removeClass('hidden');
                                return false;
                            }
                            $(this).filter('.hidden').removeClass('hidden');
                        });
                });

                if (activetab != '' && $(activetab + '-tab').length ) {
                    $(activetab + '-tab').addClass('nav-tab-active');
                }
                else {
                    $('.nav-tab-wrapper a:first').addClass('nav-tab-active');
                }
                $('.nav-tab-wrapper a').click(function(evt) {
                    $('.nav-tab-wrapper a').removeClass('nav-tab-active');
                    $(this).addClass('nav-tab-active').blur();
                    var clicked_group = $(this).attr('href');
                    if (typeof(localStorage) != 'undefined' ) {
                        localStorage.setItem("activetab", $(this).attr('href'));
                    }
                    $('.group').hide();
                    $(clicked_group).fadeIn();
                    evt.preventDefault();
                });

                $('.wpsa-browse').on('click', function (event) {
                    event.preventDefault();

                    var $this = $(this);

                    // Create the media frame.
                    var file_frame = wp.media.frames.file_frame = wp.media({
                        title: $this.data('uploader_title'),
                        button: {
                            text: $this.data('uploader_button_text'),
                        },
                        multiple: false
                    });

                    file_frame.on('select', function () {
                        attachment = file_frame.state().get('selection').first().toJSON();
                        $this.prev('.wpsa-url').val(attachment.url).change();
                    });

                    // Finally, open the modal
                    file_frame.open();
                });

                $('.wpsa-image-browse').on('click', function(event) {
                    event.preventDefault();
                    var $this = $(this);

                    // Create the media frame.
                    var file_frame = wp.media.frames.file_frame = wp.media({
                        title: $this.data('uploader_title'),
                        button: {
                            text: $this.data('uploader_button_text'),
                        },
                        multiple: false,
                        library: { type: 'image' }
                    })

                    .on('select', function () {
                        attachment = file_frame.state().get('selection').first().toJSON();
                        var url;

                        if (attachment.sizes && attachment.sizes.thumbnail) {
                            url = attachment.sizes.thumbnail.url;
                        } else {
                            url = attachment.url;
                        }

                        $this.siblings('.wpsa-image-id').val(attachment.id).change();
                        $this.siblings('.wpsa-image-preview').children('img').attr('src', url);
                        $this.siblings('.wpsa-image-remove').css('display', 'inline-block');

                        $this.trigger( 'wpsa-image-browse-selected', [ attachment, url ] );
                    })

                    // Finally, open the modal
                    .open();
                });

                $('.wpsa-image-remove').each(function() {
                    var $this = $(this);

                    if ( $this.siblings('.wpsa-image-id').val() ) {
                        $this.css('display', 'inline-block');
                    }
                });

                $('.wpsa-image-remove').on('click', function(event) {
                    event.preventDefault();
                    var $this = $(this);

                    $this.siblings('.wpsa-image-id').val('').change();
                    $this.siblings('.wpsa-image-preview').children('img').attr('src', '');
                    $this.css('display', '');

                    $this.trigger( 'wpsa-image-removed' );
                });

                $( 'input.vp-range-field, input.vp-range-number-field' ).on( 'input change', function() {
                    const name = $( this ).attr( 'name' );
                    const min = parseInt( $( this ).attr( 'min' ).replace( /"/g, '' ), 10 );
                    const max = parseInt( $( this ).attr( 'max' ).replace( /"/g, '' ), 10 );
                    const val = parseInt( $( this ).val(), 10 );
                    const inputs = $( `input[name="${ name }"]` );

                    if ( max < val ) {
                        $( this ).val( max );
                    }
                    if ( min > val || isNaN( val ) ) {
                        $( this ).val( min );
                    }

                    if ( $( inputs[ 0 ] ).val() !== $( inputs[ 1 ] ).val() ) {
                        inputs.val( $( this ).val() );
                    }
                });
            });
        </script>
        <?php
    }

    /**
     * Show the section settings forms
     *
     * This function displays every sections in a different form
     */
    public function show_forms() {
        ?>
        <div class="metabox-holder">
            <?php foreach ( $this->settings_sections as $form ) {
                echo apply_filters( 'vp_settings_show_section_form', $this->get_form( $form ), $form );
            } ?>
        </div>
        <?php
        $this->script();
    }

        /**
     * Prints out all settings sections added to a particular settings page
     *
     * Part of the Settings API. Use this in a settings page callback function
     * to output all the sections and fields that were added to that $page with
     * add_settings_section() and add_settings_field()
     *
     * @global array $wp_settings_sections Storage array of all settings sections added to admin pages.
     * @global array $wp_settings_fields Storage array of settings fields and info about their pages/sections.
     *
     * @param string $page The slug name of the page whose settings sections you want to output.
     */
    public function do_settings_sections( $page ) {
        global $wp_settings_sections, $wp_settings_fields;

        if ( ! isset( $wp_settings_sections[ $page ] ) ) {
            return;
        }

        foreach ( (array) $wp_settings_sections[ $page ] as $section ) {
            if ( $section['callback'] ) {
                call_user_func( $section['callback'], $section );
            }

            if ( ! isset( $wp_settings_fields ) || ! isset( $wp_settings_fields[ $page ] ) || ! isset( $wp_settings_fields[ $page ][ $section['id'] ] ) ) {
                continue;
            }
            echo '<table class="form-table" role="presentation">';
            $this->do_settings_fields( $page, $section['id'] );
            echo '</table>';
        }
    }

    /**
     * Get the section settings form.
     * This function return displays detailed section in a each of forms.
     *
     * @param array $form - Form item.
     * @return string
     */
    public function get_form( $form ) {
        ob_start();
        ?>
        <div id="<?php echo $form['id']; ?>" class="group" style="display: none;">
            <form method="post" action="options.php">
                <?php
                do_action( 'wsa_form_top_' . $form['id'], $form );
                settings_fields( $form['id'] );
                $this->do_settings_sections( $form['id'] );
                do_action( 'wsa_form_bottom_' . $form['id'], $form );
                if ( isset( $this->settings_fields[ $form['id'] ] ) ) :
                    ?>
                    <div class="metabox-holder-footer">
                        <?php submit_button(); ?>
                    </div>
                <?php endif; ?>
            </form>
        </div>
        <?php
        return ob_get_clean();
    }

    /**
     * Print out the settings fields for a particular settings section.
     *
     * Part of the Settings API. Use this in a settings page to output
     * a specific section. Should normally be called by do_settings_sections()
     * rather than directly.
     *
     * @global array $wp_settings_fields Storage array of settings fields and their pages/sections.
     *
     * @param string $page Slug title of the admin page whose settings fields you want to show.
     * @param string $section Slug title of the settings section whose fields you want to show.
     */
    public function do_settings_fields( $page, $section ) {
        global $wp_settings_fields;

        if ( ! isset( $wp_settings_fields[ $page ][ $section ] ) ) {
            return;
        }

        foreach ( (array) $wp_settings_fields[ $page ][ $section ] as $field ) {
            $class     = '';
            $condition = '';
            $style     = '';

            if ( ! empty( $field['args']['class'] ) ) {
                $class = $field['args']['class'];
            }

            if ( isset( $field['args']['type'] ) ) {
                $class .= ' vpf-setting-type-' . $field['args']['type'];
            }

            if ( isset( $field['args']['conditionize'] ) && ! empty( $field['args']['conditionize'] ) ) {
                $condition = ' data-cond="' . esc_attr( $field['args']['conditionize'] ) . '"';
            }

            if ( ! empty( $class ) ) {
                $class = ' class="' . esc_attr( $class ) . '"';
            }

            echo "<tr{$class}{$condition}{$style}>";

            if ( ! empty( $field['args']['label_for'] ) ) {
                echo '<th scope="row"><label for="' . esc_attr( $field['args']['label_for'] ) . '">' . $field['title'] . '</label></th>';
            } else {
                echo '<th scope="row">' . $field['title'] . '</th>';
            }

            echo '<td>';
            call_user_func( $field['callback'], $field['args'] );
            echo '</td>';
            echo '</tr>';
        }
    }

    /**
     * Convert condition arguments to Conditionize string.
     *
     * @param array $conditions - Array with Condition arguments.
     * @return string
     */
    public function convert_arguments_to_conditionize_string( $conditions ) {
        $data_condition = '';
        if ( isset( $conditions ) && is_array( $conditions ) && ! empty( $conditions ) ) {
            foreach ( $conditions as $key => $condition ) {
                $condition['value'] = empty( $condition['value'] ) ? "''" : ( '' . $condition['value'] );

                $data_condition .= $condition['control'];

                if ( isset( $condition['operator'] ) && isset( $condition['value'] ) ) {
                    $data_condition .= ' ' . $condition['operator'] . ' ' . $condition['value'];
                }

                if ( 1 < count( $conditions ) && ( count( $conditions ) - 1 ) !== $key ) {
                    $data_condition .= ' && ';
                }
            }
        }

        return $data_condition;
    }
}
