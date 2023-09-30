<?php
/**
 * Register Custom Post Types.
 *
 * @package visual-portfolio/admin
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Visual_Portfolio_Custom_Post_Type
 */
class Visual_Portfolio_Custom_Post_Type {
	/**
	 * Option of register portfolio post type.
	 *
	 * @deprecated deprecated since version 2.17.1
	 * @var string
	 */
	public static $register_portfolio_post_type = true;

	/**
	 * Menu slug.
	 *
	 * @deprecated deprecated since version 2.17.1
	 * @var string
	 */
	public static $menu_slug = 'edit.php?post_type=portfolio';

	/**
	 * Visual_Portfolio_Custom_Post_Type constructor.
	 */
	public function __construct() {
		// custom post types.
		// We have to use priority < 10 to add compatibility for 'post-terms' block.
		// @link https://github.com/WordPress/gutenberg/blob/7880f08f57ac9275c21129d1f7e1f56af40bea87/packages/block-library/src/post-terms/index.php#L61-L110.
		add_action( 'init', array( $this, 'add_custom_post_type' ), 9 );
		add_action( 'restrict_manage_posts', array( $this, 'filter_custom_post_by_taxonomies' ), 10 );

		// custom post roles.
		add_action( 'init', array( $this, 'add_role_caps' ) );

		// remove screen options from portfolio list page.
		add_action( 'screen_options_show_screen', array( $this, 'remove_screen_options' ), 10, 2 );

		// show thumbnail in portfolio list table.
		add_filter( 'manage_portfolio_posts_columns', array( $this, 'add_portfolio_img_column' ) );
		add_filter( 'manage_portfolio_posts_custom_column', array( $this, 'manage_portfolio_img_column' ), 10, 2 );

		// show notice in vp_lists admin list page.
		add_filter( 'admin_notices', array( $this, 'add_vp_lists_notice' ) );

		// show icon and shortcode columns in vp_lists table.
		add_filter( 'manage_vp_lists_posts_columns', array( $this, 'add_vp_lists_custom_columns' ) );
		add_action( 'manage_vp_lists_posts_custom_column', array( $this, 'manage_vp_lists_custom_columns' ), 10, 2 );
		add_action( 'restrict_manage_posts', array( $this, 'restrict_manage_posts_vp_lists' ) );
		add_action( 'parse_query', array( $this, 'parse_query_vp_lists' ) );

		// change allowed blocks for vp_lists post type.
		add_filter( 'allowed_block_types_all', array( $this, 'vp_lists_allowed_block_types_all' ), 10, 2 );

		// force enable Gutenberg editor in 'vp_lists' for Classic Editor plugin.
		add_action( 'classic_editor_enabled_editors_for_post_type', array( $this, 'vp_lists_classic_plugin_force_gutenberg' ), 150, 2 );
		add_action( 'use_block_editor_for_post_type', array( $this, 'vp_lists_classic_plugin_force_gutenberg_2' ), 150, 2 );
		add_action( 'use_block_editor_for_post', array( $this, 'vp_lists_classic_plugin_force_gutenberg_3' ), 150, 2 );

		// force enable Gutenberg in 'vp_lists' for users with disabled option "Visual Editor".
		add_filter( 'user_can_richedit', array( $this, 'vp_lists_user_can_richedit_force' ) );

		// highlight admin menu items.
		add_action( 'admin_menu', array( $this, 'add_proofing_admin_menu' ), 10 );
		add_action( 'admin_menu', array( $this, 'admin_menu' ), 12 );

		// show admin menu dropdown with available portfolios on the current page.
		add_action( 'wp_before_admin_bar_render', array( $this, 'wp_before_admin_bar_render' ) );

		// add backward compatibility with old Pro version.
		add_action( 'init', array( __CLASS__, 'set_settings_of_register_portfolio_post_type' ) );
	}

