<?php
/**
 * Admin
 *
 * @package visual-portfolio/admin
 */

/**
 * Admin Class
 */
class Visual_Portfolio_Admin {
    /**
     * Visual_Portfolio_Admin constructor.
     */
    public function __construct() {
        add_action( 'admin_enqueue_scripts', array( $this, 'admin_enqueue_scripts' ) );

        // cutsom post types.
        add_action( 'init', array( $this, 'add_custom_post_type' ) );

        // custom post roles.
        add_action( 'admin_init', array( $this, 'add_role_caps' ) );

        // show blank state for portfolio list page.
        add_action( 'manage_posts_extra_tablenav', array( $this, 'maybe_render_blank_state' ) );

        // improvements for custom posts.
        add_filter( 'manage_portfolio_posts_columns', array( $this, 'add_img_column' ) );
        add_filter( 'manage_portfolio_posts_custom_column', array( $this, 'manage_img_column' ), 10, 2 );
        add_action( 'admin_menu', array( $this, 'admin_menu' ) );
        add_filter( 'parent_file', array( $this, 'admin_menu_highlight_items' ) );

        // metaboxes.
        add_action( 'add_meta_boxes', array( $this, 'add_meta_boxes' ) );
        $this->save_meta_boxes();

        // ajax actions.
        add_action( 'wp_ajax_vp_find_posts', array( $this, 'ajax_find_posts' ) );
        add_action( 'wp_ajax_vp_find_taxonomies', array( $this, 'ajax_find_taxonomies' ) );
    }

    /**
     * Enqueue styles and scripts
     */
    public function admin_enqueue_scripts() {
        if ( 'visual-portfolios' === get_post_type() ) {
            // disable autosave due to it is not working for the custom metaboxes.
            wp_dequeue_script( 'autosave' );

            // enqueue portfolio styles and scripts.
            Visual_Portfolio_Get::enqueue_scripts();
        }

        wp_enqueue_script( 'image-picker', visual_portfolio()->plugin_url . 'assets/vendor/image-picker/image-picker.min.js', array( 'jquery' ), '', true );
        wp_enqueue_style( 'image-picker', visual_portfolio()->plugin_url . 'assets/vendor/image-picker/image-picker.css' );

        wp_enqueue_script( 'rangeslider', visual_portfolio()->plugin_url . 'assets/vendor/rangeslider/rangeslider.min.js', '', '', true );
        wp_enqueue_style( 'rangeslider', visual_portfolio()->plugin_url . 'assets/vendor/rangeslider/rangeslider.css' );

        wp_enqueue_script( 'select2', visual_portfolio()->plugin_url . 'assets/vendor/select2/js/select2.min.js', array( 'jquery' ), '', true );
        wp_enqueue_style( 'select2', visual_portfolio()->plugin_url . 'assets/vendor/select2/css/select2.css' );

        wp_enqueue_script( 'conditionize', visual_portfolio()->plugin_url . 'assets/vendor/conditionize/conditionize.js', array( 'jquery' ), '', true );

        wp_enqueue_script( 'visual-portfolio-admin', visual_portfolio()->plugin_url . 'assets/admin/js/script.js', array( 'jquery' ), '', true );
        wp_enqueue_style( 'visual-portfolio-admin', visual_portfolio()->plugin_url . 'assets/admin/css/style.css' );

        $data_init = array(
            'nonce' => wp_create_nonce( 'vp-ajax-nonce' ),
        );
        wp_localize_script( 'visual-portfolio-admin', 'vpAdminVariables', $data_init );
    }

