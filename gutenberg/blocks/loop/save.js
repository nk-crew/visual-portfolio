import { InnerBlocks, useBlockProps } from '@wordpress/block-editor';

export default function BlockSave({}) {
	const blockProps = useBlockProps.save();

	return (
		<div {...blockProps}>
			<InnerBlocks.Content />
		</div>
	);
}
