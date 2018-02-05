<?php
/**
 * Plugin Settings
 *
 * @package visual-portfolio
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
            esc_html__( 'Settings', NK_VP_DOMAIN ),
            esc_html__( 'Settings', NK_VP_DOMAIN ),
            'manage_options',
            'visual-portfolio-settings',
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
                'title' => esc_html__( 'General', NK_VP_DOMAIN ),
            ),
            array(
                'id'    => 'vp_popup_gallery',
                'title' => esc_html__( 'Popup Gallery', NK_VP_DOMAIN ),
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
                    'name'    => 'no_image',
                    'label'   => esc_html__( 'No Image', NK_VP_DOMAIN ),
                    'desc'    => esc_html__( 'This image used if featured image of post is not specified.', NK_VP_DOMAIN ),
                    'type'    => 'image',
                    'default' => '',
                    'options' => array(
                        'button_label' => esc_html__( 'Choose Image', NK_VP_DOMAIN ),
                    ),
                ),
            ),
            'vp_popup_gallery' => array(
                array(
                    'name'    => 'show_arrows',
                    'label'   => esc_html__( 'Show Arrows', NK_VP_DOMAIN ),
                    'desc'    => esc_html__( 'Arrows to navigate between images.', NK_VP_DOMAIN ),
                    'type'    => 'checkbox',
                    'default' => 'on',
                ),
                array(
                    'name'    => 'show_caption',
                    'label'   => esc_html__( 'Show Caption', NK_VP_DOMAIN ),
                    'desc'    => esc_html__( 'Below images will be showed caption with Title and Description.', NK_VP_DOMAIN ),
                    'type'    => 'checkbox',
                    'default' => 'on',
                ),
                array(
                    'name'    => 'show_counter',
                    'label'   => esc_html__( 'Show Images Counter', NK_VP_DOMAIN ),
                    'desc'    => esc_html__( 'On the top left corner will be showed images counter.', NK_VP_DOMAIN ),
                    'type'    => 'checkbox',
                    'default' => 'on',
                ),
                array(
                    'name'    => 'show_zoom_button',
                    'label'   => esc_html__( 'Show Zoom Button', NK_VP_DOMAIN ),
                    'type'    => 'checkbox',
                    'default' => 'on',
                ),
                array(
                    'name'    => 'show_fullscreen_button',
                    'label'   => esc_html__( 'Show Fullscreen Button', NK_VP_DOMAIN ),
                    'type'    => 'checkbox',
                    'default' => 'on',
                ),
                array(
                    'name'    => 'show_share_button',
                    'label'   => esc_html__( 'Show Share Button', NK_VP_DOMAIN ),
                    'type'    => 'checkbox',
                    'default' => 'on',
                ),
                array(
                    'name'    => 'show_close_button',
                    'label'   => esc_html__( 'Show Close Button', NK_VP_DOMAIN ),
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
        echo '<h2>' . esc_html__( 'Visual Portfolio Settings', NK_VP_DOMAIN ) . '</h2>';

        $this->settings_api->show_navigation();
        $this->settings_api->show_forms();

        echo '</div>';
    }
}