    /**
     * Add custom post type
     */
    public function add_custom_post_type() {
        // portfolio items post type.
        register_post_type('portfolio',
            array(
                'labels' => array(
                    'name'                => _x( 'Portfolio Items', 'Post Type General Name', NK_VP_DOMAIN ),
                    'singular_name'       => _x( 'Portfolio Item', 'Post Type Singular Name', NK_VP_DOMAIN ),
                    'menu_name'           => __( 'Visual Portfolio', NK_VP_DOMAIN ),
                    'parent_item_colon'   => __( 'Parent Portfolio Item', NK_VP_DOMAIN ),
                    'all_items'           => __( 'All Portfolio Items', NK_VP_DOMAIN ),
                    'view_item'           => __( 'View Portfolio Item', NK_VP_DOMAIN ),
                    'add_new_item'        => __( 'Add New Portfolio Item', NK_VP_DOMAIN ),
                    'add_new'             => __( 'Add New', NK_VP_DOMAIN ),
                    'edit_item'           => __( 'Edit Portfolio Item', NK_VP_DOMAIN ),
                    'update_item'         => __( 'Update Portfolio Item', NK_VP_DOMAIN ),
                    'search_items'        => __( 'Search Portfolio Item', NK_VP_DOMAIN ),
                    'not_found'           => __( 'Not Found', NK_VP_DOMAIN ),
                    'not_found_in_trash'  => __( 'Not found in Trash', NK_VP_DOMAIN ),
                ),
                'public'       => true,
                'has_archive'  => false,
                'show_ui'      => true,

                // adding to custom menu manually.
                'show_in_menu' => false,
                'menu_icon'    => 'dashicons-visual-portfolio',
                'taxonomies'   => array(
                    'portfolio_category',
                ),
                'capabilities' => array(
                    'edit_post' => 'edit_portfolio',
                    'edit_posts' => 'edit_portfolios',
                    'edit_others_posts' => 'edit_other_portfolios',
                    'publish_posts' => 'publish_portfolios',
                    'read_post' => 'read_portfolio',
                    'read_private_posts' => 'read_private_portfolios',
                    'delete_posts' => 'delete_portfolios',
                    'delete_post' => 'delete_portfolio',
                ),
                'rewrite' => true,
                'supports' => array(
                    'title',
                    'editor',
                    'thumbnail',
                    'revisions',
                ),
            )
        );
        register_taxonomy('portfolio_category', 'portfolio', array(
            'label'         => esc_html__( 'Categories', NK_VP_DOMAIN ),
            'labels'        => array(
                'menu_name' => esc_html__( 'Categories', NK_VP_DOMAIN ),
            ),
            'rewrite'       => array(
                'slug' => 'portfolio-category',
            ),
            'hierarchical'  => true,
            'publicly_queryable' => false,
            'show_in_nav_menus' => false,
            'show_admin_column' => true,
        ));

        // portfolio lists post type.
        register_post_type('visual-portfolios',
            array(
                'labels' => array(
                    'name'                => _x( 'Portfolio Lists', 'Post Type General Name', NK_VP_DOMAIN ),
                    'singular_name'       => _x( 'Portfolio List', 'Post Type Singular Name', NK_VP_DOMAIN ),
                    'menu_name'           => __( 'Visual Portfolio', NK_VP_DOMAIN ),
                    'parent_item_colon'   => __( 'Parent Portfolio Item', NK_VP_DOMAIN ),
                    'all_items'           => __( 'All Portfolio Lists', NK_VP_DOMAIN ),
                    'view_item'           => __( 'View Portfolio List', NK_VP_DOMAIN ),
                    'add_new_item'        => __( 'Add New Portfolio List', NK_VP_DOMAIN ),
                    'add_new'             => __( 'Add New', NK_VP_DOMAIN ),
                    'edit_item'           => __( 'Edit Portfolio List', NK_VP_DOMAIN ),
                    'update_item'         => __( 'Update Portfolio List', NK_VP_DOMAIN ),
                    'search_items'        => __( 'Search Portfolio List', NK_VP_DOMAIN ),
                    'not_found'           => __( 'Not Found', NK_VP_DOMAIN ),
                    'not_found_in_trash'  => __( 'Not found in Trash', NK_VP_DOMAIN ),
                ),
                'public'       => false,
                'has_archive'  => false,
                'show_ui'      => true,

                // adding to custom menu manually.
                'show_in_menu' => false,
                'capabilities' => array(
                    'edit_post' => 'edit_portfolio',
                    'edit_posts' => 'edit_portfolios',
                    'edit_others_posts' => 'edit_other_portfolios',
                    'publish_posts' => 'publish_portfolios',
                    'read_post' => 'read_portfolio',
                    'read_private_posts' => 'read_private_portfolios',
                    'delete_posts' => 'delete_portfolios',
                    'delete_post' => 'delete_portfolio',
                ),
                'rewrite' => true,
                'supports' => array(
                    'title',
                    'revisions',
                ),
            )
        );
    }

    /**
     * Add Roles
     */
    public function add_role_caps() {
        global $wp_roles;

        if ( isset( $wp_roles ) ) {
            $wp_roles->add_cap( 'administrator', 'edit_portfolio' );
            $wp_roles->add_cap( 'administrator', 'edit_portfolios' );
            $wp_roles->add_cap( 'administrator', 'edit_other_portfolios' );
            $wp_roles->add_cap( 'administrator', 'publish_portfolios' );
            $wp_roles->add_cap( 'administrator', 'read_portfolio' );
            $wp_roles->add_cap( 'administrator', 'read_private_portfolios' );
            $wp_roles->add_cap( 'administrator', 'delete_portfolios' );
            $wp_roles->add_cap( 'administrator', 'delete_portfolio' );

            $wp_roles->add_cap( 'editor', 'read_portfolio' );
            $wp_roles->add_cap( 'editor', 'read_private_portfolios' );

            $wp_roles->add_cap( 'author', 'read_portfolio' );
            $wp_roles->add_cap( 'author', 'read_private_portfolios' );

            $wp_roles->add_cap( 'contributor', 'read_portfolio' );
            $wp_roles->add_cap( 'contributor', 'read_private_portfolios' );
        }
    }

