import apiFetch from '@wordpress/api-fetch';
import {
	store as blockEditorStore,
	InspectorControls,
	useBlockProps,
	useInnerBlocksProps,
} from '@wordpress/block-editor';
import { createBlock } from '@wordpress/blocks';
import {
	Spinner,
	ToggleControl,
	__experimentalToolsPanel as ToolsPanel,
	__experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import { useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { useLoopOrphanWarning } from '../../utils/loop-orphan-warning';
import { useToolsPanelDropdownMenuProps } from '../../utils/tools-panel';

const ITEM_BLOCK = 'visual-portfolio/loop-filter-item';

/**
 * Identify a filter item.
 *
 * Term IDs are used where available and the filter slug otherwise, since image
 * categories are not terms and all report ID 0. Matching on the slug alone
 * would collide between two taxonomies sharing a slug.
 *
 * @param {Object} item - filter item from the REST response or block attributes.
 * @return {string} unique key.
 */
function getItemKey(item) {
	const id = item.id ?? item.taxonomyId ?? 0;

	return `${id}:${item.filter}`;
}

/**
 * Attributes this block owns and keeps in sync with the query.
 *
 * @param {Object}  item                  - filter item from the REST response.
 * @param {Object}  [options]             - sync options.
 * @param {boolean} [options.structureOnly] - first sync of already saved items.
 * @param {Object}  [options.current]     - attributes the item already has.
 * @return {Object} block attributes.
 */
function getItemAttributes(
	item,
	{ structureOnly = false, current = null } = {}
) {
	const isAll = '*' === item.filter;

	const attributes = {
		filter: item.filter,
		isAll,
		taxonomyId: item.id,
		parentId: item.parent,
	};

	// The label can be edited by hand, so the first sync leaves it as saved.
	if (!structureOnly) {
		attributes.text = isAll ? __('All', 'visual-portfolio') : item.label;
	}

	// Counts are server data, but rewriting a count that merely drifted would
	// mark the post as modified just from opening it. A missing count is filled
	// in regardless, otherwise "Display Count" has nothing to show.
	if (!structureOnly || !current?.count) {
		attributes.count = item.count || 0;
	}

	return attributes;
}

export default function BlockEdit({
	attributes,
	setAttributes,
	context,
	clientId,
}) {
	const dropdownMenuProps = useToolsPanelDropdownMenuProps();

	const { showCount, showAllItem } = attributes;

	useLoopOrphanWarning('visual-portfolio/loop-filter', context);

	const [isLoading, setIsLoading] = useState(false);

	// Key of the state the current items were synced for. Items live in the
	// post content, so there is nothing to sync until the query - or the choice
	// of whether to keep the "All" item - changes.
	const syncedQueryRef = useRef(null);

	const {
		'vp/queryType': queryType,
		'vp/baseQuery': baseQuery,
		'vp/imagesQuery': imagesQuery,
		'vp/postsQuery': postsQuery,
		'vp/sourceQuery': sourceQuery,
	} = context;

	// Selectors are read inside the effect: the items are driven by the query,
	// and depending on the block list would re-run the effect on its own writes.
	const { getBlocks } = useSelect(blockEditorStore);
	const { replaceInnerBlocks } = useDispatch(blockEditorStore);

	// This block does not use the `url` the endpoint returns - it is rebuilt at
	// render time - but the endpoint is public and needs the post to build it.
	const postId = useSelect(
		(select) => select('core/editor')?.getCurrentPostId(),
		[]
	);

	const queryKey = JSON.stringify({
		queryType,
		source: postsQuery?.source,
		taxonomies: postsQuery?.taxonomies,
		images: imagesQuery?.images,
		sourceQuery,
		showAllItem,
	});

	useEffect(() => {
		if (syncedQueryRef.current === queryKey) {
			return undefined;
		}

		// Saved content already carries its items, so the first sync only fills
		// in what is missing instead of rewriting what is there.
		const structureOnly = null === syncedQueryRef.current;
		const currentBlocks = getBlocks(clientId);

		// The "All" item is one of the synced items, so hiding it means
		// dropping it: an item left in the block list is still rendered.
		const keptBlocks = showAllItem
			? currentBlocks
			: currentBlocks.filter((block) => '*' !== block.attributes.filter);

		let cancelled = false;

		if (!currentBlocks.length) {
			setIsLoading(true);
		}

		apiFetch({
			path: '/visual-portfolio/v1/get_filter_items/',
			method: 'POST',
			data: {
				queryType,
				baseQuery,
				postsQuery,
				imagesQuery,
				sourceQuery,
				post_id: postId,
				block_id: clientId,
			},
		})
			.then((response) => {
				if (cancelled || !response?.success) {
					return;
				}

				const items = showAllItem
					? response.response
					: response.response.filter((item) => '*' !== item.filter);
				const matched = new Set();

				// Keep the existing items in their current order, so manual
				// reordering survives a refresh.
				const updatedBlocks = [];

				keptBlocks.forEach((block) => {
					const key = getItemKey(block.attributes);
					const item = items.find(
						(candidate) => getItemKey(candidate) === key
					);

					if (!item) {
						// Opening a post must not delete what it already
						// carries: an item the query no longer returns may be
						// hand-made, and its `lock` forbids removing it by hand.
						if (structureOnly) {
							updatedBlocks.push(block);
						}

						return;
					}

					matched.add(key);

					const newAttributes = getItemAttributes(item, {
						structureOnly,
						current: block.attributes,
					});
					const hasChanges = Object.keys(newAttributes).some(
						(name) => block.attributes[name] !== newAttributes[name]
					);

					updatedBlocks.push(
						hasChanges
							? {
									...block,
									attributes: {
										...block.attributes,
										...newAttributes,
									},
								}
							: block
					);
				});

				// Append the items that are not in the block list yet. The
				// "All" item is the one that resets the filter, so it leads
				// the list rather than trailing the categories it resets.
				items.forEach((item) => {
					if (matched.has(getItemKey(item))) {
						return;
					}

					const block = createBlock(
						ITEM_BLOCK,
						getItemAttributes(item)
					);

					if ('*' === item.filter) {
						updatedBlocks.unshift(block);
					} else {
						updatedBlocks.push(block);
					}
				});

				// Untouched items are returned by identity, so this also tells
				// us whether anything is worth writing to the editor store.
				const isUnchanged =
					updatedBlocks.length === currentBlocks.length &&
					updatedBlocks.every(
						(block, index) => block === currentBlocks[index]
					);

				if (!isUnchanged) {
					replaceInnerBlocks(clientId, updatedBlocks, false);
				}
			})
			.catch((error) => {
				// eslint-disable-next-line no-console
				console.error('Error fetching filter items:', error);
			})
			.finally(() => {
				if (cancelled) {
					return;
				}

				// Marked even when the request failed, so a single failure does
				// not pin every later sync to the first-sync behaviour.
				syncedQueryRef.current = queryKey;

				setIsLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, [
		queryKey,
		queryType,
		baseQuery,
		postsQuery,
		imagesQuery,
		showAllItem,
		postId,
		clientId,
		getBlocks,
		replaceInnerBlocks,
	]);

	const blockProps = useBlockProps({
		className: 'vp-block-loop-filter',
	});

	const innerBlocksProps = useInnerBlocksProps(blockProps, {
		orientation: 'horizontal',
		renderAppender: false,
		templateLock: false,
	});

	return (
		<>
			<InspectorControls>
				<ToolsPanel
					label={__('Settings', 'visual-portfolio')}
					resetAll={() =>
						setAttributes({
							showCount: false,
							showAllItem: true,
						})
					}
					dropdownMenuProps={dropdownMenuProps}
				>
					<ToolsPanelItem
						label={__('Display Count', 'visual-portfolio')}
						isShownByDefault
						hasValue={() => showCount}
						onDeselect={() => setAttributes({ showCount: false })}
					>
						<ToggleControl
							label={__('Display Count', 'visual-portfolio')}
							help={__(
								'Show how many items each category holds.',
								'visual-portfolio'
							)}
							checked={showCount}
							onChange={() =>
								setAttributes({ showCount: !showCount })
							}
						/>
					</ToolsPanelItem>
					<ToolsPanelItem
						label={__("Show 'All' item", 'visual-portfolio')}
						isShownByDefault
						hasValue={() => !showAllItem}
						onDeselect={() => setAttributes({ showAllItem: true })}
					>
						<ToggleControl
							label={__("Show 'All' item", 'visual-portfolio')}
							help={__(
								'The item that clears the filter and brings the whole gallery back.',
								'visual-portfolio'
							)}
							checked={showAllItem}
							onChange={() =>
								setAttributes({ showAllItem: !showAllItem })
							}
						/>
					</ToolsPanelItem>
				</ToolsPanel>
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
