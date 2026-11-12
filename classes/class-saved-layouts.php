<?php
/**
 * Saved Layouts built from Gallery Loop blocks.
 *
 * @package visual-portfolio/saved-layouts
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Visual_Portfolio_Saved_Layouts
 *
 * A Saved Layout whose content holds a Gallery Loop is rendered from that
 * content. Any other Saved Layout is a legacy one, kept in post meta and
 * rendered by `Visual_Portfolio_Get`.
 *
 * A Gallery Loop anywhere can sync with a block-based layout through its
 * `savedLayout` attribute. The layout then provides the item template, every
 * block inside it and the lightbox. The loop keeps its own source, query, ids
 * and the controls around the item template, plus every attribute it lists as
 * overridden under the sync key of the block it belongs to.
 */
class Visual_Portfolio_Saved_Layouts {
	/**
	 * Post type of Saved Layouts.
	 */
	const POST_TYPE = 'vp_lists';

	/**
	 * Meta that locks a layout's settings in the blocks synced with it.
	 */
	const LOCK_META = 'vp_saved_layout_locked';

	/**
	 * Sync key of the loop's own synced attributes.
	 */
	const LOOP_KEY = 'loop';

	/**
	 * Attributes of the loop that come from the layout.
	 */
	const LOOP_SYNCED_ATTRIBUTES = array( 'lightbox' );

	/**
	 * Layouts being rendered, outermost first.
	 *
	 * @var int[]
	 */
	private static $render_stack = array();

	/**
	 * Loops rendered from each inserted layout on this request, keyed by id.
	 *
	 * @var int[]
	 */
	private static $inserted_loops = array();

	/**
	 * Parsed loop block of each layout, keyed by id.
	 *
	 * @var array
	 */
	private static $loop_cache = array();

	/**
	 * Constructor.
	 */
	public function __construct() {
		// meta.
		add_action( 'init', array( $this, 'register_meta' ) );

		// editor.
		add_action( 'load-post-new.php', array( $this, 'use_loop_template' ) );

		// sync.
		add_filter( 'render_block_data', array( $this, 'filter_render_block_data' ) );
		add_filter( 'wp_insert_post_data', array( $this, 'add_sync_keys_on_save' ) );
		add_action( 'clean_post_cache', array( $this, 'forget_layout' ) );
	}

	/**
	 * Register the lock meta.
	 */
	public function register_meta() {
		// REST carries a post type's meta only when it supports custom fields.
		add_post_type_support( self::POST_TYPE, 'custom-fields' );

		register_post_meta(
			self::POST_TYPE,
			self::LOCK_META,
			array(
				'type'          => 'boolean',
				'single'        => true,
				'default'       => false,
				'show_in_rest'  => true,
				'auth_callback' => function ( $allowed, $meta_key, $post_id ) {
					return current_user_can( 'edit_post', $post_id );
				},
			)
		);
	}

	/**
	 * Whether a Saved Layout is built from blocks.
	 *
	 * @param int|WP_Post $post - layout or its id.
	 *
	 * @return bool
	 */
	public static function is_block_layout( $post ) {
		$post = get_post( $post );

		return $post
			&& self::POST_TYPE === $post->post_type
			&& has_block( 'visual-portfolio/loop', $post->post_content );
	}

	/**
	 * Whether the Saved Layout editor on this request edits a legacy layout.
	 *
	 * A new layout is block-based unless its link asks for the legacy one, or
	 * WordPress is too old for Gallery Loop blocks. An existing layout is
	 * block-based when its content holds a Gallery Loop.
	 *
	 * @return bool
	 */
	public static function is_legacy_editor() {
		global $pagenow;

		if ( ! visual_portfolio()->supports_loop_blocks() ) {
			return true;
		}

		// phpcs:disable WordPress.Security.NonceVerification.Recommended
		if ( 'post-new.php' === $pagenow ) {
			return isset( $_GET['vp_layout'] ) && 'legacy' === sanitize_key( wp_unslash( $_GET['vp_layout'] ) );
		}

		$post_id = isset( $_GET['post'] ) ? (int) $_GET['post'] : (int) get_the_ID();
		// phpcs:enable WordPress.Security.NonceVerification.Recommended

		return ! self::is_block_layout( $post_id );
	}

	/**
	 * Start a new block-based layout from an empty Gallery Loop, which asks
	 * for its source and pattern as it does on any page.
	 */
	public function use_loop_template() {
		global $typenow;

		if ( self::POST_TYPE !== $typenow || self::is_legacy_editor() ) {
			return;
		}

		get_post_type_object( self::POST_TYPE )->template = array(
			array( 'visual-portfolio/loop', array( 'align' => 'wide' ) ),
		);
	}

