// index.js
import './style.scss';

import { isEqual } from 'lodash';

import apiFetch from '@wordpress/api-fetch';
import {
	InnerBlocks,
	InspectorControls,
	store as blockEditorStore,
	useBlockProps,
	useInnerBlocksProps,
} from '@wordpress/block-editor';
import { createBlock, registerBlockType } from '@wordpress/blocks';
import { Spinner } from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import { useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { addQueryArgs } from '@wordpress/url';

import ControlsRender from '../../components/controls-render';
import metadata from './block.json';

const ALLOWED_BLOCKS = ['visual-portfolio/filter-item'];

const Edit = ({ attributes, setAttributes, context, clientId }) => {
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

	const filterControls = {
		filter: {
			type: 'icons_selector',
			category: 'filter',
			label: false,
			name: 'filter',
			options: [
				{
					value: 'minimal',
					icon: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M0.879261 8.13636V12.5H1.77415V9.64915H1.81037L2.93963 12.4787H3.54901L4.67827 9.6598H4.71449V12.5H5.60938V8.13636H4.47159L3.26989 11.0682H3.21875L2.01705 8.13636H0.879261ZM10.0194 8.13636H9.10103V10.8807H9.06268L7.17915 8.13636H6.3695V12.5H7.29208V9.75355H7.32404L9.22248 12.5H10.0194V8.13636ZM10.7816 8.13636V12.5H11.6765V9.64915H11.7127L12.842 12.4787H13.4513L14.5806 9.6598H14.6168V12.5H15.5117V8.13636H14.3739L13.1722 11.0682H13.1211L11.9194 8.13636H10.7816ZM16.2718 12.5H19.0652V11.7393H17.1944V8.13636H16.2718V12.5Z" fill="currentColor"/></svg>',
					label: __('Minimal', 'visual-portfolio'),
				},
				{
					value: 'default',
					icon: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="0.75" y="5.89286" width="18.5" height="7.07143" rx="1.25" stroke="currentColor" stroke-width="1.5" fill="transparent"/><path d="M0.857143 11.1071V12.8214C0.857143 13.2948 1.2409 13.6786 1.71429 13.6786H18.2857C18.7591 13.6786 19.1429 13.2948 19.1429 12.8214V11.1071L19.5714 10.25C19.8081 10.25 20 10.4419 20 10.6786V12.8214C20 13.7682 19.2325 14.5357 18.2857 14.5357H1.71429C0.767512 14.5357 0 13.7682 0 12.8214V10.6786C0 10.4419 0.191878 10.25 0.428571 10.25L0.857143 11.1071Z" fill="currentColor"/></svg>',
					label: __('Classic', 'visual-portfolio'),
				},
				{
					value: 'dropdown',
					icon: '<svg width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M11 20.4286C16.2073 20.4286 20.4286 16.2073 20.4286 11C20.4286 5.79274 16.2073 1.57143 11 1.57143C5.79274 1.57143 1.57143 5.79274 1.57143 11C1.57143 16.2073 5.79274 20.4286 11 20.4286Z" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 9.85714L11 13.8571L15 9.85714" stroke="currentColor" stroke-width="1.5" fill="transparent" stroke-linecap="round" stroke-linejoin="round"/></svg>',
					label: __('Dropdown', 'visual-portfolio'),
				},
			],
			default: 'minimal',
		},
		filter_show_count: {
			type: 'checkbox',
			category: 'filter',
			label: false,
			name: 'filter_show_count',
			alongside: __('Display Count', 'visual-portfolio'),
			default: false,
		},
		filter_text_all: {
			type: 'text',
			category: 'filter',
			label: __('All Button Text', 'visual-portfolio'),
			name: 'filter_text_all',
			default: __('All', 'visual-portfolio'),
			wpml: true,
		},
	};

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
				return false;
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
							const isAll = newData.filter === '*';
							updatedBlocks.push({
								...block,
								attributes: {
									...block.attributes,
									text: isAll
										? attributes.filter_text_all
										: newData.label,
									filter: newData.filter,
									isAll,
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
									? attributes.filter_text_all
									: item.label,
								filter: item.filter,
								isAll,
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
		attributes.filter_text_all,
		replaceInnerBlocks,
		selectBlock,
		postId,
	]);

	const blockProps = useBlockProps({
		className: `wp-block-visual-portfolio-filter vp-filter__style-${attributes.filter || 'minimal'}`,
	});

	const innerBlocksProps = useInnerBlocksProps(
		{
			className: 'vp-filter__items',
		},
		{
			allowedBlocks: ALLOWED_BLOCKS,
			orientation: 'horizontal',
			renderAppender: false,
			templateLock: false, // Changed from 'all' to false to allow moving
		}
	);

	const renderFilter = () => {
		if (attributes.filter === 'dropdown') {
			return (
				<div className="vp-filter__dropdown-wrap">
					<select
						className="vp-filter__dropdown"
						value={
							currentBlocks.find(
								(block) => block.attributes.isActive
							)?.attributes.filter || '*'
						}
					>
						{currentBlocks.map((block) => {
							const { text, filter, isActive, count, isAll } =
								block.attributes;
							return (
								<option
									key={block.clientId}
									value={filter}
									data-vp-filter={filter}
									selected={isActive}
								>
									{text}
									{!isAll && count > 0 && ` (${count})`}
								</option>
							);
						})}
					</select>
				</div>
			);
		}

		return <div {...innerBlocksProps} />;
	};

	return (
		<>
			<InspectorControls>
				<ControlsRender
					category="filter"
					attributes={attributes}
					setAttributes={setAttributes}
					controls={filterControls}
					clientId={clientId}
				/>
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
					renderFilter()
				)}
			</div>
		</>
	);
};

const Save = ({ attributes }) => {
	const blockProps = useBlockProps.save({
		className: `vp-filter__style-${attributes.filter || 'minimal'}`,
	});

	return (
		<div {...blockProps}>
			<InnerBlocks.Content />
		</div>
	);
};

registerBlockType(metadata.name, {
	...metadata,
	edit: Edit,
	save: Save,
});
