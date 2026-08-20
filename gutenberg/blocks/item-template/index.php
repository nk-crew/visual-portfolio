<?php
/**
 * Block Item Template.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Visual Portfolio Item Template block.
 */
class Visual_Portfolio_Block_Item_Template {
	/**
	 * Handle of the block stylesheet.
	 */
	const STYLE = 'visual-portfolio-block-item-template';

	/**
	 * Identifier of the layout script module.
	 */
	const VIEW_MODULE = 'visual-portfolio-block-item-template-view';

	/**
	 * Interactivity store of the layouts.
	 *
	 * A store of its own rather than the family store: the layouts are the one
	 * part of the item template with a front end, and keeping them here is what
	 * lets a gallery that needs no layout script load none.
	 */
	const VIEW_MODULE_STORE = 'visual-portfolio/item-template';

	/**
	 * Handle of the carousel stylesheet.
	 */
	const CAROUSEL_STYLE = 'visual-portfolio-blossom-carousel';

	/**
	 * Constructor.
	 */
	public function __construct() {
		add_action( 'init', array( $this, 'register_block' ), 11 );

		// editor. Late, so that the editor bundle it attaches to is registered.
		add_action( 'enqueue_block_assets', array( $this, 'enqueue_tiles_presets' ), 20 );
	}

	/**
	 * Hand the tiles patterns to the picker.
	 *
	 * Alongside the editor bundle rather than through `block_editor_settings_all`:
	 * the editor passes the block editor a fixed list of settings and drops
	 * everything it does not know, so a filter written for our own data would
	 * never arrive.
	 *
	 * @return void
	 */
	public function enqueue_tiles_presets() {
		if ( ! wp_script_is( 'visual-portfolio-gutenberg', 'registered' ) ) {
			return;
		}

		wp_localize_script(
			'visual-portfolio-gutenberg',
			'VPGalleryTilesPresets',
			$this->get_tiles_presets()
		);
	}

	/**
	 * The tiles patterns the picker offers.
	 *
	 * The catalogue of the legacy layout, in the same notation, so a gallery
	 * that used a preset there finds it here. Pro and themes add their own -
	 * the picker draws whatever the filter returns.
	 *
	 * @return array
	 */
	public function get_tiles_presets() {
		$presets = array(
			'1|1,0.5|',
			'2|1,1|',
			'2|1,0.8|',
			'2|1,1.34|',
			'2|1,1.2|1,1.2|1,0.67|1,0.67|',
			'2|1,1.2|1,0.67|1,1.2|1,0.67|',
			'2|1,0.67|1,1|1,1|1,1|1,1|1,0.67|',
			'3|1,1|',
			'3|1,0.8|',
			'3|1,1.3|',
			'3|1,1|1,1|1,1|1,1.3|1,1.3|1,1.3|',
			'3|1,1|1,1|1,2|1,1|1,1|1,1|1,1|1,1|',
			'3|1,2|1,1|1,1|1,1|1,1|1,1|1,1|1,1|',
			'3|1,1|1,2|1,1|1,1|1,1|1,1|1,1|1,1|',
			'3|1,1|1,2|1,1|1,1|1,1|1,1|2,0.5|',
			'3|1,0.8|1,1.6|1,0.8|1,0.8|1,1.6|1,0.8|1,0.8|1,0.8|1,0.8|1,0.8|',
			'3|1,0.8|1,1.6|1,0.8|1,0.8|1,1.6|1,1.6|1,0.8|1,0.8|1,0.8|',
			'3|1,0.8|1,0.8|1,1.6|1,0.8|1,0.8|1,1.6|1,1.6|1,0.8|1,0.8|',
			'3|1,0.8|1,0.8|1,1.6|1,0.8|1,0.8|1,0.8|1,1.6|1,1.6|1,0.8|',
			'3|1,1|2,1|1,1|2,0.5|1,1|',
			'3|1,1|2,1|1,1|1,1|1,1|1,1|2,0.5|1,1|',
			'3|1,2|2,0.5|1,1|1,2|2,0.5|',
			'4|1,1|',
			'4|1,1|1,1.34|1,1|1,1.34|1,1.34|1,1.34|1,1|1,1|',
			'4|1,0.8|1,1|1,0.8|1,1|1,1|1,1|1,0.8|1,0.8|',
			'4|1,1|1,1|2,1|1,1|1,1|2,1|1,1|1,1|1,1|1,1|',
			'4|2,1|2,0.5|2,0.5|2,0.5|2,1|2,0.5|',
		);

		/**
		 * Filters the tiles patterns offered by the layout picker.
		 *
		 * Values are the tiles notation - columns, then the width and height of
		 * every tile of the repeating pattern, as in `3|1,1|2,0.5|`.
		 *
		 * @param array $presets tiles notations.
		 */
		return array_values(
			array_unique( array_filter( (array) apply_filters( 'vpf_loop_tiles_presets', $presets ) ) )
		);
	}

