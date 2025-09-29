import { isEqual } from 'lodash';

import apiFetch from '@wordpress/api-fetch';
import {
	InspectorControls,
	store as blockEditorStore,
	useBlockProps,
	useInnerBlocksProps,
} from '@wordpress/block-editor';
import { createBlock } from '@wordpress/blocks';
import { PanelBody, Spinner, ToggleControl } from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import { useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

export default function BlockEdit({
	attributes,
	setAttributes,
	context,
	clientId,
}) {
	const [isLoading, setIsLoading] = useState(true);
	const previousContextRef = useRef(null);
	const initialLoadDone = useRef(false);

	const {
		'vp/queryType': queryType,
		'vp/baseQuery': baseQuery,
		'vp/imagesQuery': imagesQuery,
		'vp/postsQuery': postsQuery,
	} = context;

	const images = imagesQuery.images;
	const postsSource = postsQuery.source;
	const postsTaxonomies = postsQuery.taxonomies;

	const itemsCount = baseQuery?.perPage || 6;

	const { currentBlocks, hasInnerBlocks, selectedBlockClientId, postId } =
		useSelect(
			(select) => ({
				currentBlocks: select(blockEditorStore).getBlocks(clientId),
				hasInnerBlocks:
					select(blockEditorStore).getBlocks(clientId).length > 0,
				selectedBlockClientId:
					select(blockEditorStore).getSelectedBlockClientId(),
				postId: select('core/editor')?.getCurrentPostId(),
			}),
			[clientId]
		);

	const { replaceInnerBlocks, selectBlock } = useDispatch(blockEditorStore);

	useEffect(() => {
		const hasContextChanged = () => {
			const currentContext = {
				queryType,
				postsQuery,
				imagesQuery,
				postsSource,
				postsTaxonomies,
				images,
				postId,
			};

			if (!previousContextRef.current) {
				previousContextRef.current = currentContext;
				return true;
			}

			const hasChanged = !isEqual(
				previousContextRef.current,
				currentContext
			);
			if (hasChanged) {
				previousContextRef.current = currentContext;
			}

			return hasChanged;
		};

		const fetchFilterItems = async () => {
			if (hasInnerBlocks && !initialLoadDone.current) {
				initialLoadDone.current = true;
				setIsLoading(false);
				return;
			}

			if (!hasContextChanged() && hasInnerBlocks) {
				setIsLoading(false);
				return;
			}

			setIsLoading(true);

			try {
				const requestData = {
					baseQuery,
					imagesQuery,
					post_id: postId,
					postsQuery,
					queryType,
				};

				// Add block ID
				requestData.block_id = clientId;

				// Make API request with data in the body
				const response = await apiFetch({
					path: '/visual-portfolio/v1/get_filter_items/',
					method: 'POST',
					data: requestData, // Send data in request body instead of URL
				});

				if (response?.success) {
					const updatedBlocks = [];
					const processedFilters = new Set();

					// First, maintain order of existing blocks and update their data
					currentBlocks.forEach((block) => {
						const filterValue = block.attributes.filter;
						const newData = response.response.find(
							(item) => item.filter === filterValue
						);

						if (newData) {
							updatedBlocks.push({
								...block,
								attributes: {
									...block.attributes,
									text: newData.label,
									filter: newData.filter,
									url: newData.url,
									taxonomyId: newData.id,
									parentId: newData.parent,
									isActive: newData.active,
									count: newData.count || 0,
								},
							});
							processedFilters.add(filterValue);
						}
					});

					// Add new blocks that don't exist in current blocks
					const newBlocks = response.response
						.filter((item) => !processedFilters.has(item.filter))
						.map((item) => {
							const isAll = item.filter === '*';
							return createBlock(
								'visual-portfolio/filter-by-category-item',
								{
									text: isAll
										? __('All', 'visual-portfolio')
										: item.label,
									filter: item.filter,
									url: item.url,
									taxonomyId: item.id,
									parentId: item.parent,
									isActive: item.active,
									count: item.count || 0,
								}
							);
						});

					// Combine updated blocks with new ones
					const finalBlocks = [...updatedBlocks, ...newBlocks];

					// Store the current selection
					const currentSelection = selectedBlockClientId;

					// Update blocks
					replaceInnerBlocks(clientId, finalBlocks, false);

					// Restore the selection
					if (currentSelection && currentSelection !== clientId) {
						setTimeout(() => {
							selectBlock(currentSelection);
						}, 0);
					}
				}
			} catch (error) {
				// eslint-disable-next-line no-console
				console.error('Error fetching filter items:', error);
			}

			setIsLoading(false);
		};

		fetchFilterItems();
	}, [
		queryType,
		postsSource,
		postsTaxonomies,
		images,
		clientId,
		hasInnerBlocks,
		currentBlocks,
		selectedBlockClientId,
		replaceInnerBlocks,
		selectBlock,
		postId,
		itemsCount,
		attributes.showCount,
		baseQuery,
		imagesQuery,
		postsQuery,
	]);

	useEffect(() => {
		if (hasInnerBlocks && !isLoading) {
			// Force re-render of inner blocks when showCount changes
			const updatedBlocks = currentBlocks.map((block) => ({
				...block,
				attributes: {
					...block.attributes,
					// This will trigger a re-render
					__timestamp: Date.now(),
				},
			}));
			replaceInnerBlocks(clientId, updatedBlocks, false);
		}
	}, [attributes.showCount]);

	const blockProps = useBlockProps({
		className: 'vp-block-filter-by-category',
	});

	const innerBlocksProps = useInnerBlocksProps(blockProps, {
		orientation: 'horizontal',
		renderAppender: false,
		templateLock: false, // Changed from 'all' to false to allow moving
	});

	return (
		<>
			<InspectorControls>
				<PanelBody>
					<ToggleControl
						label={__('Display Count', 'visual-portfolio')}
						checked={attributes.showCount}
						onChange={() =>
							setAttributes({ showCount: !attributes.showCount })
						}
					/>
				</PanelBody>
			</InspectorControls>
			{isLoading ? (
				<div {...blockProps}>
					<Spinner />
				</div>
			) : (
				<div {...innerBlocksProps} />
			)}
		</>
	);
}