	/**
	 * Whether a layout locks the settings of the blocks synced with it.
	 *
	 * @param int $id - layout id.
	 *
	 * @return bool
	 */
	public static function is_locked( $id ) {
		return (bool) get_post_meta( $id, self::LOCK_META, true );
	}

	/**
	 * First Gallery Loop of a block-based layout.
	 *
	 * A trashed layout still answers, so blocks synced with it keep their look
	 * until it is deleted for good.
	 *
	 * @param int $id - layout id.
	 *
	 * @return array|null Parsed block.
	 */
	public static function get_layout_loop( $id ) {
		$id = (int) $id;

		if ( array_key_exists( $id, self::$loop_cache ) ) {
			return self::$loop_cache[ $id ];
		}

		$loop = null;

		if ( self::is_block_layout( $id ) ) {
			$loop = self::find_block( parse_blocks( get_post( $id )->post_content ), 'visual-portfolio/loop' );
		}

		self::$loop_cache[ $id ] = $loop;

		return $loop;
	}

	/**
	 * Drop a layout from the cache when its post changes.
	 *
	 * @param int $post_id - post id.
	 */
	public function forget_layout( $post_id ) {
		unset( self::$loop_cache[ (int) $post_id ] );
	}

	/**
	 * Render a block-based layout.
	 *
	 * A layout reached again while it is already rendering, directly or
	 * through another layout, renders nothing at that level.
	 *
	 * @param int    $id - layout id.
	 * @param string $class_name - extra class of the wrapper.
	 *
	 * @return string
	 */
	public static function render( $id, $class_name = '' ) {
		$id = (int) $id;

		if ( ! self::is_block_layout( $id ) || in_array( $id, self::$render_stack, true ) ) {
			return '';
		}

		if ( ! self::is_visible( $id ) ) {
			return '';
		}

		$post = get_post( $id );

		$blocks = parse_blocks( $post->post_content );
		$output = '';

		self::number_inserted_loops( $blocks, $id, self::$inserted_loops );

		self::$render_stack[] = $id;

		foreach ( $blocks as $block ) {
			$output .= render_block( $block );
		}

		array_pop( self::$render_stack );

		if ( $class_name ) {
			$output = sprintf( '<div class="%1$s">%2$s</div>', esc_attr( $class_name ), $output );
		}

		return $output;
	}

	/**
	 * Give each loop of an inserted layout ids of its own on this page.
	 *
	 * A layout's loops carry the ids their own editor gave them, so two
	 * layouts on one page, or one layout inserted twice, would share their
	 * URL parameters and router region. The ids are the layout's id and the
	 * loop's place among that layout's loops on the page, so other layouts
	 * added around it do not change them.
	 *
	 * @param array $blocks - parsed blocks, changed in place.
	 * @param int   $id - layout id.
	 * @param int[] $counts - loops numbered so far, by layout id, advanced in place.
	 */
	public static function number_inserted_loops( &$blocks, $id, &$counts ) {
		foreach ( $blocks as &$block ) {
			if ( 'visual-portfolio/loop' === ( $block['blockName'] ?? '' ) ) {
				$counts[ $id ] = ( $counts[ $id ] ?? 0 ) + 1;

				$block['attrs']['queryId']  = $id * 100 + $counts[ $id ];
				$block['attrs']['block_id'] = ( $block['attrs']['block_id'] ?? 'layout' ) . '-' . $id . '-' . $counts[ $id ];
			}

			if ( ! empty( $block['innerBlocks'] ) ) {
				self::number_inserted_loops( $block['innerBlocks'], $id, $counts );
			}
		}
	}

	/**
	 * Whether an inserted layout shows for the current visitor: a published
	 * one, or any one the visitor can edit.
	 *
	 * @param int $id - layout id.
	 *
	 * @return bool
	 */
	public static function is_visible( $id ) {
		return 'publish' === get_post_status( $id ) || current_user_can( 'edit_post', $id );
	}

	/**
	 * Apply the layout to a synced loop before it renders.
	 *
	 * @param array $parsed_block - block being rendered.
	 *
	 * @return array
	 */
	public function filter_render_block_data( $parsed_block ) {
		if ( 'visual-portfolio/loop' !== ( $parsed_block['blockName'] ?? '' ) || empty( $parsed_block['attrs']['savedLayout']['id'] ) ) {
			return $parsed_block;
		}

		return self::apply_layout( $parsed_block );
	}

