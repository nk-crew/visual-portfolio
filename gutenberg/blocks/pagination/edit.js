/**
 * WordPress dependencies
 */
import { useBlockProps, useInnerBlocksProps } from '@wordpress/block-editor';

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

export default function PagedPaginationEdit() {
	const blockProps = useBlockProps();

	const innerBlocksProps = useInnerBlocksProps(blockProps, {
		allowedBlocks: ALLOWED_BLOCKS,
		template: TEMPLATE,
		orientation: 'horizontal',
		renderAppender: false,
	});

	return <div {...innerBlocksProps} />;
}
