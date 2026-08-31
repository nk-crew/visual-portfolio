/**
 * WordPress dependencies
 */
import { useBlockProps } from '@wordpress/block-editor';
import { __, sprintf } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import {
	blockClassName,
	VisibilityToolbar,
} from '../../utils/block-visibility';
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
}) {
	const { indicator, isHidden } = attributes;
	const isProgress = 'progress' === indicator;

	useLoopOrphanWarning(metadata.name, context);

	const blockProps = useBlockProps({
		className: blockClassName(
			`vp-block-loop-carousel-indicator vp-block-loop-carousel-indicator--${isProgress ? 'progress' : 'dots'}`,
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
