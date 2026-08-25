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
 * becomes the variable the theme declared it under. The axial form is the one
 * `__experimentalGetGapCSSValue()` produces on the editor side.
 *
 * @param mixed $gap - `style.spacing.blockGap` of a block.
 *
 * @return string CSS length, or an empty string when the theme decides.
 */
function visual_portfolio_get_block_gap( $gap ) {
	$gap = wp_sanitize_block_gap_value( $gap );

	// Two axes, and the shorthand takes the row gap before the column gap.
	if ( is_array( $gap ) ) {
		$row    = visual_portfolio_get_block_gap( $gap['top'] ?? '' );
		$column = visual_portfolio_get_block_gap( $gap['left'] ?? '' );

		if ( '' === $row || '' === $column ) {
			return '' === $row ? $column : $row;
		}

		return $row === $column ? $row : $row . ' ' . $column;
	}

	if ( ! is_string( $gap ) || '' === $gap ) {
		return '';
	}

	// `var:preset|spacing|50` is how a preset travels in block attributes.
	if ( str_contains( $gap, 'var:preset|spacing|' ) ) {
		$slug = _wp_to_kebab_case( substr( $gap, strrpos( $gap, '|' ) + 1 ) );

		return '' === $slug ? '' : 'var(--wp--preset--spacing--' . $slug . ')';
	}

	return $gap;
}
