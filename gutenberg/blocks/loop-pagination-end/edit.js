/**
 * WordPress dependencies
 */
import { useBlockProps, useInnerBlocksProps } from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';

const TEMPLATE = [
	[
		'core/paragraph',
		{
			content: __(
				'You’ve reached the end of the list',
				'visual-portfolio'
			),
		},
	],
];

export default function LoopPaginationEndEdit() {
	// Always drawn in the editor, like No Results: the page it belongs to is
	// the last one, which the editor is rarely looking at.
	const innerBlocksProps = useInnerBlocksProps(
		useBlockProps({ className: 'vp-block-loop-pagination-end' }),
		{ template: TEMPLATE }
	);

	return <div {...innerBlocksProps} />;
}
