/**
 * External dependencies
 */
import classnames from 'classnames/dedupe';

/**
 * WordPress dependencies
 */
const { jQuery: $, ajaxurl, VPGutenbergVariables } = window;

const { __ } = wp.i18n;

const { Component, RawHTML } = wp.element;

const { Button, Spinner } = wp.components;

const cachedOptions = {};

/**
 * Component Class
 */
export default class IconsSelector extends Component {
  constructor(...args) {
    super(...args);

    const { callback } = this.props;

    this.state = {
      options: { ...this.props.options },
      ajaxStatus: !!callback,
      collapsed: true,
    };

    cachedOptions[this.props.controlName] = { ...this.props.options };

    this.requestAjax = this.requestAjax.bind(this);
  }

  componentDidMount() {
    const { callback } = this.props;

    if (callback) {
      this.requestAjax({}, (result) => {
        if (result.options) {
          this.setState({
            options: result.options,
          });
        }
      });
    }
  }

  /**
   * Request AJAX dynamic data.
   *
   * @param {Object} additionalData - additional data for AJAX call.
   * @param {Function} callback - callback.
   * @param {Boolean} useStateLoading - use state change when loading.
   */
  requestAjax(additionalData = {}, callback = () => {}, useStateLoading = true) {
    const { controlName, attributes } = this.props;

    if (this.isAJAXinProgress) {
      return;
    }

    this.isAJAXinProgress = true;

    if (useStateLoading) {
      this.setState({
        ajaxStatus: 'progress',
      });
    }

    const ajaxData = {
      action: 'vp_dynamic_control_callback',
      nonce: VPGutenbergVariables.nonce,
      vp_control_name: controlName,
      vp_attributes: attributes,
      ...additionalData,
    };

    $.ajax({
      url: ajaxurl,
      method: 'POST',
      dataType: 'json',
      data: ajaxData,
      complete: (data) => {
        const json = data.responseJSON;

        if (callback && json.response) {
          if (json.response.options) {
            cachedOptions[controlName] = {
              ...cachedOptions[controlName],
              ...json.response.options,
            };
          }

          callback(json.response);
        }

        if (useStateLoading) {
          this.setState({
            ajaxStatus: true,
          });
        }

        this.isAJAXinProgress = false;
      },
    });
  }

  render() {
    const { controlName, value, onChange, collapseRows, isSetupWizard } = this.props;

    const { options, ajaxStatus, collapsed } = this.state;

    const isLoading = ajaxStatus && 'progress' === ajaxStatus;

    if (isLoading) {
      return (
        <div className="vpf-component-icon-selector">
          <Spinner />
        </div>
      );
    }

    const itemsPerRow = isSetupWizard ? 5 : 3;
    const allowCollapsing = false !== collapseRows;

    let modifiedOptions = { ...(options || {}) };

    // Move the selected option to start of the list when it is collapsed.
    if (allowCollapsing && collapsed && 'undefined' !== typeof modifiedOptions[value]) {
      const { [value]: valObject, ...restOptions } = modifiedOptions;
      modifiedOptions = { [value]: valObject, ...restOptions };
    }

    return (
      <>
        <div
          className={classnames(
            'vpf-component-icon-selector',
            allowCollapsing ? 'vpf-component-icon-selector-allow-collapsing' : ''
          )}
          data-control-name={controlName}
        >
          {Object.keys(modifiedOptions || {})
            .filter((elm, i) => {
              if (allowCollapsing) {
                return collapsed ? i < itemsPerRow : true;
              }
              return true;
            })
            .map((k) => {
              const option = modifiedOptions[k];
              let { icon } = option;

              if (isSetupWizard) {
                if (option.image_preview_wizard) {
                  icon = `<img src="${option.image_preview_wizard}" alt="${option.title} Preview">`;
                } else if (option.icon_wizard) {
                  icon = option.icon_wizard;
                }
              }

              return (
                <Button
                  key={`icon-selector-${option.title}-${option.value}`}
                  onClick={() => onChange(option.value)}
                  className={classnames(
                    'vpf-component-icon-selector-item',
                    value === option.value ? 'vpf-component-icon-selector-item-active' : '',
                    option.className
                  )}
                >
                  {icon ? <RawHTML>{icon}</RawHTML> : ''}
                  {option.title ? <span>{option.title}</span> : ''}
                </Button>
              );
            })}
        </div>
        {allowCollapsing ? (
          <div
            className={classnames(
              'vpf-component-icon-selector-collapse-button',
              collapsed ? '' : 'vpf-component-icon-selector-collapse-button-expanded'
            )}
          >
            <button
              type="button"
              onClick={() => {
                this.setState({
                  collapsed: !collapsed,
                });
              }}
            >
              {collapsed ? __('Show More', '@@text_domain') : __('Show Less', '@@text_domain')}
              <svg
                width="11"
                height="6"
                viewBox="0 0 11 6"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path d="M10 1.25L5.5 4.75L1 1.25" stroke="currentColor" strokeWidth="1" />
              </svg>
            </button>
          </div>
        ) : null}
      </>
    );
  }
}
