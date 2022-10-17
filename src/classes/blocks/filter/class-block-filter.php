<?php
/**
 * Gutenberg filter block.
 *
 * @package @@plugin_name/blocks/filter
 */

// phpcs:disable
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Class Visual_Portfolio_Filter_Block
 */
class Visual_Portfolio_Filter_Block extends Visual_Portfolio_Block {
    /**
     * Get Filter Attributes.
     *
     * @param array $data - Data with Block Gallery Attributes and Post ID.
     * @param string $route_url - Route URL.
     * @return array
     */
    public static function get_filter_attributes( $data, $route_url = '' ) {
        if ( empty( $route_url ) ) {
            // phpcs:ignore;
            $route_url = $_SERVER['REQUEST_URI'];
        }

        $filter_items = Visual_Portfolio_Get::get_filter_items( $data['data'] );

        if ( ! empty( $filter_items['terms'] ) ) {
            foreach ( $filter_items['terms'] as $key => $term ) {
                if ( isset( $term['url'] ) && ! empty( $term['url'] ) ) {
                    $filter_items['terms'][ $key ]['url']  = self::replace_route_url_to_post_permalink( $data['post_id'], $term['url'], $route_url );
                }
            }
        }

        return $filter_items;
    }
}
