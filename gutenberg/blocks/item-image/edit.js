/**
 * WordPress dependencies
 */
import {
	BlockControls,
	store as blockEditorStore,
	__experimentalColorGradientSettingsDropdown as ColorGradientSettingsDropdown,
	__experimentalImageEditor as ImageEditor,
	InspectorControls,
	MediaReplaceFlow,
	useBlockEditingMode,
	useBlockProps,
	__experimentalUseMultipleOriginColorsAndGradients as useMultipleOriginColorsAndGradients,
} from '@wordpress/block-editor';
import {
	SelectControl,
	TextControl,
	ToggleControl,
	ToolbarButton,
	ToolbarDropdownMenu,
	__experimentalToolsPanel as ToolsPanel,
	__experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { useEffect, useRef, useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';
import { crop, fullscreen, link, linkOff } from '@wordpress/icons';
/**
 * Internal dependencies
 */
import { ProTeaserPanel } from '../../components/pro-teaser';
import { ALLOWED_MEDIA_TYPES } from '../../loop-sources/gallery-manager/prepare-images';
import { getClickActions } from '../../utils/click-actions';
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
import { getGalleryImageId, useGalleryImage } from './gallery-image';

// The watermark Pro puts on a picture, for an install without it.
const WATERMARK_TEASERS = [
	{
		name: 'watermark',
		label: __('Watermark', 'visual-portfolio'),
		line: __(
			'Serve the watermarked copy of the picture instead of the original one.',
			'visual-portfolio'
		),
		campaign: 'teaser_watermark',
	},
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
	isSelected,
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
		'vp/queryType': queryType,
		'vp/itemImgId': itemImgId,
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

	// The editor hands the block editor its media handlers only for a user
	// who may upload, and the crop tool on top of that is a site setting -
	// the two conditions the core Image block puts its own tools behind.
	const { canUpload, imageEditing } = useSelect((select) => {
		const settings = select(blockEditorStore).getSettings();

		return {
			canUpload: !!settings.mediaUpload,
			imageEditing: !!settings.imageEditing,
		};
	}, []);

	const galleryImageId = getGalleryImageId(queryType, itemImgId);
	const { replaceImage, cropImage, isPending } = useGalleryImage(
		clientId,
		galleryImageId
	);
	const hasImageTools =
		!!galleryImageId && canUpload && blockEditingMode === 'default';

	// The cropper wants the pixel size of the picture, and only the picture
	// knows it: read off the `img` once it has loaded, and kept with the URL
	// it was read for, so a change of item is a picture not yet measured.
	const [naturalSize, setNaturalSize] = useState();
	const isMeasured = naturalSize?.url === imageUrl;

	// The crop under way: the attachment the cropper was opened for, so that
	// it closes with the item it was opened on rather than moving over to the
	// next one, and the width the picture had, which is the box the cropper
	// is given. Left to measure the box itself, it measures it before it has
	// one, and the cropper library carries a zero-sized first measurement
	// into every position it computes from then on.
	const imageRef = useRef();
	const [cropping, setCropping] = useState();
	const isCropping =
		isSelected &&
		hasImageTools &&
		isMeasured &&
		cropping?.id === galleryImageId;

	useEffect(() => {
		if (!isSelected) {
			setCropping(undefined);
		}
	}, [isSelected]);

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

	// Core's own crop opens its media editor modal through a private setting
	// a plugin cannot read, and the packages behind it are not scripts of
	// their own. The inline cropper is the one crop the block editor offers
	// a plugin: deprecated since 7.1, and kept exactly so that plugins have
	// somewhere to stand until the cropper package is public - it says so
	// once in the console when opened. The day it goes, the Crop button goes
	// with it rather than the block.
	const imageElement =
		isCropping && ImageEditor ? (
			<ImageEditor
				id={galleryImageId}
				url={imageUrl}
				width={cropping.width}
				height={
					(cropping.width * naturalSize.height) / naturalSize.width
				}
				naturalWidth={naturalSize.width}
				naturalHeight={naturalSize.height}
				onSaveImage={cropImage}
				onFinishEditing={() => setCropping(undefined)}
			/>
		) : (
			<>
				{imageUrl ? (
					<img
						ref={imageRef}
						src={imageUrl}
						alt={itemImgAlt || ''}
						style={imageStyles}
						onLoad={(event) =>
							setNaturalSize({
								url: imageUrl,
								width: event.target.naturalWidth,
								height: event.target.naturalHeight,
							})
						}
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
					{/* The cropper brings a toolbar of its own, and nothing else belongs beside it. */}
					{!isCropping && (
						<BlockControls group="block">
							<ToolbarDropdownMenu
								icon={CLICK_ACTION_ICONS[clickAction] || link}
								label={__('On click', 'visual-portfolio')}
								controls={getClickActions().map((option) => ({
									title: option.label,
									icon:
										option.icon ||
										CLICK_ACTION_ICONS[option.value] ||
										link,
									isActive: option.value === clickAction,
									isDisabled: option.disabled,
									onClick: () =>
										setAttributes({
											clickAction: option.value,
										}),
								}))}
							/>
							{/* Both tools wait, disabled rather than hidden so the
							    toolbar keeps its shape and its focus, while the item
							    has not caught up with the last change. */}
							{hasImageTools && imageEditing && ImageEditor && (
								<ToolbarButton
									icon={crop}
									label={__('Crop', 'visual-portfolio')}
									onClick={() =>
										setCropping({
											id: galleryImageId,
											width: imageRef.current
												?.clientWidth,
										})
									}
									disabled={!isMeasured || isPending}
								/>
							)}
						</BlockControls>
					)}
					{hasImageTools && !isCropping && (
						<BlockControls group="other">
							<MediaReplaceFlow
								mediaId={galleryImageId}
								mediaURL={imageUrl}
								allowedTypes={ALLOWED_MEDIA_TYPES}
								onSelect={replaceImage}
								name={__('Replace', 'visual-portfolio')}
								renderToggle={(toggleProps) => (
									<ToolbarButton
										{...toggleProps}
										disabled={isPending}
									/>
								)}
							/>
						</BlockControls>
					)}
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
									options={getClickActions()}
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
					<ProTeaserPanel
						label={__('Protection', 'visual-portfolio')}
						items={WATERMARK_TEASERS}
					/>
				</>
			)}
			<figure {...blockProps}>
				{'url' === clickAction && itemUrl && !isCropping ? (
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
