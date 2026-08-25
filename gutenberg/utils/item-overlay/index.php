<?php
/**
 * Overlay painted on the picture of a gallery item.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * One overlay above the picture.
 *
 * The class names are the ones core uses for the same job, so a theme that
 * styles cover overlays styles these too. The hover overlay carries its opacity
 * as a custom property instead: it is the value the stylesheet animates to, and
 * a class cannot be read back at hover time.
 *
 * @param string $class_name - overlay class of the block that owns it.
 * @param array  $overlay    - `dimRatio`, `color`, `customColor`, `gradient`, `customGradient`.
 * @param bool   $is_hover   - whether this is the overlay of the hover state.
 *
 * @return string
 */
function visual_portfolio_get_item_overlay( $class_name, $overlay, $is_hover = false ) {
	$dim_ratio      = (int) ( $overlay['dimRatio'] ?? 0 );
	$color          = $overlay['color'] ?? '';
	$custom_color   = $overlay['customColor'] ?? '';
	$gradient       = $overlay['gradient'] ?? '';
	$custom_grad    = $overlay['customGradient'] ?? '';
	$has_background = $color || $custom_color || $gradient || $custom_grad;

	if ( $dim_ratio <= 0 || ! $has_background ) {
		return '';
	}

	$classes = array( $class_name );
	$styles  = array();

	if ( $is_hover ) {
		$classes[] = $class_name . '--hover';
		$styles[]  = '--vp-hover-overlay-opacity:' . round( $dim_ratio / 100, 2 );
	} else {
		$classes[] = 'has-background-dim';
		$classes[] = 'has-background-dim-' . $dim_ratio;
	}

	if ( $gradient || $custom_grad ) {
		$classes[] = 'has-background-gradient';

		if ( $gradient ) {
			$classes[] = 'has-' . $gradient . '-gradient-background';
		} else {
			$styles[] = 'background:' . $custom_grad;
		}
	} elseif ( $color ) {
		$classes[] = 'has-' . $color . '-background-color';
	} else {
		$styles[] = 'background-color:' . $custom_color;
	}

	return sprintf(
		'<span class="%1$s"%2$s aria-hidden="true"></span>',
		esc_attr( implode( ' ', $classes ) ),
		empty( $styles ) ? '' : ' style="' . esc_attr( implode( ';', $styles ) ) . '"'
	);
}
