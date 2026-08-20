/**
 * WordPress dependencies
 */
import { useEffect, useRef } from '@wordpress/element';

/**
 * Internal dependencies
 */
import { syncAutoColumns } from './auto-columns';
import { layoutJustified, layoutMasonry, startLayout } from './layouts';

/**
 * Keep the editor preview laid out.
 *
 * The layouts themselves are shared with the page - see `layouts.js`. What this
 * adds is the React side of running them: the ref that goes on the list, and the
 * dependencies that place the items again when a control changes.
 *
 * @param {Object} settings            - layout settings.
 * @param {string} settings.layoutType - resolved layout.
 * @param {Object} settings.justified  - justified settings of the block.
 * @param {number} settings.itemsCount - number of items in the preview.
 * @param {string} settings.signature  - anything else the layout is measured from.
 * @return {Object} ref for the list element.
 */
export default function useEditorLayout({
	layoutType,
	justified,
	itemsCount,
	signature,
}) {
	const ref = useRef();

	// Read inside the effect rather than listed as a dependency: the object is
	// rebuilt on every render, and `signature` already says when it changed.
	const justifiedRef = useRef(justified);
	justifiedRef.current = justified;

	useEffect(() => {
		const list = ref.current;

		if (!list || !itemsCount) {
			return undefined;
		}

		if ('masonry' === layoutType) {
			return startLayout(list, layoutMasonry);
		}

		if ('justified' === layoutType) {
			return startLayout(list, (element) =>
				layoutJustified(element, justifiedRef.current)
			);
		}

		// The carousel is drawn by the stylesheet, but its slide width is a
		// `calc()` over the column count - which auto mode has to work out.
		return syncAutoColumns(list);
	}, [layoutType, itemsCount, signature]);

	return ref;
}