    /**
     * Add blank page for portfolio lists
     *
     * @param string $which position.
     */
    public function maybe_render_blank_state( $which ) {
        global $post_type;

        if ( in_array( $post_type, array( 'visual-portfolios' ) ) && 'bottom' === $which ) {
            $counts = (array) wp_count_posts( $post_type );
            unset( $counts['auto-draft'] );
            $count = array_sum( $counts );

            if ( 0 < $count ) {
                return;
            }
            ?>
            <div class="vp-portfolio-list">
                <div class="vp-portfolio-list__icon">
                    <span class="dashicons-visual-portfolio-gray"></span>
                </div>
                <div class="vp-portfolio-list__text">
                    <p><?php echo esc_html__( 'Ready to add your awesome portfolio?', NK_VP_DOMAIN ); ?></p>
                    <a class="button button-primary button-hero" href="<?php echo esc_url( admin_url( 'post-new.php?post_type=visual-portfolios' ) ); ?>"><?php echo esc_html__( 'Create your first portfolio list!', NK_VP_DOMAIN ); ?></a>
                </div>
            </div>
            <style type="text/css">
                #posts-filter .wp-list-table,
                #posts-filter .tablenav.top,
                .tablenav.bottom .actions, .wrap .subsubsub,
                .wp-heading-inline + .page-title-action {
                    display: none;
                }
            </style>
            <?php
        }
    }

    /**
     * Add featured image in portfolio list
     *
     * @param array $columns columns of the table.
     *
     * @return array
     */
    public function add_img_column( $columns = array() ) {
        $column_meta = array(
            'portfolio_post_thumbs' => esc_html__( 'Thumbnail', NK_VP_DOMAIN ),
        );
        $columns = array_slice( $columns, 0, 1, true ) + $column_meta + array_slice( $columns, 1, null, true );

        return $columns;
    }

    /**
     * Add thumb to the column
     *
     * @param bool $column_name column name.
     */
    public function manage_img_column( $column_name = false ) {
        if ( 'portfolio_post_thumbs' === $column_name && has_post_thumbnail() ) {
            echo '<a href="' . esc_url( get_edit_post_link() ) . '" class="vp-portfolio__thumbnail">';
            the_post_thumbnail( 'thumbnail' );
            echo '</a>';
        }
    }

    /**
     * Add Admin Page
     */
    public function admin_menu() {
        add_menu_page(
            esc_html__( 'Visual Portfolio', NK_VP_DOMAIN ),
            esc_html__( 'Visual Portfolio', NK_VP_DOMAIN ),
            'read_portfolio',
            'visual-portfolio',
            null,
            'dashicons-visual-portfolio',
            20
        );

        add_submenu_page(
            'visual-portfolio',
            esc_html__( 'Portfolio Items', NK_VP_DOMAIN ),
            esc_html__( 'Portfolio Items', NK_VP_DOMAIN ),
            'manage_options',
            'edit.php?post_type=portfolio'
        );

        add_submenu_page(
            'visual-portfolio',
            esc_html__( 'Portfolio Lists', NK_VP_DOMAIN ),
            esc_html__( 'Portfolio Lists', NK_VP_DOMAIN ),
            'manage_options',
            'edit.php?post_type=visual-portfolios'
        );

        add_submenu_page(
            'visual-portfolio',
            esc_html__( 'Categories', NK_VP_DOMAIN ),
            esc_html__( 'Categories', NK_VP_DOMAIN ),
            'manage_options',
            'edit-tags.php?taxonomy=portfolio_category&post_type=portfolio'
        );
    }

    /**
     * Highlighting portfolio custom menu items
     *
     * @param string $parent_file - parent file.
     *
     * @return string $parent_file
     */
    public function admin_menu_highlight_items( $parent_file ) {
        global $current_screen, $submenu_file, $submenu;

        // Highlight menus.
        switch ( $current_screen->post_type ) {
            case 'portfolio':
            case 'visual-portfolios':
                $parent_file = 'visual-portfolio';

                if ( 'portfolio_category' === $current_screen->taxonomy ) {
                    $submenu_file = $current_screen->base . '.php?taxonomy=' . $current_screen->taxonomy . '&post_type=' . $current_screen->post_type;
                }

                break;
        }

        // Remove 'Visual Portfolio' sub menu item.
        if ( isset( $submenu['visual-portfolio'] ) ) {
            unset( $submenu['visual-portfolio'][0] );
        }

        return $parent_file;
    }

