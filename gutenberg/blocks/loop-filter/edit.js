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
import {
	getResetAllValues,
	useToolsPanelDropdownMenuProps,
} from '../../utils/tools-panel';

const ITEM_BLOCK = 'visual-portfolio/loop-filter-item';

// What names the term of an item. Every other attribute is its style, which an
// item added for a new term takes from the first term item, as the page does.
const IDENTITY_ATTRIBUTES = [
	'text',
	'filter',
	'taxonomyId',
	'count',
	'anchor',
	'metadata',
	'lock',
];

/**
 * Identify a filter item.
 *
 * A mirror of `Visual_Portfolio_Filter_Terms::get_key()`: the term id, which
 * survives a new slug, and the slug for image categories, which are not terms
 * and all report id 0.
 *
 * @param {Object} item - filter item from the REST response or block attributes.
 * @return {string} unique key.
 */
function getItemKey(item) {
	const id = item.id ?? item.taxonomyId ?? 0;

	return id ? `term:${id}` : `slug:${item.filter}`;
}

/**
 * Attributes this block owns and keeps in sync with the query.
 *
 * @param {Object}  item                - filter item from the REST response.
 * @param {Object}  [options]           - sync options.
 * @param {boolean} [options.keepLabel] - leave the label as it is.
 * @return {Object} block attributes.
 */
function getItemAttributes(item, { keepLabel = false } = {}) {
	const isAll = '*' === item.filter;

	const attributes = {
		filter: item.filter,
		taxonomyId: item.id,
		count: item.count || 0,
	};

	if (!keepLabel) {
		attributes.text = isAll ? __('All', 'visual-portfolio') : item.label;
	}

	return attributes;
}

/**
 * The style an item added for a new term takes.
 *
 * @param {Array} blocks - items of the filter.
 * @return {Object} attributes of the first term item, else of the "All" item,
 *                  without those that name the term.
 */
function getNewItemStyle(blocks) {
	const template =
		blocks.find((block) => '*' !== block.attributes.filter) ||
		blocks.find((block) => '*' === block.attributes.filter);

	return Object.fromEntries(
		Object.entries(template?.attributes || {}).filter(
			([name]) => !IDENTITY_ATTRIBUTES.includes(name)
		)
	);
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

	// Keys of the state the current items were synced for. Items live in the
	// post content, so there is nothing to sync until the query - or the choice
	// of whether to keep the "All" item - changes.
	const syncedQueryRef = useRef(null);
	const syncedSourceRef = useRef(null);

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
	const { replaceInnerBlocks, __unstableMarkNextChangeAsNotPersistent } =
		useDispatch(blockEditorStore);

	// This block does not use the `url` the endpoint returns - it is rebuilt at
	// render time - but the endpoint is public and needs the post to build it.
	const postId = useSelect(
		(select) => select('core/editor')?.getCurrentPostId(),
		[]
	);

	// What decides which terms there are: a manual selection, a custom query
	// or an exclusion as much as the source. The order and the paging do not,
	// and a sync after them would put the term names back over edited labels.
	const {
		order,
		orderBy,
		offset,
		avoidDuplicates,
		excludeCurrent,
		...termsQuery
	} = postsQuery || {};
	const queryKey = JSON.stringify({
		queryType,
		termsQuery,
		// Of an image, only its categories are terms.
		imageCategories: (imagesQuery?.images || []).map(
			(image) => image.categories || []
		),
		sourceQuery,
		showAllItem,
	});

	// Another kind of source, or other post types, is a new set of terms: the
	// items are rebuilt from it. Anything else narrows or widens the set, and
	// the items the user labelled stay as they are.
	const sourceKey = JSON.stringify({
		queryType,
		source: postsQuery?.source,
		postTypesSet: postsQuery?.postTypesSet,
	});

	useEffect(() => {
		if (syncedQueryRef.current === queryKey) {
			return undefined;
		}

		// Saved content already carries its items, so the first sync only fills
		// in what is missing instead of rewriting what is there.
		const isOpening = null === syncedQueryRef.current;
		const isRebuild = !isOpening && syncedSourceRef.current !== sourceKey;
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
						// Only a new set of terms drops an item: one the query
						// no longer returns may be hand-made, its `lock` forbids
						// removing it by hand, and the page skips it anyway.
						if (!isRebuild) {
							updatedBlocks.push(block);
						}

						return;
					}

					matched.add(key);

					const newAttributes = getItemAttributes(item, {
						keepLabel: !isRebuild,
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
				const newItemStyle = getNewItemStyle(keptBlocks);

				items.forEach((item) => {
					if (matched.has(getItemKey(item))) {
						return;
					}

					// The page adds a plain "All", and styles the terms only.
					const block = createBlock(ITEM_BLOCK, {
						...('*' === item.filter ? {} : newItemStyle),
						...getItemAttributes(item),
					});

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
					// The page lists the terms by itself, so what opening the
					// post brings in is shown without marking the post edited.
					if (isOpening) {
						__unstableMarkNextChangeAsNotPersistent();
					}

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
				syncedSourceRef.current = sourceKey;

				setIsLoading(false);
			});

		return () => {
			cancelled = true;
		};
	}, [
		queryKey,
		sourceKey,
		queryType,
		baseQuery,
		postsQuery,
		imagesQuery,
		showAllItem,
		postId,
		clientId,
		getBlocks,
		replaceInnerBlocks,
		__unstableMarkNextChangeAsNotPersistent,
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
					resetAll={(filters) =>
						setAttributes(
							getResetAllValues(filters, {
								showCount: false,
								showAllItem: true,
							})
						)
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
