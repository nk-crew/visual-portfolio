<?php
/**
 * Get portfolio list
 *
 * @package visual-portfolio/get
 */

/**
 * Get portfolio list
 */
class Visual_Portfolio_Get {
    /**
     * Default options
     *
     * @var array
     */
    private static $defaults = array(
        /**
         * Layout parameter info:
         * first parameter - is gap size in pixels
         * the next is portfolio items sizes
         *
         * Example:
         * 20|1,0.5|2,0.25|
         *    20px gap between items
         *    First item 100% width and 50% height
         *    Second item 200% width and 25% height
         */
        'vp_list_layout'           => '3|1,1|',
        'vp_list_gap'              => 15,
        'vp_list_count'            => 6,
        'vp_list_filter'           => true,

        // infinite, load-more, true.
        'vp_list_pagination'       => 'load-more',

        // portfolio, post-based.
        'vp_content_source'        => 'portfolio',

        // post type, ids, custom_query.
        'vp_posts_source'          => 'portfolio',
        'vp_posts_ids'             => array(),
        'vp_posts_excluded_ids'    => array(),
        'vp_posts_custom_query'    => '',
        'vp_posts_taxonomies'      => array(),

        // or, and.
        'vp_posts_taxonomies_relation' => 'or',

        // date, title, id.
        'vp_posts_order_by'        => 'post_date',

        // desc, asc.
        'vp_posts_order_direction' => 'desc',
    );

    /**
     * Get all available options of post.
     *
     * @param int|array $options_or_id options for portfolio list to print.
     * @return array
     */
    static public function get_options( $options_or_id = array() ) {
        // get meta from the post.
        if ( ! is_array( $options_or_id ) ) {
            $id = $options_or_id;
            $options_or_id = array();

            foreach ( self::$defaults as $k => $item ) {
                $post_meta = get_post_meta( $id, $k, true );
                if ( $post_meta ) {
                    $options_or_id[ $k ] = $post_meta;
                }
            }
        }

        return array_merge( self::$defaults, $options_or_id );
    }

    /**
     * Enqueue scripts and styles for portfolio.
     */
    static private function enqueue_scripts() {
        wp_enqueue_script( 'imagesloaded', visual_portfolio()->plugin_url . 'assets/vendor/imagesloaded/imagesloaded.pkgd.min.js', '', '', true );
        wp_enqueue_script( 'isotope', visual_portfolio()->plugin_url . 'assets/vendor/isotope/isotope.pkgd.min.js', array( 'jquery' ), '', true );

        wp_enqueue_script( 'visual-portfolio-infinite', visual_portfolio()->plugin_url . 'assets/js/infinite-scroll.js', array( 'jquery' ), '', true );

        wp_enqueue_script( 'visual-portfolio', visual_portfolio()->plugin_url . 'assets/js/script.js', array( 'jquery' ), '', true );
        wp_enqueue_style( 'visual-portfolio', visual_portfolio()->plugin_url . 'assets/css/style.css' );
    }

