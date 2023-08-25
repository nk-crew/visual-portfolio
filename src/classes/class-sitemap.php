<?php
/**
 * Supported Images in Sitemap (SEO).
 *
 * @package visual-portfolio/sitemap
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
        add_filter( 'rank_math/sitemap/urlimages', array( $this, 'add_images_to_sitemap' ), 10, 2 );
        add_filter( 'wpseo_sitemap_urlimages', array( $this, 'add_images_to_sitemap' ), 10, 2 );
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

                if ( 0 === $post_id ) {
                    $archive_page = Visual_Portfolio_Settings::get_option( 'portfolio_archive_page', 'vp_general' );

                    if ( get_permalink( $archive_page ) === $post_permalink ) {
                        $post_id = $archive_page;
                    }
                }

                $block_images = $this->parse_images_from_blocks( $post_id );

                if ( ! empty( $block_images ) ) {
                    foreach ( $block_images as $image ) {
                        $images[] = (object) array(
                            'image:loc'     => $image['src'],
                            'image:caption' => $image['alt'],
                            'image:title'   => $image['title'],
                        );
                    }
                }

                $entry['images'] = $images;
            }
        }

        return $entries;
    }

    /**
     * Add sitemap images for Rank Math and Yoast SEO.
     *
     * @param array $images - Sitemap Images for current Post.
     * @param int   $post_id - Post ID.
     * @return array
     */
    public function add_images_to_sitemap( $images, $post_id ) {
        $block_images = $this->parse_images_from_blocks( $post_id );
        if ( ! empty( $block_images ) ) {
            $images = array_merge( $images, $block_images );
        }

        return $images;
    }

    /**
     * Parse block images.
     *
     * @param  int $post_id - Post ID.
     * @return array
     */
    private function parse_images_from_blocks( $post_id ) {
        $block_images = array();
        if ( $post_id > 0 ) {
            $post         = get_post( $post_id );
            $content_post = $post->post_content;
            $parse_blocks = parse_blocks( $content_post );

            if ( ! empty( $parse_blocks ) && is_array( $parse_blocks ) ) {
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

                                            $image_id = apply_filters( 'vpf_parse_sitemap_image_id_from_blocks', 'attachment' === get_post_type() ? get_the_ID() : get_post_thumbnail_id( get_the_ID() ), get_the_ID() );

                                            $image_alt = get_post_meta( $image_id, '_wp_attachment_image_alt', true );

                                            $block_images[] = array(
                                                'src'   => wp_get_attachment_image_url( $image_id, 'full' ),
                                                'alt'   => $image_alt,
                                                'title' => get_the_title( $image_id ),
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

                                        $block_images[] = array(
                                            'src'   => $image_url,
                                            'alt'   => $image_alt,
                                            'title' => $image_title,
                                        );
                                    }
                                }
                                break;
                        }
                    }
                }
            }
        }

        return apply_filters( 'vpf_parse_sitemap_images_from_blocks', $block_images, $post_id );
    }
}
new Visual_Portfolio_Sitemap();
