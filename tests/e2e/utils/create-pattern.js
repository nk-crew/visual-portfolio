/**
 * Utilities for creating and managing patterns in WordPress block editor
 */

/**
 * Create a simple block pattern using block markup
 *
 * @param {Object} params              - Parameters for creating the pattern
 * @param {Object} params.requestUtils - WordPress REST API utilities
 * @param {string} params.title        - Pattern title
 * @param {string} params.content      - Block markup content
 * @return {Object} Created pattern
 */
export async function createPatternViaAPI({
	requestUtils,
	title = 'Test Pattern',
	content = '',
}) {
	try {
		// Create pattern as a wp_block post type (reusable block)
		const pattern = await requestUtils.rest({
			path: '/wp/v2/blocks',
			method: 'POST',
			data: {
				title,
				content,
				status: 'publish',
			},
		});

		return {
			success: true,
			pattern,
			id: pattern.id,
		};
	} catch (error) {
		// Log error for debugging (commented to avoid linting issues)
		// console.log('Error creating pattern:', error);
		return {
			success: false,
			error: error.message,
		};
	}
}
