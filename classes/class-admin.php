<?php
/**
 * Admin
 *
 * @package visual-portfolio/admin
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Visual_Portfolio_Admin
 */
class Visual_Portfolio_Admin {
	/**
	 * Visual_Portfolio_Admin constructor.
	 */
	public function __construct() {
		add_action( 'admin_enqueue_scripts', array( $this, 'admin_enqueue_scripts' ) );
		add_action( 'enqueue_block_assets', array( $this, 'saved_layouts_editor_enqueue_scripts' ) );
		add_action( 'in_admin_header', array( $this, 'in_admin_header' ) );
		add_filter( 'admin_footer_text', array( $this, 'admin_footer_text' ) );

		// Pro link.
		add_filter( 'plugin_action_links_' . visual_portfolio()->plugin_basename, array( $this, 'add_go_pro_link_plugins_page' ) );
		add_action( 'admin_menu', array( $this, 'pro_admin_menu' ), 12 );
		add_action( 'admin_menu', array( $this, 'add_menu_if_portfolio_post_type_unregistered' ), 7 );

		// Add Pro links to menu.
		add_action( 'admin_menu', array( $this, 'add_go_pro_url' ), 100 );

		// register controls.
		add_action( 'init', array( $this, 'register_controls' ), 9 );
		add_filter( 'vpf_extend_layouts', array( $this, 'add_default_layouts' ), 9 );
		add_filter( 'vpf_extend_items_styles', array( $this, 'add_default_items_styles' ), 9 );

		// ajax actions.
		add_action( 'wp_ajax_vp_find_oembed', array( $this, 'ajax_find_oembed' ) );
	}

	/**
	 * Add hight level Portfolio admin menu if portfolio post type unregistered.
	 *
	 * @return void
	 */
	public function add_menu_if_portfolio_post_type_unregistered() {
		if ( ! Visual_Portfolio_Custom_Post_Type::portfolio_post_type_is_registered() ) {
			add_menu_page(
				visual_portfolio()->plugin_name,
				visual_portfolio()->plugin_name,
				'manage_options',
				'visual-portfolio-settings',
				array( 'Visual_Portfolio_Settings', 'print_settings_page' ),
				'dashicons-visual-portfolio',
				25
			);
		}
	}

	/**
	 * Enqueue styles and scripts
	 */
	public function admin_enqueue_scripts() {
		$data_init = array(
			'nonce' => wp_create_nonce( 'vp-ajax-nonce' ),
		);

		Visual_Portfolio_Assets::enqueue_script( 'visual-portfolio-admin', 'build/assets/admin/js/script' );
		wp_localize_script( 'visual-portfolio-admin', 'VPAdminVariables', $data_init );
		Visual_Portfolio_Assets::enqueue_style( 'visual-portfolio-admin', 'build/assets/admin/css/style' );
		wp_style_add_data( 'visual-portfolio-admin', 'rtl', 'replace' );
		wp_style_add_data( 'visual-portfolio-admin', 'suffix', '.min' );
	}

	/**
	 * Enqueue styles and scripts on saved layouts editor.
	 */
	public function saved_layouts_editor_enqueue_scripts() {
		if ( ! is_admin() ) {
			return;
		}

		if ( 'vp_lists' === get_post_type() ) {
			Visual_Portfolio_Assets::enqueue_script( 'visual-portfolio-saved-layouts', 'build/gutenberg/layouts-editor' );
			Visual_Portfolio_Assets::enqueue_style( 'visual-portfolio-saved-layouts', 'build/gutenberg/style-layouts-editor' );
			wp_style_add_data( 'visual-portfolio-saved-layouts', 'rtl', 'replace' );
			wp_style_add_data( 'visual-portfolio-saved-layouts', 'suffix', '.min' );

			$block_data = Visual_Portfolio_Get::get_options( array( 'id' => get_the_ID() ) );
			$data_init  = array(
				'nonce' => wp_create_nonce( 'vp-ajax-nonce' ),
			);

			wp_localize_script(
				'visual-portfolio-saved-layouts',
				'VPSavedLayoutVariables',
				array(
					'nonce' => $data_init['nonce'],
					'data'  => $block_data,
				)
			);
		}
	}

	/**
	 * Admin footer text.
	 *
	 * @param string $text The admin footer text.
	 *
	 * @return string
	 */
	public function admin_footer_text( $text ) {
		if ( ! function_exists( 'get_current_screen' ) ) {
			return $text;
		}

		$screen = get_current_screen();

		// Determine if the current page being viewed is "Visual Portfolio" related.
		if ( isset( $screen->post_type ) && ( 'portfolio' === $screen->post_type || 'vp_lists' === $screen->post_type || 'vp_proofing' === $screen->post_type ) ) {
			$footer_text = esc_attr__( 'and', 'visual-portfolio' ) . ' <a href="https://visualportfolio.co/" target="_blank">' . visual_portfolio()->plugin_name . '</a>';

			// Use RegExp to append "Visual Portfolio" after the <a> element allowing translations to read correctly.
			return preg_replace( '/(<a[\S\s]+?\/a>)/', '$1 ' . $footer_text, $text, 1 );
		}

		return $text;
	}

	/**
	 * Admin navigation.
	 */
	public function in_admin_header() {
		if ( ! function_exists( 'get_current_screen' ) ) {
			return;
		}

		$screen = get_current_screen();

		$is_settings = ( isset( $screen->post_type ) && isset( $screen->id ) && 'toplevel_page_visual-portfolio-settings' === $screen->id ) ? true : false;

		// Determine if the current page being viewed is "Lazy Blocks" related.
		if (
			! isset( $screen->post_type ) ||
			(
				'portfolio' !== $screen->post_type &&
				'vp_lists' !== $screen->post_type &&
				'vp_proofing' !== $screen->post_type &&
				! $is_settings
			) ||
			( isset( $screen->is_block_editor ) && $screen->is_block_editor() )
		) {
			return;
		}

		global $submenu, $submenu_file, $plugin_page;

		$parent_slug = Visual_Portfolio_Custom_Post_Type::get_menu_slug();
		$tabs        = array();

		// Generate array of navigation items.
		if ( isset( $submenu[ $parent_slug ] ) ) {
			foreach ( $submenu[ $parent_slug ] as $sub_item ) {

				// Check user can access page.
				if ( ! current_user_can( $sub_item[1] ) ) {
					continue;
				}

				// Ignore "Add New".
				if ( 'post-new.php?post_type=portfolio' === $sub_item[2] ) {
					continue;
				}

				// Define tab.
				$tab = array(
					'text' => $sub_item[0],
					'url'  => $sub_item[2],
				);

				// Convert submenu slug "test" to "$parent_slug&page=test".
				if ( ! strpos( $sub_item[2], '.php' ) && 0 !== strpos( $sub_item[2], 'https://' ) ) {
					$tab['url'] = add_query_arg( array( 'page' => $sub_item[2] ), $parent_slug );
				}

				// Fixed Settings tab url if Portfolio Post Type disabled.
				if ( 'visual-portfolio-settings' === $parent_slug && 'visual-portfolio-settings' === $sub_item[2] ) {
					$tab['url'] = 'admin.php?page=' . $parent_slug;
				}

				// Detect active state.
				if ( $submenu_file === $sub_item[2] || $plugin_page === $sub_item[2] ) {
					$tab['is_active'] = true;
				}

				$tabs[] = $tab;
			}
		}

		// Bail early if set to false.
		if ( false === $tabs ) {
			return;
		}

		?>
		<div class="vpf-admin-toolbar">
			<h2>
				<i class="dashicons-visual-portfolio"></i>
				<?php echo esc_html( visual_portfolio()->plugin_name ); ?>
			</h2>
			<?php
			foreach ( $tabs as $tab ) {
				printf(
					'<a class="vpf-admin-toolbar-tab%s" href="%s">%s</a>',
					! empty( $tab['is_active'] ) ? ' is-active' : '',
					esc_url( $tab['url'] ),
					wp_kses_post( $tab['text'] )
				);
			}
			?>
		</div>
		<?php
	}

	/**
	 * Add Go Pro link to plugins page.
	 *
	 * @param array $links - available links.
	 *
	 * @return array
	 */
	public function add_go_pro_link_plugins_page( $links ) {
		return array_merge(
			$links,
			array(
				'<a target="_blank" href="' . self::get_plugin_site_url( array( 'utm_medium' => 'plugins_list' ) ) . '">' . esc_html__( 'Go Pro', 'visual-portfolio' ) . '</a>',
			)
		);
	}

	/**
	 * Get URL to main site with UTM tags.
	 *
	 * @param array $args - Arguments of link.
	 * @return string
	 */
	public static function get_plugin_site_url( $args = array() ) {
		$args       = array_merge(
			array(
				'sub_path'     => 'pricing',
				'utm_source'   => 'plugin',
				'utm_medium'   => 'admin_menu',
				'utm_campaign' => 'go_pro',
				'utm_content'  => VISUAL_PORTFOLIO_VERSION,
			),
			$args
		);
		$url        = 'https://visualportfolio.co/';
		$first_flag = true;

		if ( isset( $args['sub_path'] ) && ! empty( $args['sub_path'] ) ) {
			$url .= $args['sub_path'] . '/';
		}

		foreach ( $args as $key => $value ) {
			if ( 'sub_path' !== $key && ! empty( $value ) ) {
				$url       .= ( $first_flag ? '?' : '&' );
				$url       .= $key . '=' . $value;
				$first_flag = false;
			}
		}

		return $url;
	}

	/**
	 * Register the admin settings menu Pro link.
	 *
	 * @return void
	 */
	public function pro_admin_menu() {
		add_submenu_page(
			Visual_Portfolio_Custom_Post_Type::get_menu_slug(),
			'',
			'<span class="dashicons dashicons-star-filled" style="font-size: 17px"></span> ' . esc_html__( 'Go Pro', 'visual-portfolio' ),
			'manage_options',
			'visual_portfolio_go_pro'
		);
	}

	/**
	 * Add go pro links to admin menu.
	 *
	 * @return void
	 */
	public function add_go_pro_url() {
		global $submenu;
		$menu_slug = Visual_Portfolio_Custom_Post_Type::get_menu_slug();

		if ( ! isset( $submenu[ $menu_slug ] ) ) {
			return;
		}

		$plugin_submenu = &$submenu[ $menu_slug ];

		if ( is_array( $plugin_submenu ) && ! empty( $plugin_submenu ) ) {
			foreach ( $plugin_submenu as $key => $submenu_item ) {
				if ( 'visual_portfolio_go_pro' === $submenu_item[2] ) {
					$plugin_submenu[ $key ][2] = self::get_plugin_site_url( array( 'utm_medium' => 'admin_menu' ) );
				}
			}
		}
	}

