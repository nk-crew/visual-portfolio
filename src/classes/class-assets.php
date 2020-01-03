<?php
/**
 * Assets static and dynamic.
 *
 * @package @@plugin_name
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Class Visual_Portfolio_Assets
 */
class Visual_Portfolio_Assets {
    /**
     * List with stored assets.
     *
     * @var array
     */
    private static $stored_assets = array(
        'script'         => array(),
        'style'          => array(),
        'template_style' => array(),
    );

    /**
     * Visual_Portfolio_Extend constructor.
     */
    public function __construct() {
        // template_redirect is used instead of wp_enqueue_scripts just because some plugins use it and included an old isotope plugin. So, it was conflicted.
        add_action( 'template_redirect', array( $this, 'register_scripts' ), 9 );
        add_action( 'wp_enqueue_scripts', array( $this, 'wp_enqueue_head_assets' ), 9 );

        add_action( 'template_redirect', array( $this, 'popup_custom_styles' ) );

        add_action( 'wp_footer', array( $this, 'wp_enqueue_foot_assets' ) );

        add_action( 'wp_head', array( $this, 'localize_global_data' ) );

        // noscript tag.
        add_filter( 'style_loader_tag', array( $this, 'style_loader_tag_noscript' ), 10, 2 );

        // parse shortcodes from post content.
        add_filter( 'wp', array( $this, 'maybe_parse_shortcodes_from_content' ), 10 );
    }

    /**
     * Store used assets, so we can enqueue it later.
     *
     * @param string      $name - asset name.
     * @param bool|string $value - just enqueue flag or url to asset.
     * @param string      $type - assets type [script|style|template_style].
     * @param int         $priority - asset enqueue priority.
     */
    public static function store_used_assets( $name, $value = true, $type = 'script', $priority = 10 ) {
        if ( ! isset( self::$stored_assets[ $type ] ) ) {
            return;
        }

        if ( isset( self::$stored_assets[ $type ][ $name ] ) ) {
            return;
        }

        self::$stored_assets[ $type ][ $name ] = array(
            'value'    => $value,
            'priority' => $priority,
        );
    }

    /**
     * Enqueue stored assets.
     *
     * @param string $type - assets type [script|style|template_style].
     */
    public static function enqueue_stored_assets( $type = 'script' ) {
        if ( ! isset( self::$stored_assets[ $type ] ) || empty( self::$stored_assets[ $type ] ) ) {
            return;
        }

        uasort(
            self::$stored_assets[ $type ],
            function ( $a, $b ) {
                if ( $a === $b ) {
                    return 0;
                }

                return $a['priority'] < $b['priority'] ? -1 : 1;
            }
        );

        foreach ( self::$stored_assets[ $type ] as $name => $data ) {
            $val = $data['value'];

            if ( $val ) {
                if ( 'script' === $type ) {
                    wp_enqueue_script( $name );
                } elseif ( is_string( $val ) ) {
                    visual_portfolio()->include_template_style( $name, $val );
                } else {
                    wp_enqueue_style( $name );
                }

                self::$stored_assets[ $type ]['value'] = false;
            }
        }
    }

