import { useBlockProps, useInnerBlocksProps } from '@wordpress/block-editor';

export default function BlockSave() {
	const blockProps = useBlockProps.save({ className: 'vp-block-loop' });
	const innerBlocksProps = useInnerBlocksProps.save(blockProps);

	return <div {...innerBlocksProps} />;
}
