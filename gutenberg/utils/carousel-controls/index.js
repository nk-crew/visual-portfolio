/**
 * WordPress dependencies
 */
import { store as blockEditorStore } from '@wordpress/block-editor';
import { PanelBody, ToggleControl } from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { ToggleGroupButtonsControl } from '../../components/toggle-group-control';

/**
 * The blocks a carousel is steered with.
 *
 * Shared by the item template, which draws them over the slides when they are
 * dropped inside it, and by the editor of every one of them.
 */
export const NAV_BLOCK = 'visual-portfolio/loop-carousel-nav';
export const PREVIOUS_BLOCK = 'visual-portfolio/loop-carousel-previous';
export const NEXT_BLOCK = 'visual-portfolio/loop-carousel-next';
export const INDICATOR_BLOCK = 'visual-portfolio/loop-carousel-indicator';
export const ARROW_BLOCKS = [PREVIOUS_BLOCK, NEXT_BLOCK];
export const CONTROL_BLOCKS = [NAV_BLOCK, ...ARROW_BLOCKS, INDICATOR_BLOCK];

/**
 * The class a control fades behind until the pointer rests on the carousel.
 */
export const SHOW_ON_HOVER_CLASS = 'is-shown-on-hover';

// What the arrow is drawn as. A chevron is the default and carries no class.
export const ARROW_ICONS = [
	{ value: 'chevron', label: __('Chevron', 'visual-portfolio') },
	{ value: 'arrow', label: __('Arrow', 'visual-portfolio') },
];

// How an arrow button is drawn. Outlined is the default and carries no class.
export const ARROW_APPEARANCES = [
	{ value: 'outlined', label: __('Outlined', 'visual-portfolio') },
	{ value: 'filled', label: __('Filled', 'visual-portfolio') },
	{ value: 'plain', label: __('Plain', 'visual-portfolio') },
];

// How the indicator is drawn. Filled is the default and carries no class.
export const INDICATOR_APPEARANCES = [
	{ value: 'filled', label: __('Filled', 'visual-portfolio') },
	{ value: 'outlined', label: __('Outlined', 'visual-portfolio') },
	{ value: 'plain', label: __('Plain', 'visual-portfolio') },
];

/**
 * The classes an arrow carries for its settings.
 *
 * The same classes the render callback prints, so the editor draws the button
 * the page will.
 *
 * @param {Object} attributes - block attributes.
 *
 * @return {string} class names, possibly empty.
 */
export function arrowClassNames({ icon, appearance, showOnHover }) {
	return [
		'arrow' === icon ? 'has-arrow-icon' : '',
		'filled' === appearance || 'plain' === appearance
			? `is-${appearance}`
			: '',
		showOnHover ? SHOW_ON_HOVER_CLASS : '',
	]
		.filter(Boolean)
		.join(' ');
}

/**
 * The classes an indicator carries for its settings.
 *
 * @param {Object} attributes - block attributes.
 *
 * @return {string} class names, possibly empty.
 */
export function indicatorClassNames({ appearance, showOnHover }) {
	return [
		'outlined' === appearance || 'plain' === appearance
			? `is-${appearance}`
			: '',
		showOnHover ? SHOW_ON_HOVER_CLASS : '',
	]
		.filter(Boolean)
		.join(' ');
}

/**
 * Where a control was dropped.
 *
 * A control inside the item template is drawn over the slides, and a control
 * inside the navigation row leaves the row to answer for the row.
 *
 * @param {string} clientId - client id of the control.
 *
 * @return {Object} `isOverlay` and `isInRow`.
 */
export function useControlPlacement(clientId) {
	return useSelect(
		(select) => {
			const { getBlockParentsByBlockName } = select(blockEditorStore);

			return {
				isOverlay:
					getBlockParentsByBlockName(
						clientId,
						'visual-portfolio/item-template'
					).length > 0,
				isInRow:
					getBlockParentsByBlockName(clientId, NAV_BLOCK).length > 0,
			};
		},
		[clientId]
	);
}

/**
 * The switch that fades a control behind until the pointer rests on the
 * carousel.
 *
 * Offered only where it does something: over the slides, where a control
 * covers the pictures, and never for a control that answers to a row.
 *
 * @param {Object}   props               - component props.
 * @param {boolean}  props.value         - whether the control waits for the pointer.
 * @param {Function} props.onChange      - attribute setter.
 *
 * @return {Element} component.
 */
export function ShowOnHoverControl({ value, onChange }) {
	return (
		<ToggleControl
			__nextHasNoMarginBottom
			label={__('Show on hover', 'visual-portfolio')}
			help={__(
				'Fades in while the pointer rests on the carousel. Always shown on touch screens.',
				'visual-portfolio'
			)}
			checked={!!value}
			onChange={onChange}
		/>
	);
}

/**
 * The settings of an arrow.
 *
 * @param {Object}   props            - component props.
 * @param {Object}   props.attributes - `icon` and `appearance`.
 * @param {Function} props.onChange   - attribute setter.
 *
 * @return {Element} component.
 */
export function ArrowControls({ attributes, onChange }) {
	return (
		<>
			<ToggleGroupButtonsControl
				label={__('Icon', 'visual-portfolio')}
				value={attributes.icon || 'chevron'}
				options={ARROW_ICONS}
				onChange={(icon) => onChange({ icon })}
			/>
			<ToggleGroupButtonsControl
				label={__('Button style', 'visual-portfolio')}
				value={attributes.appearance || 'outlined'}
				options={ARROW_APPEARANCES}
				onChange={(appearance) => onChange({ appearance })}
			/>
		</>
	);
}

/**
 * The settings of an indicator.
 *
 * @param {Object}   props            - component props.
 * @param {Object}   props.attributes - `appearance`.
 * @param {Function} props.onChange   - attribute setter.
 *
 * @return {Element} component.
 */
export function IndicatorControls({ attributes, onChange }) {
	return (
		<ToggleGroupButtonsControl
			label={__('Style', 'visual-portfolio')}
			value={attributes.appearance || 'filled'}
			options={INDICATOR_APPEARANCES}
			onChange={(appearance) => onChange({ appearance })}
		/>
	);
}

/**
 * A panel of the settings of one control.
 *
 * @param {Object}  props          - component props.
 * @param {string}  props.title    - panel title.
 * @param {Element} props.children - the settings.
 *
 * @return {Element} component.
 */
export function ControlPanel({ title, children }) {
	return <PanelBody title={title}>{children}</PanelBody>;
}
