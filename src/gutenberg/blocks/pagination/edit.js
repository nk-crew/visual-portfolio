/**
 * External dependencies
 */
import classnames from 'classnames/dedupe';

/**
 * Internal dependencies
 */
import ControlsRender from '../../components/controls-render';
import IframePreview from '../../components/iframe-preview';
import useVpfGalleryPaginationAttributes from '../../hooks/use-gallery-pagination-attributes';
import SelectControl from '../../components/select-control';
import getParseBlocks from '../../utils/get-parse-blocks';

/**
 * WordPress dependencies
 */
const { useEffect } = wp.element;

const { __ } = wp.i18n;

const { useBlockProps, InspectorControls } = wp.blockEditor;

function renderControls(props) {
  const { attributes, setAttributes } = props;
  const blocks = getParseBlocks('visual-portfolio/block');
  const blockOptions = [];
  let blockLabel = attributes.gallery_block_id;

  const blockCounts = {
    posts: 0,
    social: 0,
    images: 0,
  };
  let blockName = '';

  blocks.forEach((item) => {
    let blockCount;
    switch (item.attributes.content_source) {
      case 'post-based':
        blockName = 'Posts';
        blockCounts.posts += 1;
        blockCount = blockCounts.posts;
        break;
      case 'social-stream':
        blockName = 'Social';
        blockCounts.social += 1;
        blockCount = blockCounts.social;
        break;
      default:
        blockName = 'Image';
        blockCounts.images += 1;
        blockCount = blockCounts.images;
        break;
    }

    const label =
      '' !== item.attributes.gallery_name
        ? item.attributes.gallery_name
        : `${blockName} Gallery #${blockCount}`;
    blockOptions.push({
      value: item.attributes.block_id,
      label,
    });
    if (attributes.gallery_block_id === item.attributes.block_id) {
      blockLabel = label;
    }
  });
  return (
    <div>
      <SelectControl
        controlName={__('Select Gallery', '@@text_domain')}
        attributes={attributes}
        value={blockLabel}
        options={blockOptions || {}}
        onChange={(val) =>
          setAttributes({
            gallery_block_id: val,
          })
        }
        isMultiple={false}
      />
      <ControlsRender category="pagination" showPanel={false} {...props} />
    </div>
  );
}

/**
 * Block Edit Class.
 */
export default function BlockEdit(props) {
  // const { attributes, setAttributes, galleryAttributes } = props;
  const { attributes, setAttributes } = props;

  const {
    ghostkitClassname,
    gallery_block_id: galleryBlockId,
    layout_type: layoutType,
    gallery_attributes: galleryAttributes,
  } = attributes;

  const galleryPaginationAttributes = useVpfGalleryPaginationAttributes(galleryBlockId);

  let className = '';

  if ('undefined' === typeof layoutType || '' === layoutType) {
    setAttributes({
      layout_type: 'pagination',
    });
  }
  useEffect(() => {
    if (JSON.stringify(galleryPaginationAttributes) !== galleryAttributes) {
      setAttributes({
        gallery_attributes: JSON.stringify(galleryPaginationAttributes),
      });
    }
  }, [galleryPaginationAttributes, galleryAttributes]);

  // add custom classname.
  if (ghostkitClassname) {
    className = classnames(className, ghostkitClassname);
  }

  const blockProps = useBlockProps({
    className,
  });

  return (
    <div {...blockProps}>
      <InspectorControls>{renderControls(props)}</InspectorControls>
      <IframePreview {...props} />
    </div>
  );
}
