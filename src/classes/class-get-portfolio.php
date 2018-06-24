<?php
/**
 * Get portfolio list
 *
 * @package @@plugin_name/get
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// Slugify.
if ( version_compare( PHP_VERSION, '5.5.9' ) >= 0 ) {
    require_once( visual_portfolio()->plugin_path . 'vendors/slugify/RuleProvider/RuleProviderInterface.php' );
    require_once( visual_portfolio()->plugin_path . 'vendors/slugify/RuleProvider/DefaultRuleProvider.php' );
    require_once( visual_portfolio()->plugin_path . 'vendors/slugify/SlugifyInterface.php' );
    require_once( visual_portfolio()->plugin_path . 'vendors/slugify/Slugify.php' );
}

/**
 * Session Start
 */
function vpf_session_start() {
    if ( ! session_id() ) {
        session_start();
    }
}
add_action( 'init', 'vpf_session_start' );

/**
 * Class Visual_Portfolio_Get
 */
class Visual_Portfolio_Get {
    /**
     * Get all available options of post.
     *
     * @param int|array $options_or_id options for portfolio list to print.
     * @return array
     */
    public static function get_options( $options_or_id = array() ) {
        $result = array();

        // get meta from the post.
        if ( ! is_array( $options_or_id ) ) {
            foreach ( Visual_Portfolio_Controls::get_registered_array() as $item ) {
                $result[ $item['name'] ] = Visual_Portfolio_Controls::get_registered_value( $item['name'], $options_or_id );
            }
        } else {
            $result = $options_or_id;
        }

        return $result;
    }

    /**
     * Scripts enqueued flag
     *
     * @var bool
     */
    private static $scripts_enqueued = false;

    /**
     * Enqueue scripts and styles for portfolio.
     */
    public static function enqueue_scripts() {
        if ( self::$scripts_enqueued ) {
            return;
        }
        self::$scripts_enqueued = true;

        wp_enqueue_script( '@@plugin_name' );
        wp_enqueue_style( '@@plugin_name' );
    }

