import apiFetch from '@wordpress/api-fetch';
import {
	InspectorControls,
	useBlockProps,
	useInnerBlocksProps,
} from '@wordpress/block-editor';
import { useEffect, useRef } from '@wordpress/element';

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

function filterControlCategories(categories) {
	return Object.fromEntries(
		Object.entries(categories).filter(([key]) =>
			ALLOWED_CONTROL_CATEGORIES.includes(key)
		)
	);
}

function renderControls(props) {
	const { attributes } = props;
	const { queryType } = attributes;

	return (
		<>
			<ControlsRender
				isModernBlock
				category="content-source"
				{...props}
			/>

			{queryType &&
				Object.keys(
					filterControlCategories(registeredControlsCategories)
				)
					.filter((name) => name !== 'content-source')
					.map((name) => (
						<ControlsRender
							isModernBlock
							key={name}
							category={name}
							{...props}
						/>
					))}
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

	const {
		layout,
		queryType,
		baseQuery,
		imagesQuery,
		preview_image_example: previewExample,
	} = attributes;

	// Create a ref to track previous attribute values
	const prevAttributesRef = useRef({});

	// Function to update maxPages via REST API
	const updateMaxPages = debounce(async () => {
		if (!queryType || !baseQuery.perPage) {
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
				setAttributes({
					baseQuery: {
						...baseQuery,
						maxPages: parseInt(response.max_pages, 10),
					},
				});
			}
		} catch (error) {
			// eslint-disable-next-line no-console
			console.error('Error fetching max pages:', error);
		}
	}, 500);

	// Update maxPages when relevant attributes change
	useEffect(() => {
		if (!queryType || !baseQuery.perPage) {
			return;
		}

		// Compare with previous values to avoid unnecessary API calls
		const prevAttrs = prevAttributesRef.current;
		const hasChanged = Object.keys(attributes).some(
			(key) =>
				JSON.stringify(prevAttrs[key]) !==
				JSON.stringify(attributes[key])
		);

		if (hasChanged) {
			updateMaxPages();
			prevAttributesRef.current = { ...attributes };
		}
	}, [attributes, queryType, baseQuery.perPage, updateMaxPages]);

	useEffect(() => {
		if (queryType === 'images' && Array.isArray(imagesQuery.images)) {
			// Extract all categories from images
			const newCategories = new Set();

			imagesQuery.images.forEach((image) => {
				if (image.categories && Array.isArray(image.categories)) {
					image.categories.forEach((category) => {
						newCategories.add(category);
					});
				}
			});

			// Convert Set to Array
			const newCategoriesArray = Array.from(newCategories);

			// Check if the new categories are different from the current ones
			const currentCategories = imagesQuery.categories || [];
			const categoriesChanged =
				JSON.stringify(currentCategories) !==
				JSON.stringify(newCategoriesArray);

			// Update the imagesQuery.categories attribute if there are changes
			if (categoriesChanged) {
				setAttributes({
					imagesQuery: {
						...imagesQuery,
						categories: newCategoriesArray,
					},
				});
			}
		}
	}, [queryType, setAttributes, imagesQuery]);

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
	const blockProps = useBlockProps({ className: 'vp-block-loop' });
	const innerBlocksProps = useInnerBlocksProps(
		{},
		{
			template: [
				[
					'visual-portfolio/filter-by-category',
					{},
					[
						[
							'visual-portfolio/filter-by-category-item',
							{
								text: 'All',
								isAll: true,
								url: '#',
								isActive: true,
							},
						],
					],
				],
				['visual-portfolio/block', { setup_wizard: 'false' }],
				[
					'visual-portfolio/pagination',
					{},
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
