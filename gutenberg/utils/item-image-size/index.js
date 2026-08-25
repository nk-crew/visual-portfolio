import { store as blockEditorStore } from '@wordpress/block-editor';
import { useSelect } from '@wordpress/data';
import { useEffect, useMemo } from '@wordpress/element';

/**
 * Image sizes an item block can render.
 *
 * The editor is handed the list `image_size_names_choose` produced, so a size a
 * theme or another plugin registers is offered here as well. The four sizes cut
 * for galleries are this plugin's own additions to that filter, and the smart
 * default below picks among them.
 *
 * @return {Array} `{ label, value }` options.
 */
export function useImageSizeOptions() {
	const imageSizes = useSelect(
		(select) => select(blockEditorStore).getSettings().imageSizes,
		[]
	);

	return useMemo(() => {
		const options = (imageSizes || []).map(({ slug, name }) => ({
			label: name,
			value: slug,
		}));

		// The one entry that is not a cut size, so it belongs at the end of the
		// scale rather than in the middle of it, where the filter leaves it.
		return [
			...options.filter(({ value }) => 'full' !== value),
			...options.filter(({ value }) => 'full' === value),
		];
	}, [imageSizes]);
}

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
