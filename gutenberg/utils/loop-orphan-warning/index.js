import { useEffect } from '@wordpress/element';

/**
 * Warn a developer about a control that lost its Gallery Loop.
 *
 * Every block of the family declares `ancestor`, so the inserter never offers
 * one outside a loop - but a block can still end up orphaned: pasted into a
 * different post, left behind when the loop around it was deleted, or shipped
 * inside a pattern that forgot the loop. The block then renders with no query
 * to read, and the only symptom is a control that does nothing.
 *
 * A console hint rather than a notice in the canvas: this is a composition
 * mistake made by whoever wrote the pattern or the template, and it is spoken
 * only where developer tooling is on (`SCRIPT_DEBUG`).
 *
 * @param {string} blockName - name of the block asking.
 * @param {Object} context   - block context the block received.
 */
export function useLoopOrphanWarning(blockName, context) {
	// Present with a default for every block inside a loop, absent everywhere
	// else - which makes it the one key that answers "am I in a loop".
	const isOrphan = !context?.['vp/queryType'];

	useEffect(() => {
		if (!isOrphan || !window.VPGutenbergVariables?.debug) {
			return;
		}

		// eslint-disable-next-line no-console
		console.warn(
			`${blockName}: no Gallery Loop around this block, so it has no query to read. Move it inside a "visual-portfolio/loop" block.`
		);
	}, [isOrphan, blockName]);
}
