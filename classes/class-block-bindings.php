<?php
/**
 * Block Bindings source of the Gallery Loop family.
 *
 * @package visual-portfolio/block-bindings
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Visual_Portfolio_Block_Bindings
 */
class Visual_Portfolio_Block_Bindings {
	/**
	 * Name of the source.
	 */
	const SOURCE = 'visual-portfolio/item';

	/**
	 * Constructor.
	 */
	public function __construct() {
		// block bindings.
		add_action( 'init', array( $this, 'register_source' ), 11 );
	}

	/**
	 * Register the `visual-portfolio/item` binding source.
	 *
	 * A developer tool, not a user feature: WordPress gives custom sources no
	 * editor UI, so a binding is written by hand in the code editor or shipped
	 * inside a pattern. The point is that a pattern author or Pro can bind a
	 * core Paragraph, Heading, Image or Button to item data instead of asking
	 * us for another `item-*` block. Users get blocks - see `00-overview.md` §7.
	 *
	 *     <!-- wp:paragraph {"metadata":{"bindings":{"content":{
	 *         "source":"visual-portfolio/item",
	 *         "args":{"key":"title"}
	 *     }}}} -->
	 *
	 * @return void
	 */
	public function register_source() {
		register_block_bindings_source(
			self::SOURCE,
			array(
				'label'              => __( 'Gallery Item', 'visual-portfolio' ),
				'get_value_callback' => array( $this, 'get_value' ),

				// Only the keys named here reach `$block->context`, so the source
				// declares every key an item can carry.
				'uses_context'       => Visual_Portfolio_Block_Item_Template::get_context_keys(),
			)
		);
	}

	/**
	 * Resolve a bound attribute from the context of the item being rendered.
	 *
	 * The attribute name is part of the signature WordPress calls this with, and
	 * it is deliberately not read: the binding names the item value itself, so
	 * the attribute it lands on does not change which value that is.
	 *
	 * @param array    $source_args    - arguments of the binding, `key` is the item value to read.
	 * @param WP_Block $block_instance - block the binding belongs to.
	 * @param string   $attribute_name - attribute being bound.
	 *
	 * @return string|null Value, or null to leave the attribute as the block saved it.
	 */
	public function get_value( $source_args, $block_instance, $attribute_name ) { // phpcs:ignore VariableAnalysis.CodeAnalysis.VariableAnalysis.UnusedVariable
		$key = isset( $source_args['key'] ) && is_string( $source_args['key'] ) ? $source_args['key'] : '';

		if ( '' === $key ) {
			return null;
		}

		$context_key = self::get_context_key( $key );
		$context     = $block_instance->context;

		// Outside an item template there is no item to read, and a binding that
		// resolves to nothing has to leave the saved content alone rather than
		// blank it.
		if ( ! is_array( $context ) || ! array_key_exists( $context_key, $context ) ) {
			return null;
		}

		$value = $context[ $context_key ];

		// Bound attributes end up in the markup as text or as a URL. A list -
		// the categories of an item - has no single rendering, and returning it
		// would replace the attribute with the word "Array".
		if ( ! is_scalar( $value ) ) {
			return null;
		}

		return (string) $value;
	}

	/**
	 * Context key a binding argument refers to.
	 *
	 * Bindings are written by hand, so the short name of the value is what a
	 * binding carries (`title`, `imgUrl`). The full context key is accepted too,
	 * since that is what the item blocks and the `vpf_loop_item_context` filter
	 * speak in.
	 *
	 * @param string $key - `key` argument of the binding.
	 *
	 * @return string
	 */
	private static function get_context_key( $key ) {
		if ( 0 === strpos( $key, 'vp/' ) ) {
			return $key;
		}

		return 'vp/item' . ucfirst( $key );
	}
}

new Visual_Portfolio_Block_Bindings();
