/**
 * External dependencies
 */
import classnames from 'classnames/dedupe';

/**
 * WordPress dependencies
 */
const WPColorPicker = wp.components.ColorPicker;

const { Component } = wp.element;

const { __ } = wp.i18n;

const { Dropdown, Button, BaseControl } = wp.components;

const { ColorPalette } = wp.blockEditor;

/**
 * Component Class
 */
export default class ColorPicker extends Component {
  constructor(...args) {
    super(...args);

    // These states used to fix components re-rendering
    this.state = {
      keyForPalette: this.props.value,
      keyForPicker: this.props.value,
    };
  }

  render() {
    const {
      label,
      value,
      onChange,
      alpha = false,
      colorPalette = true,
      afterDropdownContent,
    } = this.props;

    return (
      <Dropdown
        className="vpf-component-color-picker__dropdown"
        contentClassName="vpf-component-color-picker__dropdown-content"
        popoverProps={{
          placement: 'left-start',
          offset: 36,
          shift: true,
        }}
        renderToggle={({ isOpen, onToggle }) => (
          <Button
            className={classnames(
              'vpf-component-color-toggle',
              isOpen ? 'vpf-component-color-toggle-active' : ''
            )}
            onClick={onToggle}
          >
            <span className="vpf-component-color-toggle-indicator">
              <span style={{ color: value || '' }} />
            </span>
            <span className="vpf-component-color-toggle-label">{label}</span>
          </Button>
        )}
        renderContent={() => (
          <div className="vpf-component-color-picker">
            <WPColorPicker
              color={value || ''}
              onChangeComplete={(color) => {
                let colorString;

                if ('undefined' === typeof color.rgb || 1 === color.rgb.a) {
                  colorString = color.hex;
                } else {
                  const { r, g, b, a } = color.rgb;
                  colorString = `rgba(${r}, ${g}, ${b}, ${a})`;
                }

                onChange(colorString || '');

                this.setState({
                  keyForPalette: colorString,
                });
              }}
              disableAlpha={!alpha}
              key={this.state.keyForPicker}
            />
            {colorPalette ? (
              <BaseControl
                label={__('Color Palette', '@@text_domain')}
                className="vpf-component-color-picker-palette"
              >
                <ColorPalette
                  value={value || ''}
                  onChange={(color) => {
                    onChange(color || '');

                    this.setState({
                      keyForPicker: color,
                    });
                  }}
                  disableCustomColors
                  key={this.state.keyForPalette}
                />
              </BaseControl>
            ) : (
              ''
            )}
            {afterDropdownContent || ''}
          </div>
        )}
      />
    );
  }
}