	/**
	 * Register Block.
	 */
	public function register_block() {
		Visual_Portfolio_Assets::register_style( self::STYLE, 'build/gutenberg/blocks/item-template/style' );
		wp_style_add_data( self::STYLE, 'rtl', 'replace' );

		Visual_Portfolio_Assets::register_style( self::STYLE . '-editor', 'build/gutenberg/blocks/item-template/editor' );
		wp_style_add_data( self::STYLE . '-editor', 'rtl', 'replace' );

		wp_register_style(
			self::CAROUSEL_STYLE,
			visual_portfolio()->plugin_url . 'assets/vendor/blossom-carousel/dist/blossom-carousel-core.css',
			array(),
			'1.1.8'
		);

		$view_module = 'build/gutenberg/blocks/item-template/view';
		$asset       = Visual_Portfolio_Assets::get_asset_file( $view_module, 'script' );

		// Registered, never declared as `viewScriptModule`: metadata would load
		// it for every gallery, and grid and tiles are stylesheet alone.
		wp_register_script_module(
			self::VIEW_MODULE,
			visual_portfolio()->plugin_url . $view_module . '.js',
			$asset['dependencies'],
			$asset['version']
		);

		register_block_type_from_metadata(
			visual_portfolio()->plugin_path . 'gutenberg/blocks/item-template',
			array(
				'render_callback'   => array( $this, 'block_render' ),

				// Inner blocks are rendered per item with the item context, the
				// same way the core Post Template block does it.
				'skip_inner_blocks' => true,
			)
		);
	}

	/**
	 * Whether anything inside the item opens the lightbox.
	 *
	 * Asked once for the list rather than per item: resolving the popup payload
	 * reads the attachment and its meta, and a gallery whose items are plain
	 * links has nothing to open.
	 *
	 * @param array $blocks - inner blocks of the item template.
	 *
	 * @return bool
	 */
	private static function opens_a_popup( $blocks ) {
		foreach ( $blocks as $inner ) {
			if ( isset( $inner['attrs']['clickAction'] ) && 'popup' === $inner['attrs']['clickAction'] ) {
				return true;
			}

			if ( ! empty( $inner['innerBlocks'] ) && self::opens_a_popup( $inner['innerBlocks'] ) ) {
				return true;
			}
		}

		return false;
	}

