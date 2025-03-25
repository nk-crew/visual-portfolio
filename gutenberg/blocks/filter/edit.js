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
import { addQueryArgs } from '@wordpress/url';

const ALLOWED_BLOCKS = ['visual-portfolio/filter-item'];

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
		'visual-portfolio/block_id': blockId,
		'visual-portfolio/content_source': contentSource,
		'visual-portfolio/posts_source': postsSource,
		'visual-portfolio/posts_taxonomies': postsTaxonomies,
		'visual-portfolio/images': images,
	} = context;

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
				blockId,
				contentSource,
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

			if (!blockId || (!hasContextChanged() && hasInnerBlocks)) {
				setIsLoading(false);
				return;
			}

			setIsLoading(true);

			try {
				const endpoint = '/visual-portfolio/v1/get_filter_items/';
				let queryArgs = {
					content_source: contentSource,
					block_id: blockId,
					post_id: postId,
				};

				if (contentSource === 'post-based') {
					queryArgs = {
						...queryArgs,
						posts_source: postsSource,
						posts_taxonomies: postsTaxonomies,
					};
				} else if (contentSource === 'images') {
					queryArgs = {
						...queryArgs,
						images: JSON.stringify(images),
					};
				}

				const response = await apiFetch({
					path: addQueryArgs(endpoint, queryArgs),
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
							return createBlock('visual-portfolio/filter-item', {
								text: isAll
									? __('All', 'visual-portfolio')
									: item.label,
								filter: item.filter,
								url: item.url,
								taxonomyId: item.id,
								parentId: item.parent,
								isActive: item.active,
								count: item.count || 0,
							});
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
		blockId,
		contentSource,
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
	]);

	const blockProps = useBlockProps({
		className: `wp-block-visual-portfolio-filter`,
	});

	const innerBlocksProps = useInnerBlocksProps(
		{},
		{
			allowedBlocks: ALLOWED_BLOCKS,
			orientation: 'horizontal',
			renderAppender: false,
			templateLock: false, // Changed from 'all' to false to allow moving
		}
	);

	return (
		<>
			<InspectorControls>
				<PanelBody>
					<ToggleControl
						label={__('Display Count', 'visual-portfolio')}
						value={attributes.showCount}
						onChange={() =>
							setAttributes({ showCount: !attributes.showCount })
						}
					/>
				</PanelBody>
			</InspectorControls>
			<div {...blockProps}>
				{isLoading ? (
					<div className="vp-filter__loading">
						<Spinner />
						<span>
							{__('Loading filters…', 'visual-portfolio')}
						</span>
					</div>
				) : (
					<div {...innerBlocksProps} />
				)}
			</div>
		</>
	);
}
