<?php
/**
 * Register fake page for portfolio preview.
 *
 * @package visual-portfolio/preview
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Visual_Portfolio_Preview
 */
class Visual_Portfolio_Preview {

	/**
	 * Preview enabled.
	 *
	 * @var bool
	 */
	public $preview_enabled = false;

	/**
	 * Visual_Portfolio_Preview constructor.
	 */
	public function __construct() {
		$this->init_hooks();
	}

	/**
	 * Hooks.
	 */
	public function init_hooks() {
		add_action( 'init', array( $this, 'is_preview_check' ) );
		add_filter( 'pre_handle_404', array( $this, 'pre_handle_404' ) );
		add_filter( 'vpf_get_options', array( $this, 'filter_preview_option' ) );
		add_action( 'template_redirect', array( $this, 'template_redirect' ) );
		add_action( 'wp_enqueue_scripts', array( $this, 'wp_enqueue_scripts' ), 11 );

		// Localize script in editor, FSE, and Elementor.
		add_action( 'enqueue_block_assets', array( $this, 'localize_scripts' ) );
		add_action( 'wp_print_scripts', array( $this, 'localize_elementor_scripts' ), 9 );
	}

	/**
	 * Prepare preview URL to use from our preview iframe.
	 *
	 * @return string
	 */
	public function get_preview_url() {
		add_filter( 'pre_option_permalink_structure', '__return_empty_string' );

		$preview_url = set_url_scheme(
			add_query_arg(
				array(
					'vp_preview'      => 'vp_preview',
					'vp_preview_time' => time(),
				),
				// We used `get_site_url()` before, but it does not work on some hosts,
				// that have custom URL structure in admin area.
				//
				// For example:
				// * Admin URL: https://mysite.com/wp/
				// * Front URL: https://mysite.com/
				//
				// Use `trailingslashit` to fix some rare servers problems
				// when preview is not working if no trailing slash in URL.
				//
				// For example:
				// * Error:   https://mysite.com/wp
				// * Success: https://mysite.com/wp/
				// .
				trailingslashit( home_url( '/' ) )
			)
		);

		remove_filter( 'pre_option_permalink_structure', '__return_empty_string' );

		return $preview_url;
	}

	/**
	 * Localize scripts with preview URL.
	 */
	public function localize_scripts() {
		if ( ! is_admin() ) {
			return;
		}

		$preview_url = $this->get_preview_url();

		// Localize scripts.
		wp_localize_script(
			'visual-portfolio-gutenberg',
			'VPAdminGutenbergVariables',
			array(
				'preview_url' => $preview_url,
				'nonce'       => wp_create_nonce( 'vp-ajax-nonce' ),
			)
		);
	}

	/**
	 * Localize scripts with preview URL for Elementor.
	 */
	public function localize_elementor_scripts() {
		if ( ! wp_script_is( 'visual-portfolio-elementor', 'registered' ) ) {
			return;
		}

		$preview_url = $this->get_preview_url();

		// Localize scripts.
		wp_localize_script(
			'visual-portfolio-elementor',
			'VPAdminElementorVariables',
			array(
				'preview_url' => $preview_url,
				'nonce'       => wp_create_nonce( 'vp-ajax-nonce' ),
			)
		);
	}

	/**
	 * Scheme and host of a URL, without the path.
	 *
	 * @param string $url - URL to reduce.
	 *
	 * @return string origin, or an empty string when the URL has no host.
	 */
	public function get_url_origin( $url ) {
		$parts = wp_parse_url( $url );

		if ( empty( $parts['scheme'] ) || empty( $parts['host'] ) ) {
			return '';
		}

		$origin = $parts['scheme'] . '://' . $parts['host'];

		if ( ! empty( $parts['port'] ) ) {
			$origin .= ':' . $parts['port'];
		}

		return $origin;
	}

	/**
	 * Check if the page is preview.
	 */
	public function is_preview_check() {
		$frame = false;
		if ( isset( $_GET['vp_preview'] ) && isset( $_REQUEST['vp_preview_nonce'] ) && wp_verify_nonce( sanitize_key( $_REQUEST['vp_preview_nonce'] ), 'vp-ajax-nonce' ) ) {
            // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized, WordPress.Security.ValidatedSanitizedInput.MissingUnslash
			$frame = isset( $_POST['vp_preview_frame'] ) ? Visual_Portfolio_Security::sanitize_boolean( $_POST['vp_preview_frame'] ) : false;
			$id    = isset( $_POST['vp_preview_frame_id'] ) ? sanitize_text_field( wp_unslash( $_POST['vp_preview_frame_id'] ) ) : false;

			// Elementor preview.
			if ( ! $frame && ! $id && isset( $_REQUEST['vp_preview_type'] ) && 'elementor' === $_REQUEST['vp_preview_type'] ) {
                // phpcs:ignore WordPress.Security.ValidatedSanitizedInput.InputNotSanitized, WordPress.Security.ValidatedSanitizedInput.MissingUnslash
				$frame = isset( $_REQUEST['vp_preview_frame'] ) ? Visual_Portfolio_Security::sanitize_boolean( $_REQUEST['vp_preview_frame'] ) : false;
			}
		}

		$this->preview_enabled = $frame;
	}