	/**
	 * Set settings of register portfolio post type.
	 *
	 * @deprecated deprecated since version 2.17.1
	 * @return void
	 */
	public static function set_settings_of_register_portfolio_post_type() {
		self::$register_portfolio_post_type = Visual_Portfolio_Settings::get_option( 'register_portfolio_post_type', 'vp_general' );
		self::$menu_slug                    = self::$register_portfolio_post_type ? 'edit.php?post_type=portfolio' : 'visual-portfolio-settings';
	}

	/**
	 * Get menu slug.
	 *
	 * @return string
	 */
	public static function get_menu_slug() {
		return self::portfolio_post_type_is_registered() ? 'edit.php?post_type=portfolio' : 'visual-portfolio-settings';
	}

	/**
	 * Return true if portfolio post type is registered.
	 *
	 * @return bool
	 */
	public static function portfolio_post_type_is_registered() {
		return Visual_Portfolio_Settings::get_option( 'register_portfolio_post_type', 'vp_general' );
	}

	/**
	 * Add custom post type
	 */
	public function add_custom_post_type() {
		$archive_page = Visual_Portfolio_Settings::get_option( 'portfolio_archive_page', 'vp_general' );
		$custom_slug  = (int) get_option( 'page_on_front' ) === (int) $archive_page ? '/' : Visual_Portfolio_Archive_Mapping::get_portfolio_slug();
		$custom_label = Visual_Portfolio_Archive_Mapping::get_portfolio_label();
		$permalinks   = Visual_Portfolio_Archive_Mapping::get_permalink_structure( true );

		// portfolio post type / project post type.
		if ( self::portfolio_post_type_is_registered() ) {
			register_post_type(
				'portfolio',
				array(
					'labels'             => array(
						// We have to use label from the actual Portfolio page
						// because 3rd-party breadcrumbs will display this name and it is
						// required to show breadcrumbs like:
						//
						// Home > Portfolio > Project Name
						//
						// Instead of this one:
						// Home > Projects > Project Name.
						'name'               => $custom_label,
						'singular_name'      => _x( 'Project', 'Post Type Singular Name', 'visual-portfolio' ),
						'menu_name'          => visual_portfolio()->plugin_name,
						'parent_item_colon'  => __( 'Parent Project', 'visual-portfolio' ),
						'all_items'          => __( 'Projects', 'visual-portfolio' ),
						'view_item'          => __( 'View Project', 'visual-portfolio' ),
						'add_new_item'       => __( 'Add New Project', 'visual-portfolio' ),
						'add_new'            => __( 'Add New', 'visual-portfolio' ),
						'edit_item'          => __( 'Edit Project', 'visual-portfolio' ),
						'update_item'        => __( 'Update Project', 'visual-portfolio' ),
						'search_items'       => __( 'Search Project', 'visual-portfolio' ),
						'not_found'          => __( 'Not Found', 'visual-portfolio' ),
						'not_found_in_trash' => __( 'Not found in Trash', 'visual-portfolio' ),
					),
					'public'             => true,
					'publicly_queryable' => true,
					'has_archive'        => $custom_slug,
					'show_ui'            => true,

					// adding to custom menu manually.
					'show_in_menu'       => true,
					'show_in_admin_bar'  => true,
					'show_in_rest'       => true,
					'menu_icon'          => 'dashicons-visual-portfolio',
					'taxonomies'         => array(
						'portfolio_category',
						'portfolio_tag',
					),
					'map_meta_cap'       => true,
					'capability_type'    => 'portfolio',
					'rewrite'            => array(
						'slug'       => $permalinks['portfolio_base'],
						'with_front' => false,
					),
					'supports'           => array(
						'title',
						'editor',
						'author',
						'thumbnail',
						'comments',
						'revisions',
						'excerpt',
						'post-formats',
						'page-attributes',
						'custom-fields',
					),
				)
			);

			register_taxonomy(
				'portfolio_category',
				'portfolio',
				array(
					'label'              => esc_html__( 'Portfolio Categories', 'visual-portfolio' ),
					'labels'             => array(
						'menu_name' => esc_html__( 'Categories', 'visual-portfolio' ),
					),
					'rewrite'            => array(
						'slug' => $permalinks['category_base'],
					),
					'hierarchical'       => true,
					'publicly_queryable' => true,
					'show_in_nav_menus'  => true,
					'show_in_rest'       => true,
					'show_admin_column'  => true,
					'map_meta_cap'       => true,
					'capability_type'    => 'portfolio',
				)
			);
			register_taxonomy(
				'portfolio_tag',
				'portfolio',
				array(
					'label'              => esc_html__( 'Portfolio Tags', 'visual-portfolio' ),
					'labels'             => array(
						'menu_name' => esc_html__( 'Tags', 'visual-portfolio' ),
					),
					'rewrite'            => array(
						'slug' => $permalinks['tag_base'],
					),
					'hierarchical'       => false,
					'publicly_queryable' => true,
					'show_in_nav_menus'  => true,
					'show_in_rest'       => true,
					'show_admin_column'  => true,
					'map_meta_cap'       => true,
					'capability_type'    => 'portfolio',
				)
			);
		}

		// portfolio lists post type.
		register_post_type(
			'vp_lists',
			array(
				'labels'          => array(
					'name'               => _x( 'Saved Layouts', 'Post Type General Name', 'visual-portfolio' ),
					'singular_name'      => _x( 'Saved Layout', 'Post Type Singular Name', 'visual-portfolio' ),
					'menu_name'          => visual_portfolio()->plugin_name,
					'parent_item_colon'  => __( 'Parent Project', 'visual-portfolio' ),
					'all_items'          => __( 'Saved Layouts', 'visual-portfolio' ),
					'view_item'          => __( 'View Saved Layout', 'visual-portfolio' ),
					'add_new_item'       => __( 'Add New Saved Layout', 'visual-portfolio' ),
					'add_new'            => __( 'Add New', 'visual-portfolio' ),
					'edit_item'          => __( 'Edit Saved Layout', 'visual-portfolio' ),
					'update_item'        => __( 'Update Saved Layout', 'visual-portfolio' ),
					'search_items'       => __( 'Search Saved Layout', 'visual-portfolio' ),
					'not_found'          => __( 'Not Found', 'visual-portfolio' ),
					'not_found_in_trash' => __( 'Not found in Trash', 'visual-portfolio' ),
				),
				'public'          => false,
				'has_archive'     => false,
				'show_ui'         => true,

				// adding to custom menu manually.
				'show_in_menu'    => self::get_menu_slug(),
				'show_in_rest'    => true,
				'map_meta_cap'    => true,
				'capability_type' => 'vp_list',
				'rewrite'         => true,
				'supports'        => array(
					'title',
					'editor',
					'revisions',
				),
				'template'        => array(
					array(
						'visual-portfolio/saved-editor',
					),
				),
				// we can't use it since blocks didn't inserted in some posts.
				// 'template_lock' => 'all',.
			)
		);
	}

