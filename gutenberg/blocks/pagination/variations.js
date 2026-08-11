import { __ } from '@wordpress/i18n';

import { ReactComponent as PagedIcon } from '../../block-icons/pagination.svg';
import { ReactComponent as InfiniteIcon } from '../../block-icons/pagination-infinite.svg';
import { ReactComponent as LoadMoreIcon } from '../../block-icons/pagination-load-more.svg';

export default [
	{
		name: 'paged',
		scope: ['inserter', 'block'],
		title: __('Pagination Paged (Experimental)', 'visual-portfolio'),
		description: __(
			'Displays paged pagination for Gallery Loop. Block is experimental and will change in future releases. Please use with caution.',
			'visual-portfolio'
		),
		attributes: {
			layout: { type: 'flex', justifyContent: 'space-between' },
		},
		innerBlocks: [
			['visual-portfolio/pagination-previous'],
			['visual-portfolio/pagination-numbers'],
			['visual-portfolio/pagination-next'],
		],
		icon: {
			foreground: '#2540CC',
			src: <PagedIcon width="20" height="20" />,
		},
	},
	{
		name: 'load-more',
		scope: ['inserter', 'block'],
		title: __('Pagination Load More (Experimental)', 'visual-portfolio'),
		description: __(
			'Displays a load more button for pagination. Block is experimental and will change in future releases. Please use with caution.',
			'visual-portfolio'
		),
		attributes: { layout: { type: 'flex', justifyContent: 'center' } },
		innerBlocks: [['visual-portfolio/pagination-load-more']],
		icon: {
			foreground: '#2540CC',
			src: <LoadMoreIcon width="20" height="20" />,
		},
	},
	{
		name: 'infinite',
		scope: ['inserter', 'block'],
		title: __('Pagination Infinite (Experimental)', 'visual-portfolio'),
		description: __(
			'Displays an infinite scroll pagination. Block is experimental and will change in future releases. Please use with caution.',
			'visual-portfolio'
		),
		attributes: { layout: { type: 'flex', justifyContent: 'center' } },
		innerBlocks: [['visual-portfolio/pagination-infinite']],
		icon: {
			foreground: '#2540CC',
			src: <InfiniteIcon width="20" height="20" />,
		},
	},
];
