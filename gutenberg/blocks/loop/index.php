<?php
/**
 * Block Loop.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Visual Portfolio Loop block.
 */
class Visual_Portfolio_Block_Loop {
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
		Visual_Portfolio_Assets::register_script( 'visual-portfolio-block-loop', 'build/gutenberg/blocks/loop/view' );

		register_block_type_from_metadata(
			visual_portfolio()->plugin_path . 'gutenberg/blocks/loop',
			array(
				'render_callback' => array( $this, 'block_render' ),
			)
		);
	}

	/**
	 * Block output
	 *
	 * @param array  $attributes - block attributes.
	 * @param string $content - block render.
	 *
	 * @return string
	 */
	public function block_render( $attributes, $content ) {
		$config = Visual_Portfolio_Get::get_output_config( $attributes );

		$processor = new WP_HTML_Tag_Processor( $content );
		$processor->next_tag( 'div' );

		$new_classname = $processor->get_attribute( 'class' ) . ' ' . $config['class'];

		$processor->set_attribute( 'class', $new_classname );

		return $processor->get_updated_html();
	}
}
new Visual_Portfolio_Block_Loop();
