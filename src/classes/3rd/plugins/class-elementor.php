<?php
/**
 * Class for Elementor
 *
 * @package @@plugin_name/elementor
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

/**
 * Class Visual_Portfolio_3rd_Elementor
 */
class Visual_Portfolio_3rd_Elementor {
    /**
     * Lightbox fix added.
     *
     * @var boolean
     */
    public $lightbox_fix_added = false;

    /**
     * Visual_Portfolio_3rd_Elementor constructor.
     */
    public function __construct() {
        add_action( 'elementor/widgets/register', array( $this, 'register_widget' ) );

        // We should also try to include this script in the footer,
        // since caching plugins place jQuery in the footer, and our script depends on it.
        add_action( 'wp_body_open', array( $this, 'maybe_fix_elementor_lightobx_conflict' ) );
        add_action( 'wp_footer', array( $this, 'maybe_fix_elementor_lightobx_conflict' ), 20 );
    }

    /**
     * Register widget
     */
    public function register_widget() {
        require_once visual_portfolio()->plugin_path . 'classes/3rd/plugins/class-elementor-widget.php';

        \Elementor\Plugin::instance()->widgets_manager->register( new Visual_Portfolio_3rd_Elementor_Widget() );
    }

    /**
     * Fix Elementor lightbox conflict.
     *
     * @see https://github.com/nk-crew/visual-portfolio/issues/103
     */
    public function maybe_fix_elementor_lightobx_conflict() {
        if ( ! defined( 'ELEMENTOR_VERSION' ) ) {
            return;
        }

        // We should check it, as we are trying to inject this script twice.
        if ( $this->lightbox_fix_added ) {
            return;
        }

        if ( ! wp_script_is( 'jquery', 'enqueued' ) ) {
            return;
        }

        $this->lightbox_fix_added = true;

        ?>
        <script>
            (function($) {
                if (!$) {
                    return;
                }

                // Previously we added this code on Elementor pages only,
                // but sometimes Lightbox enabled globally and it still conflicting with our galleries.
                // if (!$('.elementor-page').length) {
                //     return;
                // }

                function addDataAttribute($items) {
                    $items.find('.vp-portfolio__item a:not([data-elementor-open-lightbox])').each(function () {
                        if (/\.(png|jpe?g|gif|svg|webp)(\?.*)?$/i.test(this.href)) {
                            this.dataset.elementorOpenLightbox = 'no';
                        }
                    });
                }

                $(document).on('init.vpf', function(event, vpObject) {
                    if ('vpf' !== event.namespace) {
                        return;
                    }

                    addDataAttribute(vpObject.$item);
                });
                $(document).on('addItems.vpf', function(event, vpObject, $items) {
                    if ('vpf' !== event.namespace) {
                        return;
                    }

                    addDataAttribute($items);
                });
            })(window.jQuery);
        </script>
        <?php
    }
}

new Visual_Portfolio_3rd_Elementor();
