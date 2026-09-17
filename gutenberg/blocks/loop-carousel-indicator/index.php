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
		$indicator = $attributes['indicator'] ?? 'dots';

		// The slide on screen and how many there are, as a pair of numbers.
		// Both are written by the view module for the same reason the dots are
		// - the count is the item template's answer, and a Load More or a
		// filter changes it after the page was rendered.
		//
		// Hidden from a screen reader on purpose: the arrows say where the
		// carousel can still go and the dots say where it is, and a third
		// voice saying the same thing would read out on every step of an
		// autoplay.
		if ( 'counter' === $indicator ) {
			return sprintf(
				'<div %1$s><span class="vp-block-loop-carousel-counter-current"></span><span class="vp-block-loop-carousel-counter-separator">/</span><span class="vp-block-loop-carousel-counter-total"></span></div>',
				Visual_Portfolio_Block_Loop_Carousel_Nav::control_attributes(
					Visual_Portfolio_Block_Loop_Carousel_Nav::indicator_classes( 'vp-block-loop-carousel-indicator vp-block-loop-carousel-indicator--counter', $attributes ),
					'indicator',
					array( 'aria-hidden' => 'true' )
				)
			);
		}

		// A bar that can be dragged is a slider and not a progress bar: ARIA
		// gives `progressbar` no way to set a value, so nothing would offer a
		// visitor the arrow keys it answers to. `aria-valuenow` stays the
		// percentage it has always been, and the slide it means is spelled out
		// beside it by the module.
		//
		// Focusable without a script running is safe: every control is
		// rendered switched off, and a control that is `display: none` cannot
		// take focus.
		if ( 'progress' === $indicator ) {
			$draggable = ! isset( $attributes['isDraggable'] ) || $attributes['isDraggable'];
			$classes   = 'vp-block-loop-carousel-indicator vp-block-loop-carousel-indicator--progress';
			$extra     = array(
				'aria-label'    => __( 'Carousel position', 'visual-portfolio' ),
				'aria-valuenow' => '0',
			);

			if ( $draggable ) {
				$classes .= ' is-draggable';

				$extra['role']             = 'slider';
				$extra['tabindex']         = '0';
				$extra['aria-orientation'] = 'horizontal';
				$extra['aria-valuemin']    = '0';
				$extra['aria-valuemax']    = '100';
				/* translators: 1: slide number, 2: number of slides. */
				$extra['data-vp-position-label'] = __( 'Slide %1$d of %2$d', 'visual-portfolio' );
			} else {
				$extra['role'] = 'progressbar';
			}

			return sprintf(
				'<div %1$s><span class="vp-block-loop-carousel-progress-value"></span></div>',
				Visual_Portfolio_Block_Loop_Carousel_Nav::control_attributes(
					Visual_Portfolio_Block_Loop_Carousel_Nav::indicator_classes( $classes, $attributes ),
					'indicator',
					$extra
				)
			);
		}

		// How many dots a row shows at once. Zero shows one per slide, which
		// is a wall of them for a gallery of forty - so the row can be given a
		// window instead, and the dots slide under it as the carousel moves.
		$max_dots = max( 0, min( 15, (int) ( $attributes['maxDots'] ?? 0 ) ) );
		$extra    = array(
			/* translators: %d: slide number. */
			'data-vp-dot-label'   => __( 'Go to slide %d', 'visual-portfolio' ),
			'data-wp-interactive' => Visual_Portfolio_Block_Item_Template::VIEW_MODULE_STORE,
			'data-wp-on--click'   => 'actions.carouselGoTo',
		);

		if ( $max_dots ) {
			$extra['data-vp-max-dots'] = $max_dots;
			$extra['style']            = '--vp-carousel-dots-visible:' . $max_dots . ';';
		}

		// Rendered empty on purpose. The number of slides is the item
		// template's answer and not this block's - the two are siblings, and a
		// Load More or a filter changes the count after the page was rendered
		// anyway - so the view module is what gives the row its dots.
		return sprintf(
			'<div %1$s></div>',
			Visual_Portfolio_Block_Loop_Carousel_Nav::control_attributes(
				Visual_Portfolio_Block_Loop_Carousel_Nav::indicator_classes( 'vp-block-loop-carousel-indicator vp-block-loop-carousel-indicator--dots', $attributes ),
				'indicator',
				$extra
			)
		);
	}
}
new Visual_Portfolio_Block_Loop_Carousel_Indicator();
