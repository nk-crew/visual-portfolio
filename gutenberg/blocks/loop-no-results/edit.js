/**
 * WordPress dependencies
 */
import { useBlockProps, useInnerBlocksProps } from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';

const TEMPLATE = [
	[
		'core/paragraph',
		{
			placeholder: __(
				'Add text or blocks that will display when the gallery returns no results.',
				'visual-portfolio'
			),
		},
	],
];

export default function LoopNoResultsEdit() {
	// The block is always visible in the editor - the query it belongs to
	// usually does find items, and content nobody can reach is content nobody
	// can edit.
	const innerBlocksProps = useInnerBlocksProps(useBlockProps(), {
		template: TEMPLATE,
	});

	return <div {...innerBlocksProps} />;
}
