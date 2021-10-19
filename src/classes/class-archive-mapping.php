<?php
/**
 * Archive Mapping.
 *
 * @package @@plugin_name
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

use Visual_Portfolio_Settings as Settings;

/**
 * Class Visual_Portfolio_Archive_Mapping
 */
class Visual_Portfolio_Archive_Mapping {
    /**
     * Archive Page.
     *
     * @var int $archive_page
     */
    private $archive_page = null;

    /**
     * Visual_Portfolio_Archive_Mapping constructor.
     */
    public function __construct() {
        add_action( 'init', array( $this, 'init' ), 9 );
        add_action( 'save_post', array( $this, 'save_page' ), 10, 3 );
        add_action( 'pre_post_update', array( $this, 'pre_page_update' ), 10, 2 );
        add_action( 'deleted_post', array( $this, 'delete_archive_page' ), 10, 1 );
        add_action( 'trashed_post', array( $this, 'delete_archive_page' ), 10, 1 );
        add_action( 'update_option_vp_general', array( $this, 'flush_rules_after_update' ), 10, 3 );
        add_action( 'admin_init', array( $this, 'flush_rules_if_set_transient' ) );
        add_action( 'vpf_extend_query_args', array( $this, 'extend_query_args' ), 10, 2 );
        add_filter( 'vpf_layout_element_options', array( $this, 'unset_pagination_archive_page' ), 10, 1 );
        add_filter( 'manage_pages_columns', array( $this, 'add_archive_mapped_column' ), 5 );
        add_action( 'manage_pages_custom_column', array( $this, 'add_archive_mapped_label' ), 5, 2 );
    }

    /**
     * Initialize archive.
     *
     * @see __construct
     */
    public function init() {
        $this->archive_page = Settings::get_option( 'portfolio_archive_page', 'vp_general' );

        if ( isset( $this->archive_page ) && ! empty( $this->archive_page ) ) {

            $this->init_rewrite_rules();

            add_action( 'pre_get_posts', array( $this, 'maybe_override_archive' ) );
        }

        $this->create_archive_page();
    }

    /**
     * Initialize archive rewrite rules.
     *
     * @return void
     */
    public function init_rewrite_rules() {
        $slug = get_post_field( 'post_name', $this->archive_page );
        add_rewrite_tag( '%vp_page%', '([^&]+)' );
        add_rewrite_tag( '%vp_page_archive%', '([^&]+)' );
        add_rewrite_rule(
            '^' . $slug . '/page/?([0-9]{1,})/?',
            'index.php?post_type=portfolio&vp_page_archive=1&vp_page=$matches[1]',
            'top'
        );
    }

    /**
     * Override an archive page based on passed query arguments.
     *
     * @param WP_Query $query The query to check.
     */
    public function maybe_override_archive( $query ) {
        if ( is_admin() ) {
            return $query;
        }

        $post_type = 'portfolio';

        // Maybe Redirect.
        if ( is_page() ) {
            $object_id = get_queried_object_id();
            $post_meta = get_post_meta( $object_id, '_vp_post_type_mapped', true );
            if ( ! $post_meta && get_query_var( 'paged' ) ) {
                return;
            }
        }

        if ( is_post_type_archive( $post_type ) && '' !== $this->archive_page && $query->is_main_query() ) {
            $post_id = absint( $this->archive_page );
            $query->set( 'post_type', 'page' );
            $query->set( 'page_id', $post_id );
            $query->set( 'original_archive_type', 'page' );
            $query->set( 'original_archive_id', $post_type );
            $query->set( 'term_tax', '' );
            $query->is_archive           = false;
            $query->is_single            = true;
            $query->is_singular          = true;
            $query->is_page              = true;
            $query->is_post_type_archive = false;
        }
    }

    /**
     * Substituting query parameters before block output.
     *
     * @param array $args - Query arguments.
     * @param array $options - Block options.
     * @return array
     */
    public function extend_query_args( $args, $options ) {
        // phpcs:ignore
        $post_id = $_REQUEST['vp_preview_post_id'] ?? $args['page_id'] ?? null;

        if ( 'current_query' === $options['posts_source'] && isset( $post_id ) && $post_id ) {
            $post_meta = get_post_meta( (int) $post_id, '_vp_post_type_mapped', true );
            if ( ! empty( $post_meta ) && $post_meta ) {
                $args['post_type'] = $post_meta;
                if ( isset( $args['vp_page_archive'] ) && $args['vp_page_archive'] ) {
                    $args['paged'] = $args['vp_page'];
                }
                if ( isset( $args['page_id'] ) ) {
                    unset( $args['page_id'] );
                }
                unset( $args['p'] );
            }
        }
        return $args;
    }

