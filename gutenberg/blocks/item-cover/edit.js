/**
 * WordPress dependencies
 */
import {
	__experimentalBlockAlignmentMatrixControl as BlockAlignmentMatrixControl,
	BlockControls,
	BlockVerticalAlignmentControl,
	__experimentalColorGradientSettingsDropdown as ColorGradientSettingsDropdown,
	InspectorControls,
	useBlockEditingMode,
	useBlockProps,
	useInnerBlocksProps,
	__experimentalUseMultipleOriginColorsAndGradients as useMultipleOriginColorsAndGradients,
} from '@wordpress/block-editor';
import {
	FocalPointPicker,
	RangeControl,
	SelectControl,
	TextControl,
	ToggleControl,
	__experimentalToolsPanel as ToolsPanel,
	__experimentalToolsPanelItem as ToolsPanelItem,
	__experimentalUnitControl as UnitControl,
} from '@wordpress/components';
import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
/**
 * External dependencies
 */
import classnames from 'classnames/dedupe';
/**
 * Internal dependencies
 */
import {
	IMAGE_SIZE_OPTIONS,
	useImageSizeOnInsert,
} from '../../utils/item-image-size';
import { useToolsPanelDropdownMenuProps } from '../../utils/tools-panel';

const ALLOWED_BLOCKS = [
	'visual-portfolio/item-title',
	'visual-portfolio/item-description',
	'visual-portfolio/item-categories',
	'visual-portfolio/item-author',
	'visual-portfolio/item-date',
	'visual-portfolio/item-read-more',
	'core/paragraph',
	'core/heading',
	'core/buttons',
	'core/group',
];

const TEMPLATE = [['visual-portfolio/item-title', { textAlign: 'center' }]];

const EFFECT_OPTIONS = [
	{ label: __('None', 'visual-portfolio'), value: 'none' },
	{ label: __('Fade', 'visual-portfolio'), value: 'fade' },
	{ label: __('Fly', 'visual-portfolio'), value: 'fly' },
	{ label: __('Emerge', 'visual-portfolio'), value: 'emerge' },
];

const CONTENT_PLACEMENT_OPTIONS = [
	{ label: __('Over image', 'visual-portfolio'), value: 'over' },
	{ label: __('Below image', 'visual-portfolio'), value: 'below' },
];

const SHOW_CONTENT_OPTIONS = [
	{ label: __('Always', 'visual-portfolio'), value: 'always' },
	{ label: __('On hover', 'visual-portfolio'), value: 'hover' },
	{ label: __('Never', 'visual-portfolio'), value: 'never' },
];

const BACKGROUND_SIZE_OPTIONS = [
	{ label: __('Cover', 'visual-portfolio'), value: 'cover' },
	{ label: __('Contain', 'visual-portfolio'), value: 'contain' },
];

const CLICK_ACTION_OPTIONS = [
	{ label: __('None', 'visual-portfolio'), value: 'none' },
	{ label: __('Open the item', 'visual-portfolio'), value: 'url' },
	{ label: __('Open the lightbox', 'visual-portfolio'), value: 'popup' },
];

// The nine positions of core Cover, under the class names core gives them.
const CONTENT_POSITION_CLASSES = {
	'top left': 'is-position-top-left',
	'top center': 'is-position-top-center',
	'top right': 'is-position-top-right',
	'center left': 'is-position-center-left',
	center: 'is-position-center-center',
	'center center': 'is-position-center-center',
	'center right': 'is-position-center-right',
	'bottom left': 'is-position-bottom-left',
	'bottom center': 'is-position-bottom-center',
	'bottom right': 'is-position-bottom-right',
};

// The proportions live in the Dimensions panel, which resets them itself.
const DEFAULT_ATTRIBUTES = {
	sizeSlug: 'large',
	focalPoint: undefined,
	contentPlacement: 'over',
	contentPosition: 'center',
	verticalAlignment: undefined,
	effect: 'fade',
	showContent: 'hover',
	clickAction: 'none',
	linkTarget: '_self',
	rel: '',
};

