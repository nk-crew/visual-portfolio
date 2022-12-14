<?php
/**
 * Gutenberg block.
 *
 * @package @@plugin_name/blocks
 */

 // phpcs:disable
if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Class Visual_Portfolio_Pagination_Block
 */
class Visual_Portfolio_Block {
    /**
     * Visual_Portfolio_Block constructor.
     */
    public function __construct() {
    }

    /**
     * Parse blocks including reusable and InnerBlocks.
     *
     * @param array   $blocks - blocks array.
     */
    public static function parse_blocks( $blocks ) {
        $all_blocks = array();

        foreach ( $blocks as $block ) {
            if ( 'visual-portfolio/block' === $block['blockName'] ) {
                // Add current item, if it's a heading block.
                $all_blocks[] = $block;
            } elseif ( ! empty( $block['innerBlocks'] ) ) {
                // Or call the function recursively, to find heading blocks in inner blocks.
                $all_blocks = array_merge( $all_blocks, self::parse_blocks( $block['innerBlocks'] ) );
            }
        }

        return $all_blocks;
    }

    /**
     * Get Block Attributes.
     *
     * @param string $post_id - Post ID.
     * @param string $block_id - Block ID.
     * @return void
     */
    public static function get_block_attributes( $post_id, $block_id ) {
        $content         = get_post_field( 'post_content', $post_id );
        $block_templates = array_merge( get_block_templates(), get_block_templates( array(), 'wp_template_part' ) );

        if ( is_array( $block_templates ) && ! empty( $block_templates ) ) {
            foreach ( $block_templates as $template ) {
                $content = $content . $template->content;
            }
        }

        $blocks                   = parse_blocks( $content );
        $post_blocks              = self::parse_blocks( $blocks );
        $finding_block_attributes = false;
        foreach ( $post_blocks as $block ) {
            if ( isset( $block['attrs']['block_id'] ) && $block['attrs']['block_id'] === $block_id ) {
                $finding_block_attributes = $block['attrs'];
            }
        }
        return $finding_block_attributes;
    }

    /**
     * Replace Route URL to Post Permalink.
     *
     * @param string $post_id - Post ID.
     * @param string $link - Current Link.
     * @param string $route_url - Route URL.
     * @return void
     */
    public static function replace_route_url_to_post_permalink( $post_id, $link, $route_url ) {
        $link = urldecode( $link );
        $link = str_replace( $route_url, get_permalink( $post_id ), $link );
        $link = str_replace( '/&', '?', $link );
        $link = str_replace( '//', '/', $link );

        return $link;
    }
}