	/**
	 * Merge a synced loop with its layout.
	 *
	 * The item template and every block inside it come from the layout, and
	 * so does the loop's lightbox. An attribute the loop lists as overridden
	 * under a block's sync key takes the loop's own value, or its default
	 * when the loop's block no longer carries it. A locked layout ignores the
	 * overrides. A layout that no longer exists leaves the loop as it is.
	 *
	 * @param array      $loop - parsed loop block.
	 * @param array|null $layout - the layout's loop block, read from the layout when omitted.
	 * @param bool|null  $locked - whether the layout is locked, read from the layout when omitted.
	 *
	 * @return array
	 */
	public static function apply_layout( $loop, $layout = null, $locked = null ) {
		$reference = $loop['attrs']['savedLayout'] ?? array();
		$id        = (int) ( $reference['id'] ?? 0 );

		if ( null === $layout ) {
			$layout = $id && ! in_array( $id, self::$render_stack, true ) ? self::get_layout_loop( $id ) : null;
		}

		if ( ! $layout ) {
			return $loop;
		}

		$locked    = null === $locked ? self::is_locked( $id ) : $locked;
		$overrides = $locked ? array() : self::sanitize_overrides( $reference['overrides'] ?? array() );

		foreach ( self::LOOP_SYNCED_ATTRIBUTES as $name ) {
			if ( in_array( $name, $overrides[ self::LOOP_KEY ] ?? array(), true ) ) {
				continue;
			}

			if ( array_key_exists( $name, $layout['attrs'] ) ) {
				$loop['attrs'][ $name ] = $layout['attrs'][ $name ];
			} else {
				unset( $loop['attrs'][ $name ] );
			}
		}

		$layout_template = self::find_block( $layout['innerBlocks'], 'visual-portfolio/item-template' );

		if ( ! $layout_template ) {
			return $loop;
		}

		$own_blocks = array();
		self::index_by_sync_key( $loop['innerBlocks'], $own_blocks );

		foreach ( $loop['innerBlocks'] as $index => $inner ) {
			if ( 'visual-portfolio/item-template' === $inner['blockName'] ) {
				$loop['innerBlocks'][ $index ] = self::merge_block( $layout_template, $own_blocks, $overrides );
				break;
			}
		}

		return $loop;
	}

	/**
	 * A layout block with the loop's overridden attributes on top.
	 *
	 * A block that saves markup of its own, such as a paragraph or a group,
	 * holds part of its settings in that markup, so once any of its attributes
	 * is overridden it is the loop's block whole: attributes and markup. Its
	 * inner blocks are still merged one by one. Markup is tested rather than
	 * `is_dynamic()`, because core's heading, button and image save markup and
	 * also have a render callback. Item blocks save none, so an override takes
	 * only the attributes it lists.
	 *
	 * @param array $layout_block - block from the layout.
	 * @param array $own_blocks - the loop's blocks, keyed by sync key.
	 * @param array $overrides - overridden attribute names, keyed by sync key.
	 *
	 * @return array
	 */
	private static function merge_block( $layout_block, $own_blocks, $overrides ) {
		$key = $layout_block['attrs']['metadata']['vpSyncKey'] ?? '';

		if ( $key && ! empty( $overrides[ $key ] ) && isset( $own_blocks[ $key ] ) ) {
			$own          = $own_blocks[ $key ];
			$saves_markup = '' !== trim( $layout_block['innerHTML'] );

			if ( $saves_markup ) {
				$layout_block['attrs'] = $own['attrs'];
			} else {
				foreach ( $overrides[ $key ] as $name ) {
					if ( array_key_exists( $name, $own['attrs'] ) ) {
						$layout_block['attrs'][ $name ] = $own['attrs'][ $name ];
					} else {
						unset( $layout_block['attrs'][ $name ] );
					}
				}
			}

			if ( count( $own['innerBlocks'] ) === count( $layout_block['innerBlocks'] ) ) {
				$layout_block['innerHTML']    = $own['innerHTML'];
				$layout_block['innerContent'] = $own['innerContent'];
			} elseif ( $saves_markup && in_array( null, $own['innerContent'], true ) ) {
				$layout_block['innerContent'] = self::wrap_slots( $own['innerContent'], $layout_block['innerContent'] );
				$layout_block['innerHTML']    = implode( '', array_filter( $layout_block['innerContent'], 'is_string' ) );
			}
		}

		foreach ( $layout_block['innerBlocks'] as $index => $inner ) {
			$layout_block['innerBlocks'][ $index ] = self::merge_block( $inner, $own_blocks, $overrides );
		}

		return $layout_block;
	}

