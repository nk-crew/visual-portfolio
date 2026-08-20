/**
 * WordPress dependencies
 */
import { useEffect, useRef } from '@wordpress/element';

/**
 * The layouts of the editor preview that a stylesheet cannot draw.
 *
 * Justified and masonry are measured layouts: without measuring, the canvas
 * showed rows that grew on their own and a single masonry column, neither of
 * which is what the page renders.
 *
 * The measuring is done here rather than by the libraries the front end uses.
 * The canvas is an iframe, and both libraries are loaded in the frame around
 * it: Masonry drops every element it is given, because `fizzy-ui-utils` filters
 * items with `elem instanceof HTMLElement` and an element of another document
 * fails that test, and fjGallery leaves the list untouched as well. What they
 * do is small enough to state directly, and stating it is what makes the
 * preview independent of which document the editor puts the canvas in.
 *
 * Grid, tiles and carousel are stylesheet alone on both sides and never come
 * through here.
 */

const ITEM_SELECTOR = '.wp-block-visual-portfolio-item-template__item';
const IMAGE_SELECTOR = '.wp-block-visual-portfolio-item-image';

/**
 * The items a layout places.
 *
 * The template keeps one hidden copy of the selected item - the editable one
 * stands in for it - and a hidden item has no place in a measured layout.
 *
 * @param {HTMLElement} list - item template list.
 * @return {Array} item elements.
 */
function getItems(list) {
	const view = list.ownerDocument.defaultView || window;

	return Array.from(list.querySelectorAll(ITEM_SELECTOR)).filter(
		(item) => 'none' !== view.getComputedStyle(item).display
	);
}

/**
 * Numbers a layout is measured against, as CSS resolved them.
 *
 * Read back rather than passed in, so block spacing, the column controls and a
 * theme override all reach the layout through the one place they are declared.
 *
 * @param {HTMLElement} list - item template list.
 * @return {{gap: number, columns: number, rowHeight: number, width: number}} metrics.
 */
function getMetrics(list) {
	const view = list.ownerDocument.defaultView || window;
	const styles = view.getComputedStyle(list);
	const width = list.clientWidth;
	const gap = styles.columnGap.endsWith('%')
		? (parseFloat(styles.columnGap) / 100) * width
		: parseFloat(styles.columnGap);

	return {
		width,
		gap: gap || 0,
		columns: Math.max(
			1,
			parseInt(
				styles.getPropertyValue('--vp-layout-current-columns'),
				10
			) || 1
		),
		rowHeight:
			parseFloat(styles.getPropertyValue('--vp-layout-row-height')) ||
			320,
	};
}

/**
 * Take the placement of an item back off it.
 *
 * @param {HTMLElement} item - item element.
 */
function resetItem(item) {
	item.style.position = '';
	item.style.left = '';
	item.style.top = '';
	item.style.width = '';
	item.style.height = '';

	const image = item.querySelector(IMAGE_SELECTOR);

	if (image) {
		image.style.height = '';
	}
}

/**
 * Pack the items into the shortest column, the way masonry does.
 *
 * @param {HTMLElement} list - item template list.
 */
function layoutMasonry(list) {
	const { width, gap, columns } = getMetrics(list);
	const items = getItems(list);

	if (!items.length || !width) {
		return;
	}

	const itemWidth = (width - gap * (columns - 1)) / columns;
	const heights = new Array(columns).fill(0);

	items.forEach((item) => {
		// Width first: how tall an item is depends on how wide it is.
		item.style.position = 'absolute';
		item.style.width = `${itemWidth}px`;

		const shortest = heights.indexOf(Math.min(...heights));

		item.style.left = `${shortest * (itemWidth + gap)}px`;
		item.style.top = `${heights[shortest]}px`;

		heights[shortest] += item.offsetHeight + gap;
	});

	list.style.height = `${Math.max(...heights) - gap}px`;
}

/**
 * Proportions of an item, as the picture inside it has them.
 *
 * @param {HTMLElement} item - item element.
 * @return {number} width divided by height.
 */
function getItemRatio(item) {
	const image = item.querySelector('img');

	if (image?.naturalWidth && image?.naturalHeight) {
		return image.naturalWidth / image.naturalHeight;
	}

	// A picture that has not arrived yet, or an item drawn without one. A
	// square keeps it in the row until the `load` listener measures it again.
	return 1;
}

/**
 * Fit the items into rows of an even height, the way justified does.
 *
 * @param {HTMLElement} list    - item template list.
 * @param {Object}      options - justified settings of the block.
 */
