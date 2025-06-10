/**
 * WordPress dependencies
 */
/**
 * Internal dependencies
 */
import './editor.scss';

import { useBlockProps, useInnerBlocksProps } from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';

/**
 * Block constants
 */
const ALLOWED_BLOCKS = [
	'visual-portfolio/pagination-previous',
	'visual-portfolio/pagination-numbers',
	'visual-portfolio/pagination-next',
];

const TEMPLATE = [
	['visual-portfolio/pagination-previous'],
	['visual-portfolio/pagination-numbers'],
	['visual-portfolio/pagination-next'],
];

export default function PagedPaginationEdit({ context }) {
	const { 'visual-portfolio/maxPages': maxPages = 1 } = context;

	const blockProps = useBlockProps({
		className: `vp-pagination`,
	});

	const innerBlocksProps = useInnerBlocksProps(blockProps, {
		allowedBlocks: ALLOWED_BLOCKS,
		template: TEMPLATE,
		orientation: 'horizontal',
		renderAppender: false,
	});

	return (
		<>
			{maxPages > 1 ? (
				<div {...innerBlocksProps} />
			) : (
				<div {...blockProps}>
					<div className="vp-pagination-info">
						{__(
							'Pagination will be displayed when the number of pages is more than 1.',
							'visual-portfolio'
						)}
					</div>
				</div>
			)}
		</>
	);
}
