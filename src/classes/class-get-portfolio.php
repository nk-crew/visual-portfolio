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
if ( version_compare( PHP_VERSION, '5.5.9' ) >= 0 && ! class_exists( 'Cocur\Slugify\Slugify' ) ) {
    require_once visual_portfolio()->plugin_path . 'vendors/slugify/RuleProvider/RuleProviderInterface.php';
    require_once visual_portfolio()->plugin_path . 'vendors/slugify/RuleProvider/DefaultRuleProvider.php';
    require_once visual_portfolio()->plugin_path . 'vendors/slugify/SlugifyInterface.php';
    require_once visual_portfolio()->plugin_path . 'vendors/slugify/Slugify.php';
}

/**
 * Class Visual_Portfolio_Get
 */
class Visual_Portfolio_Get {
    /**
     * ID of the current printed portfolio
     *
     * @var int
     */
    private static $id = 0;

    /**
     * ID of the current printed single filter
     *
     * @var int
     */
    private static $filter_id = 0;

    /**
     * ID of the current printed single sort
     *
     * @var int
     */
    private static $sort_id = 0;

    /**
     * Random number for random order.
     *
     * @var int
     */
    private static $rand_seed_session = false;

    /**
     * Array with already used IDs on the page. Used for option 'Avoid Duplicates'
     *
     * @var array
     */
    private static $used_posts = array();

    /**
     * Check for main query to avoid duplication.
     *
     * @var array
     */
    private static $check_main_query = true;

    /**
     * Array with all used layout IDs
     *
     * @var array
     */
    private static $used_layouts = array();

    /**
     * Get all available layouts.
     *
     * @return array
     */
    public static function get_all_layouts() {
        // phpcs:ignore
        /*
         * Example:
            array(
                'new_layout' => array(
                    'title'    => esc_html__( 'New Layout', 'text_domain' ),
                    'controls' => array(
                        ... controls ...
                    ),
                ),
            )
         */
        $layouts = apply_filters( 'vpf_extend_layouts', array() );

        // Extend specific layout controls.
        foreach ( $layouts as $name => $layout ) {
            if ( isset( $layout['controls'] ) ) {
                // phpcs:ignore
                /*
                 * Example:
                    array(
                        ... controls ...
                    )
                 */
                $layouts[ $name ]['controls'] = apply_filters( 'vpf_extend_layout_' . $name . '_controls', $layout['controls'] );
            }
        }

        return $layouts;
    }

    /**
     * Get all available items styles.
     *
     * @return array
     */
    public static function get_all_items_styles() {
        // phpcs:ignore
        /*
         * Example:
            array(
                'new_items_style' => array(
                    'title'            => esc_html__( 'New Items Style', '@@text_domain' ),
                    'builtin_controls' => array(
                        'images_rounded_corners' => true,
                        'show_title'             => true,
                        'show_categories'        => true,
                        'show_date'              => true,
                        'show_author'            => true,
                        'show_comments_count'    => true,
                        'show_views_count'       => true,
                        'show_reading_time'      => true,
                        'show_excerpt'           => true,
                        'show_icons'             => false,
                        'align'                  => true,
                    ),
                    'controls'         => array(
                        ... controls ...
                    ),
                ),
            )
         */
        $items_styles = apply_filters( 'vpf_extend_items_styles', array() );

        // Extend specific item style controls.
        foreach ( $items_styles as $name => $style ) {
            if ( isset( $style['controls'] ) ) {
                // phpcs:ignore
                /*
                 * Example:
                    array(
                        ... controls ...
                    )
                 */
                $items_styles[ $name ]['controls'] = apply_filters( 'vpf_extend_item_style_' . $name . '_controls', $style['controls'] );
            }
        }

        return $items_styles;
    }

    /**
     * Get all available options of post.
     *
     * @param array $atts options for portfolio list to print.
     * @return array
     */
    public static function get_options( $atts = array() ) {
        $id       = isset( $atts['id'] ) ? $atts['id'] : false;
        $block_id = isset( $atts['block_id'] ) ? $atts['block_id'] : false;

        if ( ! $id && ! $block_id ) {
            return false;
        }

        $result = array();

        $registered = Visual_Portfolio_Controls::get_registered_array();

        // Get default or saved layout options.
        foreach ( $registered as $item ) {
            if ( isset( $atts[ $item['name'] ] ) ) {
                $result[ $item['name'] ] = $atts[ $item['name'] ];
            } else {
                $result[ $item['name'] ] = Visual_Portfolio_Controls::get_registered_value( $item['name'], $block_id ? false : $id );
            }

            // fix bool values.
            if ( 'false' === $result[ $item['name'] ] ) {
                $result[ $item['name'] ] = false;
            }
            if ( 'true' === $result[ $item['name'] ] ) {
                $result[ $item['name'] ] = true;
            }
        }

        if ( ! isset( $result['id'] ) ) {
            $result['id'] = $block_id ? $block_id : $id;
        }

        // filter.
        $result = apply_filters( 'vpf_get_options', $result, $atts );

        return $result;
    }

    /**
     * Check if portfolio showed in preview mode.
     */
    public static function is_preview() {
        // phpcs:disable
        $frame = isset( $_POST['vp_preview_frame'] ) ? esc_attr( wp_unslash( $_POST['vp_preview_frame'] ) ) : false;
        $id    = isset( $_POST['vp_preview_frame_id'] ) ? esc_attr( wp_unslash( $_POST['vp_preview_frame_id'] ) ) : false;

        // Elementor preview.
        if ( ! $frame && ! $id && isset( $_REQUEST['vp_preview_type'] ) && 'elementor' === $_REQUEST['vp_preview_type'] ) {
            $frame = isset( $_REQUEST['vp_preview_frame'] ) ? esc_attr( wp_unslash( $_REQUEST['vp_preview_frame'] ) ) : false;
        }
        // phpcs:enable

        return 'true' === $frame;
    }

    /**
     * Allow taxonomies to show in Filter
     *
     * @param string $taxonomy taxonomy name.
     *
     * @return bool
     */
    public static function allow_taxonomies_for_filter( $taxonomy ) {
        // check taxonomies from settings.
        $custom_taxonomies        = Visual_Portfolio_Settings::get_option( 'filter_taxonomies', 'vp_general' );
        $custom_taxonomies        = explode( ',', $custom_taxonomies );
        $custom_taxonomies_result = false;
        if ( $custom_taxonomies && ! empty( $custom_taxonomies ) ) {
            foreach ( $custom_taxonomies as $tax ) {
                $custom_taxonomies_result = $custom_taxonomies_result || $taxonomy === $tax;
            }
        }

        return apply_filters(
            'vpf_allow_taxonomy_for_filter',
            $custom_taxonomies_result
                || strpos( $taxonomy, 'category' ) !== false
                || strpos( $taxonomy, 'jetpack-portfolio-type' ) !== false
                || 'product_cat' === $taxonomy,
            $taxonomy
        );
    }

