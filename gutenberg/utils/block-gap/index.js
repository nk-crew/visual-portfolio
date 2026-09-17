/**
 * Block spacing of a gallery block, as a CSS length.
 *
 * A mirror of `visual_portfolio_get_block_gap()`, which stays the source of
 * truth for what a page renders. Core's own `getGapCSSValue()` answers with the
 * two-value `row column` shorthand, and these layouts work their track widths
 * out inside `calc()`, where a shorthand is not a length. One axis is all the
 * blocks declare, and the control writes it as `left` - beside a `top` it
 * carries over from a value that was once a plain string - so that axis is
 * the one that is read.
 *
 * @param {string|Object} gap - `style.spacing.blockGap` of a block.
 *
 * @return {string} CSS length, or an empty string when the theme decides.
 */
export default function getBlockGapValue(gap) {
	if (gap && 'object' === typeof gap) {
		return getBlockGapValue(gap.left ?? gap.top);
	}

	if ('string' !== typeof gap || '' === gap) {
		return '';
	}

	// None is a bare zero, and a bare zero is a number: inside a `calc()` a
	// number cannot be taken from a length, so every slide width the layouts
	// work out from the gap came out invalid. A zero with a unit is a length.
	if (/^0(\.0+)?$/.test(gap)) {
		return '0px';
	}

	// `var:preset|spacing|50` is how a preset travels in block attributes.
	if (gap.includes('var:preset|spacing|')) {
		const slug = gap.slice(gap.lastIndexOf('|') + 1);

		return slug ? `var(--wp--preset--spacing--${slug})` : '';
	}

	return gap;
}
