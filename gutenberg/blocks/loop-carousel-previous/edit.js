/**
 * WordPress dependencies
 */
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import {
	blockClassName,
	VisibilityToolbar,
} from '../../utils/block-visibility';
import {
	ArrowControls,
	arrowClassNames,
	ControlPanel,
	ShowOnHoverControl,
	useControlPlacement,
} from '../../utils/carousel-controls';
import { useLoopOrphanWarning } from '../../utils/loop-orphan-warning';
import metadata from './block.json';

export default function CarouselPreviousEdit({
	attributes,
	setAttributes,
	context,
	clientId,
}) {
	const { isHidden, showOnHover } = attributes;

	useLoopOrphanWarning(metadata.name, context);

	const { isOverlay, isInRow } = useControlPlacement(clientId);

	// The same button the render callback prints, minus the one thing a
	// preview has no answer for: on the page the arrow is switched off at the
	// end it has run out of, and an editor has no scroll position to run out.
	const blockProps = useBlockProps({
		className: blockClassName(
			`vp-block-loop-carousel-previous ${arrowClassNames(attributes)}`.trim(),
			isHidden
		),
	});

	return (
		<>
			<VisibilityToolbar
				isHidden={isHidden}
				setAttributes={setAttributes}
			/>
			<InspectorControls>
				<ControlPanel title={__('Arrow', 'visual-portfolio')}>
					<ArrowControls
						attributes={attributes}
						onChange={setAttributes}
					/>
					{/* An arrow in a row leaves the fade to the row. */}
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
			<button
				type="button"
				aria-label={__('Previous slide', 'visual-portfolio')}
				onClick={(event) => event.preventDefault()}
				{...blockProps}
			>
				<span aria-hidden="true" />
			</button>
		</>
	);
}
