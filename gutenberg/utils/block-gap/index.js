/**
 * Block spacing of a gallery block, as a CSS length.
 *
 * A mirror of `visual_portfolio_get_block_gap()`, which stays the source of
 * truth for what a page renders. Core's own `getGapCSSValue()` answers with the
 * two-value `row column` shorthand, and these layouts work their track widths
 * out inside `calc()`, where a shorthand is not a length. One axis is all the
 * blocks declare, so one length is all this has to produce.
 *
 * @param {string|Object} gap - `style.spacing.blockGap` of a block.
 *
 * @return {string} CSS length, or an empty string when the theme decides.
 */
export default function getBlockGapValue(gap) {
	// Two axes, and either one of them is the gap when the other is unset.
	if (gap && 'object' === typeof gap) {
		const row = getBlockGapValue(gap.top);
		const column = getBlockGapValue(gap.left);

		if ('' === row || '' === column) {
			return '' === row ? column : row;
		}

		return row === column ? row : `${row} ${column}`;
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
