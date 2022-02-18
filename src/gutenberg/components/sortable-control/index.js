/**
 * External dependencies
 */
import { SortableContainer, SortableElement, sortableHandle, arrayMove } from 'react-sortable-hoc';

/**
 * WordPress dependencies
 */
const { Component } = wp.element;

const { Button } = wp.components;

const DragHandle = sortableHandle(() => (
  <span>
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M10 4.99976H8V6.99976H10V4.99976Z" fill="currentColor" />
      <path d="M10 10.9998H8V12.9998H10V10.9998Z" fill="currentColor" />
      <path d="M10 16.9998H8V18.9998H10V16.9998Z" fill="currentColor" />
      <path d="M16 4.99976H14V6.99976H16V4.99976Z" fill="currentColor" />
      <path d="M16 10.9998H14V12.9998H16V10.9998Z" fill="currentColor" />
      <path d="M16 16.9998H14V18.9998H16V16.9998Z" fill="currentColor" />
    </svg>
  </span>
));

const SortableItem = SortableElement(({ element, sourceOptions, props, state, controlObject }) => {
  const { allowDisablingOptions, onChange } = props;

  const { value, disabledOptions } = state;

  const label = sourceOptions[element];
  return (
    <li>
      <DragHandle />
      {label}
      {allowDisablingOptions ? (
        <Button
          className="vpf-component-sortable-delete"
          onClick={() => {
            const updateValue = value;
            const findIndex = value.indexOf(element);
            updateValue.splice(findIndex, 1);
            disabledOptions.push(element);

            onChange(JSON.stringify(updateValue));
            controlObject.setState({
              value: updateValue,
              disabledOptions,
            });
          }}
        >
          -
        </Button>
      ) : null}
    </li>
  );
});

const SortableList = SortableContainer(
  ({ items, sourceOptions, classes, props, state, controlObject }) => (
    <ul className={classes}>
      {items.map((value, index) => (
        <SortableItem
          key={`item-${value}`}
          index={index}
          element={value}
          sourceOptions={sourceOptions}
          props={props}
          state={state}
          controlObject={controlObject}
        />
      ))}
    </ul>
  )
);

/**
 * Component Class
 */
export default class SortableControl extends Component {
  constructor(...args) {
    super(...args);

    const { options, defaultVal } = this.props;

    const defaultOptions = defaultVal || Object.keys(options);

    const value =
      typeof this.props.value !== 'undefined' ? JSON.parse(this.props.value) : defaultOptions;

    const disabledOptions = Object.keys(options).filter((findValue) => !value.includes(findValue));

    this.state = {
      value,
      disabledOptions,
    };
  }

  render() {
    const { options, allowDisablingOptions, onChange } = this.props;

    const { value, disabledOptions } = this.state;

    let classes = 'vpf-component-sortable';

    classes = disabledOptions.length > 0 ? `${classes} vpf-dragging-has-disabled-options` : classes;

    return (
      <div>
        <SortableList
          items={value}
          sourceOptions={options}
          classes={classes}
          props={this.props}
          state={this.state}
          controlObject={this}
          onSortEnd={({ oldIndex, newIndex }) => {
            const updateValue = arrayMove([...value], oldIndex, newIndex);
            onChange(JSON.stringify(updateValue));
            this.setState({
              value: updateValue,
            });
          }}
          useDragHandle
          helperClass="vpf-component-sortable-item-dragging"
        />
        {disabledOptions.length > 0 ? (
          <ul className="vpf-component-sortable-disabled">
            {disabledOptions.map((el) => (
              <li key={`disabled-item-${el}`}>
                {allowDisablingOptions ? (
                  <Button
                    className="vpf-component-sortable-add"
                    onClick={() => {
                      const updateValue = value;
                      const findIndex = disabledOptions.indexOf(el);
                      disabledOptions.splice(findIndex, 1);
                      updateValue.push(el);

                      onChange(JSON.stringify(updateValue));
                      this.setState({
                        value: updateValue,
                        disabledOptions,
                      });
                    }}
                  >
                    +
                  </Button>
                ) : null}
                {options[el]}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  }
}
