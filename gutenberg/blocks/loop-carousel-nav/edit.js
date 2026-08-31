/**
 * WordPress dependencies
 */
import { useBlockProps, useInnerBlocksProps } from '@wordpress/block-editor';

/**
 * Internal dependencies
 */
import {
	blockClassName,
	VisibilityToolbar,
} from '../../utils/block-visibility';
import { useLoopOrphanWarning } from '../../utils/loop-orphan-warning';
import metadata from './block.json';

// What a carousel is steered with, in the order a visitor reads it. The
// controls are blocks of their own, so this is a starting point and not a
// shape: any of them can be moved out of this row and dropped anywhere else in
// the gallery.
const TEMPLATE = [
	['visual-portfolio/loop-carousel-previous'],
	['visual-portfolio/loop-carousel-indicator'],
	['visual-portfolio/loop-carousel-next'],
];

export default function CarouselNavEdit({
	attributes,
	setAttributes,
	context,
}) {
	const { isHidden } = attributes;

	useLoopOrphanWarning(metadata.name, context);

	const blockProps = useBlockProps({
		className: blockClassName('vp-block-loop-carousel-nav', isHidden),
	});

	// The allowed blocks are declared in `block.json`.
	const innerBlocksProps = useInnerBlocksProps(blockProps, {
		orientation: 'horizontal',
		template: TEMPLATE,
	});

	return (
		<>
			<VisibilityToolbar
				isHidden={isHidden}
				setAttributes={setAttributes}
			/>
			<div {...innerBlocksProps} />
		</>
	);
}
