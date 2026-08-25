/**
 * WordPress dependencies
 */
import { createBlock } from '@wordpress/blocks';
import { __ } from '@wordpress/i18n';

/**
 * The three things a gallery is usually assembled from by hand.
 *
 * They are asked in the wizard, beside the source, and applied to whichever
 * pattern is chosen afterwards - the chooser itself holds nothing but patterns.
 */

const FILTER_NAME = 'visual-portfolio/loop-filter';
const PAGINATION_NAME = 'visual-portfolio/loop-pagination';

// Blocks whose click action the lightbox toggle owns.
const CLICKABLE_NAMES = [
	'visual-portfolio/item-image',
	'visual-portfolio/item-cover',
];

export const PAGINATION_OPTIONS = [
	{ label: __('Page numbers', 'visual-portfolio'), value: 'paged' },
	{ label: __('Load more', 'visual-portfolio'), value: 'load-more' },
	{ label: __('Infinite scroll', 'visual-portfolio'), value: 'infinite' },
	{ label: __('None', 'visual-portfolio'), value: 'none' },
];

// What each pagination shape is made of, as `[ name, attributes ]`. The
// pagination block is a container; which of these it holds is the whole
// difference between them.
const PAGINATION_INNER = {
	paged: [
		['visual-portfolio/loop-pagination-previous'],
		['visual-portfolio/loop-pagination-numbers'],
		['visual-portfolio/loop-pagination-next'],
	],
	'load-more': [['visual-portfolio/loop-pagination-trigger']],
	infinite: [
		[
			'visual-portfolio/loop-pagination-trigger',
			{ triggerType: 'infinite' },
		],
	],
};

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
export function applyChoices(blocks, choices) {
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
				}),
			]),
			...result,
		];
	}

	if ('none' !== choices.pagination) {
		const inner = PAGINATION_INNER[choices.pagination].map(
			([name, blockAttributes]) => createBlock(name, blockAttributes)
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
