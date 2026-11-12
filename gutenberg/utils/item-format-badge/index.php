<?php
/**
 * Badge naming the format of a gallery item.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * The badge of an item that is not a still picture.
 *
 * The icons are the ones the legacy gallery shows over an item. A standard or
 * image item gets none: the picture already says what it is.
 *
 * @param string $format   - item format.
 * @param string $position - corner of the picture, as `top-right`.
 * @param array  $formats  - formats that get a badge, every one when empty.
 *
 * @return string
 */
function visual_portfolio_get_item_format_badge( $format, $position, $formats = array() ) {
	$badges = array(
		'video'   => array( 'icons/play', __( 'Video', 'visual-portfolio' ) ),
		'audio'   => array( 'icons/music', __( 'Audio', 'visual-portfolio' ) ),
		'gallery' => array( 'icons/gallery', __( 'Gallery', 'visual-portfolio' ) ),
	);

	if ( ! isset( $badges[ $format ] ) ) {
		return '';
	}

	$formats = array_intersect( array_filter( (array) $formats, 'is_string' ), array_keys( $badges ) );

	if ( ! empty( $formats ) && ! in_array( $format, $formats, true ) ) {
		return '';
	}

	$positions = array( 'top-left', 'top-right', 'bottom-left', 'bottom-right' );
	$position  = in_array( $position, $positions, true ) ? $position : 'top-right';

	ob_start();
	visual_portfolio()->include_template( $badges[ $format ][0] );
	$icon = ob_get_clean();

	return sprintf(
		'<span class="vp-item-format-badge is-position-%1$s" role="img" aria-label="%2$s">%3$s</span>',
		esc_attr( $position ),
		esc_attr( $badges[ $format ][1] ),
		$icon
	);
}
