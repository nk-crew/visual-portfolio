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
	'visual-portfolio/pagination-load-more',
	'visual-portfolio/pagination-infinite',
];

export default function PagedPaginationEdit() {
	const blockProps = useBlockProps({ className: 'vp-block-pagination' });

	const innerBlocksProps = useInnerBlocksProps(blockProps, {
		allowedBlocks: ALLOWED_BLOCKS,
		orientation: 'horizontal',
	});

	return <div {...innerBlocksProps} />;
}
