<?php
/**
 * Class for Elementor
 *
 * @package visual-portfolio/elementor
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
		add_action( 'wp_body_open', array( $this, 'maybe_fix_elementor_lightbox_conflict' ) );
		add_action( 'wp_footer', array( $this, 'maybe_fix_elementor_lightbox_conflict' ), 20 );

		// Compatibility code for Swiper library.
		add_action( 'wp_enqueue_scripts', array( $this, 'fix_elementor_swiper_assets' ), 101 );
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
	public function maybe_fix_elementor_lightbox_conflict() {
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

	/**
	 * Add Swiper from the Elementor plugin to prevent conflicts.
	 *
	 * @link https://wordpress.org/support/topic/visual-portfolio-elementor-issue/ - Old Elementor (< v3.11.0) and their lightbox is not working properly if we include new Swiper library.
	 * @link https://wordpress.org/support/topic/elementor-image-carousel-navigation-is-affected-by-this-plugin/ - New Elementor (>= 3.11.0) added support for the latest version of Swiper library and changed their old fallback Swiper library. This is why we have to include Swiper's assets instead of ours.
	 */
	public function fix_elementor_swiper_assets() {
		if ( ! class_exists( '\Elementor\Plugin' ) || ! isset( \Elementor\Plugin::$instance->experiments ) || ! defined( 'ELEMENTOR_URL' ) ) {
			return;
		}

		global $wp_scripts;
		global $wp_styles;

		// Since the Elementor assets methods like `get_css_assets_url` are protected
		// and we can't use it directly, we prepare assets URLs manually.
		$e_swiper_latest       = \Elementor\Plugin::$instance->experiments->is_feature_active( 'e_swiper_latest' );
		$e_swiper_asset_path   = $e_swiper_latest ? 'assets/lib/swiper/v8/' : 'assets/lib/swiper/';
		$e_swiper_version      = $e_swiper_latest ? '8.4.5' : '5.3.6';
		$e_file_name           = 'swiper';
		$e_assets_base_url     = ELEMENTOR_URL;
		$e_assets_relative_url = 'assets/';
		$e_css_relative_url    = $e_swiper_asset_path . 'css/';
		$e_js_relative_url     = $e_swiper_asset_path;

		if ( ! $e_css_relative_url ) {
			$e_css_relative_url = $e_assets_relative_url . 'css/';
		}
		if ( ! $e_js_relative_url ) {
			$e_js_relative_url = $e_assets_relative_url;
		}

		$e_swiper_css_url = $e_assets_base_url . $e_css_relative_url . $e_file_name . '.css';
		$e_swiper_js_url  = $e_assets_base_url . $e_js_relative_url . $e_file_name . '.js';

		// Elementor < 3.11.0 does not have a Swiper CSS file.
		if ( version_compare( ELEMENTOR_VERSION, '3.11.0', '<' ) ) {
			$e_swiper_css_url = visual_portfolio()->plugin_url . 'assets/vendor/swiper-5-3-6/swiper.min.css';
		}

		// Since we include Swiper library ourselves, here we have to override assets URLs.
		if ( isset( $wp_scripts->registered['swiper']->src ) ) {
			$wp_scripts->registered['swiper']->src = $e_swiper_js_url;
			$wp_scripts->registered['swiper']->ver = $e_swiper_version;
		}
		if ( isset( $wp_styles->registered['swiper']->src ) ) {
			$wp_styles->registered['swiper']->src = $e_swiper_css_url;
			$wp_styles->registered['swiper']->ver = $e_swiper_version;
		}
	}
}

new Visual_Portfolio_3rd_Elementor();