	/**
	 * Prevent 404 headers if it is vp_preview page.
	 *
	 * @param bool $val - handle 404 headers.
	 *
	 * @return bool
	 */
	public function pre_handle_404( $val ) {
		return $this->preview_enabled ? true : $val;
	}

	/**
	 * Disable infinite loading in preview.
	 *
	 * @param array $options - options.
	 *
	 * @return array
	 */
	public function filter_preview_option( $options ) {
		if ( $this->preview_enabled && isset( $options['pagination'] ) && 'infinite' === $options['pagination'] ) {
			$options['pagination'] = 'load-more';
		}

		return $options;
	}

	/**
	 * Display preview frame
	 * Available by requesting:
	 * SITE/?vp_preview=vp_preview with POST data: `vp_preview_frame=true&vp_preview_frame_id=10`
	 */
	public function template_redirect() {
		if ( is_admin() || ! $this->preview_enabled ) {
			return;
		}

		$this->print_template();
		exit;
	}

	/**
	 * Enqueue scripts action.
	 */
	public function wp_enqueue_scripts() {
		// Dequeue WooCommerce Geolocation script, since it reloads our preview iframe.
		// Thanks to https://wordpress.org/support/topic/in-editor-the-normal-preview-replaced-with-a-smaller-website-load/ .
		if ( $this->preview_enabled && wp_script_is( 'wc-geolocation', 'enqueued' ) ) {
			wp_dequeue_script( 'wc-geolocation' );
		}
	}

	/**
	 * Do not cache.
	 *
	 * Tell WordPress cache plugins not to cache this request.
	 */
	public function do_not_cache() {
		// Disable cache plugins.
		if ( ! defined( 'DONOTCACHEPAGE' ) ) {
            // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedConstantFound
			define( 'DONOTCACHEPAGE', true );
		}

		if ( ! defined( 'DONOTCACHEDB' ) ) {
            // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedConstantFound
			define( 'DONOTCACHEDB', true );
		}

		if ( ! defined( 'DONOTMINIFY' ) ) {
            // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedConstantFound
			define( 'DONOTMINIFY', true );
		}

		if ( ! defined( 'DONOTCDN' ) ) {
            // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedConstantFound
			define( 'DONOTCDN', true );
		}

		if ( ! defined( 'DONOTCACHEOBJECT' ) ) {
            // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedConstantFound
			define( 'DONOTCACHEOBJECT', true );
		}

		// Set the headers to prevent caching for the different browsers.
		nocache_headers();
	}

	/**
	 * Join the editor's agent cluster when it is cross-origin isolated.
	 *
	 * Since WordPress 7.1 the block editor sends
	 * `Document-Isolation-Policy: isolate-and-credentialless` (see
	 * `wp_set_up_cross_origin_isolation()`), which puts the editor document in an
	 * isolated agent cluster. Documents in different agent clusters cannot reach
	 * each other synchronously even when they share an origin, so the editor
	 * loses access to the preview `contentWindow` and the preview stays in its
	 * loading state forever.
	 *
	 * The editor reports its own state in `vp_preview_isolated`, so the header is
	 * sent only when the embedding document is isolated as well. Sending it
	 * unconditionally would create the same mismatch in reverse on cores and
	 * browsers that do not isolate the editor.
	 */
	public function maybe_send_isolation_header() {
		// Nonce is verified in `is_preview_check()` before the preview renders.
		// phpcs:ignore WordPress.Security.NonceVerification.Missing
		$isolated = isset( $_POST['vp_preview_isolated'] ) ? Visual_Portfolio_Security::sanitize_boolean( $_POST['vp_preview_isolated'] ) : false;

		if ( $isolated && ! headers_sent() ) {
			header( 'Document-Isolation-Policy: isolate-and-credentialless' );
		}
	}

