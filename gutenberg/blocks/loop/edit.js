import apiFetch from '@wordpress/api-fetch';
import {
	InspectorControls,
	useBlockProps,
	useInnerBlocksProps,
} from '@wordpress/block-editor';
import { createBlock } from '@wordpress/blocks';
import { useDispatch, useSelect } from '@wordpress/data';
import { useEffect, useMemo, useRef } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

import ControlsRender from '../../components/controls-render';

const {
	plugin_url: pluginUrl,
	controls_categories: registeredControlsCategories,
} = window.VPGutenbergVariables;

// Content source categories to display
const ALLOWED_CONTROL_CATEGORIES = [
	'content-source',
	'content-source-general',
	'content-source-images',
	'content-source-post-based',
	'content-source-social-stream',
	'custom_css',
];

// Mapping of camelCase to snake_case attribute names
const PAGINATION_ATTRIBUTE_MAPPING = {
	contentSource: 'content_source',
	postsSource: 'posts_source',
	itemsCount: 'items_count',
	images: 'images',
	postTypesSet: 'post_types_set',
	postsIds: 'posts_ids',
	postsExcludedIds: 'posts_excluded_ids',
	postsOffset: 'posts_offset',
	postsOrderBy: 'posts_order_by',
	postsOrderDirection: 'posts_order_direction',
	postsTaxonomies: 'posts_taxonomies',
	postsTaxonomiesRelation: 'posts_taxonomies_relation',
	postsAvoidDuplicatePosts: 'posts_avoid_duplicate_posts',
	postsCustomQuery: 'posts_custom_query',
	imageCategories: 'image_categories',
};

function filterControlCategories(categories) {
	return Object.fromEntries(
		Object.entries(categories).filter(([key]) =>
			ALLOWED_CONTROL_CATEGORIES.includes(key)
		)
	);
}

function renderControls(props) {
	const { attributes } = props;
	let { content_source: contentSource } = attributes;

	// Saved layouts by default displaying Portfolio source.
	if (contentSource === 'portfolio') {
		contentSource = '';
	}

	return (
		<>
			<ControlsRender category="content-source" {...props} />

			{contentSource && (
				<>
					{Object.keys(
						filterControlCategories(registeredControlsCategories)
					)
						.filter((name) => name !== 'content-source')
						.map((name) => (
							<ControlsRender
								key={name}
								category={name}
								{...props}
							/>
						))}
				</>
			)}
		</>
	);
}

// Debounce function to prevent too many API calls
function debounce(func, wait) {
	let timeout;
	return function (...args) {
		clearTimeout(timeout);
		timeout = setTimeout(() => func(...args), wait);
	};
}

/**
 * Block Edit Component
 * @param props
 */
