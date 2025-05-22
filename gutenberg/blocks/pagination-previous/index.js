/**
 * WordPress dependencies
 */
import { registerBlockType } from '@wordpress/blocks';
import { __ } from '@wordpress/i18n';

import metadata from './block.json';
/**
 * Internal dependencies
 */
import edit from './edit';
import save from './save';

/**
 * Register block
 */
registerBlockType(metadata.name, {
	title: __('VP Pagination Previous', 'visual-portfolio'),
	description: __('Displays the previous page link.', 'visual-portfolio'),
	category: 'visual-portfolio',
	icon: 'arrow-left-alt2',
	parent: ['visual-portfolio/paged-pagination'],
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
	keywords: [
		__('previous', 'visual-portfolio'),
		__('pagination', 'visual-portfolio'),
		__('vp', 'visual-portfolio'),
	],
	supports: {
		html: false,
		reusable: false,
		className: false,
	},
	edit,
	save,
});
