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

const SortableItem = SortableElement(({ element, sourceOptions, items, props }) => {
  const { allowDisablingOptions, onChange } = props;

  const label = sourceOptions[element];
  return (
    <li>
      <DragHandle />
      {label}
      {allowDisablingOptions ? (
        <Button
          className="vpf-component-sortable-delete"
          onClick={() => {
            const updateValue = [...items];
            const findIndex = items.indexOf(element);
            updateValue.splice(findIndex, 1);

            onChange(updateValue);
          }}
        >
          -
        </Button>
      ) : null}
    </li>
  );
});

const SortableList = SortableContainer(({ items, sourceOptions, classes, props }) => (
  <ul className={classes}>
    {items.map((value, index) => (
      <SortableItem
        key={`item-${value}`}
        index={index}
        element={value}
        sourceOptions={sourceOptions}
        props={props}
        items={items}
      />
    ))}
  </ul>
));

/**
 * Component Class
 */
export default class SortableControl extends Component {
  render() {
    const { options, defaultOptions, allowDisablingOptions, onChange } = this.props;

    let { value } = this.props;

    value = 'undefined' !== typeof value ? value : defaultOptions;

    const disabledOptions = Object.keys(options).filter((findValue) => !value.includes(findValue));

    let classes = 'vpf-component-sortable';

    classes = 0 < disabledOptions.length ? `${classes} vpf-dragging-has-disabled-options` : classes;

    return (
      <div>
        <SortableList
          items={value}
          sourceOptions={options}
          classes={classes}
          props={this.props}
          onSortEnd={({ oldIndex, newIndex }) => {
            const updateValue = arrayMove([...value], oldIndex, newIndex);
            onChange(updateValue);
          }}
          useDragHandle
          helperClass="vpf-component-sortable-item-dragging"
        />
        {0 < disabledOptions.length ? (
          <ul className="vpf-component-sortable-disabled">
            {disabledOptions.map((el) => (
              <li key={`disabled-item-${el}`}>
                {allowDisablingOptions ? (
                  <Button
                    className="vpf-component-sortable-add"
                    onClick={() => {
                      const updateValue = [...value];

                      updateValue.push(el);

                      onChange(updateValue);
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