	/**
	 * Add filter by custom taxonomies
	 *
	 * @param String $post_type - post type name.
	 */
	public function filter_custom_post_by_taxonomies( $post_type ) {
		// Apply this only on a specific post type.
		if ( 'portfolio' !== $post_type ) {
			return;
		}

		// A list of taxonomy slugs to filter by.
		$taxonomies = array( 'portfolio_category', 'portfolio_tag' );

		foreach ( $taxonomies as $taxonomy_slug ) {
			// Retrieve taxonomy data.
			$taxonomy_obj  = get_taxonomy( $taxonomy_slug );
			$taxonomy_name = $taxonomy_obj->labels->name;

			// Retrieve taxonomy terms.
			$terms = get_terms( $taxonomy_slug );

			// Display filter HTML.
			echo '<select name="' . esc_attr( $taxonomy_slug ) . '" id="' . esc_attr( $taxonomy_slug ) . '" class="postform">';
			// translators: %s - taxonomy name.
			echo '<option value="">' . sprintf( esc_html__( 'Show All %s', 'visual-portfolio' ), esc_html( $taxonomy_name ) ) . '</option>';
			foreach ( $terms as $term ) {
				printf(
					'<option value="%1$s" %2$s>%3$s (%4$s)</option>',
					esc_attr( $term->slug ),
                    // phpcs:ignore WordPress.Security.NonceVerification
					isset( $_GET[ $taxonomy_slug ] ) && $_GET[ $taxonomy_slug ] === $term->slug ? ' selected="selected"' : '',
					esc_html( $term->name ),
					esc_html( $term->count )
				);
			}
			echo '</select>';
		}
	}

