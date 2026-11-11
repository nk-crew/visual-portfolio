import apiFetch from '@wordpress/api-fetch';
import { useEffect, useState } from '@wordpress/element';

import { parseLayout } from './utils';

// Layouts and choices are read through the plugin's routes rather than
// `wp/v2/vp_lists`, which needs the Saved Layout capabilities: editors and
// authors sync galleries without them.
const layouts = new Map();
let choices = null;

/**
 * What a gallery takes from a layout, fetched once per page load.
 *
 * @param {number} id - layout id.
 * @return {Promise<Object>} `{ record, layout, error }`, `error` being `missing` or `forbidden`.
 */
export function fetchLayout(id) {
	if (!layouts.has(id)) {
		layouts.set(
			id,
			apiFetch({
				path: `/visual-portfolio/v1/saved-layouts/${id}/sync-source`,
			})
				.then((record) => ({
					record,
					layout: parseLayout(record.content),
					error: null,
				}))
				.catch((error) => ({
					record: null,
					layout: null,
					error:
						error?.data?.status === 403 ? 'forbidden' : 'missing',
				}))
		);
	}

	return layouts.get(id);
}

/**
 * A layout as the editor needs it.
 *
 * @param {number} id - layout id.
 * @return {Object} `{ record, layout, locked, error, isResolving }`.
 */
export function useLayout(id) {
	const [state, setState] = useState({ id: 0, value: null });

	useEffect(() => {
		let cancelled = false;

		if (id) {
			fetchLayout(id).then((value) => {
				if (!cancelled) {
					setState({ id, value });
				}
			});
		}

		return () => {
			cancelled = true;
		};
	}, [id]);

	const value = id && state.id === id ? state.value : null;

	return {
		record: value?.record || null,
		layout: value?.layout || null,
		locked: !!value?.record?.locked,
		error: value?.error || null,
		isResolving: !!id && !value,
	};
}

/**
 * Block-based layouts the user can sync a gallery with.
 *
 * @return {Array} `[ items, refresh ]`, items being `{ id, title }` or null while loading.
 */
export function useChoices() {
	const [items, setItems] = useState(choices);

	useEffect(() => {
		if (items) {
			return;
		}

		let cancelled = false;

		apiFetch({ path: '/visual-portfolio/v1/saved-layouts/choices' })
			.catch(() => [])
			.then((result) => {
				choices = result;

				if (!cancelled) {
					setItems(result);
				}
			});

		return () => {
			cancelled = true;
		};
	}, [items]);

	const refresh = () => {
		choices = null;
		setItems(null);
	};

	return [items, refresh];
}