    /**
     * If not set default paged style - Delete pagination on archive pagination pages: /pages/<page_number>.
     *
     * @param array $options - Block Options.
     * @return array
     */
    public function unset_pagination_archive_page( $options ) {
        global $wp_query;
        if ( $wp_query && isset( $wp_query->query_vars ) && is_array( $wp_query->query_vars ) ) {
            // phpcs:ignore
            $is_page_archive = $wp_query->query_vars['vp_page_archive'] ?? false;
            if ( $is_page_archive ) {
                foreach ( $options['layout_elements'] as $position => $container ) {
                    if ( ! empty( $container['elements'] ) ) {
                        $key = array_search( 'pagination', $container['elements'], true );
                        if ( false !== $key && isset( $options['pagination'] ) ) {
                            if ( 'paged' === $options['pagination'] ) {
                                $options['start_page'] = $wp_query->query_vars['vp_page'];
                            } else {
                                unset( $options['layout_elements'][ $position ]['elements'][ $key ] );
                            }
                        }
                    }
                }
            }
        }
        return $options;
    }

    /**
     * Update Post meta mapped after save general archive page option.
     *
     * @param int $post_id - Post ID.
     * @return int
     */
    public static function save_archive_page_option( $post_id ) {

        if ( is_numeric( $post_id ) ) {

            self::delete_post_type_mapped_meta();

            update_post_meta( (int) $post_id, '_vp_post_type_mapped', 'portfolio' );

            set_transient( 'vp_flush_rules', true );

        }

        return $post_id;
    }

    /**
     * Delete pages list transient if page title updated.
     * Rewrite flush rules if archive slug changed.
     *
     * @param int   $post_ID - Post ID.
     * @param array $data - Save Post data.
     * @return void
     */
    public function pre_page_update( $post_ID, $data ) {
        if ( 'page' === $data['post_type'] && get_the_title( $post_ID ) !== $data['post_title'] ) {
            delete_transient( 'vp_pages_list' );
        }

        if (
            'page' === $data['post_type'] &&
            (int) $this->archive_page === (int) $post_ID &&
            get_post_field( 'post_name', $post_ID ) !== $data['post_name']
        ) {
            set_transient( 'vp_flush_rules', true );

            $this->flush_rules();
        }
    }

    /**
     * Delete pages list transient if page created.
     *
     * @param int     $post_ID - Post ID.
     * @param array   $post - Post Data.
     * @param boolean $update - Updated Flag.
     * @return void
     */
    public function save_page( $post_ID, $post, $update ) {
        if ( 'page' === $post->post_type && ! $update ) {
            delete_transient( 'vp_pages_list' );
        }
    }

    /**
     * Get Pages List.
     *
     * @return array
     */
    public static function get_pages_list() {
        $saved_pages_list = get_transient( 'vp_pages_list' );

        if ( ! $saved_pages_list ) {
            $pages_list = array(
                '' => esc_html__( 'Select Page', '@@text_domain' ),
            );
            $pages      = get_pages();
            foreach ( $pages as $page ) {
                $pages_list[ $page->ID ] = $page->post_title;
            }
            $saved_pages_list = $pages_list;
            set_transient( 'vp_pages_list', $saved_pages_list, 0 );
        }
        return $saved_pages_list;
    }

    /**
     * Delete pages list transient if page status set as trashed.
     * Also delete archive page and set old slug for default archive permalinks.
     *
     * @param int $post_ID - Post ID.
     * @return void
     */
    public function delete_archive_page( $post_ID ) {
        if ( 'page' === get_post_type( $post_ID ) ) {
            delete_transient( 'vp_pages_list' );
        }

        if ( ! empty( $this->archive_page ) && (int) $post_ID === (int) $this->archive_page ) {
            Settings::update_option( 'portfolio_archive_page', 'vp_general', '' );

            self::delete_post_type_mapped_meta();

            update_option( '_vp_saved_delete_archive_slug', str_replace( '__trashed', '', get_post_field( 'post_name', $this->archive_page ) ) );
        }
    }

