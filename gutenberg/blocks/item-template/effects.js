/**
 * WordPress dependencies
 */
import { applyFilters } from '@wordpress/hooks';
import { __ } from '@wordpress/i18n';

// `columns: false` says the effect spreads one slide over the width of the
// gallery and owns that width, so the columns control is not offered beside it.
// `peek: false` says it lays the slides out itself, so no edge is left for the
// next one to show at.
const EFFECT_OPTIONS = [
	{ label: __('None', 'visual-portfolio'), value: 'none' },
	{
		label: __('Coverflow', 'visual-portfolio'),
		value: 'coverflow',
		peek: false,
	},
	{
		label: __('Slideshow', 'visual-portfolio'),
		value: 'slideshow',
		columns: false,
	},
	{
		label: __('Fade', 'visual-portfolio'),
		value: 'fade',
		columns: false,
		peek: false,
	},
];

/**
 * The effects this install offers.
 *
 * An effect is a stylesheet over two boxes the item template already renders,
 * so Pro and a theme add one through this filter and `vpf_carousel_effects` on
 * the server, and write no markup at all.
 *
 * @return {Array} select options.
 */
export function getEffectOptions() {
	return applyFilters('vpf.carouselEffects', EFFECT_OPTIONS);
}

/**
 * Whether an effect leaves the column count to the gallery.
 *
 * @param {string} effect - selected effect.
 *
 * @return {boolean} True when the columns control is worth offering.
 */
export function effectTakesColumns(effect) {
	const option = getEffectOptions().find((item) => item.value === effect);

	return !option || false !== option.columns;
}

/**
 * Whether an effect can be run round in a loop.
 *
 * The loop moves the slides one end has run out of to the other, and an
 * effect that pins its slides in place - a deck - has nothing to move, so the
 * server leaves the loop out of it. `repeat: false` on the option says so.
 *
 * @param {string} effect - selected effect.
 *
 * @return {boolean} True when the repeat control does something.
 */
export function effectRepeats(effect) {
	const option = getEffectOptions().find((item) => item.value === effect);

	return !option || false !== option.repeat;
}

/**
 * Whether an effect leaves room for a slide of the next one at the edge.
 *
 * @param {string} effect - selected effect.
 *
 * @return {boolean} True when the peek control does something.
 */
export function effectPeeks(effect) {
	const option = getEffectOptions().find((item) => item.value === effect);

	return !option || false !== option.peek;
}
