import {
	Button,
	FocalPointPicker,
	FormTokenField,
	Modal,
	SelectControl,
	TextareaControl,
	TextControl,
} from '@wordpress/components';
import { __, sprintf } from '@wordpress/i18n';

import LoopImageSettingsSlot from '../../components/loop-image-settings-slot';

const FORMAT_OPTIONS = [
	{ value: 'standard', label: __('Standard', 'visual-portfolio') },
	{ value: 'video', label: __('Video', 'visual-portfolio') },
];

const DEFAULT_FOCAL_POINT = { x: 0.5, y: 0.5 };

/**
 * Everything that can be set on a single image.
 *
 * @param {Object}   props                     - component props.
 * @param {Object}   props.image               - image being edited.
 * @param {number}   props.index               - its position in the gallery.
 * @param {number}   props.total               - number of images in the gallery.
 * @param {string}   props.previewUrl          - URL of the image preview.
 * @param {Array}    props.categorySuggestions - categories used elsewhere in the gallery.
 * @param {string}   props.clientId            - loop client id.
 * @param {Function} props.onChange            - merges the given values into the image.
 * @param {Function} props.onNavigate          - called with the index to edit instead.
 * @param {Function} props.onClose             - closes the drawer.
 * @return {Element} component.
 */
export default function ImageSettingsModal({
	image,
	index,
	total,
	previewUrl,
	categorySuggestions,
	clientId,
	onChange,
	onNavigate,
	onClose,
}) {
	const isVideo = 'video' === image.format;

	return (
		<Modal
			title={__('Image Settings', 'visual-portfolio')}
			className="vpf-gallery-manager-modal"
			size="medium"
			onRequestClose={onClose}
		>
			<div className="vpf-gallery-manager-modal__nav">
				<Button
					variant="tertiary"
					size="compact"
					disabled={0 === index}
					onClick={() => onNavigate(index - 1)}
				>
					{__('Previous', 'visual-portfolio')}
				</Button>
				<span>
					{sprintf(
						// translators: %1$d: current image, %2$d: number of images.
						__('Image %1$d of %2$d', 'visual-portfolio'),
						index + 1,
						total
					)}
				</span>
				<Button
					variant="tertiary"
					size="compact"
					disabled={index >= total - 1}
					onClick={() => onNavigate(index + 1)}
				>
					{__('Next', 'visual-portfolio')}
				</Button>
			</div>

			{previewUrl ? (
				<FocalPointPicker
					label={__('Focal point', 'visual-portfolio')}
					help={__(
						'The part of the image that stays visible when it is cropped.',
						'visual-portfolio'
					)}
					url={previewUrl}
					value={image.focalPoint || DEFAULT_FOCAL_POINT}
					onChange={(focalPoint) => onChange({ focalPoint })}
					__nextHasNoMarginBottom
				/>
			) : null}

			<TextControl
				label={__('Title', 'visual-portfolio')}
				value={image.title || ''}
				onChange={(title) => onChange({ title })}
				__next40pxDefaultSize
				__nextHasNoMarginBottom
			/>

			<TextareaControl
				label={__('Description', 'visual-portfolio')}
				value={image.description || ''}
				rows={3}
				onChange={(description) => onChange({ description })}
				__nextHasNoMarginBottom
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
				__next40pxDefaultSize
				__nextHasNoMarginBottom
				__experimentalExpandOnFocus
			/>

			<SelectControl
				label={__('Format', 'visual-portfolio')}
				value={image.format || 'standard'}
				options={FORMAT_OPTIONS}
				onChange={(format) => onChange({ format })}
				__next40pxDefaultSize
				__nextHasNoMarginBottom
			/>

			{isVideo ? (
				<TextControl
					type="url"
					label={__('Video URL', 'visual-portfolio')}
					placeholder="https://"
					value={image.video_url || ''}
					onChange={(value) => onChange({ video_url: value })}
					__next40pxDefaultSize
					__nextHasNoMarginBottom
				/>
			) : null}

			<TextControl
				type="url"
				label={__('Link URL', 'visual-portfolio')}
				help={__(
					'Where the item links to. Left empty, it opens the image in the popup.',
					'visual-portfolio'
				)}
				placeholder="https://"
				value={image.url || ''}
				onChange={(url) => onChange({ url })}
				__next40pxDefaultSize
				__nextHasNoMarginBottom
			/>

			<TextControl
				label={__('Author', 'visual-portfolio')}
				value={image.author || ''}
				onChange={(author) => onChange({ author })}
				__next40pxDefaultSize
				__nextHasNoMarginBottom
			/>

			<TextControl
				type="url"
				label={__('Author URL', 'visual-portfolio')}
				placeholder="https://"
				value={image.author_url || ''}
				onChange={(value) => onChange({ author_url: value })}
				__next40pxDefaultSize
				__nextHasNoMarginBottom
			/>

			<LoopImageSettingsSlot
				image={image}
				index={index}
				updateImage={onChange}
				clientId={clientId}
			/>
		</Modal>
	);
}
