<?php
/**
 * Block Carousel Play and Pause.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Visual Portfolio Carousel Play and Pause block.
 */
class Visual_Portfolio_Block_Loop_Carousel_Autoplay {
	/**
	 * The class the module puts on a carousel a visitor has stopped.
	 */
	const STOPPED_CLASS = 'is-stopped';

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
			visual_portfolio()->plugin_path . 'gutenberg/blocks/loop-carousel-autoplay',
			array(
				'render_callback' => array( $this, 'block_render' ),
			)
		);
	}

	/**
	 * The classes the button carries for its settings.
	 *
	 * @param array $attributes - block attributes.
	 *
	 * @return string
	 */
	public static function button_classes( $attributes ) {
		$classes = array( 'vp-block-loop-carousel-autoplay' );

		if ( 'play-stop' === ( $attributes['icon'] ?? 'play-pause' ) ) {
			$classes[] = 'has-stop-icon';
		}

		if ( ! empty( $attributes['showOnHover'] ) ) {
			$classes[] = Visual_Portfolio_Block_Loop_Carousel_Nav::SHOW_ON_HOVER_CLASS;
		}

		return implode( ' ', $classes );
	}

	/**
	 * Block output
	 *
	 * @param array $attributes - block attributes.
	 *
	 * @return string
	 */
	public function block_render( $attributes ) {
		// Both names travel on the markup rather than reaching the module
		// through a translation of its own, the way the label of a dot does.
		//
		// Rendered as though the carousel were running, because it is: a page
		// whose module never loaded leaves the button switched off, and a
		// carousel with no autoplay never wakes it at all.
		return sprintf(
			'<button type="button" %1$s><span aria-hidden="true"></span></button>',
			Visual_Portfolio_Block_Loop_Carousel_Nav::control_attributes(
				self::button_classes( $attributes ),
				'autoplay',
				array(
					'aria-label'           => __( 'Stop the carousel', 'visual-portfolio' ),
					'data-vp-play-label'   => __( 'Start the carousel', 'visual-portfolio' ),
					'data-vp-pause-label'  => __( 'Stop the carousel', 'visual-portfolio' ),
					'data-wp-interactive'  => Visual_Portfolio_Block_Item_Template::VIEW_MODULE_STORE,
					'data-wp-on--click'    => 'actions.carouselAutoplayToggle',
				)
			)
		);
	}
}
new Visual_Portfolio_Block_Loop_Carousel_Autoplay();