	/**
	 * The page's markup around the layout's inner block slots: what the editor
	 * saves for the page's attributes once the layout's inner blocks changed.
	 *
	 * @param array $own - the loop block's inner content, with at least one slot.
	 * @param array $layout - the layout block's inner content.
	 *
	 * @return array
	 */
	private static function wrap_slots( $own, $layout ) {
		$own_slots    = array_keys( $own, null, true );
		$layout_slots = array_keys( $layout, null, true );
		$inner        = $layout_slots ? array_slice( $layout, $layout_slots[0], end( $layout_slots ) - $layout_slots[0] + 1 ) : array();

		return array_merge(
			array_slice( $own, 0, $own_slots[0] ),
			$inner,
			array_slice( $own, end( $own_slots ) + 1 )
		);
	}

	/**
	 * Overrides as a map of sync key to a list of attribute names.
	 *
	 * @param mixed $overrides - value stored in the loop.
	 *
	 * @return array
	 */
	public static function sanitize_overrides( $overrides ) {
		$result = array();

		if ( ! is_array( $overrides ) ) {
			return $result;
		}

		foreach ( $overrides as $key => $names ) {
			if ( ! is_string( $key ) || ! is_array( $names ) ) {
				continue;
			}

			$result[ $key ] = array_values( array_filter( $names, 'is_string' ) );
		}

		return $result;
	}

	/**
	 * Collect blocks that carry a sync key.
	 *
	 * @param array $blocks - parsed blocks.
	 * @param array $index - collected blocks, keyed by sync key.
	 */
	private static function index_by_sync_key( $blocks, &$index ) {
		foreach ( $blocks as $block ) {
			$key = $block['attrs']['metadata']['vpSyncKey'] ?? '';

			if ( $key && ! isset( $index[ $key ] ) ) {
				$index[ $key ] = $block;
			}

			self::index_by_sync_key( $block['innerBlocks'] ?? array(), $index );
		}
	}

	/**
	 * First block of a name, searched depth first.
	 *
	 * @param array  $blocks - parsed blocks.
	 * @param string $name - block name.
	 *
	 * @return array|null
	 */
	public static function find_block( $blocks, $name ) {
		foreach ( $blocks as $block ) {
			if ( ( $block['blockName'] ?? '' ) === $name ) {
				return $block;
			}

			$found = self::find_block( $block['innerBlocks'] ?? array(), $name );

			if ( $found ) {
				return $found;
			}
		}

		return null;
	}

	/**
	 * Give every block of a layout's item template a sync key.
	 *
	 * The editor assigns keys as blocks are added; this covers layouts that
	 * arrive another way, such as an import or a block saved as a layout. A
	 * missing key is derived from the block's position, so saving the same
	 * content twice gives the same keys.
	 *
	 * @param array $data - post data about to be saved, slashed.
	 *
	 * @return array
	 */
	public function add_sync_keys_on_save( $data ) {
		if ( self::POST_TYPE !== ( $data['post_type'] ?? '' ) ) {
			return $data;
		}

		$content = wp_unslash( $data['post_content'] );

		if ( ! has_block( 'visual-portfolio/item-template', $content ) ) {
			return $data;
		}

		$blocks  = parse_blocks( $content );
		$changed = self::add_sync_keys( $blocks, false, '' );

		if ( $changed ) {
			$data['post_content'] = wp_slash( serialize_blocks( $blocks ) );
		}

		return $data;
	}

	/**
	 * Add missing sync keys under every item template.
	 *
	 * @param array  $blocks - parsed blocks, changed in place.
	 * @param bool   $inside - whether the blocks are inside an item template.
	 * @param string $path - position of the blocks' parent.
	 *
	 * @return bool Whether a key was added.
	 */
	public static function add_sync_keys( &$blocks, $inside, $path ) {
		$changed = false;

		foreach ( $blocks as $index => &$block ) {
			if ( empty( $block['blockName'] ) ) {
				continue;
			}

			$block_path  = $path . '.' . $index;
			$is_template = 'visual-portfolio/item-template' === $block['blockName'];

			if ( ( $inside || $is_template ) && empty( $block['attrs']['metadata']['vpSyncKey'] ) ) {
				$block['attrs']['metadata']['vpSyncKey'] = 'k' . substr( md5( $block_path ), 0, 8 );
				$changed                                 = true;
			}

			if ( self::add_sync_keys( $block['innerBlocks'], $inside || $is_template, $block_path ) ) {
				$changed = true;
			}
		}

		return $changed;
	}
}

new Visual_Portfolio_Saved_Layouts();
