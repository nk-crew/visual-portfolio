/**
 * WordPress dependencies
 */
import { createBlock, registerBlockType } from '@wordpress/blocks';
import { addFilter } from '@wordpress/hooks';

/**
 * Internal dependencies
 */
import { ReactComponent as BlockIcon } from '../../block-icons/pagination-load-more.svg';
import variations from '../pagination/variations';
import metadata from './block.json';
import edit from './edit';
import save from './save';

/**
 * Register block
 */
registerBlockType(metadata.name, {
	...metadata,
	icon: {
		foreground: '#2540CC',
		src: <BlockIcon width="20" height="20" />,
	},
	variations,
	edit,
	save,
});

// Add a filter to handle variation selection
addFilter(
	'blocks.switchToBlockType.transformedBlock',
	'visual-portfolio/pagination-load-more-variations',
	(transformedBlock, originalBlock) => {
		// Only handle our pagination block
		if (originalBlock.name !== 'visual-portfolio/pagination-load-more') {
			return transformedBlock;
		}

		const { attributes } = transformedBlock;

		// Check if we need to transform to a different block type
		if (attributes.paginationType === 'default') {
			return createBlock(
				'visual-portfolio/pagination',
				{
					paginationType: 'default',
				},
				[
					createBlock('visual-portfolio/pagination-previous'),
					createBlock('visual-portfolio/pagination-numbers'),
					createBlock('visual-portfolio/pagination-next'),
				]
			);
		} else if (attributes.paginationType === 'infinity') {
			return createBlock('visual-portfolio/pagination-infinite', {
				loadingLabel:
					originalBlock.attributes.loadingLabel || 'Loading...',
				showLoadingText: true,
			});
		}

		return transformedBlock;
	}
);
