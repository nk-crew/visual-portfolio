/**
 * WordPress dependencies
 */
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import {
	arrowClassNames,
	ControlPanel,
	ShowOnHoverControl,
	useControlPlacement,
} from '../../utils/carousel-controls';
import { useLoopOrphanWarning } from '../../utils/loop-orphan-warning';
import metadata from './block.json';

export default function CarouselNextEdit({
	attributes,
	setAttributes,
	context,
	clientId,
}) {
	const { showOnHover } = attributes;

	useLoopOrphanWarning(metadata.name, context);

	const { isOverlay, isInRow } = useControlPlacement(clientId);

	// The same button the render callback prints, minus the one thing a
	// preview has no answer for: on the page the arrow is switched off at the
	// end it has run out of, and an editor has no scroll position to run out.
	const blockProps = useBlockProps({
		className:
			`vp-block-loop-carousel-next ${arrowClassNames(attributes)}`.trim(),
	});

	return (
		<>
			{/* An arrow in a row leaves the fade to the row, and the glyph
			    is a block variation - switched above the settings, where the
			    editor switches every other kind of block. */}
			{isOverlay && !isInRow ? (
				<InspectorControls>
					<ControlPanel title={__('Arrow', 'visual-portfolio')}>
						<ShowOnHoverControl
							value={showOnHover}
							onChange={(value) =>
								setAttributes({ showOnHover: value })
							}
						/>
					</ControlPanel>
				</InspectorControls>
			) : null}
			<button
				type="button"
				aria-label={__('Next slide', 'visual-portfolio')}
				onClick={(event) => event.preventDefault()}
				{...blockProps}
			>
				<span aria-hidden="true" />
			</button>
		</>
	);
}
