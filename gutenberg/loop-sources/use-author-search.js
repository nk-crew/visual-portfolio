/**
 * WordPress dependencies
 */
import { store as coreStore } from '@wordpress/core-data';
import { useSelect } from '@wordpress/data';
import { useCallback, useMemo } from '@wordpress/element';

// Every author at once, the way the core Query block asks for them: a site has
// few enough of them to hold in one request, and a token field that searches
// the server on every keystroke is worse than one that filters a list it has.
const AUTHORS_QUERY = {
	who: 'authors',
	per_page: -1,
	_fields: 'id,name',
	context: 'view',
};

/**
 * The authors of the site, as tokens a `FormTokenField` can carry.
 *
 * @param {Array} selected - author ids the gallery is filtered by.
 * @return {{tokens: Array, suggestions: Array, toIds: Function}} token helpers.
 */
export default function useAuthorSearch(selected = []) {
	const authors = useSelect(
		(select) => select(coreStore).getUsers(AUTHORS_QUERY),
		[]
	);

	// Two authors may share a name, and a token is only a string - so an
	// ambiguous one carries its id and the reverse lookup stays honest.
	const labels = useMemo(() => {
		const counts = {};

		(authors || []).forEach(({ name }) => {
			counts[name] = (counts[name] || 0) + 1;
		});

		const result = {};

		(authors || []).forEach(({ id, name }) => {
			result[String(id)] = counts[name] > 1 ? `${name} (#${id})` : name;
		});

		return result;
	}, [authors]);

	const toIds = useCallback(
		(tokens) =>
			tokens
				.map((token) =>
					Object.keys(labels).find((id) => labels[id] === token)
				)
				.filter(Boolean)
				.map(Number),
		[labels]
	);

	return {
		tokens: selected.map((id) => labels[String(id)] || String(id)),
		suggestions: Object.values(labels),
		search: () => {},
		toIds,
	};
}
