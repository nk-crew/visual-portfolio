import { __ } from '@wordpress/i18n';

export default [
	{
		name: 'paged',
		title: __('Paged'),
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
		title: __('Load More'),
		description: __('Load more pagination.'),
		attributes: { paginationType: 'load-more' },
		scope: ['block', 'transform'],
		isActive: (blockAttributes) =>
			blockAttributes.paginationType === 'load-more',
		icon: 'download',
	},
	{
		name: 'infinity',
		title: __('Infinity'),
		description: __('Infinity pagination.'),
		attributes: { paginationType: 'infinity' },
		scope: ['block', 'transform'],
		isActive: (blockAttributes) =>
			blockAttributes.paginationType === 'infinity',
		icon: 'update',
	},
];
