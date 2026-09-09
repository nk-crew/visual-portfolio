/**
 * WordPress dependencies
 */
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import { RangeControl, ToggleControl } from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import {
	blockClassName,
	VisibilityToolbar,
} from '../../utils/block-visibility';
import {
	ControlPanel,
	indicatorClassNames,
	ShowOnHoverControl,
	useControlPlacement,
} from '../../utils/carousel-controls';
import { useLoopOrphanWarning } from '../../utils/loop-orphan-warning';
import metadata from './block.json';

// A carousel in the editor is always at its first slide, and the number of
// slides is the number of items the preview happens to hold. Three dots is the
// shape of the control rather than a count - the page prints one dot per slide.
const PREVIEW_DOTS = 3;

// How far along the preview bar is drawn. Far enough to read as a progress bar
// and not so far that it reads as a full one.
const PREVIEW_PROGRESS = 35;

// The pair a counter is drawn with here, for the same reason: the shape of the
// control, not the number of items the preview happens to hold.
const PREVIEW_COUNT = 12;

export default function CarouselIndicatorEdit({
	attributes,
	setAttributes,
	context,
	clientId,
}) {
	const { indicator, isHidden, showOnHover, maxDots, isDraggable } =
		attributes;
	const isProgress = 'progress' === indicator;
	const isCounter = 'counter' === indicator;
	const isDots = !isProgress && !isCounter;

	useLoopOrphanWarning(metadata.name, context);

	const { isOverlay, isInRow } = useControlPlacement(clientId);

	const blockProps = useBlockProps({
		className: blockClassName(
			`vp-block-loop-carousel-indicator vp-block-loop-carousel-indicator--${isDots ? 'dots' : indicator}${isProgress && isDraggable ? ' is-draggable' : ''} ${indicatorClassNames(attributes)}`.trim(),
			isHidden
		),
	});

	// The bar reads its fill from the box around it, the same way the page
	// writes it as the carousel scrolls.
	const style = isProgress
		? {
				...blockProps.style,
				'--vp-carousel-progress': `${PREVIEW_PROGRESS}%`,
			}
		: blockProps.style;

	return (
		<>
			<VisibilityToolbar
				isHidden={isHidden}
				setAttributes={setAttributes}
			/>
			{isDots || isProgress || (isOverlay && !isInRow) ? (
				<InspectorControls>
					<ControlPanel title={__('Indicator', 'visual-portfolio')}>
						{isDots ? (
							<RangeControl
								label={__('Dots at once', 'visual-portfolio')}
								help={__(
									'How many dots the row shows before it starts sliding them under a window. Zero draws one dot per slide, however many there are.',
									'visual-portfolio'
								)}
								value={maxDots}
								onChange={(value) =>
									setAttributes({ maxDots: value ?? 0 })
								}
								min={0}
								max={15}
							/>
						) : null}
						{isProgress ? (
							<ToggleControl
								label={__('Can be dragged', 'visual-portfolio')}
								help={__(
									'The bar answers a drag, and the arrow keys, Home and End when focused. Switched off it only says where the carousel is.',
									'visual-portfolio'
								)}
								checked={isDraggable}
								onChange={(value) =>
									setAttributes({ isDraggable: value })
								}
							/>
						) : null}
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
			) : null}
			<div {...blockProps} style={style}>
				{isProgress ? (
					<span className="vp-block-loop-carousel-progress-value" />
				) : null}
				{isCounter ? (
					<>
						<span className="vp-block-loop-carousel-counter-current">
							1
						</span>
						<span className="vp-block-loop-carousel-counter-separator">
							/
						</span>
						<span className="vp-block-loop-carousel-counter-total">
							{PREVIEW_COUNT}
						</span>
					</>
				) : null}
				{isDots ? (
					<span
						className="vp-block-loop-carousel-dot-worm"
						aria-hidden="true"
						// The preview rests on the first slide, so the pill
						// sits in the middle of the first slot.
						style={{
							insetInlineStart:
								'calc((var(--vp-carousel-dot-slot, 18px) - var(--vp-carousel-dot-active-size, 14px)) / 2)',
						}}
					>
						<span className="vp-block-loop-carousel-dot-progress" />
					</span>
				) : null}
				{isDots
					? Array.from({ length: PREVIEW_DOTS }, (ignored, index) => (
							<button
								key={index}
								type="button"
								className="vp-block-loop-carousel-dot"
								aria-current={0 === index ? 'true' : 'false'}
								/* translators: %d: slide number. */
								aria-label={sprintf(
									__('Go to slide %d', 'visual-portfolio'),
									index + 1
								)}
								tabIndex={-1}
								onClick={(event) => event.preventDefault()}
							/>
						))
					: null}
			</div>
		</>
	);
}
