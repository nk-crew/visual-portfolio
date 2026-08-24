/**
 * The column count a layout is drawn with, kept in step with the screen.
 *
 * A grid says "as many as fit, each at least this wide" in one line of CSS and
 * needs nothing from here. Masonry and the carousel cannot: their items are
 * placed by a script, or sized by a `calc()` that has to name a number. So the
 * number is settled here and published as `--vp-layout-current-columns`, which
 * is the property both of those layouts already read.
 *
 * Where it comes from depends on the mode. Auto mode measures the container.
 * A named count is narrowed by the stylesheet instead, and is only read back.
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
 * The count the stylesheet settled on, for a list that names its columns.
 *
 * @param {HTMLElement} list - item template list.
 * @return {number} column count, at least one.
 */
function getNamedColumns(list) {
	const view = list.ownerDocument.defaultView || window;
	const styles = view.getComputedStyle(list);

	return Math.max(
		1,
		parseInt(styles.getPropertyValue(COLUMNS_PROPERTY), 10) || 1
	);
}

/**
 * Keep the column count of a list, and whoever draws from it, up to date.
 *
 * @param {HTMLElement} list     - item template list.
 * @param {Function}    onChange - called when the count changed.
 * @return {Function} teardown.
 */
export function syncColumns(list, onChange = () => {}) {
	const view = list.ownerDocument.defaultView || window;
	const isAuto = list.classList.contains(AUTO_CLASS);

	let current = 0;

	const update = () => {
		const columns = isAuto ? getAutoColumns(list) : getNamedColumns(list);

		if (columns === current) {
			return;
		}

		current = columns;

		if (isAuto) {
			list.style.setProperty(COLUMNS_PROPERTY, String(columns));
		}

		onChange(columns);
	};

	update();

	const observer = new view.ResizeObserver(update);

	observer.observe(list);

	// A named count is stepped down at the viewport's own breakpoints, and a
	// gallery inside a container of a fixed width crosses one without ever
	// changing size itself - so the viewport is watched as well.
	if (!isAuto) {
		observer.observe(list.ownerDocument.documentElement);
	}

	return () => {
		observer.disconnect();

		if (isAuto) {
			list.style.removeProperty(COLUMNS_PROPERTY);
		}
	};
}
