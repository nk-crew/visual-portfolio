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
     * When styles already included in head.
     *
     * @var array
     */
    private static $head_css_included = false;

    /**
     * Visual_Portfolio_Assets constructor.
     */
    public function __construct() {
        // template_redirect is used instead of wp_enqueue_scripts just because some plugins use it and included an old isotope plugin. So, it was conflicted.
        add_action( 'template_redirect', array( $this, 'register_scripts' ), 9 );
        add_action( 'wp_enqueue_scripts', array( $this, 'wp_enqueue_head_assets' ), 9 );

        add_action( 'template_redirect', array( $this, 'popup_custom_styles' ) );
        add_action( 'template_redirect', array( $this, 'assets_for_default_wordpress_images' ) );

        add_action( 'wp_footer', array( $this, 'wp_enqueue_foot_assets' ) );

        add_action( 'wp_head', array( $this, 'localize_global_data' ) );

        // noscript tag.
        add_action( 'wp_head', array( $this, 'add_noscript_styles' ) );

        // parse shortcodes from post content.
        add_filter( 'wp', array( $this, 'maybe_parse_shortcodes_from_content' ), 10 );
        add_action( 'vpf_parse_blocks', array( $this, 'maybe_parse_blocks_from_content' ), 11 );
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
     * Remove stored assets. May be used for advanced functionality.
     *
     * @param string $name - asset name.
     * @param string $type - assets type [script|style|template_style].
     */
    public static function remove_stored_assets( $name, $type = 'script' ) {
        if ( ! isset( self::$stored_assets[ $type ][ $name ] ) ) {
            return;
        }

        unset( self::$stored_assets[ $type ][ $name ] );
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

                if ( isset( $a['priority'] ) && isset( $b['priority'] ) ) {
                    return $a['priority'] < $b['priority'] ? -1 : 1;
                }

                return 0;
            }
        );

        foreach ( self::$stored_assets[ $type ] as $name => $data ) {
            if ( isset( $data['value'] ) && $data['value'] ) {
                if ( 'script' === $type ) {
                    wp_enqueue_script( $name, '', array(), '@@plugin_version', true );
                } elseif ( is_string( $data['value'] ) ) {
                    visual_portfolio()->include_template_style( $name, $data['value'], array(), '@@plugin_version' );
                } else {
                    wp_enqueue_style( $name, '', array(), '@@plugin_version' );
                }

                self::$stored_assets[ $type ]['value'] = false;
            }
        }
    }

    /**
     * Enqueue assets based on layout data.
     *
     * @param array $options - layout data.
     */
    public static function enqueue( $options ) {
        $options = Visual_Portfolio_Get::get_options( $options );

        do_action( 'vpf_before_assets_enqueue', $options, $options['id'] );

        self::store_used_assets( 'visual-portfolio', true, 'style', 9 );
        self::store_used_assets( 'visual-portfolio-notices-default', true, 'style', 9 );
        self::store_used_assets(
            'visual-portfolio-notices-default',
            'notices/style',
            'template_style'
        );

        // Additional styles for Elementor.
        if ( class_exists( '\Elementor\Plugin' ) ) {
            self::store_used_assets( 'visual-portfolio-elementor', true, 'style', 9 );
        }

        self::store_used_assets( 'visual-portfolio', true, 'script', 12 );

        // Layout.
        switch ( $options['layout'] ) {
            case 'masonry':
                self::store_used_assets( 'visual-portfolio-layout-masonry', true, 'script' );
                self::store_used_assets( 'visual-portfolio-layout-masonry', true, 'style' );
                break;
            case 'grid':
                self::store_used_assets( 'visual-portfolio-layout-grid', true, 'script' );
                self::store_used_assets( 'visual-portfolio-layout-grid', true, 'style' );
                break;
            case 'tiles':
                self::store_used_assets( 'visual-portfolio-layout-tiles', true, 'script' );
                self::store_used_assets( 'visual-portfolio-layout-tiles', true, 'style' );
                break;
            case 'justified':
                self::store_used_assets( 'visual-portfolio-layout-justified', true, 'script' );
                self::store_used_assets( 'visual-portfolio-layout-justified', true, 'style' );
                break;
            case 'slider':
                self::store_used_assets( 'visual-portfolio-layout-slider', true, 'script' );
                self::store_used_assets( 'visual-portfolio-layout-slider', true, 'style' );
                break;
        }

        // Custom Scrollbar.
        self::store_used_assets( 'visual-portfolio-custom-scrollbar', true, 'script' );
        self::store_used_assets( 'visual-portfolio-custom-scrollbar', true, 'style' );

        // Items Style.
        if ( $options['items_style'] ) {
            $items_style_pref = '';

            if ( 'default' !== $options['items_style'] ) {
                $items_style_pref = '/' . $options['items_style'];
            }

            switch ( $options['items_style'] ) {
                case 'fly':
                    self::store_used_assets( 'visual-portfolio-items-style-fly', true, 'script' );
                    break;
            }

            self::store_used_assets(
                'visual-portfolio-items-style-' . $options['items_style'],
                'items-list/items-style' . $items_style_pref . '/style',
                'template_style'
            );
        }

        // Images Lazy Loading.
        if ( Visual_Portfolio_Settings::get_option( 'lazy_loading', 'vp_images' ) ) {
            self::enqueue_lazyload_assets();
        }

        // Popup.
        if ( 'popup_gallery' === $options['items_click_action'] ) {
            self::enqueue_popup_assets();
        }

        $layout_elements = array();

        if ( isset( $options['layout_elements']['top']['elements'] ) ) {
            $layout_elements = array_merge( $layout_elements, $options['layout_elements']['top']['elements'] );
        }
        if ( isset( $options['layout_elements']['bottom']['elements'] ) ) {
            $layout_elements = array_merge( $layout_elements, $options['layout_elements']['bottom']['elements'] );
        }

        // Filter.
        if ( in_array( 'filter', $layout_elements, true ) ) {
            $filter_style_pref = '';

            if ( 'default' !== $options['filter'] ) {
                $filter_style_pref = '/' . $options['filter'];
            }

            self::store_used_assets(
                'visual-portfolio-filter-' . $options['filter'],
                'items-list/filter' . $filter_style_pref . '/style',
                'template_style'
            );
        }

        // Sort.
        if ( in_array( 'sort', $layout_elements, true ) ) {
            $sort_style_pref = '';

            if ( 'default' !== $options['sort'] ) {
                $sort_style_pref = '/' . $options['sort'];
            }

            self::store_used_assets(
                'visual-portfolio-sort-' . $options['sort'],
                'items-list/sort' . $sort_style_pref . '/style',
                'template_style'
            );
        }

        // Pagination.
        if ( in_array( 'pagination', $layout_elements, true ) ) {
            $pagination_style_pref = '';

            if ( 'default' !== $options['pagination_style'] ) {
                $pagination_style_pref = '/' . $options['pagination_style'];
            }

            // Infinite scroll pagination script.
            if ( 'infinite' === $options['pagination'] ) {
                self::store_used_assets( 'visual-portfolio-pagination-infinite', true, 'script' );
            }

            // Minimal page pagination helpful script.
            if ( 'minimal' === $options['pagination_style'] && 'paged' === $options['pagination'] ) {
                self::store_used_assets( 'visual-portfolio-pagination-minimal-paged', true, 'script' );
            }

            self::store_used_assets(
                'visual-portfolio-pagination-' . $options['pagination_style'],
                'items-list/pagination' . $pagination_style_pref . '/style',
                'template_style'
            );
        }

        // Dynamic styles.
        // Always add it even if no custom CSS available to better render dynamic styles in preview.
        $dynamic_styles      = Visual_Portfolio_Controls_Dynamic_CSS::get( $options );
        $controls_css_handle = 'vp-dynamic-styles-' . $options['id'];

        if ( ! wp_style_is( $controls_css_handle, 'enqueued' ) ) {
            $dynamic_styles = wp_kses( $dynamic_styles, array( '\'', '\"' ) );
            $dynamic_styles = str_replace( '&gt;', '>', $dynamic_styles );

            $dynamic_styles_inline_style = apply_filters( 'vpf_enqueue_dynamic_styles_inline_style', ! self::$head_css_included, $dynamic_styles, $controls_css_handle );

            // Enqueue custom CSS.
            if ( $dynamic_styles_inline_style ) {
                wp_register_style( $controls_css_handle, false, array(), '@@plugin_version' );
                wp_enqueue_style( $controls_css_handle );
                wp_add_inline_style( $controls_css_handle, $dynamic_styles ? $dynamic_styles : ' ' );

                // Enqueue JS instead of CSS when rendering in <body> to prevent W3C errors.
            } elseif ( ! wp_script_is( $controls_css_handle, 'enqueued' ) ) {
                wp_register_script( $controls_css_handle, false, array(), '@@plugin_version', true );
                wp_enqueue_script( $controls_css_handle );
                wp_add_inline_script(
                    $controls_css_handle,
                    '(function(){
                        var styleTag = document.createElement("style");
                        styleTag.id = "' . esc_attr( $controls_css_handle ) . '-inline-css";
                        styleTag.innerHTML = ' . wp_json_encode( $dynamic_styles ? $dynamic_styles : ' ' ) . ';
                        document.body.appendChild(styleTag);
                    }());'
                );
            }
        }

        self::store_used_assets( $controls_css_handle, true, 'style' );

        do_action( 'vpf_after_assets_enqueue', $options, $options['id'] );
    }

    /**
     * Enqueue popup assets.
     *
     * @return void
     */
    public static function enqueue_popup_assets() {
        $popup_vendor = Visual_Portfolio_Settings::get_option( 'vendor', 'vp_popup_gallery' );

        // Photoswipe.
        if ( 'photoswipe' === $popup_vendor && apply_filters( 'vpf_enqueue_plugin_photoswipe', true ) ) {
            self::store_used_assets( 'visual-portfolio-plugin-photoswipe', true, 'script' );
            self::store_used_assets( 'visual-portfolio-popup-photoswipe', true, 'style' );

            // Fancybox.
        } elseif ( 'fancybox' === $popup_vendor && apply_filters( 'vpf_enqueue_plugin_fancybox', true ) ) {
            self::store_used_assets( 'visual-portfolio-plugin-fancybox', true, 'script' );
            self::store_used_assets( 'visual-portfolio-popup-fancybox', true, 'style' );
        }
    }

    /**
     * Enqueue lazyload assets.
     *
     * @return void
     */
    public static function enqueue_lazyload_assets() {
        // Disable lazyload assets using filter.
        // Same filter used in `class-images.php`.
        if ( ! apply_filters( 'vpf_images_lazyload', true ) ) {
            return;
        }

        self::store_used_assets( 'visual-portfolio-lazyload', true, 'script' );
        self::store_used_assets( 'visual-portfolio-lazyload', true, 'style' );
    }

    /**
     * Register scripts that will be used in the future when portfolio will be printed.
     */
    public function register_scripts() {
        $vp_deps       = array( 'jquery', 'imagesloaded' );
        $vp_style_deps = array();

        $popup_vendor = Visual_Portfolio_Settings::get_option( 'vendor', 'vp_popup_gallery' );

        do_action( 'vpf_before_assets_register' );

        // Isotope.
        if ( apply_filters( 'vpf_enqueue_plugin_isotope', true ) ) {
            wp_register_script( 'isotope', visual_portfolio()->plugin_url . 'assets/vendor/isotope-layout/dist/isotope.pkgd.min.js', array( 'jquery' ), '3.0.6', true );
        }

        // fjGallery.
        if ( apply_filters( 'vpf_enqueue_plugin_flickr_justified_gallery', true ) ) {
            wp_register_script( 'flickr-justified-gallery', visual_portfolio()->plugin_url . 'assets/vendor/flickr-justified-gallery/dist/fjGallery.min.js', array( 'jquery' ), '2.1.2', true );
        }

        // PhotoSwipe.
        if ( 'photoswipe' === $popup_vendor && apply_filters( 'vpf_enqueue_plugin_photoswipe', true ) ) {
            wp_register_style( 'photoswipe', visual_portfolio()->plugin_url . 'assets/vendor/photoswipe/dist/photoswipe.css', array(), '4.1.3' );
            wp_register_style( 'photoswipe-default-skin', visual_portfolio()->plugin_url . 'assets/vendor/photoswipe/dist/default-skin/default-skin.css', array( 'photoswipe' ), '4.1.3' );
            wp_register_script( 'photoswipe', visual_portfolio()->plugin_url . 'assets/vendor/photoswipe/dist/photoswipe.min.js', array( 'jquery' ), '4.1.3', true );
            wp_register_script( 'photoswipe-ui-default', visual_portfolio()->plugin_url . 'assets/vendor/photoswipe/dist/photoswipe-ui-default.min.js', array( 'jquery', 'photoswipe' ), '4.1.3', true );

            // Fancybox.
        } elseif ( 'fancybox' === $popup_vendor && apply_filters( 'vpf_enqueue_plugin_fancybox', true ) ) {
            wp_register_style( 'fancybox', visual_portfolio()->plugin_url . 'assets/vendor/fancybox/dist/jquery.fancybox.min.css', array(), '3.5.7' );
            wp_register_script( 'fancybox', visual_portfolio()->plugin_url . 'assets/vendor/fancybox/dist/jquery.fancybox.min.js', array( 'jquery' ), '3.5.7', true );
        }

        // Swiper.
        if ( apply_filters( 'vpf_enqueue_plugin_swiper', true ) ) {
            wp_register_style( 'swiper', visual_portfolio()->plugin_url . 'assets/vendor/swiper/swiper-bundle.min.css', array(), '8.4.7' );
            wp_register_script( 'swiper', visual_portfolio()->plugin_url . 'assets/vendor/swiper/swiper-bundle.min.js', array(), '8.4.7', true );
        }

        // Simplebar.
        if ( apply_filters( 'vpf_enqueue_plugin_simplebar', true ) ) {
            wp_register_style( 'simplebar', visual_portfolio()->plugin_url . 'assets/vendor/simplebar/dist/simplebar.min.css', array(), '5.3.0' );
            wp_register_script( 'simplebar', visual_portfolio()->plugin_url . 'assets/vendor/simplebar/dist/simplebar.min.js', array(), '5.3.0', true );
        }

        // LazySizes.
        if ( apply_filters( 'vpf_enqueue_plugin_lazysizes', true ) ) {
            wp_register_script( 'lazysizes-config', visual_portfolio()->plugin_url . 'assets/js/lazysizes-cfg.min.js', array(), '@@plugin_version', true );
            wp_register_script( 'lazysizes-object-fit-cover', visual_portfolio()->plugin_url . 'assets/js/lazysizes-object-fit-cover.min.js', array(), '4.1.0', true );
            wp_register_script( 'lazysizes-swiper-duplicates-load', visual_portfolio()->plugin_url . 'assets/js/lazysizes-swiper-duplicates-load.min.js', array(), '@@plugin_version', true );
            wp_register_script( 'lazysizes', visual_portfolio()->plugin_url . 'assets/vendor/lazysizes/lazysizes.min.js', array( 'lazysizes-config', 'lazysizes-object-fit-cover', 'lazysizes-swiper-duplicates-load' ), '5.2.2', true );
        }

        // Visual Portfolio CSS.
        $vp_styles = array(
            'visual-portfolio'                  => array( 'assets/css/main.min.css', $vp_style_deps ),
            'visual-portfolio-elementor'        => array( 'assets/css/elementor.min.css', array( 'visual-portfolio' ) ),
            'visual-portfolio-lazyload'         => array( 'assets/css/lazyload.min.css', array() ),
            'visual-portfolio-custom-scrollbar' => array( 'assets/css/custom-scrollbar.min.css', array( 'simplebar' ) ),
            'visual-portfolio-layout-justified' => array( 'assets/css/layout-justified.min.css', array( 'visual-portfolio' ) ),
            'visual-portfolio-layout-slider'    => array( 'assets/css/layout-slider.min.css', array( 'visual-portfolio', 'swiper' ) ),
            'visual-portfolio-layout-masonry'   => array( 'assets/css/layout-masonry.min.css', array( 'visual-portfolio' ) ),
            'visual-portfolio-layout-grid'      => array( 'assets/css/layout-grid.min.css', array( 'visual-portfolio' ) ),
            'visual-portfolio-layout-tiles'     => array( 'assets/css/layout-tiles.min.css', array( 'visual-portfolio' ) ),
            'visual-portfolio-popup-fancybox'   => array( 'assets/css/popup-fancybox.min.css', array( 'visual-portfolio', 'fancybox' ) ),
            'visual-portfolio-popup-photoswipe' => array( 'assets/css/popup-photoswipe.min.css', array( 'visual-portfolio', 'photoswipe-default-skin' ) ),
        );

        foreach ( $vp_styles as $name => $data ) {
            wp_register_style( $name, visual_portfolio()->plugin_url . $data[0], $data[1], '@@plugin_version' );
            wp_style_add_data( $name, 'rtl', 'replace' );
            wp_style_add_data( $name, 'suffix', '.min' );
        }

        // Visual Portfolio JS.
        $vp_scripts = array(
            'visual-portfolio' => array(
                'assets/js/main.min.js',
                $vp_deps,
            ),
            'visual-portfolio-plugin-isotope' => array(
                'assets/js/plugin-isotope.min.js',
                array(
                    'jquery',
                    'isotope',
                ),
            ),
            'visual-portfolio-plugin-fj-gallery' => array(
                'assets/js/plugin-fj-gallery.min.js',
                array(
                    'jquery',
                    'flickr-justified-gallery',
                ),
            ),
            'visual-portfolio-plugin-swiper' => array(
                'assets/js/plugin-swiper.min.js',
                array(
                    'jquery',
                    'swiper',
                ),
            ),
            'visual-portfolio-custom-scrollbar' => array(
                'assets/js/custom-scrollbar.min.js',
                array(
                    'jquery',
                    'simplebar',
                ),
            ),
            'visual-portfolio-lazyload' => array(
                'assets/js/lazyload.min.js',
                array(
                    'jquery',
                    'lazysizes',
                ),
            ),
            'visual-portfolio-popup-gallery' => array(
                'assets/js/popup-gallery.min.js',
                array(
                    'jquery',
                ),
            ),
            'visual-portfolio-plugin-photoswipe' => array(
                'assets/js/plugin-photoswipe.min.js',
                array(
                    'jquery',
                    'photoswipe-ui-default',
                    'visual-portfolio-popup-gallery',
                ),
            ),
            'visual-portfolio-plugin-fancybox' => array(
                'assets/js/plugin-fancybox.min.js',
                array(
                    'jquery',
                    'fancybox',
                    'visual-portfolio-popup-gallery',
                ),
            ),
            'visual-portfolio-layout-masonry' => array(
                'assets/js/layout-masonry.min.js',
                array(
                    'jquery',
                    'visual-portfolio-plugin-isotope',
                ),
            ),
            'visual-portfolio-layout-grid' => array(
                'assets/js/layout-grid.min.js',
                array(
                    'jquery',
                    'visual-portfolio-plugin-isotope',
                ),
            ),
            'visual-portfolio-layout-tiles' => array(
                'assets/js/layout-tiles.min.js',
                array(
                    'jquery',
                    'visual-portfolio-plugin-isotope',
                ),
            ),
            'visual-portfolio-layout-justified' => array(
                'assets/js/layout-justified.min.js',
                array(
                    'jquery',
                    'visual-portfolio-plugin-fj-gallery',
                ),
            ),
            'visual-portfolio-layout-slider' => array(
                'assets/js/layout-slider.min.js',
                array(
                    'jquery',
                    'visual-portfolio-plugin-swiper',
                ),
            ),
            'visual-portfolio-items-style-fly' => array(
                'assets/js/items-style-fly.min.js',
                array(
                    'jquery',
                ),
            ),
            'visual-portfolio-pagination-infinite' => array(
                'assets/js/pagination-infinite.min.js',
                array(
                    'jquery',
                ),
            ),
            'visual-portfolio-pagination-minimal-paged' => array(
                'assets/js/pagination-minimal-paged.min.js',
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
        $bg_color = Visual_Portfolio_Settings::get_option( 'background_color', 'vp_popup_gallery' );

        if ( $bg_color ) {
            wp_add_inline_style( 'visual-portfolio-popup-fancybox', '.vp-fancybox .fancybox-bg { background-color: ' . esc_attr( $bg_color ) . '; }' );
            wp_add_inline_style( 'visual-portfolio-popup-photoswipe', '.vp-pswp .pswp__bg { background-color: ' . esc_attr( $bg_color ) . '; }' );
        }
    }

    /**
     * Add popup for default WordPress images.
     */
    public function assets_for_default_wordpress_images() {
        if ( Visual_Portfolio_Settings::get_option( 'enable_on_wordpress_images', 'vp_popup_gallery' ) ) {
            self::enqueue_popup_assets();
        }
        if ( 'full' === Visual_Portfolio_Settings::get_option( 'lazy_loading', 'vp_images' ) ) {
            self::enqueue_lazyload_assets();
        }
    }

    /**
     * Add global Visual Portfolio data.
     */
    public function localize_global_data() {
        $data = array(
            'version'              => '@@plugin_version',
            '__'                   => array(
                // translators: %s - plugin name.
                'couldnt_retrieve_vp'  => sprintf( __( 'Couldn\'t retrieve %s ID.', '@@text_domain' ), visual_portfolio()->plugin_name ),

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
                // Default WordPress Images.
                'enable_on_wordpress_images'       => Visual_Portfolio_Settings::get_option( 'enable_on_wordpress_images', 'vp_popup_gallery' ),

                // Vendor.
                'vendor'                           => Visual_Portfolio_Settings::get_option( 'vendor', 'vp_popup_gallery' ),

                // Deep Linking.
                'deep_linking'                     => Visual_Portfolio_Settings::get_option( 'deep_linking', 'vp_popup_gallery' ),
                'deep_linking_url_to_share_images' => Visual_Portfolio_Settings::get_option( 'deep_linking_url_to_share_images', 'vp_popup_gallery' ),

                // General.
                'show_arrows'                      => Visual_Portfolio_Settings::get_option( 'show_arrows', 'vp_popup_gallery' ),
                'show_counter'                     => Visual_Portfolio_Settings::get_option( 'show_counter', 'vp_popup_gallery' ),
                'show_zoom_button'                 => Visual_Portfolio_Settings::get_option( 'show_zoom_button', 'vp_popup_gallery' ),
                'show_fullscreen_button'           => Visual_Portfolio_Settings::get_option( 'show_fullscreen_button', 'vp_popup_gallery' ),
                'show_share_button'                => Visual_Portfolio_Settings::get_option( 'show_share_button', 'vp_popup_gallery' ),
                'show_close_button'                => Visual_Portfolio_Settings::get_option( 'show_close_button', 'vp_popup_gallery' ),

                // Fancybox.
                'show_thumbs'                      => Visual_Portfolio_Settings::get_option( 'show_thumbs', 'vp_popup_gallery' ),
                'show_download_button'             => Visual_Portfolio_Settings::get_option( 'show_download_button', 'vp_popup_gallery' ),
                'show_slideshow'                   => Visual_Portfolio_Settings::get_option( 'show_slideshow', 'vp_popup_gallery' ),

                'click_to_zoom'                    => Visual_Portfolio_Settings::get_option( 'click_to_zoom', 'vp_popup_gallery' ),
            ),

            // Screen sizes (breakpoints) for responsive feature: xs, sm, md, lg, xl.
            'screenSizes'          => Visual_Portfolio_Breakpoints::get_breakpoints(),
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

        self::$head_css_included = true;
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
     * Add noscript styles.
     * Previously we used the `style_loader_tag` filter to add noscript to enqueued CSS,
     * but it is not working properly with optimizations plugins.
     */
    public function add_noscript_styles() {
        $styles      = '';
        $styles_path = visual_portfolio()->plugin_path . '/assets/css/noscript.min.css';

        if ( file_exists( $styles_path ) ) {
            // phpcs:ignore WordPress.WP.AlternativeFunctions.file_get_contents_file_get_contents
            $styles = file_get_contents( $styles_path );
            $styles = str_replace( '&gt;', '>', $styles );
        }

        if ( ! $styles ) {
            return;
        }

        ?>
        <noscript>
            <style type="text/css">
                <?php echo wp_kses( $styles, array( '\'', '\"' ) ); ?>
            </style>
        </noscript>
        <?php
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
                self::enqueue( array( 'id' => $id ) );
            }
        }
    }

    /**
     * Parse blocks from content.
     *
     * @param array $blocks - blocks list.
     */
    public function maybe_parse_blocks_from_content( $blocks ) {
        if ( empty( $blocks ) ) {
            return;
        }

        foreach ( $blocks as $block ) {
            // Block.
            if (
                isset( $block['blockName'] ) &&
                'visual-portfolio/block' === $block['blockName'] &&
                isset( $block['attrs']['content_source'] ) &&
                isset( $block['attrs']['block_id'] )
            ) {
                self::enqueue( $block['attrs'] );

                // Saved block.
            } elseif (
                isset( $block['blockName'] ) &&
                (
                    'visual-portfolio/saved' === $block['blockName'] ||
                    'nk/visual-portfolio' === $block['blockName']
                ) &&
                isset( $block['attrs']['id'] )
            ) {
                self::enqueue( $block['attrs'] );
            }
        }
    }
}

new Visual_Portfolio_Assets();
