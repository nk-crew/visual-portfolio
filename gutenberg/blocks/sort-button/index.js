/**
 * WordPress dependencies
 */
/**
 * Internal dependencies
 */

// Import the styles for the block
import './editor.scss';

import { useBlockProps } from '@wordpress/block-editor';
import { registerBlockType } from '@wordpress/blocks';
import { __ } from '@wordpress/i18n';

import metadata from './block.json';
import edit from './edit';

/**
 * Register block
 */
registerBlockType(metadata.name, {
	title: __('Sort Button', 'visual-portfolio'),
	description: __(
		'Individual button for sorting portfolio items.',
		'visual-portfolio'
	),
	category: 'visual-portfolio',
	parent: ['visual-portfolio/sort-buttons'],
	attributes: {
		label: {
			type: 'string',
			default: __('Default', 'visual-portfolio'),
		},
		value: {
			type: 'string',
			default: 'default',
			pattern: '^[a-zA-Z0-9_-]*$',
		},
		active: {
			type: 'boolean',
			default: false,
		},
	},
	example: {},
	edit,
	save: ({ attributes }) => {
		const { label, value, active } = attributes;

		const blockProps = useBlockProps.save({
			className: `vp-sort__item${active ? ' vp-sort__item-active' : ''}`,
			'data-vp-sort': value,
		});

		return (
			<div {...blockProps}>
				<button
					type="button"
					className="vp-sort__item-button"
					onClick={(e) => e.preventDefault()}
					data-vp-sort={value}
				>
					{label}
				</button>
			</div>
		);
	},
	apiVersion: metadata.apiVersion,
	editorStyle: metadata.editorStyle,
	style: metadata.style,
	usesContext: metadata.usesContext,
});
