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
    static private $defaults = array(
        // tiles, masonry.
        'vp_layout'             => 'tiles',

        /**
         * Tile type:
         * first parameter - is columns number
         * the next is item sizes
         *
         * Example:
         * 3|1,0.5|2,0.25|
         *    3 columns in row
         *    First item 100% width and 50% height
         *    Second item 200% width and 25% height
         */
        'vp_tiles_type' => '3|1,1|',

        // masonry columns count.
        'vp_masonry_columns'       => 3,

        'vp_items_gap'             => 15,
        'vp_items_count'           => 6,

        // false, default.
        'vp_filter'                => 'default',
        // center, left, right.
        'vp_filter_align'          => 'center',

        // infinite, load-more, true.
        'vp_pagination'            => 'load-more',
        // center, left, right.
        'vp_pagination_align'      => 'center',

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
                if ( isset( $post_meta ) && ! empty( $post_meta ) ) {
                    if ( 'false' === $post_meta ) {
                        $post_meta = false;
                    }
                    if ( 'true' === $post_meta ) {
                        $post_meta = true;
                    }
                    $options_or_id[ $k ] = $post_meta;
                }
            }
        }

        return array_merge( self::$defaults, $options_or_id );
    }

    /**
     * Scripts enqueued flag
     *
     * @var bool
     */
    static private $scripts_enqueued = false;

    /**
     * Enqueue scripts and styles for portfolio.
     */
    static public function enqueue_scripts() {
        if ( self::$scripts_enqueued ) {
            return;
        }
        self::$scripts_enqueued = true;

        wp_enqueue_script( 'imagesloaded', visual_portfolio()->plugin_url . 'assets/vendor/imagesloaded/imagesloaded.pkgd.min.js', '', '', true );
        wp_enqueue_script( 'isotope', visual_portfolio()->plugin_url . 'assets/vendor/isotope/isotope.pkgd.min.js', array( 'jquery' ), '', true );

        /*
         * TODO: Justified
           wp_enqueue_script( 'justified-gallery', visual_portfolio()->plugin_url . 'assets/vendor/justified-gallery/js/jquery.justifiedGallery.min.js', array( 'jquery' ), '', true );
         */

        wp_enqueue_script( 'visual-portfolio', visual_portfolio()->plugin_url . 'assets/js/script.js', array( 'jquery' ), '', true );
        wp_enqueue_style( 'visual-portfolio', visual_portfolio()->plugin_url . 'assets/css/style.css' );
    }

    /**
     * ID of the current printed portfolio
     *
     * @var int
     */
    static private $id = 0;

    /**
     * Print portfolio by post ID or options
     *
     * @param int|array $options_or_id options for portfolio list to print.
     *
     * @return string
     */
    static public function get( $options_or_id = array() ) {
        self::enqueue_scripts();

        $id = ++self::$id;
        $options = self::get_options( $options_or_id );

        $result        = '';
        $class         = 'vp-portfolio';

        $paged = 0;
        if ( $options['vp_pagination'] ) {
            $paged = (int) max( 1, get_query_var( 'page' ), get_query_var( 'paged' ), isset( $_GET['paged'] ) ? (int) $_GET['paged'] : 1 );
        }

        /**
         * Set Up Query options
         */
        $query_opts = array(
            'showposts'  => intval( $options['vp_items_count'] ),
            'posts_per_page' => intval( $options['vp_items_count'] ),
            'paged'      => $paged,
            'orderby'    => 'post_date',
            'order'      => $options['vp_posts_order_direction'],
            'post_type'  => 'portfolio',
        );

        // Load certain taxonomies.
        if ( isset( $_GET['vp_filter'] ) ) {
            $taxonomies = sanitize_text_field( wp_unslash( $_GET['vp_filter'] ) );
            $taxonomies = explode( ':', $taxonomies );

            if ( $taxonomies && isset( $taxonomies[0] ) && isset( $taxonomies[1] ) ) {
                $query_opts['tax_query'] = array(
                    array(
                        'taxonomy' => $taxonomies[0],
                        'field' => 'slug',
                        'terms' => $taxonomies[1],
                    ),
                );
            }
        }

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

        $no_image = Visual_Portfolio_Settings::get_option( 'no_image','vp_general', false );

        // get Post List.
        $portfolio_query = new WP_Query( $query_opts );
        $portfolio_list = '';

        while ( $portfolio_query->have_posts() ) :
            $portfolio_query->the_post();

            $current_filter_values = array();

            // Get category taxonomies for data filter.
            if ( $options['vp_filter'] ) {
                $all_taxonomies = get_object_taxonomies( get_post() );
                foreach ( $all_taxonomies as $cat ) {
                    // allow only category taxonomies like category, portfolio_category, etc...
                    if ( strpos( $cat, 'category' ) === false ) {
                        continue;
                    }

                    $category = get_the_terms( get_post(), $cat );
                    if ( $category && ! in_array( $category, $current_filter_values ) ) {
                        foreach ( $category as $key => $cat_item ) {
                            $current_filter_values[] = $cat_item->slug;
                        }
                    }
                }
            }

            // Attachment.
            // TODO: Option to set custom image size.
            $attachment = get_the_post_thumbnail( get_the_ID(), 'full' );
            if ( ! $attachment && $no_image ) {
                $attachment = wp_get_attachment_image( $no_image, 'full' );
            }

            // Post link.
            $portfolio_url = get_permalink();

            // Title.
            $title = get_the_title();

            // Published Date.
            $published_date = get_the_time( esc_html__( 'F j, Y', NK_VP_DOMAIN ) );

            // filter data attribute string.
            $filter_attr = implode( ',', $current_filter_values );
            if ( $filter_attr ) {
                $filter_attr = ' data-vp-filter="' . esc_attr( $filter_attr ) . '"';
            } else {
                $filter_attr = '';
            }

            $portfolio_list .= '<div class="vp-portfolio__item"' . $filter_attr . '>';

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

            // add meta data.
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

        $start_page = (int) max( 1, get_query_var( 'page' ), get_query_var( 'paged' ), isset( $_GET['paged'] ) ? (int) $_GET['paged'] : 1 );
        $max_pages = (int) ($portfolio_query->max_num_pages < $start_page ? $start_page : $portfolio_query->max_num_pages);
        $next_page_url = ( ! $max_pages || $max_pages >= $start_page + 1 ) ? get_pagenum_link( $start_page + 1 ) : false;

        /**
         * Work with printing posts
         */
        $result .= '<div class="' . esc_attr( $class ) . '" data-vp-id="' . esc_attr( $id ) . '" data-vp-layout="' . esc_attr( $options['vp_layout'] ) . '" data-vp-tiles-type="' . esc_attr( $options['vp_tiles_type'] ) . '" data-vp-masonry-columns="' . esc_attr( $options['vp_masonry_columns'] ) . '" data-vp-items-gap="' . esc_attr( $options['vp_items_gap'] ) . '" data-vp-pagination="' . esc_attr( $options['vp_pagination'] ) . '" data-vp-next-page-url="' . esc_url( $next_page_url ) . '">';

        // Place preloader.
        $result .= '<div class="vp-portfolio__preloader"><span></span><span></span><span></span><span></span><i></i></div>';

        // Place filter.
        $result .= self::filter( $query_opts, $options );

        // Place portfolio list.
        $result .= '<div class="vp-portfolio__wrap">';
        $result .= $portfolio_list;
        $result .= '</div>';

        // Place pagination.
        $result .= self::pagination( $portfolio_query, $options );

        $result .= '</div>';

        return $result;
    }

    /**
     * Print filters
     *
     * @param array  $query_opts query options.
     * @param object $vp_options current vp_list options.
     *
     * @return string
     */
    static private function filter( $query_opts = null, $vp_options ) {
        if ( empty( $query_opts ) || ! isset( $query_opts ) || ! is_array( $query_opts ) || ! $vp_options['vp_filter'] ) {
            return '';
        }

        // Get all available categories for current $query_opts.
        $items = array();
        $query_opts['posts_per_page'] = -1;
        $query_opts['showposts'] = -1;
        $query_opts['paged'] = -1;
        $query_opts['tax_query'] = array();

        // Get active item.
        $active_item = false;
        if ( isset( $_GET['vp_filter'] ) ) {
            $active_item = sanitize_text_field( wp_unslash( $_GET['vp_filter'] ) );
        }
        $there_is_active = false;

        /**
         * TODO: make caching using set_transient function. Info here - https://wordpress.stackexchange.com/a/145960
         */
        $portfolio_query = new WP_Query( $query_opts );
        while ( $portfolio_query->have_posts() ) {
            $portfolio_query->the_post();
            $all_taxonomies = get_object_taxonomies( get_post() );

            foreach ( $all_taxonomies as $cat ) {
                // allow only category taxonomies like category, portfolio_category, etc...
                if ( strpos( $cat, 'category' ) === false ) {
                    continue;
                }

                // Retrieve terms.
                $category = get_the_terms( get_post(), $cat );
                if ( ! $category ) {
                    continue;
                }

                // Prepare each terms array.
                foreach ( $category as $key => $cat_item ) {
                    $unique_name = $cat_item->taxonomy . ':' . $cat_item->slug;

                    $url = self::get_nopaging_url( false, array(
                        'vp_filter' => urlencode( $unique_name ),
                    ) );

                    $items[ $unique_name ] = array(
                        'filter'      => $cat_item->slug,
                        'label'       => $cat_item->name,
                        'description' => $cat_item->description,
                        'count'       => $cat_item->count,
                        'taxonomy'    => $cat_item->taxonomy,
                        'active'      => $active_item === $unique_name,
                        'url'         => $url,
                        'class'       => 'vp-filter__item' . ($active_item === $unique_name ? ' vp-filter__item-active' : ''),
                    );

                    if ( $active_item === $unique_name ) {
                        $there_is_active = true;
                    }
                }
            }
        }
        wp_reset_postdata();

        // Add 'All' active item.
        array_unshift($items , array(
            'filter'      => '*',
            'label'       => esc_html__( 'All', NK_VP_DOMAIN ),
            'description' => false,
            'count'       => false,
            'active'      => ! $there_is_active,
            'url'         => remove_query_arg( 'vp_filter', self::get_nopaging_url() ),
            'class'       => 'vp-filter__item' . ( ! $there_is_active ? ' vp-filter__item-active' : ''),
        ));

        $args = array(
            'class'           => 'vp-filter',
            'items'           => $items,
            'align'           => $vp_options['vp_filter_align'],
            'vp_list_options' => $vp_options,
        );

        if ( $vp_options['vp_filter_align'] ) {
            $args['class'] .= ' vp-filter__align-' . $vp_options['vp_filter_align'];
        }

        ob_start();

        switch ( $vp_options['vp_filter'] ) {
            default:
                visual_portfolio()->include_template( 'items-list/filter/filter', $args );
                break;
        }

        $return = ob_get_contents();
        ob_end_clean();

        return $return;
    }

    /**
     * Print pagination
     *
     * @param object $query wp_query object.
     * @param object $vp_options current vp_list options.
     *
     * @return string
     */
    static private function pagination( $query = null, $vp_options ) {
        if ( null == $query || ! $vp_options['vp_pagination'] ) {
            return '';
        }

        static $vp_pagination_id = 0;
        $vp_pagination_id++;

        $start_page = (int) max( 1, get_query_var( 'page' ), get_query_var( 'paged' ), isset( $_GET['paged'] ) ? (int) $_GET['paged'] : 1 );
        $max_pages = (int) ($query->max_num_pages < $start_page ? $start_page : $query->max_num_pages);
        $next_page_url = ( ! $max_pages || $max_pages >= $start_page + 1 ) ? get_pagenum_link( $start_page + 1 ) : false;

        $args = array(
            'id'            => $vp_pagination_id,
            'type'          => $vp_options['vp_pagination'],
            'next_page_url' => $next_page_url,
            'start_page'    => $start_page,
            'max_pages'     => $query->max_num_pages,
            'class'         => 'vp-pagination',
            'align'         => $vp_options['vp_pagination_align'],
            'vp_list_options' => $vp_options,
        );

        if ( ! $next_page_url ) {
            $args['class'] .= ' vp-pagination__no-more';
        }

        if ( $vp_options['vp_pagination_align'] ) {
            $args['class'] .= ' vp-pagination__align-' . $vp_options['vp_pagination_align'];
        }

        ob_start();

        switch ( $vp_options['vp_pagination'] ) {
            case 'infinite':
                visual_portfolio()->include_template( 'items-list/pagination/infinite', $args );
                break;
            case 'load-more':
                visual_portfolio()->include_template( 'items-list/pagination/load-more', $args );
                break;
            default:
                $pagination_links = paginate_links( array(
                    'base' => esc_url_raw( str_replace( 999999999, '%#%', remove_query_arg( 'add-to-cart', get_pagenum_link( 999999999, false ) ) ) ),
                    'format' => '',
                    'type' => 'array',
                    'current' => $args['start_page'],
                    'total' => $args['max_pages'],
                    'prev_text' => '&lt;',
                    'next_text' => '&gt;',
                    'end_size' => 1,
                    'mid_size' => 2,
                ) );

                // parse html string and make arrays.
                $filtered_links = array();
                if ( $pagination_links ) {
                    foreach ( $pagination_links as $link ) {
                        $tag_data = self::extract_tags( $link, array( 'a', 'span' ) );
                        $tag_data = ! empty( $tag_data ) ? $tag_data[0] : $tag_data;

                        if ( ! empty( $tag_data ) ) {
                            $atts = isset( $tag_data['attributes'] ) ? $tag_data['attributes'] : false;
                            $href = $atts && isset( $atts['href'] ) ? $atts['href'] : false;
                            $class = $atts && isset( $atts['class'] ) ? $atts['class'] : '';
                            $label = isset( $tag_data['contents'] ) ? $tag_data['contents'] : false;

                            $arr = array(
                                'url'           => $href,
                                'label'         => $label,
                                'class'         => 'vp-pagination__item',
                                'active'        => strpos( $class, 'current' ) !== false,
                                'is_prev_arrow' => strpos( $class, 'prev' ) !== false,
                                'is_next_arrow' => strpos( $class, 'next' ) !== false,
                                'is_dots'       => strpos( $class, 'dots' ) !== false,
                            );

                            if ( $arr['active'] ) {
                                $arr['class'] .= ' vp-pagination__item-active';
                            }
                            if ( $arr['is_prev_arrow'] ) {
                                $arr['class'] .= ' vp-pagination__item-prev';
                            }
                            if ( $arr['is_next_arrow'] ) {
                                $arr['class'] .= ' vp-pagination__item-next';
                            }
                            if ( $arr['is_dots'] ) {
                                $arr['class'] .= ' vp-pagination__item-dots';
                            }

                            $filtered_links[] = $arr;
                        }
                    }
                }

                $args['items'] = $filtered_links;
                visual_portfolio()->include_template( 'items-list/pagination/paged', $args );
                break;
        }

        $return = ob_get_contents();
        ob_end_clean();

        return $return;
    }

    /**
     * Return current url without page variables.
     *
     * @param string $current_url - custom page url.
     * @param array  $query_arg - custom query arg.
     * @return string
     */
    static private function get_nopaging_url( $current_url = false, $query_arg = array() ) {

        // Use current page url.
        if ( ! $current_url ) {
            global $wp;
            $query = isset( $_SERVER['QUERY_STRING'] ) ? sanitize_text_field( wp_unslash( $_SERVER['QUERY_STRING'] ) ) : '';
            $request_uri = isset( $_SERVER['REQUEST_URI'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REQUEST_URI'] ) ) : home_url( $wp->request );

            $current_url = add_query_arg( $query, '', $request_uri );
        }

        // Add custom query args.
        $current_url = add_query_arg( $query_arg, $current_url );

        // Remove paged get variable.
        $current_url = remove_query_arg( 'paged', $current_url );

        // Remove /page/{%}.
        $pattern = '/page\\/[0-9]+\\//i';
        $current_url = preg_replace( $pattern, '', $current_url );

        return $current_url;
    }

    /**
     * Extract specific HTML tags and their attributes from a string.
     *
     * Found in http://w-shadow.com/blog/2009/10/20/how-to-extract-html-tags-and-their-attributes-with-php/
     *
     * You can either specify one tag, an array of tag names, or a regular expression that matches the tag name(s).
     * If multiple tags are specified you must also set the $selfclosing parameter and it must be the same for
     * all specified tags (so you can't extract both normal and self-closing tags in one go).
     *
     * The function returns a numerically indexed array of extracted tags. Each entry is an associative array
     * with these keys :
     *  tag_name    - the name of the extracted tag, e.g. "a" or "img".
     *  offset      - the numberic offset of the first character of the tag within the HTML source.
     *  contents    - the inner HTML of the tag. This is always empty for self-closing tags.
     *  attributes  - a name -> value array of the tag's attributes, or an empty array if the tag has none.
     *  full_tag    - the entire matched tag, e.g. '<a href="http://example.com">example.com</a>'. This key
     *                will only be present if you set $return_the_entire_tag to true.
     *
     * @param string       $html The HTML code to search for tags.
     * @param string|array $tag The tag(s) to extract.
     * @param bool         $selfclosing Whether the tag is self-closing or not. Setting it to null will force the script to try and make an educated guess.
     * @param bool         $return_the_entire_tag Return the entire matched tag in 'full_tag' key of the results array.
     * @param string       $charset The character set of the HTML code. Defaults to ISO-8859-1.
     *
     * @return array An array of extracted tags, or an empty array if no matching tags were found.
     */
    static private function extract_tags( $html, $tag, $selfclosing = null, $return_the_entire_tag = false, $charset = 'ISO-8859-1' ) {

        if ( is_array( $tag ) ) {
            $tag = implode( '|', $tag );
        }

        // If the user didn't specify if $tag is a self-closing tag we try to auto-detect it by checking against a list of known self-closing tags.
        $selfclosing_tags = array( 'area', 'base', 'basefont', 'br', 'hr', 'input', 'img', 'link', 'meta', 'col', 'param' );
        if ( is_null( $selfclosing ) ) {
            $selfclosing = in_array( $tag, $selfclosing_tags );
        }

        // The regexp is different for normal and self-closing tags because I can't figure out how to make a sufficiently robust unified one.
        if ( $selfclosing ) {
            $tag_pattern =
                '@<(?P<tag>' . $tag . ')           # <tag
                (?P<attributes>\s[^>]+)?       # attributes, if any
                \s*/?>                   # /> or just >, being lenient here 
                @xsi';
        } else {
            $tag_pattern =
                '@<(?P<tag>' . $tag . ')           # <tag
                (?P<attributes>\s[^>]+)?       # attributes, if any
                \s*>                 # >
                (?P<contents>.*?)         # tag contents
                </(?P=tag)>               # the closing </tag>
                @xsi';
        }

        $attribute_pattern =
            '@
            (?P<name>\w+)                         # attribute name
            \s*=\s*
            (
                (?P<quote>[\"\'])(?P<value_quoted>.*?)(?P=quote)    # a quoted value
                |                           # or
                (?P<value_unquoted>[^\s"\']+?)(?:\s+|$)           # an unquoted value (terminated by whitespace or EOF) 
            )
            @xsi';

        // Find all tags.
        if ( ! preg_match_all( $tag_pattern, $html, $matches, PREG_SET_ORDER | PREG_OFFSET_CAPTURE ) ) {
            // Return an empty array if we didn't find anything.
            return array();
        }

        $tags = array();
        foreach ( $matches as $match ) {

            // Parse tag attributes, if any.
            $attributes = array();
            if ( ! empty( $match['attributes'][0] ) ) {

                if ( preg_match_all( $attribute_pattern, $match['attributes'][0], $attribute_data, PREG_SET_ORDER ) ) {
                    // Turn the attribute data into a name->value array.
                    foreach ( $attribute_data as $attr ) {
                        if ( ! empty( $attr['value_quoted'] ) ) {
                            $value = $attr['value_quoted'];
                        } else if ( ! empty( $attr['value_unquoted'] ) ) {
                            $value = $attr['value_unquoted'];
                        } else {
                            $value = '';
                        }

                        // Passing the value through html_entity_decode is handy when you want to extract link URLs or something like that. You might want to remove or modify this call if it doesn't fit your situation.
                        $value = html_entity_decode( $value, ENT_QUOTES, $charset );

                        $attributes[ $attr['name'] ] = $value;
                    }
                }
            }

            $tag = array(
                'tag_name' => $match['tag'][0],
                'offset' => $match[0][1],
                'contents' => ! empty( $match['contents'] ) ? $match['contents'][0] : '', // empty for self-closing tags.
                'attributes' => $attributes,
            );
            if ( $return_the_entire_tag ) {
                $tag['full_tag'] = $match[0][0];
            }

            $tags[] = $tag;
        }

        return $tags;
    }
}
