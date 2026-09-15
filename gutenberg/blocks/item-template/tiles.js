/**
 * The tiles notation, as the editor reads it.
 *
 * A mirror of `Visual_Portfolio_Tiles_Parser`, which stays the source of truth:
 * the front end is laid out by the rules that class writes, and the unit tests
 * that hold the notation to its legacy meaning run against it. This exists
 * because the editor draws the preset previews and the item preview itself, and
 * asking the server for a pattern the user is scrolling through would make
 * picking one feel like loading a page.
 *
 * Keep the two in step. `test-class-tiles-parser.php` covers the presets.
 */

export const MAX_COLUMNS = 6;
export const MAX_TILES = 24;
export const MAX_ROW_SPAN = 6;

/**
 * Positive number out of a notation segment.
 *
 * @param {string} value    - raw segment.
 * @param {number} fallback - value for a segment that names no number.
 * @return {number} number.
 */
function toNumber(value, fallback) {
	const raw = String(value ?? '').trim();

	// `Number` rather than `parseFloat`, which reads a number off the front of
	// `2px` and leaves the editor laying a tile out to a width the server, whose
	// `is_numeric()` refuses the same string, never renders.
	const parsed = '' === raw ? Number.NaN : Number(raw);

	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

/**
 * Read a tiles string.
 *
 * @param {string} tiles - tiles notation.
 * @return {{columns: number, tiles: Array}} parsed pattern.
 */
export function parseTiles(tiles) {
	const segments = String(tiles ?? '')
		.split(/[:|]/)
		.map((segment) => segment.trim())
		.filter(Boolean);

	const columns = Math.max(
		1,
		Math.min(MAX_COLUMNS, parseInt(segments.shift(), 10) || 0)
	);

	const parsed = segments.slice(0, MAX_TILES).map((segment) => {
		const size = segment.split(',');

		return {
			width: Math.min(
				columns,
				Math.max(1, Math.round(toNumber(size[0], 1)))
			),
			height: toNumber(size[1], 1),
		};
	});

	if (!parsed.length) {
		parsed.push({ width: 1, height: 1 });
	}

	// The shortest tile of the pattern is the row unit, so at least one tile is
	// exact and no pattern turns into hundreds of tracks.
	const unit = Math.min(...parsed.map((tile) => tile.height * tile.width));

	return {
		columns,
		tiles: parsed.map((tile) => ({
			...tile,
			rowSpan: Math.max(
				1,
				Math.min(
					MAX_ROW_SPAN,
					Math.round(unit > 0 ? (tile.height * tile.width) / unit : 1)
				)
			),
		})),
	};
}

/**
 * Columns a pattern asks for.
 *
 * @param {string} tiles - tiles notation.
 * @return {number} columns of the pattern.
 */
export function getTilesColumns(tiles) {
	return parseTiles(tiles).columns;
}

/**
 * Grid placement of every tile of a pattern.
 *
 * The width and the height stay apart, the way the parser writes them: the
 * stylesheet clamps the width to the columns a narrowed layout has left, and
 * the height is a multiple of that width.
 *
 * @param {string} tiles - tiles notation.
 * @return {Array} style objects, one per tile of the pattern.
 */
export function getTileStyles(tiles) {
	return parseTiles(tiles).tiles.map((tile) => ({
		gridRow: `span ${tile.rowSpan}`,
		'--vp-tile-columns': tile.width,
		'--vp-tile-height': tile.height,
	}));
}

/**
 * A number the way the notation writes one.
 *
 * Four decimals and no trailing zeros, as `to_css_number()` prints them, so a
 * pattern the editor writes reads back as the same pattern and a square is
 * `1`, never `1.0000`.
 *
 * @param {number} value - number.
 * @return {string} notation number.
 */
export function formatTilesNumber(value) {
	return Number(value).toFixed(4).replace(/0+$/, '').replace(/\.$/, '');
}

/**
 * Write a pattern in the notation.
 *
 * The inverse of `parseTiles()`: the columns, then every tile as
 * `width,height`, each followed by the separator - the trailing one is what
 * the notation has always ended with. A row span is derived, so it is not
 * written, and a width is clamped to the columns the way the parser clamps it
 * when it reads one back.
 *
 * @param {Object} pattern         - pattern.
 * @param {number} pattern.columns - columns.
 * @param {Array}  pattern.tiles   - tiles, each `{ width, height }`.
 * @return {string} tiles notation.
 */
export function serializeTiles({ columns, tiles }) {
	const count = Math.max(1, Math.min(MAX_COLUMNS, Math.round(columns) || 1));

	return [
		count,
		...tiles.slice(0, MAX_TILES).map((tile) => {
			const width = Math.max(
				1,
				Math.min(count, Math.round(tile.width) || 1)
			);

			return `${width},${formatTilesNumber(tile.height)}`;
		}),
		'',
	].join('|');
}
