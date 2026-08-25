/**
 * WordPress dependencies
 */
import { createBlock } from '@wordpress/blocks';

/**
 * The blocks the "paged" shape of the pagination is made of.
 */
const PAGED_BLOCKS = [
	'visual-portfolio/loop-pagination-previous',
	'visual-portfolio/loop-pagination-numbers',
	'visual-portfolio/loop-pagination-next',
];

/**
 * Switching between the two shapes of a pagination.
 *
 * The transform lives on this block because it is the one both directions have
 * in common: a trigger is a single block and the paged shape is three, so this
 * is the only end that can name the other. Switching between the triggers
 * themselves is a variation switch, not a transform.
 */
export default {
	to: [
		{
			type: 'block',
			blocks: ['visual-portfolio/loop-pagination-numbers'],
			transform: () => PAGED_BLOCKS.map((name) => createBlock(name)),
		},
	],
	from: [
		{
			type: 'block',
			// Any of the three, and any number of them: a paged pagination is
			// usually all three, but a reader who deleted the arrows still has
			// something to switch from.
			isMultiBlock: true,
			blocks: PAGED_BLOCKS,
			transform: () =>
				createBlock('visual-portfolio/loop-pagination-trigger'),
		},
	],
};