	/**
	 * Map a resolved loop item to the block context of the item blocks.
	 *
	 * The single mapping of item data to context: the render callback and the
	 * editor preview endpoint both go through here, so an item block cannot see
	 * different data on the two sides.
	 *
	 * @param array  $item    - item data, see `Visual_Portfolio_Get::default_item_args()`.
	 * @param array  $options - portfolio options the item was resolved with.
	 * @param string $prefix  - prefix of the returned keys. Block context is namespaced,
	 *                          a REST response is not.
	 * @param bool   $with_popup - whether anything in the item opens the lightbox.
	 *
	 * @return array
	 */
	public static function map_item_to_context( $item, $options, $prefix = 'vp/', $with_popup = true ) {
		$context = array(
			'vp/itemId'            => $item['uid'] ?? '',
			'vp/itemPostId'        => $item['post_id'] ?? '',

			// May be an integer or a string: the Pro social sources address remote
			// images by ids like `vpf_pro_social_instagram_123`. Never cast it.
			'vp/itemImgId'         => $item['image_id'] ?? '',
			'vp/itemImgUrl'        => self::get_item_image_url( $item ),
			'vp/itemImgAlt'        => $item['alt'] ?? '',
			'vp/itemNoImgId'       => $item['no_image'] ?? '',
			'vp/itemFocalPoint'    => $item['focal_point'] ?? '',
			'vp/itemUrl'           => $item['url'] ?? '',
			'vp/itemAriaLabel'     => Visual_Portfolio_Get::get_item_aria_label( $item ),
			'vp/itemTitle'         => $item['title'] ?? '',
			'vp/itemContent'       => $item['content'] ?? '',
			'vp/itemExcerpt'       => $item['excerpt'] ?? '',
			'vp/itemCategories'    => $item['categories'] ?? array(),
			'vp/itemFormat'        => $item['format'] ?? '',
			'vp/itemVideoUrl'      => $item['video'] ?? '',
			'vp/itemAuthor'        => $item['author'] ?? '',
			'vp/itemAuthorUrl'     => $item['author_url'] ?? '',
			'vp/itemAuthorAvatar'  => $item['author_avatar'] ?? '',
			'vp/itemPublishedTime' => $item['published_time'] ?? '',
			'vp/itemCommentsCount' => $item['comments_count'] ?? '',
			'vp/itemCommentsUrl'   => $item['comments_url'] ?? '',
			'vp/itemViewsCount'    => $item['views_count'] ?? '',
			'vp/itemReadingTime'   => $item['reading_time'] ?? '',

			// Everything the lightbox needs to show this item, resolved here so
			// that an item block only has to decide whether to open it. Reading
			// it costs an attachment lookup and half a dozen meta reads per
			// item, so a gallery with nothing to open asks for nothing.
			'vp/itemPopupData'     => $with_popup ? Visual_Portfolio_Popup::get_item_data( $item, $options ) : array(),
		);

		/**
		 * Filters the block context of a single loop item.
		 *
		 * The extension point for item data the free plugin does not have, such
		 * as the Pro hover image, album and popup keys. Keys are always
		 * namespaced here, whichever prefix the caller asked for.
		 *
		 * @param array $context context keys of the item.
		 * @param array $item    item data.
		 * @param array $options portfolio options.
		 */
		$context = apply_filters( 'vpf_loop_item_context', $context, $item, $options );

		if ( 'vp/' === $prefix ) {
			return $context;
		}

		$result = array();

		foreach ( $context as $key => $value ) {
			if ( 0 === strpos( $key, 'vp/' ) ) {
				$key = substr( $key, 3 );
			}

			$result[ $prefix . $key ] = $value;
		}

		return $result;
	}

	/**
	 * Every context key a gallery item can carry.
	 *
	 * Written out rather than read off `map_item_to_context()`: the block
	 * bindings source declares the keys it needs at registration time, before
	 * any item exists, and mapping an empty item to find out would run the
	 * `vpf_loop_item_context` callbacks of Pro and themes with nothing to map.
	 * `test-class-block-bindings.php` holds the two lists together.
	 *
	 * The trailing four are the keys reserved for Pro in `03-pro-integration.md`
	 * - free never fills them, and declaring them here means a Pro item value
	 * can be bound without Pro touching this source.
	 *
	 * @return array
	 */
	public static function get_context_keys() {
		return array(
			'vp/itemId',
			'vp/itemPostId',
			'vp/itemImgId',
			'vp/itemImgUrl',
			'vp/itemImgAlt',
			'vp/itemNoImgId',
			'vp/itemFocalPoint',
			'vp/itemUrl',
			'vp/itemAriaLabel',
			'vp/itemTitle',
			'vp/itemContent',
			'vp/itemExcerpt',
			'vp/itemCategories',
			'vp/itemFormat',
			'vp/itemVideoUrl',
			'vp/itemAuthor',
			'vp/itemAuthorUrl',
			'vp/itemAuthorAvatar',
			'vp/itemPublishedTime',
			'vp/itemCommentsCount',
			'vp/itemCommentsUrl',
			'vp/itemViewsCount',
			'vp/itemReadingTime',
			'vp/itemHoverImgId',
			'vp/itemHoverVideoUrl',
			'vp/itemPopupData',
			'vp/itemAlbumUrl',
		);
	}

