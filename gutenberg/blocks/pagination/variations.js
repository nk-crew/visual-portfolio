import { __ } from '@wordpress/i18n';

export default [
	{
		name: 'paged',
		title: __('Paged Pagination (Experimental)'),
		description: __('Paged pagination block.'),
		attributes: { paginationType: 'default' },
		isDefault: true,
		scope: ['block', 'transform'],
		isActive: (blockAttributes) =>
			blockAttributes.paginationType === 'default',
		icon: 'ellipsis',
	},
	{
		name: 'load-more',
		title: __('Pagination Load More (Experimental)'),
		description: __('Load more pagination.'),
		attributes: { paginationType: 'load-more' },
		scope: ['block', 'transform'],
		isActive: (blockAttributes) =>
			blockAttributes.paginationType === 'load-more',
		icon: 'download',
	},
	{
		name: 'infinity',
		title: __('Pagination Infinite (Experimental)'),
		description: __('Infinity pagination.'),
		attributes: { paginationType: 'infinity' },
		scope: ['block', 'transform'],
		isActive: (blockAttributes) =>
			blockAttributes.paginationType === 'infinity',
		icon: 'update',
	},
];