	/**
	 * Add Roles
	 */
	public function add_role_caps() {
		if ( ! is_blog_installed() ) {
			return;
		}

		global $wp_version;

		$check_string = 'Plugin: ' . VISUAL_PORTFOLIO_VERSION . ' WP: ' . $wp_version;

		if ( get_option( 'visual_portfolio_updated_caps' ) === $check_string ) {
			return;
		}

		$wp_roles = wp_roles();

		if ( ! isset( $wp_roles ) || empty( $wp_roles ) || ! $wp_roles ) {
			return;
		}

		$author = $wp_roles->get_role( 'author' );

		$wp_roles->add_role(
			'portfolio_manager',
			__( 'Portfolio Manager', 'visual-portfolio' ),
			$author->capabilities
		);
		$wp_roles->add_role(
			'portfolio_author',
			__( 'Portfolio Author', 'visual-portfolio' ),
			$author->capabilities
		);

		$portfolio_cap = array(
			'read_portfolio',
			'read_private_portfolio',
			'read_private_portfolios',
			'edit_portfolio',
			'edit_portfolios',
			'edit_others_portfolios',
			'edit_private_portfolios',
			'edit_published_portfolios',
			'delete_portfolio',
			'delete_portfolios',
			'delete_others_portfolios',
			'delete_private_portfolios',
			'delete_published_portfolios',
			'publish_portfolios',

			// Terms.
			'manage_portfolio_terms',
			'edit_portfolio_terms',
			'delete_portfolio_terms',
			'assign_portfolio_terms',
		);

		$lists_cap = array(
			'read_vp_list',
			'read_private_vp_list',
			'read_private_vp_lists',
			'edit_vp_list',
			'edit_vp_lists',
			'edit_others_vp_lists',
			'edit_private_vp_lists',
			'edit_published_vp_lists',
			'delete_vp_list',
			'delete_vp_lists',
			'delete_others_vp_lists',
			'delete_private_vp_lists',
			'delete_published_vp_lists',
			'publish_vp_lists',
		);

		/**
		 * Add capacities
		 */
		foreach ( $portfolio_cap as $cap ) {
			$wp_roles->add_cap( 'portfolio_manager', $cap );
			$wp_roles->add_cap( 'portfolio_author', $cap );
			$wp_roles->add_cap( 'administrator', $cap );
			$wp_roles->add_cap( 'editor', $cap );
		}
		foreach ( $lists_cap as $cap ) {
			$wp_roles->add_cap( 'portfolio_manager', $cap );
			$wp_roles->add_cap( 'administrator', $cap );
		}

		update_option( 'visual_portfolio_updated_caps', $check_string );
	}

	/**
	 * Remove screen options from vp list page.
	 *
	 * @param bool   $return  return default value.
	 * @param object $screen_object screen object.
	 *
	 * @return bool
	 */
	public function remove_screen_options( $return, $screen_object ) {
		if ( 'vp_lists' === $screen_object->id ) {
			return false;
		}
		return $return;
	}

	/**
	 * Add featured image in portfolio list
	 *
	 * @param array $columns columns of the table.
	 *
	 * @return array
	 */
	public function add_portfolio_img_column( $columns = array() ) {
		$column_meta = array(
			'portfolio_post_thumbs' => esc_html__( 'Thumbnail', 'visual-portfolio' ),
		);

		// insert after first column.
		$columns = array_slice( $columns, 0, 1, true ) + $column_meta + array_slice( $columns, 1, null, true );

		return $columns;
	}