	/**
	 * Fallback image URL of an item.
	 *
	 * Item blocks render images through `Visual_Portfolio_Images`, which resolves
	 * sizes, srcset and the remote images of the Pro sources. This URL is for the
	 * places that need a plain address, such as the editor preview.
	 *
	 * @param array $item - item data.
	 *
	 * @return string
	 */
	private static function get_item_image_url( $item ) {
		$image_id = $item['image_id'] ?? '';

		// Remote images have no attachment to resolve - their URL arrives with
		// `vpf_loop_item_context`.
		if ( ! $image_id || ! is_numeric( $image_id ) ) {
			return '';
		}

		$url = Visual_Portfolio_Images::wp_get_attachment_image_url( $image_id, $item['img_size'] ?? 'vp_xl' );

		return $url ? $url : '';
	}

	/**
	 * Layout the block was saved with.
	 *
	 * @param array $attributes - block attributes.
	 *
	 * @return string
	 */
	private function get_layout_type( $attributes ) {
		$layout_type = isset( $attributes['layoutType'] ) ? (string) $attributes['layoutType'] : 'grid';

		return in_array( $layout_type, array( 'grid', 'masonry', 'tiles', 'justified', 'carousel' ), true ) ? $layout_type : 'grid';
	}

	/**
	 * Whether the columns of a layout follow the container rather than a count.
	 *
	 * Tiles carry their columns in the notation and justified has none, so
	 * neither has a mode to choose.
	 *
	 * @param array  $attributes  - block attributes.
	 * @param string $layout_type - resolved layout.
	 *
	 * @return bool
	 */
	private function is_auto_columns( $attributes, $layout_type ) {
		if ( 'tiles' === $layout_type || 'justified' === $layout_type ) {
			return false;
		}

		return 'auto' === ( $attributes['layoutColumnsMode'] ?? 'auto' );
	}

	/**
	 * Columns of a layout.
	 *
	 * A count in manual mode, and the most the layout may reach in auto mode -
	 * where how many there really are is a question only the container can
	 * answer. Tiles are the exception: the number is written into the tiles
	 * notation rather than chosen with the controls.
	 *
	 * @param array  $attributes  - block attributes.
	 * @param string $layout_type - resolved layout.
	 *
	 * @return int
	 */
	private function get_layout_columns( $attributes, $layout_type ) {
		if ( 'tiles' === $layout_type ) {
			$parsed = Visual_Portfolio_Tiles_Parser::parse( $attributes['layoutTiles'] ?? '' );

			return $parsed['columns'];
		}

		$columns = isset( $attributes['layoutColumnCount'] ) ? (int) $attributes['layoutColumnCount'] : 3;

		return max( 1, min( Visual_Portfolio_Tiles_Parser::MAX_COLUMNS, $columns ) );
	}

	/**
	 * Loading attributes the image of an item should carry.
	 *
	 * The first row is above the fold whatever the page around it looks like, so
	 * it is loaded rather than deferred, and the very first picture is announced
	 * as the one worth fetching first - the candidate for the largest paint.
	 * Exactly one image is ever marked: a page where everything is urgent has
	 * nothing urgent on it.
	 *
	 * Core decides for every other item on its own, through
	 * `wp_get_loading_optimization_attributes()`, which counts the images before
	 * this gallery on the page as well - so a loop under a hero image does not
	 * take the priority away from it.
	 *
	 * `fetchpriority="high"` doubles as the marker that keeps our own lazy
	 * loading off the image, see `get_image_blocked_attributes()`.
	 *
	 * @param int $index     - position of the item on the rendered page, from zero.
	 * @param int $first_row - number of items in the first row.
	 *
	 * @return array Attributes to merge into the image, possibly empty.
	 */
	private function get_image_loading_attributes( $index, $first_row ) {
		// Core's own flag rather than a counter of ours: it is per request, so a
		// second gallery does not split the priority budget with the first, and
		// it is the same flag a hero image above the loop claims - whoever comes
		// first keeps it.
		if ( 0 === $index && wp_high_priority_element_flag() ) {
			wp_high_priority_element_flag( false );

			return array(
				'loading'       => 'eager',
				'fetchpriority' => 'high',
			);
		}

		return $index < $first_row ? array( 'loading' => 'eager' ) : array();
	}

