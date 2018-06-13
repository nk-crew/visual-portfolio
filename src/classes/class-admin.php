<?php
/**
 * Admin
 *
 * @package @@plugin_name/admin
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

        // include gutenberg block.
        // work only if Gutenberg available.
        if ( function_exists( 'register_block_type' ) ) {
            add_action( 'enqueue_block_editor_assets', array( $this, 'enqueue_block_editor_assets' ) );
        }

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
                'singular' => _n( 'There is %d error which must be fixed before you can save.', 'There are %d errors which must be fixed before you can save.', 1, '@@text_domain' ),
                /* translators: %d: error count */
                'plural'   => _n( 'There is %d error which must be fixed before you can save.', 'There are %d errors which must be fixed before you can save.', 2, '@@text_domain' ), // @todo This is lacking, as some languages have a dedicated dual form. For proper handling of plurals in JS, see #20491.
            );
            $data_init['css_editor_error_checkbox'] = esc_html__( 'Update anyway, even though it might break your site?', '@@text_domain' );

            // disable autosave due to it is not working for the custom metaboxes.
            wp_dequeue_script( 'autosave' );

            wp_enqueue_media();

            wp_enqueue_script( 'iframe-resizer', visual_portfolio()->plugin_url . 'assets/vendor/iframe-resizer/iframeResizer.min.js', '', '3.6.1', true );

            wp_enqueue_style( 'wp-color-picker' );
            wp_enqueue_script( 'wp-color-picker-alpha', visual_portfolio()->plugin_url . 'assets/vendor/wp-color-picker-alpha/wp-color-picker-alpha.min.js', array( 'wp-color-picker' ), '2.1.3', true );

            wp_enqueue_script( 'image-picker', visual_portfolio()->plugin_url . 'assets/vendor/image-picker/image-picker.min.js', array( 'jquery' ), '0.3.0', true );
            wp_enqueue_style( 'image-picker', visual_portfolio()->plugin_url . 'assets/vendor/image-picker/image-picker.css', '', '0.3.0' );

            wp_enqueue_script( 'select2', visual_portfolio()->plugin_url . 'assets/vendor/select2/js/select2.min.js', array( 'jquery' ), '4.0.5', true );
            wp_enqueue_style( 'select2', visual_portfolio()->plugin_url . 'assets/vendor/select2/css/select2.css', '', '4.0.5' );

            wp_enqueue_script( 'sortablejs', visual_portfolio()->plugin_url . 'assets/vendor/sortable/Sortable.min.js', array( 'jquery' ), '1.6.0', true );
            wp_enqueue_script( 'sortablejs-jquery', visual_portfolio()->plugin_url . 'assets/vendor/sortable/jquery.binding.js', array( 'sortablejs' ), '1.6.0', true );

            wp_enqueue_script( 'conditionize', visual_portfolio()->plugin_url . 'assets/vendor/conditionize/conditionize.js', array( 'jquery' ), '', true );

            $codemirror_version = '5.38.0';
            wp_enqueue_script( 'codemirror', visual_portfolio()->plugin_url . 'assets/vendor/codemirror/codemirror.js', '', $codemirror_version, true );
            wp_enqueue_script( 'codemirror-mode-css', visual_portfolio()->plugin_url . 'assets/vendor/codemirror/mode/css/css.js', '', $codemirror_version, true );
            wp_enqueue_script( 'codemirror-emmet', visual_portfolio()->plugin_url . 'assets/vendor/codemirror/addon/emmet/emmet.js', '', $codemirror_version, true );
            wp_enqueue_script( 'codemirror-addon-closebrackets', visual_portfolio()->plugin_url . 'assets/vendor/codemirror/addon/edit/closebrackets.js', '', $codemirror_version, true );
            wp_enqueue_script( 'codemirror-addon-brace-fold', visual_portfolio()->plugin_url . 'assets/vendor/codemirror/addon/fold/brace-fold.js', '', $codemirror_version, true );
            wp_enqueue_script( 'codemirror-addon-comment-fold', visual_portfolio()->plugin_url . 'assets/vendor/codemirror/addon/fold/comment-fold.js', '', $codemirror_version, true );
            wp_enqueue_script( 'codemirror-addon-foldcode', visual_portfolio()->plugin_url . 'assets/vendor/codemirror/addon/fold/foldcode.js', '', $codemirror_version, true );
            wp_enqueue_script( 'codemirror-addon-foldgutter', visual_portfolio()->plugin_url . 'assets/vendor/codemirror/addon/fold/foldgutter.js', '', $codemirror_version, true );
            wp_enqueue_script( 'codemirror-addon-css-lint', visual_portfolio()->plugin_url . 'assets/vendor/codemirror/addon/lint/css-lint.js', '', $codemirror_version, true );
            wp_enqueue_script( 'codemirror-addon-csslint', visual_portfolio()->plugin_url . 'assets/vendor/codemirror/addon/lint/csslint.js', '', $codemirror_version, true );
            wp_enqueue_script( 'codemirror-addon-lint', visual_portfolio()->plugin_url . 'assets/vendor/codemirror/addon/lint/lint.js', '', $codemirror_version, true );
            wp_enqueue_script( 'codemirror-addon-show-hint', visual_portfolio()->plugin_url . 'assets/vendor/codemirror/addon/hint/show-hint.js', '', $codemirror_version, true );
            wp_enqueue_script( 'codemirror-addon-css-hint', visual_portfolio()->plugin_url . 'assets/vendor/codemirror/addon/hint/css-hint.js', '', $codemirror_version, true );
            wp_enqueue_script( 'codemirror-addon-simplescrollbars', visual_portfolio()->plugin_url . 'assets/vendor/codemirror/addon/scroll/simplescrollbars.js', '', $codemirror_version, true );
            wp_enqueue_script( 'codemirror-addon-annotatescrollbar', visual_portfolio()->plugin_url . 'assets/vendor/codemirror/addon/scroll/annotatescrollbar.js', '', $codemirror_version, true );
            wp_enqueue_script( 'codemirror-addon-dialog', visual_portfolio()->plugin_url . 'assets/vendor/codemirror/addon/dialog/dialog.js', '', $codemirror_version, true );
            wp_enqueue_script( 'codemirror-addon-search', visual_portfolio()->plugin_url . 'assets/vendor/codemirror/addon/search/search.js', '', $codemirror_version, true );
            wp_enqueue_script( 'codemirror-addon-searchcursor', visual_portfolio()->plugin_url . 'assets/vendor/codemirror/addon/search/searchcursor.js', '', $codemirror_version, true );
            wp_enqueue_script( 'codemirror-addon-matchesonscrollbar', visual_portfolio()->plugin_url . 'assets/vendor/codemirror/addon/search/matchesonscrollbar.js', '', $codemirror_version, true );
            wp_enqueue_script( 'codemirror-addon-jump-to-line', visual_portfolio()->plugin_url . 'assets/vendor/codemirror/addon/search/jump-to-line.js', '', $codemirror_version, true );
            wp_enqueue_script( 'codemirror-addon-comment', visual_portfolio()->plugin_url . 'assets/vendor/codemirror/addon/comment/comment.js', '', $codemirror_version, true );
            wp_enqueue_script( 'codemirror-addon-continuecomment', visual_portfolio()->plugin_url . 'assets/vendor/codemirror/addon/comment/continuecomment.js', '', $codemirror_version, true );
            wp_enqueue_style( 'codemirror', visual_portfolio()->plugin_url . 'assets/vendor/codemirror/codemirror.css', '', $codemirror_version );
            wp_enqueue_style( 'codemirror-addon-foldgutter', visual_portfolio()->plugin_url . 'assets/vendor/codemirror/addon/fold/foldgutter.css', '', $codemirror_version );
            wp_enqueue_style( 'codemirror-addon-lint', visual_portfolio()->plugin_url . 'assets/vendor/codemirror/addon/lint/lint.css', '', $codemirror_version );
            wp_enqueue_style( 'codemirror-addon-show-hint', visual_portfolio()->plugin_url . 'assets/vendor/codemirror/addon/hint/show-hint.css', '', $codemirror_version );
            wp_enqueue_style( 'codemirror-addon-simplescrollbars', visual_portfolio()->plugin_url . 'assets/vendor/codemirror/addon/scroll/simplescrollbars.css', '', $codemirror_version );
            wp_enqueue_style( 'codemirror-addon-dialog', visual_portfolio()->plugin_url . 'assets/vendor/codemirror/addon/dialog/dialog.css', '', $codemirror_version );
            wp_enqueue_style( 'codemirror-addon-matchesonscrollbar', visual_portfolio()->plugin_url . 'assets/vendor/codemirror/addon/search/matchesonscrollbar.css', '', $codemirror_version );
            wp_enqueue_style( 'codemirror-theme-eclipse', visual_portfolio()->plugin_url . 'assets/vendor/codemirror/theme/eclipse.css', '', $codemirror_version );
        }

        wp_enqueue_script( 'popper.js', visual_portfolio()->plugin_url . 'assets/vendor/popper.js/popper.min.js', '', '1.14.3', true );
        wp_enqueue_script( 'tooltip.js', visual_portfolio()->plugin_url . 'assets/vendor/popper.js/tooltip.min.js', array( 'popper.js' ), '1.14.3', true );
        wp_enqueue_style( 'popper.js', visual_portfolio()->plugin_url . 'assets/vendor/popper.js/popper.css', '', '1.14.3' );

        wp_enqueue_script( '@@plugin_name-admin', visual_portfolio()->plugin_url . 'assets/admin/js/script.min.js', array( 'jquery' ), '@@plugin_version', true );
        wp_enqueue_style( '@@plugin_name-admin', visual_portfolio()->plugin_url . 'assets/admin/css/style.min.css', '', '@@plugin_version' );
        wp_localize_script( '@@plugin_name-admin', 'VPAdminVariables', $data_init );
    }

    /**
     * Enqueue script for Gutenberg editor
     */
    public function enqueue_block_editor_assets() {
        wp_enqueue_script(
            'visual-portfolio-gutenberg',
            plugins_url( '../assets/admin/js/gutenberg-block.min.js', __FILE__ ),
            array( 'wp-editor', 'wp-i18n', 'wp-element', 'wp-components' ),
            filemtime( plugin_dir_path( __FILE__ ) . '../assets/admin/js/gutenberg-block.min.js' )
        );
        wp_enqueue_style(
            'visual-portfolio-gutenberg',
            plugins_url( '../assets/admin/css/gutenberg-block.min.css', __FILE__ ),
            array(),
            filemtime( plugin_dir_path( __FILE__ ) . '../assets/admin/css/gutenberg-block.min.css' )
        );
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
                    'name'                => _x( 'Portfolio Items', 'Post Type General Name', '@@text_domain' ),
                    'singular_name'       => _x( 'Portfolio Item', 'Post Type Singular Name', '@@text_domain' ),
                    'menu_name'           => __( 'Visual Portfolio', '@@text_domain' ),
                    'parent_item_colon'   => __( 'Parent Portfolio Item', '@@text_domain' ),
                    'all_items'           => __( 'Portfolio Items', '@@text_domain' ),
                    'view_item'           => __( 'View Portfolio Item', '@@text_domain' ),
                    'add_new_item'        => __( 'Add New Portfolio Item', '@@text_domain' ),
                    'add_new'             => __( 'Add New', '@@text_domain' ),
                    'edit_item'           => __( 'Edit Portfolio Item', '@@text_domain' ),
                    'update_item'         => __( 'Update Portfolio Item', '@@text_domain' ),
                    'search_items'        => __( 'Search Portfolio Item', '@@text_domain' ),
                    'not_found'           => __( 'Not Found', '@@text_domain' ),
                    'not_found_in_trash'  => __( 'Not found in Trash', '@@text_domain' ),
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
                'rewrite' => array(
                    'slug' => Visual_Portfolio_Settings::get_option( 'portfolio_slug', 'vp_general', 'portfolio' ),
                ),
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
                'label'         => esc_html__( 'Portfolio Categories', '@@text_domain' ),
                'labels'        => array(
                    'menu_name' => esc_html__( 'Categories', '@@text_domain' ),
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
                'label'         => esc_html__( 'Portfolio Tags', '@@text_domain' ),
                'labels'        => array(
                    'menu_name' => esc_html__( 'Tags', '@@text_domain' ),
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
                    'name'                => _x( 'Portfolio Layouts', 'Post Type General Name', '@@text_domain' ),
                    'singular_name'       => _x( 'Portfolio Layout', 'Post Type Singular Name', '@@text_domain' ),
                    'menu_name'           => __( 'Visual Portfolio', '@@text_domain' ),
                    'parent_item_colon'   => __( 'Parent Portfolio Item', '@@text_domain' ),
                    'all_items'           => __( 'Portfolio Layouts', '@@text_domain' ),
                    'view_item'           => __( 'View Portfolio Layout', '@@text_domain' ),
                    'add_new_item'        => __( 'Add New Portfolio Layout', '@@text_domain' ),
                    'add_new'             => __( 'Add New', '@@text_domain' ),
                    'edit_item'           => __( 'Edit Portfolio Layout', '@@text_domain' ),
                    'update_item'         => __( 'Update Portfolio Layout', '@@text_domain' ),
                    'search_items'        => __( 'Search Portfolio Layout', '@@text_domain' ),
                    'not_found'           => __( 'Not Found', '@@text_domain' ),
                    'not_found_in_trash'  => __( 'Not found in Trash', '@@text_domain' ),
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
                esc_html__( 'Video', '@@text_domain' ),
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
        <input class="vp-input" name="video_url" type="url" id="video_url" value="<?php echo esc_attr( $video_url ); ?>" placeholder="<?php echo esc_attr__( 'https://', '@@text_domain' ); ?>">
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
                    <p><?php echo esc_html__( 'Ready to add your awesome portfolio?', '@@text_domain' ); ?></p>
                    <a class="button button-primary button-hero" href="<?php echo esc_url( admin_url( 'post-new.php?post_type=vp_lists' ) ); ?>"><?php echo esc_html__( 'Create your first portfolio list!', '@@text_domain' ); ?></a>
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
            'vp_lists_post_shortcode' => esc_html__( 'Shortcode', '@@text_domain' ),
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
	                    // phpcs:ignore
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
            esc_html__( 'Name & Shortcode', '@@text_domain' ),
            array( $this, 'add_name_metabox' ),
            'vp_lists',
            'side',
            'high'
        );
        add_meta_box(
            'vp_layout',
            esc_html__( 'Layout', '@@text_domain' ),
            array( $this, 'add_layout_metabox' ),
            'vp_lists',
            'side',
            'default'
        );
        add_meta_box(
            'vp_items_style',
            esc_html__( 'Items Style', '@@text_domain' ),
            array( $this, 'add_items_style_metabox' ),
            'vp_lists',
            'side',
            'default'
        );
        add_meta_box(
            'vp_items_click_action',
            esc_html__( 'Items Click Action', '@@text_domain' ),
            array( $this, 'add_items_click_action_metabox' ),
            'vp_lists',
            'side',
            'default'
        );
        add_meta_box(
            'vp_filter',
            esc_html__( 'Filter', '@@text_domain' ),
            array( $this, 'add_filter_metabox' ),
            'vp_lists',
            'side',
            'default'
        );
        add_meta_box(
            'vp_pagination',
            esc_html__( 'Pagination', '@@text_domain' ),
            array( $this, 'add_pagination_metabox' ),
            'vp_lists',
            'side',
            'default'
        );

        add_meta_box(
            'vp_preview',
            esc_html__( 'Preview', '@@text_domain' ),
            array( $this, 'add_preview_metabox' ),
            'vp_lists',
            'normal',
            'high'
        );
        add_meta_box(
            'vp_content_source',
            esc_html__( 'Content Source', '@@text_domain' ),
            array( $this, 'add_content_source_metabox' ),
            'vp_lists',
            'normal',
            'high'
        );
        add_meta_box(
            'vp_custom_css',
            esc_html__( 'Custom CSS', '@@text_domain' ),
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
                'label' => esc_html__( 'Name', '@@text_domain' ),
                'name'  => 'vp_list_name',
                'value' => $post->post_title,
            )
        );

        Visual_Portfolio_Controls::get(
            array(
                'type'  => 'text',
                'label' => esc_html__( 'Shortcode', '@@text_domain' ),
                'description' => esc_html__( 'Place the shortcode where you want to show the portfolio list.', '@@text_domain' ),
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

        $layouts = array_merge( array(
            // Tiles.
            'tiles' => array(
                'title' => esc_html__( 'Tiles', '@@text_domain' ),
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
                        'type'  => 'images_dropdown',
                        'label' => esc_html__( 'Type', '@@text_domain' ),
                        'placeholder' => esc_html__( 'Select tiles type', '@@text_domain' ),
                        'name'  => 'type',
                        'default' => '3|1,1|',
                        'options' => array(
                            array(
                                'url' => visual_portfolio()->plugin_url . 'assets/admin/images/layouts/tiles-1-1.svg',
                                'value' => '1|1,0.5|',
                            ),
                            array(
                                'url' => visual_portfolio()->plugin_url . 'assets/admin/images/layouts/tiles-2-1.svg',
                                'value' => '2|1,1|',
                            ),
                            array(
                                'url' => visual_portfolio()->plugin_url . 'assets/admin/images/layouts/tiles-2-2.svg',
                                'value' => '2|1,0.8|',
                            ),
                            array(
                                'url' => visual_portfolio()->plugin_url . 'assets/admin/images/layouts/tiles-2-3.svg',
                                'value' => '2|1,1.2|1,1.2|1,0.67|1,0.67|',
                            ),
                            array(
                                'url' => visual_portfolio()->plugin_url . 'assets/admin/images/layouts/tiles-2-4.svg',
                                'value' => '2|1,1.2|1,0.67|1,1.2|1,0.67|',
                            ),
                            array(
                                'url' => visual_portfolio()->plugin_url . 'assets/admin/images/layouts/tiles-2-5.svg',
                                'value' => '2|1,0.67|1,1|1,1|1,1|1,1|1,0.67|',
                            ),
                            array(
                                'url' => visual_portfolio()->plugin_url . 'assets/admin/images/layouts/tiles-3-1.svg',
                                'value' => '3|1,1|',
                            ),
                            array(
                                'url' => visual_portfolio()->plugin_url . 'assets/admin/images/layouts/tiles-3-2.svg',
                                'value' => '3|1,0.8|',
                            ),
                            array(
                                'url' => visual_portfolio()->plugin_url . 'assets/admin/images/layouts/tiles-3-3.svg',
                                'value' => '3|1,1|1,1|1,1|1,1.3|1,1.3|1,1.3|',
                            ),
                            array(
                                'url' => visual_portfolio()->plugin_url . 'assets/admin/images/layouts/tiles-3-4.svg',
                                'value' => '3|1,1|1,1|1,2|1,1|1,1|1,1|1,1|1,1|',
                            ),
                            array(
                                'url' => visual_portfolio()->plugin_url . 'assets/admin/images/layouts/tiles-3-5.svg',
                                'value' => '3|1,2|1,1|1,1|1,1|1,1|1,1|1,1|1,1|',
                            ),
                            array(
                                'url' => visual_portfolio()->plugin_url . 'assets/admin/images/layouts/tiles-3-6.svg',
                                'value' => '3|1,1|1,2|1,1|1,1|1,1|1,1|1,1|1,1|',
                            ),
                            array(
                                'url' => visual_portfolio()->plugin_url . 'assets/admin/images/layouts/tiles-3-7.svg',
                                'value' => '3|1,1|1,2|1,1|1,1|1,1|1,1|2,0.5|',
                            ),
                            array(
                                'url' => visual_portfolio()->plugin_url . 'assets/admin/images/layouts/tiles-3-8.svg',
                                'value' => '3|1,0.8|1,1.6|1,0.8|1,0.8|1,1.6|1,1.6|1,0.8|1,0.8|1,0.8|',
                            ),
                            array(
                                'url' => visual_portfolio()->plugin_url . 'assets/admin/images/layouts/tiles-3-9.svg',
                                'value' => '3|1,0.8|1,0.8|1,1.6|1,0.8|1,0.8|1,0.8|1,1.6|1,1.6|1,0.8|',
                            ),
                            array(
                                'url' => visual_portfolio()->plugin_url . 'assets/admin/images/layouts/tiles-3-10.svg',
                                'value' => '3|1,1|2,1|1,1|2,0.5|1,1|',
                            ),
                            array(
                                'url' => visual_portfolio()->plugin_url . 'assets/admin/images/layouts/tiles-3-11.svg',
                                'value' => '3|1,2|2,0.5|1,1|1,2|2,0.5|',
                            ),
                            array(
                                'url' => visual_portfolio()->plugin_url . 'assets/admin/images/layouts/tiles-4-1.svg',
                                'value' => '4|1,1|',
                            ),
                            array(
                                'url' => visual_portfolio()->plugin_url . 'assets/admin/images/layouts/tiles-4-2.svg',
                                'value' => '4|1,1|1,1.34|1,1|1,1.34|1,1.34|1,1.34|1,1|1,1|',
                            ),
                            array(
                                'url' => visual_portfolio()->plugin_url . 'assets/admin/images/layouts/tiles-4-3.svg',
                                'value' => '4|1,1|1,1|2,1|1,1|1,1|2,1|1,1|1,1|1,1|1,1|',
                            ),
                            array(
                                'url' => visual_portfolio()->plugin_url . 'assets/admin/images/layouts/tiles-4-4.svg',
                                'value' => '4|2,1|2,0.5|2,0.5|2,0.5|2,1|2,0.5|',
                            ),
                        ),
                    ),
                ),
            ),

            // Masonry.
            'masonry' => array(
                'title' => esc_html__( 'Masonry', '@@text_domain' ),
                'controls' => array(
                    array(
                        'type'  => 'range',
                        'label' => esc_html__( 'Columns', '@@text_domain' ),
                        'name'  => 'columns',
                        'min'   => 1,
                        'max'   => 5,
                        'default' => 3,
                    ),
                ),
            ),

            // Justified.
            'justified' => array(
                'title' => esc_html__( 'Justified', '@@text_domain' ),
                'controls' => array(
                    array(
                        'type'  => 'range',
                        'label' => esc_html__( 'Row height', '@@text_domain' ),
                        'name'  => 'row_height',
                        'min'   => 100,
                        'max'   => 1000,
                        'default' => 200,
                    ),
                    array(
                        'type'  => 'range',
                        'label' => esc_html__( 'Row height tolerance', '@@text_domain' ),
                        'name'  => 'row_height_tolerance',
                        'min'   => 0,
                        'max'   => 1,
                        'step'  => 0.05,
                        'default' => 0.25,
                    ),
                ),
            ),
        ), Visual_Portfolio_Extend::layouts() );

        // Layouts selector.
        $layouts_selector = array();
        foreach ( $layouts as $name => $layout ) {
            $layouts_selector[ $name ] = $layout['title'];
        }
        Visual_Portfolio_Controls::get(
            array(
                'type'  => 'select2',
                'name'  => 'vp_layout',
                'value' => $meta['vp_layout'],
                'options' => $layouts_selector,
            )
        );

        // layouts options.
        foreach ( $layouts as $name => $layout ) {
            foreach ( $layout['controls'] as $field ) {
                $field['name'] = 'vp_' . $name . '_' . $field['name'];
                $field['value'] = $meta[ $field['name'] ];
                $field['condition'] = array_merge(
                    isset( $field['condition'] ) ? $field['condition'] : array(),
                    array(
                        array(
                            'control' => 'vp_layout',
                            'value' => $name,
                        ),
                    )
                );
                Visual_Portfolio_Controls::get( $field );
            }
        }

        Visual_Portfolio_Controls::get(
            array(
                'type'  => 'range',
                'label' => esc_html__( 'Gap', '@@text_domain' ),
                'name'  => 'vp_items_gap',
                'value' => $meta['vp_items_gap'],
                'min'   => 0,
                'max'   => 150,
            )
        );

        Visual_Portfolio_Controls::get(
            array(
                'type'  => 'range',
                'label' => esc_html__( 'Items per page', '@@text_domain' ),
                'name'  => 'vp_items_count',
                'value' => $meta['vp_items_count'],
                'min'   => 1,
                'max'   => 50,
            )
        );

        Visual_Portfolio_Controls::get(
            array(
                'type'  => 'toggle',
                'label' => esc_html__( 'Stretch', '@@text_domain' ),
                'name'  => 'vp_stretch',
                'value' => $meta['vp_stretch'],
                'hint'  => esc_attr__( 'Break container and display it wide', '@@text_domain' ),
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
            'default'  => __( 'Default', '@@text_domain' ),
            'fly'      => __( 'Fly', '@@text_domain' ),
            'emerge'   => __( 'Emerge', '@@text_domain' ),
            'fade'     => __( 'Fade', '@@text_domain' ),
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
                        'label'  => esc_html__( 'Show title', '@@text_domain' ),
                        'name'  => $opt . 'show_title',
                        'value' => $meta[ $opt . 'show_title' ],
                    )
                );

                Visual_Portfolio_Controls::get(
                    array(
                        'type'  => 'toggle',
                        'label'  => esc_html__( 'Show categories', '@@text_domain' ),
                        'name'  => $opt . 'show_categories',
                        'value' => $meta[ $opt . 'show_categories' ],
                    )
                );

                Visual_Portfolio_Controls::get(
                    array(
                        'type'  => 'range',
                        'label' => esc_html__( 'Categories count', '@@text_domain' ),
                        'name'  => $opt . 'categories_count',
                        'value' => $meta[ $opt . 'categories_count' ],
                        'min'   => 1,
                        'max'   => 10,
                        'condition' => array(
                            array(
                                'control' => $opt . 'show_categories',
                            ),
                        ),
                    )
                );

                Visual_Portfolio_Controls::get(
                    array(
                        'type'  => 'select2',
                        'label' => esc_html__( 'Show date', '@@text_domain' ),
                        'name'  => $opt . 'show_date',
                        'value' => $meta[ $opt . 'show_date' ],
                        'options' => array(
                            'false' => esc_html__( 'False', '@@text_domain' ),
                            'true'  => esc_html__( 'Show', '@@text_domain' ),
                            'human' => esc_html__( 'Human Format', '@@text_domain' ),
                        ),
                    )
                );

                Visual_Portfolio_Controls::get(
                    array(
                        'type'  => 'text',
                        'name'  => $opt . 'date_format',
                        'value' => $meta[ $opt . 'date_format' ],
                        'placeholder' => 'F j, Y',
                        'hint' => esc_attr__( "Date format \r\n Example: F j, Y", '@@text_domain' ),
                        'hint_place' => 'left',
                        'condition' => array(
                            array(
                                'control' => $opt . 'show_date',
                            ),
                        ),
                    )
                );

                Visual_Portfolio_Controls::get(
                    array(
                        'type'  => 'toggle',
                        'label'  => esc_html__( 'Show excerpt', '@@text_domain' ),
                        'name'  => $opt . 'show_excerpt',
                        'value' => $meta[ $opt . 'show_excerpt' ],
                    )
                );

                Visual_Portfolio_Controls::get(
                    array(
                        'type'  => 'range',
                        'label' => esc_html__( 'Excerpt words count', '@@text_domain' ),
                        'name'  => $opt . 'excerpt_words_count',
                        'value' => $meta[ $opt . 'excerpt_words_count' ],
                        'min'   => 1,
                        'max'   => 200,
                        'condition' => array(
                            array(
                                'control' => $opt . 'show_excerpt',
                            ),
                        ),
                    )
                );

                if ( 'fly' === $style || 'fade' === $style ) {
                    Visual_Portfolio_Controls::get(
                        array(
                            'type'  => 'toggle',
                            'label' => esc_html__( 'Show icon', '@@text_domain' ),
                            'name'  => $opt . 'show_icon',
                            'value' => $meta[ $opt . 'show_icon' ],
                        )
                    );

                    Visual_Portfolio_Controls::get(
                        array(
                            'type'        => 'text',
                            'name'        => $opt . 'icon',
                            'value'       => $meta[ $opt . 'icon' ],
                            'placeholder' => esc_attr__( 'Standard icon', '@@text_domain' ),
                            'hint'        => esc_attr__( 'Standard icon', '@@text_domain' ),
                            'hint_place'  => 'left',
                            'condition'   => array(
                                array(
                                    'control' => $opt . 'show_icon',
                                ),
                            ),
                        )
                    );

                    Visual_Portfolio_Controls::get(
                        array(
                            'type'        => 'text',
                            'name'        => $opt . 'icon_video',
                            'value'       => $meta[ $opt . 'icon_video' ],
                            'placeholder' => esc_attr__( 'Video icon', '@@text_domain' ),
                            'hint'        => esc_attr__( 'Video icon', '@@text_domain' ),
                            'hint_place'  => 'left',
                            'condition'   => array(
                                array(
                                    'control' => $opt . 'show_icon',
                                ),
                            ),
                        )
                    );
                }
                ?>

                <?php
                $caption_align_opt = $opt . 'align';
                ?>
                <div data-cond="[name=<?php echo esc_attr( $opt . 'show_title' ); ?>] == true || [name=<?php echo esc_attr( $opt . 'show_categories' ); ?>] == true || [name=<?php echo esc_attr( $opt . 'show_date' ); ?>] == true || [name=<?php echo esc_attr( $opt . 'show_excerpt' ); ?>] == true || [name=<?php echo esc_attr( $opt . 'show_icon' ); ?>] == true">

                    <div class="vp-control">
                        <label for="<?php echo esc_attr( $caption_align_opt ); ?>">
                            <?php echo esc_html__( 'Caption align', '@@text_domain' ); ?>
                        </label>
                        <select class="vp-select2 vp-select2-nosearch" name="<?php echo esc_attr( $caption_align_opt ); ?>" id="<?php echo esc_attr( $caption_align_opt ); ?>">

                            <?php if ( 'fly' === $style || 'fade' === $style ) : ?>
                            <optgroup label="<?php echo esc_attr__( 'Top', '@@text_domain' ); ?>">
                                <option value="top-center" <?php selected( $meta[ $caption_align_opt ], 'top-center' ); ?>>
                                    <?php echo esc_html__( 'Center', '@@text_domain' ); ?>
                                </option>
                                <option value="top-left" <?php selected( $meta[ $caption_align_opt ], 'top-left' ); ?>>
                                    <?php echo esc_html__( 'Left', '@@text_domain' ); ?>
                                </option>
                                <option value="top-right" <?php selected( $meta[ $caption_align_opt ], 'top-right' ); ?>>
                                    <?php echo esc_html__( 'Right', '@@text_domain' ); ?>
                                </option>
                            </optgroup>
                            <optgroup label="<?php echo esc_attr__( 'Center', '@@text_domain' ); ?>">
                                <?php endif; ?>

                                <option value="center" <?php selected( $meta[ $caption_align_opt ], 'center' ); ?>>
                                    <?php echo esc_html__( 'Center', '@@text_domain' ); ?>
                                </option>
                                <option value="left" <?php selected( $meta[ $caption_align_opt ], 'left' ); ?>>
                                    <?php echo esc_html__( 'Left', '@@text_domain' ); ?>
                                </option>
                                <option value="right" <?php selected( $meta[ $caption_align_opt ], 'right' ); ?>>
                                    <?php echo esc_html__( 'Right', '@@text_domain' ); ?>
                                </option>

                                <?php if ( 'fly' === $style || 'fade' === $style ) : ?>
                            </optgroup>
                            <optgroup label="<?php echo esc_attr__( 'Bottom', '@@text_domain' ); ?>">
                                <option value="bottom-center" <?php selected( $meta[ $caption_align_opt ], 'bottom-center' ); ?>>
                                    <?php echo esc_html__( 'Center', '@@text_domain' ); ?>
                                </option>
                                <option value="bottom-left" <?php selected( $meta[ $caption_align_opt ], 'bottom-left' ); ?>>
                                    <?php echo esc_html__( 'Left', '@@text_domain' ); ?>
                                </option>
                                <option value="bottom-right" <?php selected( $meta[ $caption_align_opt ], 'bottom-right' ); ?>>
                                    <?php echo esc_html__( 'Right', '@@text_domain' ); ?>
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
                            'label'  => esc_html__( 'Overlay background color', '@@text_domain' ),
                            'name'  => $opt . 'bg_color',
                            'value' => $meta[ $opt . 'bg_color' ],
                            'alpha' => true,
                        )
                    );

                    Visual_Portfolio_Controls::get(
                        array(
                            'type'  => 'color',
                            'label'  => esc_html__( 'Overlay text color', '@@text_domain' ),
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
                    'false' => esc_html__( 'Disabled', '@@text_domain' ),
                    'url' => esc_html__( 'URL', '@@text_domain' ),
                    'popup_gallery' => esc_html__( 'Popup Gallery', '@@text_domain' ),
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
                    'false' => esc_html__( 'Disabled', '@@text_domain' ),
                    'default' => esc_html__( 'Enabled', '@@text_domain' ),
                ),
            )
        );

        Visual_Portfolio_Controls::get(
            array(
                'type'  => 'select2',
                'label' => esc_html__( 'Align', '@@text_domain' ),
                'name'  => 'vp_filter_align',
                'value' => $meta['vp_filter_align'],
                'options' => array(
                    'center' => esc_html__( 'Center', '@@text_domain' ),
                    'left' => esc_html__( 'Left', '@@text_domain' ),
                    'right' => esc_html__( 'Right', '@@text_domain' ),
                ),
                'condition'   => array(
                    array(
                        'control' => 'vp_filter',
                        'operator' => '!=',
                        'value' => 'false',
                    ),
                ),
            )
        );

        Visual_Portfolio_Controls::get(
            array(
                'type'  => 'toggle',
                'label' => esc_html__( 'Show count', '@@text_domain' ),
                'name'  => 'vp_filter_show_count',
                'value' => $meta['vp_filter_show_count'],
                'condition'   => array(
                    array(
                        'control' => 'vp_filter',
                        'operator' => '!=',
                        'value' => 'false',
                    ),
                ),
            )
        );

        Visual_Portfolio_Controls::get(
            array(
                'type'  => 'text',
                'label' => esc_html__( 'Filter Shortcode', '@@text_domain' ),
                'description' => esc_html__( 'Place the shortcode where you want to show the filter.', '@@text_domain' ),
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
                    'false' => esc_html__( 'Disabled', '@@text_domain' ),
                    'paged' => esc_html__( 'Paged', '@@text_domain' ),
                    'load-more' => esc_html__( 'Load More', '@@text_domain' ),
                    'infinite' => esc_html__( 'Infinite', '@@text_domain' ),
                ),
            )
        );

        Visual_Portfolio_Controls::get(
            array(
                'type'  => 'select2',
                'label'  => esc_html__( 'Align', '@@text_domain' ),
                'name'  => 'vp_pagination_align',
                'value' => $meta['vp_pagination_align'],
                'options' => array(
                    'center' => esc_html__( 'Center', '@@text_domain' ),
                    'left' => esc_html__( 'Left', '@@text_domain' ),
                    'right' => esc_html__( 'Right', '@@text_domain' ),
                ),
                'condition'   => array(
                    array(
                        'control' => 'vp_pagination',
                        'operator' => '!=',
                        'value' => 'false',
                    ),
                ),
            )
        );

        Visual_Portfolio_Controls::get(
            array(
                'type'  => 'toggle',
                'label'  => esc_html__( 'Show arrows', '@@text_domain' ),
                'name'  => 'vp_pagination_paged__show_arrows',
                'value' => $meta['vp_pagination_paged__show_arrows'],
                'condition'   => array(
                    array(
                        'control' => 'vp_pagination',
                        'value' => 'paged',
                    ),
                ),
            )
        );

        Visual_Portfolio_Controls::get(
            array(
                'type'  => 'toggle',
                'label'  => esc_html__( 'Show numbers', '@@text_domain' ),
                'name'  => 'vp_pagination_paged__show_numbers',
                'value' => $meta['vp_pagination_paged__show_numbers'],
                'condition'   => array(
                    array(
                        'control' => 'vp_pagination',
                        'value' => 'paged',
                    ),
                ),
            )
        );
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
        $post_types_list['ids'] = esc_html__( 'Specific Posts', '@@text_domain' );
        $post_types_list['custom_query'] = esc_html__( 'Custom Query', '@@text_domain' );
        ?>
        <div class="vp-content-source">
            <input type="hidden" name="vp_content_source" value="<?php echo esc_attr( $meta['vp_content_source'] ); ?>">

            <div class="vp-content-source__item" data-content="portfolio">
                <div class="vp-content-source__item-icon">
                    <span class="dashicons dashicons-portfolio"></span>
                </div>
                <div class="vp-content-source__item-title"><?php echo esc_html__( 'Portfolio', '@@text_domain' ); ?></div>
            </div>
            <div class="vp-content-source__item" data-content="post-based">
                <div class="vp-content-source__item-icon">
                    <span class="dashicons dashicons-media-text"></span>
                </div>
                <div class="vp-content-source__item-title"><?php echo esc_html__( 'Post-Based', '@@text_domain' ); ?></div>
            </div>
            <div class="vp-content-source__item" data-content="images">
                <div class="vp-content-source__item-icon">
                    <span class="dashicons dashicons-images-alt2"></span>
                </div>
                <div class="vp-content-source__item-title"><?php echo esc_html__( 'Images', '@@text_domain' ); ?></div>
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
                        printf( wp_kses( __( 'Portfolio items list from <a href="%1$s" target="_blank">%2$s</a>', '@@text_domain' ), $allowed_protocols ), esc_url( $url ), esc_html( $url ) );
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
                                    'label'  => esc_html__( 'Data source', '@@text_domain' ),
                                    'name'  => 'vp_posts_source',
                                    'value' => $meta['vp_posts_source'],
                                    'searchable' => true,
                                    'options' => $post_types_list,
                                )
                            );
                            ?>
                        </div>

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
                                'label'  => esc_html__( 'Specific posts', '@@text_domain' ),
                                'name'  => 'vp_posts_ids',
                                'value' => $selected_ids,
                                'searchable' => true,
                                'multiple' => true,
                                'post_type' => '[name=vp_posts_source]',
                                'options' => $selected_array,
                                'class' => 'vp-select2-posts-ajax',
                                'wrapper_class' => 'vp-col-6',
                                'condition' => array(
                                    array(
                                        'control' => 'vp_posts_source',
                                        'value' => 'ids',
                                    ),
                                ),
                            )
                        );

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
                                'label'  => esc_html__( 'Excluded posts', '@@text_domain' ),
                                'name'  => 'vp_posts_excluded_ids',
                                'value' => (array) $excluded_ids,
                                'searchable' => true,
                                'multiple' => true,
                                'post_type' => '[name=vp_posts_source]',
                                'options' => $excluded_array,
                                'class' => 'vp-select2-posts-ajax',
                                'wrapper_class' => 'vp-col-6',
                                'condition' => array(
                                    array(
                                        'control' => 'vp_posts_source',
                                        'operator' => '!=',
                                        'value' => 'ids',
                                    ),
                                ),
                            )
                        );

                        Visual_Portfolio_Controls::get(
                            array(
                                'type'  => 'textarea',
                                'label'  => esc_html__( 'Custom query', '@@text_domain' ),
                                // translators: %1$s - escaped url.
                                'description'  => sprintf( wp_kses( __( 'Build custom query according to <a href="%1$s">WordPress Codex</a>.', '@@text_domain' ), $allowed_protocols ), esc_url( 'http://codex.wordpress.org/Function_Reference/query_posts' ) ),
                                'name'  => 'vp_posts_custom_query',
                                'value' => $meta['vp_posts_custom_query'],
                                'cols' => 30,
                                'rows' => 3,
                                'wrapper_class' => 'vp-col-12',
                                'condition' => array(
                                    array(
                                        'control' => 'vp_posts_source',
                                        'value' => 'custom_query',
                                    ),
                                ),
                            )
                        );
                        ?>

                        <div class="vp-col-clearfix"></div>
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
                                'label'  => esc_html__( 'Taxonomies', '@@text_domain' ),
                                'name'  => 'vp_posts_taxonomies',
                                'value' => (array) $selected_tax,
                                'searchable' => true,
                                'multiple' => true,
                                'post_type' => '[name=vp_posts_source]',
                                'options' => $selected_tax_arr,
                                'class' => 'vp-select2-taxonomies-ajax',
                                'wrapper_class' => 'vp-col-6',
                                'condition' => array(
                                    array(
                                        'control' => 'vp_posts_source',
                                        'operator' => '!=',
                                        'value' => 'ids',
                                    ),
                                    array(
                                        'control' => 'vp_posts_source',
                                        'operator' => '!=',
                                        'value' => 'custom_query',
                                    ),
                                ),
                            )
                        );

                        Visual_Portfolio_Controls::get(
                            array(
                                'type'  => 'select2',
                                'label'  => esc_html__( 'Taxonomies relation', '@@text_domain' ),
                                'name'  => 'vp_posts_taxonomies_relation',
                                'value'  => $meta['vp_posts_taxonomies_relation'],
                                'options' => array(
                                    'or' => esc_html__( 'OR', '@@text_domain' ),
                                    'and' => esc_html__( 'AND', '@@text_domain' ),
                                ),
                                'wrapper_class' => 'vp-col-6',
                                'condition' => array(
                                    array(
                                        'control' => 'vp_posts_source',
                                        'operator' => '!=',
                                        'value' => 'ids',
                                    ),
                                    array(
                                        'control' => 'vp_posts_source',
                                        'operator' => '!=',
                                        'value' => 'custom_query',
                                    ),
                                ),
                            )
                        );

                        Visual_Portfolio_Controls::get(
                            array(
                                'type'  => 'select2',
                                'label'  => esc_html__( 'Order by', '@@text_domain' ),
                                'name'  => 'vp_posts_order_by',
                                'value'  => $meta['vp_posts_order_by'],
                                'options' => array(
                                    'post_date' => esc_html__( 'Date', '@@text_domain' ),
                                    'title' => esc_html__( 'Title', '@@text_domain' ),
                                    'id' => esc_html__( 'ID', '@@text_domain' ),
                                    'rand' => esc_html__( 'Random', '@@text_domain' ),
                                ),
                                'wrapper_class' => 'vp-col-6',
                            )
                        );

                        Visual_Portfolio_Controls::get(
                            array(
                                'type'  => 'select2',
                                'label'  => esc_html__( 'Order direction', '@@text_domain' ),
                                'name'  => 'vp_posts_order_direction',
                                'value'  => $meta['vp_posts_order_direction'],
                                'options' => array(
                                    'desc' => esc_html__( 'DESC', '@@text_domain' ),
                                    'asc' => esc_html__( 'ASC', '@@text_domain' ),
                                ),
                                'wrapper_class' => 'vp-col-6',
                            )
                        );
                        ?>
                    </div>
                </div>
                <div data-content="images">
                    <!-- Images -->

                    <p></p>
                    <?php
                    Visual_Portfolio_Controls::get(
                        array(
                            'type'  => 'gallery',
                            'name'  => 'vp_images',
                            'value' => $meta['vp_images'],
                        )
                    );
                    ?>
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
            <?php echo esc_html__( 'Available classes:', '@@text_domain' ); ?>
        </p>
        <ul>
            <li><code class="vp-onclick-selection">.vp-id-<?php echo esc_html( $post->ID ); ?></code><?php echo esc_html__( ' - use this classname for each styles you added. It is the main Visual Portfolio wrapper.', '@@text_domain' ); ?></li>
            <li><code class="vp-onclick-selection">.vp-id-<?php echo esc_html( $post->ID ); ?> .vp-portfolio__items</code><?php echo esc_html__( ' - items wrapper.', '@@text_domain' ); ?></li>
            <li><code class="vp-onclick-selection">.vp-id-<?php echo esc_html( $post->ID ); ?> .vp-portfolio__item</code><?php echo esc_html__( ' - single item wrapper.', '@@text_domain' ); ?></li>
            <li><code class="vp-onclick-selection">.vp-id-<?php echo esc_html( $post->ID ); ?> .vp-filter</code><?php echo esc_html__( ' - filter wrapper.', '@@text_domain' ); ?></li>
            <li><code class="vp-onclick-selection">.vp-id-<?php echo esc_html( $post->ID ); ?> .vp-pagination</code><?php echo esc_html__( ' - pagination wrapper.', '@@text_domain' ); ?></li>
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
        if ( ! $post_type || 'custom_query' === $post_type || 'ids' === $post_type ) {
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
