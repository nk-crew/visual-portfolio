/**
 * External dependencies
 */
import { SortableContainer, SortableElement, sortableHandle, arrayMove } from 'react-sortable-hoc';

/**
 * WordPress dependencies
 */
const { Component } = wp.element;

const DragHandle = sortableHandle(() => <span>::</span>);

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
  <ul>
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
      />
    );
  }
}
