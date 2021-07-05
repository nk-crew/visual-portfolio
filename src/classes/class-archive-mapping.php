<?php
/**
 * Archive Mapping.
 *
 * @package @@plugin_name
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Class Visual_Portfolio_Archive_Mapping
 */
class Visual_Portfolio_Archive_Mapping {
    /**
     * Visual_Portfolio_Archive_Mapping constructor.
     */
    public function __construct() {
        add_action( 'save_post', array( $this, 'save_page' ), 10, 3 );
        add_action( 'pre_post_update', array( $this, 'pre_page_update' ), 10, 2 );
        add_action( 'deleted_post', array( $this, 'delete_page' ), 10, 2 );
        add_action( 'trashed_post', array( $this, 'trashed_page' ), 10, 1 );
    }

    /**
     * Delete pages list transient if page title updated.
     *
     * @param int $post_ID - Post ID.
     * @param array $data - Save Post data.
     * @return void
     */
    public function pre_page_update( $post_ID, $data ) {
        if ( 'page' === $data['post_type'] && get_the_title( $post_ID ) !== $data['post_title'] ) {
            delete_transient( 'vp_pages_list' );
        }
    }

    /**
     * Delete pages list transient if page created.
     *
     * @param int $post_ID - Post ID.
     * @param array $post - Post Data.
     * @param boolean $update - Updated Flag.
     * @return void
     */
    public function save_page( $post_ID, $post, $update ) {
        if ( 'page' === $post->post_type && ! $update ) {
            delete_transient( 'vp_pages_list' );
        }
    }

    /**
     * Delete pages list transient if page deleted.
     *
     * @param int $post_ID - Post ID.
     * @param array $post - Post Data.
     * @return void
     */
    public function delete_page( $post_ID, $post ) {
        if ( 'page' === $post->post_type ) {
            delete_transient( 'vp_pages_list' );
        }
    }

    /**
     * Delete pages list transient if page status set as trashed.
     *
     * @param int $post_ID - Post ID.
     * @return void
     */
    public function trashed_page( $post_ID ) {
        if ( 'page' === get_post_type( $post_ID ) ) {
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
            $pages_list = array();
            $pages      = get_pages();
            foreach ( $pages as $page ) {
                $pages_list[ $page->ID ] = $page->post_title;
            }
            $saved_pages_list = $pages_list;
            set_transient( 'vp_pages_list', $saved_pages_list, 0 );
        }
        return $saved_pages_list;
    }
}
new Visual_Portfolio_Archive_Mapping();
