/**
 * Get the gallery instance a Gallery Loop control belongs to.
 *
 * Loops can be nested, so the first `.vp-portfolio` inside the closest loop is
 * not necessarily the one that loop owns - it can belong to a nested loop that
 * comes first in document order. Only a gallery whose own nearest loop is this
 * loop is driven by this control.
 *
 * @param {Element} element - control inside `.vp-block-loop`.
 * @return {Object|undefined} gallery instance.
 */
export function getLoopGallery(element) {
	const loop = element?.closest('.vp-block-loop');

	if (!loop) {
		return undefined;
	}

	const gallery = Array.from(loop.querySelectorAll('.vp-portfolio')).find(
		(candidate) => candidate.closest('.vp-block-loop') === loop
	);

	return gallery?.vpf;
}
