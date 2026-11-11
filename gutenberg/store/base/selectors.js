export function getPortfolioLayouts(state) {
	return state.layouts;
}

/**
 * Settings of a Saved Layout, every control resolved.
 *
 * @param {Object} state - store state.
 * @param {string} id    - id of the layout.
 * @return {Object|false|undefined} settings, false when they could not be read, undefined while loading.
 */
export function getLayoutOptions(state, id) {
	return state.layoutOptions?.[id];
}
