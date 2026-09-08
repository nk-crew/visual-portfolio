/**
 * WordPress dependencies
 */
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import { RangeControl } from '@wordpress/components';
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

export default function CarouselIndicatorEdit({
	attributes,
	setAttributes,
	context,
	clientId,
}) {
	const { indicator, isHidden, showOnHover, maxDots } = attributes;
	const isProgress = 'progress' === indicator;

	useLoopOrphanWarning(metadata.name, context);

	const { isOverlay, isInRow } = useControlPlacement(clientId);

	const blockProps = useBlockProps({
		className: blockClassName(
			`vp-block-loop-carousel-indicator vp-block-loop-carousel-indicator--${isProgress ? 'progress' : 'dots'} ${indicatorClassNames(attributes)}`.trim(),
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
			{!isProgress || (isOverlay && !isInRow) ? (
				<InspectorControls>
					<ControlPanel title={__('Indicator', 'visual-portfolio')}>
						{isProgress ? null : (
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
						)}
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
				) : (
					Array.from({ length: PREVIEW_DOTS }, (ignored, index) => (
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
						>
							<span className="vp-block-loop-carousel-dot-progress" />
						</button>
					))
				)}
			</div>
		</>
	);
}
