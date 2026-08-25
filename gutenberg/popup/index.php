<?php
/**
 * Lightbox of the Gallery Loop family.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Visual Portfolio Loop popup.
 *
 * The lightbox the `popup` click action opens. It has nothing to do with the
 * legacy popup: that one is jQuery, PhotoSwipe 4 or Fancybox, and driven by
 * `<template>` markup next to every item. This one is a script module over
 * PhotoSwipe 5, built from the JSON every trigger carries. The two never meet -
 * different blocks, different assets, different DOM.
 */
class Visual_Portfolio_Popup {
	/**
	 * Interactivity API store of the lightbox.
	 */
	const STORE = 'visual-portfolio/popup';

	/**
	 * Identifier of the view script module.
	 */
	const VIEW_MODULE = 'visual-portfolio-popup-view';

	/**
	 * Handle of the lightbox stylesheet.
	 */
	const STYLE = 'visual-portfolio-popup';

	/**
	 * Handle of the vendored PhotoSwipe stylesheet.
	 */
	const LIBRARY_STYLE = 'visual-portfolio-photoswipe-5';

	/**
	 * Version of the vendored library.
	 *
	 * Pinned, and vendored rather than loaded off a CDN: the module address is
	 * printed into the page, and a page of ours never asks a third party for
	 * code.
	 */
	const LIBRARY_VERSION = '5.4.4';

	/**
	 * Path of the vendored library, relative to the plugin.
	 */
	const LIBRARY_PATH = 'assets/vendor/photoswipe-5/photoswipe.esm.min.js';

	/**
	 * Attribute the popup data of an item travels in.
	 */
	const DATA_ATTRIBUTE = 'data-vp-popup';

	/**
	 * Constructor.
	 */
	public function __construct() {
		add_action( 'init', array( $this, 'register_assets' ), 11 );

		// front-end behaviour, see `gutenberg/popup/view.js`. Late, so the loop
		// has already attached its own directives to the same tag.
		add_filter( 'render_block_visual-portfolio/loop', array( $this, 'add_directives' ), 20 );
	}

	/**
	 * Register the assets of the lightbox.
	 *
	 * @return void
	 */
	public function register_assets() {
		Visual_Portfolio_Assets::register_style( self::STYLE, 'build/gutenberg/popup/style' );
		wp_style_add_data( self::STYLE, 'rtl', 'replace' );

		wp_register_style(
			self::LIBRARY_STYLE,
			visual_portfolio()->plugin_url . 'assets/vendor/photoswipe-5/photoswipe.css',
			array(),
			self::LIBRARY_VERSION
		);

		$view_module = 'build/gutenberg/popup/view';
		$asset       = Visual_Portfolio_Assets::get_asset_file( $view_module, 'script' );

		// Registered, never declared as `viewScriptModule` of a block: it is
		// wanted by two blocks and only when they are set to open a popup.
		wp_register_script_module(
			self::VIEW_MODULE,
			visual_portfolio()->plugin_url . $view_module . '.js',
			$asset['dependencies'],
			$asset['version']
		);
	}

	/**
	 * Popup data of a single loop item.
	 *
	 * The same data the legacy popup is built from - `get_popup_image()` and
	 * `get_popup_video()` are the path both go through, so the `vpf_popup_*`
	 * filters that Pro extends the popup with keep working without knowing that
	 * a second lightbox exists. What differs is the shape: this one is read by
	 * a script module, so it ends as JSON on the trigger rather than as the
	 * `<template>` markup `vpf_popup_output` filters.
	 *
	 * @param array $item    - item data, see `Visual_Portfolio_Get::default_item_args()`.
	 * @param array $options - portfolio options the item was resolved with.
	 *
	 * @return array Popup data, or an empty array for an item that cannot be opened.
	 */
	public static function get_item_data( $item, $options ) {
		$data = array();

		if ( ! empty( $item['allow_popup'] ) ) {
			if ( ! empty( $item['video'] ) ) {
				$data = self::get_video_data( $item );
			} else {
				$image_id = $item['image_id'] ? $item['image_id'] : ( $item['no_image'] ?? '' );
				$data     = self::get_image_data( $image_id, $item );
			}
		}

		/**
		 * Filters the popup data of a single loop item.
		 *
		 * The data level counterpart of `vpf_popup_output`, which filters the
		 * markup of the legacy popup and has no meaning for a payload that is
		 * read by a script module. Returning an empty array leaves the item
		 * without a popup, and its trigger renders as a plain link.
		 *
		 * @param array $data    popup data of the item.
		 * @param array $item    item data.
		 * @param array $options portfolio options.
		 */
		return (array) apply_filters( 'vpf_loop_item_popup_data', $data, $item, $options );
	}

	/**
	 * Popup data of an image item.
	 *
	 * @param int|string $image_id - attachment id, or the id of a remote image of a Pro source.
	 * @param array      $item     - item data.
	 *
	 * @return array
	 */
	private static function get_image_data( $image_id, $item ) {
		$image = Visual_Portfolio_Get::get_popup_image( $image_id, $item );

		if ( ! $image || empty( $image['url'] ) ) {
			return array();
		}

		return array(
			'type'    => 'image',
			'src'     => $image['url'],
			'srcset'  => $image['srcset'] ?? '',
			'width'   => (int) ( $image['width'] ?? 0 ),
			'height'  => (int) ( $image['height'] ?? 0 ),

			// The size the grid already downloaded, shown blurred under the
			// full one while it loads.
			'msrc'    => $image['sm_url'] ?? '',
			'alt'     => $image['alt'] ?? '',
			'title'   => $image['item_title'] ?? '',
			'caption' => $image['caption'] ?? '',
		);
	}

