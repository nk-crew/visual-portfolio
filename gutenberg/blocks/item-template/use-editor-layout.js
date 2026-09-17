/**
 * WordPress dependencies
 */
import { useEffect, useRef } from '@wordpress/element';
import { applyFilters } from '@wordpress/hooks';

/**
 * Internal dependencies
 */
import { syncColumns } from './auto-columns';
import { layoutJustified, layoutMasonry, startLayout } from './layouts';

const noop = () => {};

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
		// `calc()` over the column count, and both the container and the
		// breakpoints can move it. An effect is drawn from timelines the
		// browser may not have; Pro keeps them by hand there, on the page and
		// in this preview alike, and answers the filter with what runs them.
		const stopColumns = syncColumns(list);
		const stopEffects =
			applyFilters('vpf.itemTemplateEffectDriver', () => noop)(list) ||
			noop;

		return () => {
			stopEffects();
			stopColumns();
		};
	}, [layoutType, itemsCount, signature]);

	return ref;
}
