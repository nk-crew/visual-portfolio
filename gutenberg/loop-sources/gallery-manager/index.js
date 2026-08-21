import './style.scss';

import {
	closestCenter,
	DndContext,
	KeyboardSensor,
	PointerSensor,
	useSensor,
	useSensors,
} from '@dnd-kit/core';
import {
	arrayMove,
	rectSortingStrategy,
	SortableContext,
	sortableKeyboardCoordinates,
} from '@dnd-kit/sortable';
import {
	MediaPlaceholder,
	MediaUpload,
	MediaUploadCheck,
} from '@wordpress/block-editor';
import { Button } from '@wordpress/components';
import { store as coreStore } from '@wordpress/core-data';
import { useSelect } from '@wordpress/data';
import { useCallback, useMemo, useRef, useState } from '@wordpress/element';
import { __, _n, sprintf } from '@wordpress/i18n';
import { plus } from '@wordpress/icons';

import GalleryImage from './gallery-image';
import ImageSettingsModal from './image-settings-modal';
import { mergeSelection } from './prepare-images';

const { pro: isProPlugin } = window.VPGutenbergVariables;

// Videos are only useful with the Pro formats behind them.
const ALLOWED_MEDIA_TYPES = isProPlugin ? ['image', 'video'] : ['image'];

// The file chooser of an empty gallery takes MIME patterns rather than the
// media types beside it, and offering fewer there than the gallery accepts is
// what kept a video out of it until an image had been added first.
const ACCEPTED_MIME_TYPES = ALLOWED_MEDIA_TYPES.map((type) => `${type}/*`).join(
	','
);

/**
 * Thumbnail URL of every image, by image id.
 *
 * Images added here carry their URLs, but a gallery can also arrive from a
 * pattern or from another editor, holding nothing but attachment ids. One
 * request for the missing ones beats a request per thumbnail.
 *
 * @param {Array} images - gallery images.
 * @return {Object} image id to thumbnail URL.
 */
function usePreviewUrls(images) {
	const missingIds = useMemo(
		() =>
			images
				.filter(
					(image) =>
						image.id && !image.imgThumbnailUrl && !image.imgUrl
				)
				.map((image) => image.id),
		[images]
	);

	const attachments = useSelect(
		(select) => {
			if (!missingIds.length) {
				return null;
			}

			return select(coreStore).getEntityRecords(
				'postType',
				'attachment',
				{
					include: missingIds,
					per_page: missingIds.length,
				}
			);
		},
		[missingIds]
	);

	return useMemo(() => {
		const urls = {};

		images.forEach((image) => {
			const url = image.imgThumbnailUrl || image.imgUrl;

			if (url) {
				urls[image.id] = url;
			}
		});

		(attachments || []).forEach((attachment) => {
			const sizes = attachment.media_details?.sizes || {};
			const size =
				sizes.large || sizes.medium || sizes.thumbnail || sizes.full;

			urls[attachment.id] = size?.source_url || attachment.source_url;
		});

		return urls;
	}, [images, attachments]);
}

/**
 * Spoken feedback of the drag and drop, in the user's language.
 *
 * `@dnd-kit` ships announcements of its own, but they are untranslated and talk
 * about "sortable items" rather than images.
 *
 * @param {Array} ids - sortable ids, in gallery order.
 * @return {Object} `accessibility` prop of the `DndContext`.
 */
function useAccessibility(ids) {
	// Read on announcement rather than on render - the order it describes is
	// the one the drag ended with.
	const idsRef = useRef(ids);
	idsRef.current = ids;

	return useMemo(() => {
		const positionOf = (id) => idsRef.current.indexOf(id) + 1;

		return {
			screenReaderInstructions: {
				draggable: __(
					'To reorder an image, press Space or Enter, move it with the arrow keys, then press Space or Enter again. Press Escape to cancel.',
					'visual-portfolio'
				),
			},
			announcements: {
				onDragStart: ({ active }) =>
					sprintf(
						// translators: %d: position of the image in the gallery.
						__('Picked up image %d.', 'visual-portfolio'),
						positionOf(active.id)
					),
				onDragOver: ({ over }) =>
					over
						? sprintf(
								// translators: %d: position the image would move to.
								__(
									'Image moved to position %d.',
									'visual-portfolio'
								),
								positionOf(over.id)
							)
						: undefined,
				onDragEnd: ({ over }) =>
					over
						? sprintf(
								// translators: %d: final position of the image.
								__(
									'Image dropped at position %d.',
									'visual-portfolio'
								),
								positionOf(over.id)
							)
						: __('Image dropped.', 'visual-portfolio'),
				onDragCancel: () =>
					__('Reordering cancelled.', 'visual-portfolio'),
			},
		};
	}, []);
}