	/**
	 * Add default layouts.
	 *
	 * @param array $layouts - layouts array.
	 *
	 * @return array
	 */
	public function add_default_layouts( $layouts ) {
		return array_merge(
			array(
				// Tiles.
				'tiles' => array(
					'title'    => esc_html__( 'Tiles', 'visual-portfolio' ),
					'icon'     => '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="0.75" y="0.75" width="7.35714" height="7.35714" rx="1.25" stroke="currentColor" stroke-width="1.5" fill="transparent"/><rect x="11.8929" y="0.75" width="7.35714" height="7.35714" rx="1.25" stroke="currentColor" stroke-width="1.5" fill="transparent"/><rect x="11.8929" y="11.8929" width="7.35714" height="7.35714" rx="1.25" stroke="currentColor" stroke-width="1.5" fill="transparent"/><rect x="0.75" y="11.8929" width="7.35714" height="7.35714" rx="1.25" stroke="currentColor" stroke-width="1.5" fill="transparent"/></svg>',
					'controls' => array(
						/**
						 * Tile type:
						 * first parameter - is columns number
						 * the next is item sizes
						 *
						 * Example:
						 * 3|1,0.5|2,0.25|
						 *    3 columns in row
						 *    First item 100% width and 50% height
						 *    Second item 200% width and 25% height
						 */
						array(
							'type'          => 'tiles_selector',
							'label'         => esc_html__( 'Tiles Preview', 'visual-portfolio' ),
							'name'          => 'type',
							'default'       => '3|1,1|',
							'reload_iframe' => false,
							'options'       => array_merge(
								array(
									array(
										'value' => '1|1,0.5|',
									),
									array(
										'value' => '2|1,1|',
									),
									array(
										'value' => '2|1,0.8|',
									),
									array(
										'value' => '2|1,1.34|',
									),
									array(
										'value' => '2|1,1.2|1,1.2|1,0.67|1,0.67|',
									),
									array(
										'value' => '2|1,1.2|1,0.67|1,1.2|1,0.67|',
									),
									array(
										'value' => '2|1,0.67|1,1|1,1|1,1|1,1|1,0.67|',
									),
									array(
										'value' => '3|1,1|',
									),
									array(
										'value' => '3|1,0.8|',
									),
									array(
										'value' => '3|1,1.3|',
									),
									array(
										'value' => '3|1,1|1,1|1,1|1,1.3|1,1.3|1,1.3|',
									),
									array(
										'value' => '3|1,1|1,1|1,2|1,1|1,1|1,1|1,1|1,1|',
									),
									array(
										'value' => '3|1,2|1,1|1,1|1,1|1,1|1,1|1,1|1,1|',
									),
									array(
										'value' => '3|1,1|1,2|1,1|1,1|1,1|1,1|1,1|1,1|',
									),
									array(
										'value' => '3|1,1|1,2|1,1|1,1|1,1|1,1|2,0.5|',
									),
									array(
										'value' => '3|1,0.8|1,1.6|1,0.8|1,0.8|1,1.6|1,0.8|1,0.8|1,0.8|1,0.8|1,0.8|',
									),
									array(
										'value' => '3|1,0.8|1,1.6|1,0.8|1,0.8|1,1.6|1,1.6|1,0.8|1,0.8|1,0.8|',
									),
									array(
										'value' => '3|1,0.8|1,0.8|1,1.6|1,0.8|1,0.8|1,1.6|1,1.6|1,0.8|1,0.8|',
									),
									array(
										'value' => '3|1,0.8|1,0.8|1,1.6|1,0.8|1,0.8|1,0.8|1,1.6|1,1.6|1,0.8|',
									),
									array(
										'value' => '3|1,1|2,1|1,1|2,0.5|1,1|',
									),
									array(
										'value' => '3|1,1|2,1|1,1|1,1|1,1|1,1|2,0.5|1,1|',
									),
									array(
										'value' => '3|1,2|2,0.5|1,1|1,2|2,0.5|',
									),
									array(
										'value' => '4|1,1|',
									),
									array(
										'value' => '4|1,1|1,1.34|1,1|1,1.34|1,1.34|1,1.34|1,1|1,1|',
									),
									array(
										'value' => '4|1,0.8|1,1|1,0.8|1,1|1,1|1,1|1,0.8|1,0.8|',
									),
									array(
										'value' => '4|1,1|1,1|2,1|1,1|1,1|2,1|1,1|1,1|1,1|1,1|',
									),
									array(
										'value' => '4|2,1|2,0.5|2,0.5|2,0.5|2,1|2,0.5|',
									),
								),
                                // phpcs:ignore Squiz.PHP.CommentedOutCode.Found, Squiz.Commenting.BlockComment.NoEmptyLineBefore
								/*
								 * Example:
									array(
										array(
											'value' => '1|1,0.5|',
										),
										array(
											'value' => '2|1,1|',
										),
									)
								 */
								apply_filters( 'vpf_extend_tiles', array() )
							),
						),
					),
				),

				// Masonry.
				'masonry' => array(
					'title'    => esc_html__( 'Masonry', 'visual-portfolio' ),
					'icon'     => '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="0.75" y="0.75" width="7.35714" height="5.35714" rx="1.25" stroke="currentColor" stroke-width="1.5" fill="transparent"/><rect x="11.8929" y="13.8928" width="7.35714" height="5.35715" rx="1.25" stroke="currentColor" stroke-width="1.5" fill="transparent"/><rect x="11.8929" y="0.75" width="7.35714" height="9.35714" rx="1.25" stroke="currentColor" stroke-width="1.5" fill="transparent"/><rect x="0.75" y="9.89285" width="7.35714" height="9.35715" rx="1.25" stroke="currentColor" stroke-width="1.5" fill="transparent"/></svg>',
					'controls' => array(
						array(
							'type'          => 'number',
							'label'         => esc_html__( 'Columns', 'visual-portfolio' ),
							'name'          => 'columns',
							'min'           => 1,
							'max'           => 5,
							'default'       => 3,
							'reload_iframe' => false,
						),
						array(
							'type'          => 'aspect_ratio',
							'label'         => esc_html__( 'Images Aspect Ratio', 'visual-portfolio' ),
							'name'          => 'images_aspect_ratio',
							'default'       => '',
							'reload_iframe' => false,
							'style'         => array(
								array(
									'element'  => '.vp-portfolio__item-wrap .vp-portfolio__item-img-wrap::before',
									'property' => 'padding-top',
								),
							),
						),
					),
				),

				// Grid.
				'grid' => array(
					'title'    => esc_html__( 'Grid', 'visual-portfolio' ),
					'icon'     => '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="0.75" y="0.75" width="7.35714" height="6.5" rx="1.25" stroke="currentColor" stroke-width="1.5" fill="transparent"/><rect x="11.8929" y="13.3214" width="7.35714" height="5.92857" rx="1.25" stroke="currentColor" stroke-width="1.5" fill="transparent"/><rect x="11.8929" y="0.75" width="7.35714" height="9.07143" rx="1.25" stroke="currentColor" stroke-width="1.5" fill="transparent"/><rect x="0.75" y="13.3214" width="7.35714" height="5.92857" rx="1.25" stroke="currentColor" stroke-width="1.5" fill="transparent"/></svg>',
					'controls' => array(
						array(
							'type'          => 'number',
							'label'         => esc_html__( 'Columns', 'visual-portfolio' ),
							'name'          => 'columns',
							'min'           => 1,
							'max'           => 5,
							'default'       => 3,
							'reload_iframe' => false,
						),
						array(
							'type'          => 'aspect_ratio',
							'label'         => esc_html__( 'Images Aspect Ratio', 'visual-portfolio' ),
							'name'          => 'images_aspect_ratio',
							'default'       => '',
							'reload_iframe' => false,
							'style'         => array(
								array(
									'element'  => '.vp-portfolio__item-wrap .vp-portfolio__item-img-wrap::before',
									'property' => 'padding-top',
								),
							),
						),
					),
				),

				// Justified.
				'justified' => array(
					'title'    => esc_html__( 'Justified', 'visual-portfolio' ),
					'icon'     => '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="0.75" y="19.25" width="7.35714" height="5.35714" rx="1.25" transform="rotate(-90 0.75 19.25)" stroke="currentColor" stroke-width="1.5" fill="transparent"/><rect x="13.8929" y="8.10715" width="7.35714" height="5.35714" rx="1.25" transform="rotate(-90 13.8929 8.10715)" stroke="currentColor" stroke-width="1.5" fill="transparent"/><rect x="0.75" y="8.10715" width="7.35714" height="9.35714" rx="1.25" transform="rotate(-90 0.75 8.10715)" stroke="currentColor" stroke-width="1.5" fill="transparent"/><rect x="9.89285" y="19.25" width="7.35714" height="9.35714" rx="1.25" transform="rotate(-90 9.89285 19.25)" stroke="currentColor" stroke-width="1.5" fill="transparent"/></svg>',
					'controls' => array(
						array(
							'type'          => 'range',
							'label'         => esc_html__( 'Row Height', 'visual-portfolio' ),
							'name'          => 'row_height',
							'group'         => 'justified_row_height',
							'min'           => 100,
							'max'           => 1000,
							'default'       => 200,
							'reload_iframe' => false,
						),
						array(
							'type'          => 'range',
							'label'         => esc_html__( 'Row Height Tolerance', 'visual-portfolio' ),
							'name'          => 'row_height_tolerance',
							'group'         => 'justified_row_height',
							'min'           => 0,
							'max'           => 1,
							'step'          => 0.05,
							'default'       => 0.25,
							'reload_iframe' => false,
						),
						array(
							'type'          => 'range',
							'label'         => esc_html__( 'Max Rows Count', 'visual-portfolio' ),
							'description'   => esc_html__( 'Limit the number of rows to display. 0 means - unlimited.', 'visual-portfolio' ),
							'name'          => 'max_rows_count',
							'min'           => 0,
							'max'           => 50,
							'step'          => 1,
							'default'       => 0,
							'reload_iframe' => false,
						),
						array(
							'type'          => 'select',
							'label'         => esc_html__( 'Last Row Align', 'visual-portfolio' ),
							'name'          => 'last_row',
							'default'       => 'left',
							'reload_iframe' => false,
							'options'       => array(
								'left'   => esc_html__( 'Left', 'visual-portfolio' ),
								'center' => esc_html__( 'Center', 'visual-portfolio' ),
								'right'  => esc_html__( 'Right', 'visual-portfolio' ),
								'hide'   => esc_html__( 'Hide', 'visual-portfolio' ),
							),
						),
					),
				),

				// Slider.
				'slider' => array(
					'title'    => esc_html__( 'Slider', 'visual-portfolio' ),
					'icon'     => '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4.25" y="14.8214" width="11.6429" height="11.5" rx="1.25" transform="rotate(-90 4.25 14.8214)" stroke="currentColor" stroke-width="1.5" fill="transparent"/><path d="M2 4.5V13.5" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><path d="M18 4.5V13.5" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><circle cx="8.5" cy="17.25" r="0.75" fill="currentColor"/><circle cx="11.5" cy="17.25" r="0.75" fill="currentColor"/></svg>',
					'controls' => array(
						array(
							'type'          => 'icons_selector',
							'label'         => esc_html__( 'Effect', 'visual-portfolio' ),
							'name'          => 'effect',
							'default'       => 'slide',
							'reload_iframe' => false,
							'options'       => array(
								'slide' => array(
									'value' => 'slide',
									'title' => esc_html__( 'Slide', 'visual-portfolio' ),
									'icon'  => '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><g clip-path="url(#clip0_4800_1632)"><rect x="0.75" y="1.75" width="11.5" height="16.5" rx="1.25" stroke="currentColor" stroke-width="1.5"/><rect x="14.75" y="1.75" width="12.5" height="16.5" rx="1.25" stroke="currentColor" stroke-width="1.5"/></g><defs><clipPath id="clip0_4800_1632"><rect width="20" height="20" fill="white"/></clipPath></defs></svg>',
								),
								'coverflow' => array(
									'value' => 'coverflow',
									'title' => esc_html__( 'Coverflow', 'visual-portfolio' ),
									'icon'  => '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="4.75" y="1.75" width="10.5" height="16.5" rx="1.25" stroke="currentColor" stroke-width="1.5"/><path d="M17.3 16.125L19.3 17V3L17.3 3.875" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/><path d="M2.7 16.125L0.699997 17V3L2.7 3.875" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>',
								),
								'fade' => array(
									'value' => 'fade',
									'title' => esc_html__( 'Fade', 'visual-portfolio' ),
									'icon'  => '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4.91702 10.75C4.69616 10.7505 4.48449 10.8384 4.32823 10.9945C4.17196 11.1506 4.08381 11.3622 4.08302 11.583C4.08302 12.042 4.45802 12.417 4.91702 12.417C5.13787 12.4162 5.34944 12.3281 5.50552 12.1718C5.66159 12.0155 5.74949 11.8039 5.75002 11.583C5.74923 11.3623 5.66121 11.1509 5.50517 10.9949C5.34912 10.8388 5.1377 10.7508 4.91702 10.75V10.75ZM4.91702 14.083C4.69599 14.0835 4.48417 14.1716 4.32788 14.3279C4.17159 14.4842 4.08355 14.696 4.08302 14.917C4.08302 15.375 4.45802 15.75 4.91702 15.75C5.1377 15.7492 5.34912 15.6612 5.50517 15.5052C5.66121 15.3491 5.74923 15.1377 5.75002 14.917C5.74949 14.6962 5.66159 14.4845 5.50552 14.3282C5.34944 14.172 5.13787 14.0838 4.91702 14.083V14.083ZM4.91702 7.41702C4.69616 7.41755 4.48449 7.50545 4.32823 7.66152C4.17196 7.8176 4.08381 8.02916 4.08302 8.25002C4.08302 8.70802 4.45802 9.08302 4.91702 9.08302C5.1377 9.08223 5.34912 8.99421 5.50517 8.83817C5.66121 8.68212 5.74923 8.4707 5.75002 8.25002C5.74923 8.02934 5.66121 7.81792 5.50517 7.66187C5.34912 7.50583 5.1377 7.41781 4.91702 7.41702V7.41702ZM2.41702 7.83302C2.36211 7.83249 2.30764 7.84291 2.25681 7.86367C2.20598 7.88444 2.15979 7.91514 2.12097 7.95396C2.08214 7.99279 2.05144 8.03898 2.03067 8.08981C2.00991 8.14064 1.99949 8.19511 2.00002 8.25002C2.00002 8.48302 2.18302 8.66702 2.41702 8.66702C2.47185 8.66742 2.5262 8.6569 2.57692 8.63607C2.62764 8.61525 2.6737 8.58453 2.71242 8.54571C2.75115 8.5069 2.78175 8.46076 2.80246 8.40999C2.82316 8.35923 2.83355 8.30484 2.83302 8.25002C2.83355 8.19519 2.82316 8.14081 2.80246 8.09004C2.78175 8.03928 2.75115 7.99314 2.71242 7.95432C2.6737 7.91551 2.62764 7.88479 2.57692 7.86397C2.5262 7.84314 2.47185 7.83262 2.41702 7.83302V7.83302ZM4.91702 4.08302C4.69599 4.08355 4.48417 4.17159 4.32788 4.32788C4.17159 4.48417 4.08355 4.69599 4.08302 4.91702C4.08302 5.37502 4.45802 5.75002 4.91702 5.75002C5.1377 5.74923 5.34912 5.66121 5.50517 5.50517C5.66121 5.34912 5.74923 5.1377 5.75002 4.91702C5.74949 4.69616 5.66159 4.48449 5.50552 4.32823C5.34944 4.17196 5.13787 4.08381 4.91702 4.08302V4.08302ZM17.417 8.66702C17.4718 8.66742 17.5262 8.6569 17.5769 8.63607C17.6276 8.61525 17.6737 8.58453 17.7124 8.54571C17.7511 8.5069 17.7818 8.46076 17.8025 8.40999C17.8232 8.35923 17.8336 8.30484 17.833 8.25002C17.8336 8.19519 17.8232 8.14081 17.8025 8.09004C17.7818 8.03928 17.7511 7.99314 17.7124 7.95432C17.6737 7.91551 17.6276 7.88479 17.5769 7.86397C17.5262 7.84314 17.4718 7.83262 17.417 7.83302C17.3621 7.83249 17.3076 7.84291 17.2568 7.86367C17.206 7.88444 17.1598 7.91514 17.121 7.95396C17.0821 7.99279 17.0514 8.03898 17.0307 8.08981C17.0099 8.14064 16.9995 8.19511 17 8.25002C17 8.48302 17.183 8.66702 17.417 8.66702ZM11.583 5.75002C11.8039 5.74949 12.0155 5.66159 12.1718 5.50552C12.3281 5.34944 12.4162 5.13787 12.417 4.91702C12.4165 4.69599 12.3285 4.48417 12.1722 4.32788C12.0159 4.17159 11.804 4.08355 11.583 4.08302C11.3622 4.08381 11.1506 4.17196 10.9945 4.32823C10.8384 4.48449 10.7505 4.69616 10.75 4.91702C10.75 5.37502 11.125 5.75002 11.583 5.75002ZM11.583 2.83302C11.6378 2.83355 11.6922 2.82316 11.743 2.80246C11.7938 2.78175 11.8399 2.75115 11.8787 2.71242C11.9175 2.6737 11.9482 2.62764 11.9691 2.57692C11.9899 2.5262 12.0004 2.47185 12 2.41702C12.0006 2.36211 11.9901 2.30764 11.9694 2.25681C11.9486 2.20598 11.9179 2.15979 11.8791 2.12097C11.8402 2.08214 11.7941 2.05144 11.7432 2.03067C11.6924 2.00991 11.6379 1.99949 11.583 2.00002C11.5282 1.99962 11.4738 2.01014 11.4231 2.03097C11.3724 2.05179 11.3263 2.08251 11.2876 2.12132C11.2489 2.16014 11.2183 2.20628 11.1976 2.25704C11.1769 2.30781 11.1665 2.36219 11.167 2.41702C11.167 2.65002 11.35 2.83302 11.583 2.83302ZM2.41702 11.167C2.36219 11.1665 2.30781 11.1769 2.25704 11.1976C2.20628 11.2183 2.16014 11.2489 2.12132 11.2876C2.08251 11.3263 2.05179 11.3724 2.03097 11.4231C2.01014 11.4738 1.99962 11.5282 2.00002 11.583C2.00002 11.817 2.18302 12 2.41702 12C2.47185 12.0004 2.5262 11.9899 2.57692 11.9691C2.62764 11.9482 2.6737 11.9175 2.71242 11.8787C2.75115 11.8399 2.78175 11.7938 2.80246 11.743C2.82316 11.6922 2.83355 11.6378 2.83302 11.583C2.83342 11.5283 2.82293 11.474 2.80217 11.4234C2.7814 11.3727 2.75077 11.3267 2.71207 11.288C2.67336 11.2493 2.62734 11.2186 2.57669 11.1979C2.52604 11.1771 2.47176 11.1666 2.41702 11.167V11.167ZM8.25002 17C8.19511 16.9995 8.14064 17.0099 8.08981 17.0307C8.03898 17.0514 7.99279 17.0821 7.95396 17.121C7.91514 17.1598 7.88444 17.206 7.86367 17.2568C7.84291 17.3076 7.83249 17.3621 7.83302 17.417C7.83302 17.65 8.01702 17.833 8.25002 17.833C8.30484 17.8336 8.35923 17.8232 8.40999 17.8025C8.46076 17.7818 8.5069 17.7511 8.54571 17.7124C8.58453 17.6737 8.61525 17.6276 8.63607 17.5769C8.6569 17.5262 8.66742 17.4718 8.66702 17.417C8.66755 17.3621 8.65713 17.3076 8.63637 17.2568C8.6156 17.206 8.5849 17.1598 8.54607 17.121C8.50725 17.0821 8.46106 17.0514 8.41023 17.0307C8.35939 17.0099 8.30493 16.9995 8.25002 17V17ZM8.25002 2.83302C8.30484 2.83355 8.35923 2.82316 8.40999 2.80246C8.46076 2.78175 8.5069 2.75115 8.54571 2.71242C8.58453 2.6737 8.61525 2.62764 8.63607 2.57692C8.6569 2.5262 8.66742 2.47185 8.66702 2.41702C8.66755 2.36211 8.65713 2.30764 8.63637 2.25681C8.6156 2.20598 8.5849 2.15979 8.54607 2.12097C8.50725 2.08214 8.46106 2.05144 8.41023 2.03067C8.35939 2.00991 8.30493 1.99949 8.25002 2.00002C8.19511 1.99949 8.14064 2.00991 8.08981 2.03067C8.03898 2.05144 7.99279 2.08214 7.95396 2.12097C7.91514 2.15979 7.88444 2.20598 7.86367 2.25681C7.84291 2.30764 7.83249 2.36211 7.83302 2.41702C7.83302 2.65002 8.01702 2.83302 8.25002 2.83302ZM8.25002 5.75002C8.4707 5.74923 8.68212 5.66121 8.83817 5.50517C8.99421 5.34912 9.08223 5.1377 9.08302 4.91702C9.08249 4.69616 8.99459 4.48449 8.83852 4.32823C8.68244 4.17196 8.47087 4.08381 8.25002 4.08302C8.02916 4.08381 7.8176 4.17196 7.66152 4.32823C7.50545 4.48449 7.41755 4.69616 7.41702 4.91702C7.41702 5.37502 7.79202 5.75002 8.25002 5.75002ZM8.25002 10.333C7.55802 10.333 7.00002 10.892 7.00002 11.583C7.00002 12.275 7.55802 12.833 8.25002 12.833C8.94202 12.833 9.50002 12.275 9.50002 11.583C9.50002 10.892 8.94202 10.333 8.25002 10.333ZM14.917 10.75C14.6962 10.7505 14.4845 10.8384 14.3282 10.9945C14.172 11.1506 14.0838 11.3622 14.083 11.583C14.083 12.042 14.458 12.417 14.917 12.417C15.1379 12.4162 15.3494 12.3281 15.5055 12.1718C15.6616 12.0155 15.7495 11.8039 15.75 11.583C15.7492 11.3623 15.6612 11.1509 15.5052 10.9949C15.3491 10.8388 15.1377 10.7508 14.917 10.75V10.75ZM14.917 14.083C14.696 14.0835 14.4842 14.1716 14.3279 14.3279C14.1716 14.4842 14.0835 14.696 14.083 14.917C14.083 15.375 14.458 15.75 14.917 15.75C15.1377 15.7492 15.3491 15.6612 15.5052 15.5052C15.6612 15.3491 15.7492 15.1377 15.75 14.917C15.7495 14.6962 15.6616 14.4845 15.5055 14.3282C15.3494 14.172 15.1379 14.0838 14.917 14.083ZM14.917 7.41702C14.6962 7.41755 14.4845 7.50545 14.3282 7.66152C14.172 7.8176 14.0838 8.02916 14.083 8.25002C14.083 8.70802 14.458 9.08302 14.917 9.08302C15.1377 9.08223 15.3491 8.99421 15.5052 8.83817C15.6612 8.68212 15.7492 8.4707 15.75 8.25002C15.7492 8.02934 15.6612 7.81792 15.5052 7.66187C15.3491 7.50583 15.1377 7.41781 14.917 7.41702V7.41702ZM14.917 4.08302C14.696 4.08355 14.4842 4.17159 14.3279 4.32788C14.1716 4.48417 14.0835 4.69599 14.083 4.91702C14.083 5.37502 14.458 5.75002 14.917 5.75002C15.1377 5.74923 15.3491 5.66121 15.5052 5.50517C15.6612 5.34912 15.7492 5.1377 15.75 4.91702C15.7495 4.69616 15.6616 4.48449 15.5055 4.32823C15.3494 4.17196 15.1379 4.08381 14.917 4.08302V4.08302ZM17.417 11.167C17.3622 11.1665 17.3078 11.1769 17.257 11.1976C17.2063 11.2183 17.1601 11.2489 17.1213 11.2876C17.0825 11.3263 17.0518 11.3724 17.031 11.4231C17.0101 11.4738 16.9996 11.5282 17 11.583C17 11.817 17.183 12 17.417 12C17.4718 12.0004 17.5262 11.9899 17.5769 11.9691C17.6276 11.9482 17.6737 11.9175 17.7124 11.8787C17.7511 11.8399 17.7818 11.7938 17.8025 11.743C17.8232 11.6922 17.8336 11.6378 17.833 11.583C17.8334 11.5283 17.8229 11.474 17.8022 11.4234C17.7814 11.3727 17.7508 11.3267 17.7121 11.288C17.6734 11.2493 17.6273 11.2186 17.5767 11.1979C17.526 11.1771 17.4718 11.1666 17.417 11.167V11.167ZM11.583 14.083C11.3622 14.0838 11.1506 14.172 10.9945 14.3282C10.8384 14.4845 10.7505 14.6962 10.75 14.917C10.75 15.375 11.125 15.75 11.583 15.75C11.8039 15.7495 12.0155 15.6616 12.1718 15.5055C12.3281 15.3494 12.4162 15.1379 12.417 14.917C12.4165 14.696 12.3285 14.4842 12.1722 14.3279C12.0159 14.1716 11.804 14.0835 11.583 14.083ZM11.583 17C11.5282 16.9996 11.4738 17.0101 11.4231 17.031C11.3724 17.0518 11.3263 17.0825 11.2876 17.1213C11.2489 17.1601 11.2183 17.2063 11.1976 17.257C11.1769 17.3078 11.1665 17.3622 11.167 17.417C11.167 17.65 11.35 17.833 11.583 17.833C11.6378 17.8336 11.6922 17.8232 11.743 17.8025C11.7938 17.7818 11.8399 17.7511 11.8787 17.7124C11.9175 17.6737 11.9482 17.6276 11.9691 17.5769C11.9899 17.5262 12.0004 17.4718 12 17.417C12.0006 17.3621 11.9901 17.3076 11.9694 17.2568C11.9486 17.206 11.9179 17.1598 11.8791 17.121C11.8402 17.0821 11.7941 17.0514 11.7432 17.0307C11.6924 17.0099 11.6379 16.9995 11.583 17V17ZM8.25002 7.00002C7.55802 7.00002 7.00002 7.55802 7.00002 8.25002C7.00002 8.94202 7.55802 9.50002 8.25002 9.50002C8.94202 9.50002 9.50002 8.94202 9.50002 8.25002C9.50002 7.55802 8.94202 7.00002 8.25002 7.00002ZM8.25002 14.083C8.02916 14.0838 7.8176 14.172 7.66152 14.3282C7.50545 14.4845 7.41755 14.6962 7.41702 14.917C7.41702 15.375 7.79202 15.75 8.25002 15.75C8.4707 15.7492 8.68212 15.6612 8.83817 15.5052C8.99421 15.3491 9.08223 15.1377 9.08302 14.917C9.08249 14.6962 8.99459 14.4845 8.83852 14.3282C8.68244 14.172 8.47087 14.0838 8.25002 14.083ZM11.583 10.333C10.892 10.333 10.333 10.892 10.333 11.583C10.333 12.275 10.892 12.833 11.583 12.833C12.275 12.833 12.833 12.275 12.833 11.583C12.833 10.892 12.275 10.333 11.583 10.333ZM11.583 7.00002C10.892 7.00002 10.333 7.55802 10.333 8.25002C10.333 8.94202 10.892 9.50002 11.583 9.50002C12.275 9.50002 12.833 8.94202 12.833 8.25002C12.833 7.55802 12.275 7.00002 11.583 7.00002V7.00002Z" fill="currentColor"/></svg>',
								),
							),
						),
						array(
							'type'          => 'range',
							'label'         => esc_html__( 'Speed (in Seconds)', 'visual-portfolio' ),
							'name'          => 'speed',
							'min'           => 0,
							'max'           => 5,
							'step'          => 0.1,
							'default'       => 0.3,
							'reload_iframe' => false,
						),
						array(
							'type'          => 'range',
							'label'         => esc_html__( 'Autoplay (in Seconds)', 'visual-portfolio' ),
							'name'          => 'autoplay',
							'min'           => 0,
							'max'           => 60,
							'step'          => 0.2,
							'default'       => 6,
							'reload_iframe' => false,
						),
						array(
							'type'          => 'checkbox',
							'alongside'     => esc_html__( 'Pause on Mouse Over', 'visual-portfolio' ),
							'name'          => 'autoplay_hover_pause',
							'default'       => false,
							'reload_iframe' => false,
							'condition'     => array(
								array(
									'control'  => 'autoplay',
									'operator' => '>',
									'value'    => 0,
								),
							),
						),
						array(
							'type'    => 'radio',
							'label'   => esc_html__( 'Items Height', 'visual-portfolio' ),
							'name'    => 'items_height_type',
							'group'   => 'slider_items_height',
							'default' => 'dynamic',
							'options' => array(
								'auto'    => esc_html__( 'Auto', 'visual-portfolio' ),
								'static'  => esc_html__( 'Static (px)', 'visual-portfolio' ),
								'dynamic' => esc_html__( 'Dynamic (%)', 'visual-portfolio' ),
							),
						),
						array(
							'type'      => 'number',
							'name'      => 'items_height_static',
							'group'     => 'slider_items_height',
							'min'       => 30,
							'max'       => 800,
							'default'   => 300,
							'condition' => array(
								array(
									'control'  => 'items_height_type',
									'operator' => '==',
									'value'    => 'static',
								),
							),
						),
						array(
							'type'      => 'number',
							'name'      => 'items_height_dynamic',
							'group'     => 'slider_items_height',
							'min'       => 10,
							'max'       => 300,
							'default'   => 80,
							'condition' => array(
								array(
									'control'  => 'items_height_type',
									'operator' => '==',
									'value'    => 'dynamic',
								),
							),
						),
						array(
							'type'        => 'text',
							'label'       => esc_html__( 'Items Minimal Height', 'visual-portfolio' ),
							'placeholder' => esc_attr__( '300px, 80vh', 'visual-portfolio' ),
							'description' => esc_html__( 'Values with `vh` units will not be visible in preview.', 'visual-portfolio' ),
							'name'        => 'items_min_height',
							'group'       => 'slider_items_height',
							'default'     => '',
							'condition'   => array(
								array(
									'control'  => 'items_height_type',
									'operator' => '!==',
									'value'    => 'auto',
								),
							),
						),
						array(
							'type'      => 'radio',
							'label'     => esc_html__( 'Slides Per View', 'visual-portfolio' ),
							'name'      => 'slides_per_view_type',
							'group'     => 'slider_slides_per_view',
							'default'   => 'custom',
							'options'   => array(
								'auto'   => esc_html__( 'Auto', 'visual-portfolio' ),
								'custom' => esc_html__( 'Custom', 'visual-portfolio' ),
							),
							'condition' => array(
								array(
									'control'  => 'effect',
									'operator' => '!=',
									'value'    => 'fade',
								),
							),
						),
						array(
							'type'      => 'number',
							'name'      => 'slides_per_view_custom',
							'group'     => 'slider_slides_per_view',
							'min'       => 1,
							'max'       => 6,
							'default'   => 3,
							'condition' => array(
								array(
									'control'  => 'effect',
									'operator' => '!=',
									'value'    => 'fade',
								),
								array(
									'control'  => 'slides_per_view_type',
									'operator' => '==',
									'value'    => 'custom',
								),
							),
						),
						array(
							'type'          => 'checkbox',
							'alongside'     => esc_html__( 'Centered Slides', 'visual-portfolio' ),
							'name'          => 'centered_slides',
							'default'       => true,
							'reload_iframe' => false,
							'condition'     => array(
								array(
									'control'  => 'effect',
									'operator' => '!=',
									'value'    => 'fade',
								),
							),
						),
						array(
							'type'          => 'checkbox',
							'alongside'     => esc_html__( 'Loop', 'visual-portfolio' ),
							'name'          => 'loop',
							'default'       => false,
							'reload_iframe' => false,
						),
						array(
							'type'          => 'checkbox',
							'alongside'     => esc_html__( 'Free Scroll', 'visual-portfolio' ),
							'name'          => 'free_mode',
							'group'         => 'slider_free_mode',
							'default'       => false,
							'reload_iframe' => false,
						),
						array(
							'type'          => 'checkbox',
							'alongside'     => esc_html__( 'Free Scroll Sticky', 'visual-portfolio' ),
							'name'          => 'free_mode_sticky',
							'group'         => 'slider_free_mode',
							'default'       => false,
							'reload_iframe' => false,
							'condition'     => array(
								array(
									'control' => 'free_mode',
								),
							),
						),
						array(
							'type'      => 'checkbox',
							'alongside' => esc_html__( 'Display Arrows', 'visual-portfolio' ),
							'name'      => 'arrows',
							'default'   => true,
						),
						array(
							'type'      => 'checkbox',
							'alongside' => esc_html__( 'Display Bullets', 'visual-portfolio' ),
							'name'      => 'bullets',
							'group'     => 'slider_bullets',
							'default'   => false,
						),
						array(
							'type'          => 'checkbox',
							'alongside'     => esc_html__( 'Dynamic Bullets', 'visual-portfolio' ),
							'name'          => 'bullets_dynamic',
							'group'         => 'slider_bullets',
							'default'       => false,
							'reload_iframe' => false,
							'condition'     => array(
								array(
									'control' => 'bullets',
								),
							),
						),
						array(
							'type'      => 'checkbox',
							'alongside' => esc_html__( 'Mousewheel Control', 'visual-portfolio' ),
							'name'      => 'mousewheel',
							'default'   => false,
						),
						array(
							'type'      => 'checkbox',
							'alongside' => esc_html__( 'Display Thumbnails', 'visual-portfolio' ),
							'name'      => 'thumbnails',
							'group'     => 'slider_thumbnails',
							'default'   => false,
						),
						array(
							'type'      => 'range',
							'label'     => esc_html__( 'Thumbnails Gap', 'visual-portfolio' ),
							'name'      => 'thumbnails_gap',
							'group'     => 'slider_thumbnails',
							'default'   => 15,
							'min'       => 0,
							'max'       => 150,
							'condition' => array(
								array(
									'control' => 'thumbnails',
								),
							),
						),
						array(
							'type'      => 'radio',
							'label'     => esc_html__( 'Thumbnails Height', 'visual-portfolio' ),
							'name'      => 'thumbnails_height_type',
							'group'     => 'slider_thumbnails',
							'default'   => 'static',
							'options'   => array(
								'auto'    => esc_html__( 'Auto', 'visual-portfolio' ),
								'static'  => esc_html__( 'Static (px)', 'visual-portfolio' ),
								'dynamic' => esc_html__( 'Dynamic (%)', 'visual-portfolio' ),
							),
							'condition' => array(
								array(
									'control' => 'thumbnails',
								),
							),
						),
						array(
							'type'      => 'number',
							'name'      => 'thumbnails_height_static',
							'group'     => 'slider_thumbnails',
							'min'       => 10,
							'max'       => 400,
							'default'   => 100,
							'condition' => array(
								array(
									'control' => 'thumbnails',
								),
								array(
									'control'  => 'thumbnails_height_type',
									'operator' => '==',
									'value'    => 'static',
								),
							),
						),
						array(
							'type'      => 'number',
							'name'      => 'thumbnails_height_dynamic',
							'group'     => 'slider_thumbnails',
							'min'       => 10,
							'max'       => 200,
							'default'   => 30,
							'condition' => array(
								array(
									'control'  => 'thumbnails',
								),
								array(
									'control'  => 'thumbnails_height_type',
									'operator' => '==',
									'value'    => 'dynamic',
								),
							),
						),
						array(
							'type'      => 'radio',
							'label'     => esc_html__( 'Thumbnails Per View', 'visual-portfolio' ),
							'name'      => 'thumbnails_per_view_type',
							'group'     => 'slider_thumbnails',
							'default'   => 'custom',
							'options'   => array(
								'auto'   => esc_html__( 'Auto', 'visual-portfolio' ),
								'custom' => esc_html__( 'Custom', 'visual-portfolio' ),
							),
							'condition' => array(
								array(
									'control'  => 'thumbnails',
								),
							),
						),
						array(
							'type'      => 'number',
							'name'      => 'thumbnails_per_view_custom',
							'group'     => 'slider_thumbnails',
							'min'       => 1,
							'max'       => 14,
							'default'   => 8,
							'condition' => array(
								array(
									'control' => 'thumbnails',
								),
								array(
									'control'  => 'thumbnails_per_view_type',
									'operator' => '==',
									'value'    => 'custom',
								),
							),
						),
					),
				),
			),
			$layouts
		);
	}

