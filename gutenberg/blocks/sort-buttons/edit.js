/**
 * WordPress dependencies
 */
/**
 * Internal dependencies
 */
import './editor.scss';

import { useBlockProps, useInnerBlocksProps } from '@wordpress/block-editor';
import { useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';

export default function Edit({ attributes, clientId }) {
	const { sortType, className } = attributes;

	const { hasInnerBlocks } = useSelect(
		(select) => {
			const { getBlocks } = select('core/block-editor');
			return {
				hasInnerBlocks: getBlocks(clientId).length > 0,
			};
		},
		[clientId]
	);

	const ALLOWED_BLOCKS = ['visual-portfolio/sort-button'];
	const TEMPLATE = [
		[
			'visual-portfolio/sort-button',
			{
				label: __('Default', 'visual-portfolio'),
				value: 'default',
				active: true,
			},
		],
		[
			'visual-portfolio/sort-button',
			{
				label: __('Date Asc', 'visual-portfolio'),
				value: 'date_asc',
				active: false,
			},
		],
		[
			'visual-portfolio/sort-button',
			{
				label: __('Date Desc', 'visual-portfolio'),
				value: 'date_desc',
				active: false,
			},
		],
	];

	const blockProps = useBlockProps({
		className: `vp-sort vp-sort-${sortType} vp-sort-style-${attributes.className?.includes('is-style-') ? attributes.className.replace(/.*is-style-(\S+).*/, '$1') : 'minimal'}`,
	});

	// In the Edit function, add the following:
	const currentStyle = className?.includes('is-style-')
		? className.replace(/.*is-style-(\S+).*/, '$1')
		: 'minimal';

	const innerBlocksProps = useInnerBlocksProps(blockProps, {
		allowedBlocks: ALLOWED_BLOCKS,
		template: !hasInnerBlocks ? TEMPLATE : null,
		orientation: 'horizontal',
		renderAppender: false,
		__experimentalSettings: {
			// Pass the style to child blocks
			__unstableProvideBlockContext: {
				'visual-portfolio/sort-buttons-style': currentStyle,
			},
		},
	});

	return (
		<>
			<div {...blockProps}>
				<div {...innerBlocksProps} />
			</div>
		</>
	);
}