function layoutJustified(list, options) {
	const { width, gap, rowHeight } = getMetrics(list);
	const items = getItems(list);

	if (!items.length || !width) {
		return;
	}

	const ratios = items.map(getItemRatio);
	const rows = [];

	let row = [];
	let ratioSum = 0;

	items.forEach((item, index) => {
		row.push(index);
		ratioSum += ratios[index];

		// The height this row would settle at if it were closed here. Once it
		// is no taller than asked for, the row is full.
		const height = (width - gap * (row.length - 1)) / ratioSum;

		if (height <= rowHeight) {
			rows.push({ items: row, height, isFull: true });
			row = [];
			ratioSum = 0;
		}
	});

	if (row.length) {
		// The last row never fills the width. Left and hidden keep the asked
		// for height; centre and right stretch it the way the full rows are,
		// so the block ends on a straight edge.
		const stretch =
			'center' === options.lastRow || 'right' === options.lastRow;

		rows.push({
			items: row,
			height: stretch
				? (width - gap * (row.length - 1)) / ratioSum
				: rowHeight,
			isFull: false,
		});
	}

	const visible = options.maxRowsCount
		? rows.slice(0, options.maxRowsCount)
		: rows;

	let top = 0;

	visible.forEach((current) => {
		const rowWidth =
			current.items.reduce(
				(total, index) => total + ratios[index] * current.height,
				0
			) +
			gap * (current.items.length - 1);

		let left = 0;

		if (!current.isFull) {
			if ('center' === options.lastRow) {
				left = (width - rowWidth) / 2;
			} else if ('right' === options.lastRow) {
				left = width - rowWidth;
			}
		}

		// The row height belongs to the picture, not to the item: an item
		// carries a title and a description under it, and a row that ignored
		// them would print one item over the next.
		let advance = 0;

		current.items.forEach((index) => {
			const item = items[index];
			const itemWidth = ratios[index] * current.height;
			const image = item.querySelector(IMAGE_SELECTOR);

			item.style.position = 'absolute';
			item.style.left = `${left}px`;
			item.style.top = `${top}px`;
			item.style.width = `${itemWidth}px`;

			if (image) {
				image.style.height = `${current.height}px`;
			}

			advance = Math.max(advance, item.offsetHeight);
			left += itemWidth + gap;
		});

		top += advance + gap;
	});

	// Rows past the maximum are not rendered at all, the way the front end
	// drops them, and so is a hidden last row. Marked while hidden: the
	// template hides one item of its own - the copy the editable item stands
	// in for - and clearing that on teardown would show it twice.
	rows.forEach((current, index) => {
		const isDropped =
			index >= visible.length ||
			(!current.isFull && 'hide' === options.lastRow);

		current.items.forEach((itemIndex) => {
			const item = items[itemIndex];

			if (isDropped) {
				item.dataset.vpLayoutHidden = 'true';
				item.style.display = 'none';
			} else if (item.dataset.vpLayoutHidden) {
				delete item.dataset.vpLayoutHidden;
				item.style.display = '';
			}
		});
	});

	list.style.height = `${Math.max(0, top - gap)}px`;
}

/**
 * Run a layout, and run it again whenever what it measured has changed.
 *
 * @param {HTMLElement} list   - item template list.
 * @param {Function}    layout - places the items.
 * @return {Function} teardown.
 */
function start(list, layout) {
	const view = list.ownerDocument.defaultView || window;
	const update = () => layout(list);

	update();

	// A measured layout is only right once the pictures have their dimensions,
	// and the canvas is resized by the device preview, the sidebar and the
	// window alike. `load` does not bubble, so it is caught on the way down.
	list.addEventListener('load', update, true);

	const observer = new view.ResizeObserver(update);

	observer.observe(list);

	return () => {
		list.removeEventListener('load', update, true);
		observer.disconnect();

		list.style.height = '';
		Array.from(list.querySelectorAll(ITEM_SELECTOR)).forEach((item) => {
			resetItem(item);

			if (item.dataset.vpLayoutHidden) {
				delete item.dataset.vpLayoutHidden;
				item.style.display = '';
			}
		});
	};
}

/**
 * Keep the editor preview laid out.
 *
 * The returned ref goes on the list. Every value the layout is measured from is
 * a dependency, so changing a control places the items again at once.
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
			return start(list, layoutMasonry);
		}

		if ('justified' === layoutType) {
			return start(list, (element) =>
				layoutJustified(element, justifiedRef.current)
			);
		}

		return undefined;
	}, [layoutType, itemsCount, signature]);

	return ref;
}
