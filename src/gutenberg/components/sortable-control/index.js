/**
 * External dependencies
 */
import { SortableContainer, SortableElement, sortableHandle, arrayMove } from 'react-sortable-hoc';

/**
 * WordPress dependencies
 */
const { Component } = wp.element;

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

const SortableItem = SortableElement(({ value, sourceOptions }) => {
  const label = sourceOptions[value];
  return (
    <li>
      <DragHandle />
      {label}
    </li>
  );
});

const SortableList = SortableContainer(({ items, sourceOptions }) => (
  <ul className="vpf-component-sortable">
    {items.map((value, index) => (
      <SortableItem
        key={`item-${value}`}
        index={index}
        value={value}
        sourceOptions={sourceOptions}
      />
    ))}
  </ul>
));

/**
 * Component Class
 */
export default class SortableControl extends Component {
  constructor(...args) {
    super(...args);

    const { options } = this.props;

    const defaultOptions = Object.keys(options);

    this.state = {
      defaultOptions,
    };
  }

  render() {
    const { options, onChange } = this.props;

    const { defaultOptions } = this.state;

    const value =
      typeof this.props.value !== 'undefined' ? JSON.parse(this.props.value) : defaultOptions;

    return (
      <SortableList
        items={value}
        sourceOptions={options}
        onSortEnd={({ oldIndex, newIndex }) => {
          const updateValue = arrayMove([...value], oldIndex, newIndex);
          onChange(JSON.stringify(updateValue));
        }}
        useDragHandle
        helperClass="vpf-component-sortable-item-dragging"
      />
    );
  }
}
