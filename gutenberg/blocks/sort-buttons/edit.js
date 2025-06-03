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

export default function Edit({ clientId }) {
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
				value: '',
				active: true,
			},
		],
		[
			'visual-portfolio/sort-button',
			{
				label: __('Date Asc', 'visual-portfolio'),
				value: 'date',
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

	const blockProps = useBlockProps({});

	const innerBlocksProps = useInnerBlocksProps(blockProps, {
		allowedBlocks: ALLOWED_BLOCKS,
		template: !hasInnerBlocks ? TEMPLATE : null,
		orientation: 'horizontal',
		renderAppender: false,
	});

	return (
		<>
			<div {...innerBlocksProps} />
		</>
	);
}
