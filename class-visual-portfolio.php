<?php
/**
 * Plugin Name:  Visual Portfolio
 * Description:  Gallery and portfolio plugin with gallery blocks and layouts for the editor.
 * Version:      3.8.1
 * Plugin URI:   https://www.visualportfolio.com/?utm_source=wordpress.org&utm_medium=readme&utm_campaign=byline
 * Author:       Visual Portfolio Team
 * Author URI:   https://www.visualportfolio.com/?utm_source=wordpress.org&utm_medium=readme&utm_campaign=byline
 * License:      GPLv2 or later
 * License URI:  https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:  visual-portfolio
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/*
 * Visual Portfolio Pro carries its own copy of this core, so only one of the two
 * may run. Which copy PHP reaches first depends on the order WordPress includes
 * plugins in, and that order is not ours to pick: network-activated plugins come
 * before site-activated ones, and a third party can reorder `active_plugins`. So
 * the standalone plugin steps aside on its own whenever the Pro plugin is active,
 * before it defines anything at all.
 *
 * Only the activated plugin steps aside. The copy inside the Pro plugin, and any
 * copy embedded in a theme or another plugin, is not in the list below and keeps
 * loading as before.
 */
$vpf_active_plugins = (array) get_option( 'active_plugins', array() );

if ( is_multisite() ) {
	$vpf_active_plugins = array_merge(
		$vpf_active_plugins,
		array_keys( (array) get_site_option( 'active_sitewide_plugins', array() ) )
	);
}

if (
	in_array( plugin_basename( __FILE__ ), $vpf_active_plugins, true ) &&
	in_array( 'visual-portfolio-pro/class-visual-portfolio-pro.php', $vpf_active_plugins, true )
) {
	$vpf_pro_file = WP_PLUGIN_DIR . '/visual-portfolio-pro/class-visual-portfolio-pro.php';

	// `active_plugins` goes on naming a plugin whose directory was removed by hand
	// and WordPress simply skips it, so stepping aside for one of those would leave
	// the site with neither plugin.
	$vpf_step_aside = file_exists( $vpf_pro_file );

	/*
	 * Pro up to 3.8.0 reads an undefined `VISUAL_PORTFOLIO_VERSION` as a sign that
	 * an unsupported core is installed, and deactivates this plugin from its own
	 * bootstrap. On a network that takes it off every site, including the ones with
	 * no Pro at all, so this copy loads in front of such a Pro and leaves the class
	 * guard below to keep it inert. Once `VISUAL_PORTFOLIO_PRO` is defined that
	 * decision is already behind us for this request, and the version is moot.
	 */
	if ( $vpf_step_aside && ! defined( 'VISUAL_PORTFOLIO_PRO' ) ) {
		$vpf_pro_data = get_file_data( $vpf_pro_file, array( 'Version' => 'Version' ) );

		$vpf_step_aside = ! empty( $vpf_pro_data['Version'] ) &&
			version_compare( $vpf_pro_data['Version'], '3.8.1-alpha', '>=' );

		unset( $vpf_pro_data );
	}

	unset( $vpf_pro_file );

	if ( $vpf_step_aside ) {
		unset( $vpf_active_plugins, $vpf_step_aside );
		return;
	}

	unset( $vpf_step_aside );
}

unset( $vpf_active_plugins );

