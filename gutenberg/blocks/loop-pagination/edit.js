/**
 * WordPress dependencies
 */
import { useBlockProps, useInnerBlocksProps } from '@wordpress/block-editor';

export default function PagedPaginationEdit() {
	const blockProps = useBlockProps({ className: 'vp-block-loop-pagination' });

	// The allowed blocks are declared in `block.json`.
	const innerBlocksProps = useInnerBlocksProps(blockProps, {
		orientation: 'horizontal',
	});

	return <div {...innerBlocksProps} />;
}