    /**
     * Print portfolio by post ID or options
     *
     * @param int|array $options_or_id options for portfolio list to print.
     * @param bool      $return return result instead of echo.
     */
    static public function get( $options_or_id = array(), $return = false ) {
        self::enqueue_scripts();

        $options = self::get_options( $options_or_id );

        $result        = '';
        $filter_values = array();
        $class         = 'vp-portfolio';

        if ( ! $options['vp_list_pagination'] || '0' === $options['vp_list_pagination'] || 'false' === $options['vp_list_pagination'] ) {
            $options['vp_list_pagination'] = false;
        }

        $paged = 0;
        if ( $options['vp_list_pagination'] ) {
            $paged = (int) max( 1, get_query_var( 'page' ), get_query_var( 'paged' ), isset( $_GET['paged'] ) ? (int) $_GET['paged'] : 1 );
        }

        /**
         * Set Up Query options
         */
        $query_opts = array(
            'showposts'  => intval( $options['vp_list_count'] ),
            'posts_per_page' => intval( $options['vp_list_count'] ),
            'paged'      => $paged,
            'orderby'    => 'post_date',
            'order'      => $options['vp_posts_order_direction'],
            'post_type'  => 'portfolio',
        );

        // Post based.
        if ( 'post-based' === $options['vp_content_source'] ) {
            // Exclude IDs.
            if ( ! empty( $options['vp_posts_excluded_ids'] ) ) {
                $query_opts['post__not_in'] = $options['vp_posts_excluded_ids'];
            }

            // Order By.
            switch ( $options['vp_posts_order_by'] ) {
                case 'title':
                    $query_opts['orderby'] = 'title';
                    break;

                case 'id':
                    $query_opts['orderby'] = 'ID';
                    break;

                case 'post__in':
                    $query_opts['orderby'] = 'post__in';
                    break;

                default:
                    $query_opts['orderby'] = 'post_date';
                    break;
            }

            if ( 'ids' === $options['vp_posts_source'] ) { // IDs.
                $query_opts['post_type'] = 'any';
                $query_opts['post__not_in'] = array();

                if ( ! empty( $options['vp_posts_ids'] ) ) {
                    $query_opts['post__in'] = $options['vp_posts_ids'];
                }
            } elseif ( 'custom_query' === $options['vp_posts_source'] ) { // Custom Query.
                $query_opts['post_type'] = 'any';

                $tmp_arr = array();
                parse_str( html_entity_decode( $options['vp_posts_custom_query'] ), $tmp_arr );
                $query_opts = array_merge( $query_opts, $tmp_arr );
            } else {
                $query_opts['post_type'] = $options['vp_posts_source'];

                // Taxonomies.
                if ( ! empty( $options['vp_posts_taxonomies'] ) ) {
                    $terms_list = get_terms( get_object_taxonomies( get_post_types( array(
                        'public' => false,
                        'name'   => 'attachment',
                    ), 'names', 'NOT' ) ) );

                    $query_opts['tax_query'] = array(
                        'relation' => $options['vp_posts_taxonomies_relation'],
                    );
                    foreach ( $options['vp_posts_taxonomies'] as $taxonomy ) {
                        $taxonomy_name = null;

                        foreach ( $terms_list as $term ) {
                            if ( $term->term_id == $taxonomy ) {
                                $taxonomy_name = $term->taxonomy;
                                continue;
                            }
                        }

                        if ( $taxonomy_name ) {
                            $query_opts['tax_query'][] = array(
                                'taxonomy' => $taxonomy_name,
                                'field'    => 'id',
                                'terms'    => $taxonomy,
                            );
                        }
                    }
                }
            } // End if().
        } // End if().

        // get Post List.
        $portfolio_query = new WP_Query( $query_opts );
        $portfolio_list = '';

        while ( $portfolio_query->have_posts() ) : $portfolio_query->the_post();
            $current_post_atts = '';
            $alt = '';
            $attachment_src = '';

            // Filter Matches.
            // if ( $options['vp_list_filter'] ) {
                // $category = get_the_terms( get_the_ID(), 'portfolio-category' );
                // if ( $category ) {
                    // $current_post_atts .= ' data-filter="';
                    // foreach ( $category as $key => $cat_item ) {
                    // $filter_values[] = $cat_item->name;
                    // if ( $key > 0 ) {
                    // $current_post_atts .= ', ';
                    // }
                    // $current_post_atts .= esc_attr( $cat_item->name );
                    // }
                    // $current_post_atts .= '"';
                // }
            // }
            // Attachment.
            $attachment = get_the_post_thumbnail( get_the_ID(), 'full' );

            // Post link.
            $portfolio_url = get_permalink();

            // Title.
            $title = get_the_title();

            // Published Date.
            $published_date = get_the_time( esc_html__( 'F j, Y', NK_VP_DOMAIN ) );

            $portfolio_list .= '<div class="vp-portfolio__item"' . $current_post_atts . '>';

            $portfolio_list .= '<div class="vp-portfolio__item-img">';
            $portfolio_list .= '<div class="vp-portfolio__item-img-wrap">';
            if ( isset( $portfolio_url ) && ! empty( $portfolio_url ) ) {
                $portfolio_list .= '<a href="' . esc_url( $portfolio_url ) . '">' . $attachment . '</a>';
            } else {
                $portfolio_list .= $attachment;
            }
            $portfolio_list .= '</div>';
            $portfolio_list .= '</div>';

            $portfolio_list .= '<div class="vp-portfolio__item-overlay">';

            // add meta, heart, title, link, date.
            if ( isset( $title ) && ! empty( $title ) && isset( $portfolio_url ) && ! empty( $portfolio_url ) ) {
                $portfolio_list .= '<h2 class="nk-portfolio-title nk-post-title h4"><a href="' . esc_url( $portfolio_url ) . '">' . esc_html( $title ) . '</a></h2>';
            }
            $portfolio_list .= '<div class="vp-portfolio__item-meta">';
            if ( isset( $published_date ) && ! empty( $published_date ) ) {
                $portfolio_list .= '<div class="vp-portfolio__item-meta-date">' . esc_html( $published_date ) . '</div>';
            }
            $portfolio_list .= '</div>';
            $portfolio_list .= '</div>';
            $portfolio_list .= '</div>';
        endwhile;
        wp_reset_postdata();

        // Set Filter.
        if ( $options['vp_list_filter'] && ! empty( $filter_values ) && isset( $filter_values ) && is_array( $filter_values ) ) {
            foreach ( $filter_values as $key => $filter_value ) {
                $filter_values[ $key ] = trim( $filter_value );
            }
            $filter_values = array_unique( $filter_values );
            $result .= '<ul class="vp-portfolio__filter">';
            $result .= '<li class="active" data-filter="*">All</li>';
            foreach ( $filter_values as $key => $filter_value ) {
                $result .= '<li data-filter="' . esc_attr( trim( $filter_value ) ) . '">' . esc_html( trim( $filter_value ) ) . '</li>';
            }
            $result .= '</ul>';
        }

        /**
         * Work with printing posts
         */
        $result .= '<div class="' . esc_attr( $class ) . '" data-vp-layout="' . esc_attr( $options['vp_list_layout'] ) . '" data-vp-items-gap="' . esc_attr( $options['vp_list_gap'] ) . '">';
        $result .= '<div class="vp-portfolio__preloader"><span></span><span></span><span></span><span></span><i></i></div>';
        $result .= '<div class="vp-portfolio-wrap">';
        $result .= $portfolio_list;
        $result .= '</div>';
        if ( $options['vp_list_pagination'] ) {
            $result .= self::pagination( $portfolio_query, $options['vp_list_pagination'] );
        }
        $result .= '</div>';

        if ( $return ) {
            return $result;
        } else {
            echo $result;
        }
    }

