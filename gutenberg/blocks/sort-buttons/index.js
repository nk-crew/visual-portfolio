/**
 * WordPress dependencies
 */
/**
 * Internal dependencies
 */
import './sort-variations';
// Import styles for the block and its variants
import './style-minimal.scss';
import './style-classic.scss';
// Import editor-only styles
import './editor.scss';

import { useBlockProps, useInnerBlocksProps } from '@wordpress/block-editor';
import { registerBlockType } from '@wordpress/blocks';
import { __ } from '@wordpress/i18n';

import metadata from './block.json';
import edit from './edit';
import variations from './variations';

/**
 * Register block
 */
registerBlockType(metadata.name, {
	title: __('Sort', 'visual-portfolio'),
	description: __(
		'Add sorting options to your portfolio with buttons.',
		'visual-portfolio'
	),
	//icon,
	category: 'visual-portfolio',
	keywords: [__('sort', 'visual-portfolio'), __('order', 'visual-portfolio')],
	styles: [
		{
			name: 'minimal',
			label: __('Minimal', 'visual-portfolio'),
			isDefault: true,
		},
		{ name: 'classic', label: __('Classic', 'visual-portfolio') },
	],
	variations,
	example: {},
	parent: ['visual-portfolio/loop'],
	edit,
	save: ({ attributes }) => {
		const { sortType, layout } = attributes;

		const blockProps = useBlockProps.save({
			className: `vp-sort vp-sort-${sortType}`,
		});

		const innerBlocksProps = useInnerBlocksProps.save(blockProps);

		// Get justification from layout attribute if available
		const justification = layout?.justifyContent || 'left';

		// Add justification class to innerBlocksProps
		if (innerBlocksProps.className) {
			innerBlocksProps.className += ` is-content-justification-${justification}`;
		} else {
			innerBlocksProps.className = `is-content-justification-${justification}`;
		}

		return (
			<div {...blockProps}>
				<div className="vp-sort-buttons">
					<div {...innerBlocksProps} />
				</div>
			</div>
		);
	},
	attributes: metadata.attributes,
	supports: metadata.supports,
	apiVersion: metadata.apiVersion,
	editorStyle: metadata.editorStyle,
	style: metadata.style,
	providesContext: metadata.providesContext,
});