    /**
     * Enqueue assets based on layout data.
     *
     * @param array      $options - layout data.
     * @param string|int $id - layout ID.
     */
    public static function enqueue( $options, $id ) {
        $options = array_merge(
            array(
                'vp_layout'             => false,
                'vp_items_style'        => false,
                'vp_items_click_action' => false,
                'vp_filter'             => false,
                'vp_sort'               => false,
                'vp_pagination_style'   => false,
                'vp_controls_styles'    => false,
                'vp_custom_css'         => false,
            ),
            $options
        );

        do_action( 'vpf_before_assets_enqueue', $options, $id );

        self::store_used_assets( '@@plugin_name', true, 'style', 9 );
        self::store_used_assets( '@@plugin_name-noscript', true, 'style', 9 );

        self::store_used_assets( '@@plugin_name', true, 'script', 11 );

        // Layout.
        switch ( $options['vp_layout'] ) {
            case 'masonry':
                self::store_used_assets( '@@plugin_name-layout-masonry', true, 'script' );
                break;
            case 'grid':
                self::store_used_assets( '@@plugin_name-layout-grid', true, 'script' );
                break;
            case 'tiles':
                self::store_used_assets( '@@plugin_name-layout-tiles', true, 'script' );
                self::store_used_assets( '@@plugin_name-layout-tiles', true, 'style' );
                break;
            case 'justified':
                self::store_used_assets( '@@plugin_name-layout-justified', true, 'script' );
                self::store_used_assets( '@@plugin_name-layout-justified', true, 'style' );
                break;
            case 'slider':
                self::store_used_assets( '@@plugin_name-layout-slider', true, 'script' );
                self::store_used_assets( '@@plugin_name-layout-slider', true, 'style' );
                break;
        }

        // Items Style.
        if ( $options['vp_items_style'] ) {
            $items_style_pref = '';

            if ( 'default' !== $options['vp_items_style'] ) {
                $items_style_pref = '/' . $options['vp_items_style'];
            }

            switch ( $options['vp_items_style'] ) {
                case 'fly':
                    self::store_used_assets( '@@plugin_name-items-style-fly', true, 'script' );
                    break;
            }

            self::store_used_assets(
                '@@plugin_name-items-style-' . $options['vp_items_style'],
                'items-list/items-style' . $items_style_pref . '/style',
                'template_style'
            );
        }

        // Popup.
        if ( 'popup_gallery' === $options['vp_items_click_action'] ) {
            $popup_vendor = Visual_Portfolio_Settings::get_option( 'vendor', 'vp_popup_gallery', 'photoswipe' );

            // Photoswipe.
            if ( 'photoswipe' === $popup_vendor && apply_filters( 'vpf_enqueue_plugin_photoswipe', true ) ) {
                self::store_used_assets( '@@plugin_name-plugin-photoswipe', true, 'script' );
                self::store_used_assets( '@@plugin_name-popup-photoswipe', true, 'style' );

                // Fancybox.
            } elseif ( 'fancybox' === $popup_vendor && apply_filters( 'vpf_enqueue_plugin_fancybox', true ) ) {
                self::store_used_assets( '@@plugin_name-plugin-fancybox', true, 'script' );
                self::store_used_assets( '@@plugin_name-popup-fancybox', true, 'style' );
            }
        }

        // Filter.
        if ( $options['vp_filter'] ) {
            $filter_style_pref = '';

            if ( 'default' !== $options['vp_filter'] ) {
                $filter_style_pref = '/' . $options['vp_filter'];
            }

            self::store_used_assets(
                '@@plugin_name-filter-' . $options['vp_filter'],
                'items-list/filter' . $filter_style_pref . '/style',
                'template_style'
            );
        }

        // Sort.
        if ( $options['vp_sort'] ) {
            $sort_style_pref = '';

            if ( 'default' !== $options['vp_sort'] ) {
                $sort_style_pref = '/' . $options['vp_sort'];
            }

            self::store_used_assets(
                '@@plugin_name-sort-' . $options['vp_sort'],
                'items-list/sort' . $sort_style_pref . '/style',
                'template_style'
            );
        }

        // Pagination.
        if ( $options['vp_pagination_style'] ) {
            $pagination_style_pref = '';

            if ( 'default' !== $options['vp_pagination_style'] ) {
                $pagination_style_pref = '/' . $options['vp_pagination_style'];
            }

            self::store_used_assets(
                '@@plugin_name-pagination-' . $options['vp_pagination_style'],
                'items-list/pagination' . $pagination_style_pref . '/style',
                'template_style'
            );
        }

        // Controls styles.
        if ( $options['vp_controls_styles'] ) {
            $controls_css_handle = 'vp-controls-styles-' . $id;

            $css = wp_kses( $options['vp_controls_styles'], array( '\'', '\"' ) );
            $css = str_replace( '&gt;', '>', $css );

            wp_register_style( $controls_css_handle, false, array(), '@@plugin_version' );
            wp_enqueue_style( $controls_css_handle );
            wp_add_inline_style( $controls_css_handle, $css );

            self::store_used_assets( $controls_css_handle, true, 'style' );
        }

        // Add custom styles.
        if ( $options['vp_custom_css'] ) {
            $custom_css_handle = 'vp-custom-css-' . $id;

            $css = wp_kses( $options['vp_custom_css'], array( '\'', '\"' ) );
            $css = str_replace( '&gt;', '>', $css );

            wp_register_style( $custom_css_handle, false, array(), '@@plugin_version' );
            wp_enqueue_style( $custom_css_handle );
            wp_add_inline_style( $custom_css_handle, $css );

            self::store_used_assets( $custom_css_handle, true, 'style' );
        }

        do_action( 'vpf_after_assets_enqueue', $options, $id );
    }