    /**
     * Print pagination
     *
     * @param object $query wp_query object.
     * @param string $type pagination type: default, infinite, load-more.
     */
    static private function pagination( $query = null, $type = 'default' ) {
        if ( null == $query ) {
            $query_name = 'wp_query';

            // Don't print empty markup if there's only one page.
            if ( $GLOBALS[ $query_name ]->max_num_pages < 1 ) {
                return '';
            }

            $query = $GLOBALS[ $query_name ];
        }

        static $vp_pagination_id = 0;
        $vp_pagination_id++;

        $start_page = (int) max( 1, get_query_var( 'page' ), get_query_var( 'paged' ), isset( $_GET['paged'] ) ? (int) $_GET['paged'] : 1 );
        $max_pages = (int) ($query->max_num_pages < $start_page ? $start_page : $query->max_num_pages);
        $next_page_url = ( ! $max_pages || $max_pages >= $start_page + 1 ) ? get_pagenum_link( $start_page + 1 ) : false;

        $args = array(
            'id' => $vp_pagination_id,
            'type' => $type,
            'next_page_url' => $next_page_url,
            'start_page' => $start_page,
            'max_pages' => $query->max_num_pages,
        );

        ob_start();

        switch ( $type ) {
            case 'infinite':
                visual_portfolio()->get_template_part( 'pagination/infinite', $args );
                break;
            case 'load-more':
                visual_portfolio()->get_template_part( 'pagination/load-more', $args );
                break;
            default:
                visual_portfolio()->get_template_part( 'pagination/default', $args );
                break;
        }

        $return = ob_get_contents();
        ob_end_clean();

        return $return;
    }
}