/**
 * The gallery of the images source: add, reorder and edit images.
 *
 * @param {Object}   props           - component props.
 * @param {Array}    props.images    - gallery images.
 * @param {Function} props.onChange  - called with the whole new gallery.
 * @param {string}   props.clientId  - loop client id.
 * @return {Element} component.
 */
export default function GalleryManager({ images, onChange, clientId }) {
	const [editingIndex, setEditingIndex] = useState(null);

	// The callbacks below are handed to memoised tiles, so they have to survive
	// a re-render - which they only can by reading the gallery when they run.
	const imagesRef = useRef(images);
	imagesRef.current = images;

	const previewUrls = usePreviewUrls(images);
	const ids = useMemo(() => images.map((image) => image.id), [images]);
	const accessibility = useAccessibility(ids);

	const categorySuggestions = useMemo(() => {
		const categories = new Set();

		images.forEach((image) => {
			(image.categories || []).forEach((category) => {
				categories.add(category);
			});
		});

		return Array.from(categories);
	}, [images]);

	const sensors = useSensors(
		// Without a threshold every click on a thumbnail starts a drag.
		useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
		useSensor(KeyboardSensor, {
			coordinateGetter: sortableKeyboardCoordinates,
		})
	);

	const removeImage = useCallback(
		(index) => {
			const rest = imagesRef.current.filter(
				(image, current) => current !== index
			);

			onChange(rest);
			setEditingIndex((editing) =>
				null === editing || !rest.length
					? null
					: Math.min(editing, rest.length - 1)
			);
		},
		[onChange]
	);

	const updateImage = useCallback(
		(index, values) =>
			onChange(
				imagesRef.current.map((image, current) =>
					current === index ? { ...image, ...values } : image
				)
			),
		[onChange]
	);

	const onDragEnd = ({ active, over }) => {
		if (!over || active.id === over.id) {
			return;
		}

		const from = images.findIndex((image) => image.id === active.id);
		const to = images.findIndex((image) => image.id === over.id);

		if (-1 !== from && -1 !== to) {
			onChange(arrayMove(images, from, to));
		}
	};

	const onSelect = (selection) =>
		onChange(mergeSelection(selection, imagesRef.current));

	if (!images.length) {
		return (
			<MediaUploadCheck>
				<MediaPlaceholder
					className="vpf-gallery-manager__placeholder"
					labels={{
						title: __('Gallery', 'visual-portfolio'),
						instructions: __(
							'Drag images, upload new ones or pick from your media library.',
							'visual-portfolio'
						),
					}}
					accept={ACCEPTED_MIME_TYPES}
					allowedTypes={ALLOWED_MEDIA_TYPES}
					multiple
					onSelect={onSelect}
				/>
			</MediaUploadCheck>
		);
	}

	const editing = null === editingIndex ? null : images[editingIndex] || null;

	return (
		<div className="vpf-gallery-manager">
			<DndContext
				sensors={sensors}
				collisionDetection={closestCenter}
				accessibility={accessibility}
				onDragEnd={onDragEnd}
			>
				<SortableContext items={ids} strategy={rectSortingStrategy}>
					<div className="vpf-gallery-manager__grid">
						{images.map((image, index) => (
							<GalleryImage
								key={image.id}
								image={image}
								index={index}
								previewUrl={previewUrls[image.id]}
								onEdit={setEditingIndex}
								onRemove={removeImage}
							/>
						))}

						<MediaUploadCheck>
							<MediaUpload
								multiple="add"
								allowedTypes={ALLOWED_MEDIA_TYPES}
								value={ids}
								onSelect={onSelect}
								render={({ open }) => (
									<Button
										className="vpf-gallery-manager__add"
										icon={plus}
										onClick={open}
									>
										{__('Add media', 'visual-portfolio')}
									</Button>
								)}
							/>
						</MediaUploadCheck>
					</div>
				</SortableContext>
			</DndContext>

			<span className="vpf-gallery-manager__count">
				{sprintf(
					// translators: %d: number of images in the gallery.
					_n(
						'%d image',
						'%d images',
						images.length,
						'visual-portfolio'
					),
					images.length
				)}
			</span>

			{editing ? (
				<ImageSettingsModal
					image={editing}
					index={editingIndex}
					total={images.length}
					previewUrl={previewUrls[editing.id]}
					categorySuggestions={categorySuggestions}
					allowedTypes={ALLOWED_MEDIA_TYPES}
					clientId={clientId}
					onChange={(values) => updateImage(editingIndex, values)}
					onNavigate={setEditingIndex}
					onRemove={() => removeImage(editingIndex)}
					onClose={() => setEditingIndex(null)}
				/>
			) : null}
		</div>
	);
}
