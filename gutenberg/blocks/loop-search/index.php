<?php
/**
 * Block Search.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Visual Portfolio Search block.
 */
class Visual_Portfolio_Block_Loop_Search {
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
		Visual_Portfolio_Assets::register_style( 'visual-portfolio-block-loop-search', 'build/gutenberg/blocks/loop-search/style' );
		wp_style_add_data( 'visual-portfolio-block-loop-search', 'rtl', 'replace' );

		register_block_type_from_metadata(
			visual_portfolio()->plugin_path . 'gutenberg/blocks/loop-search',
			array(
				'render_callback' => array( $this, 'block_render' ),
			)
		);
	}

	/**
	 * Block output
	 *
	 * A GET form, so a search works without JavaScript: it carries the rest of
	 * the query string along the way the filter and sort forms do, and leaves
	 * the page out, since a new search starts at page one. With the store
	 * running the input searches as the visitor types.
	 *
	 * @param array    $attributes - block attributes.
	 * @param string   $content - block content.
	 * @param WP_Block $block - block instance.
	 *
	 * @return string
	 */
	public function block_render( $attributes, $content, $block ) {
		$loop_options = Visual_Portfolio_Gutenberg::transform_context_to_attributes( $block->context );
		$query_id     = Visual_Portfolio_Block_Loop::get_query_id( $block->context );

		// A field that searches nothing is worse than none.
		if ( ! Visual_Portfolio_Get::supports_loop_search( $loop_options, $query_id ) ) {
			return '';
		}

		$name   = Visual_Portfolio_Get::get_query_var_name( 'search', $query_id );
		$action = explode(
			'?',
			Visual_Portfolio_Block_Loop::get_link(
				array(
					'vp_search' => '',
					'vp_page'   => 1,
				),
				$block->context
			),
			2
		);
		$seed   = Visual_Portfolio_Block_Loop::get_control_random_seed( $block->context );
		$hidden = Visual_Portfolio_Block_Loop::get_preserved_inputs(
			array( $name, Visual_Portfolio_Get::get_query_var_name( 'page', $query_id ) ),
			$seed ? array( 'vpf_random_seed' => $seed ) : array()
		);

		$label       = trim( (string) ( $attributes['label'] ?? '' ) );
		$placeholder = trim( (string) ( $attributes['placeholder'] ?? '' ) );

		return sprintf(
			'<form role="search" method="get" action="%1$s" %2$s data-wp-interactive="%3$s" data-wp-on--submit="actions.search">%4$s<label><span class="vp-block-loop-search__label">%5$s</span><input type="search" class="vp-block-loop-search__input" name="%6$s" value="%7$s" placeholder="%8$s" maxlength="%9$d" data-wp-on--input="actions.search" /></label></form>',
			esc_url( $action[0] ),
			get_block_wrapper_attributes(
				array(
					'class' => 'vp-block-loop-search',
				)
			),
			esc_attr( Visual_Portfolio_Block_Loop::STORE ),
			$hidden,
			esc_html( '' !== $label ? $label : __( 'Search', 'visual-portfolio' ) ),
			esc_attr( $name ),
			esc_attr( Visual_Portfolio_Get::get_current_search( $loop_options, $query_id ) ),
			esc_attr( '' !== $placeholder ? $placeholder : __( 'Search…', 'visual-portfolio' ) ),
			Visual_Portfolio_Get::LOOP_SEARCH_MAX_LENGTH
		);
	}
}
new Visual_Portfolio_Block_Loop_Search();
