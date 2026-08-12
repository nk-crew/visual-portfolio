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
	 * Constructor.
	 */
	public function __construct() {
		add_action( 'init', array( $this, 'register_block' ), 11 );
	}

	/**
	 * Register Block.
	 */
	public function register_block() {
		Visual_Portfolio_Assets::register_style( 'visual-portfolio-block-item-template', 'build/gutenberg/blocks/item-template/style' );
		wp_style_add_data( 'visual-portfolio-block-item-template', 'rtl', 'replace' );

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
	 *
	 * @return array
	 */
	public static function map_item_to_context( $item, $options, $prefix = 'vp/' ) {
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
	 * Layout variables printed on the list.
	 *
	 * A public contract: themes and Pro breakpoints override the layout by
	 * redeclaring these, without touching the markup.
	 *
	 * @param array $attributes - block attributes.
	 *
	 * @return string
	 */
	private function get_layout_styles( $attributes ) {
		$columns = isset( $attributes['layoutColumns'] ) ? (int) $attributes['layoutColumns'] : 3;
		$columns = max( 1, $columns );

		// The gap is a raw CSS length typed in the editor, and it is printed into
		// an inline style - keep it to what a length can be made of.
		$gap = preg_replace( '/[^0-9a-z.%\-]/i', '', (string) ( $attributes['layoutGap'] ?? '' ) );

		return sprintf(
			'--vp-layout-columns:%1$d;--vp-layout-columns-md:%2$d;--vp-layout-columns-sm:1;--vp-layout-gap:%3$s;',
			$columns,
			min( $columns, 2 ),
			'' === $gap ? '1.5rem' : $gap
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

		foreach ( $items as $item ) {
			$item_context = self::map_item_to_context( $item, $result['options'] );

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

		$layout_type = 'masonry' === ( $attributes['layoutType'] ?? 'grid' ) ? 'masonry' : 'grid';

		// Masonry is the only layout that needs a script. WordPress ships both
		// handles, and `masonry` pulls `imagesloaded` in itself.
		if ( 'masonry' === $layout_type ) {
			wp_enqueue_script( 'masonry' );
		}

		$wrapper_attributes = get_block_wrapper_attributes(
			array(
				// `get_block_wrapper_attributes()` escapes the values itself.
				'class'                    => 'vp-layout-' . $layout_type,
				'style'                    => $this->get_layout_styles( $attributes ),
				'data-wp-interactive'      => Visual_Portfolio_Block_Loop::STORE,
				'data-wp-init'             => 'callbacks.initLayout',
				'data-wp-bind--aria-busy'  => 'state.isLoading',
			)
		);

		// One live region per loop, next to the list rather than inside it: the
		// items are appended into the list, and a region that moves with them
		// announces nothing.
		return sprintf(
			'<ul %1$s>%2$s</ul><div class="wp-block-visual-portfolio-item-template__live-region" aria-live="polite" data-wp-text="state.ariaLiveMessage"></div>',
			$wrapper_attributes,
			$content
		);
	}
}
new Visual_Portfolio_Block_Item_Template();
