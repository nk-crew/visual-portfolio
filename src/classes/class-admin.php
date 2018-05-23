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

        // custom post types.
        add_action( 'init', array( $this, 'add_custom_post_type' ) );

        // add post formats.
        add_action( 'after_setup_theme', array( $this, 'add_video_post_format' ), 99 );
        add_action( 'add_meta_boxes', array( $this, 'add_post_format_metaboxes' ), 1 );
        add_action( 'save_post', array( $this, 'save_post_format_metaboxes' ) );

        // custom post roles.
        add_action( 'admin_init', array( $this, 'add_role_caps' ) );

        // show blank state for portfolio list page.
        add_action( 'manage_posts_extra_tablenav', array( $this, 'maybe_render_blank_state' ) );

        // remove screen options from portfolio list page.
        add_action( 'screen_options_show_screen', array( $this, 'remove_screen_options' ), 10, 2 );

        // show thumbnail in portfolio list table.
        add_filter( 'manage_portfolio_posts_columns', array( $this, 'add_portfolio_img_column' ) );
        add_filter( 'manage_portfolio_posts_custom_column', array( $this, 'manage_portfolio_img_column' ), 10, 2 );

        // show shortcode in vp_lists table.
        add_filter( 'manage_vp_lists_posts_columns', array( $this, 'add_vp_lists_shortcode_column' ) );
        add_filter( 'manage_vp_lists_posts_custom_column', array( $this, 'manage_vp_lists_shortcode_column' ), 10, 2 );

        // highlight admin menu items.
        add_action( 'admin_menu', array( $this, 'admin_menu' ) );

        // metaboxes.
        add_action( 'add_meta_boxes', array( $this, 'add_meta_boxes' ) );
        add_action( 'save_post_vp_lists', array( $this, 'save_visual_portfolio_metaboxes' ) );

        // ajax actions.
        add_action( 'wp_ajax_vp_find_posts', array( $this, 'ajax_find_posts' ) );
        add_action( 'wp_ajax_vp_find_taxonomies', array( $this, 'ajax_find_taxonomies' ) );
        add_action( 'wp_ajax_vp_find_oembed', array( $this, 'ajax_find_oembed' ) );
    }

    /**
     * Enqueue styles and scripts
     */
    public function admin_enqueue_scripts() {
        $data_init = array(
            'nonce' => wp_create_nonce( 'vp-ajax-nonce' ),
        );

        if ( 'vp_lists' === get_post_type() ) {
            $main_classname = '.vp-id-' . get_the_ID();
            $data_init['classnames'] = array(
                $main_classname,
                $main_classname . ' .vp-portfolio__items',
                $main_classname . ' .vp-portfolio__item',
                $main_classname . ' .vp-filter',
                $main_classname . ' .vp-pagination',
            );
            $data_init['css_editor_error_notice'] = array(
                /* translators: %d: error count */
                'singular' => _n( 'There is %d error which must be fixed before you can save.', 'There are %d errors which must be fixed before you can save.', 1, NK_VP_DOMAIN ),
                /* translators: %d: error count */
                'plural'   => _n( 'There is %d error which must be fixed before you can save.', 'There are %d errors which must be fixed before you can save.', 2, NK_VP_DOMAIN ), // @todo This is lacking, as some languages have a dedicated dual form. For proper handling of plurals in JS, see #20491.
            );
            $data_init['css_editor_error_checkbox'] = esc_html__( 'Update anyway, even though it might break your site?', NK_VP_DOMAIN );

            // disable autosave due to it is not working for the custom metaboxes.
            wp_dequeue_script( 'autosave' );

            wp_enqueue_media();

            wp_enqueue_script( 'iframe-resizer', visual_portfolio()->plugin_url . 'assets/vendor/iframe-resizer/iframeResizer.min.js', '', '', true );

            wp_enqueue_style( 'wp-color-picker' );
            wp_enqueue_script( 'wp-color-picker-alpha', visual_portfolio()->plugin_url . 'assets/vendor/wp-color-picker-alpha/wp-color-picker-alpha.min.js', array( 'wp-color-picker' ), '', true );

            wp_enqueue_script( 'image-picker', visual_portfolio()->plugin_url . 'assets/vendor/image-picker/image-picker.min.js', array( 'jquery' ), '', true );
            wp_enqueue_style( 'image-picker', visual_portfolio()->plugin_url . 'assets/vendor/image-picker/image-picker.css' );

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
            wp_enqueue_script( 'codemirror-addon-csslint', visual_portfolio()->plugin_url . 'assets/vendor/codemirror/addon/lint/csslint.js', '', '', true );
            wp_enqueue_script( 'codemirror-addon-lint', visual_portfolio()->plugin_url . 'assets/vendor/codemirror/addon/lint/lint.js', '', '', true );
            wp_enqueue_script( 'codemirror-addon-show-hint', visual_portfolio()->plugin_url . 'assets/vendor/codemirror/addon/hint/show-hint.js', '', '', true );
            wp_enqueue_script( 'codemirror-addon-css-hint', visual_portfolio()->plugin_url . 'assets/vendor/codemirror/addon/hint/css-hint.js', '', '', true );
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
            wp_enqueue_style( 'codemirror-addon-show-hint', visual_portfolio()->plugin_url . 'assets/vendor/codemirror/addon/hint/show-hint.css' );
            wp_enqueue_style( 'codemirror-addon-simplescrollbars', visual_portfolio()->plugin_url . 'assets/vendor/codemirror/addon/scroll/simplescrollbars.css' );
            wp_enqueue_style( 'codemirror-addon-dialog', visual_portfolio()->plugin_url . 'assets/vendor/codemirror/addon/dialog/dialog.css' );
            wp_enqueue_style( 'codemirror-addon-matchesonscrollbar', visual_portfolio()->plugin_url . 'assets/vendor/codemirror/addon/search/matchesonscrollbar.css' );
            wp_enqueue_style( 'codemirror-theme-eclipse', visual_portfolio()->plugin_url . 'assets/vendor/codemirror/theme/eclipse.css' );
        }

        wp_enqueue_script( 'popper.js', visual_portfolio()->plugin_url . 'assets/vendor/popper.js/popper.min.js', '', '', true );
        wp_enqueue_script( 'tooltip.js', visual_portfolio()->plugin_url . 'assets/vendor/popper.js/tooltip.min.js', array( 'popper.js' ), '', true );
        wp_enqueue_style( 'popper.js', visual_portfolio()->plugin_url . 'assets/vendor/popper.js/popper.css' );

        wp_enqueue_script( 'visual-portfolio-admin', visual_portfolio()->plugin_url . 'assets/admin/js/script.js', array( 'jquery' ), '1.3.0', true );
        wp_enqueue_style( 'visual-portfolio-admin', visual_portfolio()->plugin_url . 'assets/admin/css/style.css', '', '1.3.0' );
        wp_localize_script( 'visual-portfolio-admin', 'vpAdminVariables', $data_init );
    }

    /**
     * Add custom post type
     */
    public function add_custom_post_type() {
        // portfolio items post type.
        register_post_type(
            'portfolio',
            array(
                'labels' => array(
                    'name'                => _x( 'Portfolio Items', 'Post Type General Name', NK_VP_DOMAIN ),
                    'singular_name'       => _x( 'Portfolio Item', 'Post Type Singular Name', NK_VP_DOMAIN ),
                    'menu_name'           => __( 'Visual Portfolio', NK_VP_DOMAIN ),
                    'parent_item_colon'   => __( 'Parent Portfolio Item', NK_VP_DOMAIN ),
                    'all_items'           => __( 'Portfolio Items', NK_VP_DOMAIN ),
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
                'show_in_menu' => true,
                'show_in_admin_bar' => true,
                'show_in_rest' => true,
                'menu_icon'    => 'dashicons-visual-portfolio',
                'taxonomies'   => array(
                    'portfolio_category',
                    'portfolio_tag',
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
                    'post-formats',
                ),
            )
        );
        register_taxonomy(
            'portfolio_category', 'portfolio', array(
                'label'         => esc_html__( 'Portfolio Categories', NK_VP_DOMAIN ),
                'labels'        => array(
                    'menu_name' => esc_html__( 'Categories', NK_VP_DOMAIN ),
                ),
                'rewrite'       => array(
                    'slug' => 'portfolio-category',
                ),
                'hierarchical'  => true,
                'publicly_queryable' => false,
                'show_in_nav_menus' => false,
                'show_in_rest' => true,
                'show_admin_column' => true,
            )
        );
        register_taxonomy(
            'portfolio_tag', 'portfolio', array(
                'label'         => esc_html__( 'Portfolio Tags', NK_VP_DOMAIN ),
                'labels'        => array(
                    'menu_name' => esc_html__( 'Tags', NK_VP_DOMAIN ),
                ),
                'rewrite'       => array(
                    'slug' => 'portfolio-tag',
                ),
                'hierarchical'  => false,
                'publicly_queryable' => false,
                'show_in_nav_menus' => false,
                'show_in_rest' => true,
                'show_admin_column' => true,
            )
        );

        // portfolio lists post type.
        register_post_type(
            'vp_lists',
            array(
                'labels' => array(
                    'name'                => _x( 'Portfolio Layouts', 'Post Type General Name', NK_VP_DOMAIN ),
                    'singular_name'       => _x( 'Portfolio Layout', 'Post Type Singular Name', NK_VP_DOMAIN ),
                    'menu_name'           => __( 'Visual Portfolio', NK_VP_DOMAIN ),
                    'parent_item_colon'   => __( 'Parent Portfolio Item', NK_VP_DOMAIN ),
                    'all_items'           => __( 'Portfolio Layouts', NK_VP_DOMAIN ),
                    'view_item'           => __( 'View Portfolio Layout', NK_VP_DOMAIN ),
                    'add_new_item'        => __( 'Add New Portfolio Layout', NK_VP_DOMAIN ),
                    'add_new'             => __( 'Add New', NK_VP_DOMAIN ),
                    'edit_item'           => __( 'Edit Portfolio Layout', NK_VP_DOMAIN ),
                    'update_item'         => __( 'Update Portfolio Layout', NK_VP_DOMAIN ),
                    'search_items'        => __( 'Search Portfolio Layout', NK_VP_DOMAIN ),
                    'not_found'           => __( 'Not Found', NK_VP_DOMAIN ),
                    'not_found_in_trash'  => __( 'Not found in Trash', NK_VP_DOMAIN ),
                ),
                'public'       => false,
                'has_archive'  => false,
                'show_ui'      => true,

                // adding to custom menu manually.
                'show_in_menu' => 'edit.php?post_type=portfolio',
                'show_in_rest' => true,
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
     * Add video post format.
     */
    public function add_video_post_format() {
        global $_wp_theme_features;
        $formats = array( 'video' );

        // Add existing formats.
        if ( isset( $_wp_theme_features['post-formats'] ) && isset( $_wp_theme_features['post-formats'][0] ) ) {
            $formats = array_merge( (array) $_wp_theme_features['post-formats'][0], $formats );
        }
        $formats = array_unique( $formats );

        add_theme_support( 'post-formats', $formats );
    }

    /**
     * Add post format metaboxes.
     *
     * @param string $post_type post type.
     */
    public function add_post_format_metaboxes( $post_type ) {
        if ( post_type_supports( $post_type, 'post-formats' ) ) {
            add_meta_box(
                'vp_format_video',
                esc_html__( 'Video', NK_VP_DOMAIN ),
                array( $this, 'add_video_format_metabox' ),
                null,
                'side',
                'default'
            );
        }
    }

    /**
     * Add Video Format metabox
     *
     * @param object $post The post object.
     */
    public function add_video_format_metabox( $post ) {
        wp_nonce_field( basename( __FILE__ ), 'vp_format_video_nonce' );

        $video_url = get_post_meta( $post->ID, 'video_url', true );
        $oembed_html = false;

        $wpkses_iframe = array(
            'iframe' => array(
                'src'             => array(),
                'height'          => array(),
                'width'           => array(),
                'frameborder'     => array(),
                'allowfullscreen' => array(),
            ),
        );

        if ( $video_url ) {
            $oembed = visual_portfolio()->get_oembed_data( $video_url );

            if ( $oembed && isset( $oembed['html'] ) ) {
                $oembed_html = $oembed['html'];
            }
        }
        ?>

        <p></p>
        <input class="vp-input" name="video_url" type="url" id="video_url" value="<?php echo esc_attr( $video_url ); ?>" placeholder="<?php echo esc_attr__( 'https://', NK_VP_DOMAIN ); ?>">
        <div class="vp-oembed-preview">
            <?php
            if ( $oembed_html ) {
                echo wp_kses( $oembed_html, $wpkses_iframe );
            }
            ?>
        </div>
        <style>
            #vp_format_video {
                display: <?php echo has_post_format( 'video' ) ? 'block' : 'none'; ?>;
            }
        </style>
        <?php
    }

    /**
     * Save Format metabox
     *
     * @param int $post_id The post ID.
     */
    public static function save_post_format_metaboxes( $post_id ) {
        if ( ! isset( $_POST['vp_format_video_nonce'] ) ) {
            return;
        }

        if ( ! wp_verify_nonce( sanitize_key( $_POST['vp_format_video_nonce'] ), basename( __FILE__ ) ) ) {
            return;
        }

        $meta = array(
            'video_url',
        );

        foreach ( $meta as $item ) {
            if ( isset( $_POST[ $item ] ) ) {

                $result = sanitize_text_field( wp_unslash( $_POST[ $item ] ) );

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
        if ( 'portfolio_post_thumbs' === $column_name ) {
            echo '<a href="' . esc_url( get_edit_post_link() ) . '" class="vp-portfolio__thumbnail">';
            if ( has_post_thumbnail() ) {
                the_post_thumbnail( 'thumbnail' );
            } else if ( has_post_format( 'video' ) ) {
                $video_url = get_post_meta( get_the_ID(), 'video_url', true );
                if ( $video_url ) {
                    $oembed = visual_portfolio()->get_oembed_data( $video_url );
                    if ( isset( $oembed['thumbnail_url'] ) ) {
                        ?>
                        <img src="<?php echo esc_url( $oembed['thumbnail_url'] ); ?>" alt="" />
                        <?php
                    }
                }
            }
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
        // Remove Add New submenu item.
        remove_submenu_page( 'edit.php?post_type=portfolio', 'post-new.php?post_type=portfolio' );

        // Reorder Portfolio Layouts submenu item.
        global $submenu;
        foreach ( $submenu as $page => $items ) {
            if ( 'edit.php?post_type=portfolio' === $page ) {
                foreach ( $items as $id => $meta ) {
                    if ( isset( $meta[2] ) && 'edit.php?post_type=vp_lists' === $meta[2] ) {
                        // @codingStandardsIgnoreLine
                        $submenu[ $page ][6] = $submenu[ $page ][ $id ];
                        unset( $submenu[ $page ][ $id ] );
                        ksort( $submenu[ $page ] );
                        break;
                    }
                }
            }
        }
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
     * Add Title metabox
     *
     * @param object $post The post object.
     */
    public function add_name_metabox( $post ) {
        wp_nonce_field( basename( __FILE__ ), 'vp_layout_nonce' );

        Visual_Portfolio_Controls::get(
            array(
                'type'  => 'text',
                'label' => esc_html__( 'Name', NK_VP_DOMAIN ),
                'name'  => 'vp_list_name',
                'value' => $post->post_title,
            )
        );

        Visual_Portfolio_Controls::get(
            array(
                'type'  => 'text',
                'label' => esc_html__( 'Shortcode', NK_VP_DOMAIN ),
                'description' => esc_html__( 'Place the shortcode where you want to show the portfolio list.', NK_VP_DOMAIN ),
                'name'  => 'vp_list_shortcode',
                'value' => $post->ID ? '[visual_portfolio id="' . $post->ID . '" class=""]' : '',
                'readonly' => true,
            )
        );

        ?>

        <style>
            #submitdiv {
                margin-top: -21px;
                border-top: none;
            }
            #post-body-content,
            #submitdiv .handlediv,
            #submitdiv .hndle,
            #minor-publishing,
            .wrap h1.wp-heading-inline,
            .page-title-action {
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

        Visual_Portfolio_Controls::get(
            array(
                'type'  => 'select2',
                'name'  => 'vp_layout',
                'value' => $meta['vp_layout'],
                'options' => array(
                    'tiles'   => esc_html__( 'Tiles', NK_VP_DOMAIN ),
                    'masonry' => esc_html__( 'Masonry', NK_VP_DOMAIN ),

                /*
                 * TODO: Justified
                    'justified' => esc_html__( 'Justified', NK_VP_DOMAIN ),
                 */
                ),
            )
        );
        ?>

        <div data-cond="[name=vp_layout] == tiles">
            <div class="vp-control">
                <label><?php echo esc_html__( 'Type', NK_VP_DOMAIN ); ?></label>

                <div class="vp-control-image-dropdown">
                    <span class="vp-control-image-dropdown__preview">
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
                    <span class="vp-control-image-dropdown__title"><?php echo esc_html__( 'Select tiles type', NK_VP_DOMAIN ); ?></span>
                    <div class="vp-control-image-dropdown__content">
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
        </div>

        <div data-cond="[name=vp_layout] == masonry">
            <?php
            Visual_Portfolio_Controls::get(
                array(
                    'type'  => 'range',
                    'label' => esc_html__( 'Columns', NK_VP_DOMAIN ),
                    'name'  => 'vp_masonry_columns',
                    'value' => $meta['vp_masonry_columns'],
                    'min'   => 1,
                    'max'   => 5,
                )
            );
            ?>
        </div>

        <?php
        Visual_Portfolio_Controls::get(
            array(
                'type'  => 'range',
                'label' => esc_html__( 'Gap', NK_VP_DOMAIN ),
                'name'  => 'vp_items_gap',
                'value' => $meta['vp_items_gap'],
                'min'   => 0,
                'max'   => 150,
            )
        );

        Visual_Portfolio_Controls::get(
            array(
                'type'  => 'range',
                'label' => esc_html__( 'Items per page', NK_VP_DOMAIN ),
                'name'  => 'vp_items_count',
                'value' => $meta['vp_items_count'],
                'min'   => 1,
                'max'   => 50,
            )
        );

        Visual_Portfolio_Controls::get(
            array(
                'type'  => 'toggle',
                'label' => esc_html__( 'Stretch', NK_VP_DOMAIN ),
                'name'  => 'vp_stretch',
                'value' => $meta['vp_stretch'],
                'hint'  => esc_attr__( 'Break container and display it wide', NK_VP_DOMAIN ),
                'hint_place'  => 'left',
            )
        );
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

        Visual_Portfolio_Controls::get(
            array(
                'type'  => 'select2',
                'name'  => 'vp_items_style',
                'value' => $meta['vp_items_style'],
                'options' => $styles,
            )
        );
        ?>

        <?php foreach ( $styles as $style => $label ) : ?>
            <div data-cond="[name=vp_items_style] == <?php echo esc_attr( $style ); ?>">

                <?php
                $opt = 'vp_items_style_' . $style . '__';

                Visual_Portfolio_Controls::get(
                    array(
                        'type'  => 'toggle',
                        'label'  => esc_html__( 'Show title', NK_VP_DOMAIN ),
                        'name'  => $opt . 'show_title',
                        'value' => $meta[ $opt . 'show_title' ],
                    )
                );

                Visual_Portfolio_Controls::get(
                    array(
                        'type'  => 'toggle',
                        'label'  => esc_html__( 'Show categories', NK_VP_DOMAIN ),
                        'name'  => $opt . 'show_categories',
                        'value' => $meta[ $opt . 'show_categories' ],
                    )
                );
                ?>

                <div data-cond="[name=<?php echo esc_attr( $opt . 'show_categories' ); ?>]">
                    <?php
                    Visual_Portfolio_Controls::get(
                        array(
                            'type'  => 'range',
                            'label' => esc_html__( 'Categories count', NK_VP_DOMAIN ),
                            'name'  => $opt . 'categories_count',
                            'value' => $meta[ $opt . 'categories_count' ],
                            'min'   => 1,
                            'max'   => 10,
                        )
                    );
                    ?>
                </div>

                <?php
                Visual_Portfolio_Controls::get(
                    array(
                        'type'  => 'select2',
                        'label' => esc_html__( 'Show date', NK_VP_DOMAIN ),
                        'name'  => $opt . 'show_date',
                        'value' => $meta[ $opt . 'show_date' ],
                        'options' => array(
                            'false' => esc_html__( 'False', NK_VP_DOMAIN ),
                            'true'  => esc_html__( 'Show', NK_VP_DOMAIN ),
                            'human' => esc_html__( 'Human Format', NK_VP_DOMAIN ),
                        ),
                    )
                );
                ?>
                <div data-cond="[name=<?php echo esc_attr( $opt . 'show_date' ); ?>] == true">
                    <?php
                    Visual_Portfolio_Controls::get(
                        array(
                            'type'  => 'text',
                            'name'  => $opt . 'date_format',
                            'value' => $meta[ $opt . 'date_format' ],
                            'placeholder' => 'F j, Y',
                            'hint' => esc_attr__( "Date format \r\n Example: F j, Y", NK_VP_DOMAIN ),
                            'hint_place' => 'left',
                        )
                    );
                    ?>
                </div>

                <?php
                Visual_Portfolio_Controls::get(
                    array(
                        'type'  => 'toggle',
                        'label'  => esc_html__( 'Show excerpt', NK_VP_DOMAIN ),
                        'name'  => $opt . 'show_excerpt',
                        'value' => $meta[ $opt . 'show_excerpt' ],
                    )
                );
                ?>

                <div data-cond="[name=<?php echo esc_attr( $opt . 'show_excerpt' ); ?>]">
                    <?php
                    Visual_Portfolio_Controls::get(
                        array(
                            'type'  => 'range',
                            'label' => esc_html__( 'Excerpt words count', NK_VP_DOMAIN ),
                            'name'  => $opt . 'excerpt_words_count',
                            'value' => $meta[ $opt . 'excerpt_words_count' ],
                            'min'   => 1,
                            'max'   => 200,
                        )
                    );
                    ?>
                </div>

                <?php if ( 'fly' === $style || 'fade' === $style ) : ?>
                    <?php
                    Visual_Portfolio_Controls::get(
                        array(
                            'type'  => 'toggle',
                            'label'  => esc_html__( 'Show icon', NK_VP_DOMAIN ),
                            'name'  => $opt . 'show_icon',
                            'value' => $meta[ $opt . 'show_icon' ],
                        )
                    );
                    ?>

                    <div data-cond="[name=<?php echo esc_attr( $opt . 'show_icon' ); ?>]">
                        <?php
                        Visual_Portfolio_Controls::get(
                            array(
                                'type'  => 'text',
                                'name'  => $opt . 'icon',
                                'value' => $meta[ $opt . 'icon' ],
                                'placeholder' => esc_attr__( 'Standard icon', NK_VP_DOMAIN ),
                                'hint' => esc_attr__( 'Standard icon', NK_VP_DOMAIN ),
                                'hint_place' => 'left',
                            )
                        );

                        Visual_Portfolio_Controls::get(
                            array(
                                'type'  => 'text',
                                'name'  => $opt . 'icon_video',
                                'value' => $meta[ $opt . 'icon_video' ],
                                'placeholder' => esc_attr__( 'Video icon', NK_VP_DOMAIN ),
                                'hint' => esc_attr__( 'Video icon', NK_VP_DOMAIN ),
                                'hint_place' => 'left',
                            )
                        );
                        ?>
                    </div>
                <?php endif; ?>

                <?php
                $caption_align_opt = $opt . 'align';
                ?>
                <div data-cond="[name=<?php echo esc_attr( $opt . 'show_title' ); ?>] == true || [name=<?php echo esc_attr( $opt . 'show_categories' ); ?>] == true || [name=<?php echo esc_attr( $opt . 'show_date' ); ?>] == true || [name=<?php echo esc_attr( $opt . 'show_excerpt' ); ?>] == true || [name=<?php echo esc_attr( $opt . 'show_icon' ); ?>] == true">

                    <div class="vp-control">
                        <label for="<?php echo esc_attr( $caption_align_opt ); ?>">
                            <?php echo esc_html__( 'Caption align', NK_VP_DOMAIN ); ?>
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
                </div>

                <?php if ( 'fly' === $style || 'emerge' === $style || 'fade' === $style ) : ?>
                    <?php
                    Visual_Portfolio_Controls::get(
                        array(
                            'type'  => 'color',
                            'label'  => esc_html__( 'Overlay background color', NK_VP_DOMAIN ),
                            'name'  => $opt . 'bg_color',
                            'value' => $meta[ $opt . 'bg_color' ],
                            'alpha' => true,
                        )
                    );

                    Visual_Portfolio_Controls::get(
                        array(
                            'type'  => 'color',
                            'label'  => esc_html__( 'Overlay text color', NK_VP_DOMAIN ),
                            'name'  => $opt . 'text_color',
                            'value' => $meta[ $opt . 'text_color' ],
                            'alpha' => true,
                        )
                    );
                    ?>
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
        Visual_Portfolio_Controls::get(
            array(
                'type'  => 'select2',
                'name'  => 'vp_items_click_action',
                'value' => $meta['vp_items_click_action'],
                'options' => array(
                    'false' => esc_html__( 'Disabled', NK_VP_DOMAIN ),
                    'url' => esc_html__( 'URL', NK_VP_DOMAIN ),
                    'popup_gallery' => esc_html__( 'Popup Gallery', NK_VP_DOMAIN ),
                ),
            )
        );
    }

    /**
     * Add Filter metabox
     *
     * @param object $post The post object.
     */
    public function add_filter_metabox( $post ) {
        $meta = Visual_Portfolio_Get::get_options( $post->ID );

        Visual_Portfolio_Controls::get(
            array(
                'type'  => 'select2',
                'name'  => 'vp_filter',
                'value' => $meta['vp_filter'],
                'options' => array(
                    'false' => esc_html__( 'Disabled', NK_VP_DOMAIN ),
                    'default' => esc_html__( 'Enabled', NK_VP_DOMAIN ),
                ),
            )
        );
        ?>

        <div data-cond="[name=vp_filter] != false">
            <?php
            Visual_Portfolio_Controls::get(
                array(
                    'type'  => 'select2',
                    'label' => esc_html__( 'Align', NK_VP_DOMAIN ),
                    'name'  => 'vp_filter_align',
                    'value' => $meta['vp_filter_align'],
                    'options' => array(
                        'center' => esc_html__( 'Center', NK_VP_DOMAIN ),
                        'left' => esc_html__( 'Left', NK_VP_DOMAIN ),
                        'right' => esc_html__( 'Right', NK_VP_DOMAIN ),
                    ),
                )
            );

            Visual_Portfolio_Controls::get(
                array(
                    'type'  => 'toggle',
                    'label' => esc_html__( 'Show count', NK_VP_DOMAIN ),
                    'name'  => 'vp_filter_show_count',
                    'value' => $meta['vp_filter_show_count'],
                )
            );
            ?>
        </div>
        <?php

        Visual_Portfolio_Controls::get(
            array(
                'type'  => 'text',
                'label' => esc_html__( 'Filter Shortcode', NK_VP_DOMAIN ),
                'description' => esc_html__( 'Place the shortcode where you want to show the filter.', NK_VP_DOMAIN ),
                'name'  => 'vp_filter_shortcode',
                'value' => $post->ID ? '[visual_portfolio_filter id="' . $post->ID . '" align="' . esc_attr( $meta['vp_filter_align'] ) . '" show_count="' . esc_attr( $meta['vp_filter_show_count'] ? 'true' : 'false' ) . '" class=""]' : '',
                'readonly' => true,
            )
        );
    }

    /**
     * Add Pagination metabox
     *
     * @param object $post The post object.
     */
    public function add_pagination_metabox( $post ) {
        $meta = Visual_Portfolio_Get::get_options( $post->ID );

        Visual_Portfolio_Controls::get(
            array(
                'type'  => 'select2',
                'name'  => 'vp_pagination',
                'value' => $meta['vp_pagination'],
                'options' => array(
                    'false' => esc_html__( 'Disabled', NK_VP_DOMAIN ),
                    'paged' => esc_html__( 'Paged', NK_VP_DOMAIN ),
                    'load-more' => esc_html__( 'Load More', NK_VP_DOMAIN ),
                    'infinite' => esc_html__( 'Infinite', NK_VP_DOMAIN ),
                ),
            )
        );
        ?>

        <div data-cond="[name=vp_pagination] != false">
            <?php
            Visual_Portfolio_Controls::get(
                array(
                    'type'  => 'select2',
                    'label'  => esc_html__( 'Align', NK_VP_DOMAIN ),
                    'name'  => 'vp_pagination_align',
                    'value' => $meta['vp_pagination_align'],
                    'options' => array(
                        'center' => esc_html__( 'Center', NK_VP_DOMAIN ),
                        'left' => esc_html__( 'Left', NK_VP_DOMAIN ),
                        'right' => esc_html__( 'Right', NK_VP_DOMAIN ),
                    ),
                )
            );
            ?>
        </div>

        <div data-cond="[name=vp_pagination] == paged">
            <?php
            Visual_Portfolio_Controls::get(
                array(
                    'type'  => 'toggle',
                    'label'  => esc_html__( 'Show arrows', NK_VP_DOMAIN ),
                    'name'  => 'vp_pagination_paged__show_arrows',
                    'value' => $meta['vp_pagination_paged__show_arrows'],
                )
            );

            Visual_Portfolio_Controls::get(
                array(
                    'type'  => 'toggle',
                    'label'  => esc_html__( 'Show numbers', NK_VP_DOMAIN ),
                    'name'  => 'vp_pagination_paged__show_numbers',
                    'value' => $meta['vp_pagination_paged__show_numbers'],
                )
            );
            ?>
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
            $url = add_query_arg(
                array(
                    'vp_preview' => 'vp_preview',
                ), $url
            );
        } else {
            $url .= '/vp_preview';
        }

        $url = add_query_arg(
            array(
                'vp_preview_frame' => 'true',
                'vp_preview_frame_id' => $post->ID,
            ), $url
        );

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
        $post_types = get_post_types(
            array(
                'public' => false,
                'name'   => 'attachment',
            ), 'names', 'NOT'
        );
        $post_types_list = array();
        if ( is_array( $post_types ) && ! empty( $post_types ) ) {
            foreach ( $post_types as $post_type ) {
                $post_types_list[ $post_type ] = ucfirst( $post_type );
            }
        }
        $post_types_list['ids'] = esc_html__( 'Specific Posts', NK_VP_DOMAIN );
        $post_types_list['custom_query'] = esc_html__( 'Custom Query', NK_VP_DOMAIN );
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
                            <?php
                            Visual_Portfolio_Controls::get(
                                array(
                                    'type'  => 'select2',
                                    'label'  => esc_html__( 'Data source', NK_VP_DOMAIN ),
                                    'name'  => 'vp_posts_source',
                                    'value' => $meta['vp_posts_source'],
                                    'searchable' => true,
                                    'options' => $post_types_list,
                                )
                            );
                            ?>
                        </div>

                        <div class="vp-col-6" data-cond="[name=vp_posts_source] == ids">
                            <?php
                            $selected_ids = $meta['vp_posts_ids'];
                            $selected_array = array();
                            if ( isset( $selected_ids ) && is_array( $selected_ids ) && count( $selected_ids ) ) {
                                $post_query = new WP_Query(
                                    array(
                                        'post_type' => 'any',
                                        'post__in' => $selected_ids,
                                    )
                                );

                                if ( $post_query->have_posts() ) {
                                    while ( $post_query->have_posts() ) {
                                        $post_query->the_post();
                                        $selected_array[ get_the_ID() ] = get_the_title();
                                    }
                                    wp_reset_postdata();
                                }
                            }
                            Visual_Portfolio_Controls::get(
                                array(
                                    'type'  => 'select2',
                                    'label'  => esc_html__( 'Specific posts', NK_VP_DOMAIN ),
                                    'name'  => 'vp_posts_ids',
                                    'value' => $selected_ids,
                                    'searchable' => true,
                                    'multiple' => true,
                                    'options' => $selected_array,
                                    'class' => 'vp-select2-posts-ajax',
                                )
                            );
                            ?>
                        </div>

                        <div class="vp-col-6" data-cond="[name=vp_posts_source] != ids">
                            <?php
                            $excluded_ids = $meta['vp_posts_excluded_ids'];
                            $excluded_array = array();
                            if ( isset( $excluded_ids ) && is_array( $excluded_ids ) && count( $excluded_ids ) ) {
                                $post_query = new WP_Query(
                                    array(
                                        'post_type' => 'any',
                                        'post__in' => $excluded_ids,
                                    )
                                );

                                if ( $post_query->have_posts() ) {
                                    while ( $post_query->have_posts() ) {
                                        $post_query->the_post();
                                        $excluded_array[ get_the_ID() ] = get_the_title();
                                    }
                                    wp_reset_postdata();
                                }
                            }

                            Visual_Portfolio_Controls::get(
                                array(
                                    'type'  => 'select2',
                                    'label'  => esc_html__( 'Excluded posts', NK_VP_DOMAIN ),
                                    'name'  => 'vp_posts_excluded_ids',
                                    'value' => (array) $excluded_ids,
                                    'searchable' => true,
                                    'multiple' => true,
                                    'post_type' => '[name=vp_posts_source]',
                                    'options' => $excluded_array,
                                    'class' => 'vp-select2-posts-ajax',
                                )
                            );
                            ?>
                        </div>

                        <div class="vp-col-12" data-cond="[name=vp_posts_source] == custom_query">
                            <?php
                            Visual_Portfolio_Controls::get(
                                array(
                                    'type'  => 'textarea',
                                    'label'  => esc_html__( 'Custom query', NK_VP_DOMAIN ),
                                    // translators: %1$s - escaped url.
                                    'description'  => sprintf( wp_kses( __( 'Build custom query according to <a href="%1$s">WordPress Codex</a>.', NK_VP_DOMAIN ), $allowed_protocols ), esc_url( 'http://codex.wordpress.org/Function_Reference/query_posts' ) ),
                                    'name'  => 'vp_posts_custom_query',
                                    'value' => $meta['vp_posts_custom_query'],
                                    'cols' => 30,
                                    'rows' => 3,
                                )
                            );
                            ?>
                        </div>

                        <div class="vp-col-clearfix"></div>

                        <div class="vp-col-6" data-cond="[name=vp_posts_source] != ids && [name=vp_posts_source] != custom_query">
                            <?php
                            $selected_tax = $meta['vp_posts_taxonomies'];
                            $selected_tax_arr = array();

                            if ( isset( $selected_tax ) && is_array( $selected_tax ) && count( $selected_tax ) ) {

                                // TODO: Not sure that include works...
                                $term_query = new WP_Term_Query(
                                    array(
                                        'include' => $selected_tax,
                                    )
                                );

                                if ( ! empty( $term_query->terms ) ) {
                                    foreach ( $term_query->terms as $term ) {
                                        $selected_tax_arr[ $term->term_id ] = $term->name;
                                    }
                                }
                            }
                            Visual_Portfolio_Controls::get(
                                array(
                                    'type'  => 'select2',
                                    'label'  => esc_html__( 'Taxonomies', NK_VP_DOMAIN ),
                                    'name'  => 'vp_posts_taxonomies',
                                    'value' => (array) $selected_tax,
                                    'searchable' => true,
                                    'multiple' => true,
                                    'post_type' => '[name=vp_posts_source]',
                                    'options' => $selected_tax_arr,
                                    'class' => 'vp-select2-taxonomies-ajax',
                                )
                            );
                            ?>
                        </div>
                        <div class="vp-col-6" data-cond="[name=vp_posts_source] != ids && [name=vp_posts_source] != custom_query">
                            <?php
                            Visual_Portfolio_Controls::get(
                                array(
                                    'type'  => 'select2',
                                    'label'  => esc_html__( 'Taxonomies relation', NK_VP_DOMAIN ),
                                    'name'  => 'vp_posts_taxonomies_relation',
                                    'value'  => $meta['vp_posts_taxonomies_relation'],
                                    'options' => array(
                                        'or' => esc_html__( 'OR', NK_VP_DOMAIN ),
                                        'and' => esc_html__( 'AND', NK_VP_DOMAIN ),
                                    ),
                                )
                            );
                            ?>
                        </div>

                        <div class="vp-col-6">
                            <?php
                            Visual_Portfolio_Controls::get(
                                array(
                                    'type'  => 'select2',
                                    'label'  => esc_html__( 'Order by', NK_VP_DOMAIN ),
                                    'name'  => 'vp_posts_order_by',
                                    'value'  => $meta['vp_posts_order_by'],
                                    'options' => array(
                                        'post_date' => esc_html__( 'Date', NK_VP_DOMAIN ),
                                        'title' => esc_html__( 'Title', NK_VP_DOMAIN ),
                                        'id' => esc_html__( 'ID', NK_VP_DOMAIN ),
                                        'rand' => esc_html__( 'Random', NK_VP_DOMAIN ),
                                    ),
                                )
                            );
                            ?>
                        </div>
                        <div class="vp-col-6">
                            <?php
                            Visual_Portfolio_Controls::get(
                                array(
                                    'type'  => 'select2',
                                    'label'  => esc_html__( 'Order direction', NK_VP_DOMAIN ),
                                    'name'  => 'vp_posts_order_direction',
                                    'value'  => $meta['vp_posts_order_direction'],
                                    'options' => array(
                                        'desc' => esc_html__( 'DESC', NK_VP_DOMAIN ),
                                        'asc' => esc_html__( 'ASC', NK_VP_DOMAIN ),
                                    ),
                                )
                            );
                            ?>
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

        $the_query = new WP_Query(
            array(
                's' => sanitize_text_field( wp_unslash( $_GET['q'] ) ),
                'posts_per_page' => 50,
                'post_type' => $post_type,
            )
        );
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
            $post_type = get_post_types(
                array(
                    'public' => false,
                    'name' => 'attachment',
                ), 'names', 'NOT'
            );
        }
        $taxonomies_names = get_object_taxonomies( $post_type );

        // if no taxonomies names found.
        if ( isset( $_GET['post_type'] ) && ! count( $taxonomies_names ) ) {
            wp_die();
        }

        $terms = new WP_Term_Query(
            array(
                'taxonomy' => $taxonomies_names,
                'hide_empty' => false,
                'search' => isset( $_GET['q'] ) ? sanitize_text_field( wp_unslash( $_GET['q'] ) ) : '',
            )
        );

        $taxonomies_by_type = array();
        if ( ! empty( $terms->terms ) ) {
            foreach ( $terms->terms as $term ) {
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

    /**
     * Find taxonomies ajax
     */
    public function ajax_find_oembed() {
        check_ajax_referer( 'vp-ajax-nonce', 'nonce' );
        if ( ! isset( $_GET['q'] ) ) {
            wp_die();
        }

        $oembed = visual_portfolio()->get_oembed_data( sanitize_text_field( wp_unslash( $_GET['q'] ) ) );

        if ( ! isset( $oembed ) || ! $oembed || ! isset( $oembed['html'] ) ) {
            wp_die();
        }

        echo json_encode( $oembed );

        wp_die();
    }
}
