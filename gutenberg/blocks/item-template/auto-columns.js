/**
 * The column count of a layout whose columns follow the container.
 *
 * A grid says "as many as fit, each at least this wide" in one line of CSS and
 * needs nothing from here. Masonry and the carousel cannot: their items are
 * placed by a script, or sized by a `calc()` that has to name a number. So the
 * number is worked out here and published as `--vp-layout-current-columns`,
 * which is the property both of those layouts already read.
 */

const AUTO_CLASS = 'vp-layout-auto-columns';
const COLUMNS_PROPERTY = '--vp-layout-current-columns';
const MIN_WIDTH_PROPERTY = '--vp-layout-min-column-width';

/**
 * The minimum column width, in pixels.
 *
 * Measured rather than parsed: the value is a CSS length the user typed, and
 * `16rem`, `20vw` and `200px` all have to end up as the same kind of number.
 *
 * @param {HTMLElement} list - item template list.
 * @return {number} width in pixels, or zero when it cannot be measured.
 */
function getMinColumnWidth(list) {
	const probe = list.ownerDocument.createElement('div');

	probe.style.cssText = `position:absolute;visibility:hidden;pointer-events:none;width:var(${MIN_WIDTH_PROPERTY},16rem)`;

	list.appendChild(probe);

	const width = probe.offsetWidth;

	probe.remove();

	return width;
}

/**
 * How many columns fit, never more than the layout allows.
 *
 * @param {HTMLElement} list - item template list.
 * @return {number} column count, at least one.
 */
export function getAutoColumns(list) {
	const view = list.ownerDocument.defaultView || window;
	const styles = view.getComputedStyle(list);
	const width = list.clientWidth;
	const gap = parseFloat(styles.columnGap) || 0;
	const minimum = getMinColumnWidth(list);

	if (!width || !minimum) {
		return 1;
	}

	// The maximum is the count the controls carry; zero lifts it.
	const maximum = parseInt(
		styles.getPropertyValue('--vp-layout-columns'),
		10
	);
	const fits = Math.floor((width + gap) / (minimum + gap));

	return Math.max(1, maximum > 0 ? Math.min(fits, maximum) : fits);
}

/**
 * Keep the column count of a list in step with its width.
 *
 * A no-op for a list that names its columns, so a caller does not have to ask
 * which mode the layout is in.
 *
 * @param {HTMLElement} list     - item template list.
 * @param {Function}    onChange - called when the count changed.
 * @return {Function} teardown.
 */
export function syncAutoColumns(list, onChange = () => {}) {
	if (!list.classList.contains(AUTO_CLASS)) {
		return () => {};
	}

	const view = list.ownerDocument.defaultView || window;

	let current = 0;

	const update = () => {
		const columns = getAutoColumns(list);

		if (columns === current) {
			return;
		}

		current = columns;
		list.style.setProperty(COLUMNS_PROPERTY, String(columns));
		onChange(columns);
	};

	update();

	const observer = new view.ResizeObserver(update);

	observer.observe(list);

	return () => {
		observer.disconnect();
		list.style.removeProperty(COLUMNS_PROPERTY);
	};
}
