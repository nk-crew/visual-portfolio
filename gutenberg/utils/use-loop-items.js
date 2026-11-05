/**
 * WordPress dependencies
 */
import apiFetch from '@wordpress/api-fetch';
import { useEffect, useState } from '@wordpress/element';

/**
 * The items of a loop, as the page would draw them.
 *
 * Items are resolved on the server for every source alike - titles, category
 * links, ordering and the Pro sources are all query logic, and duplicating any
 * of it here is what broke the first take on the item template. The answers are
 * cached there too, so two blocks of a loop asking the same question cost one
 * query.
 *
 * @param {Object} query - what the endpoint needs, memoised by the caller: its identity is what triggers a request.
 * @return {Object} `{ items, foundItems, isLoading, isFirstLoad }`. The last answer stays while the next one loads.
 */
export function useLoopItems(query) {
	const [answer, setAnswer] = useState(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		let cancelled = false;

		setIsLoading(true);

		// Settings are usually changed in bursts - only ask once they settle.
		const timeout = setTimeout(() => {
			apiFetch({
				path: '/visual-portfolio/v1/get_loop_items/',
				method: 'POST',
				data: query,
			})
				.then((response) => {
					if (cancelled) {
						return;
					}

					setAnswer(response?.success ? response.response : {});
					setIsLoading(false);
				})
				.catch((error) => {
					if (!cancelled) {
						setAnswer((current) => current || {});
						setIsLoading(false);
					}

					// eslint-disable-next-line no-console
					console.error('Error fetching gallery items:', error);
				});
		}, 500);

		return () => {
			cancelled = true;
			clearTimeout(timeout);
		};
	}, [query]);

	return {
		items: answer?.items || [],
		foundItems: answer?.found_items ?? null,
		isLoading,
		isFirstLoad: isLoading && !answer,
	};
}