	/**
	 * Popup data of a video item.
	 *
	 * The URL is passed on as it stands. Turning it into something embeddable is
	 * the module's job for YouTube and Vimeo, and `embedUrl` is where anything
	 * else - the video vendors of Pro - hands it a ready address through
	 * `vpf_loop_item_popup_data`.
	 *
	 * @param array $item - item data.
	 *
	 * @return array
	 */
	private static function get_video_data( $item ) {
		$video = Visual_Portfolio_Get::get_popup_video(
			array_merge( $item, array( 'format_video_url' => $item['video'] ) )
		);

		if ( empty( $video['url'] ) ) {
			return array();
		}

		return array(
			'type'    => 'video',
			'src'     => $video['url'],
			'poster'  => $video['poster'] ? $video['poster'] : '',
			'title'   => $video['item_title'] ?? '',
			'caption' => $video['item_excerpt'] ?? '',
		);
	}

	/**
	 * Attributes that turn an anchor into a popup trigger.
	 *
	 * Asking for them is what loads the lightbox - a trigger is the only thing
	 * on a page that needs it, and an item block only knows whether it renders
	 * one while it is rendering it.
	 *
	 * The `href` is not decoration: with no JavaScript - blocked, failed, turned
	 * off - a click on a trigger opens the full size image, which is the whole
	 * of what the lightbox would have shown.
	 *
	 * @param array $context - block context of the item block.
	 *
	 * @return array Attribute name to value, unescaped. Empty when the item has no popup.
	 */
	public static function get_trigger_attributes( $context ) {
		$data = $context['vp/itemPopupData'] ?? array();

		if ( ! is_array( $data ) || empty( $data['src'] ) ) {
			return array();
		}

		$json = wp_json_encode( $data );

		// Data that cannot be written down is data the lightbox cannot read, and
		// an item it could not draw is better left as a plain image.
		if ( false === $json ) {
			return array();
		}

		self::enqueue();

		return array(
			'href'               => $data['src'],
			self::DATA_ATTRIBUTE => $json,
		);
	}

	/**
	 * Load the lightbox.
	 *
	 * The library itself is not loaded here and is not loaded at all until the
	 * first click: the module imports it from the address published below, so a
	 * gallery nobody opens costs nothing but the module.
	 *
	 * @return void
	 */
	public static function enqueue() {
		static $done = false;

		wp_enqueue_script_module( self::VIEW_MODULE );
		wp_enqueue_style( self::LIBRARY_STYLE );
		wp_enqueue_style( self::STYLE );

		if ( $done ) {
			return;
		}

		$done = true;

		wp_interactivity_config(
			self::STORE,
			array(
				'library'      => visual_portfolio()->plugin_url . self::LIBRARY_PATH,

				// The same setting the legacy popup honours, and the same
				// meaning: on closing, the focus goes back to the item that was
				// on screen rather than staying in a dialog that is gone.
				'restoreFocus' => (bool) Visual_Portfolio_Settings::get_option( 'restore_focus', 'vp_popup_gallery' ),

				// The library labels its own buttons in English otherwise, and a
				// lightbox is the one part of a gallery that is nothing but
				// buttons.
				'i18n'         => array(
					'gallery'   => __( 'Gallery', 'visual-portfolio' ),
					'close'     => __( 'Close', 'visual-portfolio' ),
					'zoom'      => __( 'Zoom in/out', 'visual-portfolio' ),
					'prev'      => __( 'Previous', 'visual-portfolio' ),
					'next'      => __( 'Next', 'visual-portfolio' ),
					'error'     => __( 'The image could not be loaded.', 'visual-portfolio' ),
					'separator' => _x( ' / ', 'lightbox counter separator', 'visual-portfolio' ),
				),
			)
		);
	}

	/**
	 * Attach the lightbox to a loop that holds triggers.
	 *
	 * One listener on the loop rather than a directive on every trigger. The
	 * Interactivity API hydrates the document once, so a trigger that arrives
	 * later - appended by Load More, which writes to the DOM behind the router's
	 * back - would carry a directive nothing ever ran. The loop wrapper is the
	 * one node that survives both a Load More and a region swap, so a listener
	 * there is a listener on every item the loop will ever hold.
	 *
	 * @param string $block_content - rendered block.
	 *
	 * @return string
	 */
	public function add_directives( $block_content ) {
		if ( ! $block_content || false === strpos( $block_content, self::DATA_ATTRIBUTE ) ) {
			return $block_content;
		}

		$processor = new WP_HTML_Tag_Processor( $block_content );

		if ( ! $processor->next_tag() ) {
			return $block_content;
		}

		// A loop with an id is already an island of the loop store, and the
		// namespace of a directive can be named in the directive itself. Without
		// an id there is no island at all - the loop is server rendered and its
		// controls are plain links - and the lightbox brings its own.
		if ( null === $processor->get_attribute( 'data-wp-interactive' ) ) {
			$processor->set_attribute( 'data-wp-interactive', self::STORE );
			$processor->set_attribute( 'data-wp-on--click', 'actions.openPopup' );
		} else {
			$processor->set_attribute( 'data-wp-on--click', self::STORE . '::actions.openPopup' );
		}

		return $processor->get_updated_html();
	}
}
new Visual_Portfolio_Popup();
