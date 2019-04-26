<?php
/**
 * Plugin Settings
 *
 * @package @@plugin_name
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

require_once( visual_portfolio()->plugin_path . 'vendors/class-settings-api.php' );

/**
 * Visual Portfolio Settings Class
 */
class Visual_Portfolio_Settings {
    /**
     * Settings API instance
     *
     * @var object
     */
    public $settings_api;

    /**
     * Visual_Portfolio_Settings constructor.
     */
    public function __construct() {
        $this->init_actions();
    }

    /**
     * Get Option Value
     *
     * @param string $option - option name.
     * @param string $section - section name.
     * @param string $default - default option value.
     *
     * @return bool|string
     */
    public static function get_option( $option, $section, $default = '' ) {
        $options = get_option( $section );

        if ( isset( $options[ $option ] ) ) {
            return 'off' === $options[ $option ] ? false : ( 'on' === $options[ $option ] ? true : $options[ $option ] );
        }

        return $default;
    }

    /**
     * Init actions
     */
    public function init_actions() {
        $this->settings_api = new Visual_Portfolio_Settings_API();

        add_action( 'admin_init', array( $this, 'admin_init' ) );
        add_action( 'admin_menu', array( $this, 'admin_menu' ), 11 );
    }

    /**
     * Initialize the settings
     *
     * @return void
     */
    public function admin_init() {
        // set the settings.
        $this->settings_api->set_sections( $this->get_settings_sections() );
        $this->settings_api->set_fields( $this->get_settings_fields() );

        // initialize settings.
        $this->settings_api->admin_init();
    }

    /**
     * Register the admin settings menu
     *
     * @return void
     */
    public function admin_menu() {
        add_submenu_page(
            'edit.php?post_type=portfolio',
            esc_html__( 'Settings', '@@text_domain' ),
            esc_html__( 'Settings', '@@text_domain' ),
            'manage_options',
            '@@plugin_name-settings',
            array( $this, 'print_settings_page' )
        );
    }

    /**
     * Plugin settings sections
     *
     * @return array
     */
    public function get_settings_sections() {
        $sections = array(
            array(
                'id'    => 'vp_general',
                'title' => esc_html__( 'General', '@@text_domain' ),
            ),
            array(
                'id'    => 'vp_popup_gallery',
                'title' => esc_html__( 'Popup Gallery', '@@text_domain' ),
            ),
        );

        return $sections;
    }

    /**
     * Returns all the settings fields
     *
     * @return array settings fields
     */
    public function get_settings_fields() {
        $settings_fields = array(
            'vp_general' => array(
                array(
                    'name'    => 'portfolio_slug',
                    'label'   => esc_html__( 'Portfolio slug', '@@text_domain' ),
                    'type'    => 'text',
                    'default' => 'portfolio',
                ),
                array(
                    'name'    => 'filter_taxonomies',
                    'label'   => esc_html__( 'Filter Taxonomies', '@@text_domain' ),
                    'desc'    => esc_html__( 'You can show custom taxonomies in the portfolio Filter. Enter some taxonomies by "," separating values. Example: "product_cat,product_tag"', '@@text_domain' ),
                    'type'    => 'text',
                    'default' => '',
                ),
                array(
                    'name'    => 'no_image',
                    'label'   => esc_html__( 'No image', '@@text_domain' ),
                    'desc'    => esc_html__( 'This image used if the featured image of a post is not specified.', '@@text_domain' ),
                    'type'    => 'image',
                    'default' => '',
                    'options' => array(
                        'button_label' => esc_html__( 'Choose image', '@@text_domain' ),
                    ),
                ),
            ),
            'vp_popup_gallery' => array(
                array(
                    'name'    => 'show_arrows',
                    'label'   => esc_html__( 'Show arrows', '@@text_domain' ),
                    'desc'    => esc_html__( 'Arrows to navigate between images.', '@@text_domain' ),
                    'type'    => 'checkbox',
                    'default' => 'on',
                ),

                array(
                    'name'    => 'show_counter',
                    'label'   => esc_html__( 'Show images counter', '@@text_domain' ),
                    'desc'    => esc_html__( 'On the top left corner will be showed images counter.', '@@text_domain' ),
                    'type'    => 'checkbox',
                    'default' => 'on',
                ),
                array(
                    'name'    => 'show_zoom_button',
                    'label'   => esc_html__( 'Show zoom button', '@@text_domain' ),
                    'type'    => 'checkbox',
                    'default' => 'on',
                ),
                array(
                    'name'    => 'show_fullscreen_button',
                    'label'   => esc_html__( 'Show fullscreen button', '@@text_domain' ),
                    'type'    => 'checkbox',
                    'default' => 'on',
                ),
                array(
                    'name'    => 'show_share_button',
                    'label'   => esc_html__( 'Show share button', '@@text_domain' ),
                    'type'    => 'checkbox',
                    'default' => 'on',
                ),
                array(
                    'name'    => 'show_close_button',
                    'label'   => esc_html__( 'Show close button', '@@text_domain' ),
                    'type'    => 'checkbox',
                    'default' => 'on',
                ),
            ),
        );

        return $settings_fields;
    }

    /**
     * The plugin page handler
     *
     * @return void
     */
    public function print_settings_page() {
        echo '<div class="wrap">';
        echo '<h2>' . esc_html__( 'Visual Portfolio Settings', '@@text_domain' ) . '</h2>';

        $this->settings_api->show_navigation();
        $this->settings_api->show_forms();

        echo '</div>';
    }
}
