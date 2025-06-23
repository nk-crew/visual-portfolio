import { __ } from '@wordpress/i18n';

import { ReactComponent as PagedIcon } from '../../block-icons/pagination.svg';
import { ReactComponent as InfiniteIcon } from '../../block-icons/pagination-infinite.svg';
import { ReactComponent as LoadMoreIcon } from '../../block-icons/pagination-load-more.svg';

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
		icon: {
			foreground: '#2540CC',
			src: <PagedIcon width="20" height="20" />,
		},
	},
	{
		name: 'load-more',
		title: __('Pagination Load More (Experimental)'),
		description: __('Load more pagination.'),
		attributes: { paginationType: 'load-more' },
		scope: ['block', 'transform'],
		isActive: (blockAttributes) =>
			blockAttributes.paginationType === 'load-more',
		icon: {
			foreground: '#2540CC',
			src: <LoadMoreIcon width="20" height="20" />,
		},
	},
	{
		name: 'infinity',
		title: __('Pagination Infinite (Experimental)'),
		description: __('Infinity pagination.'),
		attributes: { paginationType: 'infinity' },
		scope: ['block', 'transform'],
		isActive: (blockAttributes) =>
			blockAttributes.paginationType === 'infinity',
		icon: {
			foreground: '#2540CC',
			src: <InfiniteIcon width="20" height="20" />,
		},
	},
];
