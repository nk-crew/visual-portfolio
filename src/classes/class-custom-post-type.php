<?php
/**
 * Register Custom Post Types.
 *
 * @package @@plugin_name/admin
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Class Visual_Portfolio_Custom_Post_Type
 */
class Visual_Portfolio_Custom_Post_Type {
    /**
     * Visual_Portfolio_Custom_Post_Type constructor.
     */
    public function __construct() {
        // custom post types.
        add_action( 'init', array( $this, 'add_custom_post_type' ) );
        add_action( 'restrict_manage_posts', array( $this, 'filter_custom_post_by_taxonomies' ), 10 );

        // custom post roles.
        add_action( 'init', array( $this, 'add_role_caps' ) );

        // remove screen options from portfolio list page.
        add_action( 'screen_options_show_screen', array( $this, 'remove_screen_options' ), 10, 2 );

        // show thumbnail in portfolio list table.
        add_filter( 'manage_portfolio_posts_columns', array( $this, 'add_portfolio_img_column' ) );
        add_filter( 'manage_portfolio_posts_custom_column', array( $this, 'manage_portfolio_img_column' ), 10, 2 );

        // show icon and shortcode columns in vp_lists table.
        add_filter( 'manage_vp_lists_posts_columns', array( $this, 'add_vp_lists_custom_columns' ) );
        add_filter( 'manage_vp_lists_posts_custom_column', array( $this, 'manage_vp_lists_custom_columns' ), 10, 2 );

        // change allowed blocks for vp_lists post type.
        add_filter( 'allowed_block_types', array( $this, 'vp_lists_allowed_block_types' ), 10, 2 );

        // highlight admin menu items.
        add_action( 'admin_menu', array( $this, 'admin_menu' ), 12 );

        // show admin menu dropdown with available portfolios on the current page.
        add_action( 'wp_before_admin_bar_render', array( $this, 'wp_before_admin_bar_render' ) );
    }

    /**
     * Add custom post type
     */
    public function add_custom_post_type() {
        $custom_slug = Visual_Portfolio_Settings::get_option( 'portfolio_slug', 'vp_general' );

        // portfolio items post type.
        register_post_type(
            'portfolio',
            array(
                'labels'             => array(
                    'name'               => _x( 'Portfolio Items', 'Post Type General Name', '@@text_domain' ),
                    'singular_name'      => _x( 'Portfolio Item', 'Post Type Singular Name', '@@text_domain' ),
                    'menu_name'          => __( 'Visual Portfolio', '@@text_domain' ),
                    'parent_item_colon'  => __( 'Parent Portfolio Item', '@@text_domain' ),
                    'all_items'          => __( 'Portfolio Items', '@@text_domain' ),
                    'view_item'          => __( 'View Portfolio Item', '@@text_domain' ),
                    'add_new_item'       => __( 'Add New Portfolio Item', '@@text_domain' ),
                    'add_new'            => __( 'Add New', '@@text_domain' ),
                    'edit_item'          => __( 'Edit Portfolio Item', '@@text_domain' ),
                    'update_item'        => __( 'Update Portfolio Item', '@@text_domain' ),
                    'search_items'       => __( 'Search Portfolio Item', '@@text_domain' ),
                    'not_found'          => __( 'Not Found', '@@text_domain' ),
                    'not_found_in_trash' => __( 'Not found in Trash', '@@text_domain' ),
                ),
                'public'             => true,
                'publicly_queryable' => true,
                'has_archive'        => false,
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
                    'slug'       => $custom_slug,
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
                ),
            )
        );

        register_taxonomy(
            'portfolio_category',
            'portfolio',
            array(
                'label'              => esc_html__( 'Portfolio Categories', '@@text_domain' ),
                'labels'             => array(
                    'menu_name' => esc_html__( 'Categories', '@@text_domain' ),
                ),
                'rewrite'            => array(
                    'slug' => 'portfolio-category',
                ),
                'hierarchical'       => true,
                'publicly_queryable' => false,
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
                'label'              => esc_html__( 'Portfolio Tags', '@@text_domain' ),
                'labels'             => array(
                    'menu_name' => esc_html__( 'Tags', '@@text_domain' ),
                ),
                'rewrite'            => array(
                    'slug' => 'portfolio-tag',
                ),
                'hierarchical'       => false,
                'publicly_queryable' => false,
                'show_in_nav_menus'  => true,
                'show_in_rest'       => true,
                'show_admin_column'  => true,
                'map_meta_cap'       => true,
                'capability_type'    => 'portfolio',
            )
        );

