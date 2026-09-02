<?php
/**
 * Block Carousel Navigation.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Visual Portfolio Carousel Navigation block.
 *
 * The row the controls of a carousel are usually assembled in, and the shared
 * half of all four of them: the stylesheet they are drawn with, the class they
 * wait behind and the wrapper attributes they are rendered with.
 */
class Visual_Portfolio_Block_Loop_Carousel_Nav {
	/**
	 * Handle of the stylesheet the four control blocks share.
	 *
	 * One stylesheet rather than one per block: they are a single control
	 * surface, split into blocks so a gallery can place its arrows and its
	 * indicator apart from one another.
	 */
	const STYLE = 'visual-portfolio-block-loop-carousel';

	/**
	 * Class a control carries until a carousel is running underneath it.
	 *
	 * Every control moves the scroll container through the scroll API, and there
	 * is nothing to fall back to when that API has nobody calling it - so the
	 * server renders them switched off, and the view module takes the class away
	 * from the controls of the carousel it just started. A control that ended up
	 * beside a grid keeps it and stays out of the way.
	 */
	const IDLE_CLASS = 'vp-carousel-control-idle';

	/**
	 * Class a control over the slides fades behind until the pointer rests on
	 * the carousel.
	 *
	 * Does nothing to a control that is not over the slides, and nothing on a
	 * screen without a pointer to rest: the stylesheet asks both questions.
	 */
	const SHOW_ON_HOVER_CLASS = 'is-shown-on-hover';

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
		Visual_Portfolio_Assets::register_style( self::STYLE, 'build/gutenberg/blocks/loop-carousel-nav/style' );
		wp_style_add_data( self::STYLE, 'rtl', 'replace' );

		Visual_Portfolio_Assets::register_style( self::STYLE . '-editor', 'build/gutenberg/blocks/loop-carousel-nav/editor' );
		wp_style_add_data( self::STYLE . '-editor', 'rtl', 'replace' );

		register_block_type_from_metadata(
			visual_portfolio()->plugin_path . 'gutenberg/blocks/loop-carousel-nav',
			array(
				'render_callback' => array( $this, 'block_render' ),
			)
		);
	}

	/**
	 * Whether a control was switched off.
	 *
	 * A carousel control cannot be deleted - `lock.remove` is the default of
	 * every one of them - so this is how one is taken off a page, and the block
	 * stays in the editor where it can be switched back on.
	 *
	 * @param array $attributes - block attributes.
	 *
	 * @return bool
	 */
	public static function is_hidden( $attributes ) {
		return ! empty( $attributes['isHidden'] );
	}

	/**
	 * The classes an arrow carries for its settings.
	 *
	 * The defaults - a chevron in an outlined button - carry no class: they
	 * are what the stylesheet draws unless told otherwise.
	 *
	 * @param string $class_name - class the front end knows the arrow by.
	 * @param array  $attributes - block attributes.
	 *
	 * @return string
	 */
	public static function arrow_classes( $class_name, $attributes ) {
		$classes = array( $class_name );

		if ( 'arrow' === ( $attributes['icon'] ?? 'chevron' ) ) {
			$classes[] = 'has-arrow-icon';
		}

		$appearance = $attributes['appearance'] ?? 'outlined';

		if ( in_array( $appearance, array( 'filled', 'plain' ), true ) ) {
			$classes[] = 'is-' . $appearance;
		}

		if ( ! empty( $attributes['showOnHover'] ) ) {
			$classes[] = self::SHOW_ON_HOVER_CLASS;
		}

		return implode( ' ', $classes );
	}

	/**
	 * The classes an indicator carries for its settings.
	 *
	 * Filled is the default and carries no class.
	 *
	 * @param string $class_name - classes the front end knows the indicator by.
	 * @param array  $attributes - block attributes.
	 *
	 * @return string
	 */
	public static function indicator_classes( $class_name, $attributes ) {
		$classes    = array( $class_name );
		$appearance = $attributes['appearance'] ?? 'filled';

		if ( in_array( $appearance, array( 'outlined', 'plain' ), true ) ) {
			$classes[] = 'is-' . $appearance;
		}

		if ( ! empty( $attributes['showOnHover'] ) ) {
			$classes[] = self::SHOW_ON_HOVER_CLASS;
		}

		return implode( ' ', $classes );
	}

	/**
	 * Wrapper attributes a carousel control is rendered with.
	 *
	 * @param string $class_name - class the front end knows the control by.
	 * @param string $control    - what the control is, for the module to find it by.
	 * @param array  $extra      - attributes of this control alone.
	 *
	 * @return string
	 */
	public static function control_attributes( $class_name, $control, $extra = array() ) {
		return get_block_wrapper_attributes(
			array_merge(
				array(
					// `get_block_wrapper_attributes()` escapes the values itself.
					'class'                    => $class_name . ' ' . self::IDLE_CLASS,
					'data-vp-carousel-control' => $control,
				),
				$extra
			)
		);
	}

	/**
	 * Block output
	 *
	 * @param array  $attributes - block attributes.
	 * @param string $content - block content.
	 *
	 * @return string
	 */
	public function block_render( $attributes, $content ) {
		// A row whose every control was switched off still draws the gap the
		// layout puts between them, and a margin of its own.
		if ( self::is_hidden( $attributes ) || '' === trim( $content ) ) {
			return '';
		}

		$classes = array( 'vp-block-loop-carousel-nav' );

		if ( ! empty( $attributes['showOnHover'] ) ) {
			$classes[] = self::SHOW_ON_HOVER_CLASS;
		}

		return sprintf(
			'<div %1$s>%2$s</div>',
			self::control_attributes( implode( ' ', $classes ), 'nav' ),
			$content
		);
	}
}
new Visual_Portfolio_Block_Loop_Carousel_Nav();
