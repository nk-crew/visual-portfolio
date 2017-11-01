<?php
/**
 * Admin
 *
 * @package visual-portfolio/admin
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

        // show thumbnail in portfolio list table.
        add_filter( 'manage_portfolio_posts_columns', array( $this, 'add_portfolio_img_column' ) );
        add_filter( 'manage_portfolio_posts_custom_column', array( $this, 'manage_portfolio_img_column' ), 10, 2 );

        // show shortcode in vp_lists table.
        add_filter( 'manage_vp_lists_posts_columns', array( $this, 'add_vp_lists_shortcode_column' ) );
        add_filter( 'manage_vp_lists_posts_custom_column', array( $this, 'manage_vp_lists_shortcode_column' ), 10, 2 );

        // highlight admin menu items.
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
        if ( 'vp_lists' === get_post_type() ) {
            // disable autosave due to it is not working for the custom metaboxes.
            wp_dequeue_script( 'autosave' );

            wp_enqueue_media();

            wp_enqueue_script( 'iframe-resizer', visual_portfolio()->plugin_url . 'assets/vendor/iframe-resizer/iframeResizer.min.js', '', '', true );

            wp_enqueue_style( 'wp-color-picker' );
            wp_enqueue_script( 'wp-color-picker-alpha', visual_portfolio()->plugin_url . 'assets/vendor/wp-color-picker-alpha/wp-color-picker-alpha.min.js', array( 'wp-color-picker' ), '', true );

            wp_enqueue_script( 'image-picker', visual_portfolio()->plugin_url . 'assets/vendor/image-picker/image-picker.min.js', array( 'jquery' ), '', true );
            wp_enqueue_style( 'image-picker', visual_portfolio()->plugin_url . 'assets/vendor/image-picker/image-picker.css' );

            wp_enqueue_script( 'rangeslider', visual_portfolio()->plugin_url . 'assets/vendor/rangeslider/rangeslider.min.js', '', '', true );
            wp_enqueue_style( 'rangeslider', visual_portfolio()->plugin_url . 'assets/vendor/rangeslider/rangeslider.css' );

            wp_enqueue_script( 'select2', visual_portfolio()->plugin_url . 'assets/vendor/select2/js/select2.min.js', array( 'jquery' ), '', true );
            wp_enqueue_style( 'select2', visual_portfolio()->plugin_url . 'assets/vendor/select2/css/select2.css' );

            wp_enqueue_script( 'conditionize', visual_portfolio()->plugin_url . 'assets/vendor/conditionize/conditionize.js', array( 'jquery' ), '', true );

            wp_enqueue_script( 'codemirror', visual_portfolio()->plugin_url . 'assets/vendor/codemirror/codemirror.js', '', '', true );
            wp_enqueue_script( 'codemirror-mode-css', visual_portfolio()->plugin_url . 'assets/vendor/codemirror/mode/css/css.js', '', '', true );
            wp_enqueue_script( 'codemirror-emmet', visual_portfolio()->plugin_url . 'assets/vendor/codemirror/addon/emmet/emmet.js', '', '', true );
            wp_enqueue_script( 'codemirror-addon-closebrackets', visual_portfolio()->plugin_url . 'assets/vendor/codemirror/addon/edit/closebrackets.js', '', '', true );
            wp_enqueue_script( 'codemirror-addon-brace-fold', visual_portfolio()->plugin_url . 'assets/vendor/codemirror/addon/fold/brace-fold.js', '', '', true );
            wp_enqueue_script( 'codemirror-addon-comment-fold', visual_portfolio()->plugin_url . 'assets/vendor/codemirror/addon/fold/comment-fold.js', '', '', true );
            wp_enqueue_script( 'codemirror-addon-foldcode', visual_portfolio()->plugin_url . 'assets/vendor/codemirror/addon/fold/foldcode.js', '', '', true );
            wp_enqueue_script( 'codemirror-addon-foldgutter', visual_portfolio()->plugin_url . 'assets/vendor/codemirror/addon/fold/foldgutter.js', '', '', true );
            wp_enqueue_script( 'codemirror-addon-css-lint', visual_portfolio()->plugin_url . 'assets/vendor/codemirror/addon/lint/css-lint.js', '', '', true );
            wp_enqueue_script( 'csslint', visual_portfolio()->plugin_url . 'assets/vendor/codemirror/addon/lint/csslint.js', '', '', true );
            wp_enqueue_script( 'codemirror-addon-lint', visual_portfolio()->plugin_url . 'assets/vendor/codemirror/addon/lint/lint.js', '', '', true );
            wp_enqueue_script( 'codemirror-addon-simplescrollbars', visual_portfolio()->plugin_url . 'assets/vendor/codemirror/addon/scroll/simplescrollbars.js', '', '', true );
            wp_enqueue_script( 'codemirror-addon-annotatescrollbar', visual_portfolio()->plugin_url . 'assets/vendor/codemirror/addon/scroll/annotatescrollbar.js', '', '', true );
            wp_enqueue_script( 'codemirror-addon-dialog', visual_portfolio()->plugin_url . 'assets/vendor/codemirror/addon/dialog/dialog.js', '', '', true );
            wp_enqueue_script( 'codemirror-addon-search', visual_portfolio()->plugin_url . 'assets/vendor/codemirror/addon/search/search.js', '', '', true );
            wp_enqueue_script( 'codemirror-addon-searchcursor', visual_portfolio()->plugin_url . 'assets/vendor/codemirror/addon/search/searchcursor.js', '', '', true );
            wp_enqueue_script( 'codemirror-addon-matchesonscrollbar', visual_portfolio()->plugin_url . 'assets/vendor/codemirror/addon/search/matchesonscrollbar.js', '', '', true );
            wp_enqueue_script( 'codemirror-addon-jump-to-line', visual_portfolio()->plugin_url . 'assets/vendor/codemirror/addon/search/jump-to-line.js', '', '', true );
            wp_enqueue_script( 'codemirror-addon-comment', visual_portfolio()->plugin_url . 'assets/vendor/codemirror/addon/comment/comment.js', '', '', true );
            wp_enqueue_script( 'codemirror-addon-continuecomment', visual_portfolio()->plugin_url . 'assets/vendor/codemirror/addon/comment/continuecomment.js', '', '', true );
            wp_enqueue_style( 'codemirror', visual_portfolio()->plugin_url . 'assets/vendor/codemirror/codemirror.css' );
            wp_enqueue_style( 'codemirror-addon-foldgutter', visual_portfolio()->plugin_url . 'assets/vendor/codemirror/addon/fold/foldgutter.css' );
            wp_enqueue_style( 'codemirror-addon-lint', visual_portfolio()->plugin_url . 'assets/vendor/codemirror/addon/lint/lint.css' );
            wp_enqueue_style( 'codemirror-addon-simplescrollbars', visual_portfolio()->plugin_url . 'assets/vendor/codemirror/addon/scroll/simplescrollbars.css' );
            wp_enqueue_style( 'codemirror-addon-dialog', visual_portfolio()->plugin_url . 'assets/vendor/codemirror/addon/dialog/dialog.css' );
            wp_enqueue_style( 'codemirror-addon-matchesonscrollbar', visual_portfolio()->plugin_url . 'assets/vendor/codemirror/addon/search/matchesonscrollbar.css' );
            wp_enqueue_style( 'codemirror-theme-eclipse', visual_portfolio()->plugin_url . 'assets/vendor/codemirror/theme/eclipse.css' );
        }

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
                'show_in_admin_bar' => true,
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
                    'excerpt',
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
        register_post_type('vp_lists',
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

        if ( in_array( $post_type, array( 'vp_lists' ) ) && 'bottom' === $which ) {
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
                    <a class="button button-primary button-hero" href="<?php echo esc_url( admin_url( 'post-new.php?post_type=vp_lists' ) ); ?>"><?php echo esc_html__( 'Create your first portfolio list!', NK_VP_DOMAIN ); ?></a>
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
    public function add_portfolio_img_column( $columns = array() ) {
        $column_meta = array(
            'portfolio_post_thumbs' => esc_html__( 'Thumbnail', NK_VP_DOMAIN ),
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
        if ( 'portfolio_post_thumbs' === $column_name && has_post_thumbnail() ) {
            echo '<a href="' . esc_url( get_edit_post_link() ) . '" class="vp-portfolio__thumbnail">';
            the_post_thumbnail( 'thumbnail' );
            echo '</a>';
        }
    }

    /**
     * Add shortcode example in vp_lists
     *
     * @param array $columns columns of the table.
     *
     * @return array
     */
    public function add_vp_lists_shortcode_column( $columns = array() ) {
        $column_meta = array(
            'vp_lists_post_shortcode' => esc_html__( 'Shortcode', NK_VP_DOMAIN ),
        );

        // insert before last column.
        $columns = array_slice( $columns, 0, count( $columns ) - 1, true ) + $column_meta + array_slice( $columns, count( $columns ) - 1, null, true );

        return $columns;
    }

    /**
     * Add shortcode example in vp_lists column
     *
     * @param bool $column_name column name.
     */
    public function manage_vp_lists_shortcode_column( $column_name = false ) {
        if ( 'vp_lists_post_shortcode' === $column_name ) {
            echo '<code class="vp-onclick-selection">';
            echo '[visual_portfolio id="' . get_the_ID() . '"]';
            echo '</code>';
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
            'edit.php?post_type=vp_lists'
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
            case 'vp_lists':
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
            'vp_lists',
            'side',
            'high'
        );
        add_meta_box(
            'vp_layout',
            esc_html__( 'Layout', NK_VP_DOMAIN ),
            array( $this, 'add_layout_metabox' ),
            'vp_lists',
            'side',
            'default'
        );
        add_meta_box(
            'vp_items_style',
            esc_html__( 'Items Style', NK_VP_DOMAIN ),
            array( $this, 'add_items_style_metabox' ),
            'vp_lists',
            'side',
            'default'
        );
        add_meta_box(
            'vp_items_click_action',
            esc_html__( 'Items Click Action', NK_VP_DOMAIN ),
            array( $this, 'add_items_click_action_metabox' ),
            'vp_lists',
            'side',
            'default'
        );
        add_meta_box(
            'vp_filter',
            esc_html__( 'Filter', NK_VP_DOMAIN ),
            array( $this, 'add_filter_metabox' ),
            'vp_lists',
            'side',
            'default'
        );
        add_meta_box(
            'vp_pagination',
            esc_html__( 'Pagination', NK_VP_DOMAIN ),
            array( $this, 'add_pagination_metabox' ),
            'vp_lists',
            'side',
            'default'
        );

        add_meta_box(
            'vp_preview',
            esc_html__( 'Preview', NK_VP_DOMAIN ),
            array( $this, 'add_preview_metabox' ),
            'vp_lists',
            'normal',
            'high'
        );
        add_meta_box(
            'vp_content_source',
            esc_html__( 'Content Source', NK_VP_DOMAIN ),
            array( $this, 'add_content_source_metabox' ),
            'vp_lists',
            'normal',
            'high'
        );
        add_meta_box(
            'vp_custom_css',
            esc_html__( 'Custom CSS', NK_VP_DOMAIN ),
            array( $this, 'add_custom_css_metabox' ),
            'vp_lists',
            'normal',
            'high'
        );
    }

    /**
     * Save metaboxes
     */
    public function save_meta_boxes() {
        add_action( 'save_post_vp_lists', array( $this, 'save_visual_portfolio_metaboxes' ) );
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
            '2-2' => '2|1,0.8|',
            '2-3' => '2|1,1.2|1,1.2|1,0.67|1,0.67|',
            '2-4' => '2|1,1.2|1,0.67|1,1.2|1,0.67|',
            '2-5' => '2|1,0.67|1,1|1,1|1,1|1,1|1,0.67|',
            '3-1' => '3|1,1|',
            '3-2' => '3|1,0.8|',
            '3-3' => '3|1,1|1,1|1,1|1,1.3|1,1.3|1,1.3|',
            '3-4' => '3|1,1|1,1|1,2|1,1|1,1|1,1|1,1|1,1|',
            '3-5' => '3|1,2|1,1|1,1|1,1|1,1|1,1|1,1|1,1|',
            '3-6' => '3|1,1|1,2|1,1|1,1|1,1|1,1|1,1|1,1|',
            '3-7' => '3|1,1|1,2|1,1|1,1|1,1|1,1|2,0.5|',
            '3-8' => '3|1,0.8|1,1.6|1,0.8|1,0.8|1,1.6|1,1.6|1,0.8|1,0.8|1,0.8|',
            '3-9' => '3|1,0.8|1,0.8|1,1.6|1,0.8|1,0.8|1,0.8|1,1.6|1,1.6|1,0.8|',
            '3-10' => '3|1,1|2,1|1,1|2,0.5|1,1|',
            '3-11' => '3|1,2|2,0.5|1,1|1,2|2,0.5|',
            '4-1' => '4|1,1|',
            '4-2' => '4|1,1|1,1.34|1,1|1,1.34|1,1.34|1,1.34|1,1|1,1|',
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

        <p></p>
        <label for="vp_stretch">
            <input name="vp_stretch" type="checkbox" id="vp_stretch" value="true" <?php checked( $meta['vp_stretch'] ); ?>>
            <?php echo esc_html__( 'Stretch', NK_VP_DOMAIN ); ?>
        </label>
        <?php
    }

    /**
     * Add Items Style metabox
     *
     * @param object $post The post object.
     */
    public function add_items_style_metabox( $post ) {
        $meta = Visual_Portfolio_Get::get_options( $post->ID );
        $styles = array(
            'default'  => __( 'Default', NK_VP_DOMAIN ),
            'fly'      => __( 'Fly', NK_VP_DOMAIN ),
            'emerge'   => __( 'Emerge', NK_VP_DOMAIN ),
            'fade'     => __( 'Fade', NK_VP_DOMAIN ),
        );

        ?>
        <p></p>
        <select class="vp-select2 vp-select2-nosearch" name="vp_items_style" id="vp_items_style">
            <?php foreach ( $styles as $style => $label ) : ?>
                <option value="<?php echo esc_attr( $style ); ?>" <?php selected( $meta['vp_items_style'], $style ); ?>>
                    <?php echo esc_html( $label ); ?>
                </option>
            <?php endforeach; ?>
        </select>

        <?php foreach ( $styles as $style => $label ) : ?>
            <div data-cond="[name=vp_items_style] == <?php echo esc_attr( $style ); ?>">

                <?php
                $opt = 'vp_items_style_' . $style . '__';
                ?>

                <p>
                    <label for="<?php echo esc_attr( $opt . 'show_title' ); ?>">
                        <input name="<?php echo esc_attr( $opt . 'show_title' ); ?>" type="checkbox" id="<?php echo esc_attr( $opt . 'show_title' ); ?>" value="true" <?php checked( $meta[ $opt . 'show_title' ] ); ?>>
                        <?php echo esc_html__( 'Show Title', NK_VP_DOMAIN ); ?>
                    </label>
                </p>

                <p>
                    <label for="<?php echo esc_attr( $opt . 'show_categories' ); ?>">
                        <input name="<?php echo esc_attr( $opt . 'show_categories' ); ?>" type="checkbox" id="<?php echo esc_attr( $opt . 'show_categories' ); ?>" value="true" <?php checked( $meta[ $opt . 'show_categories' ] ); ?>>
                        <?php echo esc_html__( 'Show Categories', NK_VP_DOMAIN ); ?>
                    </label>
                </p>

                <div data-cond="[name=<?php echo esc_attr( $opt . 'show_categories' ); ?>]">
                    <p class="post-attributes-label-wrapper">
                        <label class="post-attributes-label" for="<?php echo esc_attr( $opt . 'categories_count' ); ?>"><?php echo esc_html__( 'Categories Count:', NK_VP_DOMAIN ); ?></label>
                    </p>
                    <input name="<?php echo esc_attr( $opt . 'categories_count' ); ?>" id="<?php echo esc_attr( $opt . 'categories_count' ); ?>" class="vp-rangeslider" type="range" min="1" max="10" value="<?php echo esc_attr( $meta[ $opt . 'categories_count' ] ); ?>">
                </div>

                <p>
                    <label for="<?php echo esc_attr( $opt . 'show_date' ); ?>">
                        <input name="<?php echo esc_attr( $opt . 'show_date' ); ?>" type="checkbox" id="<?php echo esc_attr( $opt . 'show_date' ); ?>" value="true" <?php checked( $meta[ $opt . 'show_date' ] ); ?>>
                        <?php echo esc_html__( 'Show Date', NK_VP_DOMAIN ); ?>
                    </label>
                </p>

                <p>
                    <label for="<?php echo esc_attr( $opt . 'date_human_format' ); ?>">
                        <input name="<?php echo esc_attr( $opt . 'date_human_format' ); ?>" type="checkbox" id="<?php echo esc_attr( $opt . 'date_human_format' ); ?>" value="true" <?php checked( $meta[ $opt . 'date_human_format' ] ); ?>>
                        <?php echo esc_html__( 'Date in Human Format', NK_VP_DOMAIN ); ?>
                    </label>
                </p>

                <p>
                    <label for="<?php echo esc_attr( $opt . 'show_excerpt' ); ?>">
                        <input name="<?php echo esc_attr( $opt . 'show_excerpt' ); ?>" type="checkbox" id="<?php echo esc_attr( $opt . 'show_excerpt' ); ?>" value="true" <?php checked( $meta[ $opt . 'show_excerpt' ] ); ?>>
                        <?php echo esc_html__( 'Show Excerpt', NK_VP_DOMAIN ); ?>
                    </label>
                </p>

                <div data-cond="[name=<?php echo esc_attr( $opt . 'show_excerpt' ); ?>]">
                    <p class="post-attributes-label-wrapper">
                        <label class="post-attributes-label" for="<?php echo esc_attr( $opt . 'excerpt_words_count' ); ?>"><?php echo esc_html__( 'Excerpt Words Count:', NK_VP_DOMAIN ); ?></label>
                    </p>
                    <input name="<?php echo esc_attr( $opt . 'excerpt_words_count' ); ?>" id="<?php echo esc_attr( $opt . 'excerpt_words_count' ); ?>" class="vp-rangeslider" type="range" min="1" max="200" value="<?php echo esc_attr( $meta[ $opt . 'excerpt_words_count' ] ); ?>">
                </div>

                <?php if ( 'fly' === $style || 'fade' === $style ) : ?>
                    <p>
                        <label for="<?php echo esc_attr( $opt . 'show_icon' ); ?>">
                            <input name="<?php echo esc_attr( $opt . 'show_icon' ); ?>" type="checkbox" id="<?php echo esc_attr( $opt . 'show_icon' ); ?>" value="true" <?php checked( $meta[ $opt . 'show_icon' ] ); ?>>
                            <?php echo esc_html__( 'Show Icon', NK_VP_DOMAIN ); ?>
                        </label>
                    </p>

                    <div data-cond="[name=<?php echo esc_attr( $opt . 'show_icon' ); ?>]">
                        <p></p>
                        <input class="vp-input" name="<?php echo esc_attr( $opt . 'icon' ); ?>" type="text" id="<?php echo esc_attr( $opt . 'icon' ); ?>" value="<?php echo esc_attr( $meta[ $opt . 'icon' ] ); ?>">
                    </div>
                <?php endif; ?>

                <?php
                $caption_align_opt = $opt . 'align';
                ?>
                <div data-cond="[name=<?php echo esc_attr( $opt . 'show_title' ); ?>] == true || [name=<?php echo esc_attr( $opt . 'show_categories' ); ?>] == true || [name=<?php echo esc_attr( $opt . 'show_date' ); ?>] == true || [name=<?php echo esc_attr( $opt . 'show_excerpt' ); ?>] == true || [name=<?php echo esc_attr( $opt . 'show_icon' ); ?>] == true">
                    <p></p>
                    <label class="post-attributes-label" for="<?php echo esc_attr( $caption_align_opt ); ?>">
                        <?php echo esc_html__( 'Caption Align:', NK_VP_DOMAIN ); ?>
                    </label>
                    <select class="vp-select2 vp-select2-nosearch" name="<?php echo esc_attr( $caption_align_opt ); ?>" id="<?php echo esc_attr( $caption_align_opt ); ?>">

                        <?php if ( 'fly' === $style || 'fade' === $style ) : ?>
                            <optgroup label="<?php echo esc_attr__( 'Top', NK_VP_DOMAIN ); ?>">
                                <option value="top-center" <?php selected( $meta[ $caption_align_opt ], 'top-center' ); ?>>
                                    <?php echo esc_html__( 'Center', NK_VP_DOMAIN ); ?>
                                </option>
                                <option value="top-left" <?php selected( $meta[ $caption_align_opt ], 'top-left' ); ?>>
                                    <?php echo esc_html__( 'Left', NK_VP_DOMAIN ); ?>
                                </option>
                                <option value="top-right" <?php selected( $meta[ $caption_align_opt ], 'top-right' ); ?>>
                                    <?php echo esc_html__( 'Right', NK_VP_DOMAIN ); ?>
                                </option>
                            </optgroup>
                            <optgroup label="<?php echo esc_attr__( 'Center', NK_VP_DOMAIN ); ?>">
                        <?php endif; ?>

                            <option value="center" <?php selected( $meta[ $caption_align_opt ], 'center' ); ?>>
                                <?php echo esc_html__( 'Center', NK_VP_DOMAIN ); ?>
                            </option>
                            <option value="left" <?php selected( $meta[ $caption_align_opt ], 'left' ); ?>>
                                <?php echo esc_html__( 'Left', NK_VP_DOMAIN ); ?>
                            </option>
                            <option value="right" <?php selected( $meta[ $caption_align_opt ], 'right' ); ?>>
                                <?php echo esc_html__( 'Right', NK_VP_DOMAIN ); ?>
                            </option>

                        <?php if ( 'fly' === $style || 'fade' === $style ) : ?>
                            </optgroup>
                            <optgroup label="<?php echo esc_attr__( 'Bottom', NK_VP_DOMAIN ); ?>">
                                <option value="bottom-center" <?php selected( $meta[ $caption_align_opt ], 'bottom-center' ); ?>>
                                    <?php echo esc_html__( 'Center', NK_VP_DOMAIN ); ?>
                                </option>
                                <option value="bottom-left" <?php selected( $meta[ $caption_align_opt ], 'bottom-left' ); ?>>
                                    <?php echo esc_html__( 'Left', NK_VP_DOMAIN ); ?>
                                </option>
                                <option value="bottom-right" <?php selected( $meta[ $caption_align_opt ], 'bottom-right' ); ?>>
                                    <?php echo esc_html__( 'Right', NK_VP_DOMAIN ); ?>
                                </option>
                            </optgroup>
                        <?php endif; ?>
                    </select>
                </div>

                <?php if ( 'fly' === $style || 'emerge' === $style || 'fade' === $style ) : ?>
                    <p></p>
                    <label class="post-attributes-label" for="<?php echo esc_attr( $opt . 'bg_color' ); ?>">
                        <?php echo esc_html__( 'Overlay Background Color:', NK_VP_DOMAIN ); ?>
                    </label>
                    <p>
                        <input class="vp-input vp-color-picker" data-alpha="true" name="<?php echo esc_attr( $opt . 'bg_color' ); ?>" type="text" id="<?php echo esc_attr( $opt . 'bg_color' ); ?>" value="<?php echo esc_attr( $meta[ $opt . 'bg_color' ] ); ?>">
                    </p>

                    <p></p>
                    <label class="post-attributes-label" for="<?php echo esc_attr( $opt . 'text_color' ); ?>">
                        <?php echo esc_html__( 'Overlay Text Color:', NK_VP_DOMAIN ); ?>
                    </label>
                    <p>
                        <input class="vp-input vp-color-picker" data-alpha="true" name="<?php echo esc_attr( $opt . 'text_color' ); ?>" type="text" id="<?php echo esc_attr( $opt . 'text_color' ); ?>" value="<?php echo esc_attr( $meta[ $opt . 'text_color' ] ); ?>">
                    </p>
                <?php endif; ?>
            </div>
        <?php endforeach; ?>

        <?php
    }

    /**
     * Add Items Click Action metabox
     *
     * @param object $post The post object.
     */
    public function add_items_click_action_metabox( $post ) {
        $meta = Visual_Portfolio_Get::get_options( $post->ID );

        ?>
        <p></p>
        <select class="vp-select2 vp-select2-nosearch" name="vp_items_click_action" id="vp_items_click_action">
            <option value="false" <?php selected( $meta['vp_items_click_action'], 'false' ); ?>>
                <?php echo esc_html__( 'Disabled', NK_VP_DOMAIN ); ?>
            </option>
            <option value="url" <?php selected( $meta['vp_items_click_action'], 'url' ); ?>>
                <?php echo esc_html__( 'URL', NK_VP_DOMAIN ); ?>
            </option>
            <option value="popup_gallery" <?php selected( $meta['vp_items_click_action'], 'popup_gallery' ); ?>>
                <?php echo esc_html__( 'Popup Gallery', NK_VP_DOMAIN ); ?>
            </option>
        </select>
        <?php
    }

    /**
     * Add Filter metabox
     *
     * @param object $post The post object.
     */
    public function add_filter_metabox( $post ) {
        $meta = Visual_Portfolio_Get::get_options( $post->ID );

        ?>
        <p></p>
        <select class="vp-select2 vp-select2-nosearch" name="vp_filter" id="vp_filter">
            <option value="false" <?php selected( $meta['vp_filter'], 'false' ); ?>>
                <?php echo esc_html__( 'Disabled', NK_VP_DOMAIN ); ?>
            </option>
            <option value="default" <?php selected( $meta['vp_filter'], 'default' ); ?>>
                <?php echo esc_html__( 'Enabled', NK_VP_DOMAIN ); ?>
            </option>
        </select>

        <div data-cond="[name=vp_filter] != false">
            <p></p>
            <label class="post-attributes-label" for="vp_filter_align">
                <?php echo esc_html__( 'Align:', NK_VP_DOMAIN ); ?>
            </label>
            <select class="vp-select2 vp-select2-nosearch" name="vp_filter_align" id="vp_filter_align">
                <option value="center" <?php selected( $meta['vp_filter_align'], 'center' ); ?>>
                    <?php echo esc_html__( 'Center', NK_VP_DOMAIN ); ?>
                </option>
                <option value="left" <?php selected( $meta['vp_filter_align'], 'left' ); ?>>
                    <?php echo esc_html__( 'Left', NK_VP_DOMAIN ); ?>
                </option>
                <option value="right" <?php selected( $meta['vp_filter_align'], 'right' ); ?>>
                    <?php echo esc_html__( 'Right', NK_VP_DOMAIN ); ?>
                </option>
            </select>

            <p></p>
            <label for="vp_filter_show_count">
                <input name="vp_filter_show_count" type="checkbox" id="vp_filter_show_count" value="true" <?php checked( $meta['vp_filter_show_count'] ); ?>>
                <?php echo esc_html__( 'Show Count', NK_VP_DOMAIN ); ?>
            </label>
        </div>
        <?php
    }

    /**
     * Add Pagination metabox
     *
     * @param object $post The post object.
     */
    public function add_pagination_metabox( $post ) {
        $meta = Visual_Portfolio_Get::get_options( $post->ID );

        ?>
        <p></p>
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

        <div data-cond="[name=vp_pagination] != false">
            <p></p>
            <label class="post-attributes-label" for="vp_pagination_align">
                <?php echo esc_html__( 'Align:', NK_VP_DOMAIN ); ?>
            </label>
            <select class="vp-select2 vp-select2-nosearch" name="vp_pagination_align" id="vp_pagination_align">
                <option value="center" <?php selected( $meta['vp_pagination_align'], 'center' ); ?>>
                    <?php echo esc_html__( 'Center', NK_VP_DOMAIN ); ?>
                </option>
                <option value="left" <?php selected( $meta['vp_pagination_align'], 'left' ); ?>>
                    <?php echo esc_html__( 'Left', NK_VP_DOMAIN ); ?>
                </option>
                <option value="right" <?php selected( $meta['vp_pagination_align'], 'right' ); ?>>
                    <?php echo esc_html__( 'Right', NK_VP_DOMAIN ); ?>
                </option>
            </select>
        </div>

        <div data-cond="[name=vp_pagination] == paged">
            <p></p>
            <label for="vp_pagination_paged__show_arrows">
                <input name="vp_pagination_paged__show_arrows" type="checkbox" id="vp_pagination_paged__show_arrows" value="true" <?php checked( $meta['vp_pagination_paged__show_arrows'] ); ?>>
                <?php echo esc_html__( 'Show Arrows', NK_VP_DOMAIN ); ?>
            </label>
            <p></p>
            <label for="vp_pagination_paged__show_numbers">
                <input name="vp_pagination_paged__show_numbers" type="checkbox" id="vp_pagination_paged__show_numbers" value="true" <?php checked( $meta['vp_pagination_paged__show_numbers'] ); ?>>
                <?php echo esc_html__( 'Show Numbers', NK_VP_DOMAIN ); ?>
            </label>
        </div>
        <?php
    }

    /**
     * Add Preview metabox
     *
     * @param object $post The post object.
     */
    public function add_preview_metabox( $post ) {
        global $wp_rewrite;

        $url = get_site_url();

        if ( ! $wp_rewrite->using_permalinks() ) {
            $url = add_query_arg( array(
                'vp_preview' => 'vp_preview',
            ), $url );
        } else {
            $url .= '/vp_preview';
        }

        $url = add_query_arg( array(
            'vp_preview_frame' => 'true',
            'vp_preview_frame_id' => $post->ID,
        ), $url );

        ?>
        <div class="vp_list_preview">
            <iframe name="vp_list_preview_iframe" src="<?php echo esc_url( $url ); ?>" frameborder="0" noresize="noresize" scrolling="no"></iframe>
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
        <p></p>
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
     * Add Custom CSS metabox
     *
     * @param object $post The post object.
     */
    public function add_custom_css_metabox( $post ) {
        $meta = Visual_Portfolio_Get::get_options( $post->ID );
        ?>
        <p></p>
        <textarea class="vp-input" name="vp_custom_css" id="vp_custom_css" cols="30" rows="10"><?php echo esc_html( $meta['vp_custom_css'] ); ?></textarea>
        <p class="description">
            <?php echo esc_html__( 'Available classes:', NK_VP_DOMAIN ); ?>
        </p>
        <ul>
            <li><code class="vp-onclick-selection">.vp-id-<?php echo esc_html( $post->ID ); ?></code><?php echo esc_html__( ' - use this classname for each styles you added. It is the main Visual Portfolio wrapper.', NK_VP_DOMAIN ); ?></li>
            <li><code class="vp-onclick-selection">.vp-id-<?php echo esc_html( $post->ID ); ?> .vp-portfolio__items</code><?php echo esc_html__( ' - items wrapper.', NK_VP_DOMAIN ); ?></li>
            <li><code class="vp-onclick-selection">.vp-id-<?php echo esc_html( $post->ID ); ?> .vp-portfolio__item</code><?php echo esc_html__( ' - single item wrapper.', NK_VP_DOMAIN ); ?></li>
            <li><code class="vp-onclick-selection">.vp-id-<?php echo esc_html( $post->ID ); ?> .vp-filter</code><?php echo esc_html__( ' - filter wrapper.', NK_VP_DOMAIN ); ?></li>
            <li><code class="vp-onclick-selection">.vp-id-<?php echo esc_html( $post->ID ); ?> .vp-pagination</code><?php echo esc_html__( ' - pagination wrapper.', NK_VP_DOMAIN ); ?></li>
        </ul>
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

                if ( 'vp_custom_css' === $item ) {
                    $result = wp_kses( wp_unslash( $_POST[ $item ] ), array( '\'', '\"' ) );
                } else {
                    $result = sanitize_text_field( wp_unslash( $_POST[ $item ] ) );
                }

                if ( 'Array' === $result ) {
                    $result = array_map( 'sanitize_text_field', wp_unslash( $_POST[ $item ] ) );
                }

                update_post_meta( $post_id, $item, $result );
            } else {
                update_post_meta( $post_id, $item, false );
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
