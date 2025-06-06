/**
 * WordPress dependencies
 */
import { createBlock, registerBlockType } from '@wordpress/blocks';
import { addFilter } from '@wordpress/hooks';

import metadata from './block.json';
/**
 * Internal dependencies
 */
import edit from './edit';
import save from './save';
import variations from './variations';

/**
 * Register block
 */
registerBlockType(metadata.name, {
	...metadata,
	variations,
	edit,
	save,
});

// Add a filter to handle variation selection
addFilter(
	'blocks.switchToBlockType.transformedBlock',
	'visual-portfolio/pagination-infinite-variations',
	(transformedBlock, originalBlock) => {
		// Only handle our pagination block
		if (originalBlock.name !== 'visual-portfolio/pagination-infinite') {
			return transformedBlock;
		}

		const { attributes } = transformedBlock;

		// Check if we need to transform to a different block type
		if (attributes.paginationType === 'default') {
			return createBlock(
				'visual-portfolio/paged-pagination',
				{
					paginationType: 'default',
				},
				[
					createBlock('visual-portfolio/pagination-previous'),
					createBlock('visual-portfolio/pagination-numbers'),
					createBlock('visual-portfolio/pagination-next'),
				]
			);
		} else if (attributes.paginationType === 'load-more') {
			return createBlock('visual-portfolio/pagination-load-more', {
				label: 'Load More',
				loadingLabel:
					originalBlock.attributes.loadingLabel || 'Loading...',
			});
		}

		return transformedBlock;
	}
);