export default function ItemCoverEdit({
	attributes,
	setAttributes,
	context,
	clientId,
}) {
	const dropdownMenuProps = useToolsPanelDropdownMenuProps();

	const {
		sizeSlug,
		aspectRatio,
		minHeight,
		backgroundSize,
		focalPoint,
		contentPlacement,
		contentPosition,
		verticalAlignment,
		effect,
		showContent,
		overlayColor,
		customOverlayColor,
		gradient,
		customGradient,
		dimRatio,
		hoverOverlayColor,
		customHoverOverlayColor,
		hoverGradient,
		customHoverGradient,
		hoverDimRatio,
		clickAction,
		linkTarget,
		rel,
	} = attributes;

	const {
		'vp/itemImgUrl': itemImgUrl,
		'vp/itemImgAlt': itemImgAlt,
		'vp/itemImageSizes': itemImageSizes,
		'vp/itemFocalPoint': itemFocalPoint,
		'vp/layoutColumns': layoutColumns,
	} = context;

	const blockEditingMode = useBlockEditingMode();
	const colorGradientSettings = useMultipleOriginColorsAndGradients();

	useImageSizeOnInsert(clientId, layoutColumns, setAttributes);

	// Content under the picture is content that is always there: nothing is
	// revealed, so the effect, the reveal mode and the position matrix have
	// nothing left to say and are taken out of the way. The render callback
	// resolves the very same way.
	const isBelow = contentPlacement === 'below';

	// The render callback reads the proportions of the image off the tag it
	// prints; here they arrive with the image itself.
	const [naturalRatio, setNaturalRatio] = useState('');

	// Sizes are resolved on the server; only the choice between them is made here.
	const imageUrl = itemImageSizes?.[sizeSlug] || itemImgUrl;

	// An explicit focal point of this block wins over the one stored with the
	// image, the same way the render callback resolves it.
	const activeFocalPoint = focalPoint || itemFocalPoint;

	const imageStyles = {
		objectFit: backgroundSize,
		objectPosition: activeFocalPoint
			? `${activeFocalPoint.x * 100}% ${activeFocalPoint.y * 100}%`
			: undefined,
	};

	const hasOverlay =
		!!dimRatio &&
		!!(overlayColor || customOverlayColor || gradient || customGradient);
	const hasHoverOverlay =
		!!hoverDimRatio &&
		!!(
			hoverOverlayColor ||
			customHoverOverlayColor ||
			hoverGradient ||
			customHoverGradient
		);

	const overlayStyles = {};

	if (gradient || customGradient) {
		overlayStyles.background = gradient
			? `var(--wp--preset--gradient--${gradient})`
			: customGradient;
	} else if (overlayColor || customOverlayColor) {
		overlayStyles.backgroundColor = overlayColor
			? `var(--wp--preset--color--${overlayColor})`
			: customOverlayColor;
	}

	const hoverOverlayStyles = {
		'--vp-hover-overlay-opacity': hoverDimRatio / 100,
	};

	if (hoverGradient || customHoverGradient) {
		hoverOverlayStyles.background = hoverGradient
			? `var(--wp--preset--gradient--${hoverGradient})`
			: customHoverGradient;
	} else if (hoverOverlayColor || customHoverOverlayColor) {
		hoverOverlayStyles.backgroundColor = hoverOverlayColor
			? `var(--wp--preset--color--${hoverOverlayColor})`
			: customHoverOverlayColor;
	}

	const resolvedRatio = aspectRatio || naturalRatio || undefined;

	// `never` still means "do not render it", which holds wherever the content
	// sits, so only the hover mode is rewritten.
	let resolvedShowContent = showContent;

	if (isBelow) {
		resolvedShowContent = showContent === 'never' ? 'never' : 'always';
	}

	const blockProps = useBlockProps({
		className: classnames(
			`vp-content-placement-${isBelow ? 'below' : 'over'}`,
			`vp-effect-${isBelow ? 'none' : effect}`,
			`vp-show-content-${resolvedShowContent}`,
			!isBelow && CONTENT_POSITION_CLASSES[contentPosition],
			{
				[`is-vertically-aligned-${verticalAlignment}`]:
					!isBelow && verticalAlignment,
			}
		),
		style: {
			// With the content below, the ratio shapes the picture rather than
			// the card, so it travels to the media box instead.
			aspectRatio: isBelow ? undefined : resolvedRatio,
			minHeight: minHeight || undefined,
		},
	});

	// The inner blocks stay editable whatever `showContent` says - the render
	// callback is the one that leaves them out.
	const innerBlocksProps = useInnerBlocksProps(
		{ className: 'wp-block-visual-portfolio-item-cover__inner' },
		{ template: TEMPLATE, allowedBlocks: ALLOWED_BLOCKS }
	);

	return (
		<>
			{blockEditingMode === 'default' && (
				<>
					{!isBelow && (
						<BlockControls group="block">
							<BlockAlignmentMatrixControl
								label={__(
									'Content position',
									'visual-portfolio'
								)}
								value={contentPosition}
								onChange={(value) =>
									setAttributes({ contentPosition: value })
								}
							/>
							<BlockVerticalAlignmentControl
								value={verticalAlignment}
								onChange={(value) =>
									setAttributes({ verticalAlignment: value })
								}
							/>
						</BlockControls>
					)}
					<InspectorControls group="color">
						{colorGradientSettings.hasColorsOrGradients && (
							<ColorGradientSettingsDropdown
								__experimentalIsRenderedInSidebar
								settings={[
									{
										label: __(
											'Overlay',
											'visual-portfolio'
										),
										colorValue: overlayColor
											? `var(--wp--preset--color--${overlayColor})`
											: customOverlayColor,
										gradientValue: gradient
											? `var(--wp--preset--gradient--${gradient})`
											: customGradient,
										onColorChange: (value) => {
											const slug =
												colorGradientSettings.colors?.find(
													(color) =>
														color.color === value
												)?.slug;

											setAttributes({
												overlayColor: slug,
												customOverlayColor: slug
													? undefined
													: value,
											});
										},
										onGradientChange: (value) => {
											const slug =
												colorGradientSettings.gradients?.find(
													(item) =>
														item.gradient === value
												)?.slug;

											setAttributes({
												gradient: slug,
												customGradient: slug
													? undefined
													: value,
											});
										},
										isShownByDefault: true,
									},
									{
										label: __(
											'Hover overlay',
											'visual-portfolio'
										),
										colorValue: hoverOverlayColor
											? `var(--wp--preset--color--${hoverOverlayColor})`
											: customHoverOverlayColor,
										gradientValue: hoverGradient
											? `var(--wp--preset--gradient--${hoverGradient})`
											: customHoverGradient,
										onColorChange: (value) => {
											const slug =
												colorGradientSettings.colors?.find(
													(color) =>
														color.color === value
												)?.slug;

											setAttributes({
												hoverOverlayColor: slug,
												customHoverOverlayColor: slug
													? undefined
													: value,
											});
										},
										onGradientChange: (value) => {
											const slug =
												colorGradientSettings.gradients?.find(
													(item) =>
														item.gradient === value
												)?.slug;

											setAttributes({
												hoverGradient: slug,
												customHoverGradient: slug
													? undefined
													: value,
											});
										},
										isShownByDefault: true,
									},
								]}
								panelId={clientId}
								{...colorGradientSettings}
							/>
						)}
						<ToolsPanelItem
							label={__('Overlay opacity', 'visual-portfolio')}
							isShownByDefault
							hasValue={() => dimRatio !== 0}
							onDeselect={() => setAttributes({ dimRatio: 0 })}
							panelId={clientId}
						>
							<RangeControl
								label={__(
									'Overlay opacity',
									'visual-portfolio'
								)}
								value={dimRatio}
								onChange={(value) =>
									setAttributes({ dimRatio: value })
								}
								min={0}
								max={100}
								step={10}
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={__(
								'Hover overlay opacity',
								'visual-portfolio'
							)}
							isShownByDefault
							hasValue={() => hoverDimRatio !== 50}
							onDeselect={() =>
								setAttributes({ hoverDimRatio: 50 })
							}
							panelId={clientId}
						>
							<RangeControl
								label={__(
									'Hover overlay opacity',
									'visual-portfolio'
								)}
								value={hoverDimRatio}
								onChange={(value) =>
									setAttributes({ hoverDimRatio: value })
								}
								min={0}
								max={100}
								step={10}
							/>
						</ToolsPanelItem>
					</InspectorControls>
					<InspectorControls group="dimensions">
						<ToolsPanelItem
							label={__('Aspect ratio', 'visual-portfolio')}
							hasValue={() => aspectRatio !== '1'}
							onDeselect={() =>
								setAttributes({ aspectRatio: '1' })
							}
							resetAllFilter={() => ({ aspectRatio: '1' })}
							panelId={clientId}
						>
							<TextControl
								label={__('Aspect ratio', 'visual-portfolio')}
								help={__(
									'For example 1, 4/3 or 16/9. Leave empty to give every cover the proportions of its own image, the way a masonry layout wants them.',
									'visual-portfolio'
								)}
								value={aspectRatio}
								onChange={(value) =>
									setAttributes({ aspectRatio: value })
								}
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={__('Minimum height', 'visual-portfolio')}
							hasValue={() => !!minHeight}
							onDeselect={() =>
								setAttributes({ minHeight: undefined })
							}
							resetAllFilter={() => ({ minHeight: undefined })}
							panelId={clientId}
						>
							<UnitControl
								label={__('Minimum height', 'visual-portfolio')}
								value={minHeight}
								onChange={(value) =>
									setAttributes({ minHeight: value })
								}
							/>
						</ToolsPanelItem>
						<ToolsPanelItem
							label={__('Scale', 'visual-portfolio')}
							hasValue={() => backgroundSize !== 'cover'}
							onDeselect={() =>
								setAttributes({ backgroundSize: 'cover' })
							}
							resetAllFilter={() => ({ backgroundSize: 'cover' })}
							panelId={clientId}
						>
							<SelectControl
								label={__('Scale', 'visual-portfolio')}
								value={backgroundSize}
								options={BACKGROUND_SIZE_OPTIONS}
								onChange={(value) =>
									setAttributes({ backgroundSize: value })
								}
							/>
						</ToolsPanelItem>
					</InspectorControls>
					<InspectorControls>
						<ToolsPanel
							label={__('Settings', 'visual-portfolio')}
							dropdownMenuProps={dropdownMenuProps}
							panelId={clientId}
							resetAll={() => setAttributes(DEFAULT_ATTRIBUTES)}
						>
							<ToolsPanelItem
								label={__(
									'Content placement',
									'visual-portfolio'
								)}
								isShownByDefault
								hasValue={() => contentPlacement !== 'over'}
								onDeselect={() =>
									setAttributes({ contentPlacement: 'over' })
								}
								panelId={clientId}
							>
								<SelectControl
									label={__(
										'Content placement',
										'visual-portfolio'
									)}
									help={__(
										'Below the image the content is always visible, which is what a touch screen wants.',
										'visual-portfolio'
									)}
									value={contentPlacement}
									options={CONTENT_PLACEMENT_OPTIONS}
									onChange={(value) =>
										setAttributes({
											contentPlacement: value,
										})
									}
								/>
							</ToolsPanelItem>
							{!isBelow && (
								<ToolsPanelItem
									label={__('Effect', 'visual-portfolio')}
									isShownByDefault
									hasValue={() => effect !== 'fade'}
									onDeselect={() =>
										setAttributes({ effect: 'fade' })
									}
									panelId={clientId}
								>
									<SelectControl
										label={__('Effect', 'visual-portfolio')}
										help={__(
											'How the content appears above the image. Fly follows the side the pointer came in from.',
											'visual-portfolio'
										)}
										value={effect}
										options={EFFECT_OPTIONS}
										onChange={(value) =>
											setAttributes({ effect: value })
										}
									/>
								</ToolsPanelItem>
							)}
							{!isBelow && (
								<ToolsPanelItem
									label={__(
										'Show content',
										'visual-portfolio'
									)}
									isShownByDefault
									hasValue={() => showContent !== 'hover'}
									onDeselect={() =>
										setAttributes({ showContent: 'hover' })
									}
									panelId={clientId}
								>
									<SelectControl
										label={__(
											'Show content',
											'visual-portfolio'
										)}
										help={__(
											'Touch screens always show the content, whatever this says.',
											'visual-portfolio'
										)}
										value={showContent}
										options={SHOW_CONTENT_OPTIONS}
										onChange={(value) =>
											setAttributes({
												showContent: value,
											})
										}
									/>
								</ToolsPanelItem>
							)}
							<ToolsPanelItem
								label={__('Image size', 'visual-portfolio')}
								isShownByDefault
								hasValue={() => sizeSlug !== 'large'}
								onDeselect={() =>
									setAttributes({ sizeSlug: 'large' })
								}
								panelId={clientId}
							>
								<SelectControl
									label={__('Image size', 'visual-portfolio')}
									value={sizeSlug}
									options={IMAGE_SIZE_OPTIONS}
									onChange={(value) =>
										setAttributes({ sizeSlug: value })
									}
								/>
							</ToolsPanelItem>
							{imageUrl && (
								<ToolsPanelItem
									label={__(
										'Focal point',
										'visual-portfolio'
									)}
									hasValue={() => !!focalPoint}
									onDeselect={() =>
										setAttributes({ focalPoint: undefined })
									}
									panelId={clientId}
								>
									<FocalPointPicker
										label={__(
											'Focal point',
											'visual-portfolio'
										)}
										help={__(
											'Overrides the focal point stored with each image.',
											'visual-portfolio'
										)}
										url={imageUrl}
										value={activeFocalPoint}
										onChange={(value) =>
											setAttributes({ focalPoint: value })
										}
									/>
								</ToolsPanelItem>
							)}
							<ToolsPanelItem
								label={__('On click', 'visual-portfolio')}
								isShownByDefault
								hasValue={() => 'none' !== clickAction}
								onDeselect={() =>
									setAttributes({ clickAction: 'none' })
								}
								panelId={clientId}
							>
								<SelectControl
									label={__('On click', 'visual-portfolio')}
									help={__(
										'Covers the whole item with a link, and gives the keyboard something to focus so the content can be reached.',
										'visual-portfolio'
									)}
									value={clickAction}
									options={CLICK_ACTION_OPTIONS}
									onChange={(value) =>
										setAttributes({ clickAction: value })
									}
								/>
							</ToolsPanelItem>
							{'url' === clickAction && (
								<>
									<ToolsPanelItem
										label={__(
											'Open in new tab',
											'visual-portfolio'
										)}
										hasValue={() => linkTarget === '_blank'}
										onDeselect={() =>
											setAttributes({
												linkTarget: '_self',
											})
										}
										panelId={clientId}
									>
										<ToggleControl
											label={__(
												'Open in new tab',
												'visual-portfolio'
											)}
											checked={linkTarget === '_blank'}
											onChange={(value) =>
												setAttributes({
													linkTarget: value
														? '_blank'
														: '_self',
												})
											}
										/>
									</ToolsPanelItem>
									<ToolsPanelItem
										label={__(
											'Link rel',
											'visual-portfolio'
										)}
										hasValue={() => !!rel}
										onDeselect={() =>
											setAttributes({ rel: '' })
										}
										panelId={clientId}
									>
										<TextControl
											label={__(
												'Link rel',
												'visual-portfolio'
											)}
											value={rel}
											onChange={(value) =>
												setAttributes({ rel: value })
											}
										/>
									</ToolsPanelItem>
								</>
							)}
						</ToolsPanel>
					</InspectorControls>
				</>
			)}
			<div {...blockProps}>
				<div
					className="wp-block-visual-portfolio-item-cover__media"
					style={{
						aspectRatio: isBelow ? resolvedRatio : undefined,
					}}
				>
					{imageUrl ? (
						<img
							className="wp-block-visual-portfolio-item-cover__image-background"
							src={imageUrl}
							alt={itemImgAlt || ''}
							style={imageStyles}
							onLoad={(event) =>
								setNaturalRatio(
									`${event.target.naturalWidth}/${event.target.naturalHeight}`
								)
							}
						/>
					) : (
						<span
							className="wp-block-visual-portfolio-item-cover__image-background"
							style={{ background: 'currentcolor', opacity: 0.1 }}
							aria-hidden="true"
						/>
					)}
					{hasOverlay && (
						<span
							className={classnames(
								'wp-block-visual-portfolio-item-cover__overlay',
								'has-background-dim',
								`has-background-dim-${dimRatio}`,
								{
									'has-background-gradient':
										gradient || customGradient,
								}
							)}
							style={overlayStyles}
							aria-hidden="true"
						/>
					)}
					{hasHoverOverlay && (
						<span
							className={classnames(
								'wp-block-visual-portfolio-item-cover__overlay',
								'wp-block-visual-portfolio-item-cover__overlay--hover',
								{
									'has-background-gradient':
										hoverGradient || customHoverGradient,
								}
							)}
							style={hoverOverlayStyles}
							aria-hidden="true"
						/>
					)}
				</div>
				{/* No link element here: it covers the cover on the front end,
				    and in the editor that is every click meant for a block. */}
				<div {...innerBlocksProps} />
			</div>
		</>
	);
}
