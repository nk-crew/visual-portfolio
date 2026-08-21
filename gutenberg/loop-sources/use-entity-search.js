import apiFetch from '@wordpress/api-fetch';
import { useDebounce } from '@wordpress/compose';
import { useCallback, useEffect, useMemo, useState } from '@wordpress/element';
import { addQueryArgs } from '@wordpress/url';

const SEARCH_PATH = '/wp/v2/search';
const PER_PAGE = 20;

/**
 * Back a `FormTokenField` with the core search endpoint.
 *
 * `/wp/v2/search` is the only core route that searches across every post type
 * and every taxonomy at once, which is what the posts source needs: the loop
 * stores bare ids and the user picks from anything the query could return.
 *
 * Tokens are titles, ids are what gets stored, and the two are matched through
 * a map that grows with every response - so a token stays readable after a
 * reload, when the only thing the block carries is the id.
 *
 * @param {Object} options          - hook options.
 * @param {string} options.type     - `post` or `term`.
 * @param {string} options.subtype  - post type or taxonomy to narrow to.
 * @param {Array}  options.selected - currently selected ids.
 * @return {Object} `{ tokens, suggestions, search, toIds }`.
 */
export default function useEntitySearch({
	type = 'post',
	subtype = 'any',
	selected = [],
}) {
	const [labels, setLabels] = useState({});
	const [suggestionIds, setSuggestionIds] = useState([]);

	const rememberLabels = useCallback((results) => {
		if (!Array.isArray(results)) {
			return [];
		}

		const found = {};

		results.forEach(({ id, title }) => {
			if (id && title) {
				found[String(id)] = title;
			}
		});

		setLabels((current) => ({ ...current, ...found }));

		// Ids rather than titles: what a suggestion reads as is decided once,
		// beside the tokens, so a title two entities share is told apart in
		// both lists or in neither.
		return Object.keys(found);
	}, []);

	// Ids saved in the block carry no titles, so resolve them once.
	const unresolved = selected
		.map(String)
		.filter((id) => !labels[id])
		.join(',');

	useEffect(() => {
		if (!unresolved) {
			return;
		}

		apiFetch({
			path: addQueryArgs(SEARCH_PATH, {
				type,
				include: unresolved,
				per_page: PER_PAGE,
			}),
		})
			.then(rememberLabels)
			.catch(() => {
				// A deleted post or term simply stays unresolved.
			});
	}, [unresolved, type, rememberLabels]);

	const runSearch = useCallback(
		(term) => {
			if (!term) {
				setSuggestionIds([]);
				return;
			}

			apiFetch({
				path: addQueryArgs(SEARCH_PATH, {
					type,
					subtype,
					search: term,
					per_page: PER_PAGE,
				}),
			})
				.then((results) => setSuggestionIds(rememberLabels(results)))
				.catch(() => setSuggestionIds([]));
		},
		[type, subtype, rememberLabels]
	);

	const search = useDebounce(runSearch, 300);

	// A title is what the user reads, and an id is what the block stores - so a
	// title shared by two entities has to be told apart before it is offered.
	// Only the ambiguous ones carry their id; the rest read as they always did.
	const uniqueLabels = useMemo(() => {
		const counts = {};

		Object.values(labels).forEach((label) => {
			counts[label] = (counts[label] || 0) + 1;
		});

		const result = {};

		Object.keys(labels).forEach((id) => {
			const label = labels[id];

			result[id] = counts[label] > 1 ? `${label} (#${id})` : label;
		});

		return result;
	}, [labels]);

	const tokens = useMemo(
		() => selected.map((id) => uniqueLabels[String(id)] || String(id)),
		[selected, uniqueLabels]
	);

	// Tokens the user typed by hand match nothing and are dropped.
	const toIds = useCallback(
		(nextTokens) =>
			nextTokens
				.map((token) => {
					const id = Object.keys(uniqueLabels).find(
						(key) => uniqueLabels[key] === token
					);

					// An id that never resolved to a title is its own token,
					// and removing a sibling must not drop it.
					if (!id && selected.map(String).includes(token)) {
						return token;
					}

					return id;
				})
				.filter(Boolean),
		[uniqueLabels, selected]
	);

	const suggestions = useMemo(
		() => suggestionIds.map((id) => uniqueLabels[id] || id),
		[suggestionIds, uniqueLabels]
	);

	return { tokens, suggestions, search, toIds };
}
