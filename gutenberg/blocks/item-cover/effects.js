/**
 * WordPress dependencies
 */
import { applyFilters } from '@wordpress/hooks';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { getProLabel } from '../../components/pro-teaser';

const EFFECT_OPTIONS = [
	{ label: __('None', 'visual-portfolio'), value: 'none' },
	{ label: __('Fade', 'visual-portfolio'), value: 'fade' },
	{ label: __('Fly', 'visual-portfolio'), value: 'fly' },
	{ label: __('Emerge', 'visual-portfolio'), value: 'emerge' },
];

// The effects Pro adds, named here so that a cover saved with one keeps it in
// an install without Pro, and so that the list can say what there is.
const PRO_EFFECTS = [
	{ label: __('Caption move', 'visual-portfolio'), value: 'caption-move' },
];

// The picture settings Pro adds to both the item image and the item cover,
// for an install without them.
export const IMAGE_EFFECT_TEASERS = [
	{
		name: 'imageFilter',
		label: __('Image filter', 'visual-portfolio'),
		line: __(
			'Brightness, contrast, saturation and more, at rest and on hover.',
			'visual-portfolio'
		),
		campaign: 'teaser_image_filter',
	},
	{
		name: 'hoverTransform',
		label: __('Hover transform', 'visual-portfolio'),
		line: __(
			'Zoom or shift the picture while the pointer is over it.',
			'visual-portfolio'
		),
		campaign: 'teaser_hover_transform',
	},
	{
		name: 'blendMode',
		label: __('Blend mode', 'visual-portfolio'),
		line: __(
			'Blend the overlay into the picture instead of laying it over.',
			'visual-portfolio'
		),
		campaign: 'teaser_blend_mode',
	},
	{
		name: 'tilt',
		label: __('Tilt', 'visual-portfolio'),
		line: __(
			'Tilt the picture in 3D under the pointer.',
			'visual-portfolio'
		),
		campaign: 'teaser_tilt',
	},
];

/**
 * The effects this install offers a cover.
 *
 * An effect is a class on the cover, `vp-effect-` and its name, so Pro and a
 * theme add one through this filter and `vpf_item_cover_effects` on the
 * server, and a stylesheet.
 *
 * @return {Array} select options.
 */
export function getEffectOptions() {
	return applyFilters('vpf.itemCoverEffects', EFFECT_OPTIONS);
}

/**
 * The options of the Effect list: the effects this install offers, then a
 * disabled one for each Pro effect it lacks.
 *
 * @return {Array} select options.
 */
export function getEffectSelectOptions() {
	const options = getEffectOptions();

	return [
		...options,
		...PRO_EFFECTS.filter(
			({ value }) => !options.some((option) => option.value === value)
		).map(({ label, value }) => ({
			label: getProLabel(label),
			value,
			disabled: true,
		})),
	];
}

/**
 * The effect a cover is drawn with. A Pro effect saved without Pro is a fade,
 * the way the page draws it.
 *
 * @param {string} effect - selected effect.
 *
 * @return {string} effect name.
 */
export function getDrawnEffect(effect) {
	return getEffectOptions().some((option) => option.value === effect)
		? effect
		: 'fade';
}