	/**
	 * Add default items styles.
	 *
	 * @param array $items_styles - items styles array.
	 *
	 * @return array
	 */
	public function add_default_items_styles( $items_styles ) {
		return array_merge(
			array(
				// Classic.
				'default' => array(
					'title'                => esc_html__( 'Classic', 'visual-portfolio' ),
					'icon'                 => '<svg width="20" height="23" viewBox="0 0 20 23" fill="none" xmlns="http://www.w3.org/2000/svg"><line x1="5.89285" y1="22.25" x2="14.1071" y2="22.25" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><rect x="0.75" y="0.75" width="18.5" height="18.625" rx="1.25" stroke="currentColor" stroke-width="1.5" fill="transparent"/></svg>',
					'image_preview_wizard' => visual_portfolio()->plugin_url . '/assets/admin/images/items-style-preview-classic.png',
					'builtin_controls'     => array(
						'image'   => array(
							'border_radius' => true,
							'transform'     => true, // Pro.
							'css_filter'    => true, // Pro.
						),
						'overlay' => array(
							'states'         => true,
							'text_align'     => false,

							// Elements.
							'elements'       => array(
								'icons' => true,
							),

							// Colors.
							'colors'         => array(
								'background'     => true,
								'text'           => true,
								'links'          => false,
								'mix_blend_mode' => true,    // Pro.
							),

							// Dimensions Pro.
							'dimensions'     => array(
								'border_radius'  => true,
								'margin'         => true,
							),
						),
						'caption' => array(
							'states'         => false,
							'text_align'     => 'horizontal',

							// Elements.
							'elements'       => array(
								'title'          => true,
								'categories'     => true,
								'date'           => true,
								'author'         => true,
								'comments_count' => true,
								'views_count'    => true,
								'reading_time'   => true,
								'excerpt'        => true,
								'read_more'      => true,
							),

							// Colors.
							'colors'         => array(
								'background'   => false,
								'text'         => true,
								'links'        => true,
							),

							// Typography Pro.
							'typography'     => array(
								'title'       => true,
								'category'    => true,
								'meta'        => true,
								'description' => true,
								'button'      => true,
							),

							// Dimensions Pro.
							'dimensions'     => array(
								'padding'    => true,
								'items_gap'  => true,
							),
						),
					),
					'controls'             => array(
						// Nothing here yet, all options are in builtin controls.
					),
				),

				// Fade.
				'fade' => array(
					'title'                => esc_html__( 'Fade', 'visual-portfolio' ),
					'icon'                 => '<svg width="20" height="23" viewBox="0 0 20 23" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="0.75" y="0.75" width="18.5" height="18.625" rx="1.25" stroke="currentColor" stroke-width="1.5" fill="transparent"/><line x1="5.89285" y1="10.25" x2="14.1071" y2="10.25" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/></svg>',
					'image_preview_wizard' => visual_portfolio()->plugin_url . '/assets/admin/images/items-style-preview-fade.png',
					'builtin_controls'     => array(
						'image'   => array(
							'border_radius' => true,
							'transform'     => true, // Pro.
							'css_filter'    => true, // Pro.
						),
						'overlay' => array(
							'states'         => true,

							// All available align values: 'horizontal'|'vertical'|'box'.
							'text_align'     => 'box',

							'under_image'    => true, // Pro.

							// Elements.
							'elements'       => array(
								'title'          => true,
								'categories'     => true,
								'date'           => true,
								'author'         => true,
								'comments_count' => true,
								'views_count'    => true,
								'reading_time'   => true,
								'excerpt'        => true,
								'read_more'      => false,
								'icons'          => true,
							),

							// Colors.
							'colors'         => array(
								'background'     => true,
								'text'           => true,
								'links'          => false,
								'mix_blend_mode' => true,    // Pro.
							),

							// Typography Pro.
							'typography'     => array(
								'title'       => true,
								'category'    => true,
								'meta'        => true,
								'description' => true,
							),

							// Dimensions Pro.
							'dimensions'     => array(
								'border_radius'  => true,
								'padding'        => true,
								'margin'         => true,
								'items_gap'      => true,
							),
						),
						'caption' => false,
					),
					'controls'             => array(
						// Nothing here yet, all options are in builtin controls.
					),
				),

				// Fly.
				'fly' => array(
					'title'                => esc_html__( 'Fly', 'visual-portfolio' ),
					'icon'                 => '<svg width="20" height="23" viewBox="0 0 20 23" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="0.75" y="0.75" width="18.5" height="18.625" rx="1.25" stroke="currentColor" stroke-width="1.5" fill="transparent"/><line x1="0.75" y1="9.8875" x2="4.39286" y2="9.8875" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><line x1="10.4643" y1="0.75" x2="10.4643" y2="19.375" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/></svg>',
					'image_preview_wizard' => visual_portfolio()->plugin_url . '/assets/admin/images/items-style-preview-fly.png',
					'builtin_controls'     => array(
						'image'   => array(
							'border_radius' => true,
							'transform'     => true, // Pro.
							'css_filter'    => true, // Pro.
						),
						'overlay' => array(
							'states'         => true,

							// All available align values: 'horizontal'|'vertical'|'box'.
							'text_align'     => 'box',

							'under_image'    => true, // Pro.

							// Elements.
							'elements'       => array(
								'title'          => true,
								'categories'     => true,
								'date'           => true,
								'author'         => true,
								'comments_count' => true,
								'views_count'    => true,
								'reading_time'   => true,
								'excerpt'        => true,
								'read_more'      => false,
								'icons'          => true,
							),

							// Colors.
							'colors'         => array(
								'background'     => true,
								'text'           => true,
								'links'          => false,
								'mix_blend_mode' => true,    // Pro.
							),

							// Typography Pro.
							'typography'     => array(
								'title'       => true,
								'category'    => true,
								'meta'        => true,
								'description' => true,
							),

							// Dimensions Pro.
							'dimensions'     => array(
								'border_radius'  => true,
								'padding'        => true,
								'margin'         => true,
								'items_gap'      => true,
							),
						),
						'caption' => false,
					),
					'controls'             => array(
						// Nothing here yet, all options are in builtin controls.
					),
				),

				// Emerge.
				'emerge' => array(
					'title'                => esc_html__( 'Emerge', 'visual-portfolio' ),
					'icon'                 => '<svg width="21" height="23" viewBox="0 0 21 23" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="0.75" y="0.75" width="18.5" height="18.625" rx="1.25" stroke="currentColor" stroke-width="1.5" fill="transparent"/><line x1="0.75" y1="-0.75" x2="19.283" y2="-0.75" transform="matrix(0.998303 0.0582344 -0.0575156 0.998345 0 13.225)" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><line x1="5.89285" y1="16.2125" x2="14.1071" y2="16.2125" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/></svg>',
					'image_preview_wizard' => visual_portfolio()->plugin_url . '/assets/admin/images/items-style-preview-emerge.png',
					'builtin_controls'     => array(
						'image'   => array(
							'border_radius' => true,
							'transform'     => true, // Pro.
							'css_filter'    => true, // Pro.
						),
						'overlay' => array(
							'states'         => true,

							// Colors.
							'colors'         => array(
								'background'     => true,
								'text'           => false,
								'links'          => false,
								'mix_blend_mode' => true,    // Pro.
							),

							// Dimensions Pro.
							'dimensions'     => array(
								'border_radius'  => true,
								'margin'         => true,
							),
						),
						'caption' => array(
							'states'         => true,

							// All available align values: 'horizontal'|'vertical'|'box'.
							'text_align'     => 'horizontal',

							'under_image'    => true, // Pro.

							// Elements.
							'elements'       => array(
								'title'          => true,
								'categories'     => true,
								'date'           => true,
								'author'         => true,
								'comments_count' => true,
								'views_count'    => true,
								'reading_time'   => true,
								'excerpt'        => true,
								'read_more'      => false,
								'icons'          => false,
							),

							// Colors.
							'colors'         => array(
								'background'     => true,
								'text'           => true,
								'links'          => true,
								'mix_blend_mode' => true,   // Pro.
							),

							// Typography Pro.
							'typography'     => array(
								'title'       => true,
								'category'    => true,
								'meta'        => true,
								'description' => true,
							),

							// Dimensions Pro.
							'dimensions'     => array(
								'padding'   => true,
								'items_gap' => true,
							),
						),
					),
					'controls'             => array(
						// Nothing here yet, all options are in builtin controls.
					),
				),
			),
			$items_styles
		);
	}

