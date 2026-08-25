/**
 * Register a content source of the Gallery Loop block.
 *
 * This is the runtime half of `registerLoopSource()` and the entry point for
 * code that cannot import from this plugin - Pro and third parties reach it as
 * `wp.data.dispatch( 'visual-portfolio/loop-sources' ).registerSource( … )`.
 *
 * @param {Object} source - source definition, see `loop-sources/registry.js`.
 * @return {Object} action.
 */
export function registerSource(source) {
	return {
		type: 'REGISTER_LOOP_SOURCE',
		source,
	};
}
