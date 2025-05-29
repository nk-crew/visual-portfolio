/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';

export default [
	{
		name: 'buttons',
		title: __('Portfolio Sort Buttons (Experimental)'),
		attributes: { sortType: 'default' },
		isDefault: true,
		scope: ['block', 'inserter', 'transform'],
		isActive: (blockAttributes) => blockAttributes.sortType === 'default',
		icon: 'button',
	},
	{
		name: 'dropdown',
		title: __('Portfolio Sort Dropdown (Experimental)'),
		attributes: { sortType: 'dropdown' },
		scope: ['block', 'inserter', 'transform'],
		isActive: (blockAttributes) => blockAttributes.sortType === 'dropdown',
		icon: 'menu',
	},
];