export default function BlockEdit(props) {
	const { attributes, clientId, setAttributes } = props;

	// Create a ref to track previous attribute values
	const prevAttributesRef = useRef({});

	// Extract needed attributes with destructuring
	const { preview_image_example: previewExample, layout } = attributes;

	// Create a memoized object with all pagination-related attributes
	const relevantAttributes = useMemo(() => {
		// Extract all pagination attributes from attributes object
		const result = {};

		// Add all mapped attributes (both camelCase and snake_case versions)
		Object.entries(PAGINATION_ATTRIBUTE_MAPPING).forEach(
			([camelKey, snakeKey]) => {
				// Use the camelCase key in our result object
				result[camelKey] = attributes[snakeKey];
			}
		);

		// Add block ID
		result.block_id = clientId;

		return result;
	}, [attributes, clientId]);

	// Extract commonly used values for convenience
	const contentSource = relevantAttributes.contentSource;
	const itemsCount = relevantAttributes.itemsCount;
	const images = relevantAttributes.images;

	// Get inner blocks
	const { innerBlocks } = useSelect(
		(select) => ({
			innerBlocks: select('core/block-editor').getBlocks(clientId),
		}),
		[clientId]
	);

	const { replaceInnerBlocks } = useDispatch('core/block-editor');

	// Function to update maxPages via REST API
	const updateMaxPages = debounce(async () => {
		if (!contentSource || !itemsCount) {
			return;
		}

		try {
			// Create a data object instead of query params
			const requestData = {};

			// Add all attributes to the request data
			Object.entries(attributes).forEach(([key, value]) => {
				if (value !== null) {
					requestData[key] = value;
				}
			});

			// Add block ID
			requestData.block_id = clientId;

			// Make API request with data in the body
			const response = await apiFetch({
				path: '/visual-portfolio/v1/get-max-pages/',
				method: 'POST',
				data: requestData, // Send data in request body instead of URL
			});

			// Update maxPages attribute if available in response
			if (response?.max_pages !== undefined) {
				setAttributes({ maxPages: parseInt(response.max_pages, 10) });
			}
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error('Error fetching max pages:', error);
		}
	}, 500);

	// Initialize blocks when the loop block is first added
	useEffect(() => {
		if (innerBlocks.length === 0) {
			const blocks = [
				// Filter block with "All" item
				createBlock('visual-portfolio/filter', {}, [
					createBlock('visual-portfolio/filter-item', {
						text: __('All', 'visual-portfolio'),
						isAll: true,
						url: '#',
						isActive: true,
					}),
				]),

				// Gallery block
				createBlock('visual-portfolio/block', {}),

				// Pagination block with components
				createBlock(
					'visual-portfolio/pagination',
					{ paginationType: 'default' },
					[
						createBlock('visual-portfolio/pagination-previous'),
						createBlock('visual-portfolio/pagination-numbers'),
						createBlock('visual-portfolio/pagination-next'),
					]
				),
			];

			replaceInnerBlocks(clientId, blocks, false);
		}
	}, [clientId, innerBlocks.length, replaceInnerBlocks]);

	// Set default contentSource
	useEffect(() => {
		if (!contentSource || contentSource === '') {
			setAttributes({
				content_source: 'post-based',
				posts_source: 'portfolio',
			});
		}
	}, [contentSource, setAttributes]);

	// Update maxPages when relevant attributes change
	useEffect(() => {
		if (!contentSource || !itemsCount) {
			return;
		}

		// Compare with previous values to avoid unnecessary API calls
		const prevAttrs = prevAttributesRef.current;
		const hasChanged = Object.keys(relevantAttributes).some(
			(key) =>
				JSON.stringify(prevAttrs[key]) !==
				JSON.stringify(relevantAttributes[key])
		);

		if (hasChanged) {
			updateMaxPages();
			prevAttributesRef.current = { ...relevantAttributes };
		}
	}, [relevantAttributes, contentSource, itemsCount, updateMaxPages]);

	useEffect(() => {
		if (contentSource === 'images' && Array.isArray(images)) {
			// Extract all categories from images
			const newCategories = new Set();

			images.forEach((image) => {
				if (image.categories && Array.isArray(image.categories)) {
					image.categories.forEach((category) => {
						newCategories.add(category);
					});
				}
			});

			// Convert Set to Array
			const newCategoriesArray = Array.from(newCategories);

			// Check if the new categories are different from the current ones
			const currentCategories = attributes.image_categories || [];
			const categoriesChanged =
				JSON.stringify(currentCategories) !==
				JSON.stringify(newCategoriesArray);

			// Update the image_categories attribute if there are changes
			if (categoriesChanged) {
				setAttributes({ image_categories: newCategoriesArray });
			}
		}
	}, [images, contentSource, setAttributes, attributes.image_categories]);

	// Display block preview if needed
	if (previewExample === 'true') {
		return (
			<div className="vpf-example-preview">
				<img
					src={`${pluginUrl}/assets/admin/images/example-${layout}.png`}
					alt={`Preview of ${layout} layout`}
				/>
			</div>
		);
	}

	// Set up block props
	const blockProps = useBlockProps();
	const innerBlocksProps = useInnerBlocksProps(
		{ className: 'vp-loop-content' },
		{
			template: [
				[
					'visual-portfolio/filter',
					{},
					[
						[
							'visual-portfolio/filter-item',
							{
								text: 'All',
								isAll: true,
								url: '#',
								isActive: true,
							},
						],
					],
				],
				['visual-portfolio/block', {}],
				[
					'visual-portfolio/pagination',
					{ paginationType: 'default' },
					[
						['visual-portfolio/pagination-previous'],
						['visual-portfolio/pagination-numbers'],
						['visual-portfolio/pagination-next'],
					],
				],
			],
		}
	);

	return (
		<div {...blockProps}>
			<InspectorControls>{renderControls(props)}</InspectorControls>
			<div {...innerBlocksProps} />
		</div>
	);
}