    /**
     * Register scripts that will be used in the future when portfolio will be printed.
     */
    public function register_scripts() {
        $vp_deps       = array( 'jquery', 'imagesloaded' );
        $vp_style_deps = array();

        $popup_vendor = Visual_Portfolio_Settings::get_option( 'vendor', 'vp_popup_gallery', 'photoswipe' );

        do_action( 'vpf_before_assets_register' );

        // Isotope.
        if ( apply_filters( 'vpf_enqueue_plugin_isotope', true ) ) {
            wp_register_script( 'isotope', visual_portfolio()->plugin_url . 'assets/vendor/isotope/isotope.pkgd.min.js', array( 'jquery' ), '3.0.6', true );
        }

        // fjGallery.
        if ( apply_filters( 'vpf_enqueue_plugin_flickr_justified_gallery', true ) ) {
            wp_register_script( 'flickr-justified-gallery', visual_portfolio()->plugin_url . 'assets/vendor/flickr-justified-gallery/fjGallery.min.js', array( 'jquery' ), '1.0.2', true );
        }

        // Object Fit Images.
        if ( apply_filters( 'vpf_enqueue_plugin_object_fit_images', true ) ) {
            wp_register_script( 'object-fit-images', visual_portfolio()->plugin_url . 'assets/vendor/object-fit-images/ofi.min.js', array(), '3.2.4', true );
        }

        // PhotoSwipe.
        if ( 'photoswipe' === $popup_vendor && apply_filters( 'vpf_enqueue_plugin_photoswipe', true ) ) {
            wp_register_style( 'photoswipe', visual_portfolio()->plugin_url . 'assets/vendor/photoswipe/photoswipe.css', array(), '4.1.3' );
            wp_register_style( 'photoswipe-default-skin', visual_portfolio()->plugin_url . 'assets/vendor/photoswipe/default-skin/default-skin.css', array( 'photoswipe' ), '4.1.3' );
            wp_register_script( 'photoswipe', visual_portfolio()->plugin_url . 'assets/vendor/photoswipe/photoswipe.min.js', array(), '4.1.3', true );
            wp_register_script( 'photoswipe-ui-default', visual_portfolio()->plugin_url . 'assets/vendor/photoswipe/photoswipe-ui-default.min.js', array( 'photoswipe' ), '4.1.3', true );

            // Fancybox.
        } elseif ( 'fancybox' === $popup_vendor && apply_filters( 'vpf_enqueue_plugin_fancybox', true ) ) {
            wp_register_style( 'fancybox', visual_portfolio()->plugin_url . 'assets/vendor/fancybox/jquery.fancybox.min.css', array(), '3.5.7' );
            wp_register_script( 'fancybox', visual_portfolio()->plugin_url . 'assets/vendor/fancybox/jquery.fancybox.min.js', array( 'jquery' ), '3.5.7', true );
        }

        // Swiper.
        if ( apply_filters( 'vpf_enqueue_plugin_swiper', true ) ) {
            wp_register_style( 'swiper', visual_portfolio()->plugin_url . 'assets/vendor/swiper/css/swiper.min.css', array(), '5.0.4' );
            wp_register_script( 'swiper', visual_portfolio()->plugin_url . 'assets/vendor/swiper/js/swiper.min.js', array(), '5.0.4', true );
        }

        // Font Awesome.
        if ( apply_filters( 'vpf_enqueue_plugin_font_awesome', true ) ) {
            wp_register_script( 'font-awesome-v4-shims', visual_portfolio()->plugin_url . 'assets/vendor/font-awesome/v4-shims.min.js', array(), '5.11.2', true );
            wp_register_script( 'font-awesome', visual_portfolio()->plugin_url . 'assets/vendor/font-awesome/all.min.js', array( 'font-awesome-v4-shims' ), '5.11.2', true );

            $vp_deps[] = 'font-awesome';
        }

        // LazySizes.
        if ( apply_filters( 'vpf_enqueue_plugin_lazysizes', true ) ) {
            wp_register_script( 'lazysizes-object-fit-cover', visual_portfolio()->plugin_url . 'assets/js/lazysizes-object-fit-cover.min.js', array(), '4.1.0', true );
            wp_register_script( 'lazysizes', visual_portfolio()->plugin_url . 'assets/vendor/lazysizes/lazysizes.min.js', array(), '5.1.1', true );

            $vp_deps[] = 'lazysizes-object-fit-cover';
            $vp_deps[] = 'lazysizes';
        }

        // Visual Portfolio CSS.
        $vp_styles = array(
            '@@plugin_name'                  => array( 'assets/css/main.min.css', $vp_style_deps ),
            '@@plugin_name-noscript'         => array( 'assets/css/noscript.min.css', array( '@@plugin_name' ) ),
            '@@plugin_name-layout-justified' => array( 'assets/css/layout-justified.min.css', array( '@@plugin_name' ) ),
            '@@plugin_name-layout-slider'    => array( 'assets/css/layout-slider.min.css', array( '@@plugin_name', 'swiper' ) ),
            '@@plugin_name-layout-tiles'     => array( 'assets/css/layout-tiles.min.css', array( '@@plugin_name' ) ),
            '@@plugin_name-popup-fancybox'   => array( 'assets/css/popup-fancybox.min.css', array( '@@plugin_name', 'fancybox' ) ),
            '@@plugin_name-popup-photoswipe' => array( 'assets/css/popup-photoswipe.min.css', array( '@@plugin_name', 'photoswipe-default-skin' ) ),
        );

        foreach ( $vp_styles as $name => $data ) {
            wp_register_style( $name, visual_portfolio()->plugin_url . $data[0], $data[1], '@@plugin_version' );
        }

        // Visual Portfolio JS.
        $vp_scripts = array(
            '@@plugin_name'                   => array(
                'assets/js/main.min.js',
                $vp_deps,
            ),
            '@@plugin_name-plugin-isotope'    => array(
                'assets/js/plugin-isotope.min.js',
                array(
                    'isotope',
                ),
            ),
            '@@plugin_name-plugin-fj-gallery' => array(
                'assets/js/plugin-fj-gallery.min.js',
                array(
                    'flickr-justified-gallery',
                ),
            ),
            '@@plugin_name-plugin-swiper'     => array(
                'assets/js/plugin-swiper.min.js',
                array(
                    'swiper',
                ),
            ),
            '@@plugin_name-plugin-photoswipe' => array(
                'assets/js/plugin-photoswipe.min.js',
                array(
                    'photoswipe-ui-default',
                ),
            ),
            '@@plugin_name-plugin-fancybox'   => array(
                'assets/js/plugin-fancybox.min.js',
                array(
                    'fancybox',
                ),
            ),
            '@@plugin_name-layout-gaps'       => array(
                'assets/js/layout-gaps.min.js',
                array(
                    'jquery',
                ),
            ),
            '@@plugin_name-layout-masonry'    => array(
                'assets/js/layout-masonry.min.js',
                array(
                    'jquery',
                    '@@plugin_name-layout-gaps',
                    '@@plugin_name-plugin-isotope',
                ),
            ),
            '@@plugin_name-layout-grid'       => array(
                'assets/js/layout-grid.min.js',
                array(
                    'jquery',
                    '@@plugin_name-layout-gaps',
                    '@@plugin_name-plugin-isotope',
                ),
            ),
            '@@plugin_name-layout-tiles'      => array(
                'assets/js/layout-tiles.min.js',
                array(
                    'jquery',
                    '@@plugin_name-layout-gaps',
                    '@@plugin_name-plugin-isotope',
                ),
            ),
            '@@plugin_name-layout-justified'  => array(
                'assets/js/layout-justified.min.js',
                array(
                    'jquery',
                    '@@plugin_name-plugin-fj-gallery',
                ),
            ),
            '@@plugin_name-layout-slider'     => array(
                'assets/js/layout-slider.min.js',
                array(
                    'jquery',
                    '@@plugin_name-plugin-swiper',
                ),
            ),
            '@@plugin_name-items-style-fly'   => array(
                'assets/js/items-style-fly.min.js',
                array(
                    'jquery',
                ),
            ),
        );

        foreach ( $vp_scripts as $name => $data ) {
            wp_register_script( $name, visual_portfolio()->plugin_url . $data[0], $data[1], '@@plugin_version', true );
        }

        do_action( 'vpf_after_assets_register' );
    }

