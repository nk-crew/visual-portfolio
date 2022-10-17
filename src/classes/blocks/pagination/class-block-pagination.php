<?php
/**
 * Gutenberg pagination block.
 *
 * @package @@plugin_name/blocks/pagination
 */

// phpcs:disable
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Class Visual_Portfolio_Pagination_Block
 */
class Visual_Portfolio_Pagination_Block extends Visual_Portfolio_Block {
    /**
     * Visual_Portfolio_Pagination_Block constructor.
     */
    public function __construct() {
        add_action( 'init', array( $this, 'register_block' ), 11 );
    }

    /**
     * Get Pagination Attributes.
     *
     * @param array $data - Data with Block Gallery Attributes and Post ID.
     * @param string $route_url - Route URL.
     * @return array
     */
    public static function get_pagination_attributes( $data, $route_url = '' ) {
        if ( empty( $route_url ) ) {
            // phpcs:ignore;
            $route_url = $_SERVER['REQUEST_URI'];
        }
        $config                = Visual_Portfolio_Get::get_output_config( $data['data'] );
        $pagination_attributes = array();
        if ( isset( $config['options'] ) ) {
            $next_page_url  = self::replace_route_url_to_post_permalink( $data['post_id'], $config['options']['next_page_url'], $route_url );
            $filtered_links = Visual_Portfolio_Get::get_pagination_links( $config['options'], $config['options'] );
            foreach ( $filtered_links as $key => $filtered_link ) {
                if ( $filtered_link['url'] ) {
                    $link                          = self::replace_route_url_to_post_permalink( $data['post_id'], $filtered_link['url'], $route_url );
                    $filtered_links[ $key ]['url'] = $link;
                }
            }

            $pagination_attributes = array(
                'start_page'     => $config['options']['start_page'],
                'max_pages'      => $config['options']['max_pages'],
                'next_page_url'  => $next_page_url,
                'filtered_links' => $filtered_links,
            );
        }

        return $pagination_attributes;
    }

    /**
     * Register Pagination Block.
     *
     * @return void
     */
    public function register_block() {
        if ( ! function_exists( 'register_block_type' ) ) {
            return;
        }
        register_block_type(
            visual_portfolio()->plugin_path . 'gutenberg/blocks/pagination',
            array(
                'render_callback' => array( $this, 'block_render' ),
            )
        );
    }

    /**
     * Block output
     *
     * @param array $attributes - block attributes.
     *
     * @return string
     */
    public function block_render( $attributes ) {
        visual_portfolio()->include_template_style( 'visual-portfolio-pagination-minimal', 'items-list/pagination/minimal/style', array(), '@@plugin_version' );
        visual_portfolio()->include_template_style( 'visual-portfolio-pagination', 'items-list/pagination/style', array(), '@@plugin_version' );

        ob_start();

        $block_attributes = array(
            'data' => self::get_block_attributes( get_the_ID(), $attributes['gallery_block_id'] ),
            'post_id' => get_the_ID(),
        );

        $gallery_attributes = self::get_pagination_attributes( $block_attributes, get_permalink( get_the_ID() ) );

        $attributes = array_merge(
            array(
                'align'     => '',
                'className' => '',
            ),
            $attributes,
            $gallery_attributes
        );

        $class_name = 'wp-block-visual-portfolio';

        if ( $attributes['align'] ) {
            $class_name .= ' align' . $attributes['align'];
        }

        if ( $attributes['className'] ) {
            $class_name .= ' ' . $attributes['className'];
        }

        if ( $attributes['gallery_block_id'] ) {
            $class_name .= ' vp-gallery-id-' . $attributes['gallery_block_id'];
        }
        ?>
        <div
        <?php
            echo ' class="' . esc_attr( $class_name ) . '"';
            // Ghost Kit animate on scroll support.
            echo isset( $attributes['ghostkitSR'] ) && $attributes['ghostkitSR'] ? ' data-ghostkit-sr="' . esc_attr( $attributes['ghostkitSR'] ) . '"' : '';
        ?>
        >
            <?php
            // The function returns clean data because it includes templates that use escaping functions before output.
            Visual_Portfolio_Get::pagination( $attributes );
            ?>
        </div>
        <?php

        return ob_get_clean();
    }
}
new Visual_Portfolio_Pagination_Block();
