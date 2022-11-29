/**
 * External dependencies
 */
import classnames from 'classnames/dedupe';
import Masonry from 'react-masonry-component';

/**
 * Internal dependencies
 */
import StylesRender from '../styles-render';
import ToggleModal from '../toggle-modal';

/**
 * WordPress dependencies
 */
const { __ } = wp.i18n;

const { Component } = wp.element;

const { Button } = wp.components;

/**
 * Component Class
 */
export default class TilesSelector extends Component {
  constructor(...args) {
    super(...args);

    this.renderPreview = this.renderPreview.bind(this);
  }

  // eslint-disable-next-line class-methods-use-this
  renderPreview(tilesType) {
    const settings = tilesType.split(/[:|]/);
    const selector = `[data-tiles-preview="${tilesType}"]`;
    let styles = '';

    // remove last empty item
    if ('undefined' !== typeof settings[settings.length - 1] && !settings[settings.length - 1]) {
      settings.pop();
    }

    // get columns number
    const columns = parseInt(settings[0], 10) || 1;
    settings.shift();

    // set columns
    styles += `${selector} .vpf-tiles-preview-item-wrap { width: ${100 / columns}%; }`;

    // set items sizes
    if (settings && settings.length) {
      for (let k = 0; k < settings.length; k += 1) {
        const size = settings[k].split(',');
        const w = parseFloat(size[0]) || 1;
        const h = parseFloat(size[1]) || 1;

        let itemSelector = '.vpf-tiles-preview-item-wrap';
        if (1 < settings.length) {
          itemSelector += `:nth-of-type(${settings.length}n+${k + 1})`;
        }

        if (w && 1 !== w) {
          styles += `${selector} ${itemSelector} { width: ${(w * 100) / columns}%; }`;
        }
        styles += `${selector} ${itemSelector} .vpf-tiles-preview-item::after { padding-top: ${
          h * 100
        }%; }`;
      }
    }

    return (
      <>
        <Masonry
          elementType="div"
          data-tiles-preview={tilesType}
          options={{
            transitionDuration: 0,
          }}
        >
          {Array(...Array(4 * columns)).map((i) => (
            <div key={i} className="vpf-tiles-preview-item-wrap">
              <div className="vpf-tiles-preview-item" />
            </div>
          ))}
        </Masonry>
        <StylesRender>{styles}</StylesRender>
      </>
    );
  }

  render() {
    const { value, options, onChange } = this.props;

    return (
      <div className="vpf-component-tiles-selector">
        <ToggleModal
          modalTitle={__('Tiles', '@@text_domain')}
          buttonLabel={__('Edit Tiles', '@@text_domain')}
        >
          <div className="vpf-component-tiles-selector-items">
            {options.map((data) => (
              <Button
                key={data.value}
                onClick={() => onChange(data.value)}
                className={classnames(
                  'vpf-tiles-preview-button',
                  value === data.value ? 'vpf-tiles-preview-button-active' : ''
                )}
              >
                {this.renderPreview(data.value)}
              </Button>
            ))}
          </div>
        </ToggleModal>
        <div className="vpf-tiles-preview-button">{this.renderPreview(value)}</div>
      </div>
    );
  }
}
