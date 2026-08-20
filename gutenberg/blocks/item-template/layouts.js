/**
 * The layouts a stylesheet cannot draw.
 *
 * Justified and masonry are measured: how wide an item is depends on how tall
 * its neighbours are, and no CSS property says that. Both are stated here, once,
 * and run unchanged on the page and inside the editor canvas - which is the only
 * way the preview can promise to be the page.
 *
 * They are stated rather than delegated to a library. The canvas is an iframe
 * and the editor bundle runs in the frame around it, where Masonry drops every
 * element on an `instanceof HTMLElement` test against the wrong document; and
 * fjGallery, which the page used to run, leaves a gallery of natural
 * proportions exactly as it found it - the shape a justified gallery is for.
 *
 * Grid, tiles and carousel are stylesheet alone on both sides and never come
 * through here.
 */

/**
 * WordPress dependencies
 */

/**
 * Internal dependencies
 */
import { syncAutoColumns } from './auto-columns';

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
export function layoutMasonry(list) {
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
export function layoutJustified(list, options) {
	const { width, gap, rowHeight } = getMetrics(list);
	const items = getItems(list);

	if (!items.length || !width) {
		return;
	}

	const ratios = items.map(getItemRatio);
	const rows = [];

	let row = [];
	let ratioSum = 0;

	// How much taller than asked a row may settle at before another item has to
	// go into it. At zero a row is only ever closed once it has come down to
	// the asked for height, which is what the control meant before it was read.
	const tallest =
		rowHeight * (1 + Math.max(0, options.rowHeightTolerance || 0));

	items.forEach((item, index) => {
		row.push(index);
		ratioSum += ratios[index];

		// The height this row would settle at if it were closed here.
		const height = (width - gap * (row.length - 1)) / ratioSum;

		if (height <= tallest) {
			rows.push({ items: row, height, isFull: true });
			row = [];
			ratioSum = 0;
		}
	});

	if (row.length) {
		// The last row keeps the asked for height whatever its alignment.
		// Stretching it to the full width is what the alignment is an
		// alternative to - a stretched row starts at the left edge and ends at
		// the right one, and centring or right aligning it can then do nothing.
		rows.push({ items: row, height: rowHeight, isFull: false });
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
 * Justified settings, as the markup carries them.
 *
 * @param {HTMLElement} list - item template list.
 * @return {Object} justified settings.
 */
export function getJustifiedOptions(list) {
	const data = list.dataset;

	return {
		rowHeight: parseFloat(data.vpJustifiedRowHeight) || 320,
		rowHeightTolerance: parseFloat(data.vpJustifiedTolerance) || 0,
		maxRowsCount: parseInt(data.vpJustifiedMaxRows, 10) || 0,
		lastRow: data.vpJustifiedLastRow || 'left',
	};
}

/**
 * Run a layout, and run it again whenever what it measured has changed.
 *
 * @param {HTMLElement} list   - item template list.
 * @param {Function}    layout - places the items.
 * @return {Function} teardown.
 */
export function startLayout(list, layout) {
	const view = list.ownerDocument.defaultView || window;
	const update = () => layout(list);

	// A layout whose columns follow the container needs the count before it can
	// place anything, and it has to be placed again when the count changes.
	const stopColumns = syncAutoColumns(list, update);

	update();

	// A measured layout is only right once the pictures have their dimensions,
	// and the container is resized by the window, the sidebar and the editor's
	// device preview alike. `load` does not bubble, so it is caught on the way
	// down.
	list.addEventListener('load', update, true);

	const observer = new view.ResizeObserver(update);

	observer.observe(list);

	return () => {
		stopColumns();
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
