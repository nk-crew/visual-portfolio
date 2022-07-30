/**
 * Change Title and Description controls when used dynamic source option.
 */
const { __ } = wp.i18n;

const { addFilter } = wp.hooks;

const { useSelect } = wp.data;

const { TextControl, TextareaControl } = wp.components;

function RenderTitleAndDescriptionImageControls(props) {
  const { data, textSource, img, name, index } = props;

  const { imgData } = useSelect(
    (select) => {
      const { getMedia } = select('core');

      return {
        imgData: img.id ? getMedia(img.id) : null,
      };
    },
    [img]
  );

  let text = '';
  let description = '';

  switch (textSource) {
    case 'title':
      text = imgData?.title?.raw || '';
      description = __('Loaded automatically from the image Title', '@@text_domain');
      break;
    case 'caption':
      text = imgData?.caption?.raw || '';
      description = __('Loaded automatically from the image Caption', '@@text_domain');
      break;
    case 'alt':
      text = imgData?.alt_text || '';
      description = __('Loaded automatically from the image Alt', '@@text_domain');
      break;
    case 'description':
      text = imgData?.description?.raw || '';
      description = __('Loaded automatically from the image Description', '@@text_domain');
      break;
    // no default
  }

  const ThisControl = 'title' === name ? TextControl : TextareaControl;

  return (
    <ThisControl
      className={`vpf-control-wrap vpf-control-wrap-${'title' === name ? 'text' : 'textarea'}`}
      key={`${img.id || img.imgThumbnailUrl || img.imgUrl}-${index}-${name}`}
      label={data.label}
      value={text}
      help={description}
      disabled
    />
  );
}

// Change gallery image Title and Description control .
addFilter(
  'vpf.editor.gallery-controls-render',
  'vpf/editor/gallery-controls-render/title-and-description-render-by-source',
  (control, data, props, controlData) => {
    const { attributes, img } = props;
    const { name, index } = controlData;

    if (
      ('title' === name &&
        attributes.images_titles_source &&
        'custom' !== attributes.images_titles_source) ||
      ('description' === name &&
        attributes.images_descriptions_source &&
        'custom' !== attributes.images_descriptions_source)
    ) {
      control = (
        <RenderTitleAndDescriptionImageControls
          {...{
            data,
            textSource: attributes[`images_${name}s_source`],
            img,
            name,
            index,
          }}
        />
      );
    }

    return control;
  }
);
