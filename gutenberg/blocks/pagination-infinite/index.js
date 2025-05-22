/**
 * WordPress dependencies
 */
import { createBlock, registerBlockType } from '@wordpress/blocks';
import { addFilter } from '@wordpress/hooks';
import { __ } from '@wordpress/i18n';

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
	title: __('VP Pagination Infinite', 'visual-portfolio'),
	description: __(
		'Displays infinite scroll pagination for Visual Portfolio loop.',
		'visual-portfolio'
	),
	category: 'visual-portfolio',
	icon: 'update',
	keywords: [
		__('infinite', 'visual-portfolio'),
		__('scroll', 'visual-portfolio'),
		__('pagination', 'visual-portfolio'),
		__('vp', 'visual-portfolio'),
	],
	supports: {
		html: false,
		interactivity: {
			clientNavigation: true,
		},
	},
	styles: metadata.styles,
	usesContext: [
		'visual-portfolio/block_id',
		'visual-portfolio/content_source',
		'visual-portfolio/images',
		'visual-portfolio/images_descriptions_source',
		'visual-portfolio/images_order_by',
		'visual-portfolio/images_order_direction',
		'visual-portfolio/images_titles_source',
		'visual-portfolio/items_count',
		'visual-portfolio/post_types_set',
		'visual-portfolio/posts_avoid_duplicate_posts',
		'visual-portfolio/posts_custom_query',
		'visual-portfolio/posts_excluded_ids',
		'visual-portfolio/posts_ids',
		'visual-portfolio/posts_offset',
		'visual-portfolio/posts_order_by',
		'visual-portfolio/posts_order_direction',
		'visual-portfolio/posts_source',
		'visual-portfolio/posts_taxonomies',
		'visual-portfolio/posts_taxonomies_relation',
		'visual-portfolio/setup_wizard',
		'visual-portfolio/sort',
		'visual-portfolio/stretch',
		'visual-portfolio/maxPages',
	],
	variations,
	edit,
	save,
	style: 'visual-portfolio-block-pagination-infinite',
	editorStyle: 'visual-portfolio-block-pagination-infinite-editor',
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
