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
import { isEqual } from 'lodash';

import { MediaUpload, MediaUploadCheck } from '@wordpress/block-editor';
import {
	Button,
	CheckboxControl,
	FocalPointPicker,
	Modal,
	SelectControl,
	TextControl,
} from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { useEffect, useState } from '@wordpress/element';
import { applyFilters } from '@wordpress/hooks';
import { __, _n, sprintf } from '@wordpress/i18n';

import ControlsRender from '../controls-render';
import getAllCategories from './utils/get-all-categories';

const { navigator, VPGutenbergVariables } = window;

const ALLOWED_MEDIA_TYPES = ['image'];
const UNCATEGORIZED_VALUE = '------';
const ITEMS_COUNT_DEFAULT = 18;

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

function getItemIndexByImageId(items, imgId) {
	return items.findIndex((img) => img.id === imgId);
}

function getBulkImagesDefaultValue(allItems, selectedItems, optionName) {
	let result = null;

	if (selectedItems && selectedItems.length) {
		const selectedItemsData = allItems.filter((img) =>
			selectedItems.includes(img.id)
		);

		if (selectedItemsData.length) {
			result = selectedItemsData[0][optionName];

			selectedItemsData.forEach((img) => {
				// Use isEqual to properly compare objects and arrays.
				if (result && !isEqual(result, img[optionName])) {
					result = null;
				}
			});
		}
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

const ImageEditModal = function (props) {
	const {
		idx,
		title,
		img,
		onChange,
		onRemove,
		imageControls,
		controlName,
		focalPoint,
		clientId,
		isSetupWizard,
		isBulkEdit,
		bulkItems,
		close,
		attributes,
	} = props;

	let focalPointVal = img?.focalPoint;
	let focalPointImageIdx = idx;

	// Find same focalPoint value from bulk items if available.
	if (idx === -1 && bulkItems?.length && attributes?.[controlName]) {
		const bulkValue = getBulkImagesDefaultValue(
			attributes[controlName],
			bulkItems,
			'focalPoint'
		);

		if (bulkValue) {
			focalPointImageIdx = getItemIndexByImageId(
				attributes[controlName],
				bulkItems[0]
			);

			if (focalPointImageIdx >= 0) {
				focalPointVal =
					attributes[controlName]?.[focalPointImageIdx]?.focalPoint;
			}
		}
	}

	return (
		<Modal
			title={title}
			onRequestClose={(e) => {
				if (e?.relatedTarget?.classList?.contains('media-modal')) {
					// Don't close modal if opened media modal.
				} else {
					close(e);
				}
			}}
		>
			<div className="vpf-component-gallery-control-item-modal">
				{focalPoint && img?.id ? (
					<SelectedImageData
						showFocalPoint={focalPoint}
						focalPoint={focalPointVal}
						imgId={img?.id}
						imgUrl={img.imgThumbnailUrl || img.imgUrl}
						onChangeFocalPoint={(val) => {
							onChange({ focalPoint: val });
						}}
						onChangeImage={(imgData) => {
							if (imgData === false) {
								onRemove();
							} else {
								onChange(imgData);
							}
						}}
					/>
				) : null}

				{/* Display focal point if no image ID available (used for bulk editor with image placeholder) */}
				{focalPoint && !img?.id && img?.imgThumbnailUrl ? (
					<div className="vpf-component-gallery-control-item-modal-image-info">
						<FocalPointPicker
							url={img.imgThumbnailUrl}
							value={focalPointVal}
							onChange={(val) => {
								onChange({ focalPoint: val });
							}}
						/>
					</div>
				) : null}
				<div>
					{Object.keys(imageControls).map((name) => {
						const newCondition = [];

						// Hide controls if it's bulk edit and control is not allowed for bulk edit.
						if (
							isBulkEdit &&
							!imageControls[name].allow_bulk_edit
						) {
							return null;
						}

						let imageIdx = idx;

						// Find same control value from bulk items if available.
						if (
							idx === -1 &&
							bulkItems?.length &&
							attributes?.[controlName]
						) {
							const bulkValue = getBulkImagesDefaultValue(
								attributes[controlName],
								bulkItems,
								name
							);

							if (bulkValue) {
								imageIdx = getItemIndexByImageId(
									attributes[controlName],
									bulkItems[0]
								);
							}
						}

						// prepare name.
						const imgControlName = `${controlName}[${imageIdx}].${name}`;

						// prepare conditions for the current item.
						if (imageControls[name].condition.length) {
							imageControls[name].condition.forEach((data) => {
								const newData = { ...data };

								if (
									newData.control &&
									/SELF/g.test(newData.control)
								) {
									newData.control = newData.control.replace(
										/SELF/g,
										`${controlName}[${imageIdx}]`
									);
								}

								newCondition.push(newData);
							});
						}

						return applyFilters(
							'vpf.editor.gallery-controls-render',
							<ControlsRender.Control
								key={`${
									img?.id ||
									img?.imgThumbnailUrl ||
									img?.imgUrl
								}-${imageIdx}-${name}`}
								attributes={attributes}
								onChange={(val) => {
									onChange({
										[name]: val,
									});
								}}
								{...imageControls[name]}
								name={imgControlName}
								value={img?.[name]}
								condition={newCondition}
								clientId={clientId}
								isSetupWizard={isSetupWizard}
							/>,
							imageControls[name],
							props,
							{
								name,
								fullName: imgControlName,
								index: imageIdx,
								condition: newCondition,
							}
						);
					})}
				</div>
			</div>
		</Modal>
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
		isMuffled,
		isChecked,
		onCheck,
		attributes,
	} = props;

	const idx = index - 1;

	const {
		attributes: sortableAttributes,
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
					isDragging && 'vpf-component-gallery-control-item-dragging',
					isMuffled && 'vpf-component-gallery-control-item-muffled'
				)}
				ref={setNodeRef}
				style={style}
				{...sortableAttributes}
				{...listeners}
			>
				<div
					className={classnames(
						'vpf-component-gallery-control-item-toolbar',
						isChecked &&
							'vpf-component-gallery-control-item-toolbar-checked'
					)}
				>
					{!isSetupWizard ? (
						<CheckboxControl
							className={
								'vpf-component-gallery-control-item-checkbox'
							}
							title={__('Select', 'visual-portfolio')}
							checked={isChecked}
							onChange={(val) => {
								onCheck(val);
							}}
						/>
					) : null}
					<Button
						className="vpf-component-gallery-control-item-edit"
						onClick={openModal}
						aria-expanded={isOpen}
					>
						<svg
							width="20"
							height="20"
							viewBox="0 0 20 20"
							fill="none"
							xmlns="http://www.w3.org/2000/svg"
						>
							<path
								fillRule="evenodd"
								clipRule="evenodd"
								d="M9.80483 1H10.1952C10.6658 1 11.1171 1.18964 11.4498 1.52721C11.7825 1.86477 11.9695 2.32261 11.9695 2.8V2.962C11.9698 3.27765 12.0519 3.58767 12.2077 3.86095C12.3634 4.13424 12.5872 4.36117 12.8566 4.519L13.2381 4.744C13.5078 4.90198 13.8138 4.98515 14.1253 4.98515C14.4367 4.98515 14.7427 4.90198 15.0124 4.744L15.1455 4.672C15.5527 4.43374 16.0364 4.3691 16.4904 4.49228C16.9445 4.61546 17.3319 4.91638 17.5674 5.329L17.7626 5.671C17.9975 6.08404 18.0612 6.57475 17.9398 7.0354C17.8184 7.49605 17.5217 7.889 17.115 8.128L16.9819 8.209C16.7112 8.36759 16.4865 8.59594 16.3307 8.87094C16.1749 9.14594 16.0935 9.45782 16.0948 9.775V10.225C16.0935 10.5422 16.1749 10.8541 16.3307 11.1291C16.4865 11.4041 16.7112 11.6324 16.9819 11.791L17.115 11.863C17.5217 12.102 17.8184 12.4949 17.9398 12.9556C18.0612 13.4163 17.9975 13.907 17.7626 14.32L17.5674 14.671C17.3319 15.0836 16.9445 15.3845 16.4904 15.5077C16.0364 15.6309 15.5527 15.5663 15.1455 15.328L15.0124 15.256C14.7427 15.098 14.4367 15.0148 14.1253 15.0148C13.8138 15.0148 13.5078 15.098 13.2381 15.256L12.8566 15.481C12.5872 15.6388 12.3634 15.8658 12.2077 16.139C12.0519 16.4123 11.9698 16.7223 11.9695 17.038V17.2C11.9695 17.6774 11.7825 18.1352 11.4498 18.4728C11.1171 18.8104 10.6658 19 10.1952 19H9.80483C9.33425 19 8.88295 18.8104 8.5502 18.4728C8.21745 18.1352 8.03051 17.6774 8.03051 17.2V17.038C8.03019 16.7223 7.94806 16.4123 7.79235 16.139C7.63663 15.8658 7.41282 15.6388 7.14336 15.481L6.76188 15.256C6.49215 15.098 6.18618 15.0148 5.87472 15.0148C5.56327 15.0148 5.2573 15.098 4.98757 15.256L4.8545 15.328C4.44735 15.5663 3.96365 15.6309 3.50957 15.5077C3.05549 15.3845 2.66815 15.0836 2.43256 14.671L2.23739 14.329C2.00252 13.916 1.93881 13.4253 2.06023 12.9646C2.18165 12.5039 2.47828 12.111 2.88501 11.872L3.01808 11.791C3.28885 11.6324 3.5135 11.4041 3.66929 11.1291C3.82508 10.8541 3.90648 10.5422 3.90524 10.225V9.766C3.90337 9.45187 3.8205 9.14372 3.66486 8.87215C3.50923 8.60058 3.28625 8.37506 3.01808 8.218L2.88501 8.128C2.47828 7.889 2.18165 7.49605 2.06023 7.0354C1.93881 6.57475 2.00252 6.08404 2.23739 5.671L2.43256 5.329C2.66815 4.91638 3.05549 4.61546 3.50957 4.49228C3.96365 4.3691 4.44735 4.43374 4.8545 4.672L4.98757 4.744C5.2573 4.90198 5.56327 4.98515 5.87472 4.98515C6.18618 4.98515 6.49215 4.90198 6.76188 4.744L7.14336 4.519C7.41282 4.36117 7.63663 4.13424 7.79235 3.86095C7.94806 3.58767 8.03019 3.27765 8.03051 2.962V2.8C8.03051 2.32261 8.21745 1.86477 8.5502 1.52721C8.88295 1.18964 9.33425 1 9.80483 1ZM13 10C13 11.6569 11.6569 13 10 13C8.34315 13 7 11.6569 7 10C7 8.34315 8.34315 7 10 7C11.6569 7 13 8.34315 13 10Z"
								fill="currentColor"
							/>
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
								d="M3 5.76471H17.1176"
								stroke="currentColor"
								strokeWidth="1.5"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
							<path
								d="M15.2353 5.76471V16.4706C15.2353 17.2353 14.4958 18 13.7563 18H6.36135C5.62185 18 4.88235 17.2353 4.88235 16.4706V5.76471"
								stroke="currentColor"
								strokeWidth="1.5"
								strokeLinecap="round"
								strokeLinejoin="round"
								fill="none"
							/>
							<path
								d="M6.76471 5.76471V3.88235C6.76471 2.94118 7.58824 2 8.41177 2H11.7059C12.5294 2 13.3529 2.94118 13.3529 3.88235V5.76471"
								stroke="currentColor"
								strokeWidth="1.5"
								strokeLinecap="round"
								strokeLinejoin="round"
								fill="none"
							/>
							<path
								d="M8.64706 9.52942V14.2353"
								stroke="currentColor"
								strokeWidth="1.5"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
							<path
								d="M11.4706 9.52942V14.2353"
								stroke="currentColor"
								strokeWidth="1.5"
								strokeLinecap="round"
								strokeLinejoin="round"
							/>
						</svg>
					</Button>
				</div>
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
				</Button>
			</div>
			{isOpen ? (
				<ImageEditModal
					title={__('Image Settings', 'visual-portfolio')}
					img={img}
					idx={idx}
					onChange={(val) => {
						const newImages = [...items];

						if (newImages[idx]) {
							newImages[idx] = {
								...newImages[idx],
								...val,
							};

							onChange(newImages);
						}
					}}
					onRemove={() => {
						const newImages = [...items];

						if (newImages[idx]) {
							newImages.splice(idx, 1);

							onChange(newImages);

							closeModal();
						}
					}}
					imageControls={imageControls}
					controlName={controlName}
					attributes={attributes}
					focalPoint={focalPoint}
					clientId={clientId}
					isSetupWizard={isSetupWizard}
					close={() => {
						closeModal();
					}}
				/>
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
		clientId,
	} = props;

	const sensors = useSensors(
		useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
	);

	// Automatically open images selector when first time select Images in Setup Wizard.
	const [isOpenedInSetupWizard, setOpenInSetupWizard] =
		useState(!isSetupWizard);
	const [showingItems, setShowingItems] = useState(ITEMS_COUNT_DEFAULT);
	const [filterCategory, setFilterCategory] = useState('');
	const [checkedItems, setCheckedItems] = useState([]);
	const [lastChecked, setLastChecked] = useState(false);
	const [bulkEditOpen, setBulkEditOpen] = useState(false);
	const [shiftHeld, setShiftHeld] = useState(false);

	useEffect(() => {
		function downHandler({ key }) {
			if (key === 'Shift') {
				setShiftHeld(true);
			}
		}

		function upHandler({ key }) {
			if (key === 'Shift') {
				setShiftHeld(false);
			}
		}

		window.addEventListener('keydown', downHandler);
		window.addEventListener('keyup', upHandler);

		return () => {
			window.removeEventListener('keydown', downHandler);
			window.removeEventListener('keyup', upHandler);
		};
	}, []);

	const categories = getAllCategories(items);

	useEffect(() => {
		if (
			filterCategory &&
			filterCategory !== UNCATEGORIZED_VALUE &&
			(!categories ||
				!categories.length ||
				!categories.includes(filterCategory))
		) {
			setFilterCategory('');
		}
	}, [filterCategory, categories]);

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
			{items?.length && !isSetupWizard ? (
				<div className="vpf-component-gallery-control-item-fullwidth">
					<div className="vpf-component-gallery-control-item-bulk-actions">
						<CheckboxControl
							title={__('Select All', 'visual-portfolio')}
							checked={items.length === checkedItems.length}
							onChange={() => {
								if (items.length === checkedItems.length) {
									setCheckedItems([]);
								} else {
									setCheckedItems(items.map((img) => img.id));
								}
								setLastChecked(false);
							}}
						/>
						<SelectControl
							title={__('Bulk Actions', 'visual-portfolio')}
							value={filterCategory}
							disabled={!checkedItems.length}
							options={[
								{
									label: __(
										'Bulk actions',
										'visual-portfolio'
									),
									value: '',
								},
								{
									label: __('Edit', 'visual-portfolio'),
									value: 'edit',
								},
								{
									label: __('Delete', 'visual-portfolio'),
									value: 'delete',
								},
							]}
							onChange={(val) => {
								if (
									val === 'delete' &&
									// eslint-disable-next-line no-alert
									window.confirm(
										__(
											'Are you sure you want to remove selected items?',
											'visual-portfolio'
										)
									)
								) {
									onChange(
										items.filter(
											(img) =>
												!checkedItems.includes(img.id)
										)
									);
									setCheckedItems([]);
									setLastChecked(false);
								} else if (val === 'edit') {
									setBulkEditOpen(true);
								}
							}}
						/>
					</div>
					{categories?.length ? (
						<div className="vpf-component-gallery-control-item-filter">
							<SelectControl
								title={__(
									'Filter by Category',
									'visual-portfolio'
								)}
								value={filterCategory}
								options={[
									{
										label: __('All', 'visual-portfolio'),
										value: '',
									},
									{
										label: __(
											'Uncategorized',
											'visual-portfolio'
										),
										value: UNCATEGORIZED_VALUE,
									},
									...categories.map((val) => ({
										label: val,
										value: val,
									})),
								]}
								onChange={(val) => {
									setFilterCategory(val);
								}}
							/>
							<svg
								width="20"
								height="20"
								viewBox="0 0 20 20"
								fill="none"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path
									d="M3 6H17"
									stroke="black"
									strokeWidth="1.5"
									strokeLinecap="round"
								/>
								<path
									d="M6 10L14 10"
									stroke="black"
									strokeWidth="1.5"
									strokeLinecap="round"
								/>
								<path
									d="M8 14L12 14"
									stroke="black"
									strokeWidth="1.5"
									strokeLinecap="round"
								/>
							</svg>
						</div>
					) : null}
				</div>
			) : null}
			{bulkEditOpen && !isSetupWizard ? (
				<ImageEditModal
					title={__('Bulk Image Settings', 'visual-portfolio')}
					img={{
						imgThumbnailUrl: `${VPGutenbergVariables.plugin_url}assets/images/placeholder.png`,
					}}
					idx={-1}
					onChange={(val) => {
						const newImages = [...items];

						newImages.forEach((img, i) => {
							if (checkedItems.includes(img.id)) {
								newImages[i] = {
									...img,
									...val,
								};
							}
						});

						onChange(newImages);
					}}
					imageControls={imageControls}
					controlName={controlName}
					attributes={attributes}
					focalPoint={focalPoint}
					clientId={clientId}
					isSetupWizard={isSetupWizard}
					isBulkEdit
					bulkItems={checkedItems}
					close={() => {
						setBulkEditOpen(false);
					}}
				/>
			) : null}
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
					{sortableItems.map(({ data, id }) => {
						let isMuffled = false;

						if (filterCategory === UNCATEGORIZED_VALUE) {
							isMuffled = data?.categories?.length;
						} else if (filterCategory) {
							isMuffled = data?.categories?.length
								? !data.categories.includes(filterCategory)
								: true;
						}

						return (
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
								isMuffled={isMuffled}
								clientId={clientId}
								isChecked={checkedItems.includes(data.id)}
								onCheck={() => {
									// Check/uncheck multiple items with shift key.
									if (shiftHeld && lastChecked) {
										const start = items.findIndex(
											(img) => img.id === lastChecked
										);
										const end = items.findIndex(
											(img) => img.id === data.id
										);
										const newCheckedItems = [
											...checkedItems,
										];
										const currentChecked =
											checkedItems.includes(data.id);

										const increment = start < end ? 1 : -1;
										for (
											let i = start;
											i !== end + increment;
											i += increment
										) {
											const imgId = items[i].id;
											const index =
												newCheckedItems.indexOf(imgId);

											// Remove checked item.
											if (currentChecked) {
												if (index !== -1) {
													newCheckedItems.splice(
														index,
														1
													);
												}

												// Add checked item.
											} else if (index === -1) {
												newCheckedItems.push(imgId);
											}
										}

										setCheckedItems(newCheckedItems);

										// Check/uncheck single item.
									} else {
										setCheckedItems((prevCheckedItems) => {
											if (
												prevCheckedItems.includes(
													data.id
												)
											) {
												return prevCheckedItems.filter(
													(val) => val !== data.id
												);
											}
											return [
												...prevCheckedItems,
												data.id,
											];
										});
									}

									setLastChecked(data.id);
								}}
							/>
						);
					})}
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
		clientId,
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
						clientId={clientId}
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
