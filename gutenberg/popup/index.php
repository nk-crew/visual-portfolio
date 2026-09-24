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
 * The lightbox the `popup` click action opens is the one the classic gallery
 * opens: the vendor chosen in Settings, Fancybox or PhotoSwipe, driven by
 * `VPPopupAPI`. A loop item carries the same `<template>` a classic item does,
 * built by the same code and filtered by the same `vpf_popup_output`, and a
 * small script opens the vendor for a loop the way the classic gallery does
 * for itself - see `gutenberg/popup/view.js`.
 */
class Visual_Portfolio_Popup {
	/**
	 * Handle of the script that opens the lightbox from a loop.
	 */
	const SCRIPT = 'visual-portfolio-loop-popup';

	/**
	 * Attribute that marks a popup trigger.
	 */
	const DATA_ATTRIBUTE = 'data-vp-popup';

	/**
	 * Caption sources a loop can pick, the ones the classic gallery offers.
	 */
	const CAPTION_SOURCES = array( 'none', 'title', 'caption', 'alt', 'description', 'item_title', 'item_description', 'item_excerpt', 'item_author' );

	/**
	 * Whether this request has told extensions that a loop opens the lightbox.
	 *
	 * @var bool
	 */
	private static $announced = false;

	/**
	 * Constructor.
	 */
	public function __construct() {
		add_action( 'init', array( $this, 'register_assets' ), 11 );
	}

	/**
	 * Register the script of the lightbox.
	 *
	 * The vendor scripts it opens are the classic gallery's, registered on
	 * `template_redirect`; a dependency is resolved when the page prints it.
	 *
	 * @return void
	 */
	public function register_assets() {
		Visual_Portfolio_Assets::register_script(
			self::SCRIPT,
			'build/gutenberg/popup/view',
			array( 'jquery', 'visual-portfolio-popup-gallery' )
		);
	}

	/**
	 * Popup of a single loop item.
	 *
	 * @param array $item    - item data, see `Visual_Portfolio_Get::default_item_args()`.
	 * @param array $options - portfolio options the item was resolved with.
	 * @param array $sources - `title` and `description` caption sources of the loop.
	 *
	 * @return array `src`, the address a click opens without the lightbox, and
	 *               `markup`, the `<template>` of the item. Empty for an item the
	 *               lightbox has nothing to show.
	 */
	public static function get_item_popup( $item, $options, $sources = array() ) {
		// An item the pipeline allows no popup still goes through the filter:
		// Pro opens its media from there, as it does for the classic gallery.
		// The filter callbacks read the options of a gallery that opens a popup.
		$options['items_click_action'] = 'popup_gallery';

		$options['items_click_action_popup_title_source']       = self::get_caption_source( $sources['title'] ?? '', 'item_title' );
		$options['items_click_action_popup_description_source'] = self::get_caption_source( $sources['description'] ?? '', 'item_excerpt' );

		$markup = Visual_Portfolio_Get::get_item_popup_output(
			array_merge(
				$item,
				array(
					'format_video_url' => $item['video'] ?? '',
					'vp_opts'          => $options,
				)
			)
		);

		// The address a click opens without the lightbox is read off the
		// markup, so a `vpf_popup_output` callback that swaps the image swaps
		// it there too.
		$processor = new WP_HTML_Tag_Processor( $markup );

		if ( ! $processor->next_tag( array( 'class_name' => 'vp-portfolio__item-popup' ) ) ) {
			return array();
		}

		$src = $processor->get_attribute( 'data-vp-popup-video' );

		if ( ! is_string( $src ) || '' === $src ) {
			$src = $processor->get_attribute( 'data-vp-popup-img' );
		}

		// A page shown in the lightbox, such as Pro's Quick View: without it,
		// the page itself.
		if ( ( ! is_string( $src ) || '' === $src ) && $processor->get_attribute( 'data-vp-popup-page' ) ) {
			$src = $item['url'] ?? '';
		}

		if ( ! is_string( $src ) || '' === $src ) {
			return array();
		}

		return array(
			'src'    => $src,
			'markup' => $markup,
		);
	}

	/**
	 * A caption source the classic templates know.
	 *
	 * @param string $source   - saved source.
	 * @param string $fallback - source when the saved one is unknown.
	 *
	 * @return string
	 */
	private static function get_caption_source( $source, $fallback ) {
		return in_array( $source, self::CAPTION_SOURCES, true ) ? $source : $fallback;
	}

	/**
	 * What a click on an item block does, with the link an extension renders
	 * for an action of its own.
	 *
	 * An item the lightbox has nothing to show but that has an address of its
	 * own - an image with a link, a post without a picture - follows it, as the
	 * classic gallery does. So does an action nothing renders: one saved while
	 * an extension that is gone was active.
	 *
	 * @param string $action  - saved click action.
	 * @param array  $context - block context of the item block.
	 *
	 * @return array `[ action, attributes ]`, the attributes of the extension's
	 *               link and the action `extension` when there is one.
	 */
	public static function resolve_click_action( $action, $context ) {
		if ( 'popup' === $action && ! self::has_popup( $context ) ) {
			return array( 'url', array() );
		}

		if ( in_array( $action, array( 'none', 'url', 'popup' ), true ) ) {
			return array( $action, array() );
		}

		/**
		 * Filters the link an item block renders for a click action an extension
		 * added in the editor through `vpf.itemClickActions`.
		 *
		 * @param array  $attributes attribute name to value, unescaped; without an
		 *                           `href` the item links to its own address.
		 * @param string $action     click action.
		 * @param array  $context    block context of the item block.
		 */
		$attributes = (array) apply_filters( 'vpf_loop_item_click_attributes', array(), $action, $context );

		if ( empty( $attributes['href'] ) ) {
			return array( 'url', array() );
		}

		return array( 'extension', $attributes );
	}

	/**
	 * Attributes of a link, escaped and ready to print after the tag name.
	 *
	 * @param array $attributes - attribute name to value.
	 *
	 * @return string
	 */
	public static function get_attributes_html( $attributes ) {
		$html = '';

		foreach ( $attributes as $name => $value ) {
			$html .= sprintf(
				' %1$s="%2$s"',
				esc_attr( $name ),
				'href' === $name ? esc_url( $value ) : esc_attr( $value )
			);
		}

		return $html;
	}

	/**
	 * Whether an item has something for the lightbox to show.
	 *
	 * @param array $context - block context of the item block.
	 *
	 * @return bool
	 */
	public static function has_popup( $context ) {
		return ! empty( $context['vp/itemPopupData']['src'] );
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
		if ( ! self::has_popup( $context ) ) {
			return array();
		}

		self::enqueue();

		return array(
			'href' => $context['vp/itemPopupData']['src'],
		);
	}

	/**
	 * Load the lightbox: the vendor chosen in Settings and the loop script.
	 *
	 * @return void
	 */
	public static function enqueue() {
		Visual_Portfolio_Assets::enqueue_popup_assets();

		wp_enqueue_script( self::SCRIPT );

		if ( self::$announced ) {
			return;
		}

		self::$announced = true;

		/**
		 * Fires once on a page where a Gallery Loop opens the lightbox.
		 *
		 * The loop counterpart of `vpf_after_assets_enqueue` for the popup:
		 * what extends the lightbox of a classic gallery loads its assets here
		 * for a loop, and nothing else of the classic gallery comes with it.
		 */
		do_action( 'vpf_loop_popup_enqueue' );
	}
}
new Visual_Portfolio_Popup();
