/**
 * WordPress dependencies
 */
import {
	__experimentalBlockPatternsList as BlockPatternsList,
	store as blockEditorStore,
} from '@wordpress/block-editor';
import { cloneBlock, createBlock } from '@wordpress/blocks';
import {
	Button,
	__experimentalHStack as HStack,
	Modal,
	SelectControl,
	ToggleControl,
	__experimentalVStack as VStack,
} from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { useMemo, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

const BLOCK_NAME = 'visual-portfolio/loop';
const FILTER_NAME = 'visual-portfolio/loop-filter';
const PAGINATION_NAME = 'visual-portfolio/loop-pagination';

// Blocks whose click action the lightbox toggle owns.
const CLICKABLE_NAMES = [
	'visual-portfolio/item-image',
	'visual-portfolio/item-cover',
];

const PAGINATION_OPTIONS = [
	{ label: __('Page numbers', 'visual-portfolio'), value: 'paged' },
	{ label: __('Load more', 'visual-portfolio'), value: 'load-more' },
	{ label: __('Infinite scroll', 'visual-portfolio'), value: 'infinite' },
	{ label: __('None', 'visual-portfolio'), value: 'none' },
];

// What each pagination shape is made of. The pagination block is a container;
// which of these it holds is the whole difference between them.
const PAGINATION_INNER = {
	paged: [
		'visual-portfolio/loop-pagination-previous',
		'visual-portfolio/loop-pagination-numbers',
		'visual-portfolio/loop-pagination-next',
	],
	'load-more': ['visual-portfolio/loop-pagination-load-more'],
	infinite: ['visual-portfolio/loop-pagination-infinite'],
};

/**
 * The loop of a pattern, whichever depth it sits at.
 *
 * A pattern is written as a whole loop block, so what is inserted is its inner
 * blocks - the block the user already has keeps its id, its alignment and the
 * source they picked.
 *
 * @param {Array} blocks - blocks of the pattern.
 * @return {Object|null} the loop block.
 */
function findLoop(blocks) {
	for (const block of blocks) {
		if (BLOCK_NAME === block.name) {
			return block;
		}

		const nested = block.innerBlocks?.length
			? findLoop(block.innerBlocks)
			: null;

		if (nested) {
			return nested;
		}
	}

	return null;
}

/**
 * Set the click action of every item picture in a tree.
 *
 * @param {Array}  blocks - blocks to walk.
 * @param {string} action - click action to set.
 * @return {Array} blocks.
 */
function setClickAction(blocks, action) {
	return blocks.map((block) => {
		const attributes = CLICKABLE_NAMES.includes(block.name)
			? { ...block.attributes, clickAction: action }
			: block.attributes;

		return {
			...block,
			attributes,
			innerBlocks: setClickAction(block.innerBlocks || [], action),
		};
	});
}

/**
 * Apply the starting choices to the blocks of a pattern.
 *
 * @param {Array}  blocks     - inner blocks of the pattern's loop.
 * @param {Object} choices    - what the wizard asked.
 * @return {Array} blocks to insert.
 */
function applyChoices(blocks, choices) {
	let result = blocks.filter(
		(block) =>
			(FILTER_NAME !== block.name || choices.filter) &&
			(PAGINATION_NAME !== block.name || 'none' !== choices.pagination)
	);

	if (choices.filter && !result.some(({ name }) => FILTER_NAME === name)) {
		result = [
			createBlock(FILTER_NAME, {}, [
				// The placeholder the filter block replaces once it has fetched
				// its terms. It carries the default `*`, so the fetched "All"
				// reuses it.
				createBlock('visual-portfolio/loop-filter-item', {
					text: __('All', 'visual-portfolio'),
					isAll: true,
				}),
			]),
			...result,
		];
	}

	if ('none' !== choices.pagination) {
		const inner = PAGINATION_INNER[choices.pagination].map((name) =>
			createBlock(name)
		);
		const index = result.findIndex(({ name }) => PAGINATION_NAME === name);
		const pagination = createBlock(PAGINATION_NAME, {}, inner);

		if (-1 === index) {
			result = [...result, pagination];
		} else {
			result = result.map((block, current) =>
				current === index ? pagination : block
			);
		}
	}

	return setClickAction(result, choices.lightbox ? 'popup' : 'none');
}

/**
 * Choose a starting point for a gallery.
 *
 * The patterns are the ones registered with
 * `Block Types: visual-portfolio/loop`, the same mechanic the core Query block
 * uses - and they are previewed with the source the user has already picked, so
 * what the list shows is this gallery in each of its shapes rather than a
 * stranger's photographs.
 *
 * @param {Object}   props               - component props.
 * @param {Object}   props.attributes    - loop attributes.
 * @param {string}   props.clientId      - loop client id.
 * @param {Function} props.onChoose      - called with the blocks to insert.
 * @param {Function} props.onStartBlank  - called when the user wants none of them.
 * @param {Function} props.onCancel      - closes the chooser without choosing.
 * @return {Element} component.
 */
export default function PatternSetup({
	attributes,
	clientId,
	onChoose,
	onStartBlank,
	onCancel,
}) {
	const [choices, setChoices] = useState({
		filter: false,
		pagination: 'paged',
		lightbox: true,
	});

	const patterns = useSelect(
		(select) => {
			const { getBlockRootClientId, getPatternsByBlockTypes } =
				select(blockEditorStore);

			return getPatternsByBlockTypes(
				BLOCK_NAME,
				getBlockRootClientId(clientId)
			);
		},
		[clientId]
	);

	const { queryType, baseQuery, postsQuery, imagesQuery, sourceQuery } =
		attributes;

	// Every preview is the pattern with this gallery's own source in it. The
	// pattern decides the layout and the item blocks; nothing else of it
	// survives.
	const previews = useMemo(
		() =>
			patterns
				.map((pattern) => {
					const loop = findLoop(pattern.blocks);

					if (!loop) {
						return null;
					}

					const preview = cloneBlock(loop, {
						...loop.attributes,
						queryType,
						baseQuery: {
							...loop.attributes.baseQuery,
							perPage: baseQuery?.perPage,
						},
						postsQuery,
						imagesQuery,
						sourceQuery,
					});

					return {
						...pattern,
						blocks: [preview],
						innerBlocks: preview.innerBlocks,
					};
				})
				.filter(Boolean),
		[
			patterns,
			queryType,
			baseQuery?.perPage,
			postsQuery,
			imagesQuery,
			sourceQuery,
		]
	);

	return (
		<Modal
			title={__('Choose a gallery', 'visual-portfolio')}
			className="vpf-loop-setup"
			isFullScreen
			onRequestClose={onCancel}
		>
			<VStack spacing={6}>
				<HStack
					className="vpf-loop-setup__choices"
					spacing={4}
					justify="flex-start"
					wrap
				>
					<ToggleControl
						__nextHasNoMarginBottom
						label={__('Filter', 'visual-portfolio')}
						checked={choices.filter}
						onChange={(filter) =>
							setChoices((current) => ({ ...current, filter }))
						}
					/>
					<ToggleControl
						__nextHasNoMarginBottom
						label={__('Open in a lightbox', 'visual-portfolio')}
						checked={choices.lightbox}
						onChange={(lightbox) =>
							setChoices((current) => ({ ...current, lightbox }))
						}
					/>
					<SelectControl
						__next40pxDefaultSize
						__nextHasNoMarginBottom
						label={__('Pagination', 'visual-portfolio')}
						value={choices.pagination}
						options={PAGINATION_OPTIONS}
						onChange={(pagination) =>
							setChoices((current) => ({
								...current,
								pagination,
							}))
						}
					/>
				</HStack>

				<BlockPatternsList
					blockPatterns={previews}
					label={__('Gallery patterns', 'visual-portfolio')}
					onClickPattern={(pattern) =>
						onChoose(applyChoices(pattern.innerBlocks, choices))
					}
				/>

				<HStack justify="flex-start">
					<Button
						variant="tertiary"
						className="vpf-loop-setup__blank"
						onClick={onStartBlank}
					>
						{__('Start blank', 'visual-portfolio')}
					</Button>
				</HStack>
			</VStack>
		</Modal>
	);
}