	/**
	 * Block spacing, as a CSS length.
	 *
	 * The gap is edited through the core Dimensions panel, which stores either a
	 * length or a reference to a preset of the theme. Core prints no CSS for it
	 * on a block without layout support, which is what lets the value land on
	 * the layout variable the stylesheet already reads.
	 *
	 * @param array $attributes - block attributes.
	 *
	 * @return string CSS length, or an empty string when the theme decides.
	 */
	private function get_block_gap( $attributes ) {
		$gap = $attributes['style']['spacing']['blockGap'] ?? '';

		if ( ! is_string( $gap ) || '' === $gap ) {
			return '';
		}

		// `var:preset|spacing|50` is how a preset travels in block attributes.
		if ( 0 === strpos( $gap, 'var:' ) ) {
			return sprintf( 'var(--wp--%s)', str_replace( '|', '--', substr( $gap, 4 ) ) );
		}

		return $this->get_css_length( $gap, '' );
	}

	/**
	 * Layout classes and variables printed on the list.
	 *
	 * A public contract: themes override a gallery by redeclaring these,
	 * without touching the markup.
	 *
	 * @param array  $attributes  - block attributes.
	 * @param string $layout_type - resolved layout.
	 *
	 * @return array `[ classes, styles ]`.
	 */
	private function get_layout_props( $attributes, $layout_type ) {
		$columns = $this->get_layout_columns( $attributes, $layout_type );
		$classes = array();
		$styles  = sprintf( '--vp-layout-columns:%d;', $columns );
		$gap     = $this->get_block_gap( $attributes );

		if ( '' !== $gap ) {
			$styles .= sprintf( '--vp-layout-gap:%s;', $gap );
		}

		if ( $this->is_auto_columns( $attributes, $layout_type ) ) {
			$minimum = $this->get_css_length( $attributes['layoutMinimumColumnWidth'] ?? '', '16rem' );

			$classes[] = 'vp-layout-auto-columns';

			$styles .= sprintf( '--vp-layout-min-column-width:%s;', $minimum );

			// The track a grid repeats. A maximum column count gives it a lower
			// bound of its own, so the grid stops growing at the count rather
			// than at the width.
			$styles .= sprintf(
				'--vp-layout-track:max(min(%1$s, 100%%), (100%% - (var(--vp-layout-gap, 1.5rem) * %2$d)) / %3$d);',
				$minimum,
				$columns - 1,
				$columns
			);

			if ( ! empty( $attributes['layoutAutoFit'] ) ) {
				$classes[] = 'vp-layout-auto-fit';
			}
		}

		if ( 'justified' === $layout_type ) {
			$styles .= sprintf(
				'--vp-layout-row-height:%dpx;',
				max( 40, (int) ( $attributes['justifiedRowHeight'] ?? 320 ) )
			);
		}

		if ( 'carousel' === $layout_type ) {
			$styles .= sprintf(
				'--vp-carousel-snap-align:%s;',
				'center' === ( $attributes['carouselSnapAlign'] ?? 'start' ) ? 'center' : 'start'
			);
		}

		return array( $classes, $styles );
	}

	/**
	 * A CSS length, reduced to what a length can be made of.
	 *
	 * The value is typed in the editor and printed into an inline style.
	 *
	 * @param string $value    - raw value.
	 * @param string $fallback - value used when nothing usable is left.
	 *
	 * @return string
	 */
	private function get_css_length( $value, $fallback ) {
		$value = preg_replace( '/[^0-9a-z.%\-]/i', '', (string) $value );

		return '' === $value ? $fallback : $value;
	}

