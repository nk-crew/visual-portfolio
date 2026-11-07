/**
 * WordPress dependencies
 */
import apiFetch from '@wordpress/api-fetch';
import { useInstanceId } from '@wordpress/compose';
import { useEffect, useRef, useState } from '@wordpress/element';
import { addAction, removeAction } from '@wordpress/hooks';

/**
 * The items of a loop, as the page would draw them.
 *
 * Items are resolved on the server for every source alike - titles, category
 * links, ordering and the Pro sources are all query logic, and duplicating any
 * of it here is what broke the first take on the item template. The answers are
 * cached there too, so two blocks of a loop asking the same question cost one
 * query.
 *
 * The items are asked again when `vpf.loopItems.refresh` fires, for a source
 * whose items change on the server while the query stays the same, like a
 * social feed finishing its first sync.
 *
 * @param {Object} query - what the endpoint needs, memoised by the caller: its identity is what triggers a request.
 * @return {Object} `{ items, foundItems, isLoading, isFirstLoad }`. The last answer stays while the next one loads.
 */
export function useLoopItems(query) {
	const [answer, setAnswer] = useState(null);
	const [isLoading, setIsLoading] = useState(true);
	const [refreshes, setRefreshes] = useState(0);
	const answeredRefreshes = useRef(0);
	const instanceId = useInstanceId(useLoopItems);

	useEffect(() => {
		const namespace = `visual-portfolio/loop-items-${instanceId}`;

		addAction('vpf.loopItems.refresh', namespace, () =>
			setRefreshes((count) => count + 1)
		);

		return () => removeAction('vpf.loopItems.refresh', namespace);
	}, [instanceId]);

	useEffect(() => {
		let cancelled = false;

		setIsLoading(true);

		const fresh = refreshes !== answeredRefreshes.current;
		answeredRefreshes.current = refreshes;

		// Settings are usually changed in bursts - only ask once they settle.
		const timeout = setTimeout(() => {
			apiFetch({
				path: '/visual-portfolio/v1/get_loop_items/',
				method: 'POST',
				data: fresh ? { ...query, fresh: true } : query,
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
	}, [query, refreshes]);

	return {
		items: answer?.items || [],
		foundItems: answer?.found_items ?? null,
		isLoading,
		isFirstLoad: isLoading && !answer,
	};
}
