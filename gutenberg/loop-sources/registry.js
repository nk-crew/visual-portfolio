import { dispatch, useSelect } from '@wordpress/data';

import { LOOP_SOURCES_STORE } from '../store/loop-sources';

/**
 * Register a content source of the Gallery Loop block.
 *
 * Extension point. Gutenberg has no registry for "where a block gets its items
 * from", so this is ours. Everything a source needs to exist in the editor is
 * declared here; nothing else in the loop knows the source names.
 *
 * ```js
 * registerLoopSource( {
 *     name: 'acme/instagram',
 *     title: __( 'Instagram' ),
 *     icon: <InstagramIcon />,
 *     category: 'social',
 *     isPro: true,
 *     SettingsPanel: InstagramSettings,
 *     mapToLegacy: ( sourceQuery ) => ( { social_username: sourceQuery.username } ),
 * } );
 * ```
 *
 * - `name` matches the `queryType` attribute of the loop. Built-in sources own
 *   `posts` and `images`; everything else is namespaced `<vendor>/<source>`.
 * - `SettingsPanel` gets `{ attributes, setAttributes, clientId }` of the loop.
 * - `FiltersPanel` is optional and gets the same props. It renders below the
 *   loop's own Display panel, which is where the core Query block keeps what
 *   narrows a query rather than what shapes it.
 *   A source without one is listed in the picker but not editable.
 * - `mapToLegacy` turns the free-form `sourceQuery` attribute into the legacy
 *   options the source's own `vpf_extend_query_args` hooks read. It is the JS
 *   twin of the `vpf_convert_loop_source_attributes` PHP filter, and the two
 *   must agree - see `tests/fixtures/loop-source-attributes.json`.
 *
 * Registering a name a second time merges over the first registration, so a
 * source can be extended - typically by Pro - without repeating what is already
 * there.
 *
 * Code that cannot import this module dispatches the store action instead:
 * `wp.data.dispatch( 'visual-portfolio/loop-sources' ).registerSource( … )`.
 *
 * @param {Object} settings - source definition.
 */
export function registerLoopSource(settings) {
	const { name, title } = settings || {};

	if (!name || !title) {
		// eslint-disable-next-line no-console
		console.error(
			'Loop sources must be registered with a `name` and a `title`.'
		);
		return;
	}

	dispatch(LOOP_SOURCES_STORE).registerSource({
		category: 'core',
		isPro: false,
		...settings,
	});
}

/**
 * All registered sources, inside a component.
 *
 * @return {Array} sources.
 */
export function useLoopSources() {
	return useSelect((innerSelect) => {
		return innerSelect(LOOP_SOURCES_STORE).getSources();
	}, []);
}

/**
 * A single registered source, inside a component.
 *
 * @param {string} name - source name.
 * @return {Object|undefined} source.
 */
export function useLoopSource(name) {
	return useSelect(
		(innerSelect) => {
			return innerSelect(LOOP_SOURCES_STORE).getSource(name);
		},
		[name]
	);
}
