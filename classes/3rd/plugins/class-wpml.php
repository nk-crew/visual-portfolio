<?php
/**
 * Register some fields for WPML.
 *
 * @package visual-portfolio/preview
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// phpcs:disable WordPress.NamingConventions.ValidVariableName.VariableNotSnakeCase, WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound

/**
 * Class Visual_Portfolio_3rd_WPML
 */
class Visual_Portfolio_3rd_WPML {
    /**
     * Archive Page.
     *
     * @var int $archive_page
     */
    private $archive_page = null;

    /**
     * Visual_Portfolio_3rd_WPML constructor.
     */
    public function __construct() {
        global $iclTranslationManagement;

        if ( class_exists( 'SitePress' ) ) {
            add_action( 'init', array( $this, 'init' ), 9 );
        }

        if ( ! isset( $iclTranslationManagement ) ) {
            return;
        }

        add_filter( 'vpf_registered_controls', array( $this, 'make_control_translatable' ) );
        add_filter( 'vpf_extend_options_before_query_args', array( $this, 'prepare_custom_query_taxonomies' ) );
    }

    /**
     * Initialize archive.
     *
     * @see __construct
     */
    public function init() {
        $this->archive_page = Visual_Portfolio_Settings::get_option( 'portfolio_archive_page', 'vp_general' );
        if ( isset( $this->archive_page ) && ! empty( $this->archive_page ) ) {
            add_action( 'wp_insert_post', array( $this, 'set_archive_meta' ), 10, 3 );
        }
    }

    /**
     * Set Archive Meta.
     *
     * @param int     $post_id - Post ID.
     * @param WP_Post $post - Post Object.
     * @param bool    $update - Whether this is an existing post being updated.
     * @return void
     */
    public function set_archive_meta( $post_id, $post, $update ) {
        $translate_page_id = self::get_object_id( $this->archive_page );
        if ( $translate_page_id === $post_id ) {
            visual_portfolio()->defer_flush_rewrite_rules();

            update_post_meta( (int) $post_id, '_vp_post_type_mapped', 'portfolio' );
        }
    }

    /**
     * Get wpml object ID.
     *
     * @param int $post_id - Post ID.
     * @return int
     */
    public static function get_object_id( $post_id ) {
        if ( class_exists( 'SitePress' ) ) {
            return apply_filters( 'wpml_object_id', $post_id, 'page', true );
        }
        return $post_id;
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

    /**
     * Convert custom taxonomies to the current language.
     *
     * @param array $options - query options.
     *
     * @return array
     */
    public function prepare_custom_query_taxonomies( $options ) {
        if ( isset( $options['posts_taxonomies'] ) && ! empty( $options['posts_taxonomies'] ) ) {
            foreach ( $options['posts_taxonomies'] as $k => $taxonomy ) {
                $taxonomy_data = get_term( $taxonomy );

                if ( isset( $taxonomy_data->taxonomy ) ) {
                    $options['posts_taxonomies'][ $k ] = apply_filters( 'wpml_object_id', $taxonomy, $taxonomy_data->taxonomy, true );
                }
            }
        }

        return $options;
    }
}

new Visual_Portfolio_3rd_WPML();
