/**
 * WordPress dependencies
 */
import {
	BlockControls,
	__experimentalColorGradientSettingsDropdown as ColorGradientSettingsDropdown,
	InspectorControls,
	useBlockEditingMode,
	useBlockProps,
	__experimentalUseMultipleOriginColorsAndGradients as useMultipleOriginColorsAndGradients,
} from '@wordpress/block-editor';
import {
	RangeControl,
	SelectControl,
	TextControl,
	ToggleControl,
	ToolbarDropdownMenu,
	__experimentalToolsPanel as ToolsPanel,
	__experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import { fullscreen, link, linkOff } from '@wordpress/icons';
/**
 * External dependencies
 */
import classnames from 'classnames/dedupe';
/**
 * Internal dependencies
 */
import { AspectRatioTool, ScaleTool } from '../../utils/dimensions-tools';
import {
	IMAGE_SIZE_OPTIONS,
	useImageSizeOnInsert,
} from '../../utils/item-image-size';
import { useToolsPanelDropdownMenuProps } from '../../utils/tools-panel';

const CLICK_ACTION_OPTIONS = [
	{ label: __('None', 'visual-portfolio'), value: 'none' },
	{ label: __('Open the item', 'visual-portfolio'), value: 'url' },
	{ label: __('Open the lightbox', 'visual-portfolio'), value: 'popup' },
];

// What a click does is a link setting, and the toolbar is where core keeps the
// link of an image.
const CLICK_ACTION_ICONS = {
	none: linkOff,
	url: link,
	popup: fullscreen,
};

const DEFAULT_ATTRIBUTES = {
	clickAction: 'none',
	rel: '',
	linkTarget: '_self',
	sizeSlug: 'large',
};

// The overlay lives in the Color panel and the proportions in Dimensions, each
// with a "Reset all" of its own, so "Reset all" in Settings leaves them alone.

export default function ItemImageEdit({
	attributes,
	setAttributes,
	context,
	clientId,
}) {
	const dropdownMenuProps = useToolsPanelDropdownMenuProps();

	const {
		clickAction,
		rel,
		linkTarget,
		sizeSlug,
		aspectRatio,
		scale,
		overlayColor,
		customOverlayColor,
		gradient,
		customGradient,
		dimRatio,
	} = attributes;

	const {
		'vp/itemImgUrl': itemImgUrl,
		'vp/itemImgAlt': itemImgAlt,
		'vp/itemImageSizes': itemImageSizes,
		'vp/itemFocalPoint': itemFocalPoint,
		'vp/itemUrl': itemUrl,
		'vp/layoutColumns': layoutColumns,
	} = context;

	const blockProps = useBlockProps();
	const blockEditingMode = useBlockEditingMode();
	const colorGradientSettings = useMultipleOriginColorsAndGradients();

	useImageSizeOnInsert(clientId, layoutColumns, setAttributes);

	// Sizes are resolved on the server; only the choice between them is made here.
	const imageUrl = itemImageSizes?.[sizeSlug] || itemImgUrl;

	const hasOverlay =
		!!dimRatio &&
		!!(overlayColor || customOverlayColor || gradient || customGradient);

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

	const imageStyles = aspectRatio
		? {
				aspectRatio,
				width: '100%',
				height: '100%',
				objectFit: scale,
				objectPosition: itemFocalPoint
					? `${itemFocalPoint.x * 100}% ${itemFocalPoint.y * 100}%`
					: undefined,
			}
		: undefined;

	const imageElement = (
		<>
			{imageUrl ? (
				<img
					src={imageUrl}
					alt={itemImgAlt || ''}
					style={imageStyles}
				/>
			) : (
				<div
					className="wp-block-visual-portfolio-item-image__placeholder"
					style={imageStyles}
				>
					<svg
						className="wp-block-visual-portfolio-item-image__placeholder-illustration"
						viewBox="0 0 60 60"
						preserveAspectRatio="none"
						xmlns="http://www.w3.org/2000/svg"
						aria-hidden="true"
						focusable="false"
					>
						<path
							vectorEffect="non-scaling-stroke"
							d="M60 60 0 0"
						/>
					</svg>
				</div>
			)}
			{hasOverlay && (
				<span
					className={classnames(
						'wp-block-visual-portfolio-item-image__overlay',
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
		</>
	);

	return (
		<>
			{blockEditingMode === 'default' && (
				<>
					<BlockControls group="block">
						<ToolbarDropdownMenu
							icon={CLICK_ACTION_ICONS[clickAction]}
							label={__('On click', 'visual-portfolio')}
							controls={CLICK_ACTION_OPTIONS.map((option) => ({
								title: option.label,
								icon: CLICK_ACTION_ICONS[option.value],
								isActive: option.value === clickAction,
								onClick: () =>
									setAttributes({
										clickAction: option.value,
									}),
							}))}
						/>
					</BlockControls>
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
					</InspectorControls>
					<InspectorControls group="dimensions">
						<AspectRatioTool
							panelId={clientId}
							value={aspectRatio}
							onChange={(value) =>
								setAttributes({ aspectRatio: value })
							}
							resetAllFilter={() => ({ aspectRatio: '' })}
						/>
						{/* Without a ratio the image keeps its own proportions,
						    and there is no box left for the scale to fill. */}
						{!!aspectRatio && (
							<ScaleTool
								panelId={clientId}
								value={scale}
								onChange={(value) =>
									setAttributes({ scale: value })
								}
								resetAllFilter={() => ({ scale: 'cover' })}
							/>
						)}
					</InspectorControls>
					<InspectorControls>
						<ToolsPanel
							label={__('Settings', 'visual-portfolio')}
							dropdownMenuProps={dropdownMenuProps}
							panelId={clientId}
							resetAll={() => setAttributes(DEFAULT_ATTRIBUTES)}
						>
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
			<figure {...blockProps}>
				{'url' === clickAction && itemUrl ? (
					// The link is inert in the editor, the click belongs to the block.
					<a
						href={itemUrl}
						target={linkTarget}
						rel={rel || undefined}
						onClick={(event) => event.preventDefault()}
					>
						{imageElement}
					</a>
				) : (
					imageElement
				)}
			</figure>
		</>
	);
}
