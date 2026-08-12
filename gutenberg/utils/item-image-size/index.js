import { store as blockEditorStore } from '@wordpress/block-editor';
import { useSelect } from '@wordpress/data';
import { useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/**
 * Image sizes an item block can render.
 *
 * The four sizes the plugin registers itself sit beside the core ones: they are
 * the ones cut for galleries, and the smart default below picks among them.
 */
export const IMAGE_SIZE_OPTIONS = [
	{ label: __('Thumbnail', 'visual-portfolio'), value: 'thumbnail' },
	{ label: __('Medium', 'visual-portfolio'), value: 'medium' },
	{ label: __('Large', 'visual-portfolio'), value: 'large' },
	{ label: __('Small (VP)', 'visual-portfolio'), value: 'vp_sm' },
	{ label: __('Medium (VP)', 'visual-portfolio'), value: 'vp_md' },
	{ label: __('Large (VP)', 'visual-portfolio'), value: 'vp_lg' },
	{ label: __('Extra Large (VP)', 'visual-portfolio'), value: 'vp_xl' },
	{ label: __('Full Size', 'visual-portfolio'), value: 'full' },
];

/**
 * The image size a gallery of the given width wants.
 *
 * Close to the thresholds the legacy gallery has always used - extra large for
 * the widest galleries, large at four and five columns - with two changes. It
 * carries on past five, where the legacy columns control simply stopped, and
 * three columns take large rather than extra large: the chosen size also writes
 * the `sizes` hint of the responsive image, so asking for more than a column can
 * ever be is asking the browser to download more than it can show. Measured at
 * three columns, extra large cost bytes and gave nothing back.
 *
 * @param {number} columns - columns of the layout.
 *
 * @return {string} Image size slug.
 */
export function getSizeSlugForColumns(columns) {
	const count = parseInt(columns, 10) || 3;

	if (count <= 2) {
		return 'vp_xl';
	}

	if (count <= 5) {
		return 'vp_lg';
	}

	return 'vp_md';
}

/**
 * Give a freshly inserted image block the size its gallery wants.
 *
 * A default rather than a rule: it is written into the attribute once, when the
 * block appears, and the user owns it from then on. Resolving it at render time
 * instead would take the setting away from them - and would keep changing the
 * markup of a post nobody edited.
 *
 * @param {string}   clientId      - client id of the block.
 * @param {number}   columns       - columns of the surrounding layout.
 * @param {Function} setAttributes - attribute setter of the block.
 */
export function useImageSizeOnInsert(clientId, columns, setAttributes) {
	const justInserted = useSelect(
		(select) => {
			const { getBlockParents, wasBlockJustInserted } =
				select(blockEditorStore);

			// Two sources for one question: blocks arrive from the inserter one
			// at a time, and from a pattern in a batch that carries no source.
			const wasJustInserted = (id) =>
				wasBlockJustInserted(id, 'inserter') ||
				wasBlockJustInserted(id);

			// An image inside a pattern was never inserted on its own - only
			// the block at the top of the pattern is on the list, so the
			// question is asked of every block this one arrived inside.
			return [clientId, ...getBlockParents(clientId)].some(
				wasJustInserted
			);
		},
		[clientId]
	);

	useEffect(() => {
		if (!justInserted) {
			return;
		}

		setAttributes({ sizeSlug: getSizeSlugForColumns(columns) });
		// Insertion is the moment this runs, and nothing about it repeats.
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);
}
