/**
 * The edge of a box a pointer crossed.
 *
 * The gallery has moved the panel of its fly items style this way for years:
 * the segment the pointer travelled is tested against each of the four edges,
 * and the edge it crossed is the side the panel comes from and leaves through.
 *
 * The file is a partial - the name keeps it out of the entry glob - so that the
 * legacy items style and the Gallery Item Cover block answer the same way.
 */

/**
 * Whether two lines cross.
 *
 * @param {Object} a - first point of the first line.
 * @param {Object} b - second point of the first line.
 * @param {Object} c - first point of the second line.
 * @param {Object} d - second point of the second line.
 *
 * @return {boolean} cross lines.
 */
export function isCrossLine(a, b, c, d) {
	const v1 = (d.x - c.x) * (a.y - c.y) - (d.y - c.y) * (a.x - c.x);
	const v2 = (d.x - c.x) * (b.y - c.y) - (d.y - c.y) * (b.x - c.x);
	const v3 = (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
	const v4 = (b.x - a.x) * (d.y - a.y) - (b.y - a.y) * (d.x - a.x);

	return v1 * v2 <= 0 && v3 * v4 <= 0;
}

/**
 * Where a panel of the given box rests, for the side the pointer crossed.
 *
 * The offsets go a tenth of a percent past the edge: a panel parked at exactly
 * 100% leaves a seam of its own colour on a fractional device pixel.
 *
 * @param {DOMRect} rect       - box the pointer entered or left.
 * @param {Object}  cursor     - pointer position of this event.
 * @param {Object}  lastCursor - pointer position of the move before it.
 *
 * @return {{x: string, y: string}} translation of the resting panel.
 */
export function getFlyOffset(rect, cursor, lastCursor) {
	// Find the corner that placed on cursor path.
	let isUp = isCrossLine(
		{ x: rect.left, y: rect.top },
		{ x: rect.left + rect.width, y: rect.top },
		cursor,
		lastCursor
	);
	let isDown = isCrossLine(
		{ x: rect.left, y: rect.top + rect.height },
		{ x: rect.left + rect.width, y: rect.top + rect.height },
		cursor,
		lastCursor
	);
	let isLeft = isCrossLine(
		{ x: rect.left, y: rect.top },
		{ x: rect.left, y: rect.top + rect.height },
		cursor,
		lastCursor
	);
	let isRight = isCrossLine(
		{ x: rect.left + rect.width, y: rect.top },
		{ x: rect.left + rect.width, y: rect.top + rect.height },
		cursor,
		lastCursor
	);

	// Sometimes isCrossLine returned false, so we need to check direction
	// manually (less accurate, but it is not a big problem).
	if (!isUp && !isDown && !isLeft && !isRight) {
		const x = (rect.width / 2 - cursor.x + rect.left) / (rect.width / 2);
		const y = (rect.height / 2 - cursor.y + rect.top) / (rect.height / 2);

		if (Math.abs(x) > Math.abs(y)) {
			if (x > 0) {
				isLeft = true;
			} else {
				isRight = true;
			}
		} else if (y > 0) {
			isUp = true;
		} else {
			isDown = true;
		}
	}

	if (isUp) {
		return { x: '0%', y: '-100.1%' };
	}

	if (isDown) {
		return { x: '0%', y: '100.1%' };
	}

	if (isLeft) {
		return { x: '-100.1%', y: '0%' };
	}

	if (isRight) {
		return { x: '100.1%', y: '0%' };
	}

	return { x: '0%', y: '0%' };
}
