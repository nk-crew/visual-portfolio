import {
	Button,
	FormTokenField,
	Modal,
	SelectControl,
	TextareaControl,
	TextControl,
} from '@wordpress/components';
import { store as coreStore } from '@wordpress/core-data';
import { useSelect } from '@wordpress/data';
import { useState } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { chevronLeft, chevronRight } from '@wordpress/icons';

import FocalPointControl from '../../components/focal-point-control';
import CollapsibleSection from '../../components/gallery-control/collapsible-section';
import LoopImageSettingsSlot, {
	LoopImageSettingsHoverSlot,
	useHasHoverStateFills,
} from '../../components/loop-image-settings-slot';
import MediaPreviewCard from '../../components/media-preview-card';
import { ToggleGroupButtonsControl } from '../../components/toggle-group-control';
import { prepareImage } from './prepare-images';

const { admin_url: adminUrl } = window.VPGutenbergVariables;

const FORMAT_OPTIONS = [
	{ value: 'standard', label: __('Standard', 'visual-portfolio') },
	{ value: 'video', label: __('Video', 'visual-portfolio') },
];

const STATE_OPTIONS = [
	{ value: 'default', label: __('Default', 'visual-portfolio') },
	{ value: 'hover', label: __('Hover', 'visual-portfolio') },
];

/**
 * File size in the largest unit that keeps it readable.
 *
 * @param {number} bytes - file size in bytes.
 * @return {string} file size.
 */
function humanFileSize(bytes) {
	const units = ['B', 'KB', 'MB', 'GB', 'TB'];
	const unit = Math.floor(Math.log(bytes) / Math.log(1024));

	return `${Number((bytes / 1024 ** unit).toFixed(2))} ${units[unit]}`;
}

/**
 * What the media library knows about the image, folded away.
 *
 * @param {Object} props         - component props.
 * @param {number} props.imageId - attachment id of the image.
 * @return {Element} component.
 */
function AdditionalMediaInfo({ imageId }) {
	const attachment = useSelect(
		(select) =>
			select(coreStore).getEntityRecord(
				'postType',
				'attachment',
				imageId
			),
		[imageId]
	);

	if (!attachment) {
		return null;
	}

	const sourceUrl = attachment.source_url || '';
	const details = attachment.media_details || {};

	return (
		<CollapsibleSection
			label={__('Additional media info', 'visual-portfolio')}
			className="vpf-gallery-manager-modal__media-info"
		>
			<p>
				<strong>{sourceUrl.split('/').pop() || '-'}</strong>
			</p>
			{attachment.mime_type ? <div>{attachment.mime_type}</div> : null}
			{details.filesize ? (
				<div>{humanFileSize(details.filesize)}</div>
			) : null}
			{details.width ? (
				<div>
					{sprintf(
						// translators: %1$d: image width, %2$d: image height.
						__('%1$d by %2$d pixels', 'visual-portfolio'),
						details.width,
						details.height
					)}
				</div>
			) : null}
			<ul>
				{sourceUrl ? (
					<li>
						<a href={sourceUrl} target="_blank" rel="noreferrer">
							{__('File URL', 'visual-portfolio')}
						</a>
					</li>
				) : null}
				{attachment.link ? (
					<li>
						<a
							href={attachment.link}
							target="_blank"
							rel="noreferrer"
						>
							{__('Attachment page', 'visual-portfolio')}
						</a>
					</li>
				) : null}
				<li>
					<a
						href={`${adminUrl}post.php?post=${attachment.id}&action=edit`}
						target="_blank"
						rel="noreferrer"
					>
						{__('Edit details', 'visual-portfolio')}
					</a>
				</li>
			</ul>
		</CollapsibleSection>
	);
}

/**
 * Everything that can be set on a single image.
 *
 * @param {Object}   props                     - component props.
 * @param {Object}   props.image               - image being edited.
 * @param {number}   props.index               - its position in the gallery.
 * @param {number}   props.total               - number of images in the gallery.
 * @param {string}   props.previewUrl          - URL of the image preview.
 * @param {Array}    props.categorySuggestions - categories used elsewhere in the gallery.
 * @param {Array}    props.allowedTypes        - media types the gallery accepts.
 * @param {string}   props.clientId            - loop client id.
 * @param {Function} props.onChange            - merges the given values into the image.
 * @param {Function} props.onNavigate          - called with the index to edit instead.
 * @param {Function} props.onRemove            - drops the image from the gallery.
 * @param {Function} props.onClose             - closes the drawer.
 * @return {Element} component.
 */
