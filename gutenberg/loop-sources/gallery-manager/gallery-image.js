import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '@wordpress/components';
import { memo } from '@wordpress/element';
import { __, sprintf } from '@wordpress/i18n';
import { dragHandle, trash } from '@wordpress/icons';
import classnames from 'classnames/dedupe';

/**
 * A single thumbnail of the gallery grid.
 *
 * Memoised: editing one image re-renders one tile, not the whole gallery, which
 * is what keeps typing in the drawer smooth on a gallery of a few hundred.
 *
 * @param {Object}   props            - component props.
 * @param {Object}   props.image      - gallery image.
 * @param {number}   props.index      - position in the gallery.
 * @param {string}   props.previewUrl - URL of the thumbnail to show.
 * @param {Function} props.onEdit     - called with the index to open the drawer.
 * @param {Function} props.onRemove   - called with the index to drop the image.
 * @return {Element} component.
 */
function GalleryImage({ image, index, previewUrl, onEdit, onRemove }) {
	const {
		attributes,
		listeners,
		setNodeRef,
		setActivatorNodeRef,
		transform,
		transition,
		isDragging,
		isSorting,
	} = useSortable({ id: image.id });

	const label =
		image.title ||
		sprintf(
			// translators: %d: position of the image in the gallery.
			__('Image %d', 'visual-portfolio'),
			index + 1
		);

	return (
		<div
			ref={setNodeRef}
			className={classnames('vpf-gallery-manager__item', {
				'is-dragging': isDragging,
			})}
			style={{
				transform: CSS.Translate.toString(transform),
				// Only animate the images that move out of the way, never the
				// one under the pointer.
				transition: isSorting ? transition : undefined,
			}}
		>
			<Button
				className="vpf-gallery-manager__preview"
				label={sprintf(
					// translators: %s: image title.
					__('Edit %s', 'visual-portfolio'),
					label
				)}
				showTooltip
				onClick={() => onEdit(index)}
			>
				{previewUrl ? (
					<img src={previewUrl} alt="" loading="lazy" />
				) : (
					<span className="vpf-gallery-manager__preview-empty" />
				)}
			</Button>

			<div className="vpf-gallery-manager__item-actions">
				<Button
					ref={setActivatorNodeRef}
					className="vpf-gallery-manager__drag"
					icon={dragHandle}
					size="small"
					label={sprintf(
						// translators: %s: image title.
						__('Reorder %s', 'visual-portfolio'),
						label
					)}
					showTooltip
					{...attributes}
					{...listeners}
				/>
				<Button
					className="vpf-gallery-manager__remove"
					icon={trash}
					size="small"
					label={sprintf(
						// translators: %s: image title.
						__('Remove %s', 'visual-portfolio'),
						label
					)}
					showTooltip
					onClick={() => onRemove(index)}
				/>
			</div>
		</div>
	);
}

export default memo(GalleryImage);
