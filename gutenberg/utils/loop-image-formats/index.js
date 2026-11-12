import { applyFilters } from '@wordpress/hooks';
import { __ } from '@wordpress/i18n';

const FORMAT_OPTIONS = [
	{ value: 'standard', label: __('Standard', 'visual-portfolio') },
	{ value: 'video', label: __('Video', 'visual-portfolio') },
];

/**
 * The formats an image of a Gallery Loop can be given.
 *
 * Pro adds its formats through this filter, and the fields of a format through
 * the `VP.LoopImageSettings` slot. A saved format the list lacks stays on the
 * image until another one is picked.
 *
 * @return {Array} formats, as `{ value, label }`.
 */
export function getLoopImageFormats() {
	return applyFilters('vpf.loopImageFormats', FORMAT_OPTIONS);
}
