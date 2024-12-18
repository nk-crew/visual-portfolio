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
import { useEffect, useRef, useState } from '@wordpress/element';
import { applyFilters } from '@wordpress/hooks';
import { __, _n, sprintf } from '@wordpress/i18n';

import ControlsRender from '../controls-render';
import getAllCategories from './utils/get-all-categories';

const { navigator, VPGutenbergVariables } = window;

const ALLOWED_MEDIA_TYPES = ['image'];
const UNCATEGORIZED_VALUE = '------';
const ITEMS_COUNT_DEFAULT = 18;

function MediaUploadButton({ open, items, isSetupWizard }) {
	const hasOpenedModal = useRef(false);

	// Automatically open the media modal on the first render
	useEffect(() => {
		if (
			!hasOpenedModal.current &&
			isSetupWizard &&
			(!items || !items.length)
		) {
			open();
			hasOpenedModal.current = true; // Ensure it only opens once
		}
	}, [isSetupWizard, items, open]);

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
					<path d="m19 7-3-3-8.5 8.5-1 4 4-1L19 7Zm-7 11.5H5V20h7v-1.5Z" />
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
}

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
						__nextHasNoMarginBottom
					/>
				) : null}
				<MediaUpload
					onSelect={(image) => {
						const imgData = prepareImage(image);
						onChangeImage(imgData);
					}}
					allowedTypes={ALLOWED_MEDIA_TYPES}
					render={({ open }) => (
						<Button onClick={open} variant="secondary">
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
									__next40pxDefaultSize
									__nextHasNoMarginBottom
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
									variant="secondary"
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
							__nextHasNoMarginBottom
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
					isMuffled && 'vpf-component-gallery-control-item-muffled',
					isChecked && 'vpf-component-gallery-control-item-checked'
				)}
				ref={setNodeRef}
				style={style}
				{...sortableAttributes}
				{...listeners}
			>
				<div className="vpf-component-gallery-control-item-toolbar">
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
							__nextHasNoMarginBottom
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
								d="M8.11459 1.9405C8.15924 1.67781 8.29774 1.43913 8.50542 1.26692C8.71311 1.0947 8.97653 1.00012 9.24883 1H10.7512C11.0237 0.999856 11.2874 1.09432 11.4953 1.26655C11.7032 1.43879 11.8419 1.67762 11.8866 1.9405L12.1672 3.58975C13.0726 3.88225 13.8962 4.35363 14.5922 4.96L16.1946 4.37275C16.4495 4.27963 16.73 4.27793 16.9861 4.36794C17.2422 4.45796 17.4574 4.63385 17.5934 4.86438L18.3446 6.13562C18.4811 6.3663 18.5294 6.63688 18.481 6.89916C18.4325 7.16144 18.2904 7.39837 18.08 7.56775L16.7594 8.62975C16.9501 9.53336 16.9501 10.4655 16.7594 11.3691L18.0812 12.4334C18.2913 12.6027 18.4332 12.8394 18.4816 13.1014C18.5301 13.3635 18.4819 13.6338 18.3457 13.8644L17.5946 15.1356C17.4585 15.3661 17.2434 15.542 16.9872 15.6321C16.7311 15.7221 16.4507 15.7204 16.1957 15.6273L14.5922 15.04C13.8962 15.6475 13.0737 16.1177 12.1672 16.4102L11.8866 18.0595C11.8419 18.3224 11.7032 18.5612 11.4953 18.7334C11.2874 18.9057 11.0237 19.0001 10.7512 19H9.24883C8.97653 18.9999 8.71311 18.9053 8.50542 18.7331C8.29774 18.5609 8.15924 18.3222 8.11459 18.0595L7.83391 16.4102C6.93828 16.1205 6.11295 15.6541 5.40898 15.04L3.80541 15.6273C3.55045 15.7208 3.26983 15.7228 3.01348 15.633C2.75714 15.5432 2.54168 15.3673 2.40544 15.1367L1.65427 13.8644C1.51807 13.6338 1.46991 13.3635 1.51836 13.1014C1.5668 12.8394 1.70871 12.6027 1.91885 12.4334L3.24059 11.3691C3.04998 10.4655 3.04998 9.53336 3.24059 8.62975L1.92 7.56775C1.70986 7.39843 1.56795 7.1617 1.51951 6.89968C1.47106 6.63765 1.51922 6.36732 1.65542 6.13675L2.40659 4.86438C2.54265 4.6336 2.75803 4.45752 3.01439 4.3675C3.27076 4.27747 3.55147 4.27933 3.80656 4.37275L5.40898 4.96C6.11293 4.34583 6.93826 3.87946 7.83391 3.58975L8.11459 1.9405ZM13.4522 10C13.4522 10.4432 13.3629 10.8821 13.1895 11.2916C13.0161 11.701 12.7619 12.0731 12.4414 12.3865C12.1209 12.6999 11.7405 12.9485 11.3218 13.1181C10.9031 13.2877 10.4543 13.375 10.0011 13.375C9.54795 13.375 9.0992 13.2877 8.6805 13.1181C8.2618 12.9485 7.88136 12.6999 7.56091 12.3865C7.24045 12.0731 6.98625 11.701 6.81282 11.2916C6.63939 10.8821 6.55012 10.4432 6.55012 10C6.55012 9.10489 6.91371 8.24645 7.56091 7.61351C8.2081 6.98058 9.08588 6.625 10.0011 6.625C10.9164 6.625 11.7942 6.98058 12.4414 7.61351C13.0886 8.24645 13.4522 9.10489 13.4522 10Z"
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
								fillRule="evenodd"
								clipRule="evenodd"
								d="M10 2.68771C9.46811 2.68755 8.94926 2.84978 8.51493 3.15204C8.08059 3.4543 7.75215 3.88173 7.57486 4.37542H12.4251C12.2477 3.88182 11.9192 3.45449 11.4849 3.15225C11.0506 2.85001 10.5319 2.68772 10 2.68771ZM10 1C9.01207 1.00001 8.05446 1.33596 7.28915 1.95102C6.52384 2.56608 5.9978 3.4225 5.8 4.37542H2V6.06313H3.45143L4.38629 16.186C4.4573 16.955 4.81782 17.6701 5.39702 18.1908C5.97622 18.7114 6.73224 19.0001 7.51657 19H12.4846C13.2685 18.9998 14.0241 18.7112 14.603 18.1908C15.182 17.6704 15.5424 16.9558 15.6137 16.1871L16.5486 6.06313H18V4.37542H14.2C14.0022 3.4225 13.4762 2.56608 12.7108 1.95102C11.9455 1.33596 10.9879 1.00001 10 1ZM14.8274 6.06313H5.17257L6.09371 16.033C6.12595 16.3826 6.2898 16.7077 6.55307 16.9444C6.81635 17.1811 7.16002 17.3123 7.51657 17.3123H12.4846C12.8411 17.3123 13.1848 17.1811 13.4481 16.9444C13.7113 16.7077 13.8752 16.3826 13.9074 16.033L14.8274 6.06313Z"
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
			render={({ open }) => (
				<MediaUploadButton
					open={open}
					items={items}
					isSetupWizard={isSetupWizard}
				/>
			)}
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
							indeterminate={
								checkedItems.length > 0 &&
								items.length !== checkedItems.length
							}
							onChange={() => {
								if (items.length === checkedItems.length) {
									setCheckedItems([]);
								} else {
									setCheckedItems(items.map((img) => img.id));
								}
								setLastChecked(false);
							}}
							__nextHasNoMarginBottom
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
							__next40pxDefaultSize
							__nextHasNoMarginBottom
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
								__next40pxDefaultSize
								__nextHasNoMarginBottom
							/>
							<svg
								width="20"
								height="20"
								viewBox="0 0 20 20"
								xmlns="http://www.w3.org/2000/svg"
							>
								<path
									d="M8 16H12V14.5652H8V16ZM4 5V6.43478H16V5H4ZM6 11.2174H14V9.78261H6V11.2174Z"
									fill="currentColor"
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
								variant="secondary"
								onClick={() => {
									setShowingItems(showingItems + 18);
								}}
							>
								{__('Show More', 'visual-portfolio')}
							</Button>
							<Button
								isLink
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
