<?php
/**
 * Supported Images in Sitemap (SEO).
 *
 * @package @@plugin_name/get
 */

/**
 * Visual_Portfolio_Sitemap class
 */
class Visual_Portfolio_Sitemap {
    /**
     * Visual_Portfolio_Sitemap constructor.
     */
    public function __construct() {
        add_filter( 'aioseo_sitemap_posts', array( $this, 'add_images_to_aioseo_sitemap' ), 10, 2 );
    }

    /**
     * Add sitemap entries for All In One SEO.
     *
     * @param array  $entries - Sitemap entries.
     * @param string $post_type - Current Post Type.
     *
     * @return array
     */
    public function add_images_to_aioseo_sitemap( $entries, $post_type ) {
        if ( is_array( $entries ) ) {
            foreach ( $entries as &$entry ) {
                $post_permalink = $entry['loc'];
                $post_id        = url_to_postid( $post_permalink );
                $images         = isset( $entry['images'] ) ? $entry['images'] : array();
                if ( $post_id > 0 ) {
                    $post         = get_post( $post_id );
                    $content_post = $post->post_content;
                    $parse_blocks = parse_blocks( $content_post );

                    if ( ! empty( $parse_blocks ) && is_array( $parse_blocks ) ) {
                        $block_images = array();
                        foreach ( $parse_blocks as $block ) {
                            if (
                                'visual-portfolio/block' === $block['blockName'] ||
                                'visual-portfolio/saved' === $block['blockName'] ||
                                'nk/visual-portfolio' === $block['blockName']
                            ) {
                                $options = Visual_Portfolio_Get::get_options( $block['attrs'] );
                                switch ( $options['content_source'] ) {
                                    case 'post-based':
                                        if ( isset( $options['posts_source'] ) ) {
                                            $query_opts = Visual_Portfolio_Get::get_query_params( $options, false, $options['id'] );

                                            $portfolio_query = new WP_Query( $query_opts );

                                            if ( isset( $portfolio_query ) ) {
                                                while ( $portfolio_query->have_posts() ) {
                                                    $portfolio_query->the_post();

                                                    $image_id = 'attachment' === get_post_type() ? get_the_ID() : get_post_thumbnail_id( get_the_ID() );

                                                    $image_alt = get_post_meta( $image_id, '_wp_attachment_image_alt', true );

                                                    $block_images[] = (object) array(
                                                        'image:loc'     => wp_get_attachment_image_url( $image_id, 'full' ),
                                                        'image:caption' => $image_alt,
                                                        'image:title'   => get_the_title( $image_id ),
                                                    );
                                                }
                                                $portfolio_query->reset_postdata();

                                                // Sometimes, when we use WPBakery Page Builder, without this reset output is wrong.
                                                wp_reset_postdata();
                                            }
                                        }
                                        break;
                                    case 'images':
                                        if ( isset( $options['images'] ) ) {
                                            foreach ( $options['images'] as $image ) {
                                                $image_id = $image['id'];

                                                $image_alt = $image['description'] ?? get_post_meta( $image_id, '_wp_attachment_image_alt', true ) ?? '';

                                                $image_title = $image['title'] ?? get_the_title( $image_id );

                                                $image_url = $image['imgUrl'] ?? wp_get_attachment_image_url( $image_id, 'full' );

                                                $block_images[] = (object) array(
                                                    'image:loc'     => $image_url,
                                                    'image:caption' => $image_alt,
                                                    'image:title'   => $image_title,
                                                );
                                            }
                                        }
                                        break;
                                }
                            }
                        }
                        if ( ! empty( $block_images ) ) {
                            $entry['images'] = $block_images;
                        }
                    }
                }
            }
        }

        return $entries;
    }
}
new Visual_Portfolio_Sitemap();