        // portfolio lists post type.
        register_post_type(
            'vp_lists',
            array(
                'labels'          => array(
                    'name'               => _x( 'Saved', 'Post Type General Name', '@@text_domain' ),
                    'singular_name'      => _x( 'Saved Layout', 'Post Type Singular Name', '@@text_domain' ),
                    'menu_name'          => __( 'Visual Portfolio', '@@text_domain' ),
                    'parent_item_colon'  => __( 'Parent Portfolio Item', '@@text_domain' ),
                    'all_items'          => __( 'Saved', '@@text_domain' ),
                    'view_item'          => __( 'View Saved Layout', '@@text_domain' ),
                    'add_new_item'       => __( 'Add New Saved Layout', '@@text_domain' ),
                    'add_new'            => __( 'Add New', '@@text_domain' ),
                    'edit_item'          => __( 'Edit Saved Layout', '@@text_domain' ),
                    'update_item'        => __( 'Update Saved Layout', '@@text_domain' ),
                    'search_items'       => __( 'Search Saved Layout', '@@text_domain' ),
                    'not_found'          => __( 'Not Found', '@@text_domain' ),
                    'not_found_in_trash' => __( 'Not found in Trash', '@@text_domain' ),
                ),
                'public'          => false,
                'has_archive'     => false,
                'show_ui'         => true,

                // adding to custom menu manually.
                'show_in_menu'    => 'edit.php?post_type=portfolio',
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
            echo '<option value="">' . sprintf( esc_html__( 'Show All %s', '@@text_domain' ), esc_html( $taxonomy_name ) ) . '</option>';
            foreach ( $terms as $term ) {
                printf(
                    '<option value="%1$s" %2$s>%3$s (%4$s)</option>',
                    esc_attr( $term->slug ),
                    // phpcs:ignore
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
        if ( get_option( 'visual_portfolio_updated_caps' ) === '@@plugin_version' ) {
            return;
        }

        $wp_roles = wp_roles();

        if ( ! isset( $wp_roles ) || empty( $wp_roles ) || ! $wp_roles ) {
            return;
        }

        $author = $wp_roles->get_role( 'author' );

        $wp_roles->add_role(
            'portfolio_manager',
            __( 'Portfolio Manager', '@@text_domain' ),
            $author->capabilities
        );
        $wp_roles->add_role(
            'portfolio_author',
            __( 'Portfolio Author', '@@text_domain' ),
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

        update_option( 'visual_portfolio_updated_caps', '@@plugin_version' );
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
            'portfolio_post_thumbs' => esc_html__( 'Thumbnail', '@@text_domain' ),
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
     * Add icons and shortcode columns in vp_lists admin.
     *
     * @param array $columns columns of the table.
     *
     * @return array
     */
    public function add_vp_lists_custom_columns( $columns = array() ) {
        // Icon column.
        $column_icon = array(
            'vp_lists_post_icon' => esc_html__( 'Icon', '@@text_domain' ),
        );

        // insert after first column.
        $columns = array_slice( $columns, 0, 1, true ) + $column_icon + array_slice( $columns, 1, null, true );

        // Shortcode column.
        $column_shortcode = array(
            'vp_lists_post_shortcode' => esc_html__( 'Shortcode', '@@text_domain' ),
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
            $all_layouts = Visual_Portfolio_Extend::layouts();
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
                // phpcs:ignore
                echo $icon;
                echo '</a>';
            }
        }

        if ( 'vp_lists_post_shortcode' === $column_name ) {
            echo '<code class="vp-onclick-selection">';
            echo '[visual_portfolio id="' . get_the_ID() . '"]';
            echo '</code>';
        }
    }

    /**
     * Allowed blocks for vp_lists post type.
     *
     * @param array  $allowed_block_types - blocks.
     * @param object $post - post object.
     * @return array
     */
    public function vp_lists_allowed_block_types( $allowed_block_types, $post ) {
        if ( 'vp_lists' !== $post->post_type ) {
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
                    'title'  => esc_html__( 'Visual Portfolio', '@@text_domain' ),
                    'href'   => admin_url( 'edit.php?post_type=vp_lists' ),
                )
            );

            // get visual-portfolio post types by IDs.
            // Don't use WP_Query on the admin side https://core.trac.wordpress.org/ticket/18408 .
            $vp_query = get_posts(
                array(
                    'post_type'      => 'vp_lists',
                    'posts_per_page' => -1,
                    'showposts'      => -1,
                    'paged'          => -1,
                    'post__in'       => $layouts,
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
     * Add Admin Page
     */
    public function admin_menu() {
        // Remove Add New submenu item.
        remove_submenu_page( 'edit.php?post_type=portfolio', 'post-new.php?post_type=portfolio' );

        // Documentation menu link.
        add_submenu_page(
            'edit.php?post_type=portfolio',
            esc_html__( 'Documentation', '@@text_domain' ),
            esc_html__( 'Documentation', '@@text_domain' ),
            'manage_options',
            'https://visualportfolio.co/documentation/getting-started/'
        );
    }
}

new Visual_Portfolio_Custom_Post_Type();
