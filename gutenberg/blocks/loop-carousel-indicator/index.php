<?php
/**
 * Block Carousel Indicator.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Visual Portfolio Carousel Indicator block.
 */
class Visual_Portfolio_Block_Loop_Carousel_Indicator {
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
			visual_portfolio()->plugin_path . 'gutenberg/blocks/loop-carousel-indicator',
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

		if ( 'progress' === ( $attributes['indicator'] ?? 'dots' ) ) {
			return sprintf(
				'<div %1$s><span class="vp-block-loop-carousel-progress-value"></span></div>',
				Visual_Portfolio_Block_Loop_Carousel_Nav::control_attributes(
					'vp-block-loop-carousel-indicator vp-block-loop-carousel-indicator--progress',
					'indicator',
					array(
						'role'       => 'progressbar',
						'aria-label' => __( 'Carousel position', 'visual-portfolio' ),
					)
				)
			);
		}

		// Rendered empty on purpose. The number of slides is the item
		// template's answer and not this block's - the two are siblings, and a
		// Load More or a filter changes the count after the page was rendered
		// anyway - so the view module is what gives the row its dots.
		return sprintf(
			'<div %1$s></div>',
			Visual_Portfolio_Block_Loop_Carousel_Nav::control_attributes(
				'vp-block-loop-carousel-indicator vp-block-loop-carousel-indicator--dots',
				'indicator',
				array(
					/* translators: %d: slide number. */
					'data-vp-dot-label'   => __( 'Go to slide %d', 'visual-portfolio' ),
					'data-wp-interactive' => Visual_Portfolio_Block_Item_Template::VIEW_MODULE_STORE,
					'data-wp-on--click'   => 'actions.carouselGoTo',
				)
			)
		);
	}
}
new Visual_Portfolio_Block_Loop_Carousel_Indicator();