    /**
     * Add metaboxes
     */
    public function add_meta_boxes() {
        add_meta_box(
            'vp_name',
            esc_html__( 'Name & Shortcode', NK_VP_DOMAIN ),
            array( $this, 'add_name_metabox' ),
            'visual-portfolios',
            'side',
            'high'
        );
        add_meta_box(
            'vp_layout',
            esc_html__( 'Layout', NK_VP_DOMAIN ),
            array( $this, 'add_layout_metabox' ),
            'visual-portfolios',
            'side',
            'default'
        );
        add_meta_box(
            'vp_additional',
            esc_html__( 'Additional', NK_VP_DOMAIN ),
            array( $this, 'add_additional_metabox' ),
            'visual-portfolios',
            'side',
            'default'
        );

        add_meta_box(
            'vp_preview',
            esc_html__( 'Preview', NK_VP_DOMAIN ),
            array( $this, 'add_preview_metabox' ),
            'visual-portfolios',
            'normal',
            'high'
        );
        add_meta_box(
            'vp_content_source',
            esc_html__( 'Content Source', NK_VP_DOMAIN ),
            array( $this, 'add_content_source_metabox' ),
            'visual-portfolios',
            'normal',
            'high'
        );
    }

    /**
     * Save metaboxes
     */
    public function save_meta_boxes() {
        add_action( 'save_post_visual-portfolios', array( $this, 'save_visual_portfolio_metaboxes' ) );
    }