	/**
	 * Load the layout module, and answer its state the way a page without it
	 * would.
	 *
	 * Directives are evaluated on the server as well as in the browser, so a
	 * class bound to state nobody seeded would be stripped from the markup
	 * before it ever reached a browser. What is seeded here is the answer that
	 * is right with no JavaScript running: masonry is the script's, and the
	 * controls that need the script stay hidden. The module overwrites all three
	 * as it loads - client state wins over server state - so the browser sees
	 * its own answer before the first directive runs.
	 *
	 * @return void
	 */
	private function enqueue_view_module() {
		static $done = false;

		wp_enqueue_script_module( self::VIEW_MODULE );

		if ( $done ) {
			return;
		}

		$done = true;

		wp_interactivity_state(
			self::VIEW_MODULE_STORE,
			array(
				'hasScript'        => false,
				'useJsMasonry'     => true,
				'useNativeMasonry' => false,
			)
		);
	}

	/**
	 * Rules of a tiles pattern, ready to be printed next to the list.
	 *
	 * Scoped by a class derived from the pattern, so the rules are written once
	 * however many galleries on the page use it, and a gallery that arrives with
	 * a region swap brings the rules it needs with it.
	 *
	 * @param string $tiles - tiles notation.
	 *
	 * @return string
	 */
	private function get_tiles_style( $tiles ) {
		$class = Visual_Portfolio_Tiles_Parser::get_class( $tiles );

		// Printed beside every list rather than once per pattern per request.
		// Nothing here can tell a discarded render from the real one - an SEO
		// plugin running `the_content` in `wp_head` used to consume the only
		// copy, leaving the gallery carrying a class with no rules behind it.
		// Two galleries sharing a pattern repeat a few hundred bytes; the
		// alternative was a tile pattern that silently collapsed to a grid.
		return sprintf(
			'<style>%s</style>',
			// The parser writes selectors, spans and ratios out of numbers it
			// produced itself - there is no path from the notation to a `<`.
			Visual_Portfolio_Tiles_Parser::to_css( $tiles, '.' . $class )
		);
	}

	/**
	 * Carousel controls.
	 *
	 * Server rendered, hidden until the script module says it is there: the
	 * carousel itself is a scroll container, so without the module a visitor
	 * still swipes, scrolls and tabs through it, and a row of buttons that
	 * cannot move anything would be the only thing that broke.
	 *
	 * @param array $attributes - block attributes.
	 * @param int   $count      - number of items rendered.
	 *
	 * @return string
	 */
	private function get_carousel_nav( $attributes, $count ) {
		$controls = '';

		if ( ! empty( $attributes['carouselShowArrows'] ) ) {
			$arrows = array(
				'prev' => __( 'Previous slide', 'visual-portfolio' ),
				'next' => __( 'Next slide', 'visual-portfolio' ),
			);

			foreach ( $arrows as $direction => $label ) {
				$controls .= sprintf(
					'<button type="button" class="wp-block-visual-portfolio-item-template__carousel-arrow wp-block-visual-portfolio-item-template__carousel-arrow--%1$s" aria-label="%2$s" data-wp-on--click="actions.%3$s"><span aria-hidden="true"></span></button>',
					esc_attr( $direction ),
					esc_attr( $label ),
					'prev' === $direction ? 'carouselPrev' : 'carouselNext'
				);
			}
		}

		if ( ! empty( $attributes['carouselShowDots'] ) ) {
			/* translators: %d: slide number. */
			$label = __( 'Go to slide %d', 'visual-portfolio' );
			$dots  = '';

			for ( $index = 0; $index < $count; $index++ ) {
				$dots .= sprintf(
					'<button type="button" class="wp-block-visual-portfolio-item-template__carousel-dot" data-vp-slide="%1$d" aria-label="%2$s"></button>',
					$index,
					esc_attr( sprintf( $label, $index + 1 ) )
				);
			}

			// One listener for the row rather than one per dot: a Load More
			// brings more slides, and a dot appended after hydration would
			// carry no directive of its own.
			$controls .= sprintf(
				'<div class="wp-block-visual-portfolio-item-template__carousel-dots" data-vp-dot-label="%1$s" data-wp-on--click="actions.carouselGoTo">%2$s</div>',
				esc_attr( $label ),
				$dots
			);
		}

		if ( '' === $controls ) {
			return '';
		}

		return sprintf(
			'<div class="wp-block-visual-portfolio-item-template__carousel-nav" data-wp-interactive="%1$s">%2$s</div>',
			esc_attr( self::VIEW_MODULE_STORE ),
			$controls
		);
	}

