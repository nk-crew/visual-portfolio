/**
 * WordPress dependencies
 */
import { useViewportMatch } from '@wordpress/compose';

/**
 * Props that place a `ToolsPanel` menu where core places its own.
 *
 * Left of the inspector on a wide screen - past the panel's own width, so the
 * menu does not cover the controls it is about to add - and wherever the
 * popover lands on a narrow one, where there is no room beside the panel.
 *
 * Every core block builds these props with a hook the components package keeps
 * private, so it is copied here and stays a copy until that hook is exported.
 *
 * @return {Object} `dropdownMenuProps` for a `ToolsPanel`.
 */
export function useToolsPanelDropdownMenuProps() {
	const isMobile = useViewportMatch('medium', '<');

	return !isMobile
		? { popoverProps: { placement: 'left-start', offset: 259 } }
		: {};
}

/**
 * What a "Reset all" writes.
 *
 * `ToolsPanel` hands `resetAll` the `resetAllFilter` callbacks of the items
 * registered with it, and an item added through one of our extension points is
 * only reset through its own - the panel cannot know what to write back for
 * someone else's option. Each filter is applied over what the ones before it
 * produced, the way core's block support panels apply them.
 *
 * @param {Array}  filters  - `resetAllFilter` callbacks, as `ToolsPanel` passes them.
 * @param {Object} defaults - what the panel's own controls reset to.
 * @return {Object} attributes to write.
 */
export function getResetAllValues(filters, defaults = {}) {
	const values = { ...defaults };

	(filters || []).forEach((filter) => {
		Object.assign(values, filter(values));
	});

	return values;
}
