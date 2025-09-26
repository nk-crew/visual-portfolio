/**
 * Create posts with test data for Visual Portfolio testing
 */

/**
 * Create regular posts with images for testing posts-based galleries
 *
 * @param {Object} params              - Parameters for creating posts
 * @param {Object} params.requestUtils - WordPress REST API utilities
 * @param {number} params.count        - Number of posts to create (default: 5)
 * @param {Array}  params.categories   - Categories to assign to posts
 * @return {Array} Array of created post IDs
 */
export async function createRegularPosts({
	requestUtils,
	count = 5,
	categories = [],
}) {
	const postIds = [];

	// Create categories if provided
	const categoryIds = [];
	for (const categoryName of categories) {
		try {
			const category = await requestUtils.rest({
				path: '/wp/v2/categories',
				method: 'POST',
				data: {
					name: categoryName,
					slug: categoryName.toLowerCase().replace(/\s+/g, '-'),
				},
			});
			categoryIds.push(category.id);
		} catch (error) {
			// Category might already exist
			const existingCategories = await requestUtils.rest({
				path: `/wp/v2/categories?slug=${categoryName
					.toLowerCase()
					.replace(/\s+/g, '-')}`,
			});
			if (existingCategories && existingCategories.length > 0) {
				categoryIds.push(existingCategories[0].id);
			}
		}
	}

	// Create regular posts
	for (let i = 0; i < count; i++) {
		const postNumber = i + 1;
		const postData = {
			title: `Test Blog Post ${postNumber}`,
			content: `This is test blog post number ${postNumber}. It contains sample content for testing Visual Portfolio plugin with regular posts.`,
			status: 'publish',
			excerpt: `Short description for blog post ${postNumber}`,
		};

		// Add categories if available
		if (categoryIds.length > 0) {
			postData.categories = [categoryIds[i % categoryIds.length]];
		}

		try {
			const post = await requestUtils.rest({
				path: '/wp/v2/posts',
				method: 'POST',
				data: postData,
			});

			postIds.push(post.id);

			// Add featured image
			try {
				// Use existing test images
				const imageFiles = [
					'image-800x600.png',
					'image-1920x1080.jpeg',
					'image-3840x2160.jpeg',
					'image-300x200.jpeg',
					'image-2000x2000.jpeg',
				];

				const imageFile = imageFiles[i % imageFiles.length];
				const media = await requestUtils.uploadMedia(
					`tests/fixtures/${imageFile}`
				);

				if (media && media.id) {
					await requestUtils.rest({
						path: `/wp/v2/posts/${post.id}`,
						method: 'POST',
						data: {
							featured_media: media.id,
						},
					});
				}
			} catch (mediaError) {
				// Could not add featured image - continue without it
				void mediaError; // eslint-disable-line no-unused-expressions
			}
		} catch (error) {
			// Error creating blog post - continue to next
			void error; // eslint-disable-line no-unused-expressions
		}
	}

	return postIds;
}