    /**
     * Dynamic styles for popup gallery plugins.
     */
    public function popup_custom_styles() {
        $bg_color = Visual_Portfolio_Settings::get_option( 'background_color', 'vp_popup_gallery', '#1e1e1e' );

        if ( $bg_color ) {
            wp_add_inline_style( '@@plugin_name-popup-fancybox', '.vp-fancybox .fancybox-bg { background-color: ' . esc_attr( $bg_color ) . '; }' );
            wp_add_inline_style( '@@plugin_name-popup-photoswipe', '.vp-pswp .pswp__bg { background-color: ' . esc_attr( $bg_color ) . '; }' );
        }
    }

    /**
     * Add global Visual Portfolio data.
     */
    public function localize_global_data() {
        $data = array(
            '__'                   => array(
                'couldnt_retrieve_vp'  => esc_attr__( 'Couldn\'t retrieve Visual Portfolio ID.', '@@text_domain' ),

                'pswp_close'           => esc_attr__( 'Close (Esc)', '@@text_domain' ),
                'pswp_share'           => esc_attr__( 'Share', '@@text_domain' ),
                'pswp_fs'              => esc_attr__( 'Toggle fullscreen', '@@text_domain' ),
                'pswp_zoom'            => esc_attr__( 'Zoom in/out', '@@text_domain' ),
                'pswp_prev'            => esc_attr__( 'Previous (arrow left)', '@@text_domain' ),
                'pswp_next'            => esc_attr__( 'Next (arrow right)', '@@text_domain' ),
                'pswp_share_fb'        => esc_attr__( 'Share on Facebook', '@@text_domain' ),
                'pswp_share_tw'        => esc_attr__( 'Tweet', '@@text_domain' ),
                'pswp_share_pin'       => esc_attr__( 'Pin it', '@@text_domain' ),

                'fancybox_close'       => esc_attr__( 'Close', '@@text_domain' ),
                'fancybox_next'        => esc_attr__( 'Next', '@@text_domain' ),
                'fancybox_prev'        => esc_attr__( 'Previous', '@@text_domain' ),
                'fancybox_error'       => __( 'The requested content cannot be loaded. <br /> Please try again later.', '@@text_domain' ),
                'fancybox_play_start'  => esc_attr__( 'Start slideshow', '@@text_domain' ),
                'fancybox_play_stop'   => esc_attr__( 'Pause slideshow', '@@text_domain' ),
                'fancybox_full_screen' => esc_attr__( 'Full screen', '@@text_domain' ),
                'fancybox_thumbs'      => esc_attr__( 'Thumbnails', '@@text_domain' ),
                'fancybox_download'    => esc_attr__( 'Download', '@@text_domain' ),
                'fancybox_share'       => esc_attr__( 'Share', '@@text_domain' ),
                'fancybox_zoom'        => esc_attr__( 'Zoom', '@@text_domain' ),
            ),
            'settingsPopupGallery' => array(
                'vendor'                 => Visual_Portfolio_Settings::get_option( 'vendor', 'vp_popup_gallery', 'photoswipe' ),

                // General.
                'show_arrows'            => Visual_Portfolio_Settings::get_option( 'show_arrows', 'vp_popup_gallery', true ),
                'show_counter'           => Visual_Portfolio_Settings::get_option( 'show_counter', 'vp_popup_gallery', true ),
                'show_zoom_button'       => Visual_Portfolio_Settings::get_option( 'show_zoom_button', 'vp_popup_gallery', true ),
                'show_fullscreen_button' => Visual_Portfolio_Settings::get_option( 'show_fullscreen_button', 'vp_popup_gallery', true ),
                'show_share_button'      => Visual_Portfolio_Settings::get_option( 'show_share_button', 'vp_popup_gallery', true ),
                'show_close_button'      => Visual_Portfolio_Settings::get_option( 'show_close_button', 'vp_popup_gallery', true ),

                // Fancybox.
                'show_download_button'   => Visual_Portfolio_Settings::get_option( 'show_download_button', 'vp_popup_gallery', false ),
                'show_slideshow'         => Visual_Portfolio_Settings::get_option( 'show_slideshow', 'vp_popup_gallery', false ),
                'show_thumbs'            => Visual_Portfolio_Settings::get_option( 'show_thumbs', 'vp_popup_gallery', true ),
            ),

            // Screen sizes for responsive feature.
            'screenSizes'          => array( 320, 576, 768, 992, 1200 ),
        );

        echo "<script type='text/javascript'>\n";
        echo "/* <![CDATA[ */\n";
        echo 'var VPData = ' . wp_json_encode( $data ) . ';';
        echo "\n/* ]]> */\n";
        echo "</script>\n";
    }