    /**
     * Prepare config, that will be used for output.
     *
     * @param array $atts options for portfolio list to print.
     *
     * @return array|bool
     */
    public static function get_output_config( $atts = array() ) {
        if ( ! is_array( $atts ) ) {
            return '';
        }

        $options = self::get_options( $atts );

        if ( ! $options ) {
            return false;
        }

        do_action( 'vpf_before_get_output', $options );

        self::$used_layouts[] = $options['id'];

        // generate unique ID.
        $uid   = ++self::$id;
        $uid   = hash( 'crc32b', $uid . $options['id'] );
        $class = 'vp-portfolio vp-uid-' . $uid;

        // Add ID to class.
        $class .= ' vp-id-' . $options['id'];

        // Add custom class.
        if ( isset( $atts['class'] ) ) {
            $class .= ' ' . $atts['class'];
        }

        // Add custom CSS from VC.
        if ( function_exists( 'vc_shortcode_custom_css_class' ) && isset( $atts['vc_css'] ) ) {
            $class .= ' ' . vc_shortcode_custom_css_class( $atts['vc_css'] );
        }

        // stretch class.
        if ( $options['stretch'] ) {
            $class .= ' vp-portfolio__stretch';
        }

        // Filter to replace the main layout with custom. Particularly needed for password protection or age verification.
        $custom_output = apply_filters( 'vpf_custom_output', false, $uid, $class, $options );

        if ( $custom_output ) {
            return array(
                'custom_output' => $custom_output,
            );
        }

        $no_image = Visual_Portfolio_Settings::get_option( 'no_image', 'vp_general' );

        // prepare image sizes.
        $img_size_popup    = 'vp_xl_popup';
        $img_size_md_popup = 'vp_md_popup';
        $img_size_sm_popup = 'vp_sm_popup';
        $img_size          = 'vp_xl';
        $columns_count     = false;

        switch ( $options['layout'] ) {
            case 'masonry':
                $columns_count = (int) $options['masonry_columns'];
                break;
            case 'grid':
                $columns_count = (int) $options['grid_columns'];
                break;
            case 'tiles':
                $columns_count = explode( '|', $options['tiles_type'], 1 );
                $columns_count = (int) $columns_count[0];
                break;
        }

        switch ( $columns_count ) {
            case 1:
                $img_size = 'vp_xl';
                break;
            case 2:
                $img_size = 'vp_xl';
                break;
            case 3:
                $img_size = 'vp_xl';
                break;
            case 4:
                $img_size = 'vp_lg';
                break;
            case 5:
                $img_size = 'vp_lg';
                break;
        }

        $is_preview = self::is_preview();
        $start_page = self::get_current_page_number();
        $is_images  = 'images' === $options['content_source'];
        $is_social  = 'social-stream' === $options['content_source'];

        if ( $is_images || $is_social ) {
            $query_opts = self::get_query_params( $options, false, $options['id'] );

            if ( isset( $query_opts['max_num_pages'] ) ) {
                $max_pages = (int) ( $query_opts['max_num_pages'] < $start_page ? $start_page : $query_opts['max_num_pages'] );
            } else {
                $max_pages = $start_page;
            }
        } else {
            // Get query params.
            $query_opts = self::get_query_params( $options, false, $options['id'] );

            // stupid hack as wp_reset_postdata() function is not working for some reason...
            $old_post = $GLOBALS['post'];

            // get Post List.
            $portfolio_query = new WP_Query( $query_opts );

            $max_pages = (int) ( $portfolio_query->max_num_pages < $start_page ? $start_page : $portfolio_query->max_num_pages );
        }

        $next_page_url = ( ! $max_pages || $max_pages >= $start_page + 1 ) ? self::get_pagenum_link(
            array(
                'vp_page' => $start_page + 1,
            )
        ) : false;

        $options['start_page']    = $start_page;
        $options['max_pages']     = $max_pages;
        $options['next_page_url'] = $next_page_url;

        /**
         * Prepare data-attributes.
         */
        $data_attrs = array(
            'data-vp-layout'             => $options['layout'],
            'data-vp-items-style'        => $options['items_style'],
            'data-vp-items-click-action' => $options['items_click_action'],
            'data-vp-items-gap'          => $options['items_gap'],
            'data-vp-items-gap-vertical' => $options['items_gap_vertical'],
            'data-vp-pagination'         => $options['pagination'],
            'data-vp-next-page-url'      => $next_page_url,
        );

        if (
            (
                'post-based' === $options['content_source'] &&
                'rand' === $options['posts_order_by']
            ) ||
            (
                isset( $options['images'] ) &&
                ! empty( $options['images'] ) &&
                is_array( $options['images'] ) &&
                'rand' === $options['images_order_by']
            )
        ) {
            $data_attrs['data-vp-random-seed'] = self::get_rand_seed_session();
        }

        if ( 'tiles' === $options['layout'] || $is_preview ) {
            $data_attrs['data-vp-tiles-type'] = $options['tiles_type'];
        }
        if ( 'masonry' === $options['layout'] || $is_preview ) {
            $data_attrs['data-vp-masonry-columns'] = $options['masonry_columns'];

            if ( $options['masonry_images_aspect_ratio'] ) {
                $data_attrs['data-vp-masonry-images-aspect-ratio'] = $options['masonry_images_aspect_ratio'];
            }
        }
        if ( 'grid' === $options['layout'] || $is_preview ) {
            $data_attrs['data-vp-grid-columns'] = $options['grid_columns'];

            if ( $options['grid_images_aspect_ratio'] ) {
                $data_attrs['data-vp-grid-images-aspect-ratio'] = $options['grid_images_aspect_ratio'];
            }
        }
        if ( 'justified' === $options['layout'] || $is_preview ) {
            $data_attrs['data-vp-justified-row-height']           = $options['justified_row_height'];
            $data_attrs['data-vp-justified-row-height-tolerance'] = $options['justified_row_height_tolerance'];
        }

        if ( 'slider' === $options['layout'] || $is_preview ) {
            $data_attrs['data-vp-slider-effect'] = $options['slider_effect'];

            switch ( $options['slider_items_height_type'] ) {
                case 'auto':
                    $data_attrs['data-vp-slider-items-height'] = 'auto';
                    break;
                case 'static':
                    $data_attrs['data-vp-slider-items-height']     = ( $options['slider_items_height_static'] ? $options['slider_items_height_static'] : '200' ) . 'px';
                    $data_attrs['data-vp-slider-items-min-height'] = $options['slider_items_min_height'];
                    break;
                case 'dynamic':
                    $data_attrs['data-vp-slider-items-height']     = ( $options['slider_items_height_dynamic'] ? $options['slider_items_height_dynamic'] : '80' ) . '%';
                    $data_attrs['data-vp-slider-items-min-height'] = $options['slider_items_min_height'];
                    break;
                // no default.
            }

            switch ( $options['slider_slides_per_view_type'] ) {
                case 'auto':
                    $data_attrs['data-vp-slider-slides-per-view'] = 'auto';
                    break;
                case 'custom':
                    $data_attrs['data-vp-slider-slides-per-view'] = $options['slider_slides_per_view_custom'] ? $options['slider_slides_per_view_custom'] : '3';
                    break;
                // no default.
            }

            $data_attrs['data-vp-slider-speed']                = $options['slider_speed'];
            $data_attrs['data-vp-slider-autoplay']             = $options['slider_autoplay'];
            $data_attrs['data-vp-slider-autoplay-hover-pause'] = $options['slider_autoplay_hover_pause'] ? 'true' : 'false';
            $data_attrs['data-vp-slider-centered-slides']      = $options['slider_centered_slides'] ? 'true' : 'false';
            $data_attrs['data-vp-slider-loop']                 = $options['slider_loop'] ? 'true' : 'false';
            $data_attrs['data-vp-slider-free-mode']            = $options['slider_free_mode'] ? 'true' : 'false';
            $data_attrs['data-vp-slider-free-mode-sticky']     = $options['slider_free_mode_sticky'] ? 'true' : 'false';
            $data_attrs['data-vp-slider-arrows']               = $options['slider_arrows'] ? 'true' : 'false';
            $data_attrs['data-vp-slider-bullets']              = $options['slider_bullets'] ? 'true' : 'false';
            $data_attrs['data-vp-slider-bullets-dynamic']      = $options['slider_bullets_dynamic'] ? 'true' : 'false';
            $data_attrs['data-vp-slider-mousewheel']           = $options['slider_mousewheel'] ? 'true' : 'false';

            $data_attrs['data-vp-slider-thumbnails'] = $options['slider_thumbnails'] ? 'true' : 'false';

            if ( $options['slider_thumbnails'] ) {
                $data_attrs['data-vp-slider-thumbnails-height'] = 'auto';
                $data_attrs['data-vp-slider-thumbnails-gap']    = $options['slider_thumbnails_gap'] ? $options['slider_thumbnails_gap'] : '0';

                switch ( $options['slider_thumbnails_height_type'] ) {
                    case 'auto':
                        $data_attrs['data-vp-slider-thumbnails-height'] = 'auto';
                        break;
                    case 'static':
                        $data_attrs['data-vp-slider-thumbnails-height'] = ( $options['slider_thumbnails_height_static'] ? $options['slider_thumbnails_height_static'] : '100' ) . 'px';
                        break;
                    case 'dynamic':
                        $data_attrs['data-vp-slider-thumbnails-height'] = ( $options['slider_thumbnails_height_dynamic'] ? $options['slider_thumbnails_height_dynamic'] : '30' ) . '%';
                        break;
                    // no default.
                }

                switch ( $options['slider_thumbnails_per_view_type'] ) {
                    case 'auto':
                        $data_attrs['data-vp-slider-thumbnails-per-view'] = 'auto';
                        break;
                    case 'custom':
                        $data_attrs['data-vp-slider-thumbnails-per-view'] = $options['slider_thumbnails_per_view_custom'] ? $options['slider_thumbnails_per_view_custom'] : '6';
                        break;
                    // no default.
                }
            }
        }

        // get options for the current style.
        $style_options      = array();
        $style_options_slug = 'items_style_' . $options['items_style'] . '__';
        foreach ( $options as $k => $opt ) {
            // add option to array.
            if ( substr( $k, 0, strlen( $style_options_slug ) ) === $style_options_slug ) {
                $opt_name = str_replace( $style_options_slug, '', $k );

                $style_options[ $opt_name ] = $opt;
            }

            // remove style options from the options list.
            if ( substr( $k, 0, strlen( 'items_style_' ) ) === 'items_style_' ) {
                unset( $options[ $k ] );
            }
        }

        // phpcs:ignore
        /*
         * Example:
            array(
                'data-vp-my-attribute' => 'data',
            )
         */
        $data_attrs = apply_filters( 'vpf_extend_portfolio_data_attributes', $data_attrs, $options, $style_options );
        $class      = apply_filters( 'vpf_extend_portfolio_class', $class, $options, $style_options );

        $items_class = 'vp-portfolio__items vp-portfolio__items-style-' . $options['items_style'];

        if ( isset( $style_options['show_overlay'] ) && $style_options['show_overlay'] ) {
            $items_class .= ' vp-portfolio__items-show-overlay-' . $style_options['show_overlay'];
        }

        if ( isset( $style_options['show_img_overlay'] ) && $style_options['show_img_overlay'] ) {
            $items_class .= ' vp-portfolio__items-show-img-overlay-' . $style_options['show_img_overlay'];
        }

        $items_class = apply_filters( 'vpf_extend_portfolio_items_class', $items_class, $options, $style_options );

        /**
         * Prepare each item args.
         */
        $each_item_args = array(
            'uid'                => '',
            'post_id'            => '',
            'url'                => '',
            'title'              => '',
            'excerpt'            => '',
            'comments_count'     => '',
            'comments_url'       => '',
            'author'             => '',
            'author_url'         => '',
            'author_avatar'      => '',
            'views_count'        => '',
            'reading_time'       => '',
            'format'             => '',
            'published'          => '',
            'published_time'     => '',
            'categories'         => array(),
            'filter'             => '',
            'video'              => '',
            'image_id'           => '',
            // wp_kses allowed attributes for image
            // extended in class-images for lazyloading support.
            //
            // DEPRECATED, but we should keep it, as a lot of custom user templates may still use it.
            'image_allowed_html' => array(
                'img' => array(
                    'src'    => array(),
                    'srcset' => array(),
                    'sizes'  => array(),
                    'alt'    => array(),
                    'class'  => array(),
                    'width'  => array(),
                    'height' => array(),
                ),
            ),
            'img_size_popup'     => $img_size_popup,
            'img_size_md_popup'  => $img_size_md_popup,
            'img_size_sm_popup'  => $img_size_sm_popup,
            'img_size'           => $img_size,
            'no_image'           => $no_image,
            'opts'               => $style_options,
            'vp_opts'            => $options,
        );
        $items = array();

        if ( ( $is_images || $is_social ) &&
            isset( $query_opts['images'] ) &&
            is_array( $query_opts['images'] ) &&
            ! empty( $query_opts['images'] ) ) {

            foreach ( $query_opts['images'] as $img ) {
                // Get category taxonomies for data filter.
                $filter_values = array();
                $categories    = array();

                if ( isset( $img['categories'] ) && is_array( $img['categories'] ) ) {
                    foreach ( $img['categories'] as $cat ) {
                        $slug = self::create_slug( $cat );
                        if ( ! in_array( $slug, $filter_values, true ) ) {
                            // add in filter.
                            $filter_values[] = $slug;

                            // add in categories array.
                            $url = self::get_pagenum_link(
                                array(
                                    'vp_filter' => rawurlencode( $slug ),
                                    'vp_page'   => 1,
                                )
                            );

                            $categories[] = array(
                                'slug'        => $slug,
                                'label'       => $cat,
                                'description' => '',
                                'count'       => '',
                                'taxonomy'    => '',
                                'id'          => 0,
                                'parent'      => 0,
                                'url'         => $url,
                            );
                        }
                    }
                }

                $args = array_merge(
                    $each_item_args,
                    array(
                        'uid'            => isset( $img['uid'] ) && $img['uid'] ? $img['uid'] : '',
                        'url'            => isset( $img['url'] ) && $img['url'] ? $img['url'] : Visual_Portfolio_Images::wp_get_attachment_image_url( $img['id'], $img_size_popup ),
                        'title'          => isset( $img['title'] ) && $img['title'] ? $img['title'] : '',
                        'format'         => isset( $img['format'] ) && $img['format'] ? $img['format'] : 'standard',
                        'published_time' => isset( $img['published_time'] ) && $img['published_time'] ? $img['published_time'] : '',
                        'filter'         => implode( ',', $filter_values ),
                        'image_id'       => intval( $img['id'] ),
                        'focal_point'    => isset( $img['focalPoint'] ) && $img['focalPoint'] ? $img['focalPoint'] : '',
                        'allow_popup'    => ! isset( $img['url'] ) || ! $img['url'],
                        'categories'     => $categories,
                        'author'         => isset( $img['author'] ) && $img['author'] ? $img['author'] : '',
                        'author_url'     => isset( $img['author'] ) && isset( $img['author_url'] ) && $img['author'] && $img['author_url'] ? $img['author_url'] : '',
                    )
                );

                // Excerpt.
                if ( isset( $args['opts']['show_excerpt'] ) && $args['opts']['show_excerpt'] && isset( $img['description'] ) && $img['description'] ) {
                    $args['excerpt'] = wp_trim_words( $img['description'], $args['opts']['excerpt_words_count'], '...' );
                }

                if ( 'video' === $args['format'] && isset( $img['video_url'] ) && $img['video_url'] ) {
                    $args['video'] = $img['video_url'];
                }

                $args = apply_filters( 'vpf_image_item_args', $args, $img );

                $items[] = $args;
            }
        } elseif ( isset( $portfolio_query ) ) {
            while ( $portfolio_query->have_posts() ) {
                $portfolio_query->the_post();

                $the_post = get_post();

                self::$used_posts[] = get_the_ID();

                // Get category taxonomies for data filter.
                $filter_values  = array();
                $categories     = array();
                $all_taxonomies = get_object_taxonomies( $the_post );

                foreach ( $all_taxonomies as $cat ) {
                    // allow only specific taxonomies for filter.
                    if ( ! self::allow_taxonomies_for_filter( $cat ) ) {
                        continue;
                    }

                    $category = get_the_terms( $the_post, $cat );

                    if ( $category && ! in_array( $category, $filter_values, true ) ) {
                        foreach ( $category as $key => $cat_item ) {
                            // add in filter.
                            $filter_values[] = $cat_item->slug;

                            // add in categories array.
                            $unique_name  = rawurlencode( $cat_item->taxonomy . ':' ) . $cat_item->slug;
                            $url          = self::get_pagenum_link(
                                array(
                                    'vp_filter' => $unique_name,
                                    'vp_page'   => 1,
                                )
                            );
                            $categories[] = array(
                                'slug'        => $cat_item->slug,
                                'label'       => $cat_item->name,
                                'description' => $cat_item->description,
                                'count'       => $cat_item->count,
                                'taxonomy'    => $cat_item->taxonomy,
                                'id'          => $cat_item->term_id,
                                'parent'      => $cat_item->parent,
                                'url'         => $url,
                            );
                        }
                    }
                }

                $args = array_merge(
                    $each_item_args,
                    array(
                        'uid'            => hash( 'crc32b', 'post-' . get_the_ID() ),
                        'post_id'        => get_the_ID(),
                        'url'            => get_permalink(),
                        'title'          => get_the_title(),
                        'format'         => get_post_format() ? get_post_format() : 'standard',
                        'published_time' => get_the_date( 'Y-m-d H:i:s', $the_post ),
                        'filter'         => implode( ',', $filter_values ),
                        'image_id'       => 'attachment' === get_post_type() ? get_the_ID() : get_post_thumbnail_id( get_the_ID() ),
                        'focal_point'    => Visual_Portfolio_Custom_Post_Meta::get_featured_image_focal_point( get_the_ID() ),
                        'categories'     => $categories,
                        'comments_count' => get_comments_number( get_the_ID() ),
                        'comments_url'   => get_comments_link( get_the_ID() ),
                        'views_count'    => Visual_Portfolio_Custom_Post_Meta::get_views_count( get_the_ID() ),
                        'reading_time'   => Visual_Portfolio_Custom_Post_Meta::get_reading_time( get_the_ID() ),
                    )
                );

                // Author.
                $author_id = get_the_author_meta( 'ID' );
                if ( $author_id ) {
                    $args['author']        = get_the_author();
                    $args['author_url']    = get_author_posts_url( $author_id );
                    $args['author_avatar'] = get_avatar_url( $author_id, array( 'size' => 50 ) );
                }

                // Excerpt.
                if ( isset( $args['opts']['show_excerpt'] ) && $args['opts']['show_excerpt'] ) {
                    $args['excerpt'] = wp_trim_words( do_shortcode( has_excerpt() ? get_the_excerpt() : get_the_content() ), $args['opts']['excerpt_words_count'], '...' );
                }

                $args['allow_popup'] = isset( $args['image_id'] ) && $args['image_id'];

                if ( 'video' === $args['format'] ) {
                    $video_url = Visual_Portfolio_Custom_Post_Meta::get_video_format_url( get_the_ID() );
                    if ( $video_url ) {
                        $args['video']       = $video_url;
                        $args['allow_popup'] = true;
                    }
                }

                $args = apply_filters( 'vpf_post_item_args', $args, $args['post_id'] );

                $items[] = $args;
            }

            $portfolio_query->reset_postdata();

            // Sometimes, when we use WPBakery Page Builder, without this reset output is wrong.
            wp_reset_postdata();

            // stupid hack as wp_reset_postdata() function is not working in some situations...
            // phpcs:ignore
            $GLOBALS['post'] = $old_post;
        }

        $notices = array();

        // No items found notice.
        if ( empty( $items ) ) {
            $class .= ' vp-portfolio-not-found';

            // Don't display any output if no items found (works on frontend only).
            if ( $options['no_items_notice'] && ( $is_preview || 'notice' === $options['no_items_action'] ) ) {
                $notices[] = $options['no_items_notice'];
            }
        }

        $result = array(
            'options'           => $options,
            'style_options'     => $style_options,
            'class'             => $class,
            'data_attrs'        => $data_attrs,
            'items_class'       => $items_class,
            'items'             => $items,
            'notices'           => $notices,
            'img_size_popup'    => $img_size_popup,
            'img_size_md_popup' => $img_size_md_popup,
            'img_size_sm_popup' => $img_size_sm_popup,
            'img_size'          => $img_size,
        );

        return $result;
    }

