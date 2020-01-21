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
        add_action( 'enqueue_block_editor_assets', array( $this, 'enqueue_block_editor_assets' ) );

        // custom post types.
        add_action( 'init', array( $this, 'add_custom_post_type' ) );
        add_action( 'restrict_manage_posts', array( $this, 'filter_custom_post_by_taxonomies' ), 10 );

        // add post formats.
        add_action( 'after_setup_theme', array( $this, 'add_video_post_format' ), 99 );
        add_action( 'add_meta_boxes', array( $this, 'add_post_format_metaboxes' ), 1 );
        add_action( 'save_post', array( $this, 'save_post_format_metaboxes' ) );

        // custom post roles.
        add_action( 'init', array( $this, 'add_role_caps' ) );

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
        add_action( 'admin_menu', array( $this, 'admin_menu' ), 12 );

        // show admin menu dropdown with available portfolios on the current page.
        add_action( 'wp_before_admin_bar_render', array( $this, 'wp_before_admin_bar_render' ) );

        // register controls.
        add_action( 'init', array( $this, 'register_controls' ) );

        // metaboxes.
        add_action( 'add_meta_boxes', array( $this, 'add_meta_boxes' ) );
        add_action( 'save_post_vp_lists', array( $this, 'save_visual_portfolio_metaboxes' ) );

        // ajax actions.
        add_action( 'wp_ajax_vp_find_posts', array( $this, 'ajax_find_posts' ) );
        add_action( 'wp_ajax_vp_find_taxonomies', array( $this, 'ajax_find_taxonomies' ) );
        add_action( 'wp_ajax_vp_find_oembed', array( $this, 'ajax_find_oembed' ) );

        add_action( 'vpf_get_source_social_stream_registered_controls', array( __class__, 'social_stream_information' ) );
    }

    /**
     * Enqueue styles and scripts
     */
    public function admin_enqueue_scripts() {
        $data_init = array(
            'nonce' => wp_create_nonce( 'vp-ajax-nonce' ),
        );

        if ( 'vp_lists' === get_post_type() ) {
            $main_classname          = '.vp-id-' . get_the_ID();
            $data_init['classnames'] = array(
                $main_classname,
                $main_classname . ' .vp-portfolio__items',
                $main_classname . ' .vp-portfolio__item',
                $main_classname . ' .vp-filter',
                $main_classname . ' .vp-pagination',
            );

            $data_init['css_editor_error_notice']   = array(
                /* translators: %d: error count */
                'singular' => _n( 'There is %d error which must be fixed before you can save.', 'There are %d errors which must be fixed before you can save.', 1, '@@text_domain' ),
                /* translators: %d: error count */
                'plural'   => _n( 'There is %d error which must be fixed before you can save.', 'There are %d errors which must be fixed before you can save.', 2, '@@text_domain' ), // @todo This is lacking, as some languages have a dedicated dual form. For proper handling of plurals in JS, see #20491.
            );
            $data_init['css_editor_error_checkbox'] = esc_html__( 'Update anyway, even though it might break your site?', '@@text_domain' );

            // disable autosave due to it is not working for the custom metaboxes.
            wp_dequeue_script( 'autosave' );

            wp_enqueue_media();

            wp_enqueue_script( 'iframe-resizer', visual_portfolio()->plugin_url . 'assets/vendor/iframe-resizer/iframeResizer.min.js', '', '4.2.1', true );

            wp_enqueue_style( 'wp-color-picker' );
            wp_enqueue_script( 'wp-color-picker-alpha', visual_portfolio()->plugin_url . 'assets/vendor/wp-color-picker-alpha/wp-color-picker-alpha.min.js', array( 'wp-color-picker' ), '2.1.3', true );

            wp_enqueue_script( 'image-picker', visual_portfolio()->plugin_url . 'assets/vendor/image-picker/image-picker.min.js', array( 'jquery' ), '0.3.0', true );
            wp_enqueue_style( 'image-picker', visual_portfolio()->plugin_url . 'assets/vendor/image-picker/image-picker.css', '', '0.3.0' );

            wp_enqueue_script( 'select2', visual_portfolio()->plugin_url . 'assets/vendor/select2/js/select2.min.js', array( 'jquery' ), '4.0.5', true );
            wp_enqueue_style( 'select2', visual_portfolio()->plugin_url . 'assets/vendor/select2/css/select2.css', '', '4.0.5' );

            wp_enqueue_script( 'sortablejs', visual_portfolio()->plugin_url . 'assets/vendor/sortable/Sortable.min.js', array( 'jquery' ), '1.8.4', true );
            wp_enqueue_script( 'sortablejs-jquery', visual_portfolio()->plugin_url . 'assets/vendor/sortable/jquery.binding.js', array( 'sortablejs' ), '1.8.4', true );

            wp_enqueue_script( 'conditionize', visual_portfolio()->plugin_url . 'assets/vendor/conditionize/conditionize.min.js', array( 'jquery' ), '1.0.2', true );

            wp_enqueue_script( 'popper.js', visual_portfolio()->plugin_url . 'assets/vendor/popper.js/popper.min.js', '', '1.14.3', true );
            wp_enqueue_script( 'tooltip.js', visual_portfolio()->plugin_url . 'assets/vendor/popper.js/tooltip.min.js', array( 'popper.js' ), '1.14.3', true );
            wp_enqueue_style( 'popper.js', visual_portfolio()->plugin_url . 'assets/vendor/popper.js/popper.css', '', '1.14.3' );

            wp_enqueue_script( 'clipboard.js', visual_portfolio()->plugin_url . 'assets/vendor/clipboard.js/clipboard.min.js', '', '2.0.4', true );

            $codemirror_version = '5.45.0';
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

            wp_enqueue_script( '@@plugin_name-layout-admin', visual_portfolio()->plugin_url . 'assets/admin/js/layouts-editor.min.js', array( 'jquery' ), '@@plugin_version', true );
            wp_enqueue_style( '@@plugin_name-layout-admin', visual_portfolio()->plugin_url . 'assets/admin/css/layouts-editor.min.css', '', '@@plugin_version' );
            wp_localize_script( '@@plugin_name-layout-admin', 'VPAdminVariables', $data_init );
        }

        wp_enqueue_script( '@@plugin_name-admin', visual_portfolio()->plugin_url . 'assets/admin/js/script.min.js', array( 'jquery', 'wp-data' ), '@@plugin_version', true );
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
            array( 'wp-editor', 'wp-i18n', 'wp-element', 'wp-components', 'jquery' ),
            filemtime( plugin_dir_path( __FILE__ ) . '../assets/admin/js/gutenberg-block.min.js' ),
            true
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
        $custom_slug = Visual_Portfolio_Settings::get_option( 'portfolio_slug', 'vp_general', 'portfolio' );

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
                'label'             => esc_html__( 'Portfolio Categories', '@@text_domain' ),
                'labels'            => array(
                    'menu_name' => esc_html__( 'Categories', '@@text_domain' ),
                ),
                'rewrite'           => array(
                    'slug' => 'portfolio-category',
                ),
                'hierarchical'      => true,
                'public'            => false,
                'show_ui'           => true,
                'show_in_rest'      => true,
                'show_admin_column' => true,
                'map_meta_cap'      => true,
                'capability_type'   => 'portfolio',
            )
        );
        register_taxonomy(
            'portfolio_tag',
            'portfolio',
            array(
                'label'             => esc_html__( 'Portfolio Tags', '@@text_domain' ),
                'labels'            => array(
                    'menu_name' => esc_html__( 'Tags', '@@text_domain' ),
                ),
                'rewrite'           => array(
                    'slug' => 'portfolio-tag',
                ),
                'hierarchical'      => false,
                'public'            => false,
                'show_ui'           => true,
                'show_in_rest'      => true,
                'show_admin_column' => true,
                'map_meta_cap'      => true,
                'capability_type'   => 'portfolio',
            )
        );

        // portfolio lists post type.
        register_post_type(
            'vp_lists',
            array(
                'labels'          => array(
                    'name'               => _x( 'Portfolio Layouts', 'Post Type General Name', '@@text_domain' ),
                    'singular_name'      => _x( 'Portfolio Layout', 'Post Type Singular Name', '@@text_domain' ),
                    'menu_name'          => __( 'Visual Portfolio', '@@text_domain' ),
                    'parent_item_colon'  => __( 'Parent Portfolio Item', '@@text_domain' ),
                    'all_items'          => __( 'Portfolio Layouts', '@@text_domain' ),
                    'view_item'          => __( 'View Portfolio Layout', '@@text_domain' ),
                    'add_new_item'       => __( 'Add New Portfolio Layout', '@@text_domain' ),
                    'add_new'            => __( 'Add New', '@@text_domain' ),
                    'edit_item'          => __( 'Edit Portfolio Layout', '@@text_domain' ),
                    'update_item'        => __( 'Update Portfolio Layout', '@@text_domain' ),
                    'search_items'       => __( 'Search Portfolio Layout', '@@text_domain' ),
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
                    'revisions',
                ),
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

        $video_url   = get_post_meta( $post->ID, 'video_url', true );
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
                // phpcs:ignore
                if ( is_array( $_POST[ $item ] ) ) {
                    $result = array_map( 'sanitize_text_field', wp_unslash( $_POST[ $item ] ) );
                } else {
                    $result = sanitize_text_field( wp_unslash( $_POST[ $item ] ) );
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
     * Add blank page for portfolio lists
     *
     * @param string $which position.
     */
    public function maybe_render_blank_state( $which ) {
        global $post_type;

        if ( in_array( $post_type, array( 'vp_lists' ), true ) && 'bottom' === $which ) {
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

        // Documentation menu link.
        add_submenu_page(
            'edit.php?post_type=portfolio',
            esc_html__( 'Documentation', '@@text_domain' ),
            esc_html__( 'Documentation', '@@text_domain' ),
            'manage_options',
            'https://visualportfolio.co/documentation/getting-started/'
        );
    }

    /**
     * Register control fields for the metaboxes.
     */
    public function register_controls() {
        do_action( 'vpf_before_register_controls' );

        /**
         * Layouts.
         */
        $layouts = array_merge(
            array(
                // Tiles.
                'tiles' => array(
                    'title'    => esc_html__( 'Tiles', '@@text_domain' ),
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
                            'type'        => 'images_dropdown',
                            'label'       => esc_html__( 'Type', '@@text_domain' ),
                            'placeholder' => esc_html__( 'Select tiles type', '@@text_domain' ),
                            'name'        => 'type',
                            'default'     => '3|1,1|',
                            'options'     => array_merge(
                                array(
                                    array(
                                        'url'   => visual_portfolio()->plugin_url . 'assets/admin/images/layouts/tiles-1-1.svg',
                                        'value' => '1|1,0.5|',
                                    ),
                                    array(
                                        'url'   => visual_portfolio()->plugin_url . 'assets/admin/images/layouts/tiles-2-1.svg',
                                        'value' => '2|1,1|',
                                    ),
                                    array(
                                        'url'   => visual_portfolio()->plugin_url . 'assets/admin/images/layouts/tiles-2-2.svg',
                                        'value' => '2|1,0.8|',
                                    ),
                                    array(
                                        'url'   => visual_portfolio()->plugin_url . 'assets/admin/images/layouts/tiles-2-3.svg',
                                        'value' => '2|1,1.34|',
                                    ),
                                    array(
                                        'url'   => visual_portfolio()->plugin_url . 'assets/admin/images/layouts/tiles-2-4.svg',
                                        'value' => '2|1,1.2|1,1.2|1,0.67|1,0.67|',
                                    ),
                                    array(
                                        'url'   => visual_portfolio()->plugin_url . 'assets/admin/images/layouts/tiles-2-5.svg',
                                        'value' => '2|1,1.2|1,0.67|1,1.2|1,0.67|',
                                    ),
                                    array(
                                        'url'   => visual_portfolio()->plugin_url . 'assets/admin/images/layouts/tiles-2-6.svg',
                                        'value' => '2|1,0.67|1,1|1,1|1,1|1,1|1,0.67|',
                                    ),
                                    array(
                                        'url'   => visual_portfolio()->plugin_url . 'assets/admin/images/layouts/tiles-3-1.svg',
                                        'value' => '3|1,1|',
                                    ),
                                    array(
                                        'url'   => visual_portfolio()->plugin_url . 'assets/admin/images/layouts/tiles-3-2.svg',
                                        'value' => '3|1,0.8|',
                                    ),
                                    array(
                                        'url'   => visual_portfolio()->plugin_url . 'assets/admin/images/layouts/tiles-3-3.svg',
                                        'value' => '3|1,1.3|',
                                    ),
                                    array(
                                        'url'   => visual_portfolio()->plugin_url . 'assets/admin/images/layouts/tiles-3-4.svg',
                                        'value' => '3|1,1|1,1|1,1|1,1.3|1,1.3|1,1.3|',
                                    ),
                                    array(
                                        'url'   => visual_portfolio()->plugin_url . 'assets/admin/images/layouts/tiles-3-5.svg',
                                        'value' => '3|1,1|1,1|1,2|1,1|1,1|1,1|1,1|1,1|',
                                    ),
                                    array(
                                        'url'   => visual_portfolio()->plugin_url . 'assets/admin/images/layouts/tiles-3-6.svg',
                                        'value' => '3|1,2|1,1|1,1|1,1|1,1|1,1|1,1|1,1|',
                                    ),
                                    array(
                                        'url'   => visual_portfolio()->plugin_url . 'assets/admin/images/layouts/tiles-3-7.svg',
                                        'value' => '3|1,1|1,2|1,1|1,1|1,1|1,1|1,1|1,1|',
                                    ),
                                    array(
                                        'url'   => visual_portfolio()->plugin_url . 'assets/admin/images/layouts/tiles-3-8.svg',
                                        'value' => '3|1,1|1,2|1,1|1,1|1,1|1,1|2,0.5|',
                                    ),
                                    array(
                                        'url'   => visual_portfolio()->plugin_url . 'assets/admin/images/layouts/tiles-3-9.svg',
                                        'value' => '3|1,0.8|1,1.6|1,0.8|1,0.8|1,1.6|1,0.8|1,0.8|1,0.8|1,0.8|1,0.8|',
                                    ),
                                    array(
                                        'url'   => visual_portfolio()->plugin_url . 'assets/admin/images/layouts/tiles-3-10.svg',
                                        'value' => '3|1,0.8|1,1.6|1,0.8|1,0.8|1,1.6|1,1.6|1,0.8|1,0.8|1,0.8|',
                                    ),
                                    array(
                                        'url'   => visual_portfolio()->plugin_url . 'assets/admin/images/layouts/tiles-3-11.svg',
                                        'value' => '3|1,0.8|1,0.8|1,1.6|1,0.8|1,0.8|1,1.6|1,1.6|1,0.8|1,0.8|',
                                    ),
                                    array(
                                        'url'   => visual_portfolio()->plugin_url . 'assets/admin/images/layouts/tiles-3-12.svg',
                                        'value' => '3|1,0.8|1,0.8|1,1.6|1,0.8|1,0.8|1,0.8|1,1.6|1,1.6|1,0.8|',
                                    ),
                                    array(
                                        'url'   => visual_portfolio()->plugin_url . 'assets/admin/images/layouts/tiles-3-13.svg',
                                        'value' => '3|1,1|2,1|1,1|2,0.5|1,1|',
                                    ),
                                    array(
                                        'url'   => visual_portfolio()->plugin_url . 'assets/admin/images/layouts/tiles-3-14.svg',
                                        'value' => '3|1,1|2,1|1,1|1,1|1,1|1,1|2,0.5|1,1|',
                                    ),
                                    array(
                                        'url'   => visual_portfolio()->plugin_url . 'assets/admin/images/layouts/tiles-3-15.svg',
                                        'value' => '3|1,2|2,0.5|1,1|1,2|2,0.5|',
                                    ),
                                    array(
                                        'url'   => visual_portfolio()->plugin_url . 'assets/admin/images/layouts/tiles-4-1.svg',
                                        'value' => '4|1,1|',
                                    ),
                                    array(
                                        'url'   => visual_portfolio()->plugin_url . 'assets/admin/images/layouts/tiles-4-2.svg',
                                        'value' => '4|1,1|1,1.34|1,1|1,1.34|1,1.34|1,1.34|1,1|1,1|',
                                    ),
                                    array(
                                        'url'   => visual_portfolio()->plugin_url . 'assets/admin/images/layouts/tiles-4-3.svg',
                                        'value' => '4|1,0.8|1,1|1,0.8|1,1|1,1|1,1|1,0.8|1,0.8|',
                                    ),
                                    array(
                                        'url'   => visual_portfolio()->plugin_url . 'assets/admin/images/layouts/tiles-4-4.svg',
                                        'value' => '4|1,1|1,1|2,1|1,1|1,1|2,1|1,1|1,1|1,1|1,1|',
                                    ),
                                    array(
                                        'url'   => visual_portfolio()->plugin_url . 'assets/admin/images/layouts/tiles-4-5.svg',
                                        'value' => '4|2,1|2,0.5|2,0.5|2,0.5|2,1|2,0.5|',
                                    ),
                                ),
                                Visual_Portfolio_Extend::tiles()
                            ),
                        ),
                    ),
                ),

                // Masonry.
                'masonry' => array(
                    'title'    => esc_html__( 'Masonry', '@@text_domain' ),
                    'controls' => array(
                        array(
                            'type'    => 'range',
                            'label'   => esc_html__( 'Columns', '@@text_domain' ),
                            'name'    => 'columns',
                            'min'     => 1,
                            'max'     => 5,
                            'default' => 3,
                        ),
                    ),
                ),

                // Grid.
                'grid' => array(
                    'title'    => esc_html__( 'Grid', '@@text_domain' ),
                    'controls' => array(
                        array(
                            'type'    => 'range',
                            'label'   => esc_html__( 'Columns', '@@text_domain' ),
                            'name'    => 'columns',
                            'min'     => 1,
                            'max'     => 5,
                            'default' => 3,
                        ),
                    ),
                ),

                // Justified.
                'justified' => array(
                    'title'    => esc_html__( 'Justified', '@@text_domain' ),
                    'controls' => array(
                        array(
                            'type'    => 'range',
                            'label'   => esc_html__( 'Row height', '@@text_domain' ),
                            'name'    => 'row_height',
                            'min'     => 100,
                            'max'     => 1000,
                            'default' => 200,
                        ),
                        array(
                            'type'    => 'range',
                            'label'   => esc_html__( 'Row Height Tolerance', '@@text_domain' ),
                            'name'    => 'row_height_tolerance',
                            'min'     => 0,
                            'max'     => 1,
                            'step'    => 0.05,
                            'default' => 0.25,
                        ),
                    ),
                ),

                // Slider.
                'slider' => array(
                    'title'    => esc_html__( 'Slider', '@@text_domain' ),
                    'controls' => array(
                        array(
                            'type'    => 'select2',
                            'label'   => esc_html__( 'Effect', '@@text_domain' ),
                            'name'    => 'effect',
                            'default' => 'slide',
                            'options' => array(
                                'slide'     => esc_html__( 'Slide', '@@text_domain' ),
                                'coverflow' => esc_html__( 'Coverflow', '@@text_domain' ),
                                'fade'      => esc_html__( 'Fade', '@@text_domain' ),
                            ),
                        ),
                        array(
                            'type'    => 'range',
                            'label'   => esc_html__( 'Speed (in Seconds)', '@@text_domain' ),
                            'name'    => 'speed',
                            'min'     => 0,
                            'max'     => 5,
                            'step'    => 0.1,
                            'default' => 0.3,
                        ),
                        array(
                            'type'    => 'range',
                            'label'   => esc_html__( 'Autoplay (in Seconds)', '@@text_domain' ),
                            'name'    => 'autoplay',
                            'min'     => 0,
                            'max'     => 20,
                            'step'    => 0.2,
                            'default' => 6,
                        ),
                        array(
                            'type'      => 'toggle',
                            'label'     => esc_html__( 'Pause on Mouse Over', '@@text_domain' ),
                            'name'      => 'autoplay_hover_pause',
                            'default'   => false,
                            'condition' => array(
                                array(
                                    'control'  => 'autoplay',
                                    'operator' => '>',
                                    'value'    => 0,
                                ),
                            ),
                        ),
                        array(
                            'type'    => 'select2',
                            'label'   => esc_html__( 'Items Height', '@@text_domain' ),
                            'name'    => 'items_height_type',
                            'default' => 'dynamic',
                            'options' => array(
                                'auto'    => esc_html__( 'Auto', '@@text_domain' ),
                                'static'  => esc_html__( 'Static (px)', '@@text_domain' ),
                                'dynamic' => esc_html__( 'Dynamic (%)', '@@text_domain' ),
                            ),
                        ),
                        array(
                            'type'      => 'range',
                            'name'      => 'items_height_static',
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
                            'type'      => 'range',
                            'name'      => 'items_height_dynamic',
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
                            'label'       => esc_html__( 'Items Minimal Height', '@@text_domain' ),
                            'placeholder' => esc_attr__( '300px, 80vh', '@@text_domain' ),
                            'description' => esc_html__( 'Values with `vh` units will not be visible in preview.', '@@text_domain' ),
                            'name'        => 'items_min_height',
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
                            'type'      => 'select2',
                            'label'     => esc_html__( 'Slides Per View', '@@text_domain' ),
                            'name'      => 'slides_per_view_type',
                            'default'   => 'custom',
                            'options'   => array(
                                'auto'   => esc_html__( 'Auto', '@@text_domain' ),
                                'custom' => esc_html__( 'Custom', '@@text_domain' ),
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
                            'type'      => 'range',
                            'name'      => 'slides_per_view_custom',
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
                            'type'      => 'toggle',
                            'label'     => esc_html__( 'Centered Slides', '@@text_domain' ),
                            'name'      => 'centered_slides',
                            'default'   => true,
                            'condition' => array(
                                array(
                                    'control'  => 'effect',
                                    'operator' => '!=',
                                    'value'    => 'fade',
                                ),
                            ),
                        ),
                        array(
                            'type'    => 'toggle',
                            'label'   => esc_html__( 'Loop', '@@text_domain' ),
                            'name'    => 'loop',
                            'default' => false,
                        ),
                        array(
                            'type'    => 'toggle',
                            'label'   => esc_html__( 'Free Scroll', '@@text_domain' ),
                            'name'    => 'free_mode',
                            'default' => false,
                        ),
                        array(
                            'type'      => 'toggle',
                            'label'     => esc_html__( 'Free Scroll Sticky', '@@text_domain' ),
                            'name'      => 'free_mode_sticky',
                            'default'   => false,
                            'condition' => array(
                                array(
                                    'control' => 'free_mode',
                                ),
                            ),
                        ),
                        array(
                            'type'    => 'toggle',
                            'label'   => esc_html__( 'Display Arrows', '@@text_domain' ),
                            'name'    => 'arrows',
                            'default' => true,
                        ),
                        array(
                            'type'        => 'text',
                            'name'        => 'arrows_icon_prev',
                            'default'     => 'fas fa-angle-left',
                            'placeholder' => esc_attr__( 'Prev Arrow Icon', '@@text_domain' ),
                            'hint'        => esc_attr__( 'Prev Arrow Icon', '@@text_domain' ),
                            'hint_place'  => 'left',
                            'condition'   => array(
                                array(
                                    'control' => 'arrows',
                                ),
                            ),
                        ),
                        array(
                            'type'        => 'text',
                            'name'        => 'arrows_icon_next',
                            'default'     => 'fas fa-angle-right',
                            'placeholder' => esc_attr__( 'Next Arrow Icon', '@@text_domain' ),
                            'hint'        => esc_attr__( 'Next Arrow Icon', '@@text_domain' ),
                            'hint_place'  => 'left',
                            'condition'   => array(
                                array(
                                    'control' => 'arrows',
                                ),
                            ),
                        ),
                        array(
                            'type'    => 'toggle',
                            'label'   => esc_html__( 'Display Bullets', '@@text_domain' ),
                            'name'    => 'bullets',
                            'default' => false,
                        ),
                        array(
                            'type'      => 'toggle',
                            'label'     => esc_html__( 'Dynamic Bullets', '@@text_domain' ),
                            'name'      => 'bullets_dynamic',
                            'default'   => false,
                            'condition' => array(
                                array(
                                    'control' => 'bullets',
                                ),
                            ),
                        ),
                        array(
                            'type'    => 'toggle',
                            'label'   => esc_html__( 'Mousewheel Control', '@@text_domain' ),
                            'name'    => 'mousewheel',
                            'default' => false,
                        ),
                        array(
                            'type'    => 'toggle',
                            'label'   => esc_html__( 'Display Thumbnails', '@@text_domain' ),
                            'name'    => 'thumbnails',
                            'default' => false,
                        ),
                        array(
                            'type'      => 'range',
                            'label'     => esc_html__( 'Thumbnails Gap', '@@text_domain' ),
                            'name'      => 'thumbnails_gap',
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
                            'type'      => 'select2',
                            'label'     => esc_html__( 'Thumbnails Height', '@@text_domain' ),
                            'name'      => 'thumbnails_height_type',
                            'default'   => 'static',
                            'options'   => array(
                                'auto'    => esc_html__( 'Auto', '@@text_domain' ),
                                'static'  => esc_html__( 'Static (px)', '@@text_domain' ),
                                'dynamic' => esc_html__( 'Dynamic (%)', '@@text_domain' ),
                            ),
                            'condition' => array(
                                array(
                                    'control' => 'thumbnails',
                                ),
                            ),
                        ),
                        array(
                            'type'      => 'range',
                            'name'      => 'thumbnails_height_static',
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
                            'type'      => 'range',
                            'name'      => 'thumbnails_height_dynamic',
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
                            'type'      => 'select2',
                            'label'     => esc_html__( 'Thumbnails Per View', '@@text_domain' ),
                            'name'      => 'thumbnails_per_view_type',
                            'default'   => 'custom',
                            'options'   => array(
                                'auto'   => esc_html__( 'Auto', '@@text_domain' ),
                                'custom' => esc_html__( 'Custom', '@@text_domain' ),
                            ),
                            'condition' => array(
                                array(
                                    'control'  => 'thumbnails',
                                ),
                            ),
                        ),
                        array(
                            'type'      => 'range',
                            'name'      => 'thumbnails_per_view_custom',
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
            Visual_Portfolio_Extend::layouts()
        );

        // Extend specific layout controls.
        foreach ( $layouts as $name => $layout ) {
            if ( isset( $layout['controls'] ) ) {
                $layouts[ $name ]['controls'] = Visual_Portfolio_Extend::layout_controls( $name, $layout['controls'] );
            }
        }

        // Layouts selector.
        $layouts_selector = array();
        foreach ( $layouts as $name => $layout ) {
            $layouts_selector[ $name ] = $layout['title'];
        }
        Visual_Portfolio_Controls::register(
            array(
                'category' => 'layouts',
                'type'     => 'select2',
                'name'     => 'vp_layout',
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
                $field['name']     = 'vp_' . $name . '_' . $field['name'];

                // condition names prefix fix.
                if ( isset( $field['condition'] ) ) {
                    foreach ( $field['condition'] as $k => $cond ) {
                        if ( isset( $cond['control'] ) ) {
                            $field['condition'][ $k ]['control'] = 'vp_' . $name . '_' . $cond['control'];
                        }
                    }
                }

                $field['condition'] = array_merge(
                    isset( $field['condition'] ) ? $field['condition'] : array(),
                    array(
                        array(
                            'control' => 'vp_layout',
                            'value'   => $name,
                        ),
                    )
                );
                Visual_Portfolio_Controls::register( $field );
            }
        }

        Visual_Portfolio_Controls::register(
            array(
                'category' => 'layouts',
                'type'     => 'range',
                'label'    => esc_html__( 'Gap', '@@text_domain' ),
                'name'     => 'vp_items_gap',
                'default'  => 15,
                'min'      => 0,
                'max'      => 150,
            )
        );

        Visual_Portfolio_Controls::register(
            array(
                'category' => 'layouts',
                'type'     => 'range',
                'label'    => esc_html__( 'Items Per Page', '@@text_domain' ),
                'name'     => 'vp_items_count',
                'default'  => 6,
                'min'      => 1,
                'max'      => 50,
            )
        );

        Visual_Portfolio_Controls::register(
            array(
                'category'   => 'layouts',
                'type'       => 'toggle',
                'label'      => esc_html__( 'Stretch', '@@text_domain' ),
                'name'       => 'vp_stretch',
                'default'    => false,
                'hint'       => esc_attr__( 'Break container and display it wide', '@@text_domain' ),
                'hint_place' => 'left',
            )
        );

        /**
         * Items Style
         */
        $items_styles = array_merge(
            array(
                // Default.
                'default' => array(
                    'title'            => esc_html__( 'Default', '@@text_domain' ),
                    'builtin_controls' => array(
                        'show_title'      => true,
                        'show_categories' => true,
                        'show_date'       => true,
                        'show_excerpt'    => true,
                        'show_icons'      => false,
                        'align'           => true,
                    ),
                    'controls'         => array(
                        array(
                            'type'    => 'select2',
                            'label'   => esc_html__( 'Display Read More Button', '@@text_domain' ),
                            'name'    => 'show_read_more',
                            'default' => false,
                            'options' => array(
                                'false'    => esc_html__( 'Hide', '@@text_domain' ),
                                'true'     => esc_html__( 'Always Display', '@@text_domain' ),
                                'more_tag' => esc_html__( 'Display when used "More tag" in the post', '@@text_domain' ),
                            ),
                        ),
                        array(
                            'type'        => 'text',
                            'name'        => 'read_more_label',
                            'placeholder' => 'Read More',
                            'default'     => 'Read More',
                            'hint'        => esc_attr__( 'Read More Button Label', '@@text_domain' ),
                            'hint_place'  => 'left',
                            'condition'   => array(
                                array(
                                    'control'  => 'show_read_more',
                                    'operator' => '!=',
                                    'value'    => 'false',
                                ),
                            ),
                        ),
                    ),
                ),

                // Fly.
                'fly' => array(
                    'title'            => esc_html__( 'Fly', '@@text_domain' ),
                    'builtin_controls' => array(
                        'show_title'      => true,
                        'show_categories' => true,
                        'show_date'       => true,
                        'show_excerpt'    => true,
                        'show_icons'      => true,
                        'align'           => 'extended',
                    ),
                    'controls'         => array(
                        array(
                            'type'    => 'color',
                            'label'   => esc_html__( 'Overlay Background Color', '@@text_domain' ),
                            'name'    => 'bg_color',
                            'default' => '#212125',
                            'alpha'   => true,
                            'style'   => array(
                                array(
                                    'element'  => '.vp-portfolio__items-style-fly .vp-portfolio__item-overlay',
                                    'property' => 'background-color',
                                ),
                            ),
                        ),
                        array(
                            'type'    => 'color',
                            'label'   => esc_html__( 'Overlay Text Color', '@@text_domain' ),
                            'name'    => 'text_color',
                            'default' => '#fff',
                            'alpha'   => true,
                            'style'   => array(
                                array(
                                    'element'  => '.vp-portfolio__items-style-fly .vp-portfolio__item-overlay',
                                    'property' => 'color',
                                ),
                            ),
                        ),
                    ),
                ),

                // Emerge.
                'emerge' => array(
                    'title'            => esc_html__( 'Emerge', '@@text_domain' ),
                    'builtin_controls' => array(
                        'show_title'      => true,
                        'show_categories' => true,
                        'show_date'       => true,
                        'show_excerpt'    => true,
                        'show_icons'      => false,
                        'align'           => true,
                    ),
                    'controls'         => array(
                        array(
                            'type'    => 'color',
                            'label'   => esc_html__( 'Overlay Background Color', '@@text_domain' ),
                            'name'    => 'bg_color',
                            'default' => '#fff',
                            'alpha'   => true,
                            'style'   => array(
                                array(
                                    'element'  => '.vp-portfolio__items-style-emerge .vp-portfolio__item-overlay',
                                    'property' => 'background-color',
                                ),
                            ),
                        ),
                        array(
                            'type'    => 'color',
                            'label'   => esc_html__( 'Overlay Text Color', '@@text_domain' ),
                            'name'    => 'text_color',
                            'default' => '#000',
                            'alpha'   => true,
                            'style'   => array(
                                array(
                                    'element'  => '.vp-portfolio__items-style-emerge .vp-portfolio__item-overlay',
                                    'property' => 'color',
                                ),
                            ),
                        ),
                    ),
                ),

                // Fade.
                'fade' => array(
                    'title'            => esc_html__( 'Fade', '@@text_domain' ),
                    'builtin_controls' => array(
                        'show_title'      => true,
                        'show_categories' => true,
                        'show_date'       => true,
                        'show_excerpt'    => true,
                        'show_icons'      => true,
                        'align'           => 'extended',
                    ),
                    'controls'         => array(
                        array(
                            'type'    => 'color',
                            'label'   => esc_html__( 'Overlay Background Color', '@@text_domain' ),
                            'name'    => 'bg_color',
                            'default' => 'rgba(0, 0, 0, 0.85)',
                            'alpha'   => true,
                            'style'   => array(
                                array(
                                    'element'  => '.vp-portfolio__items-style-fade .vp-portfolio__item-overlay',
                                    'property' => 'background-color',
                                ),
                            ),
                        ),
                        array(
                            'type'    => 'color',
                            'label'   => esc_html__( 'Overlay Text Color', '@@text_domain' ),
                            'name'    => 'text_color',
                            'default' => '#fff',
                            'alpha'   => true,
                            'style'   => array(
                                array(
                                    'element'  => '.vp-portfolio__items-style-fade .vp-portfolio__item-overlay',
                                    'property' => 'color',
                                ),
                            ),
                        ),
                    ),
                ),
            ),
            Visual_Portfolio_Extend::items_styles()
        );

        // Extend specific item style controls.
        foreach ( $items_styles as $name => $style ) {
            if ( isset( $style['controls'] ) ) {
                $items_styles[ $name ]['controls'] = Visual_Portfolio_Extend::item_style_controls( $name, $style['controls'] );
            }
        }

        // Styles selector.
        $items_styles_selector = array();
        foreach ( $items_styles as $name => $style ) {
            $items_styles_selector[ $name ] = $style['title'];
        }
        Visual_Portfolio_Controls::register(
            array(
                'category' => 'items-style',
                'type'     => 'select2',
                'name'     => 'vp_items_style',
                'default'  => 'fly',
                'options'  => $items_styles_selector,
            )
        );

        // styles builtin options.
        foreach ( $items_styles as $name => $style ) {
            $new_fields = array();
            if ( isset( $style['builtin_controls'] ) ) {
                foreach ( $style['builtin_controls'] as $control_name => $val ) {
                    if ( ! $val ) {
                        continue;
                    }
                    switch ( $control_name ) {
                        case 'show_title':
                            $new_fields[] = array(
                                'type'    => 'toggle',
                                'label'   => esc_html__( 'Display Title', '@@text_domain' ),
                                'name'    => 'show_title',
                                'default' => true,
                            );
                            break;
                        case 'show_categories':
                            $new_fields[] = array(
                                'type'    => 'toggle',
                                'label'   => esc_html__( 'Display Categories', '@@text_domain' ),
                                'name'    => 'show_categories',
                                'default' => true,
                            );
                            $new_fields[] = array(
                                'type'      => 'range',
                                'label'     => esc_html__( 'Categories Count', '@@text_domain' ),
                                'name'      => 'categories_count',
                                'min'       => 1,
                                'max'       => 10,
                                'default'   => 1,
                                'condition' => array(
                                    array(
                                        'control' => 'show_categories',
                                    ),
                                ),
                            );
                            break;
                        case 'show_date':
                            $new_fields[] = array(
                                'type'    => 'select2',
                                'label'   => esc_html__( 'Display Date', '@@text_domain' ),
                                'name'    => 'show_date',
                                'default' => false,
                                'options' => array(
                                    'false' => esc_html__( 'Hide', '@@text_domain' ),
                                    'true'  => esc_html__( 'Default', '@@text_domain' ),
                                    'human' => esc_html__( 'Human Format', '@@text_domain' ),
                                ),
                            );
                            $new_fields[] = array(
                                'type'        => 'text',
                                'name'        => 'date_format',
                                'placeholder' => 'F j, Y',
                                'default'     => 'F j, Y',
                                'hint'        => esc_attr__( "Date format \r\n Example: F j, Y", '@@text_domain' ),
                                'hint_place'  => 'left',
                                'condition'   => array(
                                    array(
                                        'control' => 'show_date',
                                    ),
                                ),
                            );
                            break;
                        case 'show_excerpt':
                            $new_fields[] = array(
                                'type'    => 'toggle',
                                'label'   => esc_html__( 'Display Excerpt', '@@text_domain' ),
                                'name'    => 'show_excerpt',
                                'default' => false,
                            );
                            $new_fields[] = array(
                                'type'      => 'range',
                                'label'     => esc_html__( 'Excerpt Words Count', '@@text_domain' ),
                                'name'      => 'excerpt_words_count',
                                'default'   => 15,
                                'min'       => 1,
                                'max'       => 200,
                                'condition' => array(
                                    array(
                                        'control' => 'show_excerpt',
                                    ),
                                ),
                            );
                            break;
                        case 'show_icons':
                            $new_fields[] = array(
                                'type'    => 'toggle',
                                'label'   => esc_html__( 'Display Icon', '@@text_domain' ),
                                'name'    => 'show_icon',
                                'default' => false,
                            );
                            $new_fields[] = array(
                                'type'        => 'text',
                                'name'        => 'icon',
                                'default'     => 'fas fa-search',
                                'placeholder' => esc_attr__( 'Standard Icon', '@@text_domain' ),
                                'hint'        => esc_attr__( 'Standard Icon', '@@text_domain' ),
                                'hint_place'  => 'left',
                                'condition'   => array(
                                    array(
                                        'control' => 'show_icon',
                                    ),
                                ),
                            );
                            $new_fields[] = array(
                                'type'        => 'text',
                                'name'        => 'icon_video',
                                'default'     => 'fas fa-play',
                                'placeholder' => esc_attr__( 'Video Icon', '@@text_domain' ),
                                'hint'        => esc_attr__( 'Video Icon', '@@text_domain' ),
                                'hint_place'  => 'left',
                                'condition'   => array(
                                    array(
                                        'control' => 'show_icon',
                                    ),
                                ),
                            );
                            break;
                        case 'align':
                            $new_fields[] = array(
                                'type'     => 'align',
                                'label'    => esc_html__( 'Caption Align', '@@text_domain' ),
                                'name'     => 'align',
                                'default'  => 'center',
                                'extended' => 'extended' === $val,
                            );
                            break;
                        // no default.
                    }
                }
            }
            $items_styles[ $name ]['controls'] = array_merge( $new_fields, isset( $style['controls'] ) ? $style['controls'] : array() );
        }

        // styles options.
        foreach ( $items_styles as $name => $style ) {
            if ( ! isset( $style['controls'] ) ) {
                continue;
            }
            foreach ( $style['controls'] as $field ) {
                $field['category'] = 'items-style';
                $field['name']     = 'vp_items_style_' . $name . '__' . $field['name'];

                // condition names prefix fix.
                if ( isset( $field['condition'] ) ) {
                    foreach ( $field['condition'] as $k => $cond ) {
                        if ( isset( $cond['control'] ) ) {
                            $field['condition'][ $k ]['control'] = 'vp_items_style_' . $name . '__' . $cond['control'];
                        }
                    }
                }

                $field['condition'] = array_merge(
                    isset( $field['condition'] ) ? $field['condition'] : array(),
                    array(
                        array(
                            'control' => 'vp_items_style',
                            'value'   => $name,
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
                'type'     => 'select2',
                'name'     => 'vp_items_click_action',
                'default'  => 'url',
                'options'  => array(
                    'false'         => esc_html__( 'Disabled', '@@text_domain' ),
                    'url'           => esc_html__( 'URL', '@@text_domain' ),
                    'popup_gallery' => esc_html__( 'Popup Gallery', '@@text_domain' ),
                ),
            )
        );

        // url.
        Visual_Portfolio_Controls::register(
            array(
                'category'  => 'items-click-action',
                'type'      => 'select2',
                'label'     => esc_html__( 'Target', '@@text_domain' ),
                'name'      => 'vp_items_click_action_url_target',
                'default'   => '',
                'options'   => array(
                    ''       => esc_html__( 'Default', '@@text_domain' ),
                    '_blank' => esc_html__( 'New Tab (_blank)', '@@text_domain' ),
                    '_top'   => esc_html__( 'Top Frame (_top)', '@@text_domain' ),
                ),
                'condition' => array(
                    array(
                        'control' => 'vp_items_click_action',
                        'value'   => 'url',
                    ),
                ),
            )
        );

        // popup.
        Visual_Portfolio_Controls::register(
            array(
                'category'  => 'items-click-action',
                'type'      => 'select2',
                'label'     => esc_html__( 'Title', '@@text_domain' ),
                'name'      => 'vp_items_click_action_popup_title_source',
                'default'   => 'title',
                'options'   => array(
                    'none'        => esc_html__( 'None', '@@text_domain' ),
                    'title'       => esc_html__( 'Image Title', '@@text_domain' ),
                    'caption'     => esc_html__( 'Image Caption', '@@text_domain' ),
                    'alt'         => esc_html__( 'Image Alt', '@@text_domain' ),
                    'description' => esc_html__( 'Image Description', '@@text_domain' ),
                ),
                'condition' => array(
                    array(
                        'control' => 'vp_items_click_action',
                        'value'   => 'popup_gallery',
                    ),
                ),
            )
        );
        Visual_Portfolio_Controls::register(
            array(
                'category'  => 'items-click-action',
                'type'      => 'select2',
                'label'     => esc_html__( 'Description', '@@text_domain' ),
                'name'      => 'vp_items_click_action_popup_description_source',
                'default'   => 'description',
                'options'   => array(
                    'none'        => esc_html__( 'None', '@@text_domain' ),
                    'title'       => esc_html__( 'Image Title', '@@text_domain' ),
                    'caption'     => esc_html__( 'Image Caption', '@@text_domain' ),
                    'alt'         => esc_html__( 'Image Alt', '@@text_domain' ),
                    'description' => esc_html__( 'Image Description', '@@text_domain' ),
                ),
                'condition' => array(
                    array(
                        'control' => 'vp_items_click_action',
                        'value'   => 'popup_gallery',
                    ),
                ),
            )
        );

        /**
         * Filter.
         */
        $filters = array_merge(
            array(
                // False.
                'false' => array(
                    'title'    => esc_html__( 'Disabled', '@@text_domain' ),
                    'controls' => array(),
                ),

                // Default.
                'default' => array(
                    'title'    => esc_html__( 'Default', '@@text_domain' ),
                    'controls' => array(),
                ),

                // Dropdown.
                'dropdown' => array(
                    'title'    => esc_html__( 'Dropdown', '@@text_domain' ),
                    'controls' => array(),
                ),
            ),
            Visual_Portfolio_Extend::filters()
        );

        // Extend specific filter controls.
        foreach ( $filters as $name => $filter ) {
            if ( isset( $filter['controls'] ) ) {
                $filters[ $name ]['controls'] = Visual_Portfolio_Extend::filter_controls( $name, $filter['controls'] );
            }
        }

        // Filters selector.
        $filters_selector = array();
        foreach ( $filters as $name => $filter ) {
            $filters_selector[ $name ] = $filter['title'];
        }
        Visual_Portfolio_Controls::register(
            array(
                'category' => 'filter',
                'type'     => 'select2',
                'name'     => 'vp_filter',
                'default'  => 'default',
                'options'  => $filters_selector,
            )
        );

        // filters options.
        foreach ( $filters as $name => $filter ) {
            if ( ! isset( $filter['controls'] ) ) {
                continue;
            }
            foreach ( $filter['controls'] as $field ) {
                $field['category'] = 'filter';
                $field['name']     = 'vp_filter_' . $name . '__' . $field['name'];

                // condition names prefix fix.
                if ( isset( $field['condition'] ) ) {
                    foreach ( $field['condition'] as $k => $cond ) {
                        if ( isset( $cond['control'] ) ) {
                            $field['condition'][ $k ]['control'] = 'vp_' . $name . '_' . $cond['control'];
                        }
                    }
                }

                $field['condition'] = array_merge(
                    isset( $field['condition'] ) ? $field['condition'] : array(),
                    array(
                        array(
                            'control' => 'vp_filter',
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
                'type'      => 'select2',
                'label'     => esc_html__( 'Align', '@@text_domain' ),
                'name'      => 'vp_filter_align',
                'default'   => 'center',
                'options'   => array(
                    'center' => esc_html__( 'Center', '@@text_domain' ),
                    'left'   => esc_html__( 'Left', '@@text_domain' ),
                    'right'  => esc_html__( 'Right', '@@text_domain' ),
                ),
                'condition' => array(
                    array(
                        'control'  => 'vp_filter',
                        'operator' => '!=',
                        'value'    => 'false',
                    ),
                ),
            )
        );
        Visual_Portfolio_Controls::register(
            array(
                'category'  => 'filter',
                'type'      => 'toggle',
                'label'     => esc_html__( 'Display Count', '@@text_domain' ),
                'name'      => 'vp_filter_show_count',
                'default'   => false,
                'condition' => array(
                    array(
                        'control'  => 'vp_filter',
                        'operator' => '!=',
                        'value'    => 'false',
                    ),
                ),
            )
        );
        Visual_Portfolio_Controls::register(
            array(
                'category'  => 'filter',
                'type'      => 'text',
                'label'     => esc_html__( 'All Button Text', '@@text_domain' ),
                'name'      => 'vp_filter_text_all',
                'default'   => esc_attr__( 'All', '@@text_domain' ),
                'condition' => array(
                    array(
                        'control'  => 'vp_filter',
                        'operator' => '!=',
                        'value'    => 'false',
                    ),
                ),
            )
        );

        /**
         * Sort.
         */
        $sorts = array_merge(
            array(
                // False.
                'false' => array(
                    'title'    => esc_html__( 'Disabled', '@@text_domain' ),
                    'controls' => array(),
                ),

                // Default.
                'default' => array(
                    'title'    => esc_html__( 'Default', '@@text_domain' ),
                    'controls' => array(),
                ),

                // Dropdown.
                'dropdown' => array(
                    'title'    => esc_html__( 'Dropdown', '@@text_domain' ),
                    'controls' => array(),
                ),
            ),
            Visual_Portfolio_Extend::sort()
        );

        // Extend specific sort controls.
        foreach ( $sorts as $name => $sort ) {
            if ( isset( $sort['controls'] ) ) {
                $sorts[ $name ]['controls'] = Visual_Portfolio_Extend::sort_controls( $name, $sort['controls'] );
            }
        }

        // Sort selector.
        $sorts_selector = array();
        foreach ( $sorts as $name => $sort ) {
            $sorts_selector[ $name ] = $sort['title'];
        }
        Visual_Portfolio_Controls::register(
            array(
                'category' => 'sort',
                'type'     => 'select2',
                'name'     => 'vp_sort',
                'default'  => 'false',
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
                $field['name']     = 'vp_sort_' . $name . '__' . $field['name'];

                // condition names prefix fix.
                if ( isset( $field['condition'] ) ) {
                    foreach ( $field['condition'] as $k => $cond ) {
                        if ( isset( $cond['control'] ) ) {
                            $field['condition'][ $k ]['control'] = 'vp_' . $name . '_' . $cond['control'];
                        }
                    }
                }

                $field['condition'] = array_merge(
                    isset( $field['condition'] ) ? $field['condition'] : array(),
                    array(
                        array(
                            'control' => 'vp_sort',
                            'value'   => $name,
                        ),
                    )
                );
                Visual_Portfolio_Controls::register( $field );
            }
        }

        Visual_Portfolio_Controls::register(
            array(
                'category'  => 'sort',
                'type'      => 'select2',
                'label'     => esc_html__( 'Align', '@@text_domain' ),
                'name'      => 'vp_sort_align',
                'default'   => 'center',
                'options'   => array(
                    'center' => esc_html__( 'Center', '@@text_domain' ),
                    'left'   => esc_html__( 'Left', '@@text_domain' ),
                    'right'  => esc_html__( 'Right', '@@text_domain' ),
                ),
                'condition' => array(
                    array(
                        'control'  => 'vp_sort',
                        'operator' => '!=',
                        'value'    => 'false',
                    ),
                ),
            )
        );

        /**
         * Pagination
         */
        $pagination = array_merge(
            array(
                // False.
                'false' => array(
                    'title'    => esc_html__( 'Disabled', '@@text_domain' ),
                    'controls' => array(),
                ),

                // Default.
                'default' => array(
                    'title'    => esc_html__( 'Default', '@@text_domain' ),
                    'controls' => array(),
                ),
            ),
            Visual_Portfolio_Extend::pagination()
        );

        // Extend specific pagination controls.
        foreach ( $pagination as $name => $pagin ) {
            if ( isset( $pagin['controls'] ) ) {
                $pagination[ $name ]['controls'] = Visual_Portfolio_Extend::pagination_controls( $name, $pagin['controls'] );
            }
        }

        // Pagination selector.
        $pagination_selector = array();
        foreach ( $pagination as $name => $pagin ) {
            $pagination_selector[ $name ] = $pagin['title'];
        }
        Visual_Portfolio_Controls::register(
            array(
                'category' => 'pagination',
                'type'     => 'select2',
                'name'     => 'vp_pagination_style',
                'default'  => 'default',
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
                $field['name']     = 'vp_pagination_' . $name . '__' . $field['name'];

                // condition names prefix fix.
                if ( isset( $field['condition'] ) ) {
                    foreach ( $field['condition'] as $k => $cond ) {
                        if ( isset( $cond['control'] ) ) {
                            $field['condition'][ $k ]['control'] = 'vp_' . $name . '_' . $cond['control'];
                        }
                    }
                }

                $field['condition'] = array_merge(
                    isset( $field['condition'] ) ? $field['condition'] : array(),
                    array(
                        array(
                            'control' => 'vp_pagination_style',
                            'value'   => $name,
                        ),
                    )
                );
                Visual_Portfolio_Controls::register( $field );
            }
        }

        Visual_Portfolio_Controls::register(
            array(
                'category'  => 'pagination',
                'label'     => esc_html__( 'Type', '@@text_domain' ),
                'type'      => 'select2',
                'name'      => 'vp_pagination',
                'default'   => 'load-more',
                'options'   => array(
                    'paged'     => esc_html__( 'Paged', '@@text_domain' ),
                    'load-more' => esc_html__( 'Load More', '@@text_domain' ),
                    'infinite'  => esc_html__( 'Infinite', '@@text_domain' ),
                ),
                'condition' => array(
                    array(
                        'control'  => 'vp_pagination_style',
                        'operator' => '!=',
                        'value'    => 'false',
                    ),
                ),
            )
        );
        Visual_Portfolio_Controls::register(
            array(
                'category'    => 'pagination',
                'type'        => 'html',
                'description' => esc_html__( 'Note: you will see the "Load More" pagination in the preview. "Infinite" pagination will be visible on the site.', '@@text_domain' ),
                'name'        => 'vp_pagination_infinite_notice',
                'condition'   => array(
                    array(
                        'control'  => 'vp_pagination_style',
                        'operator' => '!=',
                        'value'    => 'false',
                    ),
                    array(
                        'control'  => 'vp_pagination',
                        'operator' => '==',
                        'value'    => 'infinite',
                    ),
                ),
            )
        );
        Visual_Portfolio_Controls::register(
            array(
                'category'  => 'pagination',
                'type'      => 'select2',
                'label'     => esc_html__( 'Align', '@@text_domain' ),
                'name'      => 'vp_pagination_align',
                'default'   => 'center',
                'options'   => array(
                    'center' => esc_html__( 'Center', '@@text_domain' ),
                    'left'   => esc_html__( 'Left', '@@text_domain' ),
                    'right'  => esc_html__( 'Right', '@@text_domain' ),
                ),
                'condition' => array(
                    array(
                        'control'  => 'vp_pagination_style',
                        'operator' => '!=',
                        'value'    => 'false',
                    ),
                    array(
                        'control'  => 'vp_pagination',
                        'operator' => '!=',
                        'value'    => 'false',
                    ),
                ),
            )
        );
        Visual_Portfolio_Controls::register(
            array(
                'category'  => 'pagination',
                'type'      => 'html',
                'label'     => esc_html__( 'Texts', '@@text_domain' ),
                'name'      => 'vp_pagination_infinite_texts',
                'condition' => array(
                    array(
                        'control'  => 'vp_pagination_style',
                        'operator' => '!=',
                        'value'    => 'false',
                    ),
                    array(
                        'control'  => 'vp_pagination',
                        'operator' => '==',
                        'value'    => 'infinite',
                    ),
                ),
            )
        );
        Visual_Portfolio_Controls::register(
            array(
                'category'  => 'pagination',
                'type'      => 'html',
                'label'     => esc_html__( 'Texts', '@@text_domain' ),
                'name'      => 'vp_pagination_load_more_texts',
                'condition' => array(
                    array(
                        'control'  => 'vp_pagination_style',
                        'operator' => '!=',
                        'value'    => 'false',
                    ),
                    array(
                        'control'  => 'vp_pagination',
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
                'name'        => 'vp_pagination_infinite_text_load',
                'default'     => esc_attr__( 'Load More', '@@text_domain' ),
                'placeholder' => esc_attr__( 'Load more button label', '@@text_domain' ),
                'hint'        => esc_attr__( 'Load more button label', '@@text_domain' ),
                'hint_place'  => 'left',
                'condition'   => array(
                    array(
                        'control'  => 'vp_pagination_style',
                        'operator' => '!=',
                        'value'    => 'false',
                    ),
                    array(
                        'control'  => 'vp_pagination',
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
                'name'        => 'vp_pagination_infinite_text_loading',
                'default'     => esc_attr__( 'Loading More...', '@@text_domain' ),
                'placeholder' => esc_attr__( 'Loading more button label', '@@text_domain' ),
                'hint'        => esc_attr__( 'Loading more button label', '@@text_domain' ),
                'hint_place'  => 'left',
                'condition'   => array(
                    array(
                        'control'  => 'vp_pagination_style',
                        'operator' => '!=',
                        'value'    => 'false',
                    ),
                    array(
                        'control'  => 'vp_pagination',
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
                'name'        => 'vp_pagination_infinite_text_end_list',
                'default'     => esc_attr__( 'You’ve reached the end of the list', '@@text_domain' ),
                'placeholder' => esc_attr__( 'End of the list text', '@@text_domain' ),
                'hint'        => esc_attr__( 'End of the list text', '@@text_domain' ),
                'hint_place'  => 'left',
                'condition'   => array(
                    array(
                        'control'  => 'vp_pagination_style',
                        'operator' => '!=',
                        'value'    => 'false',
                    ),
                    array(
                        'control'  => 'vp_pagination',
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
                'name'        => 'vp_pagination_load_more_text_load',
                'default'     => esc_attr__( 'Load More', '@@text_domain' ),
                'placeholder' => esc_attr__( 'Load more button label', '@@text_domain' ),
                'hint'        => esc_attr__( 'Load more button label', '@@text_domain' ),
                'hint_place'  => 'left',
                'condition'   => array(
                    array(
                        'control'  => 'vp_pagination_style',
                        'operator' => '!=',
                        'value'    => 'false',
                    ),
                    array(
                        'control'  => 'vp_pagination',
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
                'name'        => 'vp_pagination_load_more_text_loading',
                'default'     => esc_attr__( 'Loading More...', '@@text_domain' ),
                'placeholder' => esc_attr__( 'Loading more button label', '@@text_domain' ),
                'hint'        => esc_attr__( 'Loading more button label', '@@text_domain' ),
                'hint_place'  => 'left',
                'condition'   => array(
                    array(
                        'control'  => 'vp_pagination_style',
                        'operator' => '!=',
                        'value'    => 'false',
                    ),
                    array(
                        'control'  => 'vp_pagination',
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
                'name'        => 'vp_pagination_load_more_text_end_list',
                'default'     => esc_attr__( 'You’ve reached the end of the list', '@@text_domain' ),
                'placeholder' => esc_attr__( 'End of the list text', '@@text_domain' ),
                'hint'        => esc_attr__( 'End of the list text', '@@text_domain' ),
                'hint_place'  => 'left',
                'condition'   => array(
                    array(
                        'control'  => 'vp_pagination_style',
                        'operator' => '!=',
                        'value'    => 'false',
                    ),
                    array(
                        'control'  => 'vp_pagination',
                        'operator' => '==',
                        'value'    => 'load-more',
                    ),
                ),
            )
        );
        Visual_Portfolio_Controls::register(
            array(
                'category'  => 'pagination',
                'type'      => 'toggle',
                'label'     => esc_html__( 'Display Arrows', '@@text_domain' ),
                'name'      => 'vp_pagination_paged__show_arrows',
                'default'   => true,
                'condition' => array(
                    array(
                        'control'  => 'vp_pagination_style',
                        'operator' => '!=',
                        'value'    => 'false',
                    ),
                    array(
                        'control' => 'vp_pagination',
                        'value'   => 'paged',
                    ),
                ),
            )
        );
        Visual_Portfolio_Controls::register(
            array(
                'category'    => 'pagination',
                'type'        => 'text',
                'name'        => 'vp_pagination_paged__arrows_icon_prev',
                'default'     => 'fas fa-angle-left',
                'placeholder' => esc_attr__( 'Prev Arrow Icon', '@@text_domain' ),
                'hint'        => esc_attr__( 'Prev Arrow Icon', '@@text_domain' ),
                'hint_place'  => 'left',
                'condition'   => array(
                    array(
                        'control'  => 'vp_pagination_style',
                        'operator' => '!=',
                        'value'    => 'false',
                    ),
                    array(
                        'control' => 'vp_pagination',
                        'value'   => 'paged',
                    ),
                    array(
                        'control' => 'vp_pagination_paged__show_arrows',
                    ),
                ),
            )
        );
        Visual_Portfolio_Controls::register(
            array(
                'category'    => 'pagination',
                'type'        => 'text',
                'name'        => 'vp_pagination_paged__arrows_icon_next',
                'default'     => 'fas fa-angle-right',
                'placeholder' => esc_attr__( 'Next Arrow Icon', '@@text_domain' ),
                'hint'        => esc_attr__( 'Next Arrow Icon', '@@text_domain' ),
                'hint_place'  => 'left',
                'condition'   => array(
                    array(
                        'control'  => 'vp_pagination_style',
                        'operator' => '!=',
                        'value'    => 'false',
                    ),
                    array(
                        'control' => 'vp_pagination',
                        'value'   => 'paged',
                    ),
                    array(
                        'control' => 'vp_pagination_paged__show_arrows',
                    ),
                ),
            )
        );
        Visual_Portfolio_Controls::register(
            array(
                'category'  => 'pagination',
                'type'      => 'toggle',
                'label'     => esc_html__( 'Display Numbers', '@@text_domain' ),
                'name'      => 'vp_pagination_paged__show_numbers',
                'default'   => true,
                'condition' => array(
                    array(
                        'control'  => 'vp_pagination_style',
                        'operator' => '!=',
                        'value'    => 'false',
                    ),
                    array(
                        'control' => 'vp_pagination',
                        'value'   => 'paged',
                    ),
                ),
            )
        );

        /**
         * Code Editor
         */
        Visual_Portfolio_Controls::register(
            array(
                'category' => 'custom_css',
                'type'     => 'code_editor',
                'name'     => 'vp_custom_css',
                'cols'     => '30',
                'rows'     => '10',
                'default'  => '',
            )
        );

        /**
         * Custom controls styles.
         */
        Visual_Portfolio_Controls::register(
            array(
                'category'      => 'controls_styles',
                'type'          => 'textarea',
                'name'          => 'vp_controls_styles',
                'default'       => '',
                'readonly'      => true,
                'wrapper_class' => 'vp-controls-styles',
            )
        );

        /**
         * Content Source
         */
        Visual_Portfolio_Controls::register(
            array(
                'category' => 'content-source',
                'type'     => 'hidden',
                'name'     => 'vp_content_source',
                'default'  => 'portfolio',
            )
        );

        /**
         * Content Source Posts
         */
        Visual_Portfolio_Controls::register(
            array(
                'category'       => 'content-source-posts',
                'type'           => 'select2',
                'label'          => esc_html__( 'Data Source', '@@text_domain' ),
                'name'           => 'vp_posts_source',
                'default'        => 'portfolio',
                'value_callback' => array( $this, 'get_select2_post_types' ),
                'searchable'     => true,
                'wrapper_class'  => 'vp-col-6',
            )
        );
        Visual_Portfolio_Controls::register(
            array(
                'category'       => 'content-source-posts',
                'type'           => 'select2',
                'label'          => esc_html__( 'Specific Posts', '@@text_domain' ),
                'name'           => 'vp_posts_ids',
                'default'        => array(),
                'value_callback' => array( $this, 'get_select2_selected_posts' ),
                'searchable'     => true,
                'multiple'       => true,
                'post_type'      => '[name=vp_posts_source]',
                'class'          => 'vp-select2-posts-ajax',
                'wrapper_class'  => 'vp-col-6',
                'condition'      => array(
                    array(
                        'control' => 'vp_posts_source',
                        'value'   => 'ids',
                    ),
                ),
            )
        );
        Visual_Portfolio_Controls::register(
            array(
                'category'       => 'content-source-posts',
                'type'           => 'select2',
                'label'          => esc_html__( 'Excluded Posts', '@@text_domain' ),
                'name'           => 'vp_posts_excluded_ids',
                'default'        => array(),
                'value_callback' => array( $this, 'get_select2_excluded_posts' ),
                'searchable'     => true,
                'multiple'       => true,
                'post_type'      => '[name=vp_posts_source]',
                'class'          => 'vp-select2-posts-ajax',
                'wrapper_class'  => 'vp-col-6',
                'condition'      => array(
                    array(
                        'control'  => 'vp_posts_source',
                        'operator' => '!=',
                        'value'    => 'ids',
                    ),
                ),
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
                'category'      => 'content-source-posts',
                'type'          => 'textarea',
                'label'         => esc_html__( 'Custom Query', '@@text_domain' ),
                // translators: %1$s - escaped url.
                'description'   => sprintf( wp_kses( __( 'Build custom query according to WordPress Codex. See example here <a href="%1$s">%1$s</a>.', '@@text_domain' ), $allowed_protocols ), esc_url( 'https://visualportfolio.co/documentation/portfolio-layouts/content-source/post-based/#custom-query' ) ),
                'name'          => 'vp_posts_custom_query',
                'default'       => '',
                'cols'          => 30,
                'rows'          => 3,
                'wrapper_class' => 'vp-col-12',
                'condition'     => array(
                    array(
                        'control' => 'vp_posts_source',
                        'value'   => 'custom_query',
                    ),
                ),
            )
        );
        Visual_Portfolio_Controls::register(
            array(
                'category'      => 'content-source-posts',
                'type'          => 'html',
                'name'          => 'vp_posts_custom_query_clearfix',
                'wrapper_class' => 'vp-col-clearfix',
            )
        );
        Visual_Portfolio_Controls::register(
            array(
                'category'       => 'content-source-posts',
                'type'           => 'select2',
                'label'          => esc_html__( 'Taxonomies', '@@text_domain' ),
                'name'           => 'vp_posts_taxonomies',
                'default'        => array(),
                'value_callback' => array( $this, 'get_select2_taxonomies' ),
                'searchable'     => true,
                'multiple'       => true,
                'post_type'      => '[name=vp_posts_source]',
                'class'          => 'vp-select2-taxonomies-ajax',
                'wrapper_class'  => 'vp-col-6',
                'condition'      => array(
                    array(
                        'control'  => 'vp_posts_source',
                        'operator' => '!=',
                        'value'    => 'ids',
                    ),
                    array(
                        'control'  => 'vp_posts_source',
                        'operator' => '!=',
                        'value'    => 'custom_query',
                    ),
                ),
            )
        );
        Visual_Portfolio_Controls::register(
            array(
                'category'      => 'content-source-posts',
                'type'          => 'select2',
                'label'         => esc_html__( 'Taxonomies Relation', '@@text_domain' ),
                'name'          => 'vp_posts_taxonomies_relation',
                'default'       => 'or',
                'options'       => array(
                    'or'  => esc_html__( 'OR', '@@text_domain' ),
                    'and' => esc_html__( 'AND', '@@text_domain' ),
                ),
                'wrapper_class' => 'vp-col-6',
                'condition'     => array(
                    array(
                        'control'  => 'vp_posts_source',
                        'operator' => '!=',
                        'value'    => 'ids',
                    ),
                    array(
                        'control'  => 'vp_posts_source',
                        'operator' => '!=',
                        'value'    => 'custom_query',
                    ),
                ),
            )
        );
        Visual_Portfolio_Controls::register(
            array(
                'category'      => 'content-source-posts',
                'type'          => 'select2',
                'label'         => esc_html__( 'Order by', '@@text_domain' ),
                'name'          => 'vp_posts_order_by',
                'default'       => 'post_date',
                'options'       => array(
                    'post_date'  => esc_html__( 'Date', '@@text_domain' ),
                    'title'      => esc_html__( 'Title', '@@text_domain' ),
                    'id'         => esc_html__( 'ID', '@@text_domain' ),
                    'menu_order' => esc_html__( 'Menu Order', '@@text_domain' ),
                    'rand'       => esc_html__( 'Random', '@@text_domain' ),
                ),
                'wrapper_class' => 'vp-col-6',
            )
        );
        Visual_Portfolio_Controls::register(
            array(
                'category'      => 'content-source-posts',
                'type'          => 'select2',
                'label'         => esc_html__( 'Order Direction', '@@text_domain' ),
                'name'          => 'vp_posts_order_direction',
                'default'       => 'desc',
                'options'       => array(
                    'desc' => esc_html__( 'DESC', '@@text_domain' ),
                    'asc'  => esc_html__( 'ASC', '@@text_domain' ),
                ),
                'wrapper_class' => 'vp-col-6',
            )
        );
        Visual_Portfolio_Controls::register(
            array(
                'category'      => 'content-source-posts',
                'type'          => 'toggle',
                'label'         => esc_html__( 'Avoid Duplicate Posts', '@@text_domain' ),
                'name'          => 'vp_posts_avoid_duplicate_posts',
                'default'       => false,
                'wrapper_class' => 'vp-col-6',
            )
        );

        /**
         * Content Source Images
         */
        Visual_Portfolio_Controls::register(
            array(
                'category'      => 'content-source-images',
                'type'          => 'gallery',
                'name'          => 'vp_images',
                'default'       => array(
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
                'wrapper_class' => 'vp-col-12',
            )
        );
        Visual_Portfolio_Controls::register(
            array(
                'category'      => 'content-source-images',
                'type'          => 'select2',
                'label'         => esc_html__( 'Titles', '@@text_domain' ),
                'name'          => 'vp_images_titles_source',
                'default'       => 'custom',
                'options'       => array(
                    'none'        => esc_html__( 'None', '@@text_domain' ),
                    'custom'      => esc_html__( 'Custom', '@@text_domain' ),
                    'title'       => esc_html__( 'Image Title', '@@text_domain' ),
                    'caption'     => esc_html__( 'Image Caption', '@@text_domain' ),
                    'alt'         => esc_html__( 'Image Alt', '@@text_domain' ),
                    'description' => esc_html__( 'Image Description', '@@text_domain' ),
                ),
                'wrapper_class' => 'vp-col-6',
            )
        );
        Visual_Portfolio_Controls::register(
            array(
                'category'      => 'content-source-images',
                'type'          => 'select2',
                'label'         => esc_html__( 'Descriptions', '@@text_domain' ),
                'name'          => 'vp_images_descriptions_source',
                'default'       => 'custom',
                'options'       => array(
                    'none'        => esc_html__( 'None', '@@text_domain' ),
                    'custom'      => esc_html__( 'Custom', '@@text_domain' ),
                    'title'       => esc_html__( 'Image Title', '@@text_domain' ),
                    'caption'     => esc_html__( 'Image Caption', '@@text_domain' ),
                    'alt'         => esc_html__( 'Image Alt', '@@text_domain' ),
                    'description' => esc_html__( 'Image Description', '@@text_domain' ),
                ),
                'wrapper_class' => 'vp-col-6',
            )
        );
        Visual_Portfolio_Controls::register(
            array(
                'category'      => 'content-source-images',
                'type'          => 'select2',
                'label'         => esc_html__( 'Order by', '@@text_domain' ),
                'name'          => 'vp_images_order_by',
                'default'       => 'default',
                'options'       => array(
                    'default' => esc_html__( 'Default', '@@text_domain' ),
                    'date'    => esc_html__( 'Uploaded', '@@text_domain' ),
                    'title'   => esc_html__( 'Title', '@@text_domain' ),
                    'rand'    => esc_html__( 'Random', '@@text_domain' ),
                ),
                'wrapper_class' => 'vp-col-6',
            )
        );
        Visual_Portfolio_Controls::register(
            array(
                'category'      => 'content-source-images',
                'type'          => 'select2',
                'label'         => esc_html__( 'Order Direction', '@@text_domain' ),
                'name'          => 'vp_images_order_direction',
                'default'       => 'asc',
                'options'       => array(
                    'asc'  => esc_html__( 'ASC', '@@text_domain' ),
                    'desc' => esc_html__( 'DESC', '@@text_domain' ),
                ),
                'wrapper_class' => 'vp-col-6',
            )
        );

        do_action( 'vpf_after_register_controls' );
    }

    /**
     * Add metaboxes
     */
    public function add_meta_boxes() {
        do_action( 'vpf_before_add_meta_boxes' );

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
            array( $this, 'add_layouts_metabox' ),
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
            'vp_sort',
            esc_html__( 'Sort', '@@text_domain' ),
            array( $this, 'add_sort_metabox' ),
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

        do_action( 'vpf_after_add_meta_boxes' );
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
                'type'        => 'text',
                'label'       => esc_html__( 'Shortcode', '@@text_domain' ),
                'description' => esc_html__( 'Place the shortcode where you want to show the portfolio list.', '@@text_domain' ),
                'name'        => 'vp_list_shortcode',
                'value'       => $post->ID ? '[visual_portfolio id="' . $post->ID . '" class=""]' : '',
                'readonly'    => true,
            )
        );

        // custom controls styles.
        Visual_Portfolio_Controls::get_registered( 'controls_styles' );

        ?>

        <style>
            #submitdiv {
                margin-top: -21px;
                border-top: none;
            }
            .vp-controls-styles,
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
     * Add Layouts metabox
     */
    public function add_layouts_metabox() {
        Visual_Portfolio_Controls::get_registered( 'layouts' );
    }

    /**
     * Add Items Style metabox
     */
    public function add_items_style_metabox() {
        Visual_Portfolio_Controls::get_registered( 'items-style' );
    }

    /**
     * Add Items Click Action metabox
     */
    public function add_items_click_action_metabox() {
        Visual_Portfolio_Controls::get_registered( 'items-click-action' );
    }

    /**
     * Add Filter metabox
     *
     * @param object $post The post object.
     */
    public function add_filter_metabox( $post ) {
        Visual_Portfolio_Controls::get_registered( 'filter' );

        $type       = Visual_Portfolio_Controls::get_registered_value( 'vp_filter' ) ? Visual_Portfolio_Controls::get_registered_value( 'vp_filter' ) : 'default';
        $align      = Visual_Portfolio_Controls::get_registered_value( 'vp_filter_align' );
        $show_count = Visual_Portfolio_Controls::get_registered_value( 'vp_filter_show_count' );

        Visual_Portfolio_Controls::get(
            array(
                'type'        => 'text',
                'label'       => esc_html__( 'Filter Shortcode', '@@text_domain' ),
                'description' => esc_html__( 'Place the shortcode where you want to show the filter.', '@@text_domain' ),
                'name'        => 'vp_filter_shortcode',
                'value'       => $post->ID ? '[visual_portfolio_filter id="' . $post->ID . '" type="' . esc_attr( $type ) . '" align="' . esc_attr( $align ) . '" show_count="' . esc_attr( $show_count ? 'true' : 'false' ) . '" class=""]' : '',
                'readonly'    => true,
            )
        );
    }

    /**
     * Add Sort metabox
     *
     * @param object $post The post object.
     */
    public function add_sort_metabox( $post ) {
        Visual_Portfolio_Controls::get_registered( 'sort' );

        $type  = Visual_Portfolio_Controls::get_registered_value( 'vp_sort' ) ? Visual_Portfolio_Controls::get_registered_value( 'vp_sort' ) : 'default';
        $align = Visual_Portfolio_Controls::get_registered_value( 'vp_sort_align' );

        Visual_Portfolio_Controls::get(
            array(
                'type'        => 'text',
                'label'       => esc_html__( 'Sort Shortcode', '@@text_domain' ),
                'description' => esc_html__( 'Place the shortcode where you want to show the sort.', '@@text_domain' ),
                'name'        => 'vp_sort_shortcode',
                'value'       => $post->ID ? '[visual_portfolio_sort id="' . $post->ID . '" type="' . esc_attr( $type ) . '" align="' . esc_attr( $align ) . '" class=""]' : '',
                'readonly'    => true,
            )
        );
    }

    /**
     * Add Pagination metabox
     *
     * @param object $post The post object.
     */
    public function add_pagination_metabox( $post ) {
        Visual_Portfolio_Controls::get_registered( 'pagination' );
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
                ),
                $url
            );
        } else {
            $url .= '/vp_preview';
        }

        $url = add_query_arg(
            array(
                'vp_preview_frame'    => 'true',
                'vp_preview_type'     => 'layouts-editor',
                'vp_preview_frame_id' => $post->ID,
            ),
            $url
        );

        ?>
        <div class="vp_list_preview">
            <iframe name="vp_list_preview_iframe" src="<?php echo esc_url( $url ); ?>" frameborder="0" noresize="noresize" scrolling="no"></iframe>
            <div class="vp_list_preview_preloader vp_list_preview_preloader_active"></div>
        </div>
        <?php
    }

    /**
     * Add Content Source metabox
     *
     * @param object $post The post object.
     */
    public function add_content_source_metabox( $post ) {
        ?>
        <div class="vp-content-source">
            <?php
            Visual_Portfolio_Controls::get_registered( 'content-source' );
            ?>

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
            <div class="vp-content-source__item" data-content="social-stream">
                <div class="vp-content-source__item-icon">
                    <span class="dashicons dashicons-share"></span>
                </div>
                <div class="vp-content-source__item-title"><?php echo esc_html__( 'Social', '@@text_domain' ); ?></div>
            </div>

            <div class="vp-content-source__item-content">
                <div data-content="portfolio">
                    <!-- Portfolio -->

                    <p>
                        <?php
                        $url               = get_admin_url( null, 'edit.php?post_type=portfolio' );
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
                        <?php
                        Visual_Portfolio_Controls::get_registered( 'content-source-posts' );
                        ?>
                    </div>
                </div>
                <div data-content="images">
                    <!-- Images -->

                    <p></p>
                    <div class="vp-row">
                        <?php
                        Visual_Portfolio_Controls::get_registered( 'content-source-images' );
                        ?>
                    </div>
                </div>
                <div data-content="social-stream">
                    <!-- Social -->

                    <p></p>
                    <div class="vp-row">
                        <?php
                        do_action( 'vpf_get_source_social_stream_registered_controls' );
                        ?>
                    </div>
                </div>
            </div>
        </div>
        <?php
    }

    /**
     * Information About Social Stream Functionality.
     */
    public static function social_stream_information() {
        $url               = 'https://visualportfolio.co/pricing';
        $allowed_protocols = array(
            'a' => array(
                'href'   => array(),
                'target' => array(),
            ),
        );
        // translators: %1$s - escaped url.
        // translators: %2$s - non-escaped url.
        $social_stream_information = sprintf( __( 'Social Stream are only available in the pro version of the plugin: <a href="%1$s" target="_blank">%2$s</a>', '@@text_domain' ), esc_url( $url ), esc_html( $url ) );
        echo '<p class="vp-col-12">' . wp_kses( $social_stream_information, $allowed_protocols ) . '</p>';
    }

    /**
     * Add Custom CSS metabox
     *
     * @param object $post The post object.
     */
    public function add_custom_css_metabox( $post ) {
        Visual_Portfolio_Controls::get_registered( 'custom_css' );
        ?>
        <p class="description">
            <?php echo esc_html__( 'Available classes:', '@@text_domain' ); ?>
        </p>
        <ul class="vp-dom-tree-help">
            <li><code>.vp-id-<?php echo esc_html( $post->ID ); ?></code><?php echo esc_html__( ' - use this classname for each styles you added. It is the main Visual Portfolio wrapper.', '@@text_domain' ); ?></li>
        </ul>
        <div class="vp-dom-tree">
            <span class="spinner is-active"></span>
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
                if ( 'vp_custom_css' === $item || 'vp_controls_styles' === $item || 'vp_images' === $item ) {
                    // phpcs:ignore
                    $result = wp_kses( $_POST[ $item ], array( '\'', '\"' ) );
                } else {
                    // phpcs:ignore
                    if ( is_array( $_POST[ $item ] ) ) {
                        $result = array_map( 'sanitize_text_field', wp_unslash( $_POST[ $item ] ) );
                    } else {
                        $result = sanitize_text_field( wp_unslash( $_POST[ $item ] ) );
                    }
                }

                update_post_meta( $post_id, $item, $result );
            } else {
                update_post_meta( $post_id, $item, false );
            }
        }
    }

    /**
     * Get post types for select2.
     *
     * @return array
     */
    public function get_select2_post_types() {
        // post types list.
        $post_types = get_post_types(
            array(
                'public' => false,
                'name'   => 'attachment',
            ),
            'names',
            'NOT'
        );

        $post_types_list = array();
        if ( is_array( $post_types ) && ! empty( $post_types ) ) {
            foreach ( $post_types as $post_type ) {
                $post_types_list[ $post_type ] = ucfirst( $post_type );
            }
        }
        $post_types_list['ids']          = esc_html__( 'Specific Posts', '@@text_domain' );
        $post_types_list['custom_query'] = esc_html__( 'Custom Query', '@@text_domain' );

        return array(
            'options' => $post_types_list,
        );
    }

    /**
     * Get selected posts for select2.
     *
     * @return array
     */
    public function get_select2_selected_posts() {
        global $post;

        // get meta data.
        $selected_ids = get_post_meta( $post->ID, 'vp_posts_ids', true );

        $selected_array = array();
        if ( isset( $selected_ids ) && is_array( $selected_ids ) && count( $selected_ids ) ) {
            // fill selected array.
            foreach ( $selected_ids as $id ) {
                $selected_array[ $id ] = $id;
            }

            $posts = get_posts(
                array(
                    'post_type'      => 'any',
                    'post__in'       => $selected_ids,
                    'posts_per_page' => -1,
                    'showposts'      => -1,
                    'paged'          => -1,
                )
            );

            foreach ( $posts as $p ) {
                $selected_array[ $p->ID ] = $p->post_title;
            }
        }

        return array(
            'value'   => array_keys( $selected_array ),
            'options' => $selected_array,
        );
    }

    /**
     * Get excluded posts for select2.
     *
     * @return array
     */
    public function get_select2_excluded_posts() {
        global $post;

        // get meta data.
        $excluded_ids = get_post_meta( $post->ID, 'vp_posts_excluded_ids', true );

        $excluded_array = array();
        if ( isset( $excluded_ids ) && is_array( $excluded_ids ) && count( $excluded_ids ) ) {
            // fill excluded array.
            foreach ( $excluded_ids as $id ) {
                $excluded_array[ $id ] = $id;
            }

            $posts = get_posts(
                array(
                    'post_type' => 'any',
                    'post__in'  => $excluded_ids,
                )
            );

            foreach ( $posts as $p ) {
                $excluded_array[ $p->ID ] = $p->post_title;
            }
        }

        return array(
            'value'   => array_keys( $excluded_array ),
            'options' => $excluded_array,
        );
    }

    /**
     * Get taxonomies for select2.
     *
     * @return array
     */
    public function get_select2_taxonomies() {
        global $post;

        // get meta data.
        $selected_tax     = get_post_meta( $post->ID, 'vp_posts_taxonomies', true );
        $selected_tax_arr = array();

        if ( isset( $selected_tax ) && is_array( $selected_tax ) && count( $selected_tax ) ) {
            // fill selected array.
            foreach ( $selected_tax as $id ) {
                $selected_tax_arr[ $id ] = $id;
            }

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

        return array(
            'value'   => array_keys( $selected_tax_arr ),
            'options' => $selected_tax_arr,
        );
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
                's'              => sanitize_text_field( wp_unslash( $_GET['q'] ) ),
                'posts_per_page' => 50,
                'post_type'      => $post_type,
            )
        );
        if ( $the_query->have_posts() ) {
            while ( $the_query->have_posts() ) {
                $the_query->the_post();
                $result[] = array(
                    'id'        => get_the_ID(),
                    'img'       => get_the_post_thumbnail_url( null, 'thumbnail' ),
                    'title'     => get_the_title(),
                    'post_type' => get_post_type( get_the_ID() ),
                );
            }
            $the_query->reset_postdata();
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
                    'name'   => 'attachment',
                ),
                'names',
                'NOT'
            );
        }
        $taxonomies_names = get_object_taxonomies( $post_type );

        // if no taxonomies names found.
        if ( isset( $_GET['post_type'] ) && ! count( $taxonomies_names ) ) {
            wp_die();
        }

        $terms = new WP_Term_Query(
            array(
                'taxonomy'   => $taxonomies_names,
                'hide_empty' => false,
                'search'     => isset( $_GET['q'] ) ? sanitize_text_field( wp_unslash( $_GET['q'] ) ) : '',
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
