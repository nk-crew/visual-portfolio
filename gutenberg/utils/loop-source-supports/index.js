/**
 * Whether the content source of a Gallery Loop supports one of its controls.
 *
 * Reads the map `Visual_Portfolio_Get::get_loop_source_supports()` builds, so
 * the editor and the page agree on what renders.
 *
 * @param {string} queryType - `queryType` of the loop.
 * @param {string} control   - `sort`, `filter` or `search`.
 * @return {boolean} Whether the page renders the control.
 */
export function loopSourceSupports(queryType, control) {
	const supports = window.VPGutenbergVariables?.loop_source_supports;

	return false !== supports?.[queryType]?.[control];
}
