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
