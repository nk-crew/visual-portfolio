/**
 * WordPress dependencies
 */
import {
	store as blockEditorStore,
	InspectorControls,
	useBlockProps,
	useInnerBlocksProps,
} from '@wordpress/block-editor';
import { useDispatch, useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import {
	blockClassName,
	VisibilityToolbar,
} from '../../utils/block-visibility';
import {
	ARROW_BLOCKS,
	ArrowControls,
	ControlPanel,
	SHOW_ON_HOVER_CLASS,
	ShowOnHoverControl,
	useControlPlacement,
} from '../../utils/carousel-controls';
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

/**
 * The arrows in the row.
 *
 * The row has no look of its own: what it offers in the sidebar is the
 * settings of the arrows inside it, so that both are set at once and
 * without leaving the row.
 *
 * @param {string} clientId - client id of the row.
 *
 * @return {Array} arrow blocks.
 */
function useRowArrows(clientId) {
	return useSelect(
		(select) => {
			const { getClientIdsOfDescendants, getBlock } =
				select(blockEditorStore);

			return getClientIdsOfDescendants(clientId)
				.map(getBlock)
				.filter((block) => ARROW_BLOCKS.includes(block.name));
		},
		[clientId]
	);
}

export default function CarouselNavEdit({
	attributes,
	setAttributes,
	context,
	clientId,
}) {
	const { isHidden, showOnHover } = attributes;

	useLoopOrphanWarning(metadata.name, context);

	const { isOverlay } = useControlPlacement(clientId);
	const arrows = useRowArrows(clientId);
	const { updateBlockAttributes } = useDispatch(blockEditorStore);

	const blockProps = useBlockProps({
		className: blockClassName(
			showOnHover
				? `vp-block-loop-carousel-nav ${SHOW_ON_HOVER_CLASS}`
				: 'vp-block-loop-carousel-nav',
			isHidden
		),
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
			<InspectorControls>
				{isOverlay ? (
					<ControlPanel
						title={__('Over the slides', 'visual-portfolio')}
					>
						<ShowOnHoverControl
							value={showOnHover}
							onChange={(value) =>
								setAttributes({ showOnHover: value })
							}
						/>
					</ControlPanel>
				) : null}
				{arrows.length ? (
					<ControlPanel title={__('Arrows', 'visual-portfolio')}>
						<ArrowControls
							attributes={arrows[0].attributes}
							onChange={(values) =>
								updateBlockAttributes(
									arrows.map((block) => block.clientId),
									values
								)
							}
						/>
					</ControlPanel>
				) : null}
			</InspectorControls>
			<div {...innerBlocksProps} />
		</>
	);
}
