/**
 * WordPress dependencies
 */
import { __ } from '@wordpress/i18n';

export default [
	{
		name: 'buttons',
		title: __('Buttons'),
		attributes: { sortType: 'default' },
		isDefault: true,
		scope: ['block', 'inserter', 'transform'],
		isActive: (blockAttributes) => blockAttributes.sortType === 'default',
		icon: 'button',
	},
	{
		name: 'dropdown',
		title: __('Dropdown'),
		attributes: { sortType: 'dropdown' },
		scope: ['block', 'inserter', 'transform'],
		isActive: (blockAttributes) => blockAttributes.sortType === 'dropdown',
		icon: 'menu',
	},
];
