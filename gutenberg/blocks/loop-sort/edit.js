/**
 * WordPress dependencies
 */
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import {
	CheckboxControl,
	Disabled,
	TextControl,
	__experimentalToolsPanel as ToolsPanel,
	__experimentalToolsPanelItem as ToolsPanelItem,
	__experimentalVStack as VStack,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';

/**
 * Internal dependencies
 */
import { useLoopOrphanWarning } from '../../utils/loop-orphan-warning';
import {
	getResetAllValues,
	useToolsPanelDropdownMenuProps,
} from '../../utils/tools-panel';

const AVAILABLE_OPTIONS = window.VPGutenbergVariables?.loop_sort_options || [];

/**
 * Options the block shows, in the order they were registered.
 *
 * An empty selection means every available option: the set can grow after the
 * block was saved - Pro and themes extend it - and a block that pinned the
 * built-in slugs would never show what arrives later. The render callback
 * resolves it the same way.
 *
 * @param {string[]} selected - selected option slugs.
 * @param {Object}   labels   - label overrides, keyed by slug.
 * @return {Array} shown options, `{ value, label }`.
 */
function getShownOptions(selected, labels) {
	return AVAILABLE_OPTIONS.filter(
		({ value }) => !selected.length || selected.includes(value)
	).map(({ value, label }) => ({
		value,
		label: labels?.[value]?.trim() ? labels[value] : label,
	}));
}

export default function LoopSortEdit({ attributes, setAttributes, context }) {
	const dropdownMenuProps = useToolsPanelDropdownMenuProps();

	const { options = [], labels = {} } = attributes;

	useLoopOrphanWarning('visual-portfolio/loop-sort', context);

	const shown = getShownOptions(options, labels);

	function toggleOption(value, isChecked) {
		// An empty selection stands for all of them, so the first change has to
		// spell the current state out before it removes anything from it.
		const current = options.length
			? options
			: AVAILABLE_OPTIONS.map((option) => option.value);

		const next = isChecked
			? AVAILABLE_OPTIONS.filter(
					(option) =>
						current.includes(option.value) || option.value === value
				).map((option) => option.value)
			: current.filter((slug) => slug !== value);

		// An empty array already means "all of them", and a select with nothing
		// to choose from sorts nothing either way.
		if (!next.length) {
			return;
		}

		// Back to everything - store it as such, so later additions show up.
		setAttributes({
			options: next.length === AVAILABLE_OPTIONS.length ? [] : next,
		});
	}

	function setLabel(value, label) {
		const next = { ...labels };

		if (label.trim()) {
			next[value] = label;
		} else {
			delete next[value];
		}

		setAttributes({ labels: next });
	}

	return (
		<>
			<InspectorControls>
				<ToolsPanel
					label={__('Settings', 'visual-portfolio')}
					resetAll={(filters) =>
						setAttributes(
							getResetAllValues(filters, {
								options: [],
								labels: {},
							})
						)
					}
					dropdownMenuProps={dropdownMenuProps}
				>
					<ToolsPanelItem
						label={__('Sort Options', 'visual-portfolio')}
						isShownByDefault
						hasValue={() => !!options.length}
						onDeselect={() => setAttributes({ options: [] })}
					>
						<VStack spacing={4}>
							{AVAILABLE_OPTIONS.map(({ value, label }) => {
								const isChecked =
									!options.length || options.includes(value);

								return (
									<CheckboxControl
										key={value || 'default'}
										label={label}
										checked={isChecked}
										disabled={
											isChecked && shown.length === 1
										}
										onChange={(nextChecked) =>
											toggleOption(value, nextChecked)
										}
									/>
								);
							})}
						</VStack>
					</ToolsPanelItem>
					<ToolsPanelItem
						label={__('Labels', 'visual-portfolio')}
						hasValue={() => !!Object.keys(labels).length}
						onDeselect={() => setAttributes({ labels: {} })}
					>
						<VStack spacing={4}>
							{shown.map(({ value }) => (
								<TextControl
									key={value || 'default'}
									label={
										AVAILABLE_OPTIONS.find(
											(option) => option.value === value
										)?.label
									}
									placeholder={
										AVAILABLE_OPTIONS.find(
											(option) => option.value === value
										)?.label
									}
									value={labels?.[value] || ''}
									onChange={(label) => setLabel(value, label)}
								/>
							))}
						</VStack>
					</ToolsPanelItem>
				</ToolsPanel>
			</InspectorControls>
			<div {...useBlockProps({ className: 'vp-block-loop-sort' })}>
				<Disabled>
					<select>
						{shown.map(({ value, label }) => (
							<option key={value || 'default'} value={value}>
								{label}
							</option>
						))}
					</select>
				</Disabled>
			</div>
		</>
	);
}
