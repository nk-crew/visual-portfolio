/**
 * External dependencies
 */
import classnames from 'classnames/dedupe';

/**
 * Internal dependencies
 */
import ControlsRender from '../components/controls-render';
import SetupWizard from '../components/setup-wizard';
import IframePreview from '../components/iframe-preview';

/**
 * WordPress dependencies
 */
const { useEffect } = wp.element;

const { useBlockProps, InspectorControls } = wp.blockEditor;

const { plugin_url: pluginUrl, controls_categories: registeredControlsCategories } =
  window.VPGutenbergVariables;

function renderControls(props) {
  const { attributes } = props;

  let { content_source: contentSource } = attributes;

  // Saved layouts by default displaying Portfolio source.
  if ('portfolio' === contentSource) {
    contentSource = '';
  }

  return (
    <>
      <ControlsRender category="content-source" {...props} />

      {/* Display all settings once selected Content Source */}
      {contentSource ? (
        <>
          {Object.keys(registeredControlsCategories).map((name) => {
            if ('content-source' === name) {
              return null;
            }

            return <ControlsRender key={name} category={name} {...props} />;
          })}
        </>
      ) : null}
    </>
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
      {'true' === setupWizard ? (
        <SetupWizard {...props} />
      ) : (
        <>
          <InspectorControls>{renderControls(props)}</InspectorControls>
          <IframePreview {...props} />
        </>
      )}
    </div>
  );
}