	/**
	 * Template of preview page.
	 */
	public function print_template() {
		// Before `vpf_preview_template`, since a listener may start the output.
		$this->maybe_send_isolation_header();

		do_action( 'vpf_preview_template' );

		// Tell to WP Cache plugins do not cache this request.
		$this->do_not_cache();

		// Don't redirect to permalink.
		remove_action( 'template_redirect', 'redirect_canonical' );

		// Compatibility with Yoast SEO plugin when 'Removes unneeded query variables from the URL' enabled.
		if ( class_exists( 'WPSEO_Frontend' ) ) {
			remove_action( 'template_redirect', array( \WPSEO_Frontend::get_instance(), 'clean_permalink' ), 1 );
		}

		// Disable the WP admin bar.
		add_filter( 'show_admin_bar', '__return_false' );

		// Avoid Cloudflare's Rocket Loader lazy loading the editor iframe scripts.
		//
		// `script_loader_tag` only covers scripts with a `src`, while
		// `wp_inline_script_attributes` (WP 5.7+) covers inline scripts such as
		// the `VPData` / `vp_preview_post_data` localization. Both must be
		// excluded, otherwise Rocket Loader defers the inline data and the
		// portfolio scripts run before `VPData` exists, throwing
		// "Cannot read properties of undefined (reading '__')".
		add_filter( 'script_loader_tag', array( $this, 'rocket_loader_filter' ) );
		add_filter( 'wp_inline_script_attributes', array( $this, 'rocket_loader_inline_filter' ) );

		// Enqueue assets.
		Visual_Portfolio_Assets::enqueue_script( 'visual-portfolio-preview', 'build/assets/js/preview' );

		// Origins the editor may drive this preview from. The frame is served from `home_url`
		// while the block editor runs on `admin_url`, and a site is free to put those on
		// different hosts, so the frame cannot infer this from its own location.
		wp_localize_script(
			'visual-portfolio-preview',
			'VPPreviewFrameVariables',
			array(
				'hostOrigins' => array_values(
					array_unique(
						array_filter(
							array(
								$this->get_url_origin( admin_url() ),
								$this->get_url_origin( home_url() ),
								$this->get_url_origin( site_url() ),
							)
						)
					)
				),
			)
		);

		// Post data for script.
		wp_localize_script(
			'visual-portfolio-preview',
			'vp_preview_post_data',
            // phpcs:disable WordPress.Security.NonceVerification.Missing
			isset( $_POST ) && ! empty( $_POST ) ? Visual_Portfolio_Security::sanitize_attributes( $_POST ) : array()
		);

		$class_name = 'vp-preview-wrapper';

		// preview type.
		$type = isset( $_POST['vp_preview_type'] ) ? sanitize_text_field( wp_unslash( $_POST['vp_preview_type'] ) ) : false;

		if ( $type ) {
			$class_name .= ' vp-preview-type-' . $type;
		}

		// Prepare portfolio post options.
		$options = array();
		if ( isset( $_POST ) && ! empty( $_POST ) ) {
			foreach ( $_POST as $name => $val ) {
				if ( strpos( $name, 'vp_' ) === 0 ) {
					$options[ preg_replace( '/^vp_/', '', $name ) ] = $val;
				}
			}
		}

		// Elementor widget preview.
        // phpcs:disable WordPress.Security.NonceVerification.Recommended
		if ( isset( $_REQUEST['vp_preview_type'] ) && 'elementor' === $_REQUEST['vp_preview_type'] && isset( $_REQUEST['vp_preview_frame_id'] ) ) {
			$options['id'] = sanitize_text_field( wp_unslash( $_REQUEST['vp_preview_frame_id'] ) );
		}
        // phpcs:enable WordPress.Security.NonceVerification.Missing, WordPress.Security.NonceVerification.Recommended

		$options = Visual_Portfolio_Security::sanitize_attributes( $options );

		// Register assets.
		Visual_Portfolio_Assets::enqueue( $options );

		// Custom styles.
		visual_portfolio()->include_template_style( 'visual-portfolio-preview', 'preview/style', array(), VISUAL_PORTFOLIO_VERSION );

		// Output template.
		visual_portfolio()->include_template(
			'preview/preview',
			array(
				'options'    => $options,
				'class_name' => $class_name,
			)
		);
	}

	/**
	 * Disable rocket loader in preview.
	 *
	 * @param String $tag - tag string.
	 *
	 * @return String
	 */
	public function rocket_loader_filter( $tag ) {
		return str_replace( '<script', '<script data-cfasync="false"', $tag );
	}

	/**
	 * Disable rocket loader for inline scripts in preview.
	 *
	 * Inline localization scripts (e.g. `VPData`, `vp_preview_post_data`) are
	 * printed via `wp_get_inline_script_tag()`, which does not go through the
	 * `script_loader_tag` filter. Without this, Cloudflare's Rocket Loader
	 * defers them and the portfolio scripts run before `VPData` is defined.
	 *
	 * @param array $attributes - inline script attributes.
	 *
	 * @return array
	 */
	public function rocket_loader_inline_filter( $attributes ) {
		$attributes['data-cfasync'] = 'false';

		return $attributes;
	}
}

new Visual_Portfolio_Preview();
