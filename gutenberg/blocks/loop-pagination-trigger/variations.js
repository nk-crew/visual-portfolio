/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { ReactComponent as InfiniteIcon } from '../../block-icons/loop-pagination-infinite.svg';
import { ReactComponent as LoadMoreIcon } from '../../block-icons/loop-pagination-load-more.svg';

/**
 * The two ways of asking for the next items.
 *
 * One implementation, two inserter entries. `load-more` is the default
 * variation, which is what keeps the block itself out of the inserter - two
 * entries rather than three. `scope` carries `transform` as well, so the block
 * toolbar offers the switch between them.
 */
export default [
	{
		name: 'load-more',
		isDefault: true,
		title: __('Load More', 'visual-portfolio'),
		description: __(
			'Loads the next items when the reader clicks it.',
			'visual-portfolio'
		),
		scope: ['inserter', 'block', 'transform'],
		attributes: { triggerType: 'load-more' },
		isActive: ['triggerType'],
		icon: {
			foreground: '#2540CC',
			src: <LoadMoreIcon width="20" height="20" />,
		},
	},
	{
		name: 'infinite',
		title: __('Infinite', 'visual-portfolio'),
		description: __(
			'Loads the next items as the reader reaches it. Clicking it still works without JavaScript.',
			'visual-portfolio'
		),
		scope: ['inserter', 'block', 'transform'],
		attributes: { triggerType: 'infinite' },
		isActive: ['triggerType'],
		icon: {
			foreground: '#2540CC',
			src: <InfiniteIcon width="20" height="20" />,
		},
	},
];
