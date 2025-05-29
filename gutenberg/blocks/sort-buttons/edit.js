/**
 * WordPress dependencies
 */
/**
 * Internal dependencies
 */
import './editor.scss';

import { useBlockProps, useInnerBlocksProps } from '@wordpress/block-editor';
import { useSelect } from '@wordpress/data';
import { useEffect } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

export default function Edit({ clientId, setAttributes }) {
	const { hasInnerBlocks } = useSelect(
		(select) => {
			const { getBlocks } = select('core/block-editor');
			return {
				hasInnerBlocks: getBlocks(clientId).length > 0,
			};
		},
		[clientId]
	);

	// Get current block attributes including className
	const { className } = useSelect(
		(select) => {
			const { getBlockAttributes } = select('core/block-editor');
			return getBlockAttributes(clientId) || {};
		},
		[clientId]
	);

	// Ensure default style is applied on first load
	useEffect(() => {
		if (
			!className ||
			(!className.includes('is-style-minimal') &&
				!className.includes('is-style-classic'))
		) {
			setAttributes({
				className: className
					? `${className} is-style-minimal`
					: 'is-style-minimal',
			});
		}
	}, [className, setAttributes]);

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
