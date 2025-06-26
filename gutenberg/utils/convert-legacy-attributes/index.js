// Attribute mapping configurations
const ATTRIBUTE_MAPPINGS = {
	// Direct mappings (modern.key -> legacy.key)
	direct: {
		queryType: 'content_source',
	},

	// Nested mappings (modern.parent.child -> legacy.key)
	nested: {
		'baseQuery.perPage': 'items_count',
		'postsQuery.source': 'posts_source',
		'postsQuery.postTypesSet': 'post_types_set',
		'postsQuery.ids': 'posts_ids',
		'postsQuery.excludeIds': 'posts_excluded_ids',
		'postsQuery.order': 'posts_order_direction',
		'postsQuery.orderBy': 'posts_order_by',
		'postsQuery.offset': 'posts_offset',
		'postsQuery.taxonomies': 'posts_taxonomies',
		'postsQuery.taxonomiesRelation': 'posts_taxonomies_relation',
		'postsQuery.avoidDuplicates': 'posts_avoid_duplicate_posts',
		'postsQuery.customQuery': 'posts_custom_query',
		'imagesQuery.images': 'images',
		'imagesQuery.categories': 'image_categories',
		'imagesQuery.orderBy': 'images_order_by',
		'imagesQuery.order': 'images_order_direction',
		'imagesQuery.titlesSource': 'images_titles_source',
		'imagesQuery.descriptionsSource': 'images_descriptions_source',
	},
};

// Value transformations for attributes that need different values
const VALUE_TRANSFORMATIONS = {
	// Modern value -> Legacy value
	modernToLegacy: {
		queryType: {
			posts: 'post-based',
		},
	},
	// Legacy value -> Modern value
	legacyToModern: {
		content_source: {
			'post-based': 'posts',
		},
	},
};

// Default structures for modern attributes
const MODERN_DEFAULTS = {
	baseQuery: {
		perPage: 6,
		maxPages: 1,
	},
	postsQuery: {
		source: 'portfolio',
		postTypesSet: ['post'],
		ids: [],
		excludeIds: [],
		order: 'desc',
		orderBy: 'post_date',
		offset: 0,
		taxonomies: [],
		taxonomiesRelation: 'or',
		avoidDuplicates: false,
		customQuery: '',
	},
	imagesQuery: {
		images: [],
		categories: [],
		orderBy: 'default',
		order: 'asc',
		titlesSource: 'custom',
		descriptionsSource: 'custom',
	},
};

// Helper functions
function getNestedValue(obj, path) {
	return path.split('.').reduce((current, key) => current?.[key], obj);
}

function setNestedValue(obj, path, value) {
	const keys = path.split('.');
	const lastKey = keys.pop();
	const target = keys.reduce((current, key) => {
		if (!current[key]) {
			current[key] = {};
		}
		return current[key];
	}, obj);
	target[lastKey] = value;
}

/**
 * Convert modern attributes to legacy format
 *
 * @param {Object}  modernAttributes - Modern attributes object.
 * @param {boolean} includeDefaults  - Whether to include default structure for unset values.
 * @return {Object} Legacy attributes object.
 */
function convertModernToLegacy(modernAttributes, includeDefaults = false) {
	const legacy = {};

	// Merge with defaults if includeDefaults is true.
	let attributesToConvert = modernAttributes;
	if (includeDefaults) {
		attributesToConvert = {};
		// Deep merge defaults with provided attributes
		Object.entries(MODERN_DEFAULTS).forEach(([key, defaultValue]) => {
			attributesToConvert[key] = {
				...defaultValue,
				...modernAttributes[key],
			};
		});
		// Add any additional keys from modernAttributes that aren't in defaults
		Object.keys(modernAttributes).forEach((key) => {
			if (!MODERN_DEFAULTS[key]) {
				attributesToConvert[key] = modernAttributes[key];
			}
		});
	}

	// Handle direct mappings
	Object.entries(ATTRIBUTE_MAPPINGS.direct).forEach(
		([modernKey, legacyKey]) => {
			if (attributesToConvert[modernKey] !== undefined) {
				let value = attributesToConvert[modernKey];

				// Apply value transformation if needed
				if (VALUE_TRANSFORMATIONS.modernToLegacy[modernKey]) {
					value =
						VALUE_TRANSFORMATIONS.modernToLegacy[modernKey][
							value
						] || value;
				}

				legacy[legacyKey] = value;
			}
		}
	);

	// Handle nested mappings
	Object.entries(ATTRIBUTE_MAPPINGS.nested).forEach(
		([modernPath, legacyKey]) => {
			const value = getNestedValue(attributesToConvert, modernPath);
			if (value !== undefined) {
				legacy[legacyKey] = value;
			}
		}
	);

	return legacy;
}

/**
 * Convert legacy attributes to modern format
 *
 * @param {Object}  legacyAttributes - Legacy attributes object.
 * @param {boolean} includeDefaults  - Whether to include default structure for unset values.
 * @return {Object} Modern attributes object.
 */
function convertLegacyToModern(legacyAttributes, includeDefaults = false) {
	const modern = {};

	// Set default structure only if includeDefaults is true.
	if (includeDefaults) {
		Object.entries(MODERN_DEFAULTS).forEach(([key, defaultValue]) => {
			modern[key] = { ...defaultValue };
		});
	}

	// Handle direct mappings (reverse)
	Object.entries(ATTRIBUTE_MAPPINGS.direct).forEach(
		([modernKey, legacyKey]) => {
			if (legacyAttributes[legacyKey] !== undefined) {
				let value = legacyAttributes[legacyKey];

				// Apply value transformation if needed
				if (VALUE_TRANSFORMATIONS.legacyToModern[legacyKey]) {
					value =
						VALUE_TRANSFORMATIONS.legacyToModern[legacyKey][
							value
						] || value;
				}

				modern[modernKey] = value;
			}
		}
	);

	// Handle nested mappings (reverse)
	Object.entries(ATTRIBUTE_MAPPINGS.nested).forEach(
		([modernPath, legacyKey]) => {
			if (legacyAttributes[legacyKey] !== undefined) {
				setNestedValue(modern, modernPath, legacyAttributes[legacyKey]);
			}
		}
	);

	return modern;
}

// Export functions
export { convertLegacyToModern, convertModernToLegacy };