    /**
     * Print portfolio by post ID or options
     *
     * @param array $atts options for portfolio list to print.
     *
     * @return string
     */
    public static function get( $atts = array() ) {
        $config = self::get_output_config( $atts );

        if ( ! $config ) {
            return '';
        }

        if ( isset( $config['custom_output'] ) ) {
            return $config['custom_output'];
        }

        $options       = $config['options'];
        $style_options = $config['style_options'];
        $data_attrs    = $config['data_attrs'];
        $class         = $config['class'];
        $items         = $config['items'];
        $items_class   = $config['items_class'];
        $notices       = $config['notices'];

        // Insert styles and scripts.
        Visual_Portfolio_Assets::enqueue( $atts );

        // No items found.
        if ( empty( $items ) ) {
            if ( empty( $notices ) ) {
                return '';
            }

            ob_start();

            ?>
            <div class="<?php echo esc_attr( $class ); ?>">
                <?php
                foreach ( $notices as $notice ) {
                    self::notice( $notice );
                }
                ?>
            </div>
            <?php

            return ob_get_clean();
        }

        ob_start();

        /**
         * Wrapper start.
         */
        do_action( 'vpf_before_wrapper_start', $options, $style_options );

        visual_portfolio()->include_template(
            'items-list/wrapper-start',
            array(
                'options'       => $options,
                'style_options' => $style_options,
                'data_attrs'    => $data_attrs,
                'class'         => $class,
            )
        );

        do_action( 'vpf_after_wrapper_start', $options, $style_options );

        /**
         * Top layout elements.
         */
        self::print_layout_elements( 'top', $options );

        /**
         * Items wrap.
         */
        ?>
        <div class="vp-portfolio__items-wrap">
            <?php

            /**
             * Items wrapper start.
             */
            do_action( 'vpf_before_items_wrapper_start', $options, $style_options );

            visual_portfolio()->include_template(
                'items-list/items-wrapper-start',
                array(
                    'options'       => $options,
                    'style_options' => $style_options,
                    'class'         => $items_class,
                )
            );

            do_action( 'vpf_after_items_wrapper_start', $options, $style_options );

            /**
             * Each item.
             */
            if ( is_array( $items ) && ! empty( $items ) ) {
                foreach ( $items as $item_args ) {
                    self::each_item( $item_args );
                }
            }

            /**
             * Items wrapper end.
             */
            do_action( 'vpf_before_items_wrapper_end', $options, $style_options );

            visual_portfolio()->include_template(
                'items-list/items-wrapper-end',
                array(
                    'options'       => $options,
                    'style_options' => $style_options,
                )
            );

            do_action( 'vpf_after_items_wrapper_end', $options, $style_options );

            // Slider arrows and bullets.
            if ( 'slider' === $options['layout'] ) {
                if ( $options['slider_arrows'] ) {
                    visual_portfolio()->include_template(
                        'items-list/layouts/slider/arrows',
                        array(
                            'options'       => $options,
                            'style_options' => $style_options,
                        )
                    );
                }
                if ( $options['slider_bullets'] ) {
                    visual_portfolio()->include_template(
                        'items-list/layouts/slider/bullets',
                        array(
                            'options'       => $options,
                            'style_options' => $style_options,
                        )
                    );
                }
            }

            ?>
        </div>
        <?php

        /**
         * Carousel thumbnails.
         */
        if ( 'slider' === $options['layout'] && $options['slider_thumbnails'] ) {
            $slider_thumbnails = array();

            if ( is_array( $items ) && ! empty( $items ) ) {
                foreach ( $items as $item_args ) {
                    $slider_thumbnails[] = $item_args['image_id'];
                }
            }

            visual_portfolio()->include_template(
                'items-list/layouts/slider/thumbnails',
                array(
                    'options'       => $options,
                    'style_options' => $style_options,
                    'thumbnails'    => $slider_thumbnails,
                    'img_size'      => $config['img_size'],
                )
            );
        }

        /**
         * Bottom layout elements.
         */
        self::print_layout_elements( 'bottom', $options );

        /**
         * Wrapper end.
         */
        do_action( 'vpf_before_wrapper_end', $options, $style_options );

        visual_portfolio()->include_template(
            'items-list/wrapper-end',
            array(
                'options'       => $options,
                'style_options' => $style_options,
            )
        );

        do_action( 'vpf_after_wrapper_end', $options, $style_options );

        do_action( 'vpf_after_get_output', $options, $style_options );

        return ob_get_clean();
    }

