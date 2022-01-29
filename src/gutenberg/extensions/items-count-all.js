/* eslint-disable no-param-reassign */
/**
 * External dependencies
 */
import classnames from 'classnames/dedupe';

/**
 * Internal dependencies
 */
import controlGetValue from '../utils/control-get-value';

/**
 * WordPress dependencies
 */
const { __ } = wp.i18n;

const { addFilter } = wp.hooks;

const { RawHTML, Fragment } = wp.element;

const { BaseControl, ButtonGroup, Button, TextControl } = wp.components;

// Items count with "All Items" button.
addFilter(
  'vpf.editor.controls-render',
  'vpf/editor/controls-render/customize-controls',
  (render, data) => {
    if (data.name === 'items_count') {
      const { description, attributes, onChange } = data;

      const renderControlHelp = description ? <RawHTML>{description}</RawHTML> : false;
      const renderControlClassName = classnames(
        'vpf-control-wrap',
        `vpf-control-wrap-${data.type}`
      );
      const controlVal = parseInt(controlGetValue(data.name, attributes), 10);

      render = (
        <BaseControl label={data.label} help={renderControlHelp} className={renderControlClassName}>
          <div>
            <ButtonGroup>
              <Button
                isSmall
                isPrimary={controlVal !== -1}
                isPressed={controlVal !== -1}
                onClick={() => {
                  if (controlVal === -1) {
                    onChange(parseFloat(data.default || 6));
                  }
                }}
              >
                {__('Custom Count', '@@text_domain')}
              </Button>
              <Button
                isSmall
                isPrimary={controlVal === -1}
                isPressed={controlVal === -1}
                onClick={() => {
                  // eslint-disable-next-line no-alert
                  if (
                    controlVal !== -1 &&
                    window.confirm(
                      __(
                        'Be careful, the output of all your items can adversely affect the performance of your site, this option may be helpful for image galleries.',
                        '@@text_domain'
                      )
                    )
                  ) {
                    onChange(-1);
                  }
                }}
              >
                {__('All Items', '@@text_domain')}
              </Button>
            </ButtonGroup>
          </div>
          {controlVal !== -1 ? (
            <Fragment>
              <br />
              <TextControl
                type="number"
                min={data.min}
                max={data.max}
                step={data.step}
                value={controlVal}
                onChange={(val) => onChange(parseFloat(val))}
              />
            </Fragment>
          ) : (
            ''
          )}
        </BaseControl>
      );
    }

    return render;
  }
);
