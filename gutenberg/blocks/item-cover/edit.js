/**
 * WordPress dependencies
 */
import {
	__experimentalBlockAlignmentMatrixControl as BlockAlignmentMatrixControl,
	BlockControls,
	__experimentalColorGradientSettingsDropdown as ColorGradientSettingsDropdown,
	__experimentalGetGapCSSValue as getGapCSSValue,
	__experimentalGetSpacingClassesAndStyles as getSpacingClassesAndStyles,
	InspectorControls,
	useBlockEditingMode,
	useBlockProps,
	useInnerBlocksProps,
	__experimentalUseMultipleOriginColorsAndGradients as useMultipleOriginColorsAndGradients,
} from '@wordpress/block-editor';
import {
	FocalPointPicker,
	SelectControl,
	TextControl,
	ToggleControl,
	__experimentalToolsPanel as ToolsPanel,
	__experimentalToolsPanelItem as ToolsPanelItem,
	__experimentalUnitControl as UnitControl,
} from '@wordpress/components';
import { useState } from '@wordpress/element';
import { applyFilters } from '@wordpress/hooks';
import { __ } from '@wordpress/i18n';
/**
 * External dependencies
 */
import classnames from 'classnames/dedupe';
/**
 * Internal dependencies
 */
import { AspectRatioTool, ScaleTool } from '../../utils/dimensions-tools';
import {
	useImageSizeOnInsert,
	useImageSizeOptions,
} from '../../utils/item-image-size';
import {
	getOverlaySetting,
	getOverlayValues,
	HOVER_OVERLAY_ATTRIBUTES,
	hasOverlay,
	ItemOverlay,
	OVERLAY_ATTRIBUTES,
	OverlayOpacityItem,
} from '../../utils/item-overlay';
import {
	getResetAllValues,
	useToolsPanelDropdownMenuProps,
} from '../../utils/tools-panel';

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

const TEMPLATE = [
	[
		'visual-portfolio/item-title',
		{ style: { typography: { textAlign: 'center' } } },
	],
];

const EFFECT_OPTIONS = [
	{ label: __('None', 'visual-portfolio'), value: 'none' },
	{ label: __('Fade', 'visual-portfolio'), value: 'fade' },
	{ label: __('Fly', 'visual-portfolio'), value: 'fly' },
	{ label: __('Emerge', 'visual-portfolio'), value: 'emerge' },
];