	/**
	 * Register control fields for the metaboxes.
	 */
	public function register_controls() {
		do_action( 'vpf_before_register_controls' );

		/**
		 * Categories.
		 */
		Visual_Portfolio_Controls::register_categories(
			array(
				'content-source'               => array(
					'title'     => esc_html__( 'Content Source', 'visual-portfolio' ),
					'is_opened' => true,
				),
				'content-source-post-based'    => array(
					'title'     => esc_html__( 'Posts Settings', 'visual-portfolio' ),
					'is_opened' => true,
					'icon'      => '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="0.75" y="0.75" width="18.5" height="18.5" rx="1.25" stroke="currentColor" stroke-width="1.5" fill="transparent"/><path d="M15.5 4.5H11.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="transparent"/><path d="M15.5 8H11.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="transparent"/><path d="M15.5 11.5H11.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="transparent"/><path d="M15.5 15H4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="transparent"/><mask id="path-6-inside-1" fill="white"><rect x="3.5" y="3.5" width="6" height="8.8" rx="1"/></mask><rect x="3.5" y="3.5" width="6" height="8.8" rx="1" stroke="currentColor" stroke-width="3" mask="url(#path-6-inside-1)" fill="transparent"/></svg>',
				),
				'content-source-images'        => array(
					'title'     => esc_html__( 'Images Settings', 'visual-portfolio' ),
					'is_opened' => true,
					'icon'      => '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16.0428 14.3315V1.71123C16.0428 0.748663 15.2941 0 14.3315 0H1.71123C0.748663 0 0 0.748663 0 1.71123V14.3315C0 15.2941 0.748663 16.0428 1.71123 16.0428H14.3315C15.2941 16.0428 16.0428 15.2941 16.0428 14.3315ZM1.60428 1.71123C1.60428 1.60428 1.71123 1.60428 1.71123 1.60428H14.3315C14.4385 1.60428 14.4385 1.71123 14.4385 1.71123V9.62567L11.9786 7.80749C11.6578 7.59358 11.3369 7.59358 11.016 7.80749L7.91444 10.0535L5.34759 8.87701C5.13369 8.77005 4.81283 8.77005 4.59893 8.87701L1.49733 10.4813V1.71123H1.60428ZM1.60428 14.3315V12.4064L5.02674 10.5882L7.59358 11.8717C7.80749 11.9786 8.12834 11.9786 8.4492 11.7647L11.4438 9.62567L14.4385 11.7647V14.4385C14.4385 14.5455 14.3315 14.5455 14.3315 14.5455H1.71123C1.71123 14.4385 1.60428 14.3315 1.60428 14.3315Z" fill="currentColor"/><path fill-rule="evenodd" clip-rule="evenodd" d="M19.25 5.75C19.6642 5.75 20 6.08579 20 6.5C20 6.91421 20 17.25 20 17.25C20 18.7688 18.7688 20 17.25 20H4.27C3.85579 20 3.52 19.6642 3.52 19.25C3.52 18.8358 3.85579 18.5 4.27 18.5H17.25C17.9404 18.5 18.5 17.9404 18.5 17.25C18.5 17.25 18.5 6.91421 18.5 6.5C18.5 6.08579 18.8358 5.75 19.25 5.75Z" fill="currentColor"/></svg>',
				),
				'content-source-social-stream' => array(
					'title'     => esc_html__( 'Social Stream Settings', 'visual-portfolio' ),
					'is_opened' => true,
					'icon'      => '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15.1429 6.57142C16.563 6.57142 17.7143 5.42015 17.7143 3.99999C17.7143 2.57983 16.563 1.42856 15.1429 1.42856C13.7227 1.42856 12.5714 2.57983 12.5714 3.99999C12.5714 5.42015 13.7227 6.57142 15.1429 6.57142Z" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.85715 12.5714C6.27731 12.5714 7.42858 11.4201 7.42858 9.99999C7.42858 8.57983 6.27731 7.42856 4.85715 7.42856C3.43699 7.42856 2.28572 8.57983 2.28572 9.99999C2.28572 11.4201 3.43699 12.5714 4.85715 12.5714Z" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><path d="M15.1429 18.5714C16.563 18.5714 17.7143 17.4201 17.7143 16C17.7143 14.5798 16.563 13.4286 15.1429 13.4286C13.7227 13.4286 12.5714 14.5798 12.5714 16C12.5714 17.4201 13.7227 18.5714 15.1429 18.5714Z" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><path d="M7.14285 11.4286L12.8571 14.5714" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><path d="M12.8571 5.42856L7.14285 8.57141" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/></svg>',
				),
				'content-source-general'       => array(
					'title'     => esc_html__( 'General Settings', 'visual-portfolio' ),
					'is_opened' => true,
					'icon'      => '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 13C11.6569 13 13 11.6569 13 10C13 8.34315 11.6569 7 10 7C8.34315 7 7 8.34315 7 10C7 11.6569 8.34315 13 10 13Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none" /><path d="M16.0545 12.4545C15.9456 12.7013 15.9131 12.9751 15.9613 13.2405C16.0094 13.5059 16.1359 13.7508 16.3245 13.9436L16.3736 13.9927C16.5258 14.1447 16.6465 14.3252 16.7288 14.5238C16.8112 14.7225 16.8536 14.9354 16.8536 15.1505C16.8536 15.3655 16.8112 15.5784 16.7288 15.7771C16.6465 15.9757 16.5258 16.1562 16.3736 16.3082C16.2217 16.4603 16.0412 16.581 15.8425 16.6634C15.6439 16.7457 15.431 16.7881 15.2159 16.7881C15.0009 16.7881 14.7879 16.7457 14.5893 16.6634C14.3906 16.581 14.2102 16.4603 14.0582 16.3082L14.0091 16.2591C13.8163 16.0705 13.5714 15.9439 13.3059 15.8958C13.0405 15.8477 12.7668 15.8802 12.52 15.9891C12.278 16.0928 12.0716 16.265 11.9263 16.4845C11.7809 16.704 11.7029 16.9613 11.7018 17.2245V17.3636C11.7018 17.7976 11.5294 18.2138 11.2225 18.5207C10.9157 18.8276 10.4994 19 10.0655 19C9.63146 19 9.21525 18.8276 8.90837 18.5207C8.60149 18.2138 8.42909 17.7976 8.42909 17.3636V17.29C8.42276 17.0192 8.3351 16.7565 8.17751 16.5362C8.01992 16.3159 7.79969 16.1481 7.54545 16.0545C7.29868 15.9456 7.02493 15.9131 6.75952 15.9613C6.4941 16.0094 6.24919 16.1359 6.05636 16.3245L6.00727 16.3736C5.8553 16.5258 5.67483 16.6465 5.47617 16.7288C5.27752 16.8112 5.06459 16.8536 4.84955 16.8536C4.6345 16.8536 4.42157 16.8112 4.22292 16.7288C4.02426 16.6465 3.84379 16.5258 3.69182 16.3736C3.53967 16.2217 3.41898 16.0412 3.33663 15.8425C3.25428 15.6439 3.21189 15.431 3.21189 15.2159C3.21189 15.0009 3.25428 14.7879 3.33663 14.5893C3.41898 14.3906 3.53967 14.2102 3.69182 14.0582L3.74091 14.0091C3.92953 13.8163 4.05606 13.5714 4.10419 13.3059C4.15231 13.0405 4.11982 12.7668 4.01091 12.52C3.90719 12.278 3.73498 12.0716 3.51547 11.9263C3.29596 11.7809 3.03873 11.7029 2.77545 11.7018H2.63636C2.20237 11.7018 1.78616 11.5294 1.47928 11.2225C1.1724 10.9157 1 10.4994 1 10.0655C1 9.63146 1.1724 9.21525 1.47928 8.90837C1.78616 8.60149 2.20237 8.42909 2.63636 8.42909H2.71C2.98081 8.42276 3.24346 8.3351 3.46379 8.17751C3.68412 8.01992 3.85195 7.79969 3.94545 7.54545C4.05437 7.29868 4.08686 7.02493 4.03873 6.75952C3.99061 6.4941 3.86408 6.24919 3.67545 6.05636L3.62636 6.00727C3.47422 5.8553 3.35352 5.67483 3.27118 5.47617C3.18883 5.27752 3.14644 5.06459 3.14644 4.84955C3.14644 4.6345 3.18883 4.42157 3.27118 4.22292C3.35352 4.02426 3.47422 3.84379 3.62636 3.69182C3.77834 3.53967 3.95881 3.41898 4.15746 3.33663C4.35611 3.25428 4.56905 3.21189 4.78409 3.21189C4.99913 3.21189 5.21207 3.25428 5.41072 3.33663C5.60937 3.41898 5.78984 3.53967 5.94182 3.69182L5.99091 3.74091C6.18374 3.92953 6.42865 4.05606 6.69406 4.10419C6.95948 4.15231 7.23322 4.11982 7.48 4.01091H7.54545C7.78745 3.90719 7.99383 3.73498 8.1392 3.51547C8.28457 3.29596 8.36259 3.03873 8.36364 2.77545V2.63636C8.36364 2.20237 8.53604 1.78616 8.84292 1.47928C9.14979 1.1724 9.56601 1 10 1C10.434 1 10.8502 1.1724 11.1571 1.47928C11.464 1.78616 11.6364 2.20237 11.6364 2.63636V2.71C11.6374 2.97328 11.7154 3.23051 11.8608 3.45002C12.0062 3.66953 12.2126 3.84174 12.4545 3.94545C12.7013 4.05437 12.9751 4.08686 13.2405 4.03873C13.5059 3.99061 13.7508 3.86408 13.9436 3.67545L13.9927 3.62636C14.1447 3.47422 14.3252 3.35352 14.5238 3.27118C14.7225 3.18883 14.9354 3.14644 15.1505 3.14644C15.3655 3.14644 15.5784 3.18883 15.7771 3.27118C15.9757 3.35352 16.1562 3.47422 16.3082 3.62636C16.4603 3.77834 16.581 3.95881 16.6634 4.15746C16.7457 4.35611 16.7881 4.56905 16.7881 4.78409C16.7881 4.99913 16.7457 5.21207 16.6634 5.41072C16.581 5.60937 16.4603 5.78984 16.3082 5.94182L16.2591 5.99091C16.0705 6.18374 15.9439 6.42865 15.8958 6.69406C15.8477 6.95948 15.8802 7.23322 15.9891 7.48V7.54545C16.0928 7.78745 16.265 7.99383 16.4845 8.1392C16.704 8.28457 16.9613 8.36259 17.2245 8.36364H17.3636C17.7976 8.36364 18.2138 8.53604 18.5207 8.84292C18.8276 9.14979 19 9.56601 19 10C19 10.434 18.8276 10.8502 18.5207 11.1571C18.2138 11.464 17.7976 11.6364 17.3636 11.6364H17.29C17.0267 11.6374 16.7695 11.7154 16.55 11.8608C16.3305 12.0062 16.1583 12.2126 16.0545 12.4545V12.4545Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none" /></svg>',
				),
				'layout-elements'              => array(
					'title'     => esc_html__( 'Layout', 'visual-portfolio' ),
					'is_opened' => false,
					'icon'      => '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="0.75" y="0.75" width="7.35714" height="5.35714" rx="1.25" stroke="currentColor" stroke-width="1.5" fill="transparent"/><rect x="11.8929" y="13.8928" width="7.35714" height="5.35715" rx="1.25" stroke="currentColor" stroke-width="1.5" fill="transparent"/><rect x="11.8929" y="0.75" width="7.35714" height="9.35714" rx="1.25" stroke="currentColor" stroke-width="1.5" fill="transparent"/><rect x="0.75" y="9.89285" width="7.35714" height="9.35715" rx="1.25" stroke="currentColor" stroke-width="1.5" fill="transparent"/></svg>',
				),
				'items-style'                  => array(
					'title'     => esc_html__( 'Skin', 'visual-portfolio' ),
					'is_opened' => false,
					'icon'      => '<svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="0.75" y="0.75" width="18.5" height="18.625" rx="1.25" stroke="currentColor" stroke-width="1.5" fill="transparent"/><line x1="0.75" y1="-0.75" x2="19.283" y2="-0.75" transform="matrix(0.998303 0.0582344 -0.0575156 0.998345 0 13.225)" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="transparent"/><line x1="5.89285" y1="16.2125" x2="14.1071" y2="16.2125" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="transparent"/></svg>',
				),
				'items-click-action'           => array(
					'title'     => esc_html__( 'Click Action', 'visual-portfolio' ),
					'is_opened' => false,
					'icon'      => '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4.9857 10.718L2.83729 12.8686M13.933 13.9327L11.9062 19L7.85261 7.85198L19 11.9058L13.933 13.9327ZM13.933 13.9327L19 19L13.933 13.9327ZM6.01633 1L6.80374 3.93598L6.01633 1ZM3.93683 6.80305L1 6.0156L3.93683 6.80305ZM12.8689 2.83537L10.7185 4.98592L12.8689 2.83537Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="transparent"/></svg>',
				),
				'content-protection'           => array(
					'title'     => esc_html__( 'Protection', 'visual-portfolio' ),
					'is_opened' => false,
					'icon'      => '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10.1667 18.6667C10.1667 18.6667 16.8333 15.3333 16.8333 10.3333V4.5L10.1667 2L3.5 4.5V10.3333C3.5 15.3333 10.1667 18.6667 10.1667 18.6667Z" stroke="currentColor" stroke-width="1.66667" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>',
				),
				'custom_css'                   => array(
					'title'     => esc_html__( 'Custom CSS', 'visual-portfolio' ),
					'is_opened' => false,
					'icon'      => '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M14 15L19 10L14 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="transparent"/><path d="M6 5L1 10L6 15" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="transparent"/></svg>',
				),
			)
		);

		/**
		 * Enabled preview for gutenberg block.
		 */
		Visual_Portfolio_Controls::register(
			array(
				'type'    => 'hidden',
				'name'    => 'preview_image_example',
				'default' => '',
			)
		);

		/**
		 * Enabled setup wizard.
		 */
		Visual_Portfolio_Controls::register(
			array(
				'type'    => 'hidden',
				'name'    => 'setup_wizard',
				'default' => '',
			)
		);

		/**
		 * Content Source
		 */
		Visual_Portfolio_Controls::register(
			array(
				'category'     => 'content-source',
				'type'         => 'icons_selector',
				'name'         => 'content_source',
				'setup_wizard' => true,
				'default'      => '',
				'options'      => array(
					'post-based' => array(
						'value'       => 'post-based',
						'title'       => esc_html__( 'Posts', 'visual-portfolio' ),
						'icon'        => '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="0.75" y="0.75" width="18.5" height="18.5" rx="1.25" stroke="currentColor" stroke-width="1.5" fill="transparent"/><path d="M15.5 4.5H11.5" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><path d="M15.5 8H11.5" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><path d="M15.5 11.5H11.5" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><path d="M15.5 15H4.5" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><mask id="path-7-inside-1" fill="white"><rect x="3.5" y="3.5" width="6" height="8.8" rx="1"/></mask><rect x="3.5" y="3.5" width="6" height="8.8" rx="1" stroke="currentColor" stroke-width="3" mask="url(#path-7-inside-1)"/></svg>',
						'icon_wizard' => '<svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M39.6 1.64999H4.39999C2.88121 1.64999 1.64999 2.88121 1.64999 4.39999V39.6C1.64999 41.1188 2.88121 42.35 4.39999 42.35H39.6C41.1188 42.35 42.35 41.1188 42.35 39.6V4.39999C42.35 2.88121 41.1188 1.64999 39.6 1.64999Z" stroke="currentColor" stroke-width="2"/><path d="M34.1 9.89999H25.3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M34.1 17.6H25.3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M34.1 25.3H25.3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M34.1 33H9.89999" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><mask id="mask0_4892_2370" style="mask-type:alpha" maskUnits="userSpaceOnUse" x="7" y="7" width="14" height="21"><path d="M18.7 7.7H9.90001C8.68499 7.7 7.70001 8.68497 7.70001 9.9V24.86C7.70001 26.075 8.68499 27.06 9.90001 27.06H18.7C19.915 27.06 20.9 26.075 20.9 24.86V9.9C20.9 8.68497 19.915 7.7 18.7 7.7Z" fill="white"/></mask><g mask="url(#mask0_4892_2370)"><path d="M18.7 7.7H9.90001C8.68499 7.7 7.70001 8.68497 7.70001 9.9V24.86C7.70001 26.075 8.68499 27.06 9.90001 27.06H18.7C19.915 27.06 20.9 26.075 20.9 24.86V9.9C20.9 8.68497 19.915 7.7 18.7 7.7Z" stroke="currentColor" stroke-width="4"/></g></svg>',
					),
					'images' => array(
						'value'       => 'images',
						'title'       => esc_html__( 'Images', 'visual-portfolio' ),
						'icon'        => '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M16.0428 14.3315V1.71123C16.0428 0.748663 15.2941 0 14.3315 0H1.71123C0.748663 0 0 0.748663 0 1.71123V14.3315C0 15.2941 0.748663 16.0428 1.71123 16.0428H14.3315C15.2941 16.0428 16.0428 15.2941 16.0428 14.3315ZM1.60428 1.71123C1.60428 1.60428 1.71123 1.60428 1.71123 1.60428H14.3315C14.4385 1.60428 14.4385 1.71123 14.4385 1.71123V9.62567L11.9786 7.80749C11.6578 7.59358 11.3369 7.59358 11.016 7.80749L7.91444 10.0535L5.34759 8.87701C5.13369 8.77005 4.81283 8.77005 4.59893 8.87701L1.49733 10.4813V1.71123H1.60428ZM1.60428 14.3315V12.4064L5.02674 10.5882L7.59358 11.8717C7.80749 11.9786 8.12834 11.9786 8.4492 11.7647L11.4438 9.62567L14.4385 11.7647V14.4385C14.4385 14.5455 14.3315 14.5455 14.3315 14.5455H1.71123C1.71123 14.4385 1.60428 14.3315 1.60428 14.3315Z" fill="currentColor"/><path fill-rule="evenodd" clip-rule="evenodd" d="M19.25 5.75C19.6642 5.75 20 6.08579 20 6.5C20 6.91421 20 17.25 20 17.25C20 18.7688 18.7688 20 17.25 20H4.27C3.85579 20 3.52 19.6642 3.52 19.25C3.52 18.8358 3.85579 18.5 4.27 18.5H17.25C17.9404 18.5 18.5 17.9404 18.5 17.25C18.5 17.25 18.5 6.91421 18.5 6.5C18.5 6.08579 18.8358 5.75 19.25 5.75Z" fill="currentColor"/></svg>',
						'icon_wizard' => '<svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M42.1667 14.6667V36.6667C42.1667 39.7043 39.7043 42.1667 36.6667 42.1667H14.6667" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M1.83334 26.5833V29.3333C1.83334 32.371 4.29579 34.8333 7.33334 34.8333H29.3333C32.371 34.8333 34.8333 32.371 34.8333 29.3333V24.75M1.83334 26.5833V7.33333C1.83334 4.29577 4.29579 1.83333 7.33334 1.83333H29.3333C32.371 1.83333 34.8333 4.29577 34.8333 7.33333V24.75M1.83334 26.5833L11 22L18.3333 26.5833L27.5 19.25L34.8333 24.75" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>',
					),
					'social-stream' => array(
						'value'       => 'social-stream',
						'title'       => esc_html__( 'Social', 'visual-portfolio' ),
						'icon'        => '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M15.1429 6.57142C16.563 6.57142 17.7143 5.42015 17.7143 3.99999C17.7143 2.57983 16.563 1.42856 15.1429 1.42856C13.7227 1.42856 12.5714 2.57983 12.5714 3.99999C12.5714 5.42015 13.7227 6.57142 15.1429 6.57142Z" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><path d="M4.85715 12.5714C6.27731 12.5714 7.42858 11.4201 7.42858 9.99999C7.42858 8.57983 6.27731 7.42856 4.85715 7.42856C3.43699 7.42856 2.28572 8.57983 2.28572 9.99999C2.28572 11.4201 3.43699 12.5714 4.85715 12.5714Z" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><path d="M15.1429 18.5714C16.563 18.5714 17.7143 17.4201 17.7143 16C17.7143 14.5798 16.563 13.4286 15.1429 13.4286C13.7227 13.4286 12.5714 14.5798 12.5714 16C12.5714 17.4201 13.7227 18.5714 15.1429 18.5714Z" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><path d="M7.14285 11.4286L12.8571 14.5714" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><path d="M12.8571 5.42856L7.14285 8.57141" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/></svg>',
						'icon_wizard' => '<svg width="44" height="44" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M29.2286 16.5143C31.5008 16.5143 33.3429 14.6722 33.3429 12.4C33.3429 10.1277 31.5008 8.28569 29.2286 8.28569C26.9563 8.28569 25.1142 10.1277 25.1142 12.4C25.1142 14.6722 26.9563 16.5143 29.2286 16.5143Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M12.7715 26.1142C15.0437 26.1142 16.8857 24.2722 16.8857 22C16.8857 19.7277 15.0437 17.8857 12.7715 17.8857C10.4992 17.8857 8.65717 19.7277 8.65717 22C8.65717 24.2722 10.4992 26.1142 12.7715 26.1142Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M29.2286 35.7142C31.5008 35.7142 33.3429 33.8722 33.3429 31.6C33.3429 29.3277 31.5008 27.4858 29.2286 27.4858C26.9563 27.4858 25.1142 29.3277 25.1142 31.6C25.1142 33.8722 26.9563 35.7142 29.2286 35.7142Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M16.4286 24.2858L25.5714 29.3142" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M25.5714 14.6857L16.4286 19.7143" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><rect x="1" y="1" width="42" height="42" rx="3" stroke="currentColor" stroke-width="2"/></svg>',
					),
				),
			)
		);

		/**
		 * Content Source Posts
		 */
		Visual_Portfolio_Controls::register(
			array(
				'category'       => 'content-source-post-based',
				'type'           => 'icons_selector',
				'name'           => 'posts_source',
				'default'        => 'portfolio',
				'collapse_rows'  => 2,
				'value_callback' => array( $this, 'find_post_types_options' ),
			)
		);
		$allowed_protocols = array(
			'a' => array(
				'href'   => array(),
				'target' => array(),
			),
		);
		Visual_Portfolio_Controls::register(
			array(
				'category'      => 'content-source-post-based',
				'type'          => 'textarea',
				'label'         => esc_html__( 'Custom Query', 'visual-portfolio' ),
				// translators: %1$s - escaped url.
				'description'   => sprintf( wp_kses( __( 'Build custom query according to WordPress Codex. See example here <a href="%1$s">%1$s</a>.', 'visual-portfolio' ), $allowed_protocols ), esc_url( 'https://visualportfolio.co/docs/portfolio-layouts/content-source/post-based/#custom-query' ) ),
				'name'          => 'posts_custom_query',
				'default'       => '',
				'cols'          => 30,
				'rows'          => 3,
				'condition'     => array(
					array(
						'control' => 'posts_source',
						'value'   => 'custom_query',
					),
				),
			)
		);
		Visual_Portfolio_Controls::register(
			array(
				'category'       => 'content-source-post-based',
				'type'           => 'select',
				'label'          => esc_html__( 'Post Types', 'visual-portfolio' ),
				'name'           => 'post_types_set',
				'default'        => array( 'post' ),
				'value_callback' => array( $this, 'find_posts_types_select_control' ),
				'multiple'       => true,
				'condition'      => array(
					array(
						'control' => 'posts_source',
						'value'   => 'post_types_set',
					),
				),
			)
		);
		Visual_Portfolio_Controls::register(
			array(
				'category'       => 'content-source-post-based',
				'type'           => 'select',
				'label'          => esc_html__( 'Specific Posts', 'visual-portfolio' ),
				'name'           => 'posts_ids',
				'default'        => array(),
				'value_callback' => array( $this, 'find_posts_select_control' ),
				'searchable'     => true,
				'multiple'       => true,
				'condition'      => array(
					array(
						'control' => 'posts_source',
						'value'   => 'ids',
					),
				),
			)
		);
		Visual_Portfolio_Controls::register(
			array(
				'category'       => 'content-source-post-based',
				'type'           => 'select',
				'label'          => esc_html__( 'Excluded Posts', 'visual-portfolio' ),
				'name'           => 'posts_excluded_ids',
				'default'        => array(),
				'value_callback' => array( $this, 'find_posts_select_control' ),
				'searchable'     => true,
				'multiple'       => true,
				'condition'      => array(
					array(
						'control'  => 'posts_source',
						'operator' => '!=',
						'value'    => 'ids',
					),
					array(
						'control'  => 'posts_source',
						'operator' => '!=',
						'value'    => 'custom_query',
					),
					array(
						'control'  => 'posts_source',
						'operator' => '!=',
						'value'    => 'current_query',
					),
				),
			)
		);
		Visual_Portfolio_Controls::register(
			array(
				'category'       => 'content-source-post-based',
				'type'           => 'select',
				'label'          => esc_html__( 'Taxonomies', 'visual-portfolio' ),
				'name'           => 'posts_taxonomies',
				'group'          => 'posts_taxonomies',
				'default'        => array(),
				'value_callback' => array( $this, 'find_taxonomies_select_control' ),
				'searchable'     => true,
				'multiple'       => true,
				'condition'      => array(
					array(
						'control'  => 'posts_source',
						'operator' => '!=',
						'value'    => 'ids',
					),
					array(
						'control'  => 'posts_source',
						'operator' => '!=',
						'value'    => 'custom_query',
					),
					array(
						'control'  => 'posts_source',
						'operator' => '!=',
						'value'    => 'current_query',
					),
				),
			)
		);
		Visual_Portfolio_Controls::register(
			array(
				'category'      => 'content-source-post-based',
				'type'          => 'radio',
				'label'         => esc_html__( 'Taxonomies Relation', 'visual-portfolio' ),
				'name'          => 'posts_taxonomies_relation',
				'group'         => 'posts_taxonomies',
				'default'       => 'or',
				'options'       => array(
					'or'  => esc_html__( 'OR', 'visual-portfolio' ),
					'and' => esc_html__( 'AND', 'visual-portfolio' ),
				),
				'condition'     => array(
					array(
						'control'  => 'posts_source',
						'operator' => '!=',
						'value'    => 'ids',
					),
					array(
						'control'  => 'posts_source',
						'operator' => '!=',
						'value'    => 'custom_query',
					),
					array(
						'control'  => 'posts_source',
						'operator' => '!=',
						'value'    => 'current_query',
					),
				),
			)
		);
		Visual_Portfolio_Controls::register(
			array(
				'category'      => 'content-source-post-based',
				'type'          => 'select',
				'label'         => esc_html__( 'Order by', 'visual-portfolio' ),
				'name'          => 'posts_order_by',
				'group'         => 'posts_order',
				'default'       => 'post_date',
				'options'       => array(
					'post_date'     => esc_html__( 'Date', 'visual-portfolio' ),
					'title'         => esc_html__( 'Title', 'visual-portfolio' ),
					'id'            => esc_html__( 'ID', 'visual-portfolio' ),
					'comment_count' => esc_html__( 'Comments Count', 'visual-portfolio' ),
					'modified'      => esc_html__( 'Modified', 'visual-portfolio' ),
					'menu_order'    => esc_html__( 'Menu Order', 'visual-portfolio' ),
					'post__in'      => esc_html__( 'Manual Selection', 'visual-portfolio' ),
					'rand'          => esc_html__( 'Random', 'visual-portfolio' ),
				),
				'condition'     => array(
					array(
						'control'  => 'posts_source',
						'operator' => '!=',
						'value'    => 'custom_query',
					),
					array(
						'control'  => 'posts_source',
						'operator' => '!=',
						'value'    => 'current_query',
					),
				),
			)
		);
		Visual_Portfolio_Controls::register(
			array(
				'category'      => 'content-source-post-based',
				'type'          => 'notice',
				// translators: %1$s - url.
				// translators: %2$s - link text.
				'description'   => wp_kses_post( sprintf( __( 'Menu Order is typically used in combination with one of these plugins: <a href="%1$s" target="_blank">%2$s</a>', 'visual-portfolio' ), 'https://wordpress.org/plugins/search/post+order/', 'Post Order Plugins' ) ),
				'name'          => 'posts_order_direction_notice',
				'group'         => 'posts_order',
				'condition'     => array(
					array(
						'control'  => 'posts_order_by',
						'operator' => '===',
						'value'    => 'menu_order',
					),
					array(
						'control'  => 'posts_source',
						'operator' => '!=',
						'value'    => 'custom_query',
					),
					array(
						'control'  => 'posts_source',
						'operator' => '!=',
						'value'    => 'current_query',
					),
				),
			)
		);
		Visual_Portfolio_Controls::register(
			array(
				'category'      => 'content-source-post-based',
				'type'          => 'radio',
				'label'         => esc_html__( 'Order Direction', 'visual-portfolio' ),
				'name'          => 'posts_order_direction',
				'group'         => 'posts_order',
				'default'       => 'desc',
				'options'       => array(
					'asc'  => esc_html__( 'ASC', 'visual-portfolio' ),
					'desc' => esc_html__( 'DESC', 'visual-portfolio' ),
				),
				'condition'     => array(
					array(
						'control'  => 'posts_source',
						'operator' => '!=',
						'value'    => 'custom_query',
					),
					array(
						'control'  => 'posts_source',
						'operator' => '!=',
						'value'    => 'current_query',
					),
				),
			)
		);
		Visual_Portfolio_Controls::register(
			array(
				'category'      => 'content-source-post-based',
				'type'          => 'checkbox',
				'alongside'     => esc_html__( 'Avoid Duplicates', 'visual-portfolio' ),
				'description'   => esc_html__( 'Enable to avoid duplicate posts from showing up. This only affects the frontend', 'visual-portfolio' ),
				'name'          => 'posts_avoid_duplicate_posts',
				'default'       => false,
				'reload_iframe' => false,
			)
		);
		Visual_Portfolio_Controls::register(
			array(
				'category'    => 'content-source-post-based',
				'type'        => 'range',
				'label'       => esc_html__( 'Offset', 'visual-portfolio' ),
				'description' => esc_html__( 'Use this setting to skip over posts (e.g. `2` to skip over 2 posts)', 'visual-portfolio' ),
				'name'        => 'posts_offset',
				'min'         => 0,
				'max'         => 100,
				'condition'   => array(
					array(
						'control'  => 'posts_source',
						'operator' => '!=',
						'value'    => 'ids',
					),
					array(
						'control'  => 'posts_source',
						'operator' => '!=',
						'value'    => 'custom_query',
					),
					array(
						'control'  => 'posts_source',
						'operator' => '!=',
						'value'    => 'current_query',
					),
				),
			)
		);
		Visual_Portfolio_Controls::register(
			array(
				'category'    => 'content-source-post-based',
				'type'        => 'pro_note',
				'name'        => 'additional_query_settings_pro',
				'label'       => esc_html__( 'Premium Only', 'visual-portfolio' ),
				'description' => esc_html__( 'Additional query settings, such as:', 'visual-portfolio' ) . '
                                <ul>
                                    <li>' . esc_html__( 'Filter by specific author', 'visual-portfolio' ) . '</li>
                                    <li>' . esc_html__( 'Filter by publish date range', 'visual-portfolio' ) . '</li>
                                    <li>' . esc_html__( 'Exclude posts without thumbnail', 'visual-portfolio' ) . '</li>
                                    <li>' . esc_html__( 'Exclude sticky posts', 'visual-portfolio' ) . '</li>
                                    <li>' . esc_html__( 'etc...', 'visual-portfolio' ) . '</li>
                                </ul>',
			)
		);

		/**
		 * Content Source Images
		 */
		Visual_Portfolio_Controls::register(
			array(
				'category'        => 'content-source-images',
				'type'            => 'gallery',
				'name'            => 'images',
				'wpml'            => true,
				'setup_wizard'    => true,
				'focal_point'     => true,
				'image_controls'  => array(
					'title' => array(
						'type'  => 'text',
						'label' => esc_html__( 'Title', 'visual-portfolio' ),
					),
					'description' => array(
						'type'  => 'textarea',
						'label' => esc_html__( 'Description', 'visual-portfolio' ),
					),
					'categories' => array(
						'type'      => 'select',
						'label'     => esc_html__( 'Categories', 'visual-portfolio' ),
						'multiple'  => true,
						'creatable' => true,
					),
					'format' => array(
						'type'    => 'select',
						'label'   => esc_html__( 'Format', 'visual-portfolio' ),
						'default' => 'standard',
						'options' => array(
							'standard' => esc_html__( 'Standard', 'visual-portfolio' ),
							'video'    => esc_html__( 'Video', 'visual-portfolio' ),
						),
					),
					'video_url' => array(
						'type'        => 'text',
						'label'       => esc_html__( 'Video URL', 'visual-portfolio' ),
						'placeholder' => esc_html__( 'https://...', 'visual-portfolio' ),
						'description' => esc_html__( 'Full list of supported links', 'visual-portfolio' ) . '&nbsp;<a href="https://visualportfolio.co/docs/projects/video-project/#supported-video-vendors" target="_blank" rel="noopener noreferrer">' . esc_html__( 'see here', 'visual-portfolio' ) . '</a>',
						'condition'   => array(
							array(
								'control' => 'SELF.format',
								'value'   => 'video',
							),
						),
					),
					'url' => array(
						'type'        => 'text',
						'label'       => esc_html__( 'URL', 'visual-portfolio' ),
						'description' => esc_html__( 'By default used full image url, you can use custom one', 'visual-portfolio' ),
						'placeholder' => esc_html__( 'https://...', 'visual-portfolio' ),
					),
					'author' => array(
						'type'    => 'text',
						'label'   => esc_html__( 'Author Name', 'visual-portfolio' ),
						'default' => '',
					),
					'author_url' => array(
						'type'    => 'text',
						'label'   => esc_html__( 'Author URL', 'visual-portfolio' ),
						'default' => '',
					),
					'image_settings_pro_note' => array(
						'type'        => 'pro_note',
						'label'       => esc_html__( 'Premium Only', 'visual-portfolio' ),
						'description' => '<ul>
                                            <li>' . esc_html__( 'Support for Audio format', 'visual-portfolio' ) . '</li>
                                            <li>' . esc_html__( 'Custom image for Popup', 'visual-portfolio' ) . '</li>
                                            <li>' . esc_html__( 'Custom image for hover state', 'visual-portfolio' ) . '</li>
                                            <li>' . esc_html__( 'etc...', 'visual-portfolio' ) . '</li>
                                        </ul>',
					),
				),
				'default'         => array(
					/**
					 * Array items:
					 * id - image id.
					 * title - image title.
					 * description - image description.
					 * categories - categories array.
					 * format - image format [standard,video].
					 * video_url - video url.
					 */
				),
			)
		);
		Visual_Portfolio_Controls::register(
			array(
				'category'      => 'content-source-images',
				'type'          => 'select',
				'label'         => esc_html__( 'Items Title Source', 'visual-portfolio' ),
				'name'          => 'images_titles_source',
				'group'         => 'images_titles_source',
				'default'       => 'custom',
				'options'       => array(
					'none'        => esc_html__( 'None', 'visual-portfolio' ),
					'custom'      => esc_html__( 'Custom', 'visual-portfolio' ),
					'title'       => esc_html__( 'Image Title', 'visual-portfolio' ),
					'caption'     => esc_html__( 'Image Caption', 'visual-portfolio' ),
					'alt'         => esc_html__( 'Image Alt', 'visual-portfolio' ),
					'description' => esc_html__( 'Image Description', 'visual-portfolio' ),
				),
			)
		);
		Visual_Portfolio_Controls::register(
			array(
				'category'      => 'content-source-images',
				'type'          => 'select',
				'label'         => esc_html__( 'Items Description Source', 'visual-portfolio' ),
				'name'          => 'images_descriptions_source',
				'group'         => 'images_titles_source',
				'default'       => 'custom',
				'options'       => array(
					'none'        => esc_html__( 'None', 'visual-portfolio' ),
					'custom'      => esc_html__( 'Custom', 'visual-portfolio' ),
					'title'       => esc_html__( 'Image Title', 'visual-portfolio' ),
					'caption'     => esc_html__( 'Image Caption', 'visual-portfolio' ),
					'alt'         => esc_html__( 'Image Alt', 'visual-portfolio' ),
					'description' => esc_html__( 'Image Description', 'visual-portfolio' ),
				),
			)
		);
		Visual_Portfolio_Controls::register(
			array(
				'category'      => 'content-source-images',
				'type'          => 'select',
				'label'         => esc_html__( 'Order by', 'visual-portfolio' ),
				'name'          => 'images_order_by',
				'group'         => 'images_order',
				'default'       => 'default',
				'options'       => array(
					'default' => esc_html__( 'Default', 'visual-portfolio' ),
					'date'    => esc_html__( 'Uploaded', 'visual-portfolio' ),
					'title'   => esc_html__( 'Title', 'visual-portfolio' ),
					'rand'    => esc_html__( 'Random', 'visual-portfolio' ),
				),
			)
		);
		Visual_Portfolio_Controls::register(
			array(
				'category'      => 'content-source-images',
				'type'          => 'radio',
				'label'         => esc_html__( 'Order Direction', 'visual-portfolio' ),
				'name'          => 'images_order_direction',
				'group'         => 'images_order',
				'default'       => 'asc',
				'options'       => array(
					'asc'  => esc_html__( 'ASC', 'visual-portfolio' ),
					'desc' => esc_html__( 'DESC', 'visual-portfolio' ),
				),
			)
		);

		/**
		 * Content Source Protection.
		 */
		Visual_Portfolio_Controls::register(
			array(
				'category'    => 'content-protection',
				'type'        => 'pro_note',
				'name'        => 'protection_pro_note',
				'label'       => esc_html__( 'Premium Only', 'visual-portfolio' ),
				'description' => '<p>' . esc_html__( 'Protect your works using watermarks, password, and age gate', 'visual-portfolio' ) . '</p>',
				'condition'   => array(
					array(
						'control'  => 'content_source',
						'operator' => '!==',
						'value'    => 'social-stream',
					),
				),
			)
		);

		/**
		 * Content Source Social Stream.
		 */
		Visual_Portfolio_Controls::register(
			array(
				'category'     => 'content-source-social-stream',
				'type'         => 'pro_note',
				'name'         => 'social_pro_note',
				'label'        => esc_html__( 'Premium Only', 'visual-portfolio' ),
				'description'  => '<p>' . esc_html__( 'Display social feeds such as Instagram, Youtube, Flickr, Twitter, etc...', 'visual-portfolio' ) . '</p>',
				'setup_wizard' => true,
			)
		);

		/**
		 * Content Source General Settings.
		 */
		Visual_Portfolio_Controls::register(
			array(
				'category'  => 'content-source-general',
				'type'      => 'number',
				'label'     => esc_html__( 'Items Per Page', 'visual-portfolio' ),
				'name'      => 'items_count',
				'default'   => 6,
				'min'       => 1,
				'condition' => array(
					array(
						array(
							'control'  => 'content_source',
							'operator' => '!==',
							'value'    => 'post-based',
						),
						// AND.
						array(
							'control'  => 'posts_source',
							'operator' => '!==',
							'value'    => 'current_query',
						),
					),
				),
			)
		);

		Visual_Portfolio_Controls::register(
			array(
				'category' => 'content-source-general',
				'type'     => 'buttons',
				'label'    => esc_html__( 'No Items Action', 'visual-portfolio' ),
				'name'     => 'no_items_action',
				'group'    => 'no_items_action',
				'default'  => 'notice',
				'options'  => array(
					'notice' => esc_html__( 'Notice', 'visual-portfolio' ),
					'hide'   => esc_html__( 'Hide', 'visual-portfolio' ),
				),
			)
		);
		Visual_Portfolio_Controls::register(
			array(
				'category'    => 'content-source-general',
				'type'        => 'textarea',
				'placeholder' => esc_html__( 'Notice', 'visual-portfolio' ),
				'name'        => 'no_items_notice',
				'group'       => 'no_items_action',
				'default'     => esc_html__( 'No items were found matching your selection.', 'visual-portfolio' ),
				'wpml'        => true,
				'condition'   => array(
					array(
						'control'  => 'no_items_action',
						'operator' => '===',
						'value'    => 'notice',
					),
				),
			)
		);
		Visual_Portfolio_Controls::register(
			array(
				'category'    => 'content-source-general',
				'type'        => 'html',
				'description' => esc_html__( 'Note: you will see the notice in the preview. Block will be hidden in the site frontend.', 'visual-portfolio' ),
				'name'        => 'no_items_action_hide_info',
				'group'       => 'no_items_action',
				'condition'   => array(
					array(
						'control'  => 'no_items_action',
						'operator' => '===',
						'value'    => 'hide',
					),
				),
			)
		);

		Visual_Portfolio_Controls::register(
			array(
				'category'      => 'content-source-general',
				'type'          => 'checkbox',
				'alongside'     => esc_html__( 'Stretch', 'visual-portfolio' ),
				'name'          => 'stretch',
				'default'       => false,
				'reload_iframe' => false,
				'description'   => esc_attr__( 'Break container and display it wide. This option helpful for 3rd-party page builders, in the Gutenberg themes you can use the built in Wide and Fullwidth features.', 'visual-portfolio' ),
			)
		);

		/**
		 * Layouts.
		 */
		$layouts = Visual_Portfolio_Get::get_all_layouts();

		// Layouts selector.
		$layouts_selector = array();
		foreach ( $layouts as $name => $layout ) {
			$layouts_selector[ $name ] = array(
				'value' => $name,
				'title' => $layout['title'],
				'icon'  => isset( $layout['icon'] ) ? $layout['icon'] : '',
			);
		}

		Visual_Portfolio_Controls::register(
			array(
				'category' => 'layouts',
				'type'     => 'icons_selector',
				'name'     => 'layout',
				'default'  => 'tiles',
				'options'  => $layouts_selector,
			)
		);

		// layouts options.
		foreach ( $layouts as $name => $layout ) {
			if ( ! isset( $layout['controls'] ) ) {
				continue;
			}
			foreach ( $layout['controls'] as $field ) {
				$field['category'] = 'layouts';
				$field['name']     = $name . '_' . $field['name'];

				// condition names prefix fix.
				if ( isset( $field['condition'] ) ) {
					foreach ( $field['condition'] as $k => $cond ) {
						if ( isset( $cond['control'] ) ) {
							if ( strpos( $cond['control'], 'GLOBAL_' ) === 0 ) {
								$field['condition'][ $k ]['control'] = str_replace( 'GLOBAL_', '', $cond['control'] );
							} else {
								$field['condition'][ $k ]['control'] = $name . '_' . $cond['control'];
							}
						}
					}
				}

				$field['condition'] = array_merge(
					isset( $field['condition'] ) ? $field['condition'] : array(),
					array(
						array(
							'control' => 'layout',
							'value'   => $name,
						),
					)
				);
				Visual_Portfolio_Controls::register( $field );
			}
		}

		Visual_Portfolio_Controls::register(
			array(
				'category'      => 'layouts',
				'type'          => 'range',
				'label'         => esc_html__( 'Gap', 'visual-portfolio' ),
				'name'          => 'items_gap',
				'group'         => 'layout_items_gap',
				'default'       => 15,
				'min'           => 0,
				'max'           => 200,
				'reload_iframe' => false,
				'style'         => array(
					array(
						'element'  => '.vp-portfolio__items',
						'property' => '--vp-items__gap',
						'mask'     => '$px',
					),
				),
			)
		);
		Visual_Portfolio_Controls::register(
			array(
				'category'      => 'layouts',
				'type'          => 'range',
				'label'         => esc_html__( 'Vertical Gap', 'visual-portfolio' ),
				'description'   => esc_html__( 'When empty, used Gap option', 'visual-portfolio' ),
				'name'          => 'items_gap_vertical',
				'group'         => 'layout_items_gap',
				'default'       => '',
				'min'           => 0,
				'max'           => 200,
				'reload_iframe' => false,
				'style'         => array(
					array(
						'element'  => '.vp-portfolio__items',
						'property' => '--vp-items__gap-vertical',
						'mask'     => '$px',
					),
				),
				'condition'     => array(
					array(
						'control'  => 'layout',
						'operator' => '!==',
						'value'    => 'slider',
					),
				),
			)
		);

		/**
		 * Items Style
		 */
		$items_styles = Visual_Portfolio_Get::get_all_items_styles();

		// Styles selector.
		$items_styles_selector = array();
		foreach ( $items_styles as $style_name => $style ) {
			$items_styles_selector[ $style_name ] = array(
				'value'                => $style_name,
				'title'                => $style['title'],
				'icon'                 => isset( $style['icon'] ) ? $style['icon'] : '',
				'image_preview_wizard' => isset( $style['image_preview_wizard'] ) ? $style['image_preview_wizard'] : '',
			);
		}

		Visual_Portfolio_Controls::register(
			array(
				'category'      => 'items-style',
				'type'          => 'icons_selector',
				'name'          => 'items_style',
				'default'       => 'fade',
				'collapse_rows' => 2,
				'options'       => $items_styles_selector,
				'setup_wizard'  => true,
			)
		);
		Visual_Portfolio_Controls::register(
			array(
				'category'    => 'items-style',
				'type'        => 'category_navigator',
				'name'        => 'items_style_subcategory',
				'initialOpen' => 'items-style-general',
				'options'     => array(
					array(
						'title'    => esc_html__( 'General', 'visual-portfolio' ),
						'category' => 'items-style-general',
					),
					array(
						'title'    => esc_html__( 'Image', 'visual-portfolio' ),
						'category' => 'items-style-image',
					),
					array(
						'title'    => esc_html__( 'Overlay', 'visual-portfolio' ),
						'category' => 'items-style-overlay',
					),
					array(
						'title'    => esc_html__( 'Caption', 'visual-portfolio' ),
						'category' => 'items-style-caption',
					),
				),
			)
		);

		$builtin_default_options = array(
			'image'   => array(
				'border_radius' => true,
				'transform'     => false, // Pro.
				'css_filter'    => false, // Pro.
			),
			'overlay' => array(
				'states'         => true,

				// All available align values: 'horizontal'|'vertical'|'box'.
				'text_align'     => 'box',

				'under_image'    => false, // Pro.

				// Elements.
				'elements'       => array(
					'title'          => false,
					'categories'     => false,
					'date'           => false,
					'author'         => false,
					'comments_count' => false,
					'views_count'    => false,
					'reading_time'   => false,
					'excerpt'        => false,
					'read_more'      => false,
					'icons'          => false,
				),

				// Colors.
				'colors'         => array(
					'background'     => true,
					'text'           => true,
					'links'          => false,
					'mix_blend_mode' => false,   // Pro.
				),

				// Typography Pro.
				'typography'     => array(
					'title'       => false,
					'category'    => false,
					'meta'        => false,
					'description' => false,
					'button'      => false,
				),

				// Dimensions Pro.
				'dimensions'     => array(
					'border_radius'  => false,
					'padding'        => false,
					'margin'         => false,
					'items_gap'      => false,
				),
			),
			'caption' => array(
				'states'         => true,

				// All available align values: 'horizontal'|'vertical'|'box'.
				'text_align'     => 'horizontal',

				'under_image'    => false, // Pro.

				// Elements.
				'elements'       => array(
					'title'          => false,
					'categories'     => false,
					'date'           => false,
					'author'         => false,
					'comments_count' => false,
					'views_count'    => false,
					'reading_time'   => false,
					'excerpt'        => false,
					'read_more'      => false,
					'icons'          => false,
				),

				// Colors.
				'colors'         => array(
					'background'     => false,
					'text'           => true,
					'links'          => true,
					'mix_blend_mode' => false,   // Pro.
				),

				// Typography Pro.
				'typography'     => array(
					'title'       => false,
					'category'    => false,
					'meta'        => false,
					'description' => false,
					'button'      => false,
				),

				// Dimensions Pro.
				'dimensions'     => array(
					'border_radius'  => false,
					'padding'        => false,
					'margin'         => false,
					'items_gap'      => false,
				),
			),
		);
		$builtin_default_options = apply_filters( 'vpf_items_style_builtin_controls_options', $builtin_default_options );

		// styles builtin options.
		foreach ( $items_styles as $style_name => $style ) {
			$builtin_fields = array();

			if ( ! empty( $style['builtin_controls'] ) ) {
				foreach ( $builtin_default_options as $category_name => $default_options ) {
					if ( empty( $style['builtin_controls'][ $category_name ] ) || ! $style['builtin_controls'][ $category_name ] ) {
						continue;
					}

					$options = $style['builtin_controls'][ $category_name ];

					$new_fields = array();

					switch ( $category_name ) {
						// Image.
						case 'image':
							$new_fields[] = array(
								'type'     => 'category_toggle_group',
								'category' => 'items-style-image',
								'name'     => 'items_style_image_states',
								'options'  => array(
									array(
										'title'    => esc_html__( 'Normal', 'visual-portfolio' ),
										'category' => 'items-style-image-normal',
									),
									array(
										'title'    => esc_html__( 'Hover', 'visual-portfolio' ),
										'category' => 'items-style-image-hover',
									),
								),
							);

							if ( isset( $options['border_radius'] ) && $options['border_radius'] ) {
								$new_fields[] = array(
									'type'     => 'unit',
									'category' => 'items-style-image-normal',
									'label'    => esc_html__( 'Border Radius', 'visual-portfolio' ),
									'name'     => 'images_rounded_corners',
									'default'  => '',
									'style'    => array(
										array(
											'element'  => '.vp-portfolio__items-style-' . $style_name,
											'property' => '--vp-items-style-' . $style_name . '--image__border-radius',
										),
									),
								);
							}

							if ( isset( $options['transform'] ) && $options['transform'] && isset( $options['css_filter'] ) && $options['css_filter'] ) {
								$new_fields[] = array(
									'type'        => 'pro_note',
									'category'    => 'items-style-image-normal',
									'name'        => 'additional_image_skin_settings_pro',
									'label'       => esc_html__( 'Premium Only', 'visual-portfolio' ),
									'description' => 'Apply Instagram-like filters, change image transform',
								);
								$new_fields[] = array(
									'type'        => 'pro_note',
									'category'    => 'items-style-image-hover',
									'name'        => 'additional_image_hover_skin_settings_pro',
									'label'       => esc_html__( 'Premium Only', 'visual-portfolio' ),
									'description' => 'Apply Instagram-like filters, change image transform and border radius for both default and hover states',
								);
							}
							break;

						// Overlay / Caption.
						case 'overlay':
						case 'caption':
							if ( isset( $options['states'] ) && $options['states'] ) {
								$new_fields[] = array(
									'type'     => 'select',
									'category' => 'items-style-' . $category_name,
									'label'    => esc_html__( 'Display', 'visual-portfolio' ),
									'name'     => 'show_' . $category_name,
									'default'  => 'hover',
									'options'  => array(
										'hover'   => esc_html__( 'Hover State Only', 'visual-portfolio' ),
										'default' => esc_html__( 'Default State Only', 'visual-portfolio' ),
										'always'  => esc_html__( 'Always', 'visual-portfolio' ),
									),
								);
							}

							if ( isset( $options['text_align'] ) && $options['text_align'] ) {
								$new_fields[] = array(
									'type'     => 'align',
									'category' => 'items-style-' . $category_name,
									'label'    => esc_html__( 'Text Align', 'visual-portfolio' ),
									'name'     => $category_name . '_text_align',
									'default'  => 'center',
									'options'  => $options['text_align'],
								);
							}

							$new_fields[] = array(
								'type'     => 'category_collapse',
								'category' => 'items-style-' . $category_name,
								'name'     => 'items_style_' . $category_name . '_subcategory',
								'options'  => array(
									array(
										'title'    => esc_html__( 'Elements', 'visual-portfolio' ),
										'category' => 'items-style-' . $category_name . '-elements',
									),
									array(
										'title'    => esc_html__( 'Colors', 'visual-portfolio' ),
										'category' => 'items-style-' . $category_name . '-colors',
									),
									array(
										'title'    => esc_html__( 'Typography', 'visual-portfolio' ),
										'category' => 'items-style-' . $category_name . '-typography',
									),
									array(
										'title'    => esc_html__( 'Dimensions', 'visual-portfolio' ),
										'category' => 'items-style-' . $category_name . '-dimensions',
									),
								),
							);

							// Elements.
							if ( ! empty( $options['elements'] ) ) {
								$elements = $options['elements'];

								if ( isset( $elements['title'] ) && $elements['title'] ) {
									$new_fields[] = array(
										'type'      => 'checkbox',
										'category'  => 'items-style-' . $category_name . '-elements',
										'alongside' => esc_html__( 'Display Title', 'visual-portfolio' ),
										'name'      => 'show_title',
										'group'     => 'items_style_title',
										'default'   => true,
									);
									$new_fields[] = array(
										'type'      => 'select',
										'category'  => 'items-style-' . $category_name . '-elements',
										'label'     => esc_html__( 'Title Tag', 'visual-portfolio' ),
										'name'      => 'title_tag',
										'group'     => 'items_style_title',
										'default'   => 'h2',
										'options'   => array(
											'div' => '<div>',
											'h1'  => '<h1>',
											'h2'  => '<h2>',
											'h3'  => '<h3>',
											'h4'  => '<h4>',
											'h5'  => '<h5>',
											'h6'  => '<h6>',
										),
										'condition' => array(
											array(
												'control' => 'show_title',
											),
										),
									);
								}

								if ( isset( $elements['categories'] ) && $elements['categories'] ) {
									$new_fields[] = array(
										'type'      => 'checkbox',
										'category'  => 'items-style-' . $category_name . '-elements',
										'alongside' => esc_html__( 'Display Categories', 'visual-portfolio' ),
										'name'      => 'show_categories',
										'group'     => 'items_style_categories',
										'default'   => true,
									);
									$new_fields[] = array(
										'type'      => 'range',
										'category'  => 'items-style-' . $category_name . '-elements',
										'label'     => esc_html__( 'Categories Count', 'visual-portfolio' ),
										'name'      => 'categories_count',
										'group'     => 'items_style_categories',
										'min'       => 1,
										'max'       => 20,
										'default'   => 1,
										'condition' => array(
											array(
												'control' => 'show_categories',
											),
										),
									);
								}

								if ( isset( $elements['date'] ) && $elements['date'] ) {
									$new_fields[] = array(
										'type'     => 'select',
										'category' => 'items-style-' . $category_name . '-elements',
										'label'    => esc_html__( 'Display Date', 'visual-portfolio' ),
										'name'     => 'show_date',
										'group'    => 'items_style_date',
										'default'  => 'false',
										'options'  => array(
											'false' => esc_html__( 'Hide', 'visual-portfolio' ),
											'true'  => esc_html__( 'Default', 'visual-portfolio' ),
											'human' => esc_html__( 'Human Format', 'visual-portfolio' ),
										),
									);
									$new_fields[] = array(
										'type'        => 'text',
										'category'    => 'items-style-' . $category_name . '-elements',
										'name'        => 'date_format',
										'group'       => 'items_style_date',
										'default'     => 'F j, Y',
										'description' => esc_attr__( 'Date format example: F j, Y', 'visual-portfolio' ),
										'wpml'        => true,
										'condition'   => array(
											array(
												'control' => 'show_date',
											),
										),
									);
								}

								if ( isset( $elements['author'] ) && $elements['author'] ) {
									$new_fields[] = array(
										'type'      => 'checkbox',
										'category'  => 'items-style-' . $category_name . '-elements',
										'alongside' => esc_html__( 'Display Author', 'visual-portfolio' ),
										'name'      => 'show_author',
										'default'   => false,
									);
								}

								if ( isset( $elements['comments_count'] ) && $elements['comments_count'] ) {
									$new_fields[] = array(
										'type'      => 'checkbox',
										'category'  => 'items-style-' . $category_name . '-elements',
										'alongside' => esc_html__( 'Display Comments Count', 'visual-portfolio' ),
										'name'      => 'show_comments_count',
										'default'   => false,
										'condition' => array(
											array(
												'control' => 'GLOBAL_content_source',
												'value'   => 'post-based',
											),
										),
									);
								}

								if ( isset( $elements['views_count'] ) && $elements['views_count'] ) {
									$new_fields[] = array(
										'type'      => 'checkbox',
										'category'  => 'items-style-' . $category_name . '-elements',
										'alongside' => esc_html__( 'Display Views Count', 'visual-portfolio' ),
										'name'      => 'show_views_count',
										'default'   => false,
										'condition' => array(
											array(
												'control' => 'GLOBAL_content_source',
												'value'   => 'post-based',
											),
										),
									);
								}

								if ( isset( $elements['reading_time'] ) && $elements['reading_time'] ) {
									$new_fields[] = array(
										'type'      => 'checkbox',
										'category'  => 'items-style-' . $category_name . '-elements',
										'alongside' => esc_html__( 'Display Reading Time', 'visual-portfolio' ),
										'name'      => 'show_reading_time',
										'default'   => false,
										'condition' => array(
											array(
												'control' => 'GLOBAL_content_source',
												'value'   => 'post-based',
											),
										),
									);
								}

								if ( isset( $elements['excerpt'] ) && $elements['excerpt'] ) {
									$new_fields[] = array(
										'type'      => 'checkbox',
										'category'  => 'items-style-' . $category_name . '-elements',
										'alongside' => esc_html__( 'Display Excerpt', 'visual-portfolio' ),
										'name'      => 'show_excerpt',
										'group'     => 'items_style_excerpt',
										'default'   => false,
									);
									$new_fields[] = array(
										'type'      => 'number',
										'category'  => 'items-style-' . $category_name . '-elements',
										'label'     => esc_html__( 'Excerpt Words Count', 'visual-portfolio' ),
										'name'      => 'excerpt_words_count',
										'group'     => 'items_style_excerpt',
										'default'   => 15,
										'min'       => 1,
										'max'       => 200,
										'condition' => array(
											array(
												'control' => 'show_excerpt',
											),
										),
									);
								}

								if ( isset( $elements['read_more'] ) && $elements['read_more'] ) {
									$new_fields[] = array(
										'type'     => 'select',
										'category' => 'items-style-' . $category_name . '-elements',
										'label'    => esc_html__( 'Display Read More Button', 'visual-portfolio' ),
										'name'     => 'show_read_more',
										'group'    => 'items_style_read_more',
										'default'  => 'false',
										'options'  => array(
											'false'    => esc_html__( 'Hide', 'visual-portfolio' ),
											'true'     => esc_html__( 'Always Display', 'visual-portfolio' ),
											'more_tag' => esc_html__( 'Display when used `More tag` in the post', 'visual-portfolio' ),
										),
									);
									$new_fields[] = array(
										'type'        => 'text',
										'category'    => 'items-style-' . $category_name . '-elements',
										'name'        => 'read_more_label',
										'group'       => 'items_style_read_more',
										'default'     => 'Read More',
										'description' => esc_attr__( 'Read More button label', 'visual-portfolio' ),
										'wpml'        => true,
										'condition'   => array(
											array(
												'control'  => 'show_read_more',
												'operator' => '!=',
												'value'    => 'false',
											),
										),
									);
								}

								if ( isset( $elements['icons'] ) && $elements['icons'] ) {
									$new_fields[] = array(
										'type'      => 'checkbox',
										'category'  => 'items-style-' . $category_name . '-elements',
										'alongside' => esc_html__( 'Display Icon', 'visual-portfolio' ),
										'name'      => 'show_icon',
										'default'   => false,
									);
								}
							}

							// Colors.
							if ( ! empty( $options['colors'] ) ) {
								$has_background = isset( $options['colors']['background'] ) && $options['colors']['background'];
								$has_text       = isset( $options['colors']['text'] ) && $options['colors']['text'];
								$has_links      = isset( $options['colors']['links'] ) && $options['colors']['links'];
								$has_blend_mode = isset( $options['colors']['mix_blend_mode'] ) && $options['colors']['mix_blend_mode'];

								if ( $has_background ) {
									$new_fields[] = array(
										'type'     => 'color',
										'category' => 'items-style-' . $category_name . '-colors',
										'label'    => esc_html__( 'Background', 'visual-portfolio' ),
										'name'     => $category_name . '_bg_color',
										'alpha'    => true,
										'gradient' => true,
										'style'    => array(
											array(
												'element'  => '.vp-portfolio__items-style-' . $style_name,
												'property' => '--vp-items-style-' . $style_name . '--' . $category_name . '__background',
											),
										),
									);
								}

								if ( $has_text ) {
									$new_fields[] = array(
										'type'     => 'color',
										'category' => 'items-style-' . $category_name . '-colors',
										'label'    => esc_html__( 'Text', 'visual-portfolio' ),
										'name'     => $category_name . '_text_color',
										'alpha'    => true,
										'style'    => array(
											array(
												'element'  => '.vp-portfolio__items-style-' . $style_name,
												'property' => '--vp-items-style-' . $style_name . '--' . $category_name . '__color',
											),
										),
									);
								}

								if ( $has_links ) {
									$new_fields[] = array(
										'type'     => 'color',
										'category' => 'items-style-' . $category_name . '-colors',
										'label'    => esc_html__( 'Links', 'visual-portfolio' ),
										'name'     => $category_name . '_links_color',
										'alpha'    => true,
										'style'    => array(
											array(
												'element'  => '.vp-portfolio__items-style-' . $style_name,
												'property' => '--vp-items-style-' . $style_name . '--' . $category_name . '-links__color',
											),
										),
									);
									$new_fields[] = array(
										'type'     => 'color',
										'category' => 'items-style-' . $category_name . '-colors',
										'label'    => esc_html__( 'Links Hover', 'visual-portfolio' ),
										'name'     => $category_name . '_links_hover_color',
										'alpha'    => true,
										'style'    => array(
											array(
												'element'  => '.vp-portfolio__items-style-' . $style_name,
												'property' => '--vp-items-style-' . $style_name . '--' . $category_name . '-links-hover__color',
											),
										),
									);
								}

								// Mix Blend Mode Pro.
								if ( $has_blend_mode ) {
									$new_fields[] = array(
										'type'        => 'pro_note',
										'category'    => 'items-style-' . $category_name . '-colors',
										'name'        => 'additional_' . $category_name . '_mix_blend_mode_skin_settings_pro',
										'label'       => esc_html__( 'Premium Only', 'visual-portfolio' ),
										'description' => 'Select blend mode layer effects such as Normal, Multiply, Screen, Overlay, and more',
									);
								}
							}

							// Typography.
							if ( ! empty( $options['typography'] ) ) {
								$new_fields[] = array(
									'type'        => 'pro_note',
									'category'    => 'items-style-' . $category_name . '-typography',
									'name'        => 'additional_' . $category_name . '_typography_skin_settings_pro',
									'label'       => esc_html__( 'Premium Only', 'visual-portfolio' ),
									'description' => 'Manage fonts, sizing, and appearance of distinct text components within the Skin',
								);
							}

							// Dimensions.
							if ( ! empty( $options['dimensions'] ) ) {
								$has_border_radius = isset( $options['dimensions']['border_radius'] ) && $options['dimensions']['border_radius'];
								$has_padding       = isset( $options['dimensions']['padding'] ) && $options['dimensions']['padding'];
								$has_margin        = isset( $options['dimensions']['margin'] ) && $options['dimensions']['margin'];
								$has_items_gap     = isset( $options['dimensions']['items_gap'] ) && $options['dimensions']['items_gap'];

								$dimensions_list = array();

								if ( $has_border_radius ) {
									$dimensions_list[] = 'border radius';
								}
								if ( $has_padding ) {
									$dimensions_list[] = 'padding';
								}
								if ( $has_margin ) {
									$dimensions_list[] = 'margin';
								}
								if ( $has_items_gap ) {
									$dimensions_list[] = 'gap between elements';
								}

								$new_fields[] = array(
									'type'        => 'pro_note',
									'category'    => 'items-style-' . $category_name . '-dimensions',
									'name'        => 'additional_' . $category_name . '_dimensions_skin_settings_pro',
									'label'       => esc_html__( 'Premium Only', 'visual-portfolio' ),
									'description' => 'Adjust element spacing and dimensions such as ' . implode( ', ', $dimensions_list ),
								);
							}
							break;
						// no default.
					}

					$builtin_fields = array_merge( $builtin_fields, apply_filters( 'vpf_items_style_builtin_controls', $new_fields, $category_name, $options, $style_name, $style ) );
				}
			}

			$items_styles[ $style_name ]['controls'] = array_merge( $builtin_fields, isset( $style['controls'] ) ? $style['controls'] : array() );
		}

		// styles options.
		foreach ( $items_styles as $style_name => $style ) {
			if ( ! isset( $style['controls'] ) ) {
				continue;
			}
			foreach ( $style['controls'] as $field ) {
				$field['category'] = $field['category'] ?? 'items-style';
				$field['name']     = 'items_style_' . $style_name . '__' . $field['name'];

				// condition names prefix fix.
				if ( isset( $field['condition'] ) ) {
					$loop_over_conditions = function( $field_cond ) use ( &$loop_over_conditions, $style_name ) {
						if ( is_array( $field_cond ) && ! isset( $field_cond['control'] ) ) {
							foreach ( $field_cond as $k => $inner_cond ) {
								$field_cond[ $k ] = $loop_over_conditions( $inner_cond );
							}
						} elseif ( isset( $field_cond['control'] ) ) {
							if ( strpos( $field_cond['control'], 'GLOBAL_' ) === 0 ) {
								$field_cond['control'] = str_replace( 'GLOBAL_', '', $field_cond['control'] );
							} else {
								$field_cond['control'] = 'items_style_' . $style_name . '__' . $field_cond['control'];
							}
						}

						return $field_cond;
					};

					$field['condition'] = $loop_over_conditions( $field['condition'] );
				}

				$field['condition'] = array_merge(
					isset( $field['condition'] ) ? $field['condition'] : array(),
					array(
						array(
							'control' => 'items_style',
							'value'   => $style_name,
						),
					)
				);
				Visual_Portfolio_Controls::register( $field );
			}
		}

		/**
		 * Items Click Action
		 */
		Visual_Portfolio_Controls::register(
			array(
				'category' => 'items-click-action',
				'type'     => 'icons_selector',
				'name'     => 'items_click_action',
				'default'  => 'url',
				'options'  => array(
					array(
						'value' => 'false',
						'title' => esc_html__( 'Disabled', 'visual-portfolio' ),
						'icon'  => '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="0.75" y="0.75" width="18.5" height="18.5" rx="9.25" stroke="currentColor" stroke-width="1.5" fill="transparent"/><line x1="0.75" y1="-0.75" x2="18.2409" y2="-0.75" transform="matrix(0.707107 0.707107 0.707107 -0.707107 4.15475 3.14285)" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/></svg>',
					),
					array(
						'value' => 'url',
						'title' => esc_html__( 'URL', 'visual-portfolio' ),
						'icon'  => '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M8.28572 10.9975C8.67611 11.53 9.17418 11.9706 9.74614 12.2894C10.3181 12.6082 10.9506 12.7978 11.6007 12.8453C12.2508 12.8928 12.9033 12.7971 13.5139 12.5647C14.1246 12.3323 14.6791 11.9686 15.1399 11.4983L17.867 8.71597C18.6949 7.84137 19.153 6.66999 19.1427 5.45411C19.1323 4.23824 18.6543 3.07515 17.8116 2.21537C16.9689 1.35558 15.8289 0.867884 14.6372 0.857319C13.4454 0.846753 12.2973 1.31416 11.4401 2.15888L9.87654 3.74482" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><path d="M11.7143 9.0025C11.3239 8.47002 10.8258 8.02943 10.2539 7.71061C9.68192 7.39179 9.04944 7.20221 8.39935 7.1547C7.74926 7.1072 7.09676 7.2029 6.4861 7.43531C5.87545 7.66771 5.32093 8.03139 4.86015 8.50167L2.13304 11.284C1.30509 12.1586 0.846963 13.33 0.857319 14.5459C0.867675 15.7618 1.34569 16.9248 2.1884 17.7846C3.03112 18.6444 4.17111 19.1321 5.36284 19.1427C6.55457 19.1532 7.7027 18.6858 8.55993 17.8411L10.1144 16.2552" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/></svg>',
					),
					array(
						'value' => 'popup_gallery',
						'title' => esc_html__( 'Popup', 'visual-portfolio' ),
						'icon'  => '<svg width="21" height="21" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="6.75" y="14.25" width="13.5" height="13.5" rx="1.25" transform="rotate(-90 6.75 14.25)" stroke="currentColor" stroke-width="1.5" fill="transparent"/><path d="M2 19L4.29088 16.7396" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><path d="M3 15.5L5.51523 15.5152L5.5 18" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/></svg>',
					),
					array(
						'value' => 'advanced',
						'title' => esc_html__( 'Advanced', 'visual-portfolio' ),
						'icon'  => '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3.3 19V12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M3.3 7V1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 19V11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M10 6V1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M16.6 19V14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M16.6 11V1" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M0.833328 11.6667H5.83333" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M7.5 6.66666H12.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M14.1667 13.3333H19.1667" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
					),
				),
			)
		);

		// url.
		Visual_Portfolio_Controls::register(
			array(
				'category'      => 'items-click-action',
				'type'          => 'radio',
				'label'         => esc_html__( 'Target', 'visual-portfolio' ),
				'name'          => 'items_click_action_url_target',
				'group'         => 'items_click_action_target',
				'default'       => '',
				'reload_iframe' => false,
				'options'       => array(
					''       => esc_html__( 'Default', 'visual-portfolio' ),
					'_blank' => esc_html__( 'New Tab (_blank)', 'visual-portfolio' ),
					'_top'   => esc_html__( 'Top Frame (_top)', 'visual-portfolio' ),
				),
				'condition'     => array(
					array(
						'control' => 'items_click_action',
						'value'   => 'url',
					),
				),
			)
		);
		Visual_Portfolio_Controls::register(
			array(
				'category'      => 'items-click-action',
				'type'          => 'text',
				'label'         => esc_html__( 'Rel', 'visual-portfolio' ),
				'name'          => 'items_click_action_url_rel',
				'group'         => 'items_click_action_target',
				'default'       => '',
				'reload_iframe' => false,
				'condition'     => array(
					array(
						'control' => 'items_click_action',
						'value'   => 'url',
					),
				),
			)
		);
		Visual_Portfolio_Controls::register(
			array(
				'category'    => 'items-click-action',
				'type'        => 'pro_note',
				'name'        => 'items_click_action_url_pro_note',
				'label'       => esc_html__( 'Premium Only', 'visual-portfolio' ),
				'description' => '<p>' . esc_html__( 'Link URL click priority', 'visual-portfolio' ) . '</p>',
				'condition'   => array(
					array(
						'control' => 'items_click_action',
						'value'   => 'url',
					),
				),
			)
		);

		// popup.
		Visual_Portfolio_Controls::register(
			array(
				'category'      => 'items-click-action',
				'type'          => 'select',
				'label'         => esc_html__( 'Title Source', 'visual-portfolio' ),
				'name'          => 'items_click_action_popup_title_source',
				'group'         => 'popup_title_source',
				'default'       => 'title',
				'reload_iframe' => false,
				'options'       => array(
					'none'             => esc_html__( 'None', 'visual-portfolio' ),
					'title'            => esc_html__( 'Image Title', 'visual-portfolio' ),
					'caption'          => esc_html__( 'Image Caption', 'visual-portfolio' ),
					'alt'              => esc_html__( 'Image Alt', 'visual-portfolio' ),
					'description'      => esc_html__( 'Image Description', 'visual-portfolio' ),
					'item_title'       => esc_html__( 'Item Title', 'visual-portfolio' ),
					'item_description' => esc_html__( 'Item Description', 'visual-portfolio' ),
					'item_author'      => esc_html__( 'Item Author', 'visual-portfolio' ),
				),
				'condition'     => array(
					array(
						'control' => 'items_click_action',
						'value'   => 'popup_gallery',
					),
				),
			)
		);
		Visual_Portfolio_Controls::register(
			array(
				'category'      => 'items-click-action',
				'type'          => 'select',
				'label'         => esc_html__( 'Description Source', 'visual-portfolio' ),
				'name'          => 'items_click_action_popup_description_source',
				'group'         => 'popup_title_source',
				'default'       => 'description',
				'reload_iframe' => false,
				'options'       => array(
					'none'             => esc_html__( 'None', 'visual-portfolio' ),
					'title'            => esc_html__( 'Image Title', 'visual-portfolio' ),
					'caption'          => esc_html__( 'Image Caption', 'visual-portfolio' ),
					'alt'              => esc_html__( 'Image Alt', 'visual-portfolio' ),
					'description'      => esc_html__( 'Image Description', 'visual-portfolio' ),
					'item_title'       => esc_html__( 'Item Title', 'visual-portfolio' ),
					'item_description' => esc_html__( 'Item Description', 'visual-portfolio' ),
					'item_author'      => esc_html__( 'Item Author', 'visual-portfolio' ),
				),
				'condition'     => array(
					array(
						'control' => 'items_click_action',
						'value'   => 'popup_gallery',
					),
				),
			)
		);
		Visual_Portfolio_Controls::register(
			array(
				'category'    => 'items-click-action',
				'type'        => 'pro_note',
				'name'        => 'items_click_action_popup_pro_note',
				'label'       => esc_html__( 'Premium Only', 'visual-portfolio' ),
				'description' => '<ul>
                                    <li>' . esc_html__( 'Manage media object priority', 'visual-portfolio' ) . '</li>
                                    <li>' . esc_html__( 'Quick View for posts and pages', 'visual-portfolio' ) . '</li>
                                    <li>' . esc_html__( 'Popup media item deep linking', 'visual-portfolio' ) . '</li>
                                    <li>' . esc_html__( 'etc...', 'visual-portfolio' ) . '</li>
                                </ul>',
				'condition'   => array(
					array(
						'control' => 'items_click_action',
						'value'   => 'popup_gallery',
					),
				),
			)
		);
		Visual_Portfolio_Controls::register(
			array(
				'category'    => 'items-click-action',
				'type'        => 'pro_note',
				'name'        => 'items_click_action_advanced_pro_note',
				'label'       => esc_html__( 'Premium Only', 'visual-portfolio' ),
				'description' => '<p>' . esc_html__( 'Deeply customize actions of clicks on different types of items and links.', 'visual-portfolio' ) . '</p>',
				'condition'   => array(
					array(
						'control' => 'items_click_action',
						'value'   => 'advanced',
					),
				),
			)
		);

		/**
		 * Layout Elements.
		 */
		Visual_Portfolio_Controls::register(
			array(
				'category'  => 'layout-elements',
				'type'      => 'elements_selector',
				'name'      => 'layout_elements',
				'locations' => array(
					'top'    => array(
						'title' => esc_html__( 'Start', 'visual-portfolio' ),
						'align' => array(
							'left',
							'center',
							'right',
							'between',
						),
					),
					'items'  => array(
						'title' => esc_html__( 'Middle', 'visual-portfolio' ),
					),
					'bottom' => array(
						'title' => esc_html__( 'End', 'visual-portfolio' ),
						'align' => array(
							'left',
							'center',
							'right',
							'between',
						),
					),
				),
				'default'   => array(
					'top'    => array(
						'elements' => array(),
						'align'    => 'center',
					),
					'items'  => array(
						'elements' => array( 'items' ),
					),
					'bottom' => array(
						'elements' => array(),
						'align'    => 'center',
					),
				),
				'options'   => array(
					'filter' => array(
						'title'             => esc_html__( 'Filter', 'visual-portfolio' ),
						'allowed_locations' => array( 'top' ),
						'category'          => 'filter',
						'render_callback'   => 'Visual_Portfolio_Get::filter',
					),
					'sort' => array(
						'title'             => esc_html__( 'Sort', 'visual-portfolio' ),
						'allowed_locations' => array( 'top' ),
						'category'          => 'sort',
						'render_callback'   => 'Visual_Portfolio_Get::sort',
					),
					'search' => array(
						'title'             => esc_html__( 'Search', 'visual-portfolio' ),
						'allowed_locations' => array( 'top' ),
						'category'          => 'search',
						'is_pro'            => true,
					),
					'items' => array(
						'title'             => esc_html__( 'Layout Items', 'visual-portfolio' ),
						'allowed_locations' => array( 'items' ),
						'category'          => 'layouts',
					),
					'pagination' => array(
						'title'             => esc_html__( 'Pagination', 'visual-portfolio' ),
						'allowed_locations' => array( 'bottom' ),
						'category'          => 'pagination',
						'render_callback'   => 'Visual_Portfolio_Get::pagination',
					),
				),
			)
		);

		/**
		 * Filter.
		 */
		$filters = array_merge(
			array(
				// Minimal.
				'minimal' => array(
					'title'    => esc_html__( 'Minimal', 'visual-portfolio' ),
					'icon'     => '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0.879261 8.13636V12.5H1.77415V9.64915H1.81037L2.93963 12.4787H3.54901L4.67827 9.6598H4.71449V12.5H5.60938V8.13636H4.47159L3.26989 11.0682H3.21875L2.01705 8.13636H0.879261ZM10.0194 8.13636H9.10103V10.8807H9.06268L7.17915 8.13636H6.3695V12.5H7.29208V9.75355H7.32404L9.22248 12.5H10.0194V8.13636ZM10.7816 8.13636V12.5H11.6765V9.64915H11.7127L12.842 12.4787H13.4513L14.5806 9.6598H14.6168V12.5H15.5117V8.13636H14.3739L13.1722 11.0682H13.1211L11.9194 8.13636H10.7816ZM16.2718 12.5H19.0652V11.7393H17.1944V8.13636H16.2718V12.5Z" fill="currentColor"/></svg>',
					'controls' => array(),
				),

				// Classic.
				'default' => array(
					'title'    => esc_html__( 'Classic', 'visual-portfolio' ),
					'icon'     => '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="0.75" y="5.89286" width="18.5" height="7.07143" rx="1.25" stroke="currentColor" stroke-width="1.5" fill="transparent"/><path d="M0.857143 11.1071V12.8214C0.857143 13.2948 1.2409 13.6786 1.71429 13.6786H18.2857C18.7591 13.6786 19.1429 13.2948 19.1429 12.8214V11.1071L19.5714 10.25C19.8081 10.25 20 10.4419 20 10.6786V12.8214C20 13.7682 19.2325 14.5357 18.2857 14.5357H1.71429C0.767512 14.5357 0 13.7682 0 12.8214V10.6786C0 10.4419 0.191878 10.25 0.428571 10.25L0.857143 11.1071Z" fill="currentColor"/></svg>',
					'controls' => array(),
				),

				// Dropdown.
				'dropdown' => array(
					'title'    => esc_html__( 'Dropdown', 'visual-portfolio' ),
					'icon'     => '<svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11 20.4286C16.2073 20.4286 20.4286 16.2073 20.4286 11C20.4286 5.79274 16.2073 1.57143 11 1.57143C5.79274 1.57143 1.57143 5.79274 1.57143 11C1.57143 16.2073 5.79274 20.4286 11 20.4286Z" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 9.85714L11 13.8571L15 9.85714" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/></svg>',
					'controls' => array(),
				),
			),
            // phpcs:ignore Squiz.PHP.CommentedOutCode.Found, Squiz.Commenting.BlockComment.NoEmptyLineBefore
			/*
			 * Example:
				array(
					'new_filter' => array(
						'title'    => esc_html__( 'New Filter', 'visual-portfolio' ),
						'controls' => array(
							... controls ...
						),
					),
				)
			 */
			apply_filters( 'vpf_extend_filters', array() )
		);

		// Extend specific filter controls.
		foreach ( $filters as $name => $filter ) {
			if ( isset( $filter['controls'] ) ) {
                // phpcs:ignore Squiz.PHP.CommentedOutCode.Found, Squiz.Commenting.BlockComment.NoEmptyLineBefore
				/*
				 * Example:
					array(
						... controls ...
					)
				 */
				$filters[ $name ]['controls'] = apply_filters( 'vpf_extend_filter_' . $name . '_controls', $filter['controls'] );
			}
		}

		// Filters selector.
		$filters_selector = array();
		foreach ( $filters as $name => $filter ) {
			$filters_selector[] = array(
				'value' => $name,
				'title' => $filter['title'],
				'icon'  => isset( $filter['icon'] ) ? $filter['icon'] : '',
			);
		}
		Visual_Portfolio_Controls::register(
			array(
				'category'     => 'filter',
				'type'         => 'icons_selector',
				'name'         => 'filter',
				'default'      => 'minimal',
				'options'      => $filters_selector,
				'setup_wizard' => true,
			)
		);

		// filters options.
		foreach ( $filters as $name => $filter ) {
			if ( ! isset( $filter['controls'] ) ) {
				continue;
			}
			foreach ( $filter['controls'] as $field ) {
				$field['category'] = 'filter';
				$field['name']     = 'filter_' . $name . '__' . $field['name'];

				// condition names prefix fix.
				if ( isset( $field['condition'] ) ) {
					foreach ( $field['condition'] as $k => $cond ) {
						if ( isset( $cond['control'] ) ) {
							if ( strpos( $cond['control'], 'GLOBAL_' ) === 0 ) {
								$field['condition'][ $k ]['control'] = str_replace( 'GLOBAL_', '', $cond['control'] );
							} else {
								$field['condition'][ $k ]['control'] = $name . '_' . $cond['control'];
							}
						}
					}
				}

				$field['condition'] = array_merge(
					isset( $field['condition'] ) ? $field['condition'] : array(),
					array(
						array(
							'control' => 'filter',
							'value'   => $name,
						),
					)
				);
				Visual_Portfolio_Controls::register( $field );
			}
		}

		Visual_Portfolio_Controls::register(
			array(
				'category'  => 'filter',
				'type'      => 'checkbox',
				'alongside' => esc_html__( 'Display Count', 'visual-portfolio' ),
				'name'      => 'filter_show_count',
				'default'   => false,
			)
		);
		Visual_Portfolio_Controls::register(
			array(
				'category' => 'filter',
				'type'     => 'text',
				'label'    => esc_html__( 'All Button Text', 'visual-portfolio' ),
				'name'     => 'filter_text_all',
				'default'  => esc_attr__( 'All', 'visual-portfolio' ),
				'wpml'     => true,
			)
		);

		/**
		 * Sort.
		 */
		$sorts = array_merge(
			array(
				// Minimal.
				'minimal' => array(
					'title'    => esc_html__( 'Minimal', 'visual-portfolio' ),
					'icon'     => '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0.879261 8.13636V12.5H1.77415V9.64915H1.81037L2.93963 12.4787H3.54901L4.67827 9.6598H4.71449V12.5H5.60938V8.13636H4.47159L3.26989 11.0682H3.21875L2.01705 8.13636H0.879261ZM10.0194 8.13636H9.10103V10.8807H9.06268L7.17915 8.13636H6.3695V12.5H7.29208V9.75355H7.32404L9.22248 12.5H10.0194V8.13636ZM10.7816 8.13636V12.5H11.6765V9.64915H11.7127L12.842 12.4787H13.4513L14.5806 9.6598H14.6168V12.5H15.5117V8.13636H14.3739L13.1722 11.0682H13.1211L11.9194 8.13636H10.7816ZM16.2718 12.5H19.0652V11.7393H17.1944V8.13636H16.2718V12.5Z" fill="currentColor"/></svg>',
					'controls' => array(),
				),

				// Classic.
				'default' => array(
					'title'    => esc_html__( 'Classic', 'visual-portfolio' ),
					'icon'     => '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="0.75" y="5.89286" width="18.5" height="7.07143" rx="1.25" stroke="currentColor" stroke-width="1.5" fill="transparent"/><path d="M0.857143 11.1071V12.8214C0.857143 13.2948 1.2409 13.6786 1.71429 13.6786H18.2857C18.7591 13.6786 19.1429 13.2948 19.1429 12.8214V11.1071L19.5714 10.25C19.8081 10.25 20 10.4419 20 10.6786V12.8214C20 13.7682 19.2325 14.5357 18.2857 14.5357H1.71429C0.767512 14.5357 0 13.7682 0 12.8214V10.6786C0 10.4419 0.191878 10.25 0.428571 10.25L0.857143 11.1071Z" fill="currentColor"/></svg>',
					'controls' => array(),
				),

				// Dropdown.
				'dropdown' => array(
					'title'    => esc_html__( 'Dropdown', 'visual-portfolio' ),
					'icon'     => '<svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11 20.4286C16.2073 20.4286 20.4286 16.2073 20.4286 11C20.4286 5.79274 16.2073 1.57143 11 1.57143C5.79274 1.57143 1.57143 5.79274 1.57143 11C1.57143 16.2073 5.79274 20.4286 11 20.4286Z" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 9.85714L11 13.8571L15 9.85714" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/></svg>',
					'controls' => array(),
				),
			),
            // phpcs:ignore Squiz.PHP.CommentedOutCode.Found, Squiz.Commenting.BlockComment.NoEmptyLineBefore
			/*
			 * Example:
				array(
					'new_sort' => array(
						'title'    => esc_html__( 'New Sort', 'visual-portfolio' ),
						'controls' => array(
							... controls ...
						),
					),
				)
			 */
			apply_filters( 'vpf_extend_sort', array() )
		);

		// Extend specific sort controls.
		foreach ( $sorts as $name => $sort ) {
			if ( isset( $sort['controls'] ) ) {
                // phpcs:ignore Squiz.PHP.CommentedOutCode.Found, Squiz.Commenting.BlockComment.NoEmptyLineBefore
				/*
				 * Example:
					array(
						... controls ...
					)
				 */
				$sorts[ $name ]['controls'] = apply_filters( 'vpf_extend_sort_' . $name . '_controls', $sort['controls'] );
			}
		}

		// Sort selector.
		$sorts_selector = array();
		foreach ( $sorts as $name => $sort ) {
			$sorts_selector[ $name ] = array(
				'value' => $name,
				'title' => $sort['title'],
				'icon'  => isset( $sort['icon'] ) ? $sort['icon'] : '',
			);
		}
		Visual_Portfolio_Controls::register(
			array(
				'category' => 'sort',
				'type'     => 'icons_selector',
				'name'     => 'sort',
				'default'  => 'dropdown',
				'options'  => $sorts_selector,
			)
		);

		// sorts options.
		foreach ( $sorts as $name => $sort ) {
			if ( ! isset( $sort['controls'] ) ) {
				continue;
			}
			foreach ( $sort['controls'] as $field ) {
				$field['category'] = 'sort';
				$field['name']     = 'sort_' . $name . '__' . $field['name'];

				// condition names prefix fix.
				if ( isset( $field['condition'] ) ) {
					foreach ( $field['condition'] as $k => $cond ) {
						if ( isset( $cond['control'] ) ) {
							if ( strpos( $cond['control'], 'GLOBAL_' ) === 0 ) {
								$field['condition'][ $k ]['control'] = str_replace( 'GLOBAL_', '', $cond['control'] );
							} else {
								$field['condition'][ $k ]['control'] = $name . '_' . $cond['control'];
							}
						}
					}
				}

				$field['condition'] = array_merge(
					isset( $field['condition'] ) ? $field['condition'] : array(),
					array(
						array(
							'control' => 'sort',
							'value'   => $name,
						),
					)
				);
				Visual_Portfolio_Controls::register( $field );
			}
		}

		/**
		 * Search
		 */
		Visual_Portfolio_Controls::register(
			array(
				'category'    => 'search',
				'type'        => 'pro_note',
				'name'        => 'search_pro_note',
				'label'       => esc_html__( 'Premium Only', 'visual-portfolio' ),
				'description' => '<p>' . esc_html__( 'The search module is only available for Pro users.', 'visual-portfolio' ) . '</p>',
			)
		);

		/**
		 * Pagination
		 */
		$pagination = array_merge(
			array(
				// Minimal.
				'minimal' => array(
					'title'    => esc_html__( 'Minimal', 'visual-portfolio' ),
					'icon'     => '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0.879261 8.13636V12.5H1.77415V9.64915H1.81037L2.93963 12.4787H3.54901L4.67827 9.6598H4.71449V12.5H5.60938V8.13636H4.47159L3.26989 11.0682H3.21875L2.01705 8.13636H0.879261ZM10.0194 8.13636H9.10103V10.8807H9.06268L7.17915 8.13636H6.3695V12.5H7.29208V9.75355H7.32404L9.22248 12.5H10.0194V8.13636ZM10.7816 8.13636V12.5H11.6765V9.64915H11.7127L12.842 12.4787H13.4513L14.5806 9.6598H14.6168V12.5H15.5117V8.13636H14.3739L13.1722 11.0682H13.1211L11.9194 8.13636H10.7816ZM16.2718 12.5H19.0652V11.7393H17.1944V8.13636H16.2718V12.5Z" fill="currentColor"/></svg>',
					'controls' => array(),
				),

				// Classic.
				'default' => array(
					'title'    => esc_html__( 'Classic', 'visual-portfolio' ),
					'icon'     => '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="0.75" y="5.89286" width="18.5" height="7.07143" rx="1.25" stroke="currentColor" stroke-width="1.5" fill="transparent"/><path d="M0.857143 11.1071V12.8214C0.857143 13.2948 1.2409 13.6786 1.71429 13.6786H18.2857C18.7591 13.6786 19.1429 13.2948 19.1429 12.8214V11.1071L19.5714 10.25C19.8081 10.25 20 10.4419 20 10.6786V12.8214C20 13.7682 19.2325 14.5357 18.2857 14.5357H1.71429C0.767512 14.5357 0 13.7682 0 12.8214V10.6786C0 10.4419 0.191878 10.25 0.428571 10.25L0.857143 11.1071Z" fill="currentColor"/></svg>',
					'controls' => array(),
				),
			),
            // phpcs:ignore Squiz.PHP.CommentedOutCode.Found, Squiz.Commenting.BlockComment.NoEmptyLineBefore
			/*
			 * Example:
				array(
					'new_pagination' => array(
						'title'    => esc_html__( 'New Pagination', 'visual-portfolio' ),
						'controls' => array(
							... controls ...
						),
					),
				)
			 */
			apply_filters( 'vpf_extend_pagination', array() )
		);

		// Extend specific pagination controls.
		foreach ( $pagination as $name => $pagin ) {
			if ( isset( $pagin['controls'] ) ) {
                // phpcs:ignore Squiz.PHP.CommentedOutCode.Found, Squiz.Commenting.BlockComment.NoEmptyLineBefore
				/*
				 * Example:
					array(
						... controls ...
					)
				 */
				$pagination[ $name ]['controls'] = apply_filters( 'vpf_extend_pagination_' . $name . '_controls', $pagin['controls'] );
			}
		}

		// Pagination selector.
		$pagination_selector = array();
		foreach ( $pagination as $name => $pagin ) {
			$pagination_selector[ $name ] = array(
				'value' => $name,
				'title' => $pagin['title'],
				'icon'  => isset( $pagin['icon'] ) ? $pagin['icon'] : '',
			);
		}
		Visual_Portfolio_Controls::register(
			array(
				'category' => 'pagination',
				'type'     => 'icons_selector',
				'name'     => 'pagination_style',
				'default'  => 'minimal',
				'options'  => $pagination_selector,
			)
		);

		// pagination options.
		foreach ( $pagination as $name => $pagin ) {
			if ( ! isset( $pagin['controls'] ) ) {
				continue;
			}
			foreach ( $pagin['controls'] as $field ) {
				$field['category'] = 'pagination';
				$field['name']     = 'pagination_' . $name . '__' . $field['name'];

				// condition names prefix fix.
				if ( isset( $field['condition'] ) ) {
					foreach ( $field['condition'] as $k => $cond ) {
						if ( isset( $cond['control'] ) ) {
							$field['condition'][ $k ]['control'] = $name . '_' . $cond['control'];
						}
					}
				}

				$field['condition'] = array_merge(
					isset( $field['condition'] ) ? $field['condition'] : array(),
					array(
						array(
							'control' => 'pagination_style',
							'value'   => $name,
						),
					)
				);
				Visual_Portfolio_Controls::register( $field );
			}
		}

		Visual_Portfolio_Controls::register(
			array(
				'category' => 'pagination',
				'label'    => esc_html__( 'Type', 'visual-portfolio' ),
				'type'     => 'icons_selector',
				'name'     => 'pagination',
				'default'  => 'load-more',
				'options'  => array(
					array(
						'value' => 'paged',
						'title' => esc_html__( 'Paged', 'visual-portfolio' ),
						'icon'  => '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M3.12749 7.40909H2.11577L0.855469 8.20703V9.16158L2.02131 8.43075H2.05114V12.5H3.12749V7.40909ZM7.57768 12.5H11.2069V11.62H9.06916V11.5852L9.81241 10.8569C10.8589 9.90234 11.1398 9.42507 11.1398 8.84588C11.1398 7.96342 10.4189 7.33949 9.32768 7.33949C8.25879 7.33949 7.52548 7.97834 7.52797 8.97763H8.54963C8.54714 8.49041 8.85538 8.19212 9.32022 8.19212C9.76767 8.19212 10.1008 8.47053 10.1008 8.91797C10.1008 9.32315 9.85218 9.60156 9.38983 10.0465L7.57768 11.7244V12.5ZM17.1088 12.5696C18.2523 12.5696 19.0701 11.9407 19.0676 11.0707C19.0701 10.4368 18.6674 9.98438 17.9192 9.88991V9.85014C18.4885 9.74822 18.8812 9.34553 18.8787 8.77379C18.8812 7.97088 18.1777 7.33949 17.1238 7.33949C16.0797 7.33949 15.2942 7.95099 15.2793 8.83097H16.3109C16.3233 8.44318 16.6788 8.19212 17.1188 8.19212C17.5538 8.19212 17.8446 8.45561 17.8422 8.83842C17.8446 9.23864 17.5041 9.50959 17.0144 9.50959H16.5396V10.3001H17.0144C17.5911 10.3001 17.9515 10.5884 17.949 10.9986C17.9515 11.4038 17.6035 11.6822 17.1113 11.6822C16.6365 11.6822 16.2811 11.4336 16.2612 11.0607H15.1774C15.1948 11.9506 15.9902 12.5696 17.1088 12.5696Z" fill="currentColor"/></svg>',
					),
					array(
						'value' => 'load-more',
						'title' => esc_html__( 'Load More', 'visual-portfolio' ),
						'icon'  => '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="0.75" y="3.75" width="18.5" height="11.07" rx="1.25" stroke="currentColor" stroke-width="1.5" fill="transparent"/><path d="M0.857143 12.9643V14.6786C0.857143 15.152 1.2409 15.5357 1.71429 15.5357H18.2857C18.7591 15.5357 19.1429 15.152 19.1429 14.6786V12.9643L19.5714 12.1071C19.8081 12.1071 20 12.299 20 12.5357V14.6786C20 15.6254 19.2325 16.3929 18.2857 16.3929H1.71429C0.767512 16.3929 0 15.6254 0 14.6786V12.5357C0 12.299 0.191878 12.1071 0.428571 12.1071L0.857143 12.9643Z" fill="currentColor"/><path d="M9.92957 7.0001L9.96091 12" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><path d="M7.32182 9.36091L9.96091 12L12.6 9.36091" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/></svg>',
					),
					array(
						'value' => 'infinite',
						'title' => esc_html__( 'Infinite', 'visual-portfolio' ),
						'icon'  => '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10 1.42857V4.85714" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><path opacity="0.5" d="M10 14V17.4286" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><path opacity="0.875" d="M4.28571 3.71428L6.57142 5.99999" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><path opacity="0.375" d="M13.4286 12.8571L15.7143 15.1429" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><path opacity="0.75" d="M2 9.42857H5.42857" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><path opacity="0.25" d="M14.5714 9.42857H18" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><path opacity="0.625" d="M4.28571 15.1429L6.57142 12.8571" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><path opacity="0.125" d="M13.4286 5.99999L15.7143 3.71428" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/></svg>',
					),
				),
			)
		);
		Visual_Portfolio_Controls::register(
			array(
				'category'    => 'pagination',
				'type'        => 'html',
				'description' => esc_html__( 'Note: you will see the "Load More" pagination in the preview. "Infinite" pagination will be visible on the site.', 'visual-portfolio' ),
				'name'        => 'pagination_infinite_notice',
				'condition'   => array(
					array(
						'control'  => 'pagination',
						'operator' => '==',
						'value'    => 'infinite',
					),
				),
			)
		);
		Visual_Portfolio_Controls::register(
			array(
				'category'    => 'pagination',
				'type'        => 'text',
				'label'       => esc_html__( 'Texts', 'visual-portfolio' ),
				'name'        => 'pagination_infinite_text_load',
				'group'       => 'pagination_texts',
				'default'     => esc_attr__( 'Load More', 'visual-portfolio' ),
				'description' => esc_attr__( 'Load more button label', 'visual-portfolio' ),
				'wpml'        => true,
				'condition'   => array(
					array(
						'control'  => 'pagination',
						'operator' => '==',
						'value'    => 'infinite',
					),
				),
			)
		);
		Visual_Portfolio_Controls::register(
			array(
				'category'    => 'pagination',
				'type'        => 'text',
				'name'        => 'pagination_infinite_text_loading',
				'group'       => 'pagination_texts',
				'default'     => esc_attr__( 'Loading More...', 'visual-portfolio' ),
				'description' => esc_attr__( 'Loading more button label', 'visual-portfolio' ),
				'wpml'        => true,
				'condition'   => array(
					array(
						'control'  => 'pagination',
						'operator' => '==',
						'value'    => 'infinite',
					),
				),
			)
		);
		Visual_Portfolio_Controls::register(
			array(
				'category'    => 'pagination',
				'type'        => 'textarea',
				'name'        => 'pagination_infinite_text_end_list',
				'group'       => 'pagination_texts',
				'default'     => esc_attr__( 'You’ve reached the end of the list', 'visual-portfolio' ),
				'description' => esc_attr__( 'End of the list text', 'visual-portfolio' ),
				'wpml'        => true,
				'condition'   => array(
					array(
						'control'  => 'pagination',
						'operator' => '==',
						'value'    => 'infinite',
					),
				),
			)
		);
		Visual_Portfolio_Controls::register(
			array(
				'category'    => 'pagination',
				'type'        => 'text',
				'label'       => esc_html__( 'Texts', 'visual-portfolio' ),
				'name'        => 'pagination_load_more_text_load',
				'group'       => 'pagination_texts',
				'default'     => esc_attr__( 'Load More', 'visual-portfolio' ),
				'description' => esc_attr__( 'Load more button label', 'visual-portfolio' ),
				'wpml'        => true,
				'condition'   => array(
					array(
						'control'  => 'pagination',
						'operator' => '==',
						'value'    => 'load-more',
					),
				),
			)
		);
		Visual_Portfolio_Controls::register(
			array(
				'category'    => 'pagination',
				'type'        => 'text',
				'name'        => 'pagination_load_more_text_loading',
				'group'       => 'pagination_texts',
				'default'     => esc_attr__( 'Loading More...', 'visual-portfolio' ),
				'description' => esc_attr__( 'Loading more button label', 'visual-portfolio' ),
				'wpml'        => true,
				'condition'   => array(
					array(
						'control'  => 'pagination',
						'operator' => '==',
						'value'    => 'load-more',
					),
				),
			)
		);
		Visual_Portfolio_Controls::register(
			array(
				'category'    => 'pagination',
				'type'        => 'textarea',
				'name'        => 'pagination_load_more_text_end_list',
				'group'       => 'pagination_texts',
				'default'     => esc_attr__( 'You’ve reached the end of the list', 'visual-portfolio' ),
				'description' => esc_attr__( 'End of the list text', 'visual-portfolio' ),
				'wpml'        => true,
				'condition'   => array(
					array(
						'control'  => 'pagination',
						'operator' => '==',
						'value'    => 'load-more',
					),
				),
			)
		);
		Visual_Portfolio_Controls::register(
			array(
				'category'  => 'pagination',
				'type'      => 'checkbox',
				'alongside' => esc_html__( 'Display Arrows', 'visual-portfolio' ),
				'name'      => 'pagination_paged__show_arrows',
				'default'   => true,
				'condition' => array(
					array(
						'control' => 'pagination',
						'value'   => 'paged',
					),
				),
			)
		);
		Visual_Portfolio_Controls::register(
			array(
				'category'  => 'pagination',
				'type'      => 'checkbox',
				'alongside' => esc_html__( 'Display Numbers', 'visual-portfolio' ),
				'name'      => 'pagination_paged__show_numbers',
				'default'   => true,
				'condition' => array(
					array(
						'control' => 'pagination',
						'value'   => 'paged',
					),
				),
			)
		);
		Visual_Portfolio_Controls::register(
			array(
				'category'      => 'pagination',
				'type'          => 'checkbox',
				'alongside'     => esc_html__( 'Scroll to Top', 'visual-portfolio' ),
				'name'          => 'pagination_paged__scroll_top',
				'group'         => 'pagination_scroll_top',
				'default'       => true,
				'reload_iframe' => false,
				'condition'     => array(
					array(
						'control' => 'pagination',
						'value'   => 'paged',
					),
				),
			)
		);
		Visual_Portfolio_Controls::register(
			array(
				'category'      => 'pagination',
				'type'          => 'number',
				'label'         => esc_html__( 'Scroll to Top Offset', 'visual-portfolio' ),
				'name'          => 'pagination_paged__scroll_top_offset',
				'group'         => 'pagination_scroll_top',
				'default'       => 30,
				'reload_iframe' => false,
				'condition'     => array(
					array(
						'control' => 'pagination',
						'value'   => 'paged',
					),
					array(
						'control' => 'pagination_paged__scroll_top',
					),
				),
			)
		);
		Visual_Portfolio_Controls::register(
			array(
				'category'  => 'pagination',
				'type'      => 'checkbox',
				'alongside' => esc_html__( 'Hide on Reached End', 'visual-portfolio' ),
				'name'      => 'pagination_hide_on_end',
				'default'   => false,
				'condition' => array(
					array(
						'control'  => 'pagination',
						'operator' => '!=',
						'value'    => 'paged',
					),
				),
			)
		);
		Visual_Portfolio_Controls::register(
			array(
				'category'    => 'pagination',
				'type'        => 'pro_note',
				'name'        => 'pagination_infinite_additional_options_pro_note',
				'label'       => esc_html__( 'Premium Only', 'visual-portfolio' ),
				'description' => '<p>' . esc_html__( 'Adjust the loading threshold, limit the number of automatic loads and run the infinite scroll only after the Load button click.', 'visual-portfolio' ) . '</p>',
				'condition'   => array(
					array(
						'control'  => 'pagination',
						'operator' => '==',
						'value'    => 'infinite',
					),
				),
			)
		);

		/**
		 * Code Editor
		 */
		Visual_Portfolio_Controls::register(
			array(
				'category'         => 'custom_css',
				'type'             => 'code_editor',
				'name'             => 'custom_css',
				'max_lines'        => 20,
				'min_lines'        => 5,
				'mode'             => 'css',
				'allow_modal'      => true,
				'classes_tree'     => true,
				'encode'           => true,
				'reload_iframe'    => false,
				'code_placeholder' => "selector {\n\n}",
				'default'          => '',
				'description'      => '<p></p>
                <p>' . wp_kses_post( __( 'Use <code>selector</code> rule to change block styles.', 'visual-portfolio' ) ) . '</p>
                <p>' . esc_html__( 'Example:', 'visual-portfolio' ) . '</p>
                <pre class="vpf-control-pre-custom-css">
selector {
    background-color: #5C39A7;
}

selector p {
    color: #5C39A7;
}
</pre>',
			)
		);

		do_action( 'vpf_after_register_controls' );
	}

