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
     * Visual_Portfolio_3rd_Elementor constructor.
     */
    public function __construct() {
        add_action( 'elementor/widgets/widgets_registered', array( $this, 'widgets_registered' ) );
        add_action( 'wp_body_open', array( $this, 'maybe_fix_elementor_lightobx_conflict' ) );
    }

    /**
     * Register widget
     */
    public function widgets_registered() {
        require_once visual_portfolio()->plugin_path . 'classes/3rd/plugins/class-elementor-widget.php';

        \Elementor\Plugin::instance()->widgets_manager->register_widget_type( new Visual_Portfolio_3rd_Elementor_Widget() );
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

        ?>
        <script>
            (function($) {
                if (!$('.elementor-page').length) {
                    return;
                }

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
