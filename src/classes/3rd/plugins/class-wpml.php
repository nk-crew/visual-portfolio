<?php
/**
 * Register some fields for WPML.
 *
 * @package @@plugin_name/preview
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// phpcs:disable WordPress.NamingConventions.ValidVariableName.VariableNotSnakeCase

/**
 * Class Visual_Portfolio_3rd_WPML
 */
class Visual_Portfolio_3rd_WPML {
    /**
     * Visual_Portfolio_3rd_WPML constructor.
     */
    public function __construct() {
        global $iclTranslationManagement;

        if ( ! isset( $iclTranslationManagement ) ) {
            return;
        }

        add_filter( 'vpf_registered_controls', array( $this, 'make_control_translatable' ) );
    }

    /**
     * Make Control Translatable.
     * https://wpml.org/forums/topic/unable-to-save-custom-field-translation-settings-when-acf-ml-is-installed/
     *
     * @param array $controls - controls array.
     *
     * @return array
     */
    public function make_control_translatable( $controls ) {
        global $iclTranslationManagement;

        $allow_save = false;

        // Prepare Saved Layouts meta fields.
        foreach ( $controls as $control ) {
            $name = 'vp_' . $control['name'];

            // Create initial arrays.
            if ( ! isset( $iclTranslationManagement->settings['custom_fields_translation'] ) ) {
                $iclTranslationManagement->settings['custom_fields_translation'] = array();
            }
            if ( ! isset( $iclTranslationManagement->settings['custom_fields_readonly_config'] ) ) {
                $iclTranslationManagement->settings['custom_fields_readonly_config'] = array();
            }

            // Add fields translation.
            if ( ! isset( $iclTranslationManagement->settings['custom_fields_translation'][ $name ] ) ) {
                $iclTranslationManagement->settings['custom_fields_translation'][ $name ] = $control['wpml'] ? WPML_TRANSLATE_CUSTOM_FIELD : WPML_COPY_CUSTOM_FIELD;

                $allow_save = true;
            }

            // Add fields read only.
            if ( ! in_array( $name, $iclTranslationManagement->settings['custom_fields_readonly_config'], true ) ) {
                $iclTranslationManagement->settings['custom_fields_readonly_config'][] = $name;

                $allow_save = true;
            }
        }

        // Images meta array.
        if ( ! isset( $iclTranslationManagement->settings['custom_fields_attributes_whitelist']['vp_images'] ) ) {
            $iclTranslationManagement->settings['custom_fields_attributes_whitelist']['vp_images'] = array(
                '*' => array(
                    'title'       => array(),
                    'description' => array(),
                    'author'      => array(),
                    'categories'  => array(),
                ),
            );

            $allow_save = true;
        }

        if ( $allow_save ) {
            $iclTranslationManagement->save_settings();
        }

        return $controls;
    }
}

new Visual_Portfolio_3rd_WPML();
