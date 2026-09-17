<?php
/**
 * Block spacing of a gallery block, as a CSS length.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

/**
 * Block spacing, as a CSS length.
 *
 * Core prints no CSS for `blockGap` on a block without layout support, which is
 * what lets these blocks put the value on a custom property of their own. This
 * is the conversion core's layout support performs, in one place: the unsafe
 * characters are the ones `wp_sanitize_block_gap_value()` refuses, and a preset
 * becomes the variable the theme declared it under.
 *
 * One length, whatever shape the value is in. The blocks declare one axis of
 * gap, and the editor's control writes that axis as `left` - beside a `top`
 * it carries over from a value that was once a plain string. The layouts
 * work their track widths out inside `calc()`, where a two-value shorthand is
 * not a length, so the axis the control edits is the one that is read.
 *
 * @param mixed $gap - `style.spacing.blockGap` of a block.
 *
 * @return string CSS length, or an empty string when the theme decides.
 */
function visual_portfolio_get_block_gap( $gap ) {
	$gap = wp_sanitize_block_gap_value( $gap );

	if ( is_array( $gap ) ) {
		return visual_portfolio_get_block_gap( $gap['left'] ?? $gap['top'] ?? '' );
	}

	if ( ! is_string( $gap ) || '' === $gap ) {
		return '';
	}

	// None is a bare zero, and a bare zero is a number: inside a `calc()` a
	// number cannot be taken from a length, so every slide width the layouts
	// work out from the gap came out invalid. A zero with a unit is a length.
	if ( preg_match( '/^0(\.0+)?$/', $gap ) ) {
		return '0px';
	}

	// `var:preset|spacing|50` is how a preset travels in block attributes.
	if ( str_contains( $gap, 'var:preset|spacing|' ) ) {
		$slug = _wp_to_kebab_case( substr( $gap, strrpos( $gap, '|' ) + 1 ) );

		return '' === $slug ? '' : 'var(--wp--preset--spacing--' . $slug . ')';
	}

	return $gap;
}
