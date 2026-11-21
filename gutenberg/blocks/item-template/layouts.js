/**
 * External dependencies
 */
import { createJustifiedGallery, createMasonry } from '@reuse-sh/gallery';

/**
 * The layouts a stylesheet cannot finish alone, on the page and in the editor.
 *
 * Justified rows and masonry lanes are `@reuse-sh/gallery`'s. It takes its
 * window from the list's own document, so it runs unchanged inside the editor
 * canvas, which is an iframe the editor bundle sits outside of. What is here is
 * the block's side of it: its settings, in the library's words.
 */

/**
 * Where a last row that is not full sits, in the library's words.
 *
 * The setting names sides of the screen, and a right-to-left gallery still
 * means them: left is left there too.
 *
 * @param {HTMLElement} list    - item template list.
 * @param {string}      lastRow - left, center, right, justify or hide.
 * @return {string} start, center, end, justify or hide.
 */
function getLastRow(list, lastRow) {
	const view = list.ownerDocument.defaultView || window;
	const rtl = 'rtl' === view.getComputedStyle(list).direction;

	switch (lastRow) {
		case 'center':
		case 'justify':
		case 'hide':
			return lastRow;
		case 'right':
			return rtl ? 'start' : 'end';
		default:
			return rtl ? 'end' : 'start';
	}
}

/**
 * Lay a justified list out, and keep it laid out.
 *
 * @param {HTMLElement} list     - item template list.
 * @param {Object}      settings - justified settings of the block.
 * @return {Function} teardown.
 */
export function startJustified(list, settings) {
	const gallery = createJustifiedGallery(list, {
		tolerance: Math.max(0, Number(settings.rowHeightTolerance) || 0),
		maxRows: Math.max(0, Math.floor(Number(settings.maxRowsCount) || 0)),
		lastRow: getLastRow(list, settings.lastRow),
	});

	return () => gallery.destroy();
}

/**
 * Lay a masonry list out where the browser does not, and keep it laid out.
 *
 * @param {HTMLElement} list - item template list.
 * @return {Function} teardown.
 */
export function startMasonry(list) {
	const masonry = createMasonry(list);

	return () => masonry.destroy();
}

/**
 * Justified settings, as the markup carries them.
 *
 * @param {HTMLElement} list - item template list.
 * @return {Object} justified settings.
 */
export function getJustifiedOptions(list) {
	const data = list.dataset;

	return {
		rowHeightTolerance: parseFloat(data.vpJustifiedTolerance) || 0,
		maxRowsCount: parseInt(data.vpJustifiedMaxRows, 10) || 0,
		lastRow: data.vpJustifiedLastRow || 'left',
	};
}