	/**
	 * Add thumb to the column
	 *
	 * @param bool $column_name column name.
	 */
	public function manage_portfolio_img_column( $column_name = false ) {
		if ( 'portfolio_post_thumbs' === $column_name ) {
			echo '<a href="' . esc_url( get_edit_post_link() ) . '" class="vp-portfolio__thumbnail">';
			if ( has_post_thumbnail() ) {
				the_post_thumbnail( 'thumbnail' );
			}
			echo '</a>';
		}
	}

	/**
	 * Show notice in vp_lists admin list page.
	 */
	public function add_vp_lists_notice() {
		$current_screen = get_current_screen();

		if ( ! isset( $current_screen->post_type ) || 'vp_lists' !== $current_screen->post_type ) {
			return;
		}

		?>
		<div class="notice notice-info vpf-admin-notice">
			<div class="vpf-admin-notice-icon">
				<i class="dashicons-visual-portfolio"></i>
			</div>
			<div class="vpf-admin-notice-content">
				<h3>
					<svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
					<?php echo esc_html__( 'When to use Saved Layouts', 'visual-portfolio' ); ?>
				</h3>
				<p>
					<?php
					echo wp_kses_post(
						sprintf(
							// translators: %1$s - url to documentation.
							// translators: %2$s - plugin name.
							__( 'If you are using the Gutenberg page builder for your pages and posts, you should <strong>avoid using Saved Layouts</strong>. See here more info about <a href="%1$s" target="_blank">%2$s Blocks</a>.', 'visual-portfolio' ),
							'https://visualportfolio.co/docs/portfolio-blocks/',
							visual_portfolio()->plugin_name
						)
					);
					?>
				</p>
				<p>
					<?php
					// translators: %s - url to documentation.
					echo wp_kses_post( sprintf( __( 'To reuse blocks, you can use the built-in Gutenberg feature - <a href="%s" target="_blank">Reusable Blocks</a>.', 'visual-portfolio' ), 'https://www.wpbeginner.com/beginners-guide/how-to-create-a-reusable-block-in-wordpress/' ) );
					?>
				</p>
				<p>
					<?php
					// translators: %s - url to documentation.
					echo wp_kses_post( sprintf( __( 'Saved Layouts may be only used for 3rd-party builders (such as Elementor, WPBakery Page Builder, etc.), <a href="%s" target="_blank">read more info in documentation</a>. Since WordPress moved from Shortcodes to Blocks system, we prepared for you advanced blocks.', 'visual-portfolio' ), 'https://visualportfolio.co/docs/saved-layouts-and-shortcodes/' ) );
					?>
				</p>
			</div>
		</div>
		<?php
	}

	/**
	 * Add icons and shortcode columns in vp_lists admin.
	 *
	 * @param array $columns columns of the table.
	 *
	 * @return array
	 */
	public function add_vp_lists_custom_columns( $columns = array() ) {
		// Icon column.
		$column_icon = array(
			'vp_lists_post_icon' => esc_html__( 'Icon', 'visual-portfolio' ),
		);

		// insert after first column.
		$columns = array_slice( $columns, 0, 1, true ) + $column_icon + array_slice( $columns, 1, null, true );

		// Shortcode column.
		$column_shortcode = array(
			'vp_lists_post_shortcode' => esc_html__( 'Shortcode', 'visual-portfolio' ),
		);

		// insert before last column.
		$columns = array_slice( $columns, 0, count( $columns ) - 1, true ) + $column_shortcode + array_slice( $columns, count( $columns ) - 1, null, true );

		return $columns;
	}

