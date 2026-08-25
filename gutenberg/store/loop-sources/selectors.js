/**
 * All registered content sources, in registration order.
 *
 * @param {Object} state - store state.
 * @return {Array} sources.
 */
export function getSources(state) {
	return state.sources;
}

/**
 * A single content source, or `undefined` when nothing claims the name.
 *
 * An unknown name is the normal case for a loop configured with a source the
 * current install does not have - the inspector leaves such a loop alone.
 *
 * @param {Object} state - store state.
 * @param {string} name  - source name.
 * @return {Object|undefined} source.
 */
export function getSource(state, name) {
	return state.sources.find((source) => source.name === name);
}
