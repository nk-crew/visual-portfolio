import apiFetch from '@wordpress/api-fetch';
import {
	InspectorControls,
	useBlockProps,
	useInnerBlocksProps,
} from '@wordpress/block-editor';
import { useEffect, useRef } from '@wordpress/element';

import ControlsRender from '../../components/controls-render';
import { LOOP_GENERAL_CONTROLS, pickControls } from '../../utils/loop-controls';

const {
	plugin_url: pluginUrl,
	controls_categories: registeredControlsCategories,
} = window.VPGutenbergVariables;

// Content source categories to display. Anything outside this list belongs to
// the gallery block inside the loop, which is what renders it.
const ALLOWED_CONTROL_CATEGORIES = [
	'content-source',
	'content-source-general',
	'content-source-images',
	'content-source-post-based',
	'content-source-taxonomies',
	'content-source-social-stream',
];

const TEMPLATE = [
	[
		'visual-portfolio/filter-by-category',
		{},
		// A placeholder until the filter block has fetched its items. It carries
		// the default `filter` of `*`, so the fetched "All" item reuses it.
		[
			[
				'visual-portfolio/filter-by-category-item',
				{ text: 'All', isAll: true },
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
];

function renderControls(props) {
	const categories = Object.keys(registeredControlsCategories).filter(
		(name) => ALLOWED_CONTROL_CATEGORIES.includes(name)
	);

	return (
		<>
			<ControlsRender
				isModernBlock
				category="content-source"
				{...props}
			/>

			{categories
				.filter((name) => name !== 'content-source')
				.map((name) => (
					<ControlsRender
						isModernBlock
						key={name}
						category={name}
						// Only some of the general settings are query settings,
						// the rest are no-ops on this block.
						controls={
							'content-source-general' === name
								? pickControls(LOOP_GENERAL_CONTROLS)
								: undefined
						}
						{...props}
					/>
				))}
		</>
	);
}

/**
 * Block Edit Component
 * @param props
 */
export default function BlockEdit(props) {
	const { attributes, setAttributes } = props;

	const {
		layout,
		queryType,
		baseQuery,
		postsQuery,
		imagesQuery,
		preview_image_example: previewExample,
	} = attributes;

	// Read when a request resolves, so the pending value is never stale.
	const baseQueryRef = useRef(baseQuery);

	useEffect(() => {
		baseQueryRef.current = baseQuery;
	}, [baseQuery]);

	// Everything the endpoint needs, and the only thing that should trigger it.
	// `maxPages` is deliberately left out - it is what the request writes back.
	const queryKey = JSON.stringify({
		queryType,
		baseQuery: { perPage: baseQuery?.perPage },
		postsQuery,
		imagesQuery,
	});

	// `maxPages` drives the editor preview of the pagination blocks. The front
	// end recalculates it per request, since saved content goes stale.
	useEffect(() => {
		const query = JSON.parse(queryKey);

		if (!query.queryType || !query.baseQuery.perPage) {
			return undefined;
		}

		// `clearTimeout` only stops a request that has not gone out yet.
		let cancelled = false;

		// Settings are usually changed in bursts - only ask once they settle.
		const timeout = setTimeout(() => {
			apiFetch({
				path: '/visual-portfolio/v1/get_max_pages/',
				method: 'POST',
				data: query,
			})
				.then((response) => {
					const maxPages = parseInt(response?.max_pages, 10);

					if (
						cancelled ||
						!maxPages ||
						maxPages === baseQueryRef.current?.maxPages
					) {
						return;
					}

					setAttributes({
						baseQuery: {
							...baseQueryRef.current,
							maxPages,
						},
					});
				})
				.catch((error) => {
					// eslint-disable-next-line no-console
					console.error('Error fetching max pages:', error);
				});
		}, 500);

		return () => {
			cancelled = true;
			clearTimeout(timeout);
		};
	}, [queryKey, setAttributes]);

	useEffect(() => {
		if ('images' !== queryType || !Array.isArray(imagesQuery.images)) {
			return;
		}

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
	}, [queryType, setAttributes, imagesQuery]);

	const blockProps = useBlockProps({ className: 'vp-block-loop' });
	const innerBlocksProps = useInnerBlocksProps(
		{},
		{
			template: TEMPLATE,
		}
	);

	// Display block preview if needed.
	if ('true' === previewExample) {
		return (
			<div className="vpf-example-preview">
				<img
					src={`${pluginUrl}/assets/admin/images/example-${layout}.png`}
					alt={`Preview of ${layout} layout`}
				/>
			</div>
		);
	}

	return (
		<div {...blockProps}>
			<InspectorControls>{renderControls(props)}</InspectorControls>
			<div {...innerBlocksProps} />
		</div>
	);
}
