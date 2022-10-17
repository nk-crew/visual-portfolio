/**
 * External dependencies
 */
import classnames from 'classnames/dedupe';

/**
 * Internal dependencies
 */
import ControlsRender from '../components/controls-render';
import IframePreview from '../components/iframe-preview';
import getParseBlocks from '../utils/get-parse-blocks';

/**
 * WordPress dependencies
 */
const { useEffect, Fragment } = wp.element;

const { __ } = wp.i18n;

const { useBlockProps, InspectorControls } = wp.blockEditor;

const {
  plugin_name: pluginName,
  plugin_url: pluginUrl,
  controls_categories: registeredControlsCategories,
} = window.VPGutenbergVariables;

function renderControls(props, isSetupWizard = false) {
  const { attributes } = props;

  let { content_source: contentSource } = attributes;

  // Saved layouts by default displaying Portfolio source.
  if ('portfolio' === contentSource) {
    contentSource = '';
  }

  return (
    <Fragment>
      <ControlsRender category="content-source" {...props} isSetupWizard={isSetupWizard} />
      {contentSource ? (
        <Fragment>
          {Object.keys(registeredControlsCategories).map((name) => {
            if ('content-source' === name) {
              return null;
            }

            return (
              <ControlsRender key={name} category={name} {...props} isSetupWizard={isSetupWizard} />
            );
          })}
        </Fragment>
      ) : (
        ''
      )}
    </Fragment>
  );
}

/**
 * Block Edit Class.
 */
export default function BlockEdit(props) {
  const { attributes, setAttributes } = props;

  const {
    block_id: blockId,
    content_source: contentSource,
    setup_wizard: setupWizard,
    preview_image_example: previewExample,
    layout,
    images,
    ghostkitClassname,
  } = attributes;

  // Display setup wizard on mount.
  useEffect(() => {
    if (!setupWizard && (!blockId || !contentSource)) {
      setAttributes({
        setup_wizard: 'true',
      });
    }
  }, []);

  const parsedBlocks = getParseBlocks('visual-portfolio/block');

  // Set some starter attributes for different content sources.
  // And hide the setup wizard.
  useEffect(() => {
    if ('true' === setupWizard && contentSource) {
      let blockCount = 0;
      let blockName = '';
      parsedBlocks.forEach((block) => {
        if (block.attributes.content_source === contentSource) {
          blockCount += 1;
        }
      });
      switch (contentSource) {
        case 'post-based':
          blockName = 'Posts';
          break;
        case 'social-stream':
          blockName = 'Social';
          break;
        default:
          blockName = 'Image';
          break;
      }
      switch (contentSource) {
        case 'images':
          if (images && images.length) {
            setAttributes({
              setup_wizard: '',
              items_count: -1,
              items_click_action: 'popup_gallery',
              gallery_name: `${blockName} Gallery #${blockCount}`,
            });
          }
          break;
        case 'post-based':
        case 'social-stream':
          setAttributes({
            setup_wizard: '',
            layout_elements: {
              top: {
                elements: [],
                align: 'center',
              },
              items: {
                elements: ['items'],
              },
              bottom: {
                elements: ['pagination'],
                align: 'center',
              },
            },
            gallery_name: `${blockName} Gallery #${blockCount}`,
          });
          break;
        default:
          setAttributes({
            setup_wizard: '',
          });
          break;
      }
    }
  }, [setupWizard, contentSource, images]);

  let className = '';

  // add custom classname.
  if (ghostkitClassname) {
    className = classnames(className, ghostkitClassname);
  }

  // Display block preview.
  if ('true' === previewExample) {
    return (
      <div className="vpf-example-preview">
        <img
          src={`${pluginUrl}/assets/admin/images/example-${layout}.png`}
          alt={`Preview of ${layout} layout`}
        />
      </div>
    );
  }

  const blockProps = useBlockProps({
    className,
  });

  return (
    <div {...blockProps}>
      {'true' !== setupWizard ? (
        <Fragment>
          <InspectorControls>{renderControls(props)}</InspectorControls>
          <IframePreview {...props} />
        </Fragment>
      ) : (
        <div className="vpf-setup-wizard">
          <div className="vpf-setup-wizard-title">{pluginName}</div>
          <div className="vpf-setup-wizard-description">
            {__('Select content source for this layout', '@@text_domain')}
          </div>
          {renderControls(props, true)}
        </div>
      )}
    </div>
  );
}