	/**
	 * Add icons and shortcode columns in vp_lists admin.
	 *
	 * @param bool $column_name column name.
	 */
	public function manage_vp_lists_custom_columns( $column_name = false ) {
		if ( 'vp_lists_post_icon' === $column_name ) {
			$all_layouts = Visual_Portfolio_Get::get_all_layouts();
			$opts        = Visual_Portfolio_Get::get_options( array( 'id' => get_the_ID() ) );
			$layout      = isset( $opts['layout'] ) ? $opts['layout'] : false;
			$icon        = '';

			if ( $layout ) {
				foreach ( $all_layouts as $name => $data ) {
					if ( $name === $layout && isset( $data['icon'] ) ) {
						$icon = $data['icon'];
					}
				}

				echo '<a href="' . esc_url( get_edit_post_link() ) . '" class="vp-portfolio-list__icon">';
				echo wp_kses( $icon, 'vp_svg' );
				echo '</a>';
			}
		}

		if ( 'vp_lists_post_shortcode' === $column_name ) {
			echo '<code class="vp-onclick-selection" role="button" tabIndex="0" aria-hidden="true">';
			echo '[visual_portfolio id="' . get_the_ID() . '"]';
			echo '</code>';
		}
	}

	/**
	 * Add custom filtering selects for vp_lists admin screen.
	 */
	public function restrict_manage_posts_vp_lists() {
		global $typenow;

		if ( 'vp_lists' === $typenow ) {
			$all_layouts         = Visual_Portfolio_Get::get_all_layouts();
			$all_items_styles    = Visual_Portfolio_Get::get_all_items_styles();
			$all_content_sources = array(
				'post-based'    => esc_html__( 'Posts', 'visual-portfolio' ),
				'images'        => esc_html__( 'Images', 'visual-portfolio' ),
				'social-stream' => esc_html__( 'Social', 'visual-portfolio' ),
			);

            // phpcs:ignore WordPress.Security.NonceVerification
			$selected_layout = isset( $_GET['vp_layout'] ) ? sanitize_text_field( wp_unslash( $_GET['vp_layout'] ) ) : '';
            // phpcs:ignore WordPress.Security.NonceVerification
			$selected_items_style = isset( $_GET['vp_items_style'] ) ? sanitize_text_field( wp_unslash( $_GET['vp_items_style'] ) ) : '';
            // phpcs:ignore WordPress.Security.NonceVerification
			$selected_content_source = isset( $_GET['vp_content_source'] ) ? sanitize_text_field( wp_unslash( $_GET['vp_content_source'] ) ) : '';

			?>
			<select name="vp_layout" id="filter-by-vp_layout">
				<option value="0"><?php echo esc_html__( 'All layouts', 'visual-portfolio' ); ?></option>
				<?php
				foreach ( $all_layouts as $name => $data ) {
					?>
					<option value="<?php echo esc_attr( $name ); ?>" <?php echo $name === $selected_layout ? 'selected="selected"' : ''; ?>><?php echo esc_html( $data['title'] ); ?></option>
					<?php
				}
				?>
			</select>
			<select name="vp_items_style" id="filter-by-vp_items_style">
				<option value="0"><?php echo esc_html__( 'All styles', 'visual-portfolio' ); ?></option>
				<?php
				foreach ( $all_items_styles as $name => $data ) {
					?>
					<option value="<?php echo esc_attr( $name ); ?>" <?php echo $name === $selected_items_style ? 'selected="selected"' : ''; ?>><?php echo esc_html( $data['title'] ); ?></option>
					<?php
				}
				?>
			</select>
			<select name="vp_content_source" id="filter-by-vp_content_source">
				<option value="0"><?php echo esc_html__( 'All sources', 'visual-portfolio' ); ?></option>
				<?php
				foreach ( $all_content_sources as $name => $title ) {
					?>
					<option value="<?php echo esc_attr( $name ); ?>" <?php echo $name === $selected_content_source ? 'selected="selected"' : ''; ?>><?php echo esc_html( $title ); ?></option>
					<?php
				}
				?>
			</select>
			<?php
		};
	}

