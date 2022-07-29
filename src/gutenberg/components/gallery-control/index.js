/* eslint-disable react/no-unused-state */
/**
 * External dependencies
 */
import classnames from 'classnames/dedupe';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, rectSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

/**
 * Internal dependencies
 */
// eslint-disable-next-line import/no-cycle
import ControlsRender from '../controls-render';

/**
 * WordPress dependencies
 */
const { __ } = wp.i18n;

const { applyFilters, addFilter } = wp.hooks;

const { Fragment, useState } = wp.element;

const { Button, Modal, FocalPointPicker } = wp.components;

const { MediaUpload, MediaUploadCheck } = wp.blockEditor;

const ALLOWED_MEDIA_TYPES = ['image'];

function prepareImage(img) {
  const imgData = {
    id: img.id,
    imgUrl: img.url,
    imgThumbnailUrl: img.url,
  };

  // Prepare thumbnail for all images except GIF, since GIFs animated only in full size.
  if (!img.mime || 'image/gif' !== img.mime) {
    if (img.sizes && img.sizes.large && img.sizes.large.url) {
      imgData.imgThumbnailUrl = img.sizes.large.url;
    } else if (img.sizes && img.sizes.medium && img.sizes.medium.url) {
      imgData.imgThumbnailUrl = img.sizes.medium.url;
    } else if (img.sizes && img.sizes.thumbnail && img.sizes.thumbnail.url) {
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

function prepareImages(images) {
  const result = [];

  if (images && images.length) {
    images.forEach((img) => {
      const imgData = prepareImage(img);

      result.push(imgData);
    });
  }

  return result;
}

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

  const { attributes, listeners, setNodeRef, transform, transition, isDragging, isSorting } =
    useSortable({
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
    <Fragment>
      <div
        className={classnames(
          'vpf-component-gallery-control-item',
          isDragging ? 'vpf-component-gallery-control-item-dragging' : ''
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

            if (newImages[index - 1]) {
              newImages.splice(index - 1, 1);

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
          title={__('Image Settings', '@@text_domain')}
          onRequestClose={(e) => {
            if (
              e.relatedTarget &&
              e.relatedTarget.classList &&
              e.relatedTarget.classList.contains('media-modal')
            ) {
              // Don't close modal if opened media modal.
            } else {
              closeModal(e);
            }
          }}
        >
          <div className="vpf-component-gallery-control-item-modal">
            {focalPoint && img.id ? (
              <MediaUploadCheck>
                <div className="editor-post-featured-image">
                  <FocalPointPicker
                    url={img.imgThumbnailUrl || img.imgUrl}
                    value={img.focalPoint}
                    onChange={(val) => {
                      const newImages = [...items];

                      if (newImages[index - 1]) {
                        newImages[index - 1] = {
                          ...newImages[index - 1],
                          focalPoint: val,
                        };

                        onChange(newImages);
                      }
                    }}
                  />
                  <MediaUpload
                    onSelect={(image) => {
                      const newImages = [...items];

                      if (newImages[index - 1]) {
                        const imgData = prepareImage(image);

                        newImages[index - 1] = {
                          ...newImages[index - 1],
                          ...imgData,
                        };

                        onChange(newImages);
                      }
                    }}
                    allowedTypes={ALLOWED_MEDIA_TYPES}
                    render={({ open }) => (
                      <Button onClick={open} isSecondary>
                        {__('Replace Image', '@@text_domain')}
                      </Button>
                    )}
                  />
                  <Button
                    onClick={() => {
                      const newImages = [...items];

                      if (newImages[index - 1]) {
                        newImages.splice(index - 1, 1);

                        onChange(newImages);
                      }

                      closeModal();
                    }}
                    isLink
                    isDestructive
                  >
                    {__('Remove Image', '@@text_domain')}
                  </Button>
                </div>
              </MediaUploadCheck>
            ) : (
              ''
            )}
            <div>
              {Object.keys(imageControls).map((name) => {
                const newCondition = [];

                // prepare name.
                const imgControlName = `${controlName}[${index - 1}].${name}`;

                // prepare conditions for the current item.
                if (imageControls[name].condition.length) {
                  imageControls[name].condition.forEach((data) => {
                    const newData = { ...data };

                    if (newData.control && /SELF/g.test(newData.control)) {
                      newData.control = newData.control.replace(
                        /SELF/g,
                        `${controlName}[${index - 1}]`
                      );
                    }

                    newCondition.push(newData);
                  });
                }

                return applyFilters(
                  'vpf.editor.gallery-controls-render',
                  <ControlsRender.Control
                    key={`${img.id || img.imgThumbnailUrl || img.imgUrl}-${index - 1}-${name}`}
                    attributes={props.attributes}
                    onChange={(val) => {
                      const newImages = [...items];

                      if (newImages[index - 1]) {
                        newImages[index - 1] = {
                          ...newImages[index - 1],
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
                  props
                );
              })}
            </div>
          </div>
        </Modal>
      ) : null}
    </Fragment>
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

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Automatically open images selector when first time select Images in Setup Wizard.
  const [isOpenedInSetupWizard, setOpenOnSetupWizard] = useState(!isSetupWizard);
  const openOnSetupWizard = () => setOpenOnSetupWizard(true);

  const sortableItems = [];

  if (items && items.length) {
    items.forEach((data, i) => {
      sortableItems.push({
        id: i + 1,
        data,
      });
    });
  }

  return (
    <div className="vpf-component-gallery-control-items">
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
        <SortableContext items={sortableItems} strategy={rectSortingStrategy}>
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

      <MediaUpload
        multiple
        onSelect={(images) => {
          onChange([...items, ...prepareImages(images)]);
        }}
        allowedTypes={ALLOWED_MEDIA_TYPES}
        value={false}
        render={({ open }) => {
          if (!isOpenedInSetupWizard) {
            openOnSetupWizard();
            open();
          }

          return (
            <Button
              className="vpf-component-gallery-control-item-add"
              onClick={(event) => {
                event.stopPropagation();
                open();
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                width="24"
                height="24"
                role="img"
                aria-hidden="true"
                focusable="false"
              >
                <path d="M18 11.2h-5.2V6h-1.6v5.2H6v1.6h5.2V18h1.6v-5.2H18z" />
              </svg>
              <span>{__('Add Images', '@@text_domain')}</span>
            </Button>
          );
        }}
      />
    </div>
  );
};

/**
 * Component Class
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
        multiple
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
              const newImages = arrayMove(filteredValue, oldIndex, newIndex);
              onChange(newImages);
            }}
          />
        )}
      />
    </div>
  );
}

// add list of all categories to gallery images.
addFilter(
  'vpf.editor.controls-render-data',
  'vpf/editor/controls-render-data/images-categories-suggestions',
  (data) => {
    if ('images' === data.name) {
      const categories = [];

      // find all used categories.
      if (data.attributes.images && data.attributes.images.length) {
        data.attributes.images.forEach((image) => {
          if (image.categories && image.categories.length) {
            image.categories.forEach((cat) => {
              if (-1 === categories.indexOf(cat)) {
                categories.push(cat);
              }
            });
          }
        });
      }

      if (
        categories.length &&
        data.image_controls &&
        data.image_controls.categories &&
        data.image_controls.categories.options
      ) {
        data.image_controls.categories.options = categories.map((val) => ({
          label: val,
          value: val,
        }));
      }
    }

    return data;
  }
);
