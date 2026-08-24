/**
 * How many columns a layout has, in the terms the core grid uses.
 *
 * A mirror of `Visual_Portfolio_Block_Item_Template::get_column_styles()`, which
 * stays the source of truth for what a page renders. It exists twice because
 * the editor draws the preview itself and asking the server for a track
 * definition on every keystroke would make dragging the slider feel like
 * loading a page.
 *
 * The two modes are the ones the core grid layout offers:
 *
 * - Manual: `layoutColumnCount` columns, which the stylesheet caps as the
 *   screen narrows so a phone is never asked to show four of them.
 * - Auto: as many columns as fit, each at least `layoutMinimumColumnWidth`
 *   wide, never more than `layoutColumnCount` of them. A count of zero lifts
 *   the maximum. `layoutAutoFit` decides whether a row that cannot be filled
 *   collapses its empty tracks or keeps them.
 */

const DEFAULT_MINIMUM_COLUMN_WIDTH = '16rem';

/**
 * Block spacing, as a CSS length.
 *
 * The Dimensions panel stores either a length or a reference to a preset of
 * the theme.
 *
 * @param {string} value - stored block gap.
 * @return {string} CSS length.
 */
export function getBlockGapValue(value) {
	const gap = String(value ?? '');

	// `var:preset|spacing|50` is how a preset travels in block attributes.
	if (0 === gap.indexOf('var:')) {
		return `var(--wp--${gap.slice(4).replace(/\|/g, '--')})`;
	}

	return gap;
}

/**
 * A CSS length, reduced to what a length can be made of.
 *
 * The value is typed into the editor and ends up inside a `minmax()`.
 *
 * @param {string} value - raw value.
 * @return {string} length, or the default when nothing usable is left.
 */
export function getCssLength(value) {
	const cleaned = String(value ?? '').replace(/[^0-9a-z.%-]/gi, '');

	return '' === cleaned ? DEFAULT_MINIMUM_COLUMN_WIDTH : cleaned;
}

/**
 * Whether the columns follow the container rather than a count.
 *
 * Tiles carry their columns in the notation and justified has none, so neither
 * has a mode to choose.
 *
 * @param {Object} attributes - block attributes.
 * @return {boolean} True in auto mode.
 */
export function isAutoColumns(attributes) {
	const { layoutType, layoutColumnsMode } = attributes;

	if ('tiles' === layoutType || 'justified' === layoutType) {
		return false;
	}

	return 'auto' === layoutColumnsMode;
}

/**
 * The first argument of the `minmax()` an auto layout repeats.
 *
 * With a maximum column count the track also has a lower bound of its own -
 * the width the container would give that many columns - so the grid stops
 * growing at the count instead of at the width.
 *
 * @param {Object} attributes - block attributes.
 * @return {string} track definition.
 */
export function getColumnsTrack(attributes) {
	const width = `min(${getCssLength(attributes.layoutMinimumColumnWidth)}, 100%)`;
	const count = Math.max(0, parseInt(attributes.layoutColumnCount, 10) || 0);

	if (!count) {
		return width;
	}

	return `max(${width}, (100% - (var(--vp-layout-gap, 1.5rem) * ${count - 1})) / ${count})`;
}

/**
 * The columns a layout ends up with, as far as the editor can tell.
 *
 * Auto mode has no answer until the container is measured, so it reports the
 * maximum - which is what the previews of the controls are drawn against.
 *
 * @param {Object} attributes - block attributes.
 * @return {number} column count.
 */
export function getColumnCount(attributes) {
	const count = Math.max(0, parseInt(attributes.layoutColumnCount, 10) || 0);

	// Auto mode reads the count as a maximum, and zero lifts it. A named count
	// is a count, so it never drops below one.
	return isAutoColumns(attributes) ? count : Math.max(1, count);
}

/**
 * Classes and custom properties the layout is drawn from.
 *
 * The custom properties are a public contract: a theme redeclares them to
 * change a gallery without touching the markup.
 *
 * @param {Object} attributes - block attributes.
 * @param {string} blockGap   - resolved block spacing, or an empty string.
 * @return {{className: string, style: Object}} layout props.
 */
export function getColumnsProps(attributes, blockGap) {
	const isAuto = isAutoColumns(attributes);
	const classNames = [];
	const style = {
		'--vp-layout-columns': getColumnCount(attributes),
	};

	if (blockGap) {
		style['--vp-layout-gap'] = blockGap;
	}

	if (isAuto) {
		classNames.push('vp-layout-auto-columns');

		style['--vp-layout-min-column-width'] = getCssLength(
			attributes.layoutMinimumColumnWidth
		);
		style['--vp-layout-track'] = getColumnsTrack(attributes);

		if (attributes.layoutAutoFit) {
			classNames.push('vp-layout-auto-fit');
		}
	}

	return { className: classNames.join(' '), style };
}