	/**
	 * Find post types options for control.
	 *
	 * @return array
	 */
	public function find_post_types_options() {
		check_ajax_referer( 'vp-ajax-nonce', 'nonce' );

		// post types list.
		$post_types = get_post_types(
			array(
				'public' => false,
				'name'   => 'attachment',
			),
			'names',
			'NOT'
		);

		$post_types_selector = array();
		if ( is_array( $post_types ) && ! empty( $post_types ) ) {
			foreach ( $post_types as $post_type ) {
				$post_types_selector[ $post_type ] = array(
					'value' => $post_type,
					'title' => ucfirst( $post_type ),
					'icon'  => '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 0.75H11.6893L17.25 6.31066V18C17.25 18.3315 17.1183 18.6495 16.8839 18.8839C16.6495 19.1183 16.3315 19.25 16 19.25H4C3.66848 19.25 3.35054 19.1183 3.11612 18.8839C2.8817 18.6495 2.75 18.3315 2.75 18V2C2.75 1.66848 2.8817 1.35054 3.11612 1.11612C3.35054 0.881696 3.66848 0.75 4 0.75Z" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><path d="M11.7143 0.571426V6H17.4286" stroke="currentColor" stroke-width="1.5" fill="transparent"/><path d="M14 11.1429H6" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><path d="M8 7.14285H6" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 15.1429H6" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/></svg>',
				);
			}
		}
		$post_types_selector['post_types_set'] = array(
			'value' => 'post_types_set',
			'title' => esc_html__( 'Post Types Set', 'visual-portfolio' ),
			'icon'  => '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11 1C11 1 5.5 1 5 1C4.5 1 3.94017 1.06696 3.5 1.5C3.02194 1.97032 3 2.5 3 3.14286C3 3.78571 3 16 3 16" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M6.75 3.75H13.4457L18.25 8.41705V18.3C18.25 18.5448 18.1501 18.7842 17.9648 18.9641C17.7789 19.1448 17.5221 19.25 17.25 19.25H6.75C6.47788 19.25 6.22113 19.1448 6.03515 18.9641C5.84991 18.7842 5.75 18.5448 5.75 18.3V4.7C5.75 4.45517 5.84991 4.21582 6.03515 4.03588C6.22113 3.85521 6.47788 3.75 6.75 3.75Z" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M14 4V9H19" stroke="currentColor" stroke-width="1.5"/><path d="M15 12H9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M11 8H9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M15 16H9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
		);
		$post_types_selector['ids']            = array(
			'value' => 'ids',
			'title' => esc_html__( 'Manual Selection', 'visual-portfolio' ),
			'icon'  => '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="0.75" y="0.75" width="18.5" height="18.5" rx="1.25" stroke="currentColor" stroke-width="1.5" fill="transparent"/><path d="M5 11.6L7.30769 14L15 6" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/></svg>',
		);
		$post_types_selector['custom_query']   = array(
			'value' => 'custom_query',
			'title' => esc_html__( 'Custom Query', 'visual-portfolio' ),
			'icon'  => '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10.7678 0.91749L10.7678 0.917496L10.7707 0.919154L17.7678 4.91831C17.7682 4.91856 17.7687 4.91882 17.7691 4.91907C17.9584 5.02866 18.1156 5.186 18.225 5.37541C18.3347 5.56526 18.3926 5.78064 18.3929 5.99995V14.0001C18.3926 14.2194 18.3347 14.4347 18.225 14.6246C18.1156 14.814 17.9583 14.9714 17.769 15.081C17.7686 15.0812 17.7682 15.0814 17.7678 15.0817L10.7707 19.0808L10.7678 19.0825C10.5778 19.1922 10.3622 19.25 10.1429 19.25C9.92346 19.25 9.70793 19.1922 9.51791 19.0825L9.51501 19.0808L2.51791 15.0817C2.5175 15.0814 2.51708 15.0812 2.51667 15.081C2.32739 14.9714 2.17015 14.814 2.06067 14.6246C1.95102 14.4348 1.89314 14.2196 1.89285 14.0004V5.99959C1.89314 5.78041 1.95102 5.56516 2.06067 5.37541C2.17014 5.186 2.32736 5.02865 2.5166 4.91907C2.51704 4.91881 2.51747 4.91856 2.51791 4.91831L9.51501 0.919154L9.51502 0.91916L9.51791 0.91749C9.70793 0.807761 9.92346 0.75 10.1429 0.75C10.3622 0.75 10.5778 0.807761 10.7678 0.91749Z" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><path d="M10.1449 18.9286V9.42857" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><path d="M18.1159 4.78261L10.1449 9.42029L2.02899 4.78261" stroke="currentColor" stroke-width="1.5" fill="transparent"/></svg>',
		);
		$post_types_selector['current_query']  = array(
			'value' => 'current_query',
			'title' => esc_html__( 'Current Query', 'visual-portfolio' ),
			'icon'  => '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M10.7678 0.91749L10.7678 0.917496L10.7707 0.919154L17.7678 4.91831C17.7682 4.91856 17.7687 4.91882 17.7691 4.91907C17.9584 5.02866 18.1156 5.186 18.225 5.37541C18.3347 5.56526 18.3926 5.78064 18.3929 5.99995V14.0001C18.3926 14.2194 18.3347 14.4347 18.225 14.6246C18.1156 14.814 17.9583 14.9714 17.769 15.081C17.7686 15.0812 17.7682 15.0814 17.7678 15.0817L10.7707 19.0808L10.7678 19.0825C10.5778 19.1922 10.3622 19.25 10.1429 19.25C9.92346 19.25 9.70793 19.1922 9.51791 19.0825L9.51501 19.0808L2.51791 15.0817C2.5175 15.0814 2.51708 15.0812 2.51667 15.081C2.32739 14.9714 2.17015 14.814 2.06067 14.6246C1.95102 14.4348 1.89314 14.2196 1.89285 14.0004V5.99959C1.89314 5.78041 1.95102 5.56516 2.06067 5.37541C2.17014 5.186 2.32736 5.02865 2.5166 4.91907C2.51704 4.91881 2.51747 4.91856 2.51791 4.91831L9.51501 0.919154L9.51502 0.91916L9.51791 0.91749C9.70793 0.807761 9.92346 0.75 10.1429 0.75C10.3622 0.75 10.5778 0.807761 10.7678 0.91749Z" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><path d="M10.1449 18.9286V9.42857" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><path d="M18.1159 4.78261L10.1449 9.42029L2.02899 4.78261" stroke="currentColor" stroke-width="1.5" fill="transparent"/></svg>',
		);

		$post_types_selector = array_merge(
			$post_types_selector,
			// phpcs:ignore Squiz.PHP.CommentedOutCode.Found, Squiz.Commenting.BlockComment.NoEmptyLineBefore
			/*
			 * Example:
				array(
					'new_post_source' => array(
						'value' => 'new_post_source',
						'title' => esc_html__( 'New Post Source', 'visual-portfolio' ),
						'icon'  => '',
					),
				)
			 */
			apply_filters( 'vpf_extend_posts_source', array() )
		);

		return array(
			'options' => $post_types_selector,
		);
	}