    /**
     * Add Title metabox
     *
     * @param object $post The post object.
     */
    public function add_name_metabox( $post ) {
        wp_nonce_field( basename( __FILE__ ), 'vp_layout_nonce' );
        ?>
        <p class="post-attributes-label-wrapper">
            <label class="post-attributes-label" for="vp_list_name"><?php echo esc_html__( 'Name:', NK_VP_DOMAIN ); ?></label>
        </p>
        <input class="vp-input" name="vp_list_name" type="text" id="vp_list_name" value="<?php echo esc_attr( $post->post_title ); ?>">

        <p class="post-attributes-label-wrapper">
            <label class="post-attributes-label" for="vp_list_shortcode"><?php echo esc_html__( 'Shortcode:', NK_VP_DOMAIN ); ?></label>
        </p>
        <input class="vp-input" name="vp_list_shortcode" type="text" id="vp_list_shortcode" value='<?php echo esc_attr( $post->ID ? '[visual_portfolio id="' . $post->ID . '"]' : '' ); ?>' readonly>
        <p class="description"><?php echo esc_html__( 'Place the shortcode where you want to show the portfolio list.', NK_VP_DOMAIN ); ?></p>
        <p></p>

        <style>
            #submitdiv {
                margin-top: -21px;
                border-top: none;
            }
            #post-body-content,
            #submitdiv .handlediv,
            #submitdiv .hndle,
            #minor-publishing {
                display: none;
            }
        </style>
        <?php
    }

    /**
     * Add Additional metabox
     *
     * @param object $post The post object.
     */
    public function add_additional_metabox( $post ) {
        $meta = Visual_Portfolio_Get::get_options( $post->ID );

        ?>
        <label class="post-attributes-label" for="vp_pagination"><?php echo esc_html__( 'Pagination:', NK_VP_DOMAIN ); ?></label>
        <select class="vp-select2 vp-select2-nosearch" name="vp_pagination" id="vp_pagination">
            <option value="false" <?php selected( $meta['vp_pagination'], 'false' ); ?>>
                <?php echo esc_html__( 'Disabled', NK_VP_DOMAIN ); ?>
            </option>
            <option value="paged" <?php selected( $meta['vp_pagination'], 'paged' ); ?>>
                <?php echo esc_html__( 'Paged', NK_VP_DOMAIN ); ?>
            </option>
            <option value="load-more" <?php selected( $meta['vp_pagination'], 'load-more' ); ?>>
                <?php echo esc_html__( 'Load More', NK_VP_DOMAIN ); ?>
            </option>
            <option value="infinite" <?php selected( $meta['vp_pagination'], 'infinite' ); ?>>
                <?php echo esc_html__( 'Infinite', NK_VP_DOMAIN ); ?>
            </option>
        </select>

        <p></p>
        <label class="post-attributes-label" for="vp_filter">Filter:</label>
        <select class="vp-select2 vp-select2-nosearch" name="vp_filter" id="vp_filter">
            <option value="false" <?php selected( $meta['vp_filter'], 'false' ); ?>>
                <?php echo esc_html__( 'Disabled', NK_VP_DOMAIN ); ?>
            </option>
            <option value="default" <?php selected( $meta['vp_filter'], 'default' ); ?>>
                <?php echo esc_html__( 'Enabled', NK_VP_DOMAIN ); ?>
            </option>
        </select>
        <?php
    }

    /**
     * Add Layout metabox
     *
     * @param object $post The post object.
     */
    public function add_layout_metabox( $post ) {
        $meta = Visual_Portfolio_Get::get_options( $post->ID );
        $layouts = array(
            'tiles'   => esc_html__( 'Tiles', NK_VP_DOMAIN ),
            'masonry' => esc_html__( 'Masonry', NK_VP_DOMAIN ),

            /*
             * TODO: Justified
                'justified' => esc_html__( 'Justified', NK_VP_DOMAIN ),
             */
        );

        $tile_types = array(
            '1-1' => '1|1,0.5|',
            '2-1' => '2|1,1|',
            '2-2' => '2|1,1.2|1,1.2|1,0.67|1,0.67|',
            '2-3' => '2|1,1.2|1,0.67|1,0.67|1,1.2|',
            '3-1' => '3|1,1|',
            '3-2' => '3|1,1|1,1|1,1|1,1.3|1,1.3|1,1.3|',
            '3-3' => '3|1,1|1,1|1,2|1,1|1,1|1,1|1,1|1,1|',
            '3-4' => '3|1,2|1,1|1,1|1,1|1,1|1,1|1,1|1,1|',
            '3-5' => '3|1,1|2,1|1,1|2,0.5|1,1|',
            '3-6' => '3|1,2|2,0.5|1,1|1,2|2,0.5|',
            '4-1' => '4|1,1|',
            '4-2' => '4|1,1|1,1.34|1,1|1,1.34|1,1.34|1,1|1,1.34|1,1|',
            '4-3' => '4|1,1|1,1|2,1|1,1|1,1|2,1|1,1|1,1|1,1|1,1|',
            '4-4' => '4|2,1|2,0.5|2,0.5|2,0.5|2,1|2,0.5|',
        );

        $tile_images_uri = visual_portfolio()->plugin_url . 'assets/admin/images/layouts/tiles-';
        ?>

        <p></p>
        <select class="vp-select2 vp-select2-nosearch" name="vp_layout">
            <?php foreach ( $layouts as $type => $title ) : ?>
                <option value="<?php echo esc_attr( $type ); ?>" <?php echo $meta['vp_layout'] === $type ? 'selected' : ''; ?>><?php echo esc_html( $title ); ?></option>
            <?php endforeach; ?>
        </select>

        <div data-cond="[name=vp_layout] == tiles">
            <p class="post-attributes-label-wrapper">
                <label class="post-attributes-label"><?php echo esc_html__( 'Type:', NK_VP_DOMAIN ); ?></label>
            </p>

            <div class="vp-image-dropdown">
                <span class="vp-image-dropdown__preview">
                    <?php
                    foreach ( $tile_types as $k => $val ) {
                        if ( $meta['vp_tiles_type'] === $val ) {
                            ?>
                            <img src="<?php echo esc_url( $tile_images_uri . $k . '.svg' ); ?>" alt="">
                            <?php
                            break;
                        }
                    }
                    ?>
                </span>
                <span class="vp-image-dropdown__title"><?php echo esc_html__( 'Select tiles type', NK_VP_DOMAIN ); ?></span>
                <div class="vp-image-dropdown__content">
                    <div>
                        <select class="vp-image-picker" name="vp_tiles_type">
                            <!-- <option data-img-src="<?php echo esc_url( $tile_images_uri . 'custom.png' ); ?>" data-img-alt="custom" value="custom">custom</option> -->
                            <?php foreach ( $tile_types as $k => $val ) : ?>
                                <option data-img-src="<?php echo esc_url( $tile_images_uri . $k . '.svg' ); ?>" data-img-alt="<?php echo esc_attr( $k ); ?>" value="<?php echo esc_attr( $val ); ?>" <?php echo $meta['vp_tiles_type'] === $val ? 'selected' : ''; ?>><?php echo esc_html( $val ); ?></option>
                            <?php endforeach; ?>
                        </select>
                    </div>
                </div>
            </div>
        </div>

        <div data-cond="[name=vp_layout] == masonry">
            <p class="post-attributes-label-wrapper">
                <label class="post-attributes-label" for="vp_masonry_columns"><?php echo esc_html__( 'Columns:', NK_VP_DOMAIN ); ?></label>
            </p>
            <input name="vp_masonry_columns" id="vp_masonry_columns" class="vp-rangeslider" type="range" min="1" max="5" value="<?php echo esc_attr( $meta['vp_masonry_columns'] ); ?>">
        </div>

        <p class="post-attributes-label-wrapper">
            <label class="post-attributes-label" for="vp_items_gap"><?php echo esc_html__( 'Gap:', NK_VP_DOMAIN ); ?></label>
        </p>
        <input name="vp_items_gap" id="vp_items_gap" class="vp-rangeslider" type="range" min="0" max="150" value="<?php echo esc_attr( $meta['vp_items_gap'] ); ?>">

        <p class="post-attributes-label-wrapper">
            <label class="post-attributes-label" for="vp_items_count"><?php echo esc_html__( 'Items Per Page:', NK_VP_DOMAIN ); ?></label>
        </p>
        <input name="vp_items_count" id="vp_items_count" class="vp-rangeslider" type="range" min="1" max="50" value="<?php echo esc_attr( $meta['vp_items_count'] ); ?>">
        <?php
    }

    /**
     * Add Preview metabox
     *
     * @param object $post The post object.
     */
    public function add_preview_metabox( $post ) {
        ?>
        <div class="vp_list_preview">
            <?php echo Visual_Portfolio_Get::get( $post->ID ); ?>
        </div>
        <?php
    }

    /**
     * Add Content Source metabox
     *
     * @param object $post The post object.
     */
    public function add_content_source_metabox( $post ) {
        $meta = Visual_Portfolio_Get::get_options( $post->ID );

        // post types list.
        $post_types = get_post_types( array(
            'public' => false,
            'name'   => 'attachment',
        ), 'names', 'NOT' );
        $post_types_list = array();
        if ( is_array( $post_types ) && ! empty( $post_types ) ) {
            foreach ( $post_types as $post_type ) {
                $post_types_list[] = array( $post_type, ucfirst( $post_type ) );
            }
        }
        $post_types_list[] = array( 'ids', esc_html__( 'Specific Posts', NK_VP_DOMAIN ) );
        $post_types_list[] = array( 'custom_query', esc_html__( 'Custom Query', NK_VP_DOMAIN ) );
        ?>
        <div class="vp-content-source">
            <input type="hidden" name="vp_content_source" value="<?php echo esc_attr( $meta['vp_content_source'] ); ?>">

            <div class="vp-content-source__item" data-content="portfolio">
                <div class="vp-content-source__item-icon">
                    <span class="dashicons dashicons-portfolio"></span>
                </div>
                <div class="vp-content-source__item-title"><?php echo esc_html__( 'Portfolio', NK_VP_DOMAIN ); ?></div>
            </div>
            <div class="vp-content-source__item" data-content="post-based">
                <div class="vp-content-source__item-icon">
                    <span class="dashicons dashicons-media-text"></span>
                </div>
                <div class="vp-content-source__item-title"><?php echo esc_html__( 'Post-Based', NK_VP_DOMAIN ); ?></div>
            </div>

            <div class="vp-content-source__item-content">
                <div data-content="portfolio">
                    <!-- Portfolio -->

                    <p>
                        <?php
                        $url = get_admin_url( null, 'edit.php?post_type=portfolio' );
                        $allowed_protocols = array(
                            'a' => array(
                                'href'   => array(),
                                'target' => array(),
                            ),
                        );

                        // translators: %1$s - escaped url.
                        // translators: %2$s - non-escaped url.
                        printf( wp_kses( __( 'Portfolio items list from <a href="%1$s" target="_blank">%2$s</a>', NK_VP_DOMAIN ), $allowed_protocols ), esc_url( $url ), esc_html( $url ) );
                        ?>
                    </p>
                </div>
                <div data-content="post-based">
                    <!-- Post-Based -->

                    <p></p>
                    <div class="vp-row">
                        <div class="vp-col-6">
                            <label class="post-attributes-label" for="vp_posts_source">
                                <?php echo esc_html__( 'Data source:', NK_VP_DOMAIN ); ?>
                            </label>
                            <select class="vp-select2" name="vp_posts_source" id="vp_posts_source">
                                <?php
                                foreach ( $post_types_list as $post_type ) {
                                    ?>
                                    <option value="<?php echo esc_attr( $post_type[0] ); ?>" <?php echo $meta['vp_posts_source'] === $post_type[0] ? 'selected' : ''; ?>><?php echo esc_html( $post_type[1] ); ?></option>
                                    <?php
                                }
                                ?>
                            </select>
                        </div>

                        <div class="vp-col-6" data-cond="[name=vp_posts_source] == ids">
                            <label class="post-attributes-label" for="vp_posts_ids">
                                <?php echo esc_html__( 'Specific Posts:', NK_VP_DOMAIN ); ?>
                            </label>
                            <select class="vp-select2 vp-select2-posts-ajax" type="text" name="vp_posts_ids[]" id="vp_posts_ids" multiple>
                                <?php
                                $selected_ids = $meta['vp_posts_ids'];
                                if ( isset( $selected_ids ) && is_array( $selected_ids ) && count( $selected_ids ) ) {
                                    $post_query = new WP_Query( array(
                                        'post_type' => 'any',
                                        'post__in' => $selected_ids,
                                    ) );

                                    if ( $post_query->have_posts() ) {
                                        while ( $post_query->have_posts() ) {
                                            $post_query->the_post();
                                            ?>
                                            <option value="<?php echo esc_attr( get_the_ID() ); ?>" selected><?php echo esc_html( get_the_title() ); ?></option>
                                            <?php
                                        }
                                        wp_reset_postdata();
                                    }
                                }
                                ?>
                            </select>
                        </div>

                        <div class="vp-col-6" data-cond="[name=vp_posts_source] != ids">
                            <label class="post-attributes-label" for="vp_posts_excluded_ids">
                                <?php echo esc_html__( 'Excluded Posts:', NK_VP_DOMAIN ); ?>
                            </label>
                            <select class="vp-select2 vp-select2-posts-ajax" data-post-type="[name=vp_posts_source]" type="text" name="vp_posts_excluded_ids[]" id="vp_posts_excluded_ids" multiple>
                                <?php
                                $excluded_ids = $meta['vp_posts_excluded_ids'];
                                if ( isset( $excluded_ids ) && is_array( $excluded_ids ) && count( $excluded_ids ) ) {
                                    $post_query = new WP_Query( array(
                                        'post_type' => 'any',
                                        'post__in' => $excluded_ids,
                                    ) );

                                    if ( $post_query->have_posts() ) {
                                        while ( $post_query->have_posts() ) {
                                            $post_query->the_post();
                                            ?>
                                            <option value="<?php echo esc_attr( get_the_ID() ); ?>" selected><?php echo esc_html( get_the_title() ); ?></option>
                                            <?php
                                        }
                                        wp_reset_postdata();
                                    }
                                }
                                ?>
                            </select>
                        </div>

                        <div class="vp-col-12" data-cond="[name=vp_posts_source] == custom_query">
                            <label class="post-attributes-label" for="vp_posts_custom_query">
                                <?php echo esc_html__( 'Custom Query:', NK_VP_DOMAIN ); ?>
                            </label>
                            <textarea class="vp-input" name="vp_posts_custom_query" id="vp_posts_custom_query" cols="30" rows="3"><?php echo esc_textarea( $meta['vp_posts_custom_query'] ); ?></textarea>
                            <p class="description">
                                <?php
                                // translators: %1$s - escaped url.
                                printf( wp_kses( __( 'Build custom query according to <a href="%1$s">WordPress Codex</a>.', NK_VP_DOMAIN ), $allowed_protocols ), esc_url( 'http://codex.wordpress.org/Function_Reference/query_posts' ) );
                                ?>
                            </p>
                        </div>

                        <div class="vp-col-clearfix"></div>

                        <div class="vp-col-6" data-cond="[name=vp_posts_source] != ids && [name=vp_posts_source] != custom_query">
                            <label class="post-attributes-label" for="vp_posts_taxonomies">
                                <?php echo esc_html__( 'Taxonomies:', NK_VP_DOMAIN ); ?>
                            </label>
                            <select class="vp-select2 vp-select2-taxonomies-ajax" name="vp_posts_taxonomies[]" id="vp_posts_taxonomies" multiple data-post-type-from="[name=vp_posts_source]">
                                <?php
                                $selected_tax = $meta['vp_posts_taxonomies'];
                                if ( isset( $selected_tax ) && is_array( $selected_tax ) && count( $selected_tax ) ) {
                                    $term_query = new WP_Term_Query( array(
                                        'include' => $selected_tax,
                                    ) );

                                    if ( ! empty( $term_query->terms ) ) {
                                        foreach ( $term_query ->terms as $term ) {
                                            ?>
                                            <option value="<?php echo esc_attr( $term->term_id ); ?>" selected><?php echo esc_html( $term->name ); ?></option>
                                            <?php
                                        }
                                    }
                                }
                                ?>
                            </select>
                        </div>
                        <div class="vp-col-6" data-cond="[name=vp_posts_source] != ids && [name=vp_posts_source] != custom_query">
                            <label class="post-attributes-label" for="vp_posts_taxonomies_relation">
                                <?php echo esc_html__( 'Taxonomies Relation:', NK_VP_DOMAIN ); ?>
                            </label>
                            <select class="vp-select2 vp-select2-nosearch" name="vp_posts_taxonomies_relation" id="vp_posts_taxonomies_relation">
                                <option value="or" <?php selected( $meta['vp_posts_taxonomies_relation'], 'or' ); ?>>
                                    <?php echo esc_html__( 'OR', NK_VP_DOMAIN ); ?>
                                </option>
                                <option value="and" <?php selected( $meta['vp_posts_taxonomies_relation'], 'and' ); ?>>
                                    <?php echo esc_html__( 'AND', NK_VP_DOMAIN ); ?>
                                </option>
                            </select>
                        </div>

                        <div class="vp-col-6">
                            <label class="post-attributes-label" for="vp_posts_order_by">
                                <?php echo esc_html__( 'Order By:', NK_VP_DOMAIN ); ?>
                            </label>
                            <select class="vp-select2 vp-select2-nosearch" name="vp_posts_order_by" id="vp_posts_order_by">
                                <option value="post_date" <?php selected( $meta['vp_posts_order_by'], 'post_date' ); ?>>
                                    <?php echo esc_html__( 'Date', NK_VP_DOMAIN ); ?>
                                </option>
                                <option value="title" <?php selected( $meta['vp_posts_order_by'], 'title' ); ?>>
                                    <?php echo esc_html__( 'Title', NK_VP_DOMAIN ); ?>
                                </option>
                                <option value="id" <?php selected( $meta['vp_posts_order_by'], 'id' ); ?>>
                                    <?php echo esc_html__( 'ID', NK_VP_DOMAIN ); ?>
                                </option>
                            </select>
                        </div>
                        <div class="vp-col-6">
                            <label class="post-attributes-label" for="vp_posts_order_direction">
                                <?php echo esc_html__( 'Order Direction:', NK_VP_DOMAIN ); ?>
                            </label>
                            <select class="vp-select2 vp-select2-nosearch" name="vp_posts_order_direction" id="vp_posts_order_direction">
                                <option value="desc" <?php selected( $meta['vp_posts_order_direction'], 'desc' ); ?>>
                                    <?php echo esc_html__( 'DESC', NK_VP_DOMAIN ); ?>
                                </option>
                                <option value="asc" <?php selected( $meta['vp_posts_order_direction'], 'asc' ); ?>>
                                    <?php echo esc_html__( 'ASC', NK_VP_DOMAIN ); ?>
                                </option>
                            </select>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <?php
    }

    /**
     * Save Layout metabox
     *
     * @param int $post_id The post ID.
     */
    public static function save_visual_portfolio_metaboxes( $post_id ) {
        if ( ! isset( $_POST['vp_layout_nonce'] ) ) {
            return;
        }

        if ( ! wp_verify_nonce( sanitize_key( $_POST['vp_layout_nonce'] ), basename( __FILE__ ) ) ) {
            return;
        }

        $meta = array_keys( Visual_Portfolio_Get::get_options( $post_id ) );

        foreach ( $meta as $item ) {
            if ( isset( $_POST[ $item ] ) ) {
                $result = sanitize_text_field( wp_unslash( $_POST[ $item ] ) );

                if ( 'Array' === $result ) {
                    $result = array_map( 'sanitize_text_field', wp_unslash( $_POST[ $item ] ) );
                }

                update_post_meta( $post_id, $item, $result );
            } else {
                delete_post_meta( $post_id, $item );
            }
        }
    }

    /**
     * Find posts ajax
     */
    public function ajax_find_posts() {
        check_ajax_referer( 'vp-ajax-nonce', 'nonce' );
        if ( ! isset( $_GET['q'] ) ) {
            wp_die();
        }
        $post_type = isset( $_GET['post_type'] ) ? sanitize_text_field( wp_unslash( $_GET['post_type'] ) ) : 'any';
        if ( ! $post_type || 'custom_query' === $post_type ) {
            $post_type = 'any';
        }

        $result = array();

        $the_query = new WP_Query( array(
            's' => sanitize_text_field( wp_unslash( $_GET['q'] ) ),
            'posts_per_page' => 50,
            'post_type' => $post_type,
        ) );
        if ( $the_query->have_posts() ) {
            while ( $the_query->have_posts() ) {
                $the_query->the_post();
                $result[] = array(
                    'id' => get_the_ID(),
                    'img' => get_the_post_thumbnail_url( null, 'thumbnail' ),
                    'title' => get_the_title(),
                    'post_type' => get_post_type( get_the_ID() ),
                );
            }
            wp_reset_postdata();
        }

        echo json_encode( $result );

        wp_die();
    }

    /**
     * Find taxonomies ajax
     */
    public function ajax_find_taxonomies() {
        check_ajax_referer( 'vp-ajax-nonce', 'nonce' );

        // get taxonomies for selected post type or all available.
        if ( isset( $_GET['post_type'] ) ) {
            $post_type = sanitize_text_field( wp_unslash( $_GET['post_type'] ) );
        } else {
            $post_type = get_post_types(array(
                'public' => false,
                'name' => 'attachment',
            ), 'names', 'NOT');
        }
        $taxonomies_names = get_object_taxonomies( $post_type );

        // if no taxonomies names found.
        if ( isset( $_GET['post_type'] ) && ! count( $taxonomies_names ) ) {
            wp_die();
        }

        $terms = new WP_Term_Query( array(
            'taxonomy' => $taxonomies_names,
            'hide_empty' => false,
            'search' => isset( $_GET['q'] ) ? sanitize_text_field( wp_unslash( $_GET['q'] ) ) : '',
        ) );

        $taxonomies_by_type = array();
        if ( ! empty( $terms->terms ) ) {
            foreach ( $terms ->terms as $term ) {
                if ( ! isset( $taxonomies_by_type[ $term->taxonomy ] ) ) {
                    $taxonomies_by_type[ $term->taxonomy ] = array();
                }
                $taxonomies_by_type[ $term->taxonomy ][] = array(
                    'id'   => $term->term_id,
                    'text' => $term->name,
                );
            }
        }

        echo json_encode( $taxonomies_by_type );

        wp_die();
    }
}
