/**
 * WordPress dependencies
 */
import { InspectorControls, useBlockProps } from '@wordpress/block-editor';
import {
	CheckboxControl,
	Disabled,
	TextControl,
	ToggleControl,
	__experimentalToolsPanel as ToolsPanel,
	__experimentalToolsPanelItem as ToolsPanelItem,
	__experimentalVStack as VStack,
} from '@wordpress/components';
import { __ } from '@wordpress/i18n';
import classnames from 'classnames/dedupe';

/**
 * Internal dependencies
 */
import { useLoopOrphanWarning } from '../../utils/loop-orphan-warning';
import { loopSourceSupports } from '../../utils/loop-source-supports';
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

export default function LoopSortEdit({
	attributes,
	setAttributes,
	context,
	__unstableLayoutClassNames: layoutClassNames,
}) {
	const dropdownMenuProps = useToolsPanelDropdownMenuProps();

	const { options = [], labels = {}, displayAsDropdown } = attributes;

	useLoopOrphanWarning('visual-portfolio/loop-sort', context);

	const shown = getShownOptions(options, labels);
	const isUnsupported = !loopSourceSupports(
		context?.['vp/queryType'],
		'sort'
	);

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
								displayAsDropdown: true,
								options: [],
								labels: {},
							})
						)
					}
					dropdownMenuProps={dropdownMenuProps}
				>
					{isUnsupported && (
						<p style={{ gridColumn: '1 / -1', margin: 0 }}>
							{__(
								'Sorting is not available for this source, so the page shows no sort control.',
								'visual-portfolio'
							)}
						</p>
					)}
					<ToolsPanelItem
						label={__('Display as dropdown', 'visual-portfolio')}
						isShownByDefault
						hasValue={() => !displayAsDropdown}
						onDeselect={() =>
							setAttributes({ displayAsDropdown: true })
						}
					>
						<ToggleControl
							label={__(
								'Display as dropdown',
								'visual-portfolio'
							)}
							checked={displayAsDropdown}
							onChange={() =>
								setAttributes({
									displayAsDropdown: !displayAsDropdown,
								})
							}
						/>
					</ToolsPanelItem>
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
			<div
				{...useBlockProps({
					// Only a block that holds inner blocks is given its layout
					// classes by the editor.
					className: classnames(
						'vp-block-loop-sort',
						layoutClassNames
					),
				})}
			>
				{displayAsDropdown ? (
					<Disabled>
						{/* The default order is selected, as on the page, and
						 without it the page asks for an order. */}
						<select value="" readOnly>
							{!shown.some(({ value }) => !value) && (
								<option value="" disabled>
									{__('Select sorting', 'visual-portfolio')}
								</option>
							)}
							{shown.map(({ value, label }) => (
								<option key={value || 'default'} value={value}>
									{label}
								</option>
							))}
						</select>
					</Disabled>
				) : (
					// The editor has no sort in its URL, which is the state the
					// render callback marks the default order active in.
					shown.map(({ value, label }) =>
						value ? (
							<a
								key={value}
								href="#sort-pseudo-link"
								className="vp-block-loop-sort__item"
								onClick={(event) => event.preventDefault()}
							>
								{label}
							</a>
						) : (
							<span
								key="default"
								aria-current="page"
								className="vp-block-loop-sort__item is-active"
							>
								{label}
							</span>
						)
					)
				)}
			</div>
		</>
	);
}