	/**
	 * Find post types for select control.
	 *
	 * @return array
	 */
	public function find_posts_types_select_control() {
		check_ajax_referer( 'vp-ajax-nonce', 'nonce' );

		$result = array();

		// post types list.
		$post_types = get_post_types(
			array(
				'public' => false,
				'name'   => 'attachment',
			),
			'names',
			'NOT'
		);

		if ( is_array( $post_types ) && ! empty( $post_types ) ) {
			$result['options'] = array();

			foreach ( $post_types as $post_type ) {
				$result['options'][ $post_type ] = array(
					'value' => $post_type,
					'label' => ucfirst( $post_type ),
				);
			}
		}

		return $result;
	}

	/**
	 * Find posts for select control.
	 *
	 * @param array $attributes - current block attributes.
	 * @param array $control - current control.
	 *
	 * @return array
	 */
	public function find_posts_select_control( $attributes, $control ) {
		check_ajax_referer( 'vp-ajax-nonce', 'nonce' );

		$result = array();

		// get selected options.
		$selected_ids = isset( $attributes[ $control['name'] ] ) ? $attributes[ $control['name'] ] : array();

		if ( ! isset( $_POST['q'] ) && empty( $selected_ids ) ) {
			return $result;
		}

		$post_type = isset( $attributes['posts_source'] ) ? sanitize_text_field( wp_unslash( $attributes['posts_source'] ) ) : 'any';

		if ( ! $post_type || 'post_types_set' === $post_type || 'custom_query' === $post_type || 'ids' === $post_type ) {
			$post_type = 'any';
		}

		if ( isset( $_POST['q'] ) ) {
			$the_query = new WP_Query(
				array(
					's'              => sanitize_text_field( wp_unslash( $_POST['q'] ) ),
					'posts_per_page' => 50,
					'post_type'      => $post_type,
				)
			);
		} else {
			$the_query = new WP_Query(
				array(
					'post__in'       => $selected_ids,
					'posts_per_page' => 50,
					'post_type'      => $post_type,
				)
			);
		}

		if ( $the_query->have_posts() ) {
			$result['options'] = array();

			while ( $the_query->have_posts() ) {
				$the_query->the_post();
				$result['options'][ (string) get_the_ID() ] = array(
					'value'    => (string) get_the_ID(),
					'label'    => get_the_title(),
					'img'      => get_the_post_thumbnail_url( null, 'thumbnail' ),
					'category' => get_post_type( get_the_ID() ),
				);
			}
			$the_query->reset_postdata();
		}

		return $result;
	}