	/**
	 * Custom filtering for vp_lists admin screen.
	 *
	 * @param object $query - current query data.
	 */
	public function parse_query_vp_lists( $query ) {
		global $pagenow;

		$q_vars = &$query->query_vars;

		if ( 'edit.php' === $pagenow && isset( $q_vars['post_type'] ) && 'vp_lists' === $q_vars['post_type'] ) {
			$meta_query = array();

            // phpcs:ignore WordPress.Security.NonceVerification
			$filter_layout = isset( $_GET['vp_layout'] ) ? sanitize_text_field( wp_unslash( $_GET['vp_layout'] ) ) : '';
            // phpcs:ignore WordPress.Security.NonceVerification
			$filter_items_style = isset( $_GET['vp_items_style'] ) ? sanitize_text_field( wp_unslash( $_GET['vp_items_style'] ) ) : '';
            // phpcs:ignore WordPress.Security.NonceVerification
			$filter_content_source = isset( $_GET['vp_content_source'] ) ? sanitize_text_field( wp_unslash( $_GET['vp_content_source'] ) ) : '';

			if ( $filter_layout ) {
				$meta_query[] = array(
					'key'   => 'vp_layout',
					'value' => $filter_layout,
				);
			}
			if ( $filter_items_style ) {
				$meta_query[] = array(
					'key'   => 'vp_items_style',
					'value' => $filter_items_style,
				);
			}
			if ( $filter_content_source ) {
				$meta_query[] = array(
					'key'   => 'vp_content_source',
					'value' => $filter_content_source,
				);
			}

			if ( ! empty( $meta_query ) ) {
                // phpcs:ignore WordPress.DB.SlowDBQuery.slow_db_query_meta_query
				$q_vars['meta_query'] = $meta_query;
			}
		}
	}

	/**
	 * Allowed blocks for vp_lists post type.
	 *
	 * @param array  $allowed_block_types - blocks.
	 * @param object $editor_context - editor context.
	 * @return array
	 */
	public function vp_lists_allowed_block_types_all( $allowed_block_types, $editor_context ) {
		if ( empty( $editor_context->post ) || 'vp_lists' !== $editor_context->post->post_type ) {
			return $allowed_block_types;
		}

		return array( 'visual-portfolio/saved-editor' );
	}

	/**
	 * Add admin dropdown menu with all used Layouts on the current page.
	 */
	public function wp_before_admin_bar_render() {
		global $wp_admin_bar;

		if ( ! is_super_admin() || ! is_admin_bar_showing() ) {
			return;
		}

		// add all nodes of all Slider.
		$layouts = Visual_Portfolio_Get::get_all_used_layouts();
		$layouts = array_unique( $layouts );

		if ( ! empty( $layouts ) ) {
			$wp_admin_bar->add_node(
				array(
					'parent' => false,
					'id'     => 'visual_portfolio',
					'title'  => visual_portfolio()->plugin_name,
					'href'   => admin_url( 'edit.php?post_type=vp_lists' ),
				)
			);

			// get visual-portfolio post types by IDs.
			// Don't use WP_Query on the admin side https://core.trac.wordpress.org/ticket/18408 .
			$vp_query = get_posts(
				array(
					'post_type'              => 'vp_lists',
					'posts_per_page'         => -1,
					'paged'                  => -1,
					'post__in'               => $layouts,
					'update_post_meta_cache' => false,
					'update_post_term_cache' => false,
				)
			);
			foreach ( $vp_query as $post ) {
				$wp_admin_bar->add_node(
					array(
						'parent' => 'visual_portfolio',
						'id'     => 'vp_list_' . esc_html( $post->ID ),
						'title'  => esc_html( $post->post_title ),
						'href'   => admin_url( 'post.php?post=' . $post->ID ) . '&action=edit',
					)
				);
			}
		}
	}

	/**
	 * Force set Gutenberg editor for 'vp_lists' in Classic Editor plugin.
	 *
	 * @param array  $editors    Associative array of the editors and whether they are enabled for the post type.
	 * @param string $post_type The post type.
	 */
	public function vp_lists_classic_plugin_force_gutenberg( $editors, $post_type ) {
		if ( 'vp_lists' !== $post_type ) {
			return $editors;
		}

		return array(
			'classic_editor' => false,
			'block_editor'   => true,
		);
	}

