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
 * One length per axis. The layouts work their track widths out inside `calc()`,
 * where a two-value shorthand is not a length, so each axis is asked for on its
 * own: `left` is the gap between columns, `top` the gap between rows. A plain
 * string is the value of both.
 *
 * @param mixed  $gap  - `style.spacing.blockGap` of a block.
 * @param string $axis - `left` or `top`.
 *
 * @return string CSS length, or an empty string when the theme decides.
 */
function visual_portfolio_get_block_gap( $gap, $axis = 'left' ) {
	$gap = wp_sanitize_block_gap_value( $gap );

	if ( is_array( $gap ) ) {
		return visual_portfolio_get_block_gap( $gap[ $axis ] ?? '' );
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

/**
 * Block spacing a block was given for the narrower screens, as CSS lengths.
 *
 * With Responsive editing on, the editor keeps a screen's styles under
 * `style['@tablet']` and `style['@mobile']`. Core prints a screen's block gap
 * through the layout support alone, which these blocks do not have, so it is
 * read here the way the base value is.
 *
 * An axis the screen leaves unset keeps the base value. The other screen's
 * value never applies: the editor's screens are ranges, not steps.
 *
 * @param mixed $style - `style` attribute of a block.
 *
 * @return array Screen name to `[ 'left' => length, 'top' => length ]`, for
 *               the screens that have a gap of their own. A length is empty
 *               where the theme decides.
 */
function visual_portfolio_get_screen_block_gaps( $style ) {
	$gaps = array();

	if ( ! is_array( $style ) ) {
		return $gaps;
	}

	$base = $style['spacing']['blockGap'] ?? '';

	foreach ( array( 'tablet', 'mobile' ) as $screen ) {
		$gap = $style[ '@' . $screen ]['spacing']['blockGap'] ?? null;

		if ( null === $gap || '' === $gap || array() === $gap ) {
			continue;
		}

		foreach ( array( 'left', 'top' ) as $axis ) {
			$gaps[ $screen ][ $axis ] = is_array( $gap ) && ! isset( $gap[ $axis ] )
				? visual_portfolio_get_block_gap( $base, $axis )
				: visual_portfolio_get_block_gap( $gap, $axis );
		}
	}

	return $gaps;
}