	/**
	 * Find taxonomies for select control.
	 *
	 * @param array $attributes - current block attributes.
	 * @param array $control - current control.
	 *
	 * @return array
	 */
	public function find_taxonomies_select_control( $attributes, $control ) {
		check_ajax_referer( 'vp-ajax-nonce', 'nonce' );

		$result = array();

		// get selected options.
		$selected_ids = isset( $attributes[ $control['name'] ] ) ? $attributes[ $control['name'] ] : array();

		if ( ! isset( $_POST['q'] ) && empty( $selected_ids ) ) {
			return $result;
		}

		if ( isset( $_POST['q'] ) ) {
			$post_type = isset( $_POST['post_type'] ) ? sanitize_text_field( wp_unslash( $_POST['post_type'] ) ) : 'any';

			if ( ! $post_type || 'post_types_set' === $post_type || 'custom_query' === $post_type || 'ids' === $post_type ) {
				$post_type = 'any';
			}

			// get taxonomies for selected post type or all available.
			if ( 'any' === $post_type ) {
				$post_type = get_post_types(
					array(
						'public' => false,
						'name'   => 'attachment',
					),
					'names',
					'NOT'
				);
			}

			$taxonomies_names = get_object_taxonomies( $post_type );

			$the_query = new WP_Term_Query(
				array(
					'taxonomy'   => $taxonomies_names,
					'hide_empty' => false,
					'search'     => sanitize_text_field( wp_unslash( $_POST['q'] ) ),
				)
			);
		} else {
			$the_query = new WP_Term_Query(
				array(
					'include'    => $selected_ids,
					'hide_empty' => false,
				)
			);
		}

		if ( ! empty( $the_query->terms ) ) {
			$result['options'] = array();

			foreach ( $the_query->terms as $term ) {
				$result['options'][ (string) $term->term_id ] = array(
					'value'    => (string) $term->term_id,
					'label'    => $term->name,
					'category' => $term->taxonomy,
				);
			}
		}

		return $result;
	}

	/**
	 * Find taxonomies ajax
	 */
	public function ajax_find_oembed() {
		check_ajax_referer( 'vp-ajax-nonce', 'nonce' );
		if ( ! isset( $_POST['q'] ) ) {
			wp_die();
		}

		$oembed = visual_portfolio()->get_oembed_data( sanitize_text_field( wp_unslash( $_POST['q'] ) ) );

		if ( ! isset( $oembed ) || ! $oembed || ! isset( $oembed['html'] ) ) {
			wp_die();
		}

		echo wp_json_encode( $oembed );

		wp_die();
	}
}

new Visual_Portfolio_Admin();