if ( ! defined( 'VISUAL_PORTFOLIO_VERSION' ) ) {
	define( 'VISUAL_PORTFOLIO_VERSION', '3.8.1' );
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
		 * Check if Pro plugin is active.
		 *
		 * @return bool
		 */
		public function is_pro() {
			return defined( 'VISUAL_PORTFOLIO_PRO' ) || function_exists( 'visual_portfolio_pro' );
		}

		/**
		 * Check if the Gallery Loop block family can be registered.
		 *
		 * The family is written against the current editor rather than the oldest
		 * one it could be made to work on: Interactivity API and script modules
		 * (6.5), block bindings (6.5), responsive block styles and interactive
		 * state styling (7.1). Columns and hover states are expressed through the
		 * viewport and `:hover` mechanisms core now owns instead of a private
		 * fallback of ours, and that is the version those exist in.
		 *
		 * One gate for the whole family, so no file inside it needs a version
		 * branch or a `function_exists` guard of its own.
		 *
		 * The plugin minimum stays where it is - the legacy blocks hold it, and
		 * they keep working on every version they always did.
		 *
		 * @return bool
		 */
		public function supports_loop_blocks() {
			// `7.1-RC2` and `7.1-beta1` carry the 7.1 APIs, but `version_compare`
			// ranks a pre-release below the release it precedes, so comparing the
			// raw string would refuse the blocks to exactly the people testing
			// them earliest.
			$version = preg_replace( '/-.*$/', '', get_bloginfo( 'version' ) );

			return version_compare( $version, '7.1', '>=' );
		}

		/**
		 * Init options
		 */
		public function init() {
			$this->plugin_basename = plugin_basename( __FILE__ );
			$this->plugin_path     = plugin_dir_path( __FILE__ );
			$this->plugin_url      = plugin_dir_url( __FILE__ );

			$this->set_pro_plugin_paths();

			// include helper files.
			$this->include_dependencies();

			// Hooks.
			add_action( 'plugins_loaded', array( $this, 'set_pro_plugin_paths' ) );
			add_action( 'init', array( $this, 'earlier_init_hook' ), 5 );
			add_action( 'init', array( $this, 'init_hook' ) );
			add_action( 'init', array( $this, 'run_deferred_rewrite_rules' ), 20 );
		}

		/**
		 * Point at the Pro plugin directory, for the new standalone Pro plugin and for the
		 * old Pro addon plugin alike.
		 *
		 * `register_activation_hook()` builds this instance while the main file is being
		 * included, so `init()` can run before the Pro plugin's own file has, and `is_pro()`
		 * would answer no. Asking again once every plugin is in keeps the Pro template and
		 * style lookups in `Visual_Portfolio_Templates` working whichever of the two loaded
		 * first.
		 */
		public function set_pro_plugin_paths() {
			if ( ! $this->is_pro() ) {
				return;
			}

			$this->pro_plugin_path = plugin_dir_path( WP_PLUGIN_DIR . '/visual-portfolio-pro/class-visual-portfolio-pro.php' );
			$this->pro_plugin_url  = plugin_dir_url( WP_PLUGIN_DIR . '/visual-portfolio-pro/class-visual-portfolio-pro.php' );
		}

		/**
		 * Earlier init hook to safety use plugin name in standard init hook.
		 */
		public function earlier_init_hook() {
			$this->plugin_name = esc_html__( 'Visual Portfolio', 'visual-portfolio' );
		}

		/**
		 * Init hook.
		 */
		public function init_hook() {
			// load textdomain.
			load_plugin_textdomain( 'visual-portfolio', false, basename( __DIR__ ) . '/languages' );
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
			require_once $this->plugin_path . 'gutenberg/utils/convert-legacy-attributes/index.php';
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
			require_once $this->plugin_path . 'classes/class-dashboard.php';
			require_once $this->plugin_path . 'classes/class-images.php';
			require_once $this->plugin_path . 'classes/class-rest.php';
			require_once $this->plugin_path . 'classes/class-get-portfolio.php';
			require_once $this->plugin_path . 'classes/class-tiles-parser.php';

			require_once $this->plugin_path . 'classes/class-gutenberg.php';
			require_once $this->plugin_path . 'gutenberg/block/index.php';
			require_once $this->plugin_path . 'gutenberg/block-saved/index.php';

			// Gallery Loop block family, see `supports_loop_blocks()`.
			if ( $this->supports_loop_blocks() ) {
				require_once $this->plugin_path . 'gutenberg/blocks/loop/index.php';
				require_once $this->plugin_path . 'gutenberg/blocks/loop-filter-item/index.php';
				require_once $this->plugin_path . 'gutenberg/blocks/loop-filter/index.php';
				require_once $this->plugin_path . 'gutenberg/blocks/loop-pagination/index.php';
				require_once $this->plugin_path . 'gutenberg/blocks/loop-pagination-next/index.php';
				require_once $this->plugin_path . 'gutenberg/blocks/loop-pagination-numbers/index.php';
				require_once $this->plugin_path . 'gutenberg/blocks/loop-pagination-previous/index.php';
				require_once $this->plugin_path . 'gutenberg/blocks/loop-pagination-trigger/index.php';
				require_once $this->plugin_path . 'gutenberg/blocks/loop-carousel-nav/index.php';
				require_once $this->plugin_path . 'gutenberg/blocks/loop-carousel-previous/index.php';
				require_once $this->plugin_path . 'gutenberg/blocks/loop-carousel-next/index.php';
				require_once $this->plugin_path . 'gutenberg/blocks/loop-carousel-indicator/index.php';
				require_once $this->plugin_path . 'gutenberg/blocks/loop-sort/index.php';
				require_once $this->plugin_path . 'gutenberg/blocks/loop-no-results/index.php';

				// Before the item blocks: they ask it for the attributes that
				// turn an item into a lightbox trigger.
				require_once $this->plugin_path . 'gutenberg/popup/index.php';

				// Shared by the item blocks that paint an overlay on a picture
				// and by those that lay their children out on a gap.
				require_once $this->plugin_path . 'gutenberg/utils/block-gap/index.php';
				require_once $this->plugin_path . 'gutenberg/utils/item-overlay/index.php';

				require_once $this->plugin_path . 'gutenberg/blocks/item-template/index.php';
				require_once $this->plugin_path . 'gutenberg/blocks/item-image/index.php';
				require_once $this->plugin_path . 'gutenberg/blocks/item-cover/index.php';
				require_once $this->plugin_path . 'gutenberg/blocks/item-title/index.php';
				require_once $this->plugin_path . 'gutenberg/blocks/item-description/index.php';
				require_once $this->plugin_path . 'gutenberg/blocks/item-categories/index.php';
				require_once $this->plugin_path . 'gutenberg/blocks/item-author/index.php';
				require_once $this->plugin_path . 'gutenberg/blocks/item-date/index.php';
				require_once $this->plugin_path . 'gutenberg/blocks/item-meta/index.php';
				require_once $this->plugin_path . 'gutenberg/blocks/item-read-more/index.php';

				// Reads the context keys of the item template, so it follows it.
				require_once $this->plugin_path . 'classes/class-block-bindings.php';
			}

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
			require_once $this->plugin_path . 'classes/3rd/plugins/class-fancybox.php';
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
			require_once $this->plugin_path . 'classes/3rd/themes/class-blocksy.php';
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
				// A URL with no host parses to null, which `str_replace()` is deprecated for taking since PHP 8.1.
				$data['provider-name'] = pathinfo( str_replace( array( 'www.' ), '', (string) wp_parse_url( $url, PHP_URL_HOST ) ), PATHINFO_FILENAME );

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
