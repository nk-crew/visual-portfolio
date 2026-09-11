/**
 * WordPress dependencies
 */
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import { RangeControl, TextControl } from '@wordpress/components';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import {
	blockClassName,
	VisibilityToolbar,
} from '../../utils/block-visibility';
import {
	ControlPanel,
	ShowOnHoverControl,
	useControlPlacement,
} from '../../utils/carousel-controls';
import { useLoopOrphanWarning } from '../../utils/loop-orphan-warning';
import metadata from './block.json';

// The shape of the control rather than the number of items the preview happens
// to hold, the same way the indicator draws three dead dots.
const PREVIEW_THUMBS = 5;

export default function CarouselThumbnailsEdit({
	attributes,
	setAttributes,
	context,
	clientId,
}) {
	const { isHidden, showOnHover, thumbHeight, aspectRatio } = attributes;

	useLoopOrphanWarning(metadata.name, context);

	const { isOverlay, isInRow } = useControlPlacement(clientId);

	const blockProps = useBlockProps({
		className: blockClassName(
			`vp-block-loop-carousel-thumbnails ${showOnHover ? 'is-shown-on-hover' : ''}`.trim(),
			isHidden
		),
	});

	const style = {
		...blockProps.style,
		'--vp-carousel-thumb-height': `${thumbHeight}px`,
		'--vp-carousel-thumb-ratio': aspectRatio || '1',
	};

	return (
		<>
			<VisibilityToolbar
				isHidden={isHidden}
				setAttributes={setAttributes}
			/>
			<InspectorControls>
				<ControlPanel title={__('Thumbnails', 'visual-portfolio')}>
					<RangeControl
						label={__('Height', 'visual-portfolio')}
						value={thumbHeight}
						onChange={(value) =>
							setAttributes({ thumbHeight: value ?? 72 })
						}
						min={24}
						max={200}
					/>
					<TextControl
						label={__('Aspect ratio', 'visual-portfolio')}
						help={__(
							'The shape of one thumbnail, written the way CSS writes it: 1, 4/3, 16/9.',
							'visual-portfolio'
						)}
						value={aspectRatio}
						onChange={(value) =>
							setAttributes({ aspectRatio: value })
						}
					/>
					{isOverlay && !isInRow ? (
						<ShowOnHoverControl
							value={showOnHover}
							onChange={(value) =>
								setAttributes({ showOnHover: value })
							}
						/>
					) : null}
				</ControlPanel>
			</InspectorControls>
			<div {...blockProps} style={style}>
				{Array.from({ length: PREVIEW_THUMBS }, (ignored, index) => (
					<span
						key={index}
						className="vp-block-loop-carousel-thumb is-placeholder"
						aria-current={0 === index ? 'true' : 'false'}
					/>
				))}
			</div>
		</>
	);
}
