<?php
/**
 * Plugin Name:  Visual Portfolio, Posts & Image Gallery
 * Description:  Modern gallery and portfolio plugin with advanced layouts editor. Clean and powerful gallery styles with enormous settings in the Gutenberg block.
 * Version:      3.2.0
 * Author:       Visual Portfolio Team
 * Author URI:   https://visualportfolio.co/?utm_source=wordpress.org&utm_medium=readme&utm_campaign=byline
 * License:      GPLv2 or later
 * License URI:  https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:  visual-portfolio
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

if ( ! defined( 'VISUAL_PORTFOLIO_VERSION' ) ) {
	define( 'VISUAL_PORTFOLIO_VERSION', '3.2.0' );
}

if ( ! class_exists( 'Visual_Portfolio' ) ) :
	/**
	 * Visual Portfolio Class
	 */
	class Visual_Portfolio {
		/**
		 * The single class instance.
		 *
		 * @var $instance
		 */
		private static $instance = null;

		/**
		 * Main Instance
		 * Ensures only one instance of this class exists in memory at any one time.
		 */
		public static function instance() {
			if ( is_null( self::$instance ) ) {
				self::$instance = new self();
				self::$instance->init();
			}
			return self::$instance;
		}

		/**
		 * Name of the plugin
		 *
		 * @var $plugin_name
		 */
		public $plugin_name;

		/**
		 * Basename of plugin main file
		 *
		 * @var $plugin_basename
		 */
		public $plugin_basename;

		/**
		 * Path to the plugin directory
		 *
		 * @var $plugin_path
		 */
		public $plugin_path;

		/**
		 * URL to the plugin directory
		 *
		 * @var $plugin_url
		 */
		public $plugin_url;

		/**
		 * Path to the pro plugin directory
		 *
		 * @var $plugin_path
		 */
		public $pro_plugin_path;

		/**
		 * URL to the pro plugin directory
		 *
		 * @var $plugin_url
		 */
		public $pro_plugin_url;

		/**
		 * Visual_Portfolio constructor.
		 */
		public function __construct() {
			/* We do nothing here! */
		}

		/**
		 * Init options
		 */
		public function init() {
			$this->plugin_name     = esc_html__( 'Visual Portfolio', 'visual-portfolio' );
			$this->plugin_basename = plugin_basename( __FILE__ );
			$this->plugin_path     = plugin_dir_path( __FILE__ );
			$this->plugin_url      = plugin_dir_url( __FILE__ );

			if ( function_exists( 'visual_portfolio_pro' ) ) {
				$this->pro_plugin_path = plugin_dir_path( WP_PLUGIN_DIR . '/visual-portfolio-pro/class-visual-portfolio-pro.php' );
				$this->pro_plugin_url  = plugin_dir_url( WP_PLUGIN_DIR . '/visual-portfolio-pro/class-visual-portfolio-pro.php' );
			}

			// load textdomain.
			load_plugin_textdomain( 'visual-portfolio', false, basename( dirname( __FILE__ ) ) . '/languages' );

			// Hooks.
			add_action( 'init', array( $this, 'run_deferred_rewrite_rules' ), 20 );

			// include helper files.
			$this->include_dependencies();
		}

		/**
		 * Rewrite Flush Rules if set Transient right after we registered the Portfolio post type.
		 * ! This is important part, since flush will work only once the post type registered.
		 *
		 * TODO: re-check this code, as it looks strange.
		 *
		 * @return void
		 */
		public function run_deferred_rewrite_rules() {
			if ( get_transient( 'vp_flush_rewrite_rules' ) ) {
				$this->flush_rewrite_rules();
				delete_transient( 'vp_flush_rewrite_rules' );
			}
		}

		/**
		 * Deferred Rewrite Flush Rules.
		 *
		 * @return void
		 */
		public function defer_flush_rewrite_rules() {
			set_transient( 'vp_flush_rewrite_rules', true );
		}

		/**
		 * Rewrite Flush Rules.
		 *
		 * @return void
		 */
		public function flush_rewrite_rules() {
			flush_rewrite_rules();
		}

		/**
		 * Activation Hook
		 */
		public function activation_hook() {
			// Welcome Page Flag.
			set_transient( '_visual_portfolio_welcome_screen_activation_redirect', true, 30 );

			$this->defer_flush_rewrite_rules();
		}

		/**
		 * Deactivation Hook
		 */
		public function deactivation_hook() {
			// Sometimes users can't access projects.
			// As a workaround user may deactivate and activate the plugin to resolve this problem.
			update_option( 'visual_portfolio_updated_caps', '' );

			$this->flush_rewrite_rules();
		}

		/**
		 * Include dependencies
		 */
		private function include_dependencies() {
			// Deprecations run before all features.
			require_once $this->plugin_path . 'classes/class-deprecated.php';

			require_once $this->plugin_path . 'classes/class-security.php';
			require_once $this->plugin_path . 'gutenberg/utils/control-condition-check/index.php';
			require_once $this->plugin_path . 'gutenberg/utils/control-get-value/index.php';
			require_once $this->plugin_path . 'gutenberg/utils/controls-dynamic-css/index.php';
			require_once $this->plugin_path . 'gutenberg/utils/encode-decode/index.php';
			require_once $this->plugin_path . 'classes/class-templates.php';
			require_once $this->plugin_path . 'classes/class-parse-blocks.php';
			require_once $this->plugin_path . 'classes/class-assets.php';
			require_once $this->plugin_path . 'classes/class-breakpoints.php';
			require_once $this->plugin_path . 'classes/class-image-placeholder.php';

			// this settings class order is required.
			require_once $this->plugin_path . 'classes/class-settings.php';
			require_once $this->plugin_path . 'classes/class-welcome-screen.php';
			require_once $this->plugin_path . 'classes/class-ask-review.php';
			require_once $this->plugin_path . 'classes/class-images.php';
			require_once $this->plugin_path . 'classes/class-rest.php';
			require_once $this->plugin_path . 'classes/class-get-portfolio.php';
			require_once $this->plugin_path . 'classes/class-gutenberg.php';
			require_once $this->plugin_path . 'classes/class-gutenberg-saved.php';
			require_once $this->plugin_path . 'classes/class-shortcode.php';
			require_once $this->plugin_path . 'classes/class-preview.php';
			require_once $this->plugin_path . 'classes/class-custom-post-type.php';
			require_once $this->plugin_path . 'classes/class-custom-post-meta.php';
			require_once $this->plugin_path . 'classes/class-admin.php';
			require_once $this->plugin_path . 'classes/class-controls.php';
			require_once $this->plugin_path . 'classes/class-supported-themes.php';
			require_once $this->plugin_path . 'classes/class-archive-mapping.php';
			require_once $this->plugin_path . 'classes/class-sitemap.php';
			require_once $this->plugin_path . 'classes/class-seo-optimization.php';
			require_once $this->plugin_path . 'classes/class-deactivate-duplicate-plugin.php';

			// 3rd code integration.
			require_once $this->plugin_path . 'classes/3rd/plugins/class-a3-lazy-load.php';
			require_once $this->plugin_path . 'classes/3rd/plugins/class-divi.php';
			require_once $this->plugin_path . 'classes/3rd/plugins/class-elementor.php';
			require_once $this->plugin_path . 'classes/3rd/plugins/class-ewww-image-optimizer.php';
			require_once $this->plugin_path . 'classes/3rd/plugins/class-imagify.php';
			require_once $this->plugin_path . 'classes/3rd/plugins/class-jetpack.php';
			require_once $this->plugin_path . 'classes/3rd/plugins/class-lazy-loading-responsive-images.php';
			require_once $this->plugin_path . 'classes/3rd/plugins/class-paid-memberships-pro.php';
			require_once $this->plugin_path . 'classes/3rd/plugins/class-sg-cachepress.php';
			require_once $this->plugin_path . 'classes/3rd/plugins/class-tinymce.php';
			require_once $this->plugin_path . 'classes/3rd/plugins/class-vc.php';
			require_once $this->plugin_path . 'classes/3rd/plugins/class-wp-rocket.php';
			require_once $this->plugin_path . 'classes/3rd/plugins/class-wpml.php';
			require_once $this->plugin_path . 'classes/3rd/plugins/class-rank-math.php';
			require_once $this->plugin_path . 'classes/3rd/plugins/class-yoast.php';
			require_once $this->plugin_path . 'classes/3rd/plugins/class-all-in-one-seo.php';
			require_once $this->plugin_path . 'classes/3rd/themes/class-avada.php';
			require_once $this->plugin_path . 'classes/3rd/themes/class-enfold.php';
			require_once $this->plugin_path . 'classes/3rd/themes/class-thrive-architect.php';

			// Migration run after all features.
			require_once $this->plugin_path . 'classes/class-migration.php';
		}

		/**
		 * Include template
		 *
		 * @param string $template_name file name.
		 * @param array  $args args for template.
		 */
		public function include_template( $template_name, $args = array() ) {
			Visual_Portfolio_Templates::include_template( $template_name, $args );
		}

		/**
		 * Find css template file
		 *
		 * @param string $template_name file name.
		 *
		 * @return string
		 */
		public function find_template_styles( $template_name ) {
			return Visual_Portfolio_Templates::find_template_styles( $template_name );
		}

		/**
		 * Include template style
		 *
		 * @param string           $handle style handle name.
		 * @param string           $template_name file name.
		 * @param array            $deps dependencies array.
		 * @param string|bool|null $ver version string.
		 * @param string           $media media string.
		 */
		public function include_template_style( $handle, $template_name, $deps = array(), $ver = false, $media = 'all' ) {
			Visual_Portfolio_Templates::include_template_style( $handle, $template_name, $deps, $ver, $media );
		}

		/**
		 * Get oEmbed data
		 *
		 * @param string $url - url of oembed.
		 * @param int    $width - width of oembed.
		 * @param int    $height - height of oembed.
		 *
		 * @return array|bool|false|object
		 */
		public function get_oembed_data( $url, $width = null, $height = null ) {
			$cache_name = 'vp_oembed_data_' . $url . ( $width ? $width : '' ) . ( $height ? $height : '' );
			$cached     = get_transient( $cache_name );

			if ( $cached ) {
				return $cached;
			}

			if ( function_exists( '_wp_oembed_get_object' ) ) {
				require_once ABSPATH . WPINC . '/class-oembed.php';
			}

			$args = array();
			if ( $width ) {
				$args['width'] = $width;
			}
			if ( $height ) {
				$args['height'] = $height;
			}

			// If height is not given, but the width is, use 1080p aspect ratio. And vice versa.
			if ( $width && ! $height ) {
				$args['height'] = $width * ( 1080 / 1920 );
			}
			if ( ! $width && $height ) {
				$args['width'] = $height * ( 1920 / 1080 );
			}

			$oembed   = _wp_oembed_get_object();
			$provider = $oembed->get_provider( $url, $args );
			$data     = $oembed->fetch( $provider, $url, $args );

			if ( $data ) {
				$data = (array) $data;
				if ( ! isset( $data['url'] ) ) {
					$data['url'] = $url;
				}
				if ( ! isset( $data['provider'] ) ) {
					$data['provider'] = $provider;
				}

				// Convert url to hostname, eg: "youtube" instead of "https://youtube.com/".
				$data['provider-name'] = pathinfo( str_replace( array( 'www.' ), '', wp_parse_url( $url, PHP_URL_HOST ) ), PATHINFO_FILENAME );

				// save cache.
				set_transient( $cache_name, $data, DAY_IN_SECONDS );

				return $data;
			}

			return false;
		}
	}

	/**
	 * Function works with the Visual_Portfolio class instance
	 *
	 * @return object Visual_Portfolio
	 */
	function visual_portfolio() {
		return Visual_Portfolio::instance();
	}
	add_action( 'plugins_loaded', 'visual_portfolio' );

	register_activation_hook( __FILE__, array( visual_portfolio(), 'activation_hook' ) );
	register_deactivation_hook( __FILE__, array( visual_portfolio(), 'deactivation_hook' ) );
endif;
