import apiFetch from '@wordpress/api-fetch';
import {
	store as blockEditorStore,
	InspectorControls,
	useBlockProps,
	useInnerBlocksProps,
} from '@wordpress/block-editor';
import { createBlock } from '@wordpress/blocks';
import {
	Disabled,
	SelectControl,
	Spinner,
	TextControl,
	ToggleControl,
	__experimentalToggleGroupControl as ToggleGroupControl,
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
	__experimentalToolsPanel as ToolsPanel,
	__experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';
import { useDispatch, useSelect } from '@wordpress/data';
import { useEffect, useRef, useState } from '@wordpress/element';
import { applyFilters } from '@wordpress/hooks';
import { __, sprintf } from '@wordpress/i18n';
import { create } from '@wordpress/rich-text';
import classnames from 'classnames/dedupe';

/**
 * Internal dependencies
 */
import ProBlockNote from '../../components/pro-block-note';
import { getMissingTeasers } from '../../components/pro-teaser';
import { useLoopOrphanWarning } from '../../utils/loop-orphan-warning';
import { loopSourceSupports } from '../../utils/loop-source-supports';
import {
	getResetAllValues,
	useToolsPanelDropdownMenuProps,
} from '../../utils/tools-panel';

const ITEM_BLOCK = 'visual-portfolio/loop-filter-item';

const { pro: isProPlugin } = window.VPGutenbergVariables || {};

const DISPLAY_OPTIONS = [
	{
		value: 'buttons',
		label: __('Buttons', 'visual-portfolio'),
		isSelected: (attributes) => !attributes.displayAsDropdown,
		select: () => ({ displayAsDropdown: false }),
	},
	{
		value: 'dropdown',
		label: __('Dropdown', 'visual-portfolio'),
		isSelected: (attributes) => !!attributes.displayAsDropdown,
		select: () => ({ displayAsDropdown: true }),
	},
];

const PRO_SETTINGS = [
	{
		name: 'filterBy',
		label: __('Filter by', 'visual-portfolio'),
		line: __(
			'Pick the taxonomy, or the image categories, this filter lists, and put several filters in one gallery.',
			'visual-portfolio'
		),
		campaign: 'teaser_loop_filter_by',
	},
	{
		name: 'selection',
		label: __('Several terms', 'visual-portfolio'),
		line: __(
			'Let visitors choose more than one term at a time.',
			'visual-portfolio'
		),
		campaign: 'teaser_loop_filter_selection',
	},
	{
		name: 'childTerms',
		label: __('Child terms', 'visual-portfolio'),
		line: __(
			'Show child terms under their parent, or once a parent is chosen.',
			'visual-portfolio'
		),
		campaign: 'teaser_loop_filter_child_terms',
	},
	{
		name: 'hideEmpty',
		label: __('Hide empty terms', 'visual-portfolio'),
		line: __(
			'Leave out the terms the other filters leave without items.',
			'visual-portfolio'
		),
		campaign: 'teaser_loop_filter_hide_empty',
	},
];

/**
 * Items sorted the way the page sorts them.
 *
 * A mirror of `Visual_Portfolio_Block_Loop_Filter::sort_items()`: "All"
 * leads, then the terms by label, or by count with the label breaking ties.
 *
 * @param {Array}  blocks - filter item blocks.
 * @param {string} order  - `manual`, `name` or `count`.
 * @return {Array} sorted blocks, the same array when nothing sorts.
 */
function sortItems(blocks, order) {
	if ('name' !== order && 'count' !== order) {
		return blocks;
	}

	const label = (block) => create({ html: block.attributes.text || '' }).text;
	const all = blocks.filter((block) => '*' === block.attributes.filter);
	const terms = blocks
		.filter((block) => '*' !== block.attributes.filter)
		.sort((a, b) => {
			if ('count' === order) {
				const byCount =
					(b.attributes.count || 0) - (a.attributes.count || 0);

				if (byCount) {
					return byCount;
				}
			}

			return label(a).localeCompare(label(b), undefined, {
				numeric: true,
				sensitivity: 'base',
			});
		});

	return [...all, ...terms];
}

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

/**
 * Text of the option an item is in a dropdown, as the page prints it.
 *
 * @param {Object}  attributes - filter item attributes.
 * @param {boolean} showCount  - whether the counts are shown.
 * @return {string} option text.
 */
function getOptionText({ text, filter, count }, showCount) {
	const label = create({ html: text || '' }).text;

	if (!showCount || '*' === filter || !count) {
		return label;
	}

	return sprintf(
		// translators: 1: category name, 2: number of items in it.
		__('%1$s (%2$s)', 'visual-portfolio'),
		label,
		count
	);
}

export default function BlockEdit({
	attributes,
	setAttributes,
	context,
	clientId,
	isSelected,
	__unstableLayoutClassNames: layoutClassNames,
}) {
	const dropdownMenuProps = useToolsPanelDropdownMenuProps();

	const {
		showCount,
		showAllItem,
		displayAsDropdown,
		label,
		order: termOrder,
		extensions,
	} = attributes;
	const facet = extensions?.facet;
	const hasFacet =
		!!facet && 'object' === typeof facet && !!Object.keys(facet).length;

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
		termOrder,
		facet: hasFacet ? facet : null,
	});

	// Another kind of source, or other post types, is a new set of terms: the
	// items are rebuilt from it. Anything else narrows or widens the set, and
	// the items the user labelled stay as they are.
	const sourceKey = JSON.stringify({
		queryType,
		source: postsQuery?.source,
		postTypesSet: postsQuery?.postTypesSet,
		facetBy: hasFacet ? facet.by : null,
		facetChosen: hasFacet ? facet.chosen : null,
	});

	useEffect(() => {
		// Without Pro nothing lists this filter's terms, and the default ones
		// would be saved into it.
		if (syncedQueryRef.current === queryKey || (hasFacet && !isProPlugin)) {
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
				extensions,
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

				const sortedBlocks = sortItems(updatedBlocks, termOrder);

				// Untouched items are returned by identity, so this also tells
				// us whether anything is worth writing to the editor store.
				const isUnchanged =
					sortedBlocks.length === currentBlocks.length &&
					sortedBlocks.every(
						(block, index) => block === currentBlocks[index]
					);

				if (!isUnchanged) {
					// The page lists the terms by itself, so what opening the
					// post brings in is shown without marking the post edited.
					if (isOpening) {
						__unstableMarkNextChangeAsNotPersistent();
					}

					replaceInnerBlocks(clientId, sortedBlocks, false);
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
		termOrder,
		extensions,
		hasFacet,
		postId,
		clientId,
		getBlocks,
		replaceInnerBlocks,
		__unstableMarkNextChangeAsNotPersistent,
	]);

	// What a dropdown lists, and whether its items are being edited.
	const { itemBlocks, isEditingItems } = useSelect(
		(select) => {
			const store = select(blockEditorStore);

			return {
				itemBlocks: store.getBlocks(clientId),
				isEditingItems: store.hasSelectedInnerBlock(clientId, true),
			};
		},
		[clientId]
	);

	// The editor gives the layout classes to the element that holds the inner
	// blocks, and the wrapper of a dropdown holds the select.
	const blockProps = useBlockProps({
		className: classnames(
			'vp-block-loop-filter',
			displayAsDropdown && layoutClassNames
		),
	});

	// A dropdown shows its items under the select while the filter or one of
	// them is selected, so their labels and order can still be edited.
	const innerBlocksProps = useInnerBlocksProps(
		displayAsDropdown
			? { className: 'vp-block-loop-filter__options' }
			: blockProps,
		{
			orientation: 'horizontal',
			renderAppender: false,
			// A sorted list is arranged by its order, not by hand.
			templateLock: 'manual' === termOrder ? false : 'all',
		}
	);

	// The page leaves hidden items out and marks "All" active, since the
	// editor has no filter in its URL. Without "All" it asks for a category
	// instead.
	const options = itemBlocks.filter(
		(item) => false !== item.attributes.metadata?.blockVisibility
	);
	const allOption = options.find((item) => '*' === item.attributes.filter);

	let content = <div {...innerBlocksProps} />;

	if (hasFacet && !isProPlugin) {
		content = (
			<div {...blockProps}>
				<ProBlockNote
					title={__(
						'This filter is set up in Pro',
						'visual-portfolio'
					)}
					campaign="teaser_loop_filter_note"
				>
					{__(
						'Visitors see nothing here until Visual Portfolio Pro is active. Its settings are kept.',
						'visual-portfolio'
					)}
				</ProBlockNote>
			</div>
		);
	} else if (isLoading) {
		content = (
			<div {...blockProps}>
				<Spinner />
			</div>
		);
	} else if (displayAsDropdown) {
		content = (
			<div {...blockProps}>
				<Disabled>
					<select value={allOption?.clientId ?? ''} readOnly>
						{!allOption && (
							<option value="" disabled>
								{label.trim() ||
									__('Select category', 'visual-portfolio')}
							</option>
						)}
						{options.map((item) => (
							<option key={item.clientId} value={item.clientId}>
								{getOptionText(item.attributes, showCount)}
							</option>
						))}
					</select>
				</Disabled>
				{(isSelected || isEditingItems) && (
					<div {...innerBlocksProps} />
				)}
			</div>
		);
	}

	const displayOptions = applyFilters(
		'vpf.loopFilterDisplayOptions',
		DISPLAY_OPTIONS,
		{ attributes }
	);

	const displayValue =
		[...displayOptions]
			.reverse()
			.find((option) => option.isSelected(attributes))?.value ||
		'buttons';

	const settingsItems = applyFilters('vpf.loopFilterSettingsItems', [], {
		attributes,
		setAttributes,
		context,
		clientId,
	});
	const teasers = getMissingTeasers(settingsItems, PRO_SETTINGS, {
		attributes,
	});

	return (
		<>
			<InspectorControls>
				<ToolsPanel
					label={__('Settings', 'visual-portfolio')}
					resetAll={(filters) =>
						setAttributes(
							getResetAllValues(filters, {
								...displayOptions[0].select(attributes),
								label: '',
								order: 'manual',
								showCount: false,
								showAllItem: true,
							})
						)
					}
					dropdownMenuProps={dropdownMenuProps}
				>
					{!loopSourceSupports(queryType, 'filter') && (
						<p style={{ gridColumn: '1 / -1', margin: 0 }}>
							{__(
								'Filtering is not available for this source, so the page shows no filter.',
								'visual-portfolio'
							)}
						</p>
					)}
					<ToolsPanelItem
						label={__('Display as', 'visual-portfolio')}
						isShownByDefault
						hasValue={() => displayValue !== 'buttons'}
						onDeselect={() =>
							setAttributes(displayOptions[0].select(attributes))
						}
					>
						<ToggleGroupControl
							__next40pxDefaultSize
							__nextHasNoMarginBottom
							isBlock
							label={__('Display as', 'visual-portfolio')}
							value={displayValue}
							onChange={(value) => {
								const option = displayOptions.find(
									(candidate) => candidate.value === value
								);

								if (option) {
									setAttributes(option.select(attributes));
								}
							}}
						>
							{displayOptions.map((option) => (
								<ToggleGroupControlOption
									key={option.value}
									value={option.value}
									label={option.label}
								/>
							))}
						</ToggleGroupControl>
					</ToolsPanelItem>
					<ToolsPanelItem
						label={__('Label', 'visual-portfolio')}
						isShownByDefault
						hasValue={() => !!label}
						onDeselect={() => setAttributes({ label: '' })}
					>
						<TextControl
							__next40pxDefaultSize
							__nextHasNoMarginBottom
							label={__('Label', 'visual-portfolio')}
							help={__(
								'The name screen readers give the filter, and the prompt of its dropdown.',
								'visual-portfolio'
							)}
							placeholder={__(
								'Category filter',
								'visual-portfolio'
							)}
							value={label}
							onChange={(value) =>
								setAttributes({ label: value })
							}
						/>
					</ToolsPanelItem>
					<ToolsPanelItem
						label={__('Order', 'visual-portfolio')}
						isShownByDefault
						hasValue={() => 'manual' !== termOrder}
						onDeselect={() => setAttributes({ order: 'manual' })}
					>
						<SelectControl
							__next40pxDefaultSize
							__nextHasNoMarginBottom
							label={__('Order', 'visual-portfolio')}
							value={termOrder}
							options={[
								{
									value: 'manual',
									label: __(
										'As arranged in the editor',
										'visual-portfolio'
									),
								},
								{
									value: 'name',
									label: __('Name', 'visual-portfolio'),
								},
								{
									value: 'count',
									label: __(
										'Number of items',
										'visual-portfolio'
									),
								},
							]}
							onChange={(value) =>
								setAttributes({ order: value })
							}
						/>
					</ToolsPanelItem>
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
					{settingsItems.map(({ name, Item }) => (
						<Item
							key={name}
							attributes={attributes}
							setAttributes={setAttributes}
							context={context}
							clientId={clientId}
						/>
					))}

					{teasers.map(({ name, Item }) => (
						<Item key={name} clientId={clientId} />
					))}
				</ToolsPanel>
			</InspectorControls>
			{content}
		</>
	);
}
