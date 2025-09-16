/**
 * Delete all saved layouts (vp_lists) using REST API.
 *
 * @param {Object}       params
 * @param {RequestUtils} params.requestUtils Playwright utilities for interacting with the WordPress REST API.
 */
export async function deleteAllSavedLayouts({ requestUtils }) {
	try {
		// List all saved layouts.
		const layouts = await requestUtils.rest({
			path: '/wp/v2/vp_lists',
			params: {
				per_page: 100,
				// All possible statuses.
				status: 'publish,future,draft,pending,private,trash',
			},
		});

		// Delete all layouts in parallel for better performance.
		// "/wp/v2/vp_lists" not yet supports batch requests.
		await Promise.all(
			layouts.map((layout) =>
				requestUtils.rest({
					method: 'DELETE',
					path: `/wp/v2/vp_lists/${layout.id}`,
					params: {
						force: true,
					},
				})
			)
		);
	} catch (error) {
		// Silently ignore if the post type doesn't exist or no layouts found
		if (
			error.code !== 'rest_no_route' &&
			error.code !== 'rest_post_invalid_id'
		) {
			// Log error for debugging, but don't fail the test
		}
	}
}
