import { useBlockProps, useInnerBlocksProps } from '@wordpress/block-editor';

export default function BlockSave() {
	const blockProps = useBlockProps.save();
	const innerBlocksProps = useInnerBlocksProps.save(blockProps);

	return <div {...innerBlocksProps} />;
}