    /**
     * Rewrite Flush Rules after update portfolio page option.
     *
     * @param  array  $old_value - Old value before update.
     * @param  array  $value - New value after update.
     * @param  string $option - Name of option.
     * @return void
     */
    public function flush_rules_after_update( $old_value, $value, $option ) {
        if (
            isset( $old_value['portfolio_archive_page'] ) &&
            isset( $value['portfolio_archive_page'] ) &&
            'vp_general' === $option
        ) {
            if (
                ! empty( $value['portfolio_archive_page'] ) &&
                $old_value['portfolio_archive_page'] === $value['portfolio_archive_page']
            ) {
                $this->flush_rules();
            }

            if (
                empty( $value['portfolio_archive_page'] ) &&
                $old_value['portfolio_archive_page'] !== $value['portfolio_archive_page'] &&
                is_numeric( $old_value['portfolio_archive_page'] )
            ) {
                self::delete_post_type_mapped_meta();

                delete_option( '_vp_saved_delete_archive_slug' );

                set_transient( 'vp_flush_rules', true );

                $this->flush_rules();
            }
        }
    }

    /**
     * Rewrite Flush Rules if set Transient.
     *
     * @return void
     */
    public function flush_rules_if_set_transient() {
        if ( delete_transient( 'vp_flush_rules' ) ) {
            $this->flush_rules();
        }
    }

    /**
     * Rewrite Flush Rules.
     *
     * @return void
     */
    public function flush_rules() {
        flush_rewrite_rules();
    }

    /**
     * Remove mapped post meta from all pages.
     *
     * @return void
     */
    private static function delete_post_type_mapped_meta() {
        global $wpdb;
        $query = "delete from {$wpdb->postmeta} where meta_key = '_vp_post_type_mapped'";
        $wpdb->query( $query ); // phpcs:ignore
    }

    /**
     * Create default archive page.
     *
     * @return void
     */
    private function create_archive_page() {
        if ( ! get_option( '_vp_add_archive_page' ) ) {
            // phpcs:ignore
            $custom_slug = Settings::get_option( 'portfolio_slug', 'vp_general' ) ?? 'portfolio';

            if ( empty( $custom_slug ) ) {
                $custom_slug = 'portfolio';
            }

            $args = array(
                'post_title'    => esc_html__( 'Portfolio Archive', '@@text_domain' ),
                'post_status'   => 'publish',
                'post_type'     => 'page',
                'post_name'     => $custom_slug,
            );

            // Insert the post into the database.
            $post_id = wp_insert_post( $args );

            if ( ! is_wp_error( $post_id ) ) {

                Settings::update_option( 'portfolio_archive_page', 'vp_general', $post_id );

                set_transient( 'vp_flush_rules', true );

                add_option( '_vp_add_archive_page', true );

                self::save_archive_page_option( $post_id );

                $post = get_post( $post_id );

                $slug = $post->post_name;

                wp_update_post(
                    wp_slash(
                        array(
                            'ID'           => $post_id,
                            'post_content' => '<!-- wp:visual-portfolio/block {"block_id":"' . hash( 'crc32b', $slug . $post_id ) . '","content_source":"post-based","posts_source":"current_query","layout_elements":{"top":{"elements":[],"align":"center"},"items":{"elements":["items"]},"bottom":{"elements":["pagination"],"align":"center"}},"pagination_style":"default","pagination":"paged"} /-->',
                        )
                    )
                );
            }
        }
    }

    /**
     * Add columns to the pages screen in the admin
     *
     * @param array $columns Array of key => value columns.
     *
     * @return array Updated list of columns.
     */
    public function add_archive_mapped_column( $columns ) {
        $columns['vp_archive_mapped'] = esc_html__( 'Archive Mapping', '@@text_domain' );
        return $columns;
    }

    /**
     * Populate the column values for the mapped posts.
     *
     * @param string $column_name The column name.
     * @param int    $page_id     The Page ID.
     */
    public function add_archive_mapped_label( $column_name, $page_id ) {
        if ( 'vp_archive_mapped' === $column_name ) {
            // If successful, returns the post type slug.
            $post_type = get_post_meta( $page_id, '_vp_post_type_mapped', true );
            if ( $post_type && ! empty( $post_type ) ) {
                $archive_link = get_post_type_archive_link( $post_type );
                if ( $archive_link ) {
                    echo sprintf(
                        '<a href="%s">%s</a>',
                        esc_url( $archive_link ),
                        esc_html__( 'View Post Type Archive', '@@text_domain' )
                    );
                }
                return;
            }
        }
    }
}
new Visual_Portfolio_Archive_Mapping();
