const { controls: registeredControls } = window.VPGutenbergVariables;

/**
 * General settings the Gallery Loop block owns.
 *
 * The loop only describes the query, so it keeps the settings that shape it.
 * Everything else in the `content-source-general` category is a rendering
 * setting of the gallery block inside the loop - the loop has no attribute to
 * store them in, and no markup to apply them to.
 *
 * @type {string[]}
 */
export const LOOP_GENERAL_CONTROLS = ['items_count'];

/**
 * Take a subset of the registered controls, keyed the same way.
 *
 * @param {string[]} names - control names.
 * @return {Object} controls.
 */
export function pickControls(names) {
	return Object.fromEntries(
		Object.entries(registeredControls).filter(([name]) =>
			names.includes(name)
		)
	);
}
