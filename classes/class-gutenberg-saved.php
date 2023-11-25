<?php
/**
 * Gutenberg block.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Class Visual_Portfolio_Gutenberg_Saved_Block
 */
class Visual_Portfolio_Gutenberg_Saved_Block {
	/**
	 * Registered controls, that will be used in Gutenberg block.
	 *
	 * @var array
	 */
	public $registered_controls = array();

	/**
	 * Visual_Portfolio_Gutenberg_Saved_Block constructor.
	 */
	public function __construct() {
		add_action( 'init', array( $this, 'register_block' ), 11 );
		add_action( 'admin_init', array( $this, 'register_block_layouts_editor' ), 11 );
	}

	/**
	 * Register Block.
	 */
	public function register_block() {
		if ( ! function_exists( 'register_block_type_from_metadata' ) ) {
			return;
		}

		register_block_type_from_metadata(
			visual_portfolio()->plugin_path . 'gutenberg/block-saved',
			array(
				'render_callback' => array( $this, 'block_render' ),
			)
		);

		// Fallback.
		register_block_type_from_metadata(
			'nk/visual-portfolio',
			array(
				'render_callback' => array( $this, 'block_render' ),
				'attributes'      => array(
					'id' => array(
						'type' => 'string',
					),
					'align' => array(
						'type' => 'string',
					),
					'className' => array(
						'type' => 'string',
					),
					'anchor' => array(
						'type' => 'string',
					),
				),
			)
		);
	}

	/**
	 * Register Block for Layouts Editor.
	 */
	public function register_block_layouts_editor() {
		global $pagenow;

		if ( 'post.php' === $pagenow && isset( $_GET['post'] ) && 'vp_lists' === get_post_type( $_GET['post'] ) ) {
			register_block_type_from_metadata(
				visual_portfolio()->plugin_path . 'gutenberg/layouts-editor/block'
			);
		}
	}

	/**
	 * Block output
	 *
	 * @param array $attributes - block attributes.
	 *
	 * @return string
	 */
	public function block_render( $attributes ) {
		$attributes = array_merge(
			array(
				'id'        => '',
				'align'     => '',
				'className' => '',
			),
			$attributes
		);

		if ( ! $attributes['id'] ) {
			return '';
		}

		// WPML support.
        // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound
		$attributes['id'] = apply_filters( 'wpml_object_id', $attributes['id'], 'vp_lists', true );

		$class_name = 'wp-block-visual-portfolio';

		$wrapper_attributes = get_block_wrapper_attributes(
			array(
				'class' => $class_name,
			)
		);

		return sprintf( '<div %1$s>%2$s</div>', $wrapper_attributes, Visual_Portfolio_Get::get( array( 'id' => $attributes['id'] ) ) );
	}
}
new Visual_Portfolio_Gutenberg_Saved_Block();
