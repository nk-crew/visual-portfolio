import './style.scss';
import './extensions/dynamic-categories';
import './extensions/image-title-and-desription';

import {
	closestCenter,
	DndContext,
	PointerSensor,
	useSensor,
	useSensors,
} from '@dnd-kit/core';
import {
	arrayMove,
	rectSortingStrategy,
	SortableContext,
	useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import classnames from 'classnames/dedupe';

import { MediaUpload, MediaUploadCheck } from '@wordpress/block-editor';
import {
	Button,
	FocalPointPicker,
	Modal,
	TextControl,
} from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { useState } from '@wordpress/element';
import { applyFilters } from '@wordpress/hooks';
import { __, _n, sprintf } from '@wordpress/i18n';

import ControlsRender from '../controls-render';

const { navigator, VPGutenbergVariables } = window;

const ALLOWED_MEDIA_TYPES = ['image'];

function getHumanFileSize(size) {
	const i = Math.floor(Math.log(size) / Math.log(1024));
	return `${(size / 1024 ** i).toFixed(2) * 1} ${
		['B', 'KB', 'MB', 'GB', 'TB'][i]
	}`;
}

function prepareImage(img) {
	const imgData = {
		id: img.id,
		imgUrl: img.url,
		imgThumbnailUrl: img.url,
	};

	// Prepare thumbnail for all images except GIF, since GIFs animated only in full size.
	if (!img.mime || img.mime !== 'image/gif') {
		if (img.sizes && img.sizes.large && img.sizes.large.url) {
			imgData.imgThumbnailUrl = img.sizes.large.url;
		} else if (img.sizes && img.sizes.medium && img.sizes.medium.url) {
			imgData.imgThumbnailUrl = img.sizes.medium.url;
		} else if (
			img.sizes &&
			img.sizes.thumbnail &&
			img.sizes.thumbnail.url
		) {
			imgData.imgThumbnailUrl = img.sizes.thumbnail.url;
		}
	}

	if (img.title) {
		imgData.title = img.title;
	}
	if (img.description) {
		imgData.description = img.description;
	}

	return imgData;
}

/**
 * Prepare selected images array using our format.
 * Use the current images set with already user data on images.
 *
 * @param {Array} images        - new images set.
 * @param {Array} currentImages - current images set.
 * @return {Array}
 */
function prepareImages(images, currentImages) {
	const result = [];
	const currentImagesIds =
		currentImages && Object.keys(currentImages).length
			? currentImages.map((img) => img.id)
			: [];

	if (images && images.length) {
		images.forEach((img) => {
			// We have to check for image URL, because when the image is removed from the
			// system, it should be removed from our block as well after re-save.
			if (img.url) {
				let currentImgData = false;

				if (currentImagesIds.length) {
					const currentId = currentImagesIds.indexOf(img.id);

					if (currentId > -1 && currentImages[currentId]) {
						currentImgData = currentImages[currentId];
					}
				}

				const imgData = currentImgData || prepareImage(img);

				result.push(imgData);
			}
		});
	}

	return result;
}

const SelectedImageData = function (props) {
	const {
		showFocalPoint,
		focalPoint,
		imgId,
		imgUrl,
		onChangeFocalPoint,
		onChangeImage,
	} = props;

	const [showMoreInfo, setShowMoreInfo] = useState(false);
	const [linkCopied, setLinkCopied] = useState(false);

	const { imageData } = useSelect(
		(select) => {
			if (!imgId) {
				return {};
			}

			const { getMedia } = select('core');

			const imgData = getMedia(imgId);

			if (!imgData) {
				return {};
			}

			return {
				imageData: imgData,
			};
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[showMoreInfo, imgId]
	);

	return (
		<MediaUploadCheck>
			<div
				className={`vpf-component-gallery-control-item-modal-image-info editor-post-featured-image ${
					showMoreInfo
						? 'vpf-component-gallery-control-item-modal-image-info-sticky-bottom'
						: ''
				}`}
			>
				{showFocalPoint ? (
					<FocalPointPicker
						url={imageData?.source_url || imgUrl}
						value={focalPoint}
						dimensions={{
							width: imageData?.media_details?.width || 80,
							height: imageData?.media_details?.height || 80,
						}}
						onChange={(val) => {
							onChangeFocalPoint(val);
						}}
					/>
				) : null}
				<MediaUpload
					onSelect={(image) => {
						const imgData = prepareImage(image);
						onChangeImage(imgData);
					}}
					allowedTypes={ALLOWED_MEDIA_TYPES}
					render={({ open }) => (
						<Button onClick={open} isSecondary>
							{__('Replace Image', 'visual-portfolio')}
						</Button>
					)}
				/>
				<Button
					onClick={() => {
						onChangeImage(false);
					}}
					isLink
					isDestructive
				>
					{__('Remove Image from Gallery', 'visual-portfolio')}
				</Button>
				<div className="vpf-component-gallery-control-item-modal-image-additional-info">
					<Button
						onClick={() => {
							setShowMoreInfo(!showMoreInfo);
						}}
						isLink
					>
						{showMoreInfo
							? __('Hide Additional Info', 'visual-portfolio')
							: __('Show Additional Info', 'visual-portfolio')}
						<svg
							width="20"
							height="20"
							viewBox="0 0 20 20"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								d="M8 4L14 10L8 16"
								stroke="currentColor"
								fill="none"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
								transform={`rotate(${
									showMoreInfo ? '-' : ''
								}90 10 10)`}
							/>
						</svg>
					</Button>
					{showMoreInfo ? (
						<>
							<div>
								<strong>
									{__('File name:', 'visual-portfolio')}
								</strong>{' '}
								{imageData?.source_url.split('/').pop() || '-'}
								<br />{' '}
								<strong>
									{__('File type:', 'visual-portfolio')}
								</strong>{' '}
								{imageData?.mime_type || '-'}
								<br />{' '}
								<strong>
									{__('File size:', '@text_domain')}
								</strong>{' '}
								{imageData?.media_details?.filesize
									? getHumanFileSize(
											imageData.media_details.filesize
									  )
									: '-'}
								{imageData?.media_details?.width ? (
									<>
										<br />{' '}
										<strong>
											{__('Dimensions:', '@text_domain')}
										</strong>{' '}
										{imageData.media_details.width} by{' '}
										{imageData.media_details.height} pixels
									</>
								) : null}
							</div>
							<div>
								<TextControl
									label={__('File URL:', 'visual-portfolio')}
									value={imageData?.source_url || ''}
									readOnly
								/>
								<Button
									onClick={() => {
										navigator.clipboard
											.writeText(
												imageData?.source_url || ''
											)
											.then(() => {
												setLinkCopied(true);
											});
									}}
									isSecondary
									isSmall
								>
									{__(
										'Copy URL to Clipboard',
										'visual-portfolio'
									)}
								</Button>
								{linkCopied ? (
									<span className="vpf-component-gallery-control-item-modal-image-additional-info-copied">
										{__('Copied!', 'visual-portfolio')}
									</span>
								) : null}
							</div>
							{imageData?.link ? (
								<div>
									<a
										href={imageData?.link}
										target="_blank"
										rel="noreferrer"
									>
										{__(
											'View attachment page',
											'visual-portfolio'
										)}
									</a>
									{' | '}
									<a
										href={`${VPGutenbergVariables.admin_url}post.php?post=${imageData.id}&action=edit`}
										target="_blank"
										rel="noreferrer"
									>
										{__(
											'Edit more details',
											'visual-portfolio'
										)}
									</a>
								</div>
							) : null}
						</>
					) : null}
				</div>
			</div>
		</MediaUploadCheck>
	);
};

const SortableItem = function (props) {
	const {
		img,
		items,
		index,
		onChange,
		imageControls,
		controlName,
		focalPoint,
		clientId,
		isSetupWizard,
	} = props;

	const idx = index - 1;

	const {
		attributes,
		listeners,
		setNodeRef,
		transform,
		transition,
		isDragging,
		isSorting,
	} = useSortable({
		id: props.id,
	});

	const style = {
		transform: CSS.Translate.toString(transform),
		transition: isSorting ? transition : '',
	};

	const [isOpen, setOpen] = useState(false);
	const openModal = () => setOpen(true);
	const closeModal = () => setOpen(false);

	return (
		<>
			<div
				className={classnames(
					'vpf-component-gallery-control-item',
					isDragging
						? 'vpf-component-gallery-control-item-dragging'
						: ''
				)}
				ref={setNodeRef}
				style={style}
				{...attributes}
				{...listeners}
			>
				<Button
					className="vpf-component-gallery-control-item-button"
					onClick={openModal}
					aria-expanded={isOpen}
				>
					<img
						src={img.imgThumbnailUrl || img.imgUrl}
						alt={img.alt || img.imgThumbnailUrl || img.imgUrl}
						loading="lazy"
					/>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="24"
						height="24"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<circle cx="12" cy="12" r="3" />
						<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
					</svg>
				</Button>
				<Button
					className="vpf-component-gallery-control-item-remove"
					onClick={() => {
						const newImages = [...items];

						if (newImages[idx]) {
							newImages.splice(idx, 1);

							onChange(newImages);
						}
					}}
				>
					<svg
						width="20"
						height="20"
						viewBox="0 0 20 20"
						fill="none"
						xmlns="http://www.w3.org/2000/svg"
					>
						<path
							d="M3.5 5.5H7.5M16.5 5.5H12.5M12.5 5.5V2.5H7.5V5.5M12.5 5.5H7.5M5 8.5L6 17H14L15 8.5"
							stroke="currentColor"
							strokeWidth="1.5"
							strokeLinecap="round"
							strokeLinejoin="round"
							fill="transparent"
						/>
					</svg>
				</Button>
			</div>
			{isOpen ? (
				<Modal
					title={__('Image Settings', 'visual-portfolio')}
					onRequestClose={(e) => {
						if (
							e?.relatedTarget?.classList?.contains('media-modal')
						) {
							// Don't close modal if opened media modal.
						} else {
							closeModal(e);
						}
					}}
				>
					<div className="vpf-component-gallery-control-item-modal">
						{focalPoint && img.id ? (
							<SelectedImageData
								showFocalPoint={focalPoint}
								focalPoint={img.focalPoint}
								imgId={img.id}
								imgUrl={img.imgThumbnailUrl || img.imgUrl}
								onChangeFocalPoint={(val) => {
									const newImages = [...items];

									if (newImages[idx]) {
										newImages[idx] = {
											...newImages[idx],
											focalPoint: val,
										};

										onChange(newImages);
									}
								}}
								onChangeImage={(imgData) => {
									const newImages = [...items];

									if (!newImages[idx]) {
										return;
									}

									if (imgData === false) {
										newImages.splice(idx, 1);

										onChange(newImages);

										closeModal();
									} else {
										newImages[idx] = {
											...newImages[idx],
											...imgData,
										};

										onChange(newImages);
									}
								}}
							/>
						) : (
							''
						)}
						<div>
							{Object.keys(imageControls).map((name) => {
								const newCondition = [];

								// prepare name.
								const imgControlName = `${controlName}[${idx}].${name}`;

								// prepare conditions for the current item.
								if (imageControls[name].condition.length) {
									imageControls[name].condition.forEach(
										(data) => {
											const newData = { ...data };

											if (
												newData.control &&
												/SELF/g.test(newData.control)
											) {
												newData.control =
													newData.control.replace(
														/SELF/g,
														`${controlName}[${idx}]`
													);
											}

											newCondition.push(newData);
										}
									);
								}

								return applyFilters(
									'vpf.editor.gallery-controls-render',
									<ControlsRender.Control
										key={`${
											img.id ||
											img.imgThumbnailUrl ||
											img.imgUrl
										}-${idx}-${name}`}
										attributes={props.attributes}
										onChange={(val) => {
											const newImages = [...items];

											if (newImages[idx]) {
												newImages[idx] = {
													...newImages[idx],
													[name]: val,
												};

												onChange(newImages);
											}
										}}
										{...imageControls[name]}
										name={imgControlName}
										value={img[name]}
										condition={newCondition}
										clientId={clientId}
										isSetupWizard={isSetupWizard}
									/>,
									imageControls[name],
									props,
									{
										name,
										fullName: imgControlName,
										index: idx,
										condition: newCondition,
									}
								);
							})}
						</div>
					</div>
				</Modal>
			) : null}
		</>
	);
};

const SortableList = function (props) {
	const {
		items,
		onChange,
		onSortEnd,
		imageControls,
		controlName,
		attributes,
		focalPoint,
		isSetupWizard,
	} = props;

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
	);

	// Automatically open images selector when first time select Images in Setup Wizard.
	const [isOpenedInSetupWizard, setOpenInSetupWizard] = useState(
		!isSetupWizard
	);
	const [showingItems, setShowingItems] = useState(18);

	const sortableItems = [];

	if (items && items.length) {
		items.forEach((data, i) => {
			if (i < showingItems) {
				sortableItems.push({
					id: i + 1,
					data,
				});
			}
		});
	}

	const editGalleryButton = (
		<MediaUpload
			multiple="add"
			onSelect={(images) => {
				onChange(prepareImages(images, items));
			}}
			allowedTypes={ALLOWED_MEDIA_TYPES}
			value={items && items.length ? items.map((img) => img.id) : false}
			render={({ open }) => {
				if (!isOpenedInSetupWizard && (!items || !items.length)) {
					setOpenInSetupWizard(true);
					open();
				}

				return (
					<Button
						className="vpf-component-gallery-control-item-fullwidth vpf-component-gallery-control-item-add"
						onClick={(event) => {
							event.stopPropagation();
							open();
						}}
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							viewBox="0 0 24 24"
							height="20"
							width="20"
							role="img"
							aria-hidden="true"
							focusable="false"
						>
							{items && items.length ? (
								<path d="M9 14h10l-3.45-4.5-2.3 3-1.55-2Zm-1 4q-.825 0-1.412-.587Q6 16.825 6 16V4q0-.825.588-1.413Q7.175 2 8 2h12q.825 0 1.413.587Q22 3.175 22 4v12q0 .825-.587 1.413Q20.825 18 20 18Zm0-2h12V4H8v12Zm-4 6q-.825 0-1.412-.587Q2 20.825 2 20V6h2v14h14v2ZM8 4v12V4Z" />
							) : (
								<path d="M18 11.2h-5.2V6h-1.6v5.2H6v1.6h5.2V18h1.6v-5.2H18z" />
							)}
						</svg>
						<span>
							{items && items.length
								? __('Edit Gallery', 'visual-portfolio')
								: __('Add Images', 'visual-portfolio')}
						</span>
					</Button>
				);
			}}
		/>
	);

	return (
		<div className="vpf-component-gallery-control-items">
			{items && items.length && items.length > 9
				? editGalleryButton
				: null}
			<DndContext
				sensors={sensors}
				collisionDetection={closestCenter}
				onDragEnd={(event) => {
					const { active, over } = event;

					if (active.id !== over.id) {
						onSortEnd(active.id - 1, over.id - 1);
					}
				}}
			>
				<SortableContext
					items={sortableItems}
					strategy={rectSortingStrategy}
				>
					{sortableItems.map(({ data, id }) => (
						<SortableItem
							key={`vpf-component-gallery-control-items-sortable-${id}`}
							index={id}
							id={id}
							img={data}
							items={items}
							onChange={onChange}
							imageControls={imageControls}
							controlName={controlName}
							attributes={attributes}
							focalPoint={focalPoint}
							isSetupWizard={isSetupWizard}
						/>
					))}
				</SortableContext>
			</DndContext>

			{items && items.length ? (
				<span className="vpf-component-gallery-control-item-fullwidth vpf-component-gallery-control-item-pagination">
					<span>
						{sprintf(
							_n(
								'Showing %1$s of %2$s Image',
								'Showing %1$s of %2$s Images',
								items.length,
								'visual-portfolio'
							),
							showingItems > items.length
								? items.length
								: showingItems,
							items.length
						)}
					</span>
					{items.length > showingItems ? (
						<div className="vpf-component-gallery-control-item-pagination-buttons">
							<Button
								isSecondary
								isSmall
								onClick={() => {
									setShowingItems(showingItems + 18);
								}}
							>
								{__('Show More', 'visual-portfolio')}
							</Button>
							<Button
								isLink
								isSmall
								onClick={() => {
									setShowingItems(items.length);
								}}
							>
								{__('Show All', 'visual-portfolio')}
							</Button>
						</div>
					) : null}
				</span>
			) : null}

			{editGalleryButton}
		</div>
	);
};

/**
 * Component Class
 *
 * @param props
 */
export default function GalleryControl(props) {
	const {
		imageControls,
		attributes,
		name: controlName,
		value,
		onChange,
		focalPoint,
		isSetupWizard,
	} = props;

	const filteredValue = value.filter((img) => img.id);

	return (
		<div className="vpf-component-gallery-control">
			<MediaUpload
				onSelect={(images) => {
					onChange(prepareImages(images));
				}}
				allowedTypes={ALLOWED_MEDIA_TYPES}
				multiple="add"
				value={
					filteredValue && Object.keys(filteredValue).length
						? filteredValue.map((img) => img.id)
						: []
				}
				render={() => (
					<SortableList
						items={filteredValue}
						onChange={onChange}
						imageControls={imageControls}
						controlName={controlName}
						attributes={attributes}
						focalPoint={focalPoint}
						isSetupWizard={isSetupWizard}
						onSortEnd={(oldIndex, newIndex) => {
							const newImages = arrayMove(
								filteredValue,
								oldIndex,
								newIndex
							);
							onChange(newImages);
						}}
					/>
				)}
			/>
		</div>
	);
}
