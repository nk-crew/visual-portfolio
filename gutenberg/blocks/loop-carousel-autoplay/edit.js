/**
 * WordPress dependencies
 */
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { ToggleGroupButtonsControl } from '../../components/toggle-group-control';
import {
	blockClassName,
	VisibilityToolbar,
} from '../../utils/block-visibility';
import {
	AUTOPLAY_ICONS,
	autoplayClassNames,
	ControlPanel,
	ShowOnHoverControl,
	useControlPlacement,
} from '../../utils/carousel-controls';
import { useLoopOrphanWarning } from '../../utils/loop-orphan-warning';
import metadata from './block.json';

export default function CarouselAutoplayEdit({
	attributes,
	setAttributes,
	context,
	clientId,
}) {
	const { isHidden, icon, showOnHover } = attributes;

	useLoopOrphanWarning(metadata.name, context);

	const { isOverlay, isInRow } = useControlPlacement(clientId);

	// Drawn as though the carousel were running, which is what the page
	// renders too: an editor has no autoplay to be running.
	const blockProps = useBlockProps({
		className: blockClassName(
			`vp-block-loop-carousel-autoplay ${autoplayClassNames(attributes)}`.trim(),
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
				<ControlPanel title={__('Play and pause', 'visual-portfolio')}>
					<ToggleGroupButtonsControl
						label={__('Icon', 'visual-portfolio')}
						value={icon}
						options={AUTOPLAY_ICONS}
						onChange={(value) => setAttributes({ icon: value })}
					/>
					{/* A button in a row leaves the fade to the row. */}
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
				aria-label={__('Stop the carousel', 'visual-portfolio')}
				onClick={(event) => event.preventDefault()}
				{...blockProps}
			>
				<span aria-hidden="true" />
			</button>
		</>
	);
}
