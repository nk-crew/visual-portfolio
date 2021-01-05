<?php
/**
 * Migrations
 *
 * @package @@plugin_name
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Class Visual_Portfolio_Migrations
 */
class Visual_Portfolio_Migrations {
    /**
     * The version.
     *
     * @var string
     */
    protected $version = '@@plugin_version';

    /**
     * Initial version.
     *
     * @var string
     */
    protected $initial_version = '1.16.2';

    /**
     * Visual_Portfolio_Migrations constructor.
     */
    public function __construct() {
        if ( is_admin() ) {
            add_action( 'admin_init', array( $this, 'init' ), 3 );
        } else {
            add_action( 'wp', array( $this, 'init' ), 3 );
        }
    }

    /**
     * Init.
     */
    public function init() {
        // Migration code added after `$this->initial_version` plugin version.
        $saved_version   = get_option( 'vpf_db_version', $this->initial_version );
        $current_version = $this->version;

        foreach ( $this->get_migrations() as $migration ) {
            if ( version_compare( $saved_version, $migration['version'], '<' ) ) {
                call_user_func( $migration['cb'] );
            }
        }

        if ( version_compare( $saved_version, $current_version, '<' ) ) {
            update_option( 'vpf_db_version', $current_version );
        }
    }

    /**
     * Get all available migrations.
     *
     * @return array
     */
    public function get_migrations() {
        return array(
            array(
                'version' => '2.10.0',
                'cb'      => array( $this, 'v_2_10_0' ),
            ),
            array(
                'version' => '2.0.0',
                'cb'      => array( $this, 'v_2_0_0' ),
            ),
            array(
                'version' => '1.11.0',
                'cb'      => array( $this, 'v_1_11_0' ),
            ),
        );
    }

    /**
     * Move popup title and description settings to single Layouts.
     */
    public function v_2_10_0() {
        $options = get_option( 'vp_images' );

        if ( ! isset( $options['lazy_loading'] ) ) {
            return;
        }

        if ( 'off' === $options['lazy_loading'] || ! $options['lazy_loading'] ) {
            $options['lazy_loading'] = '';
        } else {
            $options['lazy_loading'] = 'vp';
        }

        update_option( 'vp_images', $options );
    }

    /**
     * 1. Change Portfolio content source to Post with custom post type Portfolio
     * 2. Change filters, sort and pagination to layout-elements.
     */
    public function v_2_0_0() {
        // Get all available Layouts.
        // Don't use WP_Query on the admin side https://core.trac.wordpress.org/ticket/18408.
        $layouts_query = get_posts(
            array(
                'post_type'      => 'vp_lists',
                'posts_per_page' => -1,
                'showposts'      => -1,
                'paged'          => -1,
            )
        );

        if ( $layouts_query ) {
            foreach ( $layouts_query as $post ) {
                // Change Portfolio content source to Post with custom post type Portfolio.
                if ( 'portfolio' === get_post_meta( $post->ID, 'vp_content_source', true ) ) {
                    update_post_meta( $post->ID, 'vp_content_source', 'post-based' );
                    update_post_meta( $post->ID, 'vp_posts_source', 'portfolio' );
                }

                // Change filters, sort and pagination to layout-elements.
                if ( ! get_post_meta( $post->ID, 'vp_layout_elements', true ) ) {
                    $top        = array();
                    $bottom     = array();
                    $filter     = get_post_meta( $post->ID, 'vp_filter', true );
                    $sort       = get_post_meta( $post->ID, 'vp_sort', true );
                    $pagination = get_post_meta( $post->ID, 'vp_pagination_style', true );

                    // Filter.
                    if ( $filter && 'false' !== $filter && false !== $filter ) {
                        $top[] = 'filter';
                    } else {
                        update_post_meta( $post->ID, 'vp_filter', 'minimal' );
                    }

                    // Sort.
                    if ( $sort && 'false' !== $sort && false !== $sort ) {
                        $top[] = 'sort';
                    } else {
                        update_post_meta( $post->ID, 'vp_sort', 'dropdown' );
                    }

                    // Pagination.
                    if ( $pagination && 'false' !== $pagination && false !== $pagination ) {
                        $bottom[] = 'pagination';
                    } else {
                        update_post_meta( $post->ID, 'vp_pagination_style', 'minimal' );
                    }

                    // Layout Elements.
                    if ( ! empty( $top ) || ! empty( $bottom ) ) {
                        update_post_meta(
                            $post->ID,
                            'vp_layout_elements',
                            array(
                                'top'    => array(
                                    'elements' => $top,
                                    'align'    => 'center',
                                ),
                                'items'  => array(
                                    'elements' => array( 'items' ),
                                ),
                                'bottom' => array(
                                    'elements' => $bottom,
                                    'align'    => 'center',
                                ),
                            )
                        );
                    }
                }
            }
            wp_reset_postdata();
        }
    }

    /**
     * Move popup title and description settings to single Layouts.
     */
    public function v_1_11_0() {
        $options = get_option( 'vp_popup_gallery' );

        if ( ! isset( $options['show_caption'] ) && ! isset( $options['caption_title'] ) && ! isset( $options['caption_description'] ) ) {
            return;
        }

        $new_show_caption       = isset( $options['show_caption'] ) ? 'on' === $options['show_caption'] : true;
        $new_title_source       = $new_show_caption && isset( $options['caption_title'] ) ? $options['caption_title'] : 'none';
        $new_description_source = $new_show_caption && isset( $options['caption_description'] ) ? $options['caption_description'] : 'none';

        // Get all available Layouts.
        // Don't use WP_Query on the admin side https://core.trac.wordpress.org/ticket/18408.
        $layouts_query = get_posts(
            array(
                'post_type'      => 'vp_lists',
                'posts_per_page' => -1,
                'showposts'      => -1,
                'paged'          => -1,
            )
        );
        if ( $layouts_query ) {
            foreach ( $layouts_query as $post ) {
                update_post_meta( $post->ID, 'vp_items_click_action_popup_title_source', $new_title_source );
                update_post_meta( $post->ID, 'vp_items_click_action_popup_description_source', $new_description_source );
            }
            wp_reset_postdata();
        }

        // remove saved old options.
        if ( isset( $options['show_caption'] ) ) {
            unset( $options['show_caption'] );
        }
        if ( isset( $options['caption_title'] ) ) {
            unset( $options['caption_title'] );
        }
        if ( isset( $options['caption_description'] ) ) {
            unset( $options['caption_description'] );
        }

        update_option( 'vp_popup_gallery', $options );
    }
}

new Visual_Portfolio_Migrations();