	/**
	 * Block output
	 *
	 * @param array    $attributes - block attributes.
	 * @param string   $content - block content.
	 * @param WP_Block $block - block instance.
	 *
	 * @return string
	 */
	public function block_render( $attributes, $content, $block ) {
		$atts = Visual_Portfolio_Gutenberg::transform_context_to_attributes( $block->context );

		// Options are resolved before the query so that a gallery whose output is
		// replaced - Pro content protection - never runs one.
		$options = empty( $atts ) ? false : Visual_Portfolio_Get::get_options( $atts );

		if ( $options ) {
			/**
			 * Filters the entire output of the item template.
			 *
			 * Returning a string replaces the items, and it replaces them before
			 * a single one is rendered. Pro content protection relies on this.
			 *
			 * @param bool|string $output  replacement output, or false to render the items.
			 * @param array       $options portfolio options.
			 * @param WP_Block    $block   block instance.
			 */
			$custom_output = apply_filters( 'vpf_loop_custom_output', false, $options, $block );

			if ( $custom_output ) {
				return $custom_output;
			}
		}

		$result = $options ? Visual_Portfolio_Get::get_loop_items( $atts, Visual_Portfolio_Block_Loop::get_query_id( $block->context ) ) : false;

		// An empty list is still printed: it is the node the front end replaces
		// when the loop navigates. A no results block is a later phase.
		$items   = $result && ! empty( $result['items'] ) ? $result['items'] : array();
		$content = '';
		$index   = 0;

		// The widest the layout ever gets, which is the row a desktop sees first.
		$first_row = $this->get_layout_columns( $attributes, $this->get_layout_type( $attributes ) );

		$with_popup = self::opens_a_popup( $block->parsed_block['innerBlocks'] ?? array() );

		foreach ( $items as $item ) {
			$item_context = array_merge(
				self::map_item_to_context( $item, $result['options'], 'vp/', $with_popup ),
				array( 'vp/itemImageLoading' => $this->get_image_loading_attributes( $index, $first_row ) )
			);

			++$index;

			$block_instance = $block->parsed_block;

			// A name no block is registered under, so that the per item copies of
			// the inner blocks do not render the block supports of this one.
			$block_instance['blockName'] = 'visual-portfolio/null';

			$filter_block_context = static function ( $context ) use ( $item_context ) {
				return array_merge( $context, $item_context );
			};

			// Early priority, so the other `render_block_context` callbacks see
			// the item values.
			add_filter( 'render_block_context', $filter_block_context, 1 );

			// `dynamic` off renders the inner blocks only, without calling this
			// callback again and without a wrapper of their own.
			$item_content = ( new WP_Block( $block_instance ) )->render( array( 'dynamic' => false ) );

			remove_filter( 'render_block_context', $filter_block_context, 1 );

			$content .= sprintf(
				'<li class="wp-block-visual-portfolio-item-template__item">%s</li>',
				$item_content
			);
		}

		$layout_type = $this->get_layout_type( $attributes );

		list( $layout_classes, $layout_styles ) = $this->get_layout_props( $attributes, $layout_type );

		$classes = array_merge( array( 'vp-layout-' . $layout_type ), $layout_classes );
		$extra   = array();
		$before      = '';
		$after       = '';

		// Masonry is the family store's: it is the one layout the store also
		// has to lay out again after a Load More, and splitting init from
		// relayout would leave two engines on one list. Every other layout the
		// module owns end to end, so the list carries one init directive and it
		// points at whichever of the two stores is in charge.
		$init = 'callbacks.initLayout';

		switch ( $layout_type ) {
			case 'masonry':
				// WordPress ships both handles, and `masonry` pulls
				// `imagesloaded` in itself.
				wp_enqueue_script( 'masonry' );
				$this->enqueue_view_module();

				// Grid Lanes lays masonry out in the stylesheet, and where it
				// works the script has nothing left to do. The class the family
				// store starts Masonry from is therefore not the class the
				// stylesheet needs: this one is dropped and the native one is
				// added the moment the module finds `display: grid-lanes`, and
				// with no module at all the `@supports` rule still applies.
				$extra['data-wp-class--vp-layout-masonry']        = self::VIEW_MODULE_STORE . '::state.useJsMasonry';
				$extra['data-wp-class--vp-layout-masonry-native'] = self::VIEW_MODULE_STORE . '::state.useNativeMasonry';
				break;

			case 'tiles':
				$before = $this->get_tiles_style( $attributes['layoutTiles'] ?? '' );

				$classes[] = Visual_Portfolio_Tiles_Parser::get_class( $attributes['layoutTiles'] ?? '' );
				break;

			case 'justified':
				$this->enqueue_view_module();

				$init = self::VIEW_MODULE_STORE . '::callbacks.initLayout';

				$last_row = isset( $attributes['justifiedLastRow'] ) ? (string) $attributes['justifiedLastRow'] : 'left';

				$extra['data-vp-justified-row-height'] = max( 40, (int) ( $attributes['justifiedRowHeight'] ?? 320 ) );
				$extra['data-vp-justified-tolerance']  = max( 0, min( 1, (float) ( $attributes['justifiedRowHeightTolerance'] ?? 0.25 ) ) );
				$extra['data-vp-justified-max-rows']   = max( 0, (int) ( $attributes['justifiedMaxRowsCount'] ?? 0 ) );
				$extra['data-vp-justified-last-row']   = in_array( $last_row, array( 'left', 'center', 'right', 'hide' ), true ) ? $last_row : 'left';
				$extra['data-wp-class--vp-has-script'] = self::VIEW_MODULE_STORE . '::state.hasScript';
				break;

			case 'carousel':
				wp_enqueue_style( self::CAROUSEL_STYLE );
				$this->enqueue_view_module();

				if ( ! empty( $attributes['carouselAutoWidth'] ) ) {
					$classes[] = 'vp-carousel-auto-width';
				}

				if ( ! empty( $attributes['carouselFreeScroll'] ) ) {
					$classes[] = 'vp-carousel-free-scroll';
				}

				if ( 'coverflow' === ( $attributes['carouselEffect'] ?? 'none' ) ) {
					$classes[] = 'vp-carousel-coverflow';
				}

				// A scroll container has to be reachable by keyboard, and a
				// name has to say what the arrow keys are about to move.
				$extra['tabindex']   = '0';
				$extra['aria-label'] = __( 'Gallery carousel', 'visual-portfolio' );

				// Blossom is a mouse-drag enhancement on top of the native
				// scroll, so the module imports it only where a pointer can
				// drag - which is why its address travels on the markup
				// instead of being an eagerly loaded dependency.
				$extra['data-vp-carousel-src'] = visual_portfolio()->plugin_url . 'assets/vendor/blossom-carousel/dist/blossom-carousel-core.js';

				$init = self::VIEW_MODULE_STORE . '::callbacks.initLayout';

				$extra['data-wp-class--vp-has-script'] = self::VIEW_MODULE_STORE . '::state.hasScript';

				$after = $this->get_carousel_nav( $attributes, count( $items ) );
				break;
		}

		$wrapper_attributes = get_block_wrapper_attributes(
			array_merge(
				array(
					// `get_block_wrapper_attributes()` escapes the values itself.
					'class'          => implode( ' ', $classes ),
					'style'          => $layout_styles,
					'data-vp-layout' => $layout_type,
				),
				// Before the init directive on purpose: both are applied by an
				// effect, the effects run in the order the attributes are read,
				// and the masonry class has to be gone before the family store
				// looks for it.
				$extra,
				array(
					'data-wp-interactive'     => Visual_Portfolio_Block_Loop::STORE,
					'data-wp-init'            => $init,
					'data-wp-bind--aria-busy' => 'state.isLoading',
				)
			)
		);

		// One live region per loop, next to the list rather than inside it: the
		// items are appended into the list, and a region that moves with them
		// announces nothing.
		return sprintf(
			'%1$s<ul %2$s>%3$s</ul>%4$s<div class="wp-block-visual-portfolio-item-template__live-region" aria-live="polite" data-wp-text="state.ariaLiveMessage"></div>',
			$before,
			$wrapper_attributes,
			$content,
			$after
		);
	}
}
new Visual_Portfolio_Block_Item_Template();