// The three states the legacy gallery offers, in its own order.
const SHOW_CONTENT_OPTIONS = [
	{ label: __('On hover', 'visual-portfolio'), value: 'hover' },
	{ label: __('Except on hover', 'visual-portfolio'), value: 'default' },
	{ label: __('Always', 'visual-portfolio'), value: 'always' },
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

const OVERLAY_CLASS = 'wp-block-visual-portfolio-item-cover__overlay';

// The proportions live in the Dimensions panel, which resets them itself.
const DEFAULT_ATTRIBUTES = {
	sizeSlug: 'large',
	focalPoint: undefined,
	contentPosition: 'center',
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
		contentPosition,
		effect,
		showContent,
		clickAction,
		linkTarget,
		rel,
		style,
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

	const imageSizeOptions = useImageSizeOptions();

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

	const overlay = getOverlayValues(attributes, OVERLAY_ATTRIBUTES);
	const hoverOverlay = getOverlayValues(attributes, HOVER_OVERLAY_ATTRIBUTES);

	const resolvedRatio = aspectRatio || naturalRatio || undefined;

	// Anything else this install lets a cover be set to. A `ToolsPanelItem`
	// returned here is an ordinary child of the Settings panel, so it registers
	// with it the way the built-in ones do. Pro moves the content under the
	// picture on a narrow screen through this; its `resetAllFilter` is what
	// "Reset all" writes back for it.
	const extraSettings = applyFilters('vpf.itemCoverSettingsItems', [], {
		attributes,
		setAttributes,
		clientId,
	});

	const blockProps = useBlockProps({
		className: classnames(
			`vp-effect-${effect}`,
			`vp-show-content-${showContent}`,
			CONTENT_POSITION_CLASSES[contentPosition]
		),
		style: {
			// The ratio travels as a variable, and the stylesheet is what turns
			// it into the property. An inline `aspect-ratio` would outweigh
			// every rule there is, and a stylesheet that lays the card out as a
			// column has to be able to hand the ratio to the picture instead.
			'--vp-cover-aspect-ratio': resolvedRatio,
			minHeight: minHeight || undefined,
		},
	});

	// The inner blocks stay editable whatever `showContent` says - the render
	// callback is the one that leaves them out.
	//
	// Block spacing is written here rather than left to the block supports: the
	// value only reaches CSS through the layout support, which core's Cover has
	// and this block does not. The gap belongs to the box that holds the blocks,
	// which is this one and never the card around it.
	// Padding is kept off the card and put on the panel instead - the box the
	// blocks actually sit in. On the card it could only ever be added to the
	// panel's own, and it would inset the overlay with it, leaving an unshaded
	// frame around the picture.
	const innerBlocksProps = useInnerBlocksProps(
		{
			className: 'wp-block-visual-portfolio-item-cover__inner',
			style: {
				gap: getGapCSSValue(style?.spacing?.blockGap) || undefined,
				...getSpacingClassesAndStyles({
					style: { spacing: { padding: style?.spacing?.padding } },
				}).style,
			},
		},
		{ template: TEMPLATE, allowedBlocks: ALLOWED_BLOCKS }
	);

	return (
		<>
			{blockEditingMode === 'default' && (
				<>
					<BlockControls group="block">
						<BlockAlignmentMatrixControl
							label={__('Content position', 'visual-portfolio')}
							value={contentPosition}
							onChange={(value) =>
								setAttributes({ contentPosition: value })
							}
						/>
					</BlockControls>
					<InspectorControls group="color">
						{colorGradientSettings.hasColorsOrGradients && (
							<ColorGradientSettingsDropdown
								__experimentalIsRenderedInSidebar
								settings={[
									getOverlaySetting({
										label: __(
											'Overlay',
											'visual-portfolio'
										),
										attributes,
										names: OVERLAY_ATTRIBUTES,
										setAttributes,
										colorGradientSettings,
									}),
									getOverlaySetting({
										label: __(
											'Hover overlay',
											'visual-portfolio'
										),
										attributes,
										names: HOVER_OVERLAY_ATTRIBUTES,
										setAttributes,
										colorGradientSettings,
									}),
								]}
								panelId={clientId}
								{...colorGradientSettings}
							/>
						)}
						<OverlayOpacityItem
							label={__('Overlay opacity', 'visual-portfolio')}
							attributes={attributes}
							names={OVERLAY_ATTRIBUTES}
							defaultValue={0}
							setAttributes={setAttributes}
							panelId={clientId}
						/>
						<OverlayOpacityItem
							label={__(
								'Hover overlay opacity',
								'visual-portfolio'
							)}
							attributes={attributes}
							names={HOVER_OVERLAY_ATTRIBUTES}
							defaultValue={50}
							setAttributes={setAttributes}
							panelId={clientId}
						/>
					</InspectorControls>
					<InspectorControls group="dimensions">
						{/* "Original" here is the proportions of each item's own
						    image, which is what a masonry layout is made of. */}
						<AspectRatioTool
							panelId={clientId}
							value={aspectRatio}
							defaultValue="1"
							onChange={(value) =>
								setAttributes({ aspectRatio: value })
							}
							resetAllFilter={() => ({ aspectRatio: '1' })}
						/>
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
						{/* A cover with neither is exactly its own image, so
						    there is nothing for the scale to do. */}
						{!!(aspectRatio || minHeight) && (
							<ScaleTool
								panelId={clientId}
								value={backgroundSize}
								onChange={(value) =>
									setAttributes({ backgroundSize: value })
								}
								resetAllFilter={() => ({
									backgroundSize: 'cover',
								})}
							/>
						)}
					</InspectorControls>
					<InspectorControls>
						<ToolsPanel
							label={__('Settings', 'visual-portfolio')}
							dropdownMenuProps={dropdownMenuProps}
							panelId={clientId}
							resetAll={(filters) =>
								setAttributes(
									getResetAllValues(
										filters,
										DEFAULT_ATTRIBUTES
									)
								)
							}
						>
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
							<ToolsPanelItem
								label={__('Show content', 'visual-portfolio')}
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
										'When the overlay and the blocks on it are drawn. Touch screens show them whatever this says.',
										'visual-portfolio'
									)}
									value={showContent}
									options={SHOW_CONTENT_OPTIONS}
									onChange={(value) =>
										setAttributes({ showContent: value })
									}
								/>
							</ToolsPanelItem>
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
									options={imageSizeOptions}
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
							{extraSettings.map(({ name, Item }) => (
								<Item
									key={name}
									attributes={attributes}
									setAttributes={setAttributes}
									clientId={clientId}
								/>
							))}
						</ToolsPanel>
					</InspectorControls>
				</>
			)}
			<div {...blockProps}>
				<div className="wp-block-visual-portfolio-item-cover__media">
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
					{hasOverlay(overlay) && (
						<ItemOverlay
							className={OVERLAY_CLASS}
							overlay={overlay}
						/>
					)}
				</div>
				{/* No link element here: it covers the cover on the front end,
				    and in the editor that is every click meant for a block. */}
				<div {...innerBlocksProps}>
					{innerBlocksProps.children}
					{/* Last, so that the blocks keep the places the staggering
					    counts. The overlay is the background of the panel
					    rather than a box of its own, so that a state moves it
					    and the blocks together. */}
					{hasOverlay(hoverOverlay) && (
						<ItemOverlay
							className={OVERLAY_CLASS}
							overlay={hoverOverlay}
							isHover
						/>
					)}
				</div>
			</div>
		</>
	);
}
