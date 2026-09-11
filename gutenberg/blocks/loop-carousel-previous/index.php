<?php
/**
 * Block Carousel Previous Slide.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Visual Portfolio Carousel Previous Slide block.
 */
class Visual_Portfolio_Block_Loop_Carousel_Previous {
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
		register_block_type_from_metadata(
			visual_portfolio()->plugin_path . 'gutenberg/blocks/loop-carousel-previous',
			array(
				'render_callback' => array( $this, 'block_render' ),
			)
		);
	}

	/**
	 * Block output
	 *
	 * @param array $attributes - block attributes.
	 *
	 * @return string
	 */
	public function block_render( $attributes ) {
		if ( Visual_Portfolio_Block_Loop_Carousel_Nav::is_hidden( $attributes ) ) {
			return '';
		}

		return sprintf(
			'<button type="button" %1$s><span aria-hidden="true"></span></button>',
			Visual_Portfolio_Block_Loop_Carousel_Nav::control_attributes(
				Visual_Portfolio_Block_Loop_Carousel_Nav::arrow_classes( 'vp-block-loop-carousel-previous', $attributes ),
				'previous',
				array(
					'aria-label'          => __( 'Previous slide', 'visual-portfolio' ),
					'data-wp-interactive' => Visual_Portfolio_Block_Item_Template::VIEW_MODULE_STORE,
					'data-wp-on--click'   => 'actions.carouselPrev',
				)
			)
		);
	}
}
new Visual_Portfolio_Block_Loop_Carousel_Previous();