	/**
	 * Force set Gutenberg editor for 'vp_lists' in Classic Editor plugin.
	 *
	 * @param boolean $use_block_editor Use block editor.
	 * @param string  $post_type The post type.
	 */
	public function vp_lists_classic_plugin_force_gutenberg_2( $use_block_editor, $post_type ) {
		if ( 'vp_lists' !== $post_type ) {
			return $use_block_editor;
		}

		return true;
	}

	/**
	 * Force set Gutenberg editor for 'vp_lists' in 3rd-party plugins/themes, that uses their own builders.
	 *
	 * @param boolean $use_block_editor Use block editor.
	 * @param object  $post The post object.
	 */
	public function vp_lists_classic_plugin_force_gutenberg_3( $use_block_editor, $post ) {
		if ( isset( $post->post_type ) && 'vp_lists' === $post->post_type ) {
			return true;
		}

		return $use_block_editor;
	}

	/**
	 * Force enable Gutenberg in 'vp_lists' for users with disabled option "Visual Editor".
	 *
	 * @param boolean $enabled Rich edit enabled.
	 */
	public function vp_lists_user_can_richedit_force( $enabled ) {
		global $post_type;

		if ( isset( $post_type ) && 'vp_lists' !== $post_type ) {
			return $enabled;
		}

		return true;
	}

	/**
	 * Add Admin Page
	 */
	public function admin_menu() {
		// Remove Add New submenu item.
		remove_submenu_page( self::get_menu_slug(), 'post-new.php?post_type=portfolio' );

		// Documentation menu link.
		add_submenu_page(
			self::get_menu_slug(),
			esc_html__( 'Documentation', 'visual-portfolio' ),
			esc_html__( 'Documentation', 'visual-portfolio' ),
			'manage_options',
			Visual_Portfolio_Admin::get_plugin_site_url(
				array(
					'sub_path'     => 'docs/getting-started',
					'utm_campaign' => 'docs',
				)
			)
		);
	}

	/**
	 * Add Proofing Admin Page.
	 *
	 * @return void
	 */
	public function add_proofing_admin_menu() {
		// Proofing menu link.
		add_submenu_page(
			self::get_menu_slug(),
			esc_html__( 'Proofing', 'visual-portfolio' ),
			esc_html__( 'Proofing', 'visual-portfolio' ),
			'manage_options',
			'vpf_proofing_page',
			array( $this, 'go_proofing_pro_page' )
		);
	}

	/**
	 * Proofing.
	 * Render of proofing page.
	 */
	public function go_proofing_pro_page() {
        // phpcs:ignore WordPress.Security.NonceVerification
		if ( ! isset( $_GET['page'] ) || empty( $_GET['page'] ) ) {
			return;
		}

        // phpcs:ignore WordPress.Security.NonceVerification
		if ( 'vpf_proofing_page' === $_GET['page'] ) {
			$pro_url = Visual_Portfolio_Admin::get_plugin_site_url(
				array(
					'utm_medium'   => 'settings_page',
					'utm_campaign' => 'proofing',
				)
			);
			?>
			<table class="form-table" role="presentation">
				<tbody>
					<tr class="pro_info vpf-setting-type-html">
						<td>
							<div class="vpf-pro-note vpf-settings-info-pro">
								<h3>
									<?php echo esc_html__( 'Premium Only', 'visual-portfolio' ); ?>
								</h3>
								<div>
									<p class="vpf-pro-note-description"><?php echo esc_html__( 'Send a collection of photographs to your client for approval.', 'visual-portfolio' ); ?></p>
									<a class="vpf-pro-note-button" target="_blank" rel="noopener noreferrer" href="<?php echo esc_url( $pro_url ); ?>">
									<?php echo esc_html__( 'Go Pro', 'visual-portfolio' ); ?>
									</a>
								</div>
							</div>
						</td>
					</tr>
				</tbody>
			</table>
			<?php
		}
	}
}

new Visual_Portfolio_Custom_Post_Type();
