<?php
/**
 * Plugin Settings
 *
 * @package visual-portfolio
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
	public static $settings_api;

	/**
	 * Cached settings fields. We call settings fields method a lot of times to get default values.
	 * So, for performance reasons we need to cache the output.
	 *
	 * @var object
	 */
	public static $cached_settings_fields;

	/**
	 * Visual_Portfolio_Settings constructor.
	 */
	public function __construct() {
		self::init_actions();
	}

	/**
	 * Get Option Value
	 *
	 * @param string $option - option name.
	 * @param string $section - section name.
	 * @param string $deprecated_default - default option value.
	 *
	 * @return bool|string
	 */
	// phpcs:ignore
	public static function get_option( $option, $section, $deprecated_default = '' ) {
		$options = get_option( $section );
		$result  = '';

		if ( isset( $options[ $option ] ) ) {
			$result = $options[ $option ];
		} else {
			// find default.
			$fields = self::get_settings_fields();

			if ( isset( $fields[ $section ] ) && is_array( $fields[ $section ] ) ) {
				foreach ( $fields[ $section ] as $field_data ) {
					if ( $option === $field_data['name'] && isset( $field_data['default'] ) ) {
						$result = $field_data['default'];
					}
				}
			}
		}

		return 'off' === $result ? false : ( 'on' === $result ? true : $result );
	}

	/**
	 * Update Option Value
	 *
	 * @param string $option - option name.
	 * @param string $section - section name.
	 * @param string $value - new option value.
	 */
	public static function update_option( $option, $section, $value ) {
		$options = get_option( $section );

		if ( ! is_array( $options ) ) {
			$options = array();
		}

		$options[ $option ] = $value;

		update_option( $section, $options );
	}

	/**
	 * Init actions
	 */
	public static function init_actions() {
		self::$settings_api = new Visual_Portfolio_Settings_API();

		add_action( 'admin_init', array( __CLASS__, 'admin_init' ) );
		add_action( 'admin_menu', array( __CLASS__, 'admin_menu' ), 11 );

		add_action( 'admin_enqueue_scripts', array( __CLASS__, 'admin_enqueue_scripts' ) );
		add_action( 'wp_ajax_vp_get_pages_list', array( __CLASS__, 'get_posts_ajax_callback' ) );
	}

	/**
	 * Initialize the settings
	 *
	 * @return void
	 */
	public static function admin_init() {
		self::redirect_if_toggle_unregistered_portfolio_post_type();
		// set the settings.
		self::$settings_api->set_sections( self::get_settings_sections() );
		self::$settings_api->set_fields( self::get_settings_fields() );

		// initialize settings.
		self::$settings_api->admin_init();
	}

	/**
	 * Register the admin settings menu
	 *
	 * @return void
	 */
	public static function admin_menu() {
		remove_submenu_page( 'visual-portfolio-settings', 'visual-portfolio-settings' );
		add_submenu_page(
			Visual_Portfolio_Custom_Post_Type::get_menu_slug(),
			esc_html__( 'Settings', 'visual-portfolio' ),
			esc_html__( 'Settings', 'visual-portfolio' ),
			'manage_options',
			'visual-portfolio-settings',
			array( __CLASS__, 'print_settings_page' )
		);
	}

	/**
	 * Redirect to actual admin page if unregistered portfolio post type.
	 *
	 * @return void
	 */
	public static function redirect_if_toggle_unregistered_portfolio_post_type() {
		global $pagenow;
		$register_portfolio_post_type = Visual_Portfolio_Custom_Post_Type::portfolio_post_type_is_registered();
        // phpcs:disable WordPress.Security.NonceVerification.Recommended
		if (
			$register_portfolio_post_type &&
			'admin.php' === $pagenow &&
			isset( $_GET['page'] ) &&
			'visual-portfolio-settings' === $_GET['page']
		) {
			wp_safe_redirect( admin_url( '/edit.php?post_type=portfolio&page=visual-portfolio-settings' ) );
			exit;
		}

		if (
			! $register_portfolio_post_type &&
			'edit.php' === $pagenow &&
			isset( $_GET['page'] ) &&
			'visual-portfolio-settings' === $_GET['page'] &&
			isset( $_GET['post_type'] ) &&
			'portfolio' === $_GET['post_type']
		) {
			wp_safe_redirect( admin_url( '/admin.php?page=visual-portfolio-settings' ) );
			exit;
		}
        // phpcs:enable WordPress.Security.NonceVerification.Recommended
	}

	/**
	 * Enqueue archive select2 ajax script.
	 *
	 * @param  string $page - Current admin page.
	 * @return void
	 */
	public static function admin_enqueue_scripts( $page ) {
		if ( 'portfolio_page_visual-portfolio-settings' === $page || 'toplevel_page_visual-portfolio-settings' === $page ) {
			$data_init = array(
				'nonce' => wp_create_nonce( 'vp-ajax-nonce' ),
			);

			Visual_Portfolio_Assets::enqueue_script( 'visual-portfolio-archive-page-selector', 'build/assets/admin/js/archive-page-selector', array( 'select2' ) );

			wp_localize_script( 'visual-portfolio-archive-page-selector', 'VPAdminVariables', $data_init );

		}
	}

	/**
	 * Plugin settings sections
	 *
	 * @return array
	 */
	public static function get_settings_sections() {
		$sections = array(
			array(
				'id'    => 'vp_general',
				'title' => esc_html__( 'General', 'visual-portfolio' ),
				'icon'  => '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>',
			),
			array(
				'id'    => 'vp_images',
				'title' => esc_html__( 'Images', 'visual-portfolio' ),
				'icon'  => '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>',
			),
			array(
				'id'    => 'vp_popup_gallery',
				'title' => esc_html__( 'Popup & Lightbox', 'visual-portfolio' ),
				'icon'  => '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>',
			),
			array(
				'id'    => 'vp_watermarks',
				'title' => esc_html__( 'Watermarks', 'visual-portfolio' ),
				'icon'  => '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>',
			),
			array(
				'id'    => 'vp_social_integrations',
				'title' => esc_html__( 'Social Feeds', 'visual-portfolio' ),
				'icon'  => '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" /></svg>',
			),
			array(
				'id'    => 'vp_white_label',
				'title' => esc_html__( 'White Label', 'visual-portfolio' ),
				'icon'  => '<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" /></svg>',
			),
		);

		return apply_filters( 'vpf_settings_sections', $sections );
	}

	/**
	 * Returns all the settings fields
	 *
	 * @return array settings fields
	 */
	public static function get_settings_fields() {
		if ( ! empty( self::$cached_settings_fields ) ) {
			return self::$cached_settings_fields;
		}

		$default_breakpoints = Visual_Portfolio_Breakpoints::get_default_breakpoints();
		$go_pro_links        = array(
			'watermarks'  => Visual_Portfolio_Admin::get_plugin_site_url(
				array(
					'utm_medium'   => 'settings_page',
					'utm_campaign' => 'watermarks',
				)
			),
			'social'      => Visual_Portfolio_Admin::get_plugin_site_url(
				array(
					'utm_medium'   => 'settings_page',
					'utm_campaign' => 'social_feeds',
				)
			),
			'white_label' => Visual_Portfolio_Admin::get_plugin_site_url(
				array(
					'utm_medium'   => 'settings_page',
					'utm_campaign' => 'white_label',
				)
			),
		);

		$settings_fields = array(
			'vp_general' => array(
				array(
					'name'      => 'register_portfolio_post_type',
					'label'     => esc_html__( 'Register Portfolio Post Type', 'visual-portfolio' ),
					'desc'      => esc_html__( 'Add custom post type `portfolio` to showcase your works.', 'visual-portfolio' ),
					'type'      => 'toggle',
					'default'   => 'on',
				),
				array(
					'name'              => 'portfolio_archive_page',
					'label'             => esc_html__( 'Archive Page', 'visual-portfolio' ),
					'desc'              => esc_html__( 'Base page of your portfolio, where will be placed your works archive.', 'visual-portfolio' ),
					'type'              => 'select',
					'options'           => self::get_pages_list(),
					'sanitize_callback' => array( 'Visual_Portfolio_Archive_Mapping', 'save_archive_page_option' ),
					'condition'         => array(
						array(
							'control' => '[type="checkbox"][name="vp_general[register_portfolio_post_type]"]',
						),
					),
				),
				array(
					'name'        => 'archive_page_items_per_page',
					'label'       => esc_html__( 'Archive Page Items Per Page', 'visual-portfolio' ),
					'type'        => 'number',
					'min'         => -1,
					'max'         => 9999,
					'default'     => 6,
					'condition'   => array(
						array(
							'control' => '[type="checkbox"][name="vp_general[register_portfolio_post_type]"]',
						),
					),
				),
				array(
					'name'      => 'filter_taxonomies',
					'label'     => esc_html__( 'Filter Taxonomies', 'visual-portfolio' ),
					'desc'      => esc_html__( 'You can show custom taxonomies in the portfolio Filter. Enter some taxonomies by "," separating values. Example: "product_cat,product_tag"', 'visual-portfolio' ),
					'type'      => 'text',
					'default'   => '',
				),
				array(
					'name'    => 'no_image',
					'label'   => esc_html__( 'Placeholder Image', 'visual-portfolio' ),
					'desc'    => esc_html__( 'This image used on items in layouts where image is not specified.', 'visual-portfolio' ),
					'type'    => 'image',
					'default' => '',
					'options' => array(
						'button_label' => esc_html__( 'Choose image', 'visual-portfolio' ),
					),
				),

				// AJAX Caching and Preloading.
				array(
					'name'    => 'ajax_caching',
					'label'   => esc_html__( 'AJAX Cache and Preload', 'visual-portfolio' ),
					'desc'    => esc_html__( 'Reduce AJAX calls request time.', 'visual-portfolio' ),
					'type'    => 'toggle',
					'default' => class_exists( 'Visual_Portfolio_Pro' ) ? 'on' : 'off',
					'is_pro'  => true,
				),

				// Breakpoints.
				array(
					'name'   => 'breakpoints_title',
					'label'  => esc_html__( 'Responsive Breakpoints', 'visual-portfolio' ),
					'type'   => 'section_title',
					'is_pro' => true,
				),
				array(
					'name'        => 'breakpoint_xl',
					'label'       => esc_html__( 'Extra Large', 'visual-portfolio' ),
					'type'        => 'number',
					'min'         => (float) $default_breakpoints['lg'] + 1,
					'max'         => 3840,
					'placeholder' => (string) $default_breakpoints['xl'],
					'default'     => (float) $default_breakpoints['xl'],
					// translators: %1$s - default breakpoint.
					'desc'        => sprintf( esc_html__( 'Sets the breakpoint on extra large screen sizes (Default: %1$spx).', 'visual-portfolio' ), $default_breakpoints['xl'] ),
					'is_pro'      => true,
				),
				array(
					'name'        => 'breakpoint_lg',
					'label'       => esc_html__( 'Large', 'visual-portfolio' ),
					'type'        => 'number',
					'min'         => (float) $default_breakpoints['md'] + 1,
					'max'         => (float) $default_breakpoints['xl'] - 1,
					'placeholder' => (string) $default_breakpoints['lg'],
					'default'     => (float) $default_breakpoints['lg'],
					// translators: %1$s - default breakpoint.
					'desc'        => sprintf( esc_html__( 'Sets the breakpoint on large screen sizes (Default: %1$spx).', 'visual-portfolio' ), $default_breakpoints['lg'] ),
					'is_pro'      => true,
				),
				array(
					'name'        => 'breakpoint_md',
					'label'       => esc_html__( 'Medium', 'visual-portfolio' ),
					'type'        => 'number',
					'min'         => (float) $default_breakpoints['sm'] + 1,
					'max'         => (float) $default_breakpoints['lg'] - 1,
					'placeholder' => (string) $default_breakpoints['md'],
					'default'     => (float) $default_breakpoints['md'],
					// translators: %1$s - default breakpoint.
					'desc'        => sprintf( esc_html__( 'Sets the breakpoint on medium screen sizes (Default: %1$spx).', 'visual-portfolio' ), $default_breakpoints['md'] ),
					'is_pro'      => true,
				),
				array(
					'name'        => 'breakpoint_sm',
					'label'       => esc_html__( 'Small', 'visual-portfolio' ),
					'type'        => 'number',
					'min'         => (float) $default_breakpoints['xs'] + 1,
					'max'         => (float) $default_breakpoints['md'] - 1,
					'placeholder' => (string) $default_breakpoints['sm'],
					'default'     => (float) $default_breakpoints['sm'],
					// translators: %1$s - default breakpoint.
					'desc'        => sprintf( esc_html__( 'Sets the breakpoint on small screen sizes (Default: %1$spx).', 'visual-portfolio' ), $default_breakpoints['sm'] ),
					'is_pro'      => true,
				),
				array(
					'name'        => 'breakpoint_xs',
					'label'       => esc_html__( 'Extra Small', 'visual-portfolio' ),
					'type'        => 'number',
					'min'         => 1,
					'max'         => (float) $default_breakpoints['sm'] - 1,
					'placeholder' => (string) $default_breakpoints['xs'],
					'default'     => (float) $default_breakpoints['xs'],
					// translators: %1$s - default breakpoint.
					'desc'        => sprintf( esc_html__( 'Sets the breakpoint on extra small screen sizes (Default: %1$spx).', 'visual-portfolio' ), $default_breakpoints['xs'] ),
					'is_pro'      => true,
				),
			),
			'vp_images' => array(
				array(
					'name'    => 'lazy_loading',
					'label'   => esc_html__( 'Lazy Loading', 'visual-portfolio' ),
					// translators: %s - plugin brand name.
					'desc'    => sprintf( esc_html__( 'Enable lazy loading for %s layouts only or for the whole website.', 'visual-portfolio' ), visual_portfolio()->plugin_name ),
					'type'    => 'select',
					'default' => 'vp',
					'options' => array(
						''     => esc_html__( 'Disabled', 'visual-portfolio' ),
						// translators: %s - plugin brand name.
						'vp'   => sprintf( esc_html__( '%s Only', 'visual-portfolio' ), visual_portfolio()->plugin_name ),
						'full' => esc_html__( 'All images', 'visual-portfolio' ),
					),
				),
				array(
					'name'        => 'lazy_loading_excludes',
					'label'       => esc_html__( 'Lazy Loading Excludes', 'visual-portfolio' ),
					// translators: %s - doc url.
					// translators: %s - link text.
					'desc'        => sprintf( __( 'Listed images will not be lazy loaded. Both full URLs and partial strings can be used. One per line. <a href="%1$s">%2$s</a>', 'visual-portfolio' ), 'https://visualportfolio.co/docs/settings/images/', esc_html__( 'More info', 'visual-portfolio' ) ),
					'type'        => 'textarea',
					'placeholder' => "image-example.webp\nslider-image-classname",
					'condition'   => array(
						array(
							'control'  => '[name="vp_images[lazy_loading]"]',
						),
					),
				),

				array(
					'name'    => 'images_layouts_title',
					'label'   => esc_html__( 'Layouts Image Sizes', 'visual-portfolio' ),
					'desc'    => __( 'Image sizes used in portfolio layouts.', 'visual-portfolio' ),
					'type'    => 'section_title',
				),
				array(
					'name'        => 'sm',
					'label'       => esc_html__( 'Small', 'visual-portfolio' ),
					'type'        => 'number',
					'placeholder' => '500',
					'default'     => 500,
				),
				array(
					'name'        => 'md',
					'label'       => esc_html__( 'Medium', 'visual-portfolio' ),
					'type'        => 'number',
					'placeholder' => '800',
					'default'     => 800,
				),
				array(
					'name'        => 'lg',
					'label'       => esc_html__( 'Large', 'visual-portfolio' ),
					'type'        => 'number',
					'placeholder' => '1280',
					'default'     => 1280,
				),
				array(
					'name'        => 'xl',
					'label'       => esc_html__( 'Extra Large', 'visual-portfolio' ),
					'type'        => 'number',
					'placeholder' => '1920',
					'default'     => 1920,
				),
				array(
					'name'    => 'images_popup_title',
					'label'   => esc_html__( 'Lightbox Image Sizes', 'visual-portfolio' ),
					'desc'    => __( 'Image sizes used in lightbox images.', 'visual-portfolio' ),
					'type'    => 'section_title',
				),
				array(
					'name'        => 'sm_popup',
					'label'       => esc_html__( 'Small', 'visual-portfolio' ),
					'type'        => 'number',
					'placeholder' => '500',
					'default'     => 500,
				),
				array(
					'name'        => 'md_popup',
					'label'       => esc_html__( 'Medium', 'visual-portfolio' ),
					'type'        => 'number',
					'placeholder' => '800',
					'default'     => 800,
				),
				array(
					'name'        => 'xl_popup',
					'label'       => esc_html__( 'Large', 'visual-portfolio' ),
					'type'        => 'number',
					'placeholder' => '1920',
					'default'     => 1920,
				),
				array(
					'name'    => 'images_sizes_note',
					// translators: %s: regenerate thumbnails url.
					'desc'    => sprintf( __( 'After publishing your changes, new image sizes may not be shown until you <a href="%s" target="_blank">Regenerate Thumbnails</a>.', 'visual-portfolio' ), 'https://wordpress.org/plugins/regenerate-thumbnails/' ),
					'type'    => 'html',
				),
			),
			'vp_popup_gallery' => array(
				// Vendor.
				array(
					'name'    => 'vendor',
					'label'   => esc_html__( 'Vendor Script', 'visual-portfolio' ),
					'type'    => 'select',
					'options' => array(
						'fancybox'   => esc_html__( 'Fancybox', 'visual-portfolio' ),
						'photoswipe' => esc_html__( 'PhotoSwipe', 'visual-portfolio' ),
					),
					'default' => 'fancybox',
				),

				// Default WordPress Images.
				array(
					'name'    => 'enable_on_wordpress_images',
					'label'   => esc_html__( 'Lightbox for WordPress Images', 'visual-portfolio' ),
					'desc'    => esc_html__( 'Enable lightbox for WordPress native galleries and images.', 'visual-portfolio' ),
					'type'    => 'toggle',
					'default' => 'off',
				),

				// Section divider.
				array(
					'name'   => 'popup_general_divider_title',
					'type'   => 'section_title',
				),

				// Deeplinking.
				array(
					'name'    => 'deep_linking',
					'label'   => esc_html__( 'Deep Linking', 'visual-portfolio' ),
					'desc'    => esc_html__( 'Makes URL automatically change to reflect the current opened popup, and you can easily link directly to that image or video.', 'visual-portfolio' ),
					'type'    => 'toggle',
					'default' => class_exists( 'Visual_Portfolio_Pro' ) ? 'on' : 'off',
					'is_pro'  => true,
				),
				array(
					'name'    => 'deep_linking_url_to_share_images',
					'label'   => esc_html__( 'Use Deep Linking URL to Share Images', 'visual-portfolio' ),
					'desc'    => esc_html__( 'Check to share Deep Linking URLs when sharing images. When disabled, all galleries will share direct links to image files.', 'visual-portfolio' ),
					'type'    => 'toggle',
					'default' => class_exists( 'Visual_Portfolio_Pro' ) ? 'on' : 'off',
					'is_pro'  => true,
				),

				// Loop.
				array(
					'name'    => 'loop',
					'label'   => esc_html__( 'Loop', 'visual-portfolio' ),
					'type'    => 'toggle',
					'default' => 'on',
					'is_pro'  => true,
				),

				// Click to Zoom.
				array(
					'name'    => 'click_to_zoom',
					'label'   => esc_html__( 'Click to Zoom', 'visual-portfolio' ),
					'type'    => 'toggle',
					'default' => 'on',
				),

				// Restore Focus.
				array(
					'name'    => 'restore_focus',
					'label'   => esc_html__( 'Restore Focus', 'visual-portfolio' ),
					'desc'    => esc_html__( 'Restore focus on the last active item after Popup is closed.', 'visual-portfolio' ),
					'type'    => 'toggle',
					'default' => 'on',
				),

				// UI Elements.
				array(
					'name'  => 'popup_ui_elements_title',
					'label' => esc_html__( 'UI Elements', 'visual-portfolio' ),
					'type'  => 'section_title',
				),
				array(
					'name'    => 'show_arrows',
					'label'   => esc_html__( 'Display Arrows', 'visual-portfolio' ),
					'desc'    => esc_html__( 'Arrows to navigate between images.', 'visual-portfolio' ),
					'type'    => 'toggle',
					'default' => 'on',
				),
				array(
					'name'    => 'show_counter',
					'label'   => esc_html__( 'Display Images Counter', 'visual-portfolio' ),
					'desc'    => esc_html__( 'On the top left corner will be showed images counter.', 'visual-portfolio' ),
					'type'    => 'toggle',
					'default' => 'on',
				),
				array(
					'name'    => 'show_zoom_button',
					'label'   => esc_html__( 'Display Zoom Button', 'visual-portfolio' ),
					'type'    => 'toggle',
					'default' => 'on',
				),
				array(
					'name'    => 'show_fullscreen_button',
					'label'   => esc_html__( 'Display Fullscreen Button', 'visual-portfolio' ),
					'type'    => 'toggle',
					'default' => 'on',
				),
				array(
					'name'    => 'show_share_button',
					'label'   => esc_html__( 'Display Share Button', 'visual-portfolio' ),
					'type'    => 'toggle',
					'default' => 'on',
				),
				array(
					'name'    => 'show_close_button',
					'label'   => esc_html__( 'Display Close Button', 'visual-portfolio' ),
					'type'    => 'toggle',
					'default' => 'on',
				),

				// Fancybox Popup Settings.
				array(
					'name'      => 'show_thumbs',
					'label'     => esc_html__( 'Display Thumbnails', 'visual-portfolio' ),
					'type'      => 'toggle',
					'default'   => 'on',
					'condition' => array(
						array(
							'control'  => '[name="vp_popup_gallery[vendor]"]',
							'operator' => '===',
							'value'    => 'fancybox',
						),
					),
				),
				array(
					'name'      => 'thumbs_auto_start',
					'label'     => esc_html__( 'Thumbnails Opened At Startup', 'visual-portfolio' ),
					'type'      => 'toggle',
					'default'   => 'off',
					'is_pro'    => true,
					'condition' => array(
						array(
							'control' => '[type="checkbox"][name="vp_popup_gallery[show_thumbs]"]',
						),
						array(
							'control'  => '[name="vp_popup_gallery[vendor]"]',
							'operator' => '===',
							'value'    => 'fancybox',
						),
					),
				),
				array(
					'name'      => 'thumbs_position',
					'label'     => esc_html__( 'Thumbnails Position', 'visual-portfolio' ),
					'type'      => 'select',
					'default'   => 'vertical',
					'options'   => array(
						'vertical'   => esc_html__( 'Vertical', 'visual-portfolio' ),
						'horizontal' => esc_html__( 'Horizontal', 'visual-portfolio' ),
					),
					'is_pro'    => true,
					'condition' => array(
						array(
							'control' => '[type="checkbox"][name="vp_popup_gallery[show_thumbs]"]',
						),
						array(
							'control'  => '[name="vp_popup_gallery[vendor]"]',
							'operator' => '===',
							'value'    => 'fancybox',
						),
					),
				),
				array(
					'name'      => 'show_download_button',
					'label'     => esc_html__( 'Display Download Button', 'visual-portfolio' ),
					'type'      => 'toggle',
					'default'   => 'off',
					'condition' => array(
						array(
							'control'  => '[name="vp_popup_gallery[vendor]"]',
							'operator' => '===',
							'value'    => 'fancybox',
						),
					),
				),
				array(
					'name'      => 'show_slideshow',
					'label'     => esc_html__( 'Display Slideshow', 'visual-portfolio' ),
					'type'      => 'toggle',
					'default'   => 'off',
					'condition' => array(
						array(
							'control'  => '[name="vp_popup_gallery[vendor]"]',
							'operator' => '===',
							'value'    => 'fancybox',
						),
					),
				),

				// Quick View settings.
				array(
					'name'  => 'popup_quick_view_title',
					'label' => esc_html__( 'Quick View', 'visual-portfolio' ),
					'type'  => 'section_title',
				),
				array(
					'name'    => 'popup_quick_view_show_url_button',
					'label'   => esc_html__( 'Display URL Button', 'visual-portfolio' ),
					'desc'    => esc_html__( 'Button with page URL will be placed in the popup toolbar.', 'visual-portfolio' ),
					'type'    => 'toggle',
					'default' => 'on',
					'is_pro'  => true,
				),
				array(
					'name'      => 'popup_quick_view_internal_links_target',
					'label'     => esc_html__( 'Internal Links', 'visual-portfolio' ),
					'type'      => 'select',
					'default'   => '_blank',
					'options'   => array(
						'_blank'        => esc_html__( 'Open in New Tab', 'visual-portfolio' ),
						'_top'          => esc_html__( 'Open in Current Tab', 'visual-portfolio' ),
						'_self'         => esc_html__( 'Open in Frame (not recommended)', 'visual-portfolio' ),
						'prevent-click' => esc_html__( 'Prevent Click', 'visual-portfolio' ),
					),
					'is_pro'    => true,
				),
				array(
					'name'      => 'popup_quick_view_external_links_target',
					'label'     => esc_html__( 'External Links', 'visual-portfolio' ),
					'type'      => 'select',
					'default'   => '_blank',
					'options'   => array(
						'_blank'        => esc_html__( 'Open in New Tab', 'visual-portfolio' ),
						'_top'          => esc_html__( 'Open in Current Tab', 'visual-portfolio' ),
						'_self'         => esc_html__( 'Open in Frame (not recommended)', 'visual-portfolio' ),
						'prevent-click' => esc_html__( 'Prevent Click', 'visual-portfolio' ),
					),
					'is_pro'    => true,
				),
				array(
					'name'    => 'pages_iframe_custom_css',
					'label'   => esc_html__( 'Custom CSS', 'visual-portfolio' ),
					'desc'    => esc_html__( 'When you display posts and pages in popup iframe, you may not need some page elements like header and footer. Hide it using custom CSS with classname `.vp-popup-iframe`.', 'visual-portfolio' ),
					'type'    => 'textarea',
					'default' => ! class_exists( 'Visual_Portfolio_Pro' ) ? '' : '
/* Hide header and footer in standard themes */
.vp-popup-iframe #site-header,
.vp-popup-iframe #masthead,
.vp-popup-iframe #site-footer,
.vp-popup-iframe #colophon {
    display: none;
}

/* Hide header and footer in Twenty Twenty-Two theme (Full Site Editing) */
.vp-popup-iframe .wp-site-blocks > header.wp-block-template-part,
.vp-popup-iframe .wp-site-blocks > footer.wp-block-template-part {
    display: none;
}',
					'is_pro'  => true,
				),

				// Misc settings.
				array(
					'name'  => 'popup_misc_title',
					'label' => esc_html__( 'Misc', 'visual-portfolio' ),
					'type'  => 'section_title',
				),
				array(
					'name'    => 'background_color',
					'label'   => esc_html__( 'Background Color', 'visual-portfolio' ),
					'type'    => 'color',
					'default' => '#1e1e1e',
				),
			),
			'vp_watermarks' => array(
				array(
					'name'    => 'pro_info',
					'desc'    => '
                        <div class="vpf-pro-note vpf-settings-info-pro">
                            <h3>' . esc_html__( 'Premium Only', 'visual-portfolio' ) . '</h3>
                            <div>
                                <p class="vpf-pro-note-description">' . esc_html__( 'Protect your works using watermarks', 'visual-portfolio' ) . '</p>
                                <a class="vpf-pro-note-button" target="_blank" rel="noopener noreferrer" href="' . esc_url( $go_pro_links['watermarks'] ) . '">' . esc_html__( 'Go Pro', 'visual-portfolio' ) . '</a>
                            </div>
                        </div>
                    ',
					'type'    => 'html',
				),
			),
			'vp_social_integrations' => array(
				array(
					'name'    => 'pro_info',
					'desc'    => '
                        <div class="vpf-pro-note vpf-settings-info-pro">
                            <h3>' . esc_html__( 'Premium Only', 'visual-portfolio' ) . '</h3>
                            <div>
                                <p class="vpf-pro-note-description">' . esc_html__( 'Social feeds such as Instagram, Youtube, Flickr, Twitter, etc...', 'visual-portfolio' ) . '</p>
                                <a class="vpf-pro-note-button" target="_blank" rel="noopener noreferrer" href="' . esc_url( $go_pro_links['social'] ) . '">' . esc_html__( 'Go Pro', 'visual-portfolio' ) . '</a>
                            </div>
                        </div>
                    ',
					'type'    => 'html',
				),
			),
			'vp_white_label' => array(
				array(
					'name'    => 'pro_info',
					'desc'    => '
                        <div class="vpf-pro-note">
                            <h3>' . esc_html__( 'Premium Only', 'visual-portfolio' ) . '</h3>
                            <div>
                                <p class="vpf-pro-note-description">' . esc_html__( 'Remove our plugin brand and logos from Front and Admin areas', 'visual-portfolio' ) . '</p>
                                <a class="vpf-pro-note-button" target="_blank" rel="noopener noreferrer" href="' . esc_url( $go_pro_links['white_label'] ) . '">' . esc_html__( 'Go Pro', 'visual-portfolio' ) . '</a>
                            </div>
                        </div>
                    ',
					'type'    => 'html',
				),
			),
		);

		self::$cached_settings_fields = apply_filters( 'vpf_settings_fields', $settings_fields );

		return self::$cached_settings_fields;
	}

	/**
	 * The plugin page handler
	 *
	 * @return void
	 */
	public static function print_settings_page() {
		self::$settings_api->admin_enqueue_scripts();

		echo '<div class="wrap">';
		echo '<h2>' . esc_html__( 'Settings', 'visual-portfolio' ) . '</h2>';

		self::$settings_api->show_navigation();
		self::$settings_api->show_forms();

		echo '</div>';

		?>
		<script>
			(function( $ ) {
				// Don't allow adding input number values that > then max attribute and < min attribute.
				$('form').on('input', '[type="number"]', function(e) {
					var current = parseFloat( this.value );
					var min = parseFloat(this.min);
					var max = parseFloat(this.max);

					if ('' !== this.value) {
						if (!Number.isNaN(min) && current < min) {
							this.value = min;
						}
						if (!Number.isNaN(max) && current > max) {
							this.value = max;
						}
					}
				});

				<?php if ( ! class_exists( 'Visual_Portfolio_Pro' ) ) : ?>
					// disable pro inputs.
					$('.vpf-settings-control-pro').find('input, textarea').attr('disabled', 'disabled');
				<?php endif; ?>
			})(jQuery);
		</script>
		<?php
	}

	/**
	 * Get Pages List.
	 *
	 * @return array
	 */
	public static function get_pages_list() {
		$options      = get_option( 'vp_general' );
		$archive_page = $options['portfolio_archive_page'] ?? false;
		$pages_list   = array(
			'' => esc_html__( '-- Select Page --', 'visual-portfolio' ),
		);
		if ( $archive_page ) {
			$archive_title               = get_post_field( 'post_title', $archive_page );
			$pages_list[ $archive_page ] = $archive_title;
		}
		return $pages_list;
	}

	/**
	 * Get Posts for Select2 archive page field by Ajax.
	 *
	 * @return void
	 */
	public static function get_posts_ajax_callback() {
		if ( isset( $_REQUEST['nonce'] ) && wp_verify_nonce( sanitize_key( $_REQUEST['nonce'] ), 'vp-ajax-nonce' ) ) {
			$return     = array();
			$query_opts = array(
				'post_status'            => 'publish',
				'ignore_sticky_posts'    => 1,
				'posts_per_page'         => 50,
				'post_type'              => 'page',
				'update_post_meta_cache' => false,
				'update_post_term_cache' => false,
			);

			if ( isset( $_GET['q'] ) && ! empty( $_GET['q'] ) ) {
				$query_opts['s'] = sanitize_text_field( wp_unslash( $_GET['q'] ) );
			}

			$search_results = new WP_Query( $query_opts );

			if ( $search_results->have_posts() ) {
				while ( $search_results->have_posts() ) {
					$search_results->the_post();
					$title    = ( mb_strlen( $search_results->post->post_title ) > 50 ) ? mb_substr( $search_results->post->post_title, 0, 49 ) . '...' : $search_results->post->post_title;
					$return[] = array( $search_results->post->ID, $title );
				}
			}

			echo wp_json_encode( $return );
		}

		die;
	}
}

new Visual_Portfolio_Settings();