    /**
     * Print layout elements like Filter, Sort, Search and Pagination.
     *
     * @param string $position elements position.
     * @param array  $options options for portfolio list to print.
     */
    public static function print_layout_elements( $position, $options ) {
        $layout_elements = $options['layout_elements'];

        if ( ! isset( $layout_elements[ $position ] ) || ! isset( $layout_elements[ $position ]['elements'] ) ) {
            return;
        }

        $registered   = Visual_Portfolio_Controls::get_registered_array();
        $control_data = $registered['layout_elements'];
        $class_name   = 'vp-portfolio__layout-elements';

        if ( $position ) {
            $class_name .= ' vp-portfolio__layout-elements-' . $position;
        }

        if ( isset( $layout_elements[ $position ]['align'] ) ) {
            $class_name .= ' vp-portfolio__layout-elements-align-' . $layout_elements[ $position ]['align'];
        }

        ob_start();
        foreach ( $layout_elements[ $position ]['elements'] as $element ) {
            if ( isset( $control_data['options'][ $element ]['render_callback'] ) && is_callable( $control_data['options'][ $element ]['render_callback'] ) ) {
                call_user_func( $control_data['options'][ $element ]['render_callback'], $options, $element, $position );
            }
            do_action( 'vpf_layout_elements', $options, $element, $position );
        }
        $elements_content = ob_get_contents();
        ob_end_clean();

        if ( ! $elements_content ) {
            return;
        }

        ?>
        <div class="<?php echo esc_attr( $class_name ); ?>">
        <?php

        // phpcs:ignore
        echo $elements_content;

        ?>
        </div>
        <?php
    }

    /**
     * Print portfolio filter by post ID or options
     *
     * @param array $atts options for portfolio list to print.
     *
     * @return string
     */
    public static function get_filter( $atts = array() ) {
        $options = self::get_options( $atts );

        $options = array_merge(
            $options,
            array(
                'filter'            => $atts['type'],
                'filter_align'      => $atts['align'],
                'filter_show_count' => 'true' === $atts['show_count'],
            )
        );

        // generate unique ID.
        $uid = ++self::$filter_id;
        $uid = hash( 'crc32b', $uid . $options['id'] );

        $class = 'vp-single-filter vp-filter-uid-' . $uid . ' vp-id-' . $options['id'];

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

        return ob_get_clean();
    }

    /**
     * Print portfolio sort by post ID or options
     *
     * @param array $atts options for portfolio list to print.
     *
     * @return string
     */
    public static function get_sort( $atts = array() ) {
        $options = self::get_options( $atts );

        $options = array_merge(
            $options,
            array(
                'sort'       => $atts['type'],
                'sort_align' => $atts['align'],
            )
        );

        // generate unique ID.
        $uid = ++self::$sort_id;
        $uid = hash( 'crc32b', $uid . $options['id'] );

        $class = 'vp-single-sort vp-sort-uid-' . $uid . ' vp-id-' . $options['id'];

        // Add custom class.
        if ( isset( $atts['class'] ) ) {
            $class .= ' ' . $atts['class'];
        }

        ob_start();

        ?>
        <div class="<?php echo esc_attr( $class ); ?>">
            <?php self::sort( $options ); ?>
        </div>
        <?php

        return ob_get_clean();
    }

    /**
     * Get current page number
     * ?vp_page=2
     *
     * @return int
     */
    private static function get_current_page_number() {
        // phpcs:ignore
        return max( 1, isset( $_GET['vp_page'] ) ? (int) $_GET['vp_page'] : 1 );
    }

    /**
     * "rand" orderby don't work fine for paged, so we need to use custom solution.
     * thanks to https://gist.github.com/hlashbrooke/6298714 .
     */
    private static function get_rand_seed_session() {
        // already prepared.
        if ( self::$rand_seed_session ) {
            return self::$rand_seed_session;
        }

        // Reset vpf_random_seed on load of initial archive page.
        if ( self::get_current_page_number() === 1 ) {
            if ( isset( self::$rand_seed_session ) ) {
                self::$rand_seed_session = false;
            }
        }

        // Get vpf_random_seed from request variable if it exists.
        // phpcs:ignore
        if ( isset( $_REQUEST['vpf_random_seed'] ) && is_numeric( $_REQUEST['vpf_random_seed'] ) ) {
            // phpcs:ignore
            self::$rand_seed_session = (int) $_REQUEST['vpf_random_seed'];
        }

        // Set new vpf_random_seed if none exists.
        if ( ! self::$rand_seed_session ) {
            // phpcs:ignore
            self::$rand_seed_session = rand();
        }

        return self::$rand_seed_session;
    }

