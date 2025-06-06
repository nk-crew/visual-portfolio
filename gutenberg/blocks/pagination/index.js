/**
 * WordPress dependencies
 */
/**
 * Internal dependencies
 */
import './pagination-hooks';

import { createBlock, registerBlockType } from '@wordpress/blocks';
import { addFilter } from '@wordpress/hooks';

import metadata from './block.json';
import edit from './edit';
import save from './save';
import variations from './variations';

/**
 * Register block
 */
registerBlockType(metadata.name, {
	...metadata,
	edit,
	save,
	variations,
});

// Add a filter to handle variation selection.
addFilter(
	'blocks.switchToBlockType.transformedBlock',
	'visual-portfolio/pagination-variations',
	(transformedBlock, originalBlock) => {
		// Only handle our pagination block.
		if (originalBlock.name !== 'visual-portfolio/paged-pagination') {
			return transformedBlock;
		}

		const { attributes } = transformedBlock;

		// Check if we need to transform to a different block type.
		if (attributes.paginationType === 'load-more') {
			return createBlock('visual-portfolio/pagination-load-more', {
				label: 'Load More',
				loadingLabel: 'Loading...',
			});
		} else if (attributes.paginationType === 'infinity') {
			return createBlock('visual-portfolio/pagination-infinite', {
				loadingLabel: 'Loading...',
				showLoadingText: true,
			});
		}

		return transformedBlock;
	}
);