    /**
     * Enqueue styles in head.
     */
    public function wp_enqueue_head_assets() {
        self::enqueue_stored_assets( 'style' );
        self::enqueue_stored_assets( 'template_style' );
    }

    /**
     * Enqueue scripts and styles in foot.
     */
    public function wp_enqueue_foot_assets() {
        self::enqueue_stored_assets( 'style' );
        self::enqueue_stored_assets( 'template_style' );
        self::enqueue_stored_assets( 'script' );
    }

    /**
     * Add noscript tag to styles.
     *
     * @param  string $tag    The tag we want to wrap around.
     * @param  string $handle The handle of the tag.
     * @return string         The wrapped around tag.
     */
    public function style_loader_tag_noscript( $tag, $handle ) {
        if ( '@@plugin_name-noscript' === $handle ) {
            $tag = '<noscript>' . $tag . '</noscript>';
        }
        return $tag;
    }

    /**
     * Parse shortcodes from content.
     */
    public function maybe_parse_shortcodes_from_content() {
        global $wp_query;

        if ( is_admin() || ! isset( $wp_query->posts ) ) {
            return;
        }

        $posts   = $wp_query->posts;
        $pattern = get_shortcode_regex();

        $layout_ids = array();

        // parse all posts content.
        foreach ( $posts as $post ) {
            if (
                isset( $post->post_content )
                && preg_match_all( '/' . $pattern . '/s', $post->post_content, $matches )
                && array_key_exists( 2, $matches )
                && in_array( 'visual_portfolio', $matches[2], true )
            ) {
                $keys       = array();
                $shortcodes = array();

                foreach ( $matches[0] as $key => $value ) {
                    // $matches[3] return the shortcode attribute as string
                    // replace space with '&' for parse_str() function.
                    $get = str_replace( ' ', '&', $matches[3][ $key ] );
                    parse_str( $get, $output );

                    // get all shortcode attribute keys.
                                $keys = array_unique( array_merge( $keys, array_keys( $output ) ) );
                    $shortcodes[]     = $output;
                }

                if ( $keys && $shortcodes ) {
                    // Loop the result array and add the missing shortcode attribute key.
                    foreach ( $shortcodes as $key => $value ) {
                        // Loop the shortcode attribute key.
                        foreach ( $keys as $attr_key ) {
                            $shortcodes[ $key ][ $attr_key ] = isset( $shortcodes[ $key ][ $attr_key ] ) ? $shortcodes[ $key ][ $attr_key ] : null;
                        }

                        // sort the array key.
                        ksort( $shortcodes[ $key ] );
                    }
                }

                // get all IDs from shortcodes.
                foreach ( $shortcodes as $shortcode ) {
                    if ( isset( $shortcode['id'] ) && $shortcode['id'] && ! in_array( $shortcode['id'], $layout_ids, true ) ) {
                        $layout_ids[] = str_replace( '"', '', $shortcode['id'] );
                    }
                }
            }
        }

        if ( ! empty( $layout_ids ) ) {
            foreach ( $layout_ids as $id ) {
                $options = Visual_Portfolio_Get::get_options( $id );

                self::enqueue( $options, $id );
            }
        }
    }
}

new Visual_Portfolio_Assets();
