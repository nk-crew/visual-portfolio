/**
 * WordPress dependencies
 */
import { useSettings } from '@wordpress/block-editor';
import {
	SelectControl,
	__experimentalToggleGroupControl as ToggleGroupControl,
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
	__experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';
import { __, _x } from '@wordpress/i18n';

/**
 * The Aspect ratio and Scale controls of the core Image block, rebuilt.
 *
 * Core keeps `AspectRatioTool` and `ScaleTool` inside its own bundle - one
 * behind `privateApis`, the rest not exported at all - so a block outside core
 * that wants the same two controls has to draw them itself.
 */

/**
 * The two ways an image can fill a box of proportions it does not have.
 *
 * The set the core Image block narrows its five defaults down to. `fill`
 * distorts the picture, which a gallery item never wants.
 */
export const SCALE_OPTIONS = [
	{
		value: 'cover',
		label: _x(
			'Cover',
			'Scale option for dimensions control',
			'visual-portfolio'
		),
		help: __('Image covers the space evenly.', 'visual-portfolio'),
	},
	{
		value: 'contain',
		label: _x(
			'Contain',
			'Scale option for dimensions control',
			'visual-portfolio'
		),
		help: __('Image is contained without distortion.', 'visual-portfolio'),
	},
];

/**
 * Aspect ratio, as a list of the ratios the site declares.
 *
 * The presets are read from the settings rather than written out here, so a
 * theme that adds a ratio adds it to this control too.
 *
 * @param {Object}   props                Component props.
 * @param {string}   props.panelId        `ToolsPanel` id of the block.
 * @param {string}   props.value          Current ratio, empty for the original one.
 * @param {string}   props.defaultValue   Ratio the block starts with.
 * @param {Function} props.onChange       Called with the new ratio.
 * @param {Function} props.resetAllFilter Attributes the panel's "Reset all" writes.
 * @return {Element} The control.
 */
export function AspectRatioTool({
	panelId,
	value,
	defaultValue = '',
	onChange,
	resetAllFilter,
}) {
	const [defaultRatios, themeRatios, showDefaultRatios] = useSettings(
		'dimensions.aspectRatios.default',
		'dimensions.aspectRatios.theme',
		'dimensions.defaultAspectRatios'
	);

	const ratio = value ?? '';

	const toOption = ({ name, ratio: presetRatio }) => ({
		label: name,
		value: presetRatio,
	});

	const options = [
		{
			label: _x(
				'Original',
				'Aspect ratio option for dimensions control',
				'visual-portfolio'
			),
			value: 'auto',
		},
		...(showDefaultRatios ? (defaultRatios?.map(toOption) ?? []) : []),
		...(themeRatios?.map(toOption) ?? []),
	];

	return (
		<ToolsPanelItem
			label={__('Aspect ratio', 'visual-portfolio')}
			isShownByDefault
			hasValue={() => ratio !== defaultValue}
			onDeselect={() => onChange(defaultValue)}
			resetAllFilter={resetAllFilter}
			panelId={panelId}
		>
			<SelectControl
				label={__('Aspect ratio', 'visual-portfolio')}
				value={ratio || 'auto'}
				options={options}
				onChange={(next) => onChange('auto' === next ? '' : next)}
			/>
		</ToolsPanelItem>
	);
}

/**
 * Scale, as the segmented control core uses, whose help follows the choice.
 *
 * @param {Object}   props                Component props.
 * @param {string}   props.panelId        `ToolsPanel` id of the block.
 * @param {string}   props.value          Current `object-fit` value.
 * @param {string}   props.defaultValue   Value the block starts with.
 * @param {Array}    props.options        Value, label and help of every choice.
 * @param {Function} props.onChange       Called with the new value.
 * @param {Function} props.resetAllFilter Attributes the panel's "Reset all" writes.
 * @return {Element} The control.
 */
export function ScaleTool({
	panelId,
	value,
	defaultValue = 'cover',
	options = SCALE_OPTIONS,
	onChange,
	resetAllFilter,
}) {
	const scale = value ?? defaultValue;
	const label = _x('Scale', 'Image scaling options', 'visual-portfolio');

	return (
		<ToolsPanelItem
			label={label}
			isShownByDefault
			hasValue={() => scale !== defaultValue}
			onDeselect={() => onChange(defaultValue)}
			resetAllFilter={resetAllFilter}
			panelId={panelId}
		>
			<ToggleGroupControl
				label={label}
				isBlock
				help={options.find((option) => option.value === scale)?.help}
				value={scale}
				onChange={onChange}
			>
				{options.map((option) => (
					<ToggleGroupControlOption
						key={option.value}
						value={option.value}
						label={option.label}
					/>
				))}
			</ToggleGroupControl>
		</ToolsPanelItem>
	);
}