    /**
     * Get query params array.
     *
     * @param array $options portfolio options.
     * @param bool  $for_filter prevent retrieving GET variable if used for filter.
     * @param int   $layout_id portfolio layout id.
     *
     * @return array
     */
    private static function get_query_params( $options, $for_filter = false, $layout_id = false ) {
        $options    = apply_filters( 'vpf_extend_options_before_query_args', $options, $layout_id );
        $query_opts = array();
        $is_images  = 'images' === $options['content_source'];

        $paged = 0;
        if ( $options['pagination'] || $is_images ) {
            $paged = self::get_current_page_number();
        }
        $count = intval( $options['items_count'] );

        if ( $is_images ) {
            $query_opts['images'] = array();

            if ( ! isset( $options['images'] ) || ! is_array( $options['images'] ) ) {
                $options['images'] = array();
            }

            // add unique IDs.
            foreach ( $options['images'] as $k => $img ) {
                $options['images'][ $k ]['uid'] = hash( 'crc32b', 'image-' . $k . $img['id'] );
            }

            if ( $count < 0 ) {
                $count = 99999;
            }

            // Load certain taxonomies.
            $images = array();

            // phpcs:ignore
            if ( ! $for_filter && isset( $_GET['vp_filter'] ) ) {
                // phpcs:ignore
                $category = sanitize_text_field( wp_unslash( $_GET['vp_filter'] ) );

                foreach ( $options['images'] as $img ) {
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
                $images = $options['images'];
            }

            $images_ids = array();
            foreach ( $images as $k => $img ) {
                $images_ids[] = (int) $img['id'];
            }

            // Find all used attachments.
            $all_attachments = get_posts(
                array(
                    'post_type'      => 'attachment',
                    'posts_per_page' => -1,
                    'paged'          => -1,
                    'post__in'       => $images_ids,
                )
            );

            // prepare titles and descriptions.
            foreach ( $images as $k => $img ) {
                $img_meta = array(
                    'title'       => '',
                    'description' => '',
                    'caption'     => '',
                    'alt'         => '',
                    'none'        => '',
                    'date'        => '',
                );

                // Find current attachment post data.
                $attachment = false;
                foreach ( $all_attachments as $post ) {
                    if ( $post->ID === (int) $img['id'] ) {
                        $attachment = $post;
                        break;
                    }
                }

                if ( $attachment ) {
                    // get image meta if needed.
                    if ( 'none' !== $options['images_titles_source'] || 'none' !== $options['images_descriptions_source'] ) {
                        if ( $attachment && 'attachment' === $attachment->post_type ) {
                            $img_meta['title']       = $attachment->post_title;
                            $img_meta['description'] = $attachment->post_content;
                            $img_meta['caption']     = wp_get_attachment_caption( $attachment->ID );
                            $img_meta['alt']         = get_post_meta( $attachment->ID, '_wp_attachment_image_alt', true );
                        }
                    }

                    // title.
                    if ( 'custom' !== $options['images_titles_source'] ) {
                        $images[ $k ]['title'] = isset( $img_meta[ $options['images_titles_source'] ] ) ? $img_meta[ $options['images_titles_source'] ] : '';
                    }

                    // description.
                    if ( 'custom' !== $options['images_descriptions_source'] ) {
                        $images[ $k ]['description'] = isset( $img_meta[ $options['images_descriptions_source'] ] ) ? $img_meta[ $options['images_descriptions_source'] ] : '';
                    }

                    // add published date.
                    $images[ $k ]['published_time'] = get_the_date( 'Y-m-d H:i:s', $attachment );
                }
            }

            // order.
            $custom_order           = false;
            $custom_order_direction = $options['images_order_direction'];

            if ( isset( $options['images_order_by'] ) ) {
                $custom_order = $options['images_order_by'];
            }

            // custom sorting.
            // phpcs:ignore
            if ( isset( $_GET['vp_sort'] ) ) {
                // phpcs:ignore
                $custom_get_order = sanitize_text_field( wp_unslash( $_GET['vp_sort'] ) );

                switch ( $custom_get_order ) {
                    case 'title':
                    case 'date':
                        $custom_order           = $custom_get_order;
                        $custom_order_direction = 'asc';
                        break;
                    case 'title_desc':
                        $custom_order           = 'title';
                        $custom_order_direction = 'desc';
                        break;
                    case 'date_desc':
                        $custom_order           = 'date';
                        $custom_order_direction = 'desc';
                        break;
                }
            }

            if ( $custom_order && ! empty( $images ) ) {
                switch ( $custom_order ) {
                    case 'date':
                    case 'title':
                        $sort_tmp   = array();
                        $new_images = array();
                        $sort_by    = 'date';

                        if ( 'title' === $custom_order ) {
                            $sort_by = 'title';
                        }

                        foreach ( $images as &$ma ) {
                            $sort_tmp[] = &$ma[ $sort_by ];
                        }

                        array_multisort( $sort_tmp, $images );
                        foreach ( $images as &$ma ) {
                            $new_images[] = $ma;
                        }

                        $images = $new_images;
                        break;
                    case 'rand':
                        // We don't need to randomize order for filter,
                        // because filter list will be always changed once AJAX loaded.
                        if ( ! $for_filter ) {
                            // phpcs:ignore
                            mt_srand( self::get_rand_seed_session() );

                            for ( $i = count( $images ) - 1; $i > 0; $i-- ) {
                                // phpcs:ignore
                                $j            = @mt_rand( 0, $i );
                                $tmp          = $images[ $i ];
                                $images[ $i ] = $images[ $j ];
                                $images[ $j ] = $tmp;
                            }
                        }

                        break;
                }
                if ( 'desc' === $custom_order_direction ) {
                    $images = array_reverse( $images );
                }
            }

            // pages count.
            $query_opts['max_num_pages'] = ceil( count( $images ) / $count );

            $start_from_item = ( $paged - 1 ) * $count;
            $end_on_item     = $start_from_item + $count;

            if ( $for_filter ) {
                $start_from_item = 0;
                $end_on_item     = 99999;
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
                'posts_per_page' => $count,
                'paged'          => $paged,
                'orderby'        => 'post_date',
                'order'          => 'DESC',
                'post_type'      => 'portfolio',
            );

            // Get all available categories for filter.
            if ( $for_filter ) {
                $query_opts['posts_per_page'] = -1;
                $query_opts['paged']          = -1;
            }

            // Post based.
            if ( 'post-based' === $options['content_source'] ) {
                // Exclude IDs.
                if ( ! empty( $options['posts_excluded_ids'] ) ) {
                    $query_opts['post__not_in'] = $options['posts_excluded_ids'];
                }

                // Order By.
                switch ( $options['posts_order_by'] ) {
                    case 'title':
                        $query_opts['orderby'] = 'title';
                        break;

                    case 'id':
                        $query_opts['orderby'] = 'ID';
                        break;

                    case 'post__in':
                        $query_opts['orderby'] = 'post__in';
                        break;

                    case 'menu_order':
                        // We should order by `menu_order` and as fallback order by `post_date`.
                        $query_opts['orderby'] = array(
                            'menu_order' => $options['posts_order_direction'],
                            'post_date'  => 'desc',
                        );
                        break;

                    case 'comment_count':
                        $query_opts['orderby'] = 'comment_count';
                        break;

                    case 'modified':
                        $query_opts['orderby'] = 'modified';
                        break;

                    case 'rand':
                        // Update ORDER BY clause to use vpf_random_seed.
                        $query_opts['orderby'] = 'RAND(' . self::get_rand_seed_session() . ')';
                        break;

                    default:
                        $query_opts['orderby'] = 'post_date';
                        break;
                }

                // Order.
                $query_opts['order'] = $options['posts_order_direction'];

                if ( 'ids' === $options['posts_source'] ) { // IDs.
                    $query_opts['post_type']    = 'any';
                    $query_opts['post__not_in'] = array();

                    if ( ! empty( $options['posts_ids'] ) ) {
                        $query_opts['post__in'] = $options['posts_ids'];
                    }
                } elseif ( 'custom_query' === $options['posts_source'] ) { // Custom Query.
                    $query_opts['post_type'] = 'any';

                    $tmp_arr = array();
                    parse_str( html_entity_decode( $options['posts_custom_query'] ), $tmp_arr );
                    $query_opts = array_merge( $query_opts, $tmp_arr );
                } elseif ( 'current_query' === $options['posts_source'] ) {
                    global $wp_query;

                    if ( $wp_query && isset( $wp_query->query_vars ) && is_array( $wp_query->query_vars ) ) {
                        $query_vars = $wp_query->query_vars;

                        // Unset `offset` because if is set, $wp_query overrides/ignores the paged parameter and breaks pagination.
                        if ( isset( $query_vars['offset'] ) ) {
                            unset( $query_vars['offset'] );
                        }

                        // Add post type.
                        if ( empty( $query_vars['post_type'] ) && is_singular() ) {
                            $query_vars['post_type'] = get_post_type( get_the_ID() );
                        }

                        // Add pagination paged value.
                        if ( $query_opts['paged'] && ( ! isset( $query_vars['paged'] ) || ! $query_vars['paged'] ) ) {
                            $query_vars['paged'] = $query_opts['paged'];
                        }

                        $query_opts = $query_vars;
                    }
                } else {
                    $query_opts['post_type'] = $options['posts_source'];

                    // Post Types Set.
                    if ( 'post_types_set' === $options['posts_source'] ) {
                        $query_opts['post_type'] = (array) $options['post_types_set'];
                    }

                    // Taxonomies.
                    if ( ! empty( $options['posts_taxonomies'] ) && ! isset( $query_opts['tax_query'] ) ) {
                        $terms_list = get_terms( get_object_taxonomies( is_array( $query_opts['post_type'] ) ? $query_opts['post_type'] : array( $query_opts['post_type'] ) ) );

                        // phpcs:ignore
                        $query_opts['tax_query'] = array(
                            // We save strings like 'or', 'and'
                            // but to use it we need these strings in uppercase.
                            'relation' => strtoupper( $options['posts_taxonomies_relation'] ),
                        );

                        // We need this empty array, because when taxonomy selected,
                        // and posts don't have this taxonomy, we will see all available posts.
                        // Related topic: https://wordpress.org/support/topic/exclude-certain-category-from-filter/.
                        if ( 'OR' === $query_opts['tax_query']['relation'] ) {
                            $query_opts['tax_query'][] = array();
                        }

                        foreach ( $options['posts_taxonomies'] as $taxonomy ) {
                            $taxonomy_name = null;

                            foreach ( $terms_list as $term ) {
                                if ( $term->term_id === (int) $taxonomy ) {
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

                    // Offset.
                    if ( $options['posts_offset'] ) {
                        $query_opts['offset'] = $options['posts_offset'] + ( $paged - 1 ) * $count;
                    }
                }

                // Avoid duplicates.
                // We should prevent this when using filter, since all current posts will be excluded
                // from the filter query and we may not see all filter buttons.
                if ( ! $for_filter && $options['posts_avoid_duplicate_posts'] ) {
                    $not_id                     = (array) ( isset( $query_opts['post__not_in'] ) ? $query_opts['post__not_in'] : array() );
                    $query_opts['post__not_in'] = array_merge( $not_id, self::get_all_used_posts() );

                    // Remove posts from post__in.
                    if ( isset( $query_opts['post__in'] ) ) {
                        $query_opts['post__in'] = array_diff( (array) $query_opts['post__in'], (array) $query_opts['post__not_in'] );
                    }
                }
            }

            // Custom sorting.
            // phpcs:ignore
            if ( isset( $_GET['vp_sort'] ) ) {
                // phpcs:ignore
                $custom_get_order       = sanitize_text_field( wp_unslash( $_GET['vp_sort'] ) );
                $custom_order           = false;
                $custom_order_direction = false;

                switch ( $custom_get_order ) {
                    case 'title':
                    case 'date':
                        $custom_order           = 'post_' . $custom_get_order;
                        $custom_order_direction = 'asc';
                        break;
                    case 'title_desc':
                        $custom_order           = 'post_title';
                        $custom_order_direction = 'desc';
                        break;
                    case 'date_desc':
                        $custom_order           = 'post_date';
                        $custom_order_direction = 'desc';
                        break;
                }

                if ( $custom_order && $custom_order_direction ) {
                    $query_opts['orderby'] = $custom_order;
                    $query_opts['order']   = $custom_order_direction;
                }
            }

            // Load certain taxonomies using custom filter.
            // phpcs:ignore
            if ( ! $for_filter && isset( $_GET['vp_filter'] ) ) {
                // phpcs:ignore
                $taxonomies = sanitize_text_field( wp_unslash( $_GET['vp_filter'] ) );
                $taxonomies = explode( ':', $taxonomies );

                if ( $taxonomies && isset( $taxonomies[0] ) && isset( $taxonomies[1] ) ) {
                    // phpcs:ignore
                    $query_opts['tax_query'] = array(
                        'relation' => 'AND',
                        array(
                            'taxonomy' => $taxonomies[0],
                            'field'    => 'slug',
                            'terms'    => $taxonomies[1],
                        ),
                        isset( $query_opts['tax_query'] ) ? $query_opts['tax_query'] : '',
                    );
                }
            }
        }

        $query_opts = apply_filters( 'vpf_extend_query_args', $query_opts, $options, $layout_id );

        return $query_opts;
    }

    /**
     * Print notice
     *
     * @param string $notice notice string.
     */
    public static function notice( $notice ) {
        if ( ! $notice ) {
            return;
        }
        visual_portfolio()->include_template(
            'notices/notices',
            array(
                'notice' => $notice,
            )
        );
    }

    /**
     * Print filters
     *
     * @param array $vp_options current vp_list options.
     */
    public static function filter( $vp_options ) {
        if ( ! $vp_options['filter'] ) {
            return;
        }

        $terms           = array();
        $there_is_active = false;
        $is_images       = 'images' === $vp_options['content_source'];
        $is_social       = 'social-stream' === $vp_options['content_source'];

        // Get active item.
        $active_item = false;

        // phpcs:ignore
        if ( isset( $_GET['vp_filter'] ) ) {
            // phpcs:ignore
            $active_item = sanitize_text_field( wp_unslash( $_GET['vp_filter'] ) );
        }

        if ( $is_images || $is_social ) {
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
                        $url  = self::get_pagenum_link(
                            array(
                                'vp_filter' => rawurlencode( $slug ),
                                'vp_page'   => 1,
                            )
                        );

                        // add in terms array.
                        $terms[ $slug ] = array(
                            'filter'      => $slug,
                            'label'       => $cat,
                            'description' => '',
                            'count'       => isset( $categories_count[ $cat ] ) && $categories_count[ $cat ] ? $categories_count[ $cat ] : '',
                            'taxonomy'    => 'category',
                            'id'          => 0,
                            'parent'      => 0,
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

            /**
             * TODO: make caching using set_transient function. Info here - https://wordpress.stackexchange.com/a/145960
             */
            $term_ids        = array();
            $term_taxonomies = array();

            // stupid hack as wp_reset_postdata() function is not working for me...
            $old_post        = $GLOBALS['post'];
            $portfolio_query = new WP_Query( $query_opts );
            while ( $portfolio_query->have_posts() ) {
                $portfolio_query->the_post();
                $all_taxonomies = get_object_taxonomies( get_post() );

                foreach ( $all_taxonomies as $cat ) {
                    // allow only specific taxonomies for filter.
                    if ( ! self::allow_taxonomies_for_filter( $cat ) ) {
                        continue;
                    }

                    // Retrieve terms.
                    $category = get_the_terms( get_post(), $cat );
                    if ( ! $category ) {
                        continue;
                    }

                    // Prepare each terms array.
                    foreach ( $category as $key => $cat_item ) {
                        if ( ! in_array( $cat_item->term_id, $term_ids, true ) ) {
                            $term_ids[] = $cat_item->term_id;
                        }
                        if ( ! in_array( $cat_item->taxonomy, $term_taxonomies, true ) ) {
                            $term_taxonomies[] = $cat_item->taxonomy;
                        }
                    }
                }
            }

            $portfolio_query->reset_postdata();

            // Sometimes, when we use WPBakery Page Builder, without this reset output is wrong.
            wp_reset_postdata();

            // stupid hack as wp_reset_postdata() function is not working in some situations...
            // phpcs:ignore
            $GLOBALS['post'] = $old_post;

            // Get all available terms and then pick only needed by ID
            // we need this to support reordering plugins.
            $all_terms = get_terms(
                array(
                    'taxonomy'   => $term_taxonomies,
                    'hide_empty' => true,
                )
            );

            if ( isset( $all_terms ) && is_array( $all_terms ) ) {
                foreach ( $all_terms as $term ) {
                    if ( in_array( $term->term_id, $term_ids, true ) ) {
                        $unique_name = rawurlencode( $term->taxonomy . ':' ) . $term->slug;

                        $url = self::get_pagenum_link(
                            array(
                                'vp_filter' => $unique_name,
                                'vp_page'   => 1,
                            )
                        );

                        $is_active = rawurldecode( $unique_name ) === $active_item;

                        $terms[ $unique_name ] = array(
                            'filter'      => $term->slug,
                            'label'       => $term->name,
                            'description' => $term->description,
                            'count'       => $term->count,
                            'taxonomy'    => $term->taxonomy,
                            'id'          => $term->term_id,
                            'parent'      => $term->parent,
                            'active'      => $is_active,
                            'url'         => $url,
                            'class'       => 'vp-filter__item' . ( $is_active ? ' vp-filter__item-active' : '' ),
                        );

                        if ( $is_active ) {
                            $there_is_active = true;
                        }
                    }
                }
            }
        }

        // Add 'All' active item.
        if ( ! empty( $terms ) && $vp_options['filter_text_all'] ) {
            array_unshift(
                $terms,
                array(
                    'filter'      => '*',
                    'label'       => $vp_options['filter_text_all'],
                    'description' => false,
                    'count'       => false,
                    'id'          => 0,
                    'parent'      => 0,
                    'active'      => ! $there_is_active,
                    'url'         => self::get_pagenum_link(
                        array(
                            'vp_filter' => '',
                            'vp_page'   => 1,
                        )
                    ),
                    'class'       => 'vp-filter__item' . ( ! $there_is_active ? ' vp-filter__item-active' : '' ),
                )
            );
        }

        // No filters available.
        if ( empty( $terms ) ) {
            return;
        }

        // get options for the current filter.
        $filter_options      = array();
        $filter_options_slug = 'filter_' . $vp_options['filter'] . '__';

        foreach ( $vp_options as $k => $opt ) {
            // add option to array.
            if ( substr( $k, 0, strlen( $filter_options_slug ) ) === $filter_options_slug ) {
                $opt_name                    = str_replace( $filter_options_slug, '', $k );
                $filter_options[ $opt_name ] = $opt;
            }

            // remove style options from the options list.
            if ( substr( $k, 0, strlen( $filter_options_slug ) ) === $filter_options_slug ) {
                unset( $vp_options[ $k ] );
            }
        }

        $args = array(
            'class'      => 'vp-filter',
            // phpcs:ignore
            /*
             * Example:
                array(
                    array(
                        'filter'      => '*',
                        'label'       => $options['filter_text_all'],
                        'description' => false,
                        'count'       => false,
                        'active'      => true,
                        'url'         => Visual_Portfolio_Get::get_pagenum_link(
                            array(
                                'vp_filter' => '',
                                'vp_page' => 1,
                            )
                        ),
                        'class'       => 'vp-filter__item',
                    ),
                )
             */
            'items'      => apply_filters( 'vpf_extend_filter_items', $terms, $vp_options ),
            'show_count' => $vp_options['filter_show_count'],
            'opts'       => $filter_options,
            'vp_opts'    => $vp_options,
        );

        ?>
        <div class="vp-portfolio__filter-wrap">
        <?php

        $filter_style_pref = '';

        if ( 'default' !== $vp_options['filter'] ) {
            $filter_style_pref = '/' . $vp_options['filter'];
        }

        visual_portfolio()->include_template( 'items-list/filter' . $filter_style_pref . '/filter', $args );

        // We need to include these styles, since users can insert filters using separate shortcode.
        Visual_Portfolio_Assets::store_used_assets(
            'visual-portfolio-filter-' . $vp_options['filter'],
            'items-list/filter' . $filter_style_pref . '/style',
            'template_style'
        );

        ?>
        </div>
        <?php
    }

    /**
     * Print sort
     *
     * @param array $vp_options current vp_list options.
     */
    public static function sort( $vp_options ) {
        if ( ! $vp_options['sort'] ) {
            return;
        }

        $terms = array();

        // Get active item.
        $active_item = false;

        // phpcs:ignore
        if ( isset( $_GET['vp_sort'] ) ) {
            // phpcs:ignore
            $active_item = sanitize_text_field( wp_unslash( $_GET['vp_sort'] ) );
        }

        $sort_items = apply_filters(
            'vpf_extend_sort_items',
            array(
                ''           => esc_html__( 'Default sorting', '@@text_domain' ),
                'date_desc'  => esc_html__( 'Sort by date (newest)', '@@text_domain' ),
                'date'       => esc_html__( 'Sort by date (oldest)', '@@text_domain' ),
                'title'      => esc_html__( 'Sort by title (A-Z)', '@@text_domain' ),
                'title_desc' => esc_html__( 'Sort by title (Z-A)', '@@text_domain' ),
            ),
            $vp_options
        );

        foreach ( $sort_items as $slug => $label ) {
            $url = self::get_pagenum_link(
                array(
                    'vp_sort' => rawurlencode( $slug ),
                    'vp_page' => 1,
                )
            );

            $is_active = ! $active_item && ! $slug ? true : $active_item === $slug;

            // add in terms array.
            $terms[ $slug ] = array(
                'sort'        => $slug,
                'label'       => $label,
                'description' => '',
                'active'      => $is_active,
                'url'         => $url,
                'class'       => 'vp-sort__item' . ( $is_active ? ' vp-sort__item-active' : '' ),
            );
        }

        // get options for the current sort.
        $sort_options      = array();
        $sort_options_slug = 'sort_' . $vp_options['sort'] . '__';

        foreach ( $vp_options as $k => $opt ) {
            // add option to array.
            if ( substr( $k, 0, strlen( $sort_options_slug ) ) === $sort_options_slug ) {
                $opt_name                  = str_replace( $sort_options_slug, '', $k );
                $sort_options[ $opt_name ] = $opt;
            }

            // remove style options from the options list.
            if ( substr( $k, 0, strlen( $sort_options_slug ) ) === $sort_options_slug ) {
                unset( $vp_options[ $k ] );
            }
        }

        $args = array(
            'class'   => 'vp-sort',
            'items'   => $terms,
            'opts'    => $sort_options,
            'vp_opts' => $vp_options,
        );

        ?>
        <div class="vp-portfolio__sort-wrap">
        <?php

        $sort_style_pref = '';

        if ( 'default' !== $vp_options['sort'] ) {
            $sort_style_pref = '/' . $vp_options['sort'];
        }

        visual_portfolio()->include_template( 'items-list/sort' . $sort_style_pref . '/sort', $args );

        // We need to include these styles, since users can insert sort using separate shortcode.
        Visual_Portfolio_Assets::store_used_assets(
            'visual-portfolio-sort-' . $vp_options['sort'],
            'items-list/sort' . $sort_style_pref . '/style',
            'template_style'
        );

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
     *      'img_size_sm_popup' - sm image size for popup.
     *      'img_size' - image size.
     *      'no_image' - no image id.
     *      'opts' - style options.
     *      'vp_opts' - vp options.
     */
    private static function each_item( $args ) {
        global $post;

        $is_posts = 'post-based' === $args['vp_opts']['content_source'] || 'portfolio' === $args['vp_opts']['content_source'];

        // In older plugin versions we used the query objects in these templates.
        // And some theme authors used these data to run wp functions to output posts data.
        // In order to add back-compatibility, we need to "restore" such a possibility.
        //
        // Example: https://wordpress.org/support/topic/title-and-link-error-for-blog/.
        $set_post_object = $is_posts && isset( $args['post_id'] ) && $args['post_id'];

        if ( $set_post_object ) {
            // phpcs:ignore
            $post = get_post( $args['post_id'] );

            setup_postdata( $post );
        }

        // prepare image.
        $args['image'] = Visual_Portfolio_Images::get_attachment_image( $args['image_id'], $args['img_size'], false, '' );

        // fallback for old templates versions.
        $args['image_noscript'] = '';

        // prepare date.
        if ( isset( $args['opts']['show_date'] ) ) {
            if ( 'human' === $args['opts']['show_date'] ) {
                // translators: %s - published in human format.
                // phpcs:ignore
                $args['published'] = sprintf( esc_html__( '%s ago', '@@text_domain' ), human_time_diff( mysql2date( 'U', $args['published_time'], true ), current_time( 'timestamp' ) ) );
            } elseif ( $args['opts']['show_date'] ) {
                $args['published'] = mysql2date( $args['opts']['date_format'] ? $args['opts']['date_format'] : 'F j, Y', $args['published_time'], true );
            }

            // fallback for Visual Portfolio 1.2.1 version.
            $args['opts']['date_human_format'] = 'human' === $args['opts']['show_date'];
            $args['published_human_format']    = $args['published'];
        }

        // add video format args.
        if ( 'video' === $args['format'] && $args['video'] ) {
            $args['format_video_url'] = $args['video'];

            if ( ! $is_posts ) {
                $args['url'] = $args['video'];
            }
        }

        // prepare read more button.
        if ( isset( $args['opts']['show_read_more'] ) && $args['opts']['show_read_more'] ) {
            if ( $is_posts && 'more_tag' === $args['opts']['show_read_more'] ) {
                if ( strpos( get_post_field( 'post_content', $args['post_id'] ), '<!--more-->' ) ) {
                    $args['opts']['read_more_url'] = $args['url'] . '#more-' . $args['post_id'];
                } else {
                    $args['opts']['show_read_more'] = false;
                }
            } else {
                $args['opts']['read_more_url'] = $args['url'];
            }
        }

        // Click action.
        $args['url_target'] = false;
        $args['url_rel']    = false;

        switch ( $args['vp_opts']['items_click_action'] ) {
            case 'popup_gallery':
                break;
            case false:
                $args['url'] = false;
                break;
            default:
                $args['url_target'] = $args['vp_opts']['items_click_action_url_target'] ? $args['vp_opts']['items_click_action_url_target'] : false;
                $args['url_rel']    = $args['vp_opts']['items_click_action_url_rel'] ? $args['vp_opts']['items_click_action_url_rel'] : false;
                break;
        }

        // No Image.
        if ( ! $args['image'] && $args['no_image'] ) {
            $args['image'] = Visual_Portfolio_Images::get_attachment_image( $args['no_image'], $args['img_size'], false, '' );
        }

        // Class.
        $args['class'] = 'vp-portfolio__item-wrap';
        if ( $is_posts ) {
            // post_class functionality.
            $args['class'] = join( ' ', get_post_class( $args['class'], $args['post_id'] ) );
        }
        if ( $args['uid'] ) {
            $args['class'] .= ' vp-portfolio__item-uid-' . esc_attr( $args['uid'] );
        }

        $args = apply_filters( 'vpf_each_item_args', $args );

        // Tag Name.
        $tag_name = $is_posts ? 'article' : 'div';
        $tag_name = apply_filters( 'vpf_each_item_tag_name', $tag_name, $args );

        $attrs = array(
            'class'          => $args['class'],
            'data-vp-filter' => $args['filter'],
        );

        if ( $args['focal_point'] && ! empty( $args['focal_point'] ) ) {
            $attrs['style'] = '--vp-images__object-position: ' . esc_attr( 100 * floatval( $args['focal_point']['x'] ) ) . '% ' . esc_attr( 100 * floatval( $args['focal_point']['y'] ) ) . '%;';
        }

        $attrs        = apply_filters( 'vpf_each_item_tag_attrs', $attrs, $args );
        $attrs_string = '';

        foreach ( $attrs as $name => $val ) {
            $attrs_string .= ( $attrs_string ? ' ' : '' ) . esc_attr( $name ) . '="' . esc_attr( $val ) . '"';
        }

        ?>

        <<?php echo esc_attr( $tag_name ); ?> <?php echo $attrs_string; // phpcs:ignore ?>>
            <?php self::item_popup_data( $args ); ?>
            <?php do_action( 'vpf_before_each_item', $args ); ?>
            <figure class="vp-portfolio__item">
                <?php
                do_action( 'vpf_each_item_start', $args );

                $items_style_pref = '';
                if ( 'default' !== $args['vp_opts']['items_style'] ) {
                    $items_style_pref = '/' . $args['vp_opts']['items_style'];
                }
                visual_portfolio()->include_template( 'items-list/items-style' . $items_style_pref . '/image', $args );
                visual_portfolio()->include_template( 'items-list/items-style' . $items_style_pref . '/meta', $args );

                do_action( 'vpf_each_item_end', $args );
                ?>
            </figure>
            <?php do_action( 'vpf_after_each_item', $args ); ?>
        </<?php echo esc_attr( $tag_name ); ?>>
        <?php

        if ( $set_post_object ) {
            wp_reset_postdata();
        }
    }

    /**
     * Print item popup data.
     *
     * @param array $args - item args.
     */
    private static function item_popup_data( $args ) {
        $popup_image = false;
        $popup_video = false;

        if ( isset( $args['allow_popup'] ) && $args['allow_popup'] ) {
            if ( isset( $args['format_video_url'] ) && $args['format_video_url'] ) {
                $popup_video = array(
                    'url' => $args['format_video_url'],
                );
            } else {
                $img_id = $args['image_id'] ? $args['image_id'] : $args['no_image'];

                if ( $img_id ) {
                    $attachment = get_post( $args['image_id'] );
                    if ( $attachment && 'attachment' === $attachment->post_type ) {
                        $img_meta    = wp_get_attachment_image_src( $args['image_id'], $args['img_size_popup'] );
                        $img_md_meta = wp_get_attachment_image_src( $args['image_id'], $args['img_size_md_popup'] );
                        $img_sm_meta = wp_get_attachment_image_src( $args['image_id'], $args['img_size_sm_popup'] );

                        $popup_image = apply_filters(
                            'vpf_popup_image_data',
                            array(
                                'id'          => $args['image_id'],
                                'title'       => $attachment->post_title,
                                'description' => $attachment->post_content,
                                'caption'     => wp_get_attachment_caption( $attachment->ID ),
                                'alt'         => get_post_meta( $attachment->ID, '_wp_attachment_image_alt', true ),
                                'url'         => $img_meta[0],
                                'srcset'      => wp_get_attachment_image_srcset( $args['image_id'], $args['img_size_popup'] ),
                                'width'       => $img_meta[1],
                                'height'      => $img_meta[2],
                                'md_url'      => $img_md_meta[0],
                                'md_width'    => $img_md_meta[1],
                                'md_height'   => $img_md_meta[2],
                                'sm_url'      => $img_sm_meta[0],
                                'sm_width'    => $img_sm_meta[1],
                                'sm_height'   => $img_sm_meta[2],
                            )
                        );
                    } elseif ( $args['image_id'] ) {
                        $popup_image = apply_filters( 'vpf_popup_custom_image_data', false, $args['image_id'] );
                    }
                }
            }
        }

        ob_start();

        if ( $popup_image ) {
            $title_source       = $args['vp_opts']['items_click_action_popup_title_source'] ? $args['vp_opts']['items_click_action_popup_title_source'] : '';
            $description_source = $args['vp_opts']['items_click_action_popup_description_source'] ? $args['vp_opts']['items_click_action_popup_description_source'] : '';
            ?>
            <div class="vp-portfolio__item-popup"
                style="display: none;"
                data-vp-popup-img="<?php echo esc_url( $popup_image['url'] ); ?>"
                data-vp-popup-img-srcset="<?php echo esc_attr( $popup_image['srcset'] ); ?>"
                data-vp-popup-img-size="<?php echo esc_attr( $popup_image['width'] . 'x' . $popup_image['height'] ); ?>"
                data-vp-popup-md-img="<?php echo esc_url( $popup_image['md_url'] ); ?>"
                data-vp-popup-md-img-size="<?php echo esc_attr( $popup_image['md_width'] . 'x' . $popup_image['md_height'] ); ?>"
                data-vp-popup-sm-img="<?php echo esc_url( $popup_image['sm_url'] ); ?>"
                data-vp-popup-sm-img-size="<?php echo esc_attr( $popup_image['sm_width'] . 'x' . $popup_image['sm_height'] ); ?>"
            >
                <?php
                if ( isset( $popup_image[ $title_source ] ) && $popup_image[ $title_source ] ) {
                    ?>
                    <h3 class="vp-portfolio__item-popup-title"><?php echo esc_html( $popup_image[ $title_source ] ); ?></h3>
                    <?php
                }
                if ( isset( $popup_image[ $description_source ] ) && $popup_image[ $description_source ] ) {
                    ?>
                    <div class="vp-portfolio__item-popup-description"><?php echo wp_kses_post( $popup_image[ $description_source ] ); ?></div>
                    <?php
                }
                ?>
            </div>
            <?php
        } elseif ( $popup_video ) {
            ?>
            <div class="vp-portfolio__item-popup"
                style="display: none;"
                data-vp-popup-video="<?php echo esc_url( $popup_video['url'] ); ?>"
            ></div>
            <?php
        }

        $popup_output = ob_get_clean();
        $popup_output = apply_filters( 'vpf_popup_output', $popup_output, $args );

        // phpcs:ignore
        echo $popup_output;
    }

    /**
     * Print pagination
     *
     * @param array $vp_options - current vp_list options.
     */
    public static function pagination( $vp_options ) {
        if ( ! $vp_options['pagination_style'] || ! $vp_options['pagination'] ) {
            return;
        }

        // get options for the current pagination.
        $pagination_options      = array();
        $pagination_options_slug = 'pagination_' . $vp_options['pagination_style'] . '__';
        foreach ( $vp_options as $k => $opt ) {
            // add option to array.
            if ( substr( $k, 0, strlen( $pagination_options_slug ) ) === $pagination_options_slug ) {
                $opt_name                        = str_replace( $pagination_options_slug, '', $k );
                $pagination_options[ $opt_name ] = $opt;
            }

            // remove style options from the options list.
            if ( substr( $k, 0, strlen( $pagination_options_slug ) ) === $pagination_options_slug ) {
                unset( $vp_options[ $k ] );
            }
        }

        $args = array(
            'type'          => $vp_options['pagination'],
            'next_page_url' => $vp_options['next_page_url'],
            'start_page'    => $vp_options['start_page'],
            'max_pages'     => $vp_options['max_pages'],
            'class'         => 'vp-pagination',
            'opts'          => $pagination_options,
            'vp_opts'       => $vp_options,
        );

        // No more posts.
        if ( ! $args['next_page_url'] ) {
            $args['class'] .= ' vp-pagination__no-more';
        }

        ?>
        <div class="vp-portfolio__pagination-wrap">
        <?php

        $pagination_style_pref = '';
        if ( 'default' !== $vp_options['pagination_style'] ) {
            $pagination_style_pref = '/' . $vp_options['pagination_style'];
        }

        switch ( $vp_options['pagination'] ) {
            case 'infinite':
            case 'load-more':
                if ( 'infinite' === $vp_options['pagination'] ) {
                    $args['text_load']     = $vp_options['pagination_infinite_text_load'];
                    $args['text_loading']  = $vp_options['pagination_infinite_text_loading'];
                    $args['text_end_list'] = $vp_options['pagination_infinite_text_end_list'];
                } else {
                    $args['text_load']     = $vp_options['pagination_load_more_text_load'];
                    $args['text_loading']  = $vp_options['pagination_load_more_text_loading'];
                    $args['text_end_list'] = $vp_options['pagination_load_more_text_end_list'];
                }

                if ( ! $vp_options['pagination_hide_on_end'] || $args['next_page_url'] ) {
                    visual_portfolio()->include_template( 'items-list/pagination' . $pagination_style_pref . '/' . $vp_options['pagination'], $args );
                }

                break;
            default:
                // Scroll to top.
                if ( $vp_options['pagination_paged__scroll_top'] ) {
                    $args['class'] .= ' vp-pagination__scroll-top';

                    if ( isset( $vp_options['pagination_paged__scroll_top_offset'] ) ) {
                        $args['scroll_top_offset'] = $vp_options['pagination_paged__scroll_top_offset'];
                    }
                }

                $pagination_links = paginate_links(
                    array(
                        'base'      => esc_url_raw(
                            str_replace(
                                999999999,
                                '%#%',
                                remove_query_arg(
                                    'add-to-cart',
                                    self::get_pagenum_link(
                                        array(
                                            'vp_page' => 999999999,
                                        )
                                    )
                                )
                            )
                        ),
                        'format'    => '',
                        'type'      => 'array',
                        'current'   => $args['start_page'],
                        'total'     => $args['max_pages'],
                        'prev_text' => '&lt;',
                        'next_text' => '&gt;',
                        'end_size'  => 1,
                        'mid_size'  => 2,
                    )
                );

                // parse html string and make arrays.
                $filtered_links = array();
                if ( $pagination_links ) {
                    foreach ( $pagination_links as $link ) {
                        $tag_data = self::extract_tags( $link, array( 'a', 'span' ) );
                        $tag_data = ! empty( $tag_data ) ? $tag_data[0] : $tag_data;

                        if ( ! empty( $tag_data ) ) {
                            $atts  = isset( $tag_data['attributes'] ) ? $tag_data['attributes'] : false;
                            $href  = $atts && isset( $atts['href'] ) ? $atts['href'] : false;
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
                            if ( ! $vp_options['pagination_paged__show_arrows'] && ( $arr['is_prev_arrow'] || $arr['is_next_arrow'] ) ) {
                                continue;
                            }

                            // skip numbers if disabled.
                            if ( ! $vp_options['pagination_paged__show_numbers'] && ! $arr['is_prev_arrow'] && ! $arr['is_next_arrow'] ) {
                                continue;
                            }

                            $filtered_links[] = $arr;
                        }
                    }
                }

                if ( ! empty( $filtered_links ) ) {
                    $args['items'] = $filtered_links;
                    visual_portfolio()->include_template( 'items-list/pagination' . $pagination_style_pref . '/paged', $args );
                }

                break;
        }

        ?>
        </div>
        <?php
    }

    /**
     * Return current page url with paged support.
     *
     * @param array $query_arg - custom query arg.
     * @return string
     */
    public static function get_pagenum_link( $query_arg = array() ) {
        // Use current page url.
        global $wp;
        $current_url = trailingslashit( home_url( $wp->request ) );

        // phpcs:disable
        if ( ! empty( $_GET ) ) {
            $current_url = add_query_arg( array_map( 'sanitize_text_field', wp_unslash( $_GET ) ), $current_url );
        }
        // phpcs:enable

        if ( isset( $query_arg['vp_filter'] ) && ! $query_arg['vp_filter'] ) {
            unset( $query_arg['vp_filter'] );
            $current_url = remove_query_arg( 'vp_filter', $current_url );
        }
        if ( isset( $query_arg['vp_sort'] ) && ! $query_arg['vp_sort'] ) {
            unset( $query_arg['vp_sort'] );
            $current_url = remove_query_arg( 'vp_sort', $current_url );
        }
        if ( isset( $query_arg['vp_page'] ) && 1 === $query_arg['vp_page'] ) {
            unset( $query_arg['vp_page'] );
            $current_url = remove_query_arg( 'vp_page', $current_url );
        }

        // Add custom query args.
        $current_url = add_query_arg( $query_arg, $current_url );

        $current_url = apply_filters( 'vpf_get_pagenum_link', $current_url, $query_arg );

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
    public static function create_slug( $str, $delimiter = '_' ) {
        $slug = $str;

        if ( class_exists( 'Cocur\Slugify\Slugify' ) ) {
            $slugify = new Cocur\Slugify\Slugify();
            $slug    = $slugify->slugify( $str, $delimiter );
        }

        return $slug;
    }

    /**
     * Get list with all used posts on the current page.
     *
     * @return array
     */
    public static function get_all_used_posts() {
        // add post IDs from main query.
        if ( self::$check_main_query && ! self::is_preview() ) {
            self::$check_main_query = false;

            global $wp_query;

            if ( isset( $wp_query ) && isset( $wp_query->posts ) ) {
                foreach ( $wp_query->posts as $post ) {
                    self::$used_posts[] = $post->ID;
                }
            }
        }

        return self::$used_posts;
    }

    /**
     * Get list with all used portfolios on the current page.
     *
     * @return array
     */
    public static function get_all_used_layouts() {
        return self::$used_layouts;
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
            $selfclosing = in_array( $tag, $selfclosing_tags, true );
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
                        } elseif ( ! empty( $attr['value_unquoted'] ) ) {
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
                'tag_name'   => $match['tag'][0],
                'offset'     => $match[0][1],
                'contents'   => ! empty( $match['contents'] ) ? $match['contents'][0] : '',   // empty for self-closing tags.
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

new Visual_Portfolio_Get();
