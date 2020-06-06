<?php
/**
 * Plugin Settings
 *
 * @package @@plugin_name
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

require_once visual_portfolio()->plugin_path . 'vendors/class-settings-api.php';

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
                'id'    => 'vp_images',
                'title' => esc_html__( 'Images', '@@text_domain' ),
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
                    'label'   => esc_html__( 'Portfolio Slug', '@@text_domain' ),
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
                    'label'   => esc_html__( 'No Image', '@@text_domain' ),
                    'desc'    => esc_html__( 'This image used if the featured image of a post is not specified.', '@@text_domain' ),
                    'type'    => 'image',
                    'default' => '',
                    'options' => array(
                        'button_label' => esc_html__( 'Choose image', '@@text_domain' ),
                    ),
                ),
            ),
            'vp_images' => array(
                array(
                    'name'    => 'lazy_loading',
                    'label'   => esc_html__( 'Lazy Loading', '@@text_domain' ),
                    'desc'    => esc_html__( 'Enable', '@@text_domain' ),
                    'type'    => 'checkbox',
                    'default' => 'on',
                ),

                array(
                    'name'  => 'images_sizes_title',
                    'label' => esc_html__( 'Image Sizes', '@@text_domain' ),
                    'type'  => 'html',
                ),
                array(
                    'name'    => 'images_layouts_title',
                    'label'   => esc_html__( 'Layouts', '@@text_domain' ),
                    'desc'    => __( 'Image sizes used in portfolio layouts.', '@@text_domain' ),
                    'type'    => 'html',
                ),
                array(
                    'name'        => 'sm',
                    'label'       => esc_html__( 'Small', '@@text_domain' ),
                    'type'        => 'number',
                    'placeholder' => '500',
                    'default'     => 500,
                ),
                array(
                    'name'        => 'md',
                    'label'       => esc_html__( 'Medium', '@@text_domain' ),
                    'type'        => 'number',
                    'placeholder' => '800',
                    'default'     => 800,
                ),
                array(
                    'name'        => 'lg',
                    'label'       => esc_html__( 'Large', '@@text_domain' ),
                    'type'        => 'number',
                    'placeholder' => '1280',
                    'default'     => 1280,
                ),
                array(
                    'name'        => 'xl',
                    'label'       => esc_html__( 'Extra Large', '@@text_domain' ),
                    'type'        => 'number',
                    'placeholder' => '1920',
                    'default'     => 1920,
                ),
                array(
                    'name'    => 'images_popup_title',
                    'label'   => esc_html__( 'Popup Gallery', '@@text_domain' ),
                    'desc'    => __( 'Image sizes used in popup gallery images.', '@@text_domain' ),
                    'type'    => 'html',
                ),
                array(
                    'name'        => 'sm_popup',
                    'label'       => esc_html__( 'Small', '@@text_domain' ),
                    'type'        => 'number',
                    'placeholder' => '500',
                    'default'     => 500,
                ),
                array(
                    'name'        => 'md_popup',
                    'label'       => esc_html__( 'Medium', '@@text_domain' ),
                    'type'        => 'number',
                    'placeholder' => '800',
                    'default'     => 800,
                ),
                array(
                    'name'        => 'xl_popup',
                    'label'       => esc_html__( 'Large', '@@text_domain' ),
                    'type'        => 'number',
                    'placeholder' => '1920',
                    'default'     => 1920,
                ),
                array(
                    'name'    => 'images_sizes_note',
                    // translators: %s: regenerate thumbnails url.
                    'desc'    => sprintf( __( 'After publishing your changes, new image sizes may not be shown until you <a href="%s" target="_blank">Regenerate Thumbnails</a>.', '@@text_domain' ), 'https://wordpress.org/plugins/regenerate-thumbnails/' ),
                    'type'    => 'html',
                ),
            ),
            'vp_popup_gallery' => array(
                // Vendor.
                array(
                    'name'    => 'vendor',
                    'label'   => esc_html__( 'Vendor Script', '@@text_domain' ),
                    'type'    => 'select',
                    'options' => array(
                        'photoswipe' => esc_html__( 'PhotoSwipe', '@@text_domain' ),
                        'fancybox'   => esc_html__( 'Fancybox', '@@text_domain' ),
                    ),
                    'default' => 'photoswipe',
                ),

                // Default WordPress Images.
                array(
                    'name'    => 'enable_on_wordpress_images',
                    'label'   => esc_html__( 'WordPress Images', '@@text_domain' ),
                    'desc'    => esc_html__( 'Enable popup for WordPress images and galleries.', '@@text_domain' ),
                    'type'    => 'checkbox',
                    'default' => 'off',
                ),

                // Deeplinking.
                array(
                    'name'    => 'deep_linking',
                    'label'   => esc_html__( 'Deep Linking', '@@text_domain' ),
                    'desc'    => esc_html__( 'Makes URL automatically change when you open popup and you can easily link to specific popup image.', '@@text_domain' ),
                    'type'    => 'checkbox',
                    'default' => 'on',
                    'is_pro'  => true,
                ),

                // General Popup Settings.
                array(
                    'name'    => 'show_arrows',
                    'label'   => esc_html__( 'Display Arrows', '@@text_domain' ),
                    'desc'    => esc_html__( 'Arrows to navigate between images.', '@@text_domain' ),
                    'type'    => 'checkbox',
                    'default' => 'on',
                ),
                array(
                    'name'    => 'show_counter',
                    'label'   => esc_html__( 'Display Images Counter', '@@text_domain' ),
                    'desc'    => esc_html__( 'On the top left corner will be showed images counter.', '@@text_domain' ),
                    'type'    => 'checkbox',
                    'default' => 'on',
                ),
                array(
                    'name'    => 'show_zoom_button',
                    'label'   => esc_html__( 'Display Zoom Button', '@@text_domain' ),
                    'type'    => 'checkbox',
                    'default' => 'on',
                ),
                array(
                    'name'    => 'show_fullscreen_button',
                    'label'   => esc_html__( 'Display Fullscreen Button', '@@text_domain' ),
                    'type'    => 'checkbox',
                    'default' => 'on',
                ),
                array(
                    'name'    => 'show_share_button',
                    'label'   => esc_html__( 'Display Share Button', '@@text_domain' ),
                    'type'    => 'checkbox',
                    'default' => 'on',
                ),
                array(
                    'name'    => 'show_close_button',
                    'label'   => esc_html__( 'Display Close Button', '@@text_domain' ),
                    'type'    => 'checkbox',
                    'default' => 'on',
                ),

                // Fancybox Popup Settings.
                array(
                    'name'    => 'show_thumbs',
                    'label'   => esc_html__( 'Display Thumbnails', '@@text_domain' ),
                    'type'    => 'checkbox',
                    'default' => 'on',
                ),
                array(
                    'name'    => 'show_download_button',
                    'label'   => esc_html__( 'Display Download Button', '@@text_domain' ),
                    'type'    => 'checkbox',
                    'default' => 'off',
                ),
                array(
                    'name'    => 'show_slideshow',
                    'label'   => esc_html__( 'Display Slideshow', '@@text_domain' ),
                    'type'    => 'checkbox',
                    'default' => 'off',
                ),

                // Colors.
                array(
                    'name'    => 'background_color',
                    'label'   => esc_html__( 'Background Color', '@@text_domain' ),
                    'type'    => 'color',
                    'default' => '#1e1e1e',
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

        ?>
        <script>
            (function( $ ) {
                // update controls.
                function updateControls() {
                    // popup gallery.
                    var vendor = $('tr.vendor select').val();

                    $('tr.show_download_button, tr.show_slideshow, tr.show_thumbs')[ 'fancybox' === vendor ? 'show' : 'hide' ]();
                }

                updateControls();
                $('form').on('change', updateControls);
            })(jQuery);
        </script>
        <?php
    }
}
