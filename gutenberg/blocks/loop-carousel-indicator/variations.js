import { __ } from '@wordpress/i18n';

import { ReactComponent as DotsIcon } from '../../block-icons/loop-carousel-indicator.svg';
import { ReactComponent as ProgressIcon } from '../../block-icons/loop-carousel-progress.svg';

export default [
	{
		name: 'dots',
		scope: ['inserter', 'block', 'transform'],
		isDefault: true,
		title: __('Carousel Dots (Experimental)', 'visual-portfolio'),
		description: __(
			'One dot per slide, filled as the carousel moves. Block is experimental and will change in future releases. Please use with caution.',
			'visual-portfolio'
		),
		attributes: { indicator: 'dots' },
		isActive: ['indicator'],
		icon: {
			foreground: '#2540CC',
			src: <DotsIcon width="20" height="20" />,
		},
	},
	{
		name: 'progress',
		scope: ['inserter', 'block', 'transform'],
		title: __('Carousel Progress Bar (Experimental)', 'visual-portfolio'),
		description: __(
			'A single bar that fills as the carousel scrolls. Block is experimental and will change in future releases. Please use with caution.',
			'visual-portfolio'
		),
		attributes: { indicator: 'progress' },
		isActive: ['indicator'],
		icon: {
			foreground: '#2540CC',
			src: <ProgressIcon width="20" height="20" />,
		},
	},
];
