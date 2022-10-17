<?php
/**
 * Gutenberg Sort block.
 *
 * @package @@plugin_name/blocks/sort
 */

// phpcs:disable
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Class Visual_Portfolio_Sort_Block
 */
class Visual_Portfolio_Sort_Block extends Visual_Portfolio_Block {
    /**
     * Get Sort Attributes.
     *
     * @param array $data - Data with Block Gallery Attributes and Post ID.
     * @param string $route_url - Route URL.
     * @return array
     */
    public static function get_sort_attributes( $data, $route_url = '' ) {
        if ( empty( $route_url ) ) {
            // phpcs:ignore;
            $route_url = $_SERVER['REQUEST_URI'];
        }
        $sort_items = Visual_Portfolio_Get::get_sort_items( $data['data'] );

        if ( ! empty( $sort_items ) ) {
            foreach ( $sort_items as $key => $sort_item ) {
                if ( isset( $sort_item['url'] ) && ! empty( $sort_item['url'] ) ) {
                    $sort_items[ $key ]['url']  = self::replace_route_url_to_post_permalink( $data['post_id'], $sort_item['url'], $route_url );
                }
            }
        }

        return $sort_items;
    }
}
