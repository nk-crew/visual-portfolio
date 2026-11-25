import { __ } from '@wordpress/i18n';

import { ReactComponent as PagedIcon } from '../../block-icons/loop-pagination.svg';
import { ReactComponent as InfiniteIcon } from '../../block-icons/loop-pagination-infinite.svg';
import { ReactComponent as LoadMoreIcon } from '../../block-icons/loop-pagination-load-more.svg';

export default [
	{
		name: 'paged',
		scope: ['inserter', 'block'],
		title: __('Pagination Paged', 'visual-portfolio'),
		description: __(
			'Displays paged pagination for Gallery Loop.',
			'visual-portfolio'
		),
		attributes: {
			layout: { type: 'flex', justifyContent: 'space-between' },
		},
		innerBlocks: [
			['visual-portfolio/loop-pagination-previous'],
			['visual-portfolio/loop-pagination-numbers'],
			['visual-portfolio/loop-pagination-next'],
		],
		icon: {
			foreground: '#2540CC',
			src: <PagedIcon width="20" height="20" />,
		},
	},
	{
		name: 'load-more',
		scope: ['inserter', 'block'],
		title: __('Pagination Load More', 'visual-portfolio'),
		description: __(
			'Displays a load more button for pagination.',
			'visual-portfolio'
		),
		attributes: { layout: { type: 'flex', justifyContent: 'center' } },
		innerBlocks: [
			['visual-portfolio/loop-pagination-trigger'],
			['visual-portfolio/loop-pagination-end'],
		],
		icon: {
			foreground: '#2540CC',
			src: <LoadMoreIcon width="20" height="20" />,
		},
	},
	{
		name: 'infinite',
		scope: ['inserter', 'block'],
		title: __('Pagination Infinite', 'visual-portfolio'),
		description: __(
			'Displays an infinite scroll pagination.',
			'visual-portfolio'
		),
		attributes: { layout: { type: 'flex', justifyContent: 'center' } },
		innerBlocks: [
			[
				'visual-portfolio/loop-pagination-trigger',
				{ triggerType: 'infinite' },
			],
			['visual-portfolio/loop-pagination-end'],
		],
		icon: {
			foreground: '#2540CC',
			src: <InfiniteIcon width="20" height="20" />,
		},
	},
];
