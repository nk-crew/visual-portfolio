/**
 * Delete all posts using REST API.
 *
 * @param this
 * @param this.requestUtils
 */
export async function deleteAllPortfolio({ requestUtils }) {
	// List all portfolio posts.
	const posts = await requestUtils.rest({
		path: '/wp/v2/portfolio',
		params: {
			per_page: 100,
			// All possible statuses.
			status: 'publish,future,draft,pending,private,trash',
		},
	});

	// Delete all portfolio one by one.
	// "/wp/v2/posts" not yet supports batch requests.
	await Promise.all(
		posts.map((post) =>
			requestUtils.rest({
				method: 'DELETE',
				path: `/wp/v2/portfolio/${post.id}`,
				params: {
					force: true,
				},
			})
		)
	);
}
