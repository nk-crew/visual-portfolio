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
 * Internal dependencies
 */
import { DimensionsTool } from '../../utils/dimensions-tools';
import {
	useImageSizeOnInsert,
	useImageSizeOptions,
} from '../../utils/item-image-size';
import {
	getOverlaySetting,
	getOverlayValues,
	hasOverlay,
	ItemOverlay,
	OVERLAY_ATTRIBUTES,
	OverlayOpacityItem,
} from '../../utils/item-overlay';
import {
	getResetAllValues,
	useToolsPanelDropdownMenuProps,
} from '../../utils/tools-panel';

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
		width,
		height,
		scale,
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

	const imageSizeOptions = useImageSizeOptions();

	// Sizes are resolved on the server; only the choice between them is made here.
	const imageUrl = itemImageSizes?.[sizeSlug] || itemImgUrl;

	const overlay = getOverlayValues(attributes, OVERLAY_ATTRIBUTES);

	// The rules of the core Featured Image block: a ratio owns the width, an
	// explicit width or height takes it back, and the scale only means
	// something once one of them has given the picture a box.
	const imageStyles = {
		aspectRatio: aspectRatio || undefined,
		height: height || (width ? 'auto' : undefined),
		width: width || (aspectRatio ? '100%' : undefined),
		objectFit: aspectRatio || height ? scale : undefined,
		objectPosition: itemFocalPoint
			? `${itemFocalPoint.x * 100}% ${itemFocalPoint.y * 100}%`
			: undefined,
	};

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
			{hasOverlay(overlay) && (
				<ItemOverlay
					className="wp-block-visual-portfolio-item-image__overlay"
					overlay={overlay}
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
					</InspectorControls>
					<InspectorControls group="dimensions">
						<DimensionsTool
							panelId={clientId}
							value={{ aspectRatio, width, height, scale }}
							onChange={setAttributes}
						/>
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