    /**
     * Check if portfolio showed in preview mode.
     */
    public static function is_preview() {
        // phpcs:disable
        $frame = isset( $_GET['vp_preview_frame'] ) ? esc_attr( wp_unslash( $_GET['vp_preview_frame'] ) ) : false;
        $id = isset( $_GET['vp_preview_frame_id'] ) ? esc_attr( wp_unslash( $_GET['vp_preview_frame_id'] ) ) : false;
        // phpcs:enable

        return 'true' === $frame && $id;
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
     * @param array $atts options for portfolio list to print.
     *
     * @return string
     */
    public static function get( $atts = array() ) {
        if ( ! is_array( $atts ) || ! isset( $atts['id'] ) ) {
            return '';
        }

        self::enqueue_scripts();

        // generate unique ID.
        $uid = ++self::$id;
        $uid = hash( 'crc32b', $uid . $atts['id'] );

        $options = self::get_options( $atts['id'] );

        $class   = 'vp-portfolio vp-uid-' . $uid;

        // Add ID to class.
        $class .= ' vp-id-' . $atts['id'];

        // Add custom class.
        if ( isset( $atts['class'] ) ) {
            $class .= ' ' . $atts['class'];
        }

        // Add custom css from VC.
        if ( function_exists( 'vc_shortcode_custom_css_class' ) && isset( $atts['vc_css'] ) ) {
            $class .= ' ' . vc_shortcode_custom_css_class( $atts['vc_css'] );
        }

        // stretch class.
        if ( $options['vp_stretch'] ) {
            $class .= ' vp-portfolio__stretch';
        }

        $no_image = Visual_Portfolio_Settings::get_option( 'no_image', 'vp_general', false );

        // prepare image sizes.
        // TODO: Option to set custom image sizes.
        $img_size_popup = 'vp_xl';
        $img_size_md_popup = 'vp_md';
        $img_size = 'vp_lg';
        $columns_count = false;
        if ( 'masonry' === $options['vp_layout'] ) {
            $columns_count = (int) $options['vp_masonry_columns'];
        }
        if ( 'tiles' === $options['vp_layout'] ) {
            $columns_count = explode( '|', $options['vp_tiles_type'], 1 );
            $columns_count = (int) $columns_count[0];
        }
        switch ( $columns_count ) {
            case 1:
                $img_size = 'vp_xl';
                break;
            case 2:
                $img_size = 'vp_lg';
                break;
            case 3:
                $img_size = 'vp_md';
                break;
            case 4:
                $img_size = 'vp_md';
                break;
            case 5:
                $img_size = 'vp_sm';
                break;
        }

        $start_page = self::get_current_page_number();

        $is_images = 'images' === $options['vp_content_source'];
        if ( $is_images ) {
            $query_opts = self::get_query_params( $options );

            $max_pages = (int) ( $query_opts['max_num_pages'] < $start_page ? $start_page : $query_opts['max_num_pages'] );
        } else {
            // Get query params.
            $query_opts = self::get_query_params( $options );

            // get Post List.
            $portfolio_query = new WP_Query( $query_opts );

            $max_pages = (int) ( $portfolio_query->max_num_pages < $start_page ? $start_page : $portfolio_query->max_num_pages );
        }

        $next_page_url = ( ! $max_pages || $max_pages >= $start_page + 1 ) ? get_pagenum_link( $start_page + 1 ) : false;

        // No items found.
        if ( $is_images && empty( $query_opts['images'] ) || isset( $portfolio_query ) && ! $portfolio_query->have_posts() ) {
            ob_start();
            self::notice( esc_html__( 'No items found.', '@@text_domain' ) );
            $return = ob_get_contents();
            ob_end_clean();
            return $return;
        }

        ob_start();

        // prepare data-attributes.
        $is_preview = self::is_preview();
        $data_atts = array(
            'data-vp-layout' => $options['vp_layout'],
            'data-vp-items-style' => $options['vp_items_style'],
            'data-vp-items-click-action' => $options['vp_items_click_action'],
            'data-vp-items-gap' => $options['vp_items_gap'],
            'data-vp-pagination' => $options['vp_pagination'],
            'data-vp-next-page-url' => $next_page_url,
        );
        if ( 'tiles' === $options['vp_layout'] || $is_preview ) {
            $data_atts['data-vp-tiles-type'] = $options['vp_tiles_type'];
        }
        if ( 'masonry' === $options['vp_layout'] || $is_preview ) {
            $data_atts['data-vp-masonry-columns'] = $options['vp_masonry_columns'];
        }
        if ( 'justified' === $options['vp_layout'] || $is_preview ) {
            $data_atts['data-vp-justified-row-height'] = $options['vp_justified_row_height'];
            $data_atts['data-vp-justified-row-height-tolerance'] = $options['vp_justified_row_height_tolerance'];
        }
        if ( 'slider' === $options['vp_layout'] || $is_preview ) {
            $data_atts['data-vp-slider-effect'] = $options['vp_slider_effect'];

            switch ( $options['vp_slider_items_height_type'] ) {
                case 'auto':
                    $data_atts['data-vp-slider-items-height'] = 'auto';
                    break;
                case 'static':
                    $data_atts['data-vp-slider-items-height'] = ( $options['vp_slider_items_height_static'] ? : '200' ) . 'px';
                    break;
                case 'dynamic':
                    $data_atts['data-vp-slider-items-height'] = ( $options['vp_slider_items_height_dynamic'] ? : '80' ) . '%';
                    break;
                // no default.
            }

            switch ( $options['vp_slider_slides_per_view_type'] ) {
                case 'auto':
                    $data_atts['data-vp-slider-slides-per-view'] = 'auto';
                    break;
                case 'custom':
                    $data_atts['data-vp-slider-slides-per-view'] = $options['vp_slider_slides_per_view_custom'] ? : '3';
                    break;
                // no default.
            }

            $data_atts['data-vp-slider-speed'] = $options['vp_slider_speed'];
            $data_atts['data-vp-slider-autoplay'] = $options['vp_slider_autoplay'];
            $data_atts['data-vp-slider-centered-slides'] = $options['vp_slider_centered_slides'] ? 'true' : 'false';
            $data_atts['data-vp-slider-loop'] = $options['vp_slider_loop'] ? 'true' : 'false';
            $data_atts['data-vp-slider-free-mode'] = $options['vp_slider_free_mode'] ? 'true' : 'false';
            $data_atts['data-vp-slider-arrows'] = $options['vp_slider_arrows'] ? 'true' : 'false';
            $data_atts['data-vp-slider-arrows-icon-prev'] = $options['vp_slider_arrows_icon_prev'] ? : '';
            $data_atts['data-vp-slider-arrows-icon-next'] = $options['vp_slider_arrows_icon_next'] ? : '';
            $data_atts['data-vp-slider-bullets'] = $options['vp_slider_bullets'] ? 'true' : 'false';
            $data_atts['data-vp-slider-bullets-dynamic'] = $options['vp_slider_bullets_dynamic'] ? 'true' : 'false';
        }

        $data_atts = Visual_Portfolio_Extend::portfolio_attrs( $data_atts, $options );

        $class = Visual_Portfolio_Extend::portfolio_class( $class, $options );

        ?>

        <div class="<?php echo esc_attr( $class ); ?>"
            <?php
            foreach ( $data_atts as $name => $data ) {
                if ( 'data-vp-next-page-url' === $name ) {
                    echo esc_html( $name ) . '="' . esc_url( $data ) . '"';
                } else {
                    echo esc_html( $name ) . '="' . esc_attr( $data ) . '"';
                }
            }
            ?>
        >
            <div class="vp-portfolio__preloader-wrap">
                <div class="vp-portfolio__preloader"><span></span><span></span><span></span><span></span><i></i></div>
            </div>

        <?php
        // get options for the current style.
        $style_options = array();
        $style_options_slug = 'vp_items_style_' . $options['vp_items_style'] . '__';
        foreach ( $options as $k => $opt ) {
            // add option to array.
            if ( substr( $k, 0, strlen( $style_options_slug ) ) === $style_options_slug ) {
                $opt_name = str_replace( $style_options_slug, '', $k );
                $style_options[ $opt_name ] = $opt;
            }

            // remove style options from the options list.
            if ( substr( $k, 0, strlen( 'vp_items_style_' ) ) === 'vp_items_style_' ) {
                unset( $options[ $k ] );
            }
        }

        self::filter( $options );

        // Insert styles.
        $items_style_pref = '';
        if ( 'default' !== $options['vp_items_style'] ) {
            $items_style_pref = '/' . $options['vp_items_style'];
        }
        visual_portfolio()->include_template_style( '@@plugin_name-items-style-' . $options['vp_items_style'], 'items-list/items-style' . $items_style_pref . '/style' );
        ?>

        <div class="vp-portfolio__items-wrap">
            <div class="vp-portfolio__items vp-portfolio__items-style-<?php echo esc_attr( $options['vp_items_style'] ); ?>">
                <?php
                $each_item_args = array(
                    'url'             => '',
                    'title'           => '',
                    'excerpt'         => '',
                    'format'          => '',
                    'published'       => '',
                    'published_time'  => '',
                    'filter'          => '',
                    'video'           => '',
                    'image_id'        => '',
                    'image_allowed_html' => array(
                        'img' => array(
                            'src'     => array(),
                            'srcset'  => array(),
                            'sizes'   => array(),
                            'alt'     => array(),
                            'class'   => array(),
                            'width'   => array(),
                            'height'  => array(),
                        ),
                    ),
                    'img_size_popup'  => $img_size_popup,
                    'img_size_md_popup' => $img_size_md_popup,
                    'img_size'        => $img_size,
                    'no_image'        => $no_image,
                    'categories'      => array(),
                    'opts'            => $style_options,
                    'vp_opts'         => $options,
                );

                if ( $is_images ) {
                    foreach ( $query_opts['images'] as $img ) {
                        // Get category taxonomies for data filter.
                        $filter_values  = array();
                        $categories     = array();

                        if ( isset( $img['categories'] ) && is_array( $img['categories'] ) ) {
                            foreach ( $img['categories'] as $cat ) {
                                $slug = self::create_slug( $cat );
                                if ( ! in_array( $slug, $filter_values ) ) {
                                    // add in filter.
                                    $filter_values[] = $slug;

                                    // add in categories array.
                                    $url = self::get_nopaging_url(
                                        false, array(
                                            'vp_filter' => urlencode( $slug ),
                                        )
                                    );
                                    $categories[] = array(
                                        'slug'        => $slug,
                                        'label'       => $cat,
                                        'description' => '',
                                        'count'       => '',
                                        'taxonomy'    => 'category',
                                        'url'         => $url,
                                    );
                                }
                            }
                        }

                        $args = array_merge( $each_item_args, array(
                            'url'             => isset( $img['url'] ) && $img['url'] ? $img['url'] : wp_get_attachment_image_url( $img['id'], $img_size_popup ),
                            'title'           => isset( $img['title'] ) && $img['title'] ? $img['title'] : '',
                            'format'          => isset( $img['format'] ) && $img['format'] ? $img['format'] : 'standard',
                            'published_time'  => '',
                            'filter'          => implode( ',', $filter_values ),
                            'image_id'        => intval( $img['id'] ),
                            'categories'      => $categories,
                        ) );

                        // Excerpt.
                        if ( isset( $args['opts']['show_excerpt'] ) && $args['opts']['show_excerpt'] && isset( $img['description'] ) && $img['description'] ) {
                            $args['excerpt'] = wp_trim_words( $img['description'], $args['opts']['excerpt_words_count'], '...' );
                        }

                        if ( 'video' === $args['format'] && isset( $img['video_url'] ) && $img['video_url'] ) {
                            $args['video'] = $img['video_url'];
                        }

                        self::each_item( $args );
                    }
                } else if ( isset( $portfolio_query ) && $portfolio_query->have_posts() ) {
                    while ( $portfolio_query->have_posts() ) {
                        $portfolio_query->the_post();

                        // Get category taxonomies for data filter.
                        $filter_values  = array();
                        $categories     = array();
                        $all_taxonomies = get_object_taxonomies( get_post() );
                        foreach ( $all_taxonomies as $cat ) {
                            // allow only category taxonomies like category, portfolio_category, etc...
                            if ( strpos( $cat, 'category' ) === false ) {
                                continue;
                            }

                            $category = get_the_terms( get_post(), $cat );

                            if ( $category && ! in_array( $category, $filter_values ) ) {
                                foreach ( $category as $key => $cat_item ) {
                                    // add in filter.
                                    $filter_values[] = $cat_item->slug;

                                    // add in categories array.
                                    $unique_name  = $cat_item->taxonomy . ':' . $cat_item->slug;
                                    $url          = self::get_nopaging_url(
                                        false, array(
                                            'vp_filter' => urlencode( $unique_name ),
                                        )
                                    );
                                    $categories[] = array(
                                        'slug'        => $cat_item->slug,
                                        'label'       => $cat_item->name,
                                        'description' => $cat_item->description,
                                        'count'       => $cat_item->count,
                                        'taxonomy'    => $cat_item->taxonomy,
                                        'url'         => $url,
                                    );
                                }
                            }
                        }

                        $args = array_merge( $each_item_args, array(
                            'url'             => get_permalink(),
                            'title'           => get_the_title(),
                            'format'          => get_post_format() ? : 'standard',
                            'published_time'  => get_the_time( 'U' ),
                            'filter'          => implode( ',', $filter_values ),
                            'image_id'        => get_post_thumbnail_id( get_the_ID() ),
                            'categories'      => $categories,
                        ) );

                        // Excerpt.
                        if ( isset( $args['opts']['show_excerpt'] ) && $args['opts']['show_excerpt'] ) {
                            $args['excerpt'] = wp_trim_words( do_shortcode( has_excerpt() ? get_the_excerpt() : get_the_content() ), $args['opts']['excerpt_words_count'], '...' );
                        }

                        if ( 'video' === $args['format'] ) {
                            $video_url = get_post_meta( get_the_ID(), 'video_url', true );
                            if ( $video_url ) {
                                $args['video'] = $video_url;
                            }
                        }

                        self::each_item( $args );
                    }

                    wp_reset_postdata();
                }

                ?>
            </div>
        </div>

        <?php
        self::pagination( $options, array(
            'start_page' => $start_page,
            'max_pages' => $max_pages,
            'next_page_url' => $next_page_url,
        ) );
        ?>

        </div>

        <?php

        // Add custom styles.
        if ( $options['vp_custom_css'] ) {
            $custom_css_handle = 'vp-custom-css-' . $atts['id'];
            $css = wp_kses( $options['vp_custom_css'], array( '\'', '\"' ) );
            $css = str_replace( '&gt;', '>', $css );

            wp_register_style( $custom_css_handle, false );
            wp_enqueue_style( $custom_css_handle );
            wp_add_inline_style( $custom_css_handle, $css );
        }

        $return = ob_get_contents();
        ob_end_clean();
        return $return;
    }

    /**
     * ID of the current printed single filter
     *
     * @var int
     */
    static private $filter_id = 0;

    /**
     * Print portfolio filter by post ID or options
     *
     * @param array $atts options for portfolio list to print.
     *
     * @return string
     */
    public static function get_filter( $atts = array() ) {
        $options = self::get_options( $atts['id'] );

        $options = array_merge(
            $options, array(
                'vp_filter' => $atts['type'],
                'vp_filter_align' => $atts['align'],
                'vp_filter_show_count' => 'true' === $atts['show_count'],
            )
        );

        // generate unique ID.
        $uid = ++self::$filter_id;
        $uid = hash( 'crc32b', $uid . $atts['id'] );

        $class = 'vp-single-filter vp-filter-uid-' . $uid . ' vp-id-' . $atts['id'];

        // Add custom class.
        if ( isset( $atts['class'] ) ) {
            $class .= ' ' . $atts['class'];
        }

        ob_start();
        ?>
        <div class="<?php echo esc_attr( $class ); ?>">
            <?php self::filter( $options ); ?>
        </div>
        <?php

        $return = ob_get_contents();
        ob_end_clean();
        return $return;
    }

    /**
     * Get current page number
     * /page/2/
     * ?page=2
     *
     * @return int
     */
    private static function get_current_page_number() {
        $page = (int) max( 1, get_query_var( 'page' ), get_query_var( 'paged' ), isset( $_GET['paged'] ) ? (int) $_GET['paged'] : 1 );
        return $page;
    }

    /**
     * Random number for random order.
     *
     * @var int
     */
    static private $rand_seed_session = false;

    /**
     * Get query params array.
     *
     * @param array $options portfolio options.
     * @param bool  $for_filter prevent retrieving GET variable if used for filter.
     *
     * @return array
     */
    private static function get_query_params( $options, $for_filter = false ) {
        $query_opts = array();

        $is_images = 'images' === $options['vp_content_source'];

        $paged = 0;
        if ( $options['vp_pagination'] || $is_images ) {
            $paged = self::get_current_page_number();
        }
        $count = intval( $options['vp_items_count'] );

        if ( $is_images ) {
            $query_opts['images'] = array();

            if ( $count < 0 ) {
                $count = 99999;
            }

            // Load certain taxonomies.
            $images = array();
            if ( ! $for_filter && isset( $_GET['vp_filter'] ) ) {
                $category = sanitize_text_field( wp_unslash( $_GET['vp_filter'] ) );

                foreach ( (array) $options['vp_images'] as $img ) {
                    if ( isset( $img['categories'] ) && is_array( $img['categories'] ) ) {
                        foreach ( $img['categories'] as $cat ) {
                            if ( self::create_slug( $cat ) === $category ) {
                                $images[] = $img;
                                break;
                            }
                        }
                    }
                }
            } else {
                $images = (array) $options['vp_images'];
            }

            $query_opts['max_num_pages'] = ceil( count( $images ) / $count );

            $start_from_item = ( $paged - 1 ) * $count;
            $end_on_item = $start_from_item + $count;

            if ( $for_filter ) {
                $start_from_item = 0;
                $end_on_item = 99999;
            }

            // get images for current page only.
            foreach ( (array) $images as $k => $img ) {
                $i = $k + 1;
                if ( $i > $start_from_item && $i <= $end_on_item ) {
                    $query_opts['images'][] = $img;
                }
            }
        } else {
            $query_opts = array(
                'showposts'  => $count,
                'posts_per_page' => $count,
                'paged'      => $paged,
                'orderby'    => 'post_date',
                'order'      => $options['vp_posts_order_direction'],
                'post_type'  => 'portfolio',
            );

            // Load certain taxonomies.
            if ( ! $for_filter && isset( $_GET['vp_filter'] ) ) {
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

                    // "rand" orderby don't work fine for paged, so we need to use custom solution.
                    // thanks to https://gist.github.com/hlashbrooke/6298714 .
                    case 'rand':
                        // phpcs:disable WordPress.VIP.SessionVariableUsage.SessionVarsProhibited

                        // cache data to further use.
                        if ( ! self::$rand_seed_session ) {
                            // Reset vpf_random_seed on load of initial archive page.
                            if ( self::get_current_page_number() === 1 ) {
                                if ( isset( $_SESSION['vpf_random_seed'] ) ) {
                                    unset( $_SESSION['vpf_random_seed'] );
                                }
                            }

                            // Get vpf_random_seed from session variable if it exists.
                            if ( isset( $_SESSION['vpf_random_seed'] ) ) {
                                self::$rand_seed_session = $_SESSION['vpf_random_seed'];
                            }

                            // Set new vpf_random_seed if none exists.
                            if ( ! self::$rand_seed_session ) {
                                self::$rand_seed_session = rand();
                                $_SESSION['vpf_random_seed'] = self::$rand_seed_session;
                            }
                        }

                        // Update ORDER BY clause to use vpf_random_seed.
                        $query_opts['orderby'] = 'RAND(' . self::$rand_seed_session . ')';

                        // phpcs:enable WordPress.VIP.SessionVariableUsage.SessionVarsProhibited

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
                    if ( ! empty( $options['vp_posts_taxonomies'] ) && ! isset( $query_opts['tax_query'] ) ) {
                        $terms_list = get_terms(
                            get_object_taxonomies(
                                get_post_types(
                                    array(
                                        'public' => false,
                                        'name'   => 'attachment',
                                    ), 'names', 'NOT'
                                )
                            )
                        );

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
        }

        return $query_opts;
    }

    /**
     * Print notice
     *
     * @param string $notice notice string.
     */
    private static function notice( $notice ) {
        if ( ! $notice ) {
            return;
        }
        visual_portfolio()->include_template(
            'notices/notices', array(
                'notice' => $notice,
            )
        );
        visual_portfolio()->include_template_style( '@@plugin_name-notices-default', 'notices/style' );
    }

    /**
     * Print filters
     *
     * @param array $vp_options current vp_list options.
     */
    private static function filter( $vp_options ) {
        if ( ! $vp_options['vp_filter'] ) {
            return;
        }

        $terms = array();
        $there_is_active = false;
        $is_images = 'images' === $vp_options['vp_content_source'];

        // Get active item.
        $active_item = false;
        if ( isset( $_GET['vp_filter'] ) ) {
            $active_item = sanitize_text_field( wp_unslash( $_GET['vp_filter'] ) );
        }

        if ( $is_images ) {
            $query_opts = self::get_query_params( $vp_options, true );

            // calculate categories count.
            $categories_count = array();
            foreach ( $query_opts['images'] as $img ) {
                if ( isset( $img['categories'] ) && is_array( $img['categories'] ) ) {
                    foreach ( $img['categories'] as $cat ) {
                        $categories_count[ $cat ] = ( isset( $categories_count[ $cat ] ) ? $categories_count[ $cat ] : 0 ) + 1;
                    }
                }
            }

            foreach ( $query_opts['images'] as $img ) {
                if ( isset( $img['categories'] ) && is_array( $img['categories'] ) ) {
                    foreach ( $img['categories'] as $cat ) {
                        $slug = self::create_slug( $cat );
                        $url = self::get_nopaging_url(
                            false, array(
                                'vp_filter' => urlencode( $slug ),
                            )
                        );

                        // add in terms array.
                        $terms[ $slug ] = array(
                            'filter'      => $slug,
                            'label'       => $cat,
                            'description' => '',
                            'count'       => isset( $categories_count[ $cat ] ) && $categories_count[ $cat ] ? $categories_count[ $cat ] : '',
                            'taxonomy'    => 'category',
                            'active'      => $active_item === $slug,
                            'url'         => $url,
                            'class'       => 'vp-filter__item' . ( $active_item === $slug ? ' vp-filter__item-active' : '' ),
                        );

                        if ( $active_item === $slug ) {
                            $there_is_active = true;
                        }
                    }
                }
            }
        } else {
            $query_opts = self::get_query_params( $vp_options, true );

            // Get all available categories for current $query_opts.
            // phpcs:ignore
            $query_opts['posts_per_page'] = -1;
            $query_opts['showposts'] = -1;
            $query_opts['paged'] = -1;

            /**
             * TODO: make caching using set_transient function. Info here - https://wordpress.stackexchange.com/a/145960
             */
            $term_ids = array();
            $term_taxonomies = array();
            $portfolio_query = new WP_Query( $query_opts );
            if ( $portfolio_query->have_posts() ) {
                while ( $portfolio_query->have_posts() ) {
                    $portfolio_query->the_post();
                    $all_taxonomies = get_object_taxonomies( get_post() );

                    foreach ( $all_taxonomies as $cat ) {
                        // allow only category taxonomies like category, portfolio_category, etc...
                        // + support for jetpack portfolio-type.
                        if ( strpos( $cat, 'category' ) === false && strpos( $cat, 'jetpack-portfolio-type' ) === false ) {
                            continue;
                        }

                        // Retrieve terms.
                        $category = get_the_terms( get_post(), $cat );
                        if ( ! $category ) {
                            continue;
                        }

                        // Prepare each terms array.
                        foreach ( $category as $key => $cat_item ) {
                            if ( ! in_array( $cat_item->term_id, $term_ids ) ) {
                                $term_ids[] = $cat_item->term_id;
                            }
                            if ( ! in_array( $cat_item->taxonomy, $term_taxonomies ) ) {
                                $term_taxonomies[] = $cat_item->taxonomy;
                            }
                        }
                    }
                }
                wp_reset_postdata();
            }

            // Get all available terms and then pick only needed by ID
            // we need this to support reordering plugins.
            $all_terms = get_terms(
                array(
                    'taxonomy' => $term_taxonomies,
                    'hide_empty' => true,
                )
            );
            if ( isset( $all_terms ) && is_array( $all_terms ) ) {
                foreach ( $all_terms as $term ) {
                    if ( in_array( $term->term_id, $term_ids ) ) {
                        $unique_name = $term->taxonomy . ':' . $term->slug;

                        $url = self::get_nopaging_url(
                            false, array(
                                'vp_filter' => urlencode( $unique_name ),
                            )
                        );

                        $terms[ $unique_name ] = array(
                            'filter'      => $term->slug,
                            'label'       => $term->name,
                            'description' => $term->description,
                            'count'       => $term->count,
                            'taxonomy'    => $term->taxonomy,
                            'active'      => $active_item === $unique_name,
                            'url'         => $url,
                            'class'       => 'vp-filter__item' . ( $active_item === $unique_name ? ' vp-filter__item-active' : '' ),
                        );

                        if ( $active_item === $unique_name ) {
                            $there_is_active = true;
                        }
                    }
                }
            }
        }

        // Add 'All' active item.
        array_unshift(
            $terms, array(
                'filter'      => '*',
                'label'       => esc_html__( 'All', '@@text_domain' ),
                'description' => false,
                'count'       => false,
                'active'      => ! $there_is_active,
                'url'         => remove_query_arg( 'vp_filter', self::get_nopaging_url() ),
                'class'       => 'vp-filter__item' . ( ! $there_is_active ? ' vp-filter__item-active' : '' ),
            )
        );

        // get options for the current filter.
        $filter_options = array();
        $filter_options_slug = 'vp_filter_' . $vp_options['vp_filter'] . '__';
        foreach ( $vp_options as $k => $opt ) {
            // add option to array.
            if ( substr( $k, 0, strlen( $filter_options_slug ) ) === $filter_options_slug ) {
                $opt_name = str_replace( $filter_options_slug, '', $k );
                $filter_options[ $opt_name ] = $opt;
            }

            // remove style options from the options list.
            if ( substr( $k, 0, strlen( $filter_options_slug ) ) === $filter_options_slug ) {
                unset( $vp_options[ $k ] );
            }
        }

        $args = array(
            'class'    => 'vp-filter',
            'items'    => $terms,
            'align'    => $vp_options['vp_filter_align'],
            'show_count' => $vp_options['vp_filter_show_count'],
            'opts'     => $filter_options,
            'vp_opts'  => $vp_options,
        );

        if ( $vp_options['vp_filter_align'] ) {
            $args['class'] .= ' vp-filter__align-' . $vp_options['vp_filter_align'];
        }

        ?>
        <div class="vp-portfolio__filter-wrap">
        <?php

        $filter_style_pref = '';

        if ( 'default' !== $vp_options['vp_filter'] ) {
            $filter_style_pref = '/' . $vp_options['vp_filter'];
        }

        visual_portfolio()->include_template( 'items-list/filter' . $filter_style_pref . '/filter', $args );
        visual_portfolio()->include_template_style( '@@plugin_name-filter-' . $vp_options['vp_filter'], 'items-list/filter' . $filter_style_pref . '/style' );

        ?>
        </div>
        <?php
    }

    /**
     * Print each item
     *
     * @param array $args current item data.
     *      'url' - post/image url.
     *      'title' - post/image title.
     *      'format' - post/image format.
     *      'published' - post/image published.
     *      'published_time' - post/image published time.
     *      'categories' - categories array.
     *      'filter' - filters string.
     *      'video' - video url.
     *      'image_id' - image id.
     *      'image_allowed_html' - image allowed attributes for wp_kses.
     *      'img_size_popup' - image size for popup.
     *      'img_size_md_popup' - md image size for popup.
     *      'img_size' - image size.
     *      'no_image' - no image id.
     *      'opts' - style options.
     *      'vp_opts' - vp options.
     */
    private static function each_item( $args ) {
        // prepare image.
        $args['image'] = wp_get_attachment_image( $args['image_id'], $args['img_size'] );

        // prepare date.
        if ( isset( $args['opts']['show_date'] ) ) {
            if ( 'human' === $args['opts']['show_date'] ) {
                // translators: %s - published in human format.
                $args['published'] = sprintf( esc_html__( '%s ago', '@@text_domain' ), human_time_diff( get_the_time( 'U' ), current_time( 'timestamp' ) ) );
            } else if ( $args['opts']['show_date'] ) {
                $args['published'] = get_the_time( $args['opts']['date_format'] ? : 'F j, Y' );
            }

            // fallback for Visual Portfolio 1.2.1 version.
            $args['opts']['date_human_format'] = 'human' === $args['opts']['show_date'];
            $args['published_human_format'] = $args['published'];
        }

        // add video format args.
        $oembed = false;
        if ( 'video' === $args['format'] && $args['video'] ) {
            $oembed = visual_portfolio()->get_oembed_data( $args['video'] );
        }
        if ( $oembed ) {
            $args['format_video_url']           = $args['video'];
            $args['format_video_oembed']        = $oembed['html'];
            $args['format_video_oembed_width']  = $oembed['width'];
            $args['format_video_oembed_height'] = $oembed['height'];

            if ( ! $args['image'] && isset( $oembed['thumbnail_url'] ) ) {
                $args['image'] = '<img src="' . esc_url( $oembed['thumbnail_url'] ) . '" alt="' . esc_attr( $oembed['title'] ) . '" />';
            }
        }

        // Click action.
        $popup_image = false;
        $popup_video = false;
        switch ( $args['vp_opts']['vp_items_click_action'] ) {
            case 'popup_gallery':
                if ( isset( $args['format_video_oembed'] ) && $args['format_video_oembed'] ) {
                    $popup_video = array(
                        'html' => '<div class="vp-pswp-video"><div>' . $args['format_video_oembed'] . '</div></div>',
                        'width' => $args['format_video_oembed_width'],
                        'height' => $args['format_video_oembed_height'],
                    );
                } else {
                    $img_id = $args['image_id'] ? : $args['no_image'];
                    if ( $img_id ) {
                        $attachment = get_post( $args['image_id'] );
                        if ( $attachment && 'attachment' === $attachment->post_type ) {
                            $img_meta = wp_get_attachment_image_src( $args['image_id'], $args['img_size_popup'] );
                            $img_md_meta = wp_get_attachment_image_src( $args['image_id'], $args['img_size_md_popup'] );
                            $popup_image = array(
                                'title' => $attachment->post_title,
                                'description' => $attachment->post_content,
                                'url' => $img_meta[0],
                                'width' => $img_meta[1],
                                'height' => $img_meta[2],
                                'md_url' => $img_md_meta[0],
                                'md_width' => $img_md_meta[1],
                                'md_height' => $img_md_meta[2],
                            );
                        }
                    }
                }
                break;
            case false:
                $args['url'] = false;
                break;
        }

        // No Image.
        if ( ! $args['image'] && $args['no_image'] ) {
            $args['image'] = wp_get_attachment_image( $args['no_image'], $args['img_size'] );
        }
        ?>

        <div class="vp-portfolio__item-wrap" data-vp-filter="<?php echo esc_attr( $args['filter'] ); ?>">
            <?php
            if ( $popup_image ) {
                ?>
                <div class="vp-portfolio__item-popup"
                     style="display: none;"
                     data-vp-popup-img="<?php echo esc_url( $popup_image['url'] ); ?>"
                     data-vp-popup-img-size="<?php echo esc_attr( $popup_image['width'] . 'x' . $popup_image['height'] ); ?>"
                     data-vp-popup-md-img="<?php echo esc_url( $popup_image['md_url'] ); ?>"
                     data-vp-popup-md-img-size="<?php echo esc_attr( $popup_image['md_width'] . 'x' . $popup_image['md_height'] ); ?>"
                >
                    <h3><?php echo esc_html( $popup_image['title'] ); ?></h3>
                    <?php echo wp_kses_post( $popup_image['description'] ); ?>
                </div>
                <?php
            } else if ( $popup_video ) {
                ?>
                <div class="vp-portfolio__item-popup"
                     style="display: none;"
                     data-vp-popup-video="<?php echo esc_attr( $popup_video['html'] ); ?>"
                     data-vp-popup-video-size="<?php echo esc_attr( $popup_video['width'] . 'x' . $popup_video['height'] ); ?>"
                ></div>
                <?php
            }
            ?>
            <div class="vp-portfolio__item">
                <?php
                $items_style_pref = '';
                if ( 'default' !== $args['vp_opts']['vp_items_style'] ) {
                    $items_style_pref = '/' . $args['vp_opts']['vp_items_style'];
                }
                visual_portfolio()->include_template( 'items-list/items-style' . $items_style_pref . '/image', $args );
                visual_portfolio()->include_template( 'items-list/items-style' . $items_style_pref . '/meta', $args );
                ?>
            </div>
        </div>
        <?php
    }

    /**
     * Print pagination
     *
     * @param array $vp_options - current vp_list options.
     * @param array $args - pagination args.
     *      'start_page'
     *      'max_pages'
     *      'next_page_url'.
     */
    private static function pagination( $vp_options, $args ) {
        if ( ! $vp_options['vp_pagination_style'] || ! $vp_options['vp_pagination'] ) {
            return;
        }

        // get options for the current pagination.
        $pagination_options = array();
        $pagination_options_slug = 'vp_pagination_' . $vp_options['vp_pagination_style'] . '__';
        foreach ( $vp_options as $k => $opt ) {
            // add option to array.
            if ( substr( $k, 0, strlen( $pagination_options_slug ) ) === $pagination_options_slug ) {
                $opt_name = str_replace( $pagination_options_slug, '', $k );
                $pagination_options[ $opt_name ] = $opt;
            }

            // remove style options from the options list.
            if ( substr( $k, 0, strlen( $pagination_options_slug ) ) === $pagination_options_slug ) {
                unset( $vp_options[ $k ] );
            }
        }

        $args = array(
            'type'          => $vp_options['vp_pagination'],
            'next_page_url' => $args['next_page_url'],
            'start_page'    => $args['start_page'],
            'max_pages'     => $args['max_pages'],
            'class'         => 'vp-pagination',
            'align'         => $vp_options['vp_pagination_align'],
            'opts'          => $pagination_options,
            'vp_opts'       => $vp_options,
        );

        if ( ! $args['next_page_url'] ) {
            $args['class'] .= ' vp-pagination__no-more';
        }

        if ( $vp_options['vp_pagination_align'] ) {
            $args['class'] .= ' vp-pagination__align-' . $vp_options['vp_pagination_align'];
        }

        ?>
        <div class="vp-portfolio__pagination-wrap">
        <?php

        $pagination_style_pref = '';
        if ( 'default' !== $vp_options['vp_pagination_style'] ) {
            $pagination_style_pref = '/' . $vp_options['vp_pagination_style'];
        }

        switch ( $vp_options['vp_pagination'] ) {
            case 'infinite':
            case 'load-more':
                visual_portfolio()->include_template( 'items-list/pagination' . $pagination_style_pref . '/' . $vp_options['vp_pagination'], $args );
                visual_portfolio()->include_template_style( '@@plugin_name-pagination-' . $vp_options['vp_pagination_style'], 'items-list/pagination' . $pagination_style_pref . '/style' );
                break;
            default:
                $pagination_links = paginate_links(
                    array(
                        'base' => esc_url_raw( str_replace( 999999999, '%#%', remove_query_arg( 'add-to-cart', get_pagenum_link( 999999999, false ) ) ) ),
                        'format' => '',
                        'type' => 'array',
                        'current' => $args['start_page'],
                        'total' => $args['max_pages'],
                        'prev_text' => '&lt;',
                        'next_text' => '&gt;',
                        'end_size' => 1,
                        'mid_size' => 2,
                    )
                );

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

                            // skip arrows if disabled.
                            if ( ! $vp_options['vp_pagination_paged__show_arrows'] && ( $arr['is_prev_arrow'] || $arr['is_next_arrow'] ) ) {
                                continue;
                            }

                            // skip numbers if disabled.
                            if ( ! $vp_options['vp_pagination_paged__show_numbers'] && ! $arr['is_prev_arrow'] && ! $arr['is_next_arrow'] ) {
                                continue;
                            }

                            $filtered_links[] = $arr;
                        }
                    }
                }

                if ( ! empty( $filtered_links ) ) {
                    $args['items'] = $filtered_links;
                    if ( $vp_options['vp_pagination_paged__show_arrows'] ) {
                        $args['arrows_icon_prev'] = $vp_options['vp_pagination_paged__arrows_icon_prev'];
                        $args['arrows_icon_next'] = $vp_options['vp_pagination_paged__arrows_icon_next'];
                    }
                    visual_portfolio()->include_template( 'items-list/pagination' . $pagination_style_pref . '/paged', $args );
                    visual_portfolio()->include_template_style( '@@plugin_name-pagination-' . $vp_options['vp_pagination_style'], 'items-list/pagination/paged/style' );
                }

                break;
        }

        ?>
        </div>
        <?php
    }

    /**
     * Return current url without page variables.
     *
     * @param string|boolean $current_url - custom page url.
     * @param array          $query_arg - custom query arg.
     * @return string
     */
    private static function get_nopaging_url( $current_url = false, $query_arg = array() ) {

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
     * Create slug from user input string.
     *
     * @param string $str - user string.
     * @param string $delimiter - words delimiter.
     *
     * @return string
     */
    private static function create_slug( $str, $delimiter = '_' ) {
        $slug = $str;

        if ( class_exists( 'Cocur\Slugify\Slugify' ) ) {
            $slugify = new Cocur\Slugify\Slugify();
            $slug = $slugify->slugify( $str, $delimiter );
        }

        return $slug;
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
    private static function extract_tags( $html, $tag, $selfclosing = null, $return_the_entire_tag = false, $charset = 'ISO-8859-1' ) {

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
