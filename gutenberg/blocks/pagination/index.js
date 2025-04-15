/**
 * WordPress dependencies
 */
/**
 * Internal dependencies
 */
import './pagination-hooks';

import { createBlock, registerBlockType } from '@wordpress/blocks';
import { addFilter } from '@wordpress/hooks';
import { __ } from '@wordpress/i18n';

import metadata from './block.json';
import edit from './edit';
import save from './save';
import variations from './variations';

/**
 * Register block
 */
registerBlockType(metadata.name, {
	title: __('Paged Pagination', 'visual-portfolio'),
	description: __(
		'Displays paged pagination for Visual Portfolio loop.',
		'visual-portfolio'
	),
	category: 'visual-portfolio',
	icon: 'ellipsis',
	attributes: {
		paginationType: {
			type: 'string',
			default: 'default',
		},
	},
	keywords: [
		__('pagination', 'visual-portfolio'),
		__('pages', 'visual-portfolio'),
		__('vp', 'visual-portfolio'),
	],
	supports: metadata.supports,
	usesContext: ['visual-portfolio/maxPages'],
	edit,
	save,
	variations,
	styles: [
		{ name: 'minimal', label: 'Minimal', isDefault: true },
		{ name: 'classic', label: 'Classic' },
	],
	style: 'visual-portfolio-block-pagination',
	editorStyle: 'visual-portfolio-block-pagination-editor',
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
