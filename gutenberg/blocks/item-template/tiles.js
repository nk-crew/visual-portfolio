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

const MAX_COLUMNS = 6;
const MAX_TILES = 24;
const MAX_ROW_SPAN = 6;

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
 * @return {{columns: number, widest: number}} columns of the pattern, and the
 *                                             widest tile in it.
 */
export function getTilesColumns(tiles) {
	const parsed = parseTiles(tiles);

	return {
		columns: parsed.columns,
		// A narrower viewport never drops below the widest tile of the pattern:
		// a tile spanning two columns of a single column grid would open an
		// implicit second column and take the layout with it.
		widest: Math.max(...parsed.tiles.map((tile) => tile.width)),
	};
}

/**
 * Grid placement of every tile of a pattern.
 *
 * @param {string} tiles - tiles notation.
 * @return {Array} style objects, one per tile of the pattern.
 */
export function getTileStyles(tiles) {
	return parseTiles(tiles).tiles.map((tile) => ({
		gridColumn: `span ${tile.width}`,
		gridRow: `span ${tile.rowSpan}`,
		'--vp-tile-rows': tile.height * tile.width,
	}));
}
