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
     * Visual_Portfolio_Extend constructor.
     */
    public function __construct() {
        $this->migrate_popup_caption_settings();
    }

    /**
     * Move popup title and description settings to single Layouts.
     */
    public function migrate_popup_caption_settings() {
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