export default function ImageSettingsModal({
	image,
	index,
	total,
	previewUrl,
	categorySuggestions,
	allowedTypes,
	clientId,
	onChange,
	onNavigate,
	onRemove,
	onClose,
}) {
	const [state, setState] = useState('default');
	const hasHoverState = useHasHoverStateFills();
	const isVideo = 'video' === image.format;

	const fillProps = {
		image,
		index,
		updateImage: onChange,
		clientId,
		state,
	};

	return (
		<Modal
			title={
				<span className="vpf-gallery-manager-modal__title">
					<span>{__('Image Settings', 'visual-portfolio')}</span>
					<span className="vpf-gallery-manager-modal__nav">
						<Button
							icon={chevronLeft}
							size="small"
							label={__('Previous image', 'visual-portfolio')}
							disabled={0 === index}
							onClick={() => onNavigate(index - 1)}
						/>
						<span>
							{sprintf(
								// translators: %1$d: current image, %2$d: number of images.
								__('Image %1$d of %2$d', 'visual-portfolio'),
								index + 1,
								total
							)}
						</span>
						<Button
							icon={chevronRight}
							size="small"
							label={__('Next image', 'visual-portfolio')}
							disabled={index >= total - 1}
							onClick={() => onNavigate(index + 1)}
						/>
					</span>
				</span>
			}
			className="vpf-gallery-manager-modal"
			onRequestClose={(event) => {
				// A media frame opened from inside the modal - a fill picking a
				// hover image, say - takes the focus with it, and closing here
				// would take the frame down with the modal.
				if (event?.relatedTarget?.classList?.contains('media-modal')) {
					return;
				}

				onClose();
			}}
		>
			<div className="vpf-gallery-manager-modal__body">
				<div className="vpf-gallery-manager-modal__media">
					{hasHoverState ? (
						<ToggleGroupButtonsControl
							className="vpf-gallery-manager-modal__states"
							label={__('Media', 'visual-portfolio')}
							value={state}
							options={STATE_OPTIONS}
							onChange={(value) => {
								if (value) {
									setState(value);
								}
							}}
						/>
					) : null}

					{'hover' === state ? (
						<LoopImageSettingsHoverSlot {...fillProps} />
					) : (
						<>
							{previewUrl ? (
								<MediaPreviewCard
									onSelect={(media) =>
										onChange(prepareImage(media))
									}
									allowedTypes={allowedTypes}
									onRemove={onRemove}
								>
									<img src={previewUrl} alt="" />
								</MediaPreviewCard>
							) : null}

							{/* Remounted per image, so it opens only for an off-centre point. */}
							<FocalPointControl
								key={image.id}
								value={image.focalPoint}
								onChange={(focalPoint) =>
									onChange({ focalPoint })
								}
							/>

							{image.id ? (
								<AdditionalMediaInfo imageId={image.id} />
							) : null}
						</>
					)}
				</div>

				<div className="vpf-gallery-manager-modal__fields">
					<TextControl
						className="vpf-gallery-manager-modal__field-full"
						label={__('Title', 'visual-portfolio')}
						value={image.title || ''}
						onChange={(title) => onChange({ title })}
					/>

					<TextareaControl
						className="vpf-gallery-manager-modal__field-full"
						label={__('Description', 'visual-portfolio')}
						value={image.description || ''}
						rows={3}
						onChange={(description) => onChange({ description })}
					/>

					<FormTokenField
						label={__('Categories', 'visual-portfolio')}
						help={__(
							'What the gallery filter offers. Type anything and press Enter.',
							'visual-portfolio'
						)}
						value={image.categories || []}
						suggestions={categorySuggestions}
						onChange={(categories) =>
							onChange({ categories: categories.map(String) })
						}
						__experimentalExpandOnFocus
					/>

					<SelectControl
						label={__('Format', 'visual-portfolio')}
						value={image.format || 'standard'}
						options={FORMAT_OPTIONS}
						onChange={(format) => onChange({ format })}
					/>

					{isVideo ? (
						<TextControl
							type="url"
							label={__('Video URL', 'visual-portfolio')}
							placeholder="https://"
							value={image.video_url || ''}
							onChange={(value) => onChange({ video_url: value })}
						/>
					) : null}

					<TextControl
						className="vpf-gallery-manager-modal__field-full"
						type="url"
						label={__('Link URL', 'visual-portfolio')}
						help={__(
							'Where the item links to. Left empty, it opens the image in the popup.',
							'visual-portfolio'
						)}
						placeholder="https://"
						value={image.url || ''}
						onChange={(url) => onChange({ url })}
					/>

					<TextControl
						label={__('Author', 'visual-portfolio')}
						value={image.author || ''}
						onChange={(author) => onChange({ author })}
					/>

					<TextControl
						type="url"
						label={__('Author URL', 'visual-portfolio')}
						placeholder="https://"
						value={image.author_url || ''}
						onChange={(value) => onChange({ author_url: value })}
					/>

					<LoopImageSettingsSlot {...fillProps} />
				</div>
			</div>
		</Modal>
	);
}
