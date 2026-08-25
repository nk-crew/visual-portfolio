/**
 * WordPress dependencies
 */
import { useSettings } from '@wordpress/block-editor';
import {
	SelectControl,
	__experimentalToggleGroupControl as ToggleGroupControl,
	__experimentalToggleGroupControlOption as ToggleGroupControlOption,
	__experimentalToolsPanelItem as ToolsPanelItem,
	__experimentalUnitControl as UnitControl,
	__experimentalUseCustomUnits as useCustomUnits,
} from '@wordpress/components';
import { useState } from '@wordpress/element';
import { __, _x } from '@wordpress/i18n';

/**
 * The Dimensions panel of the core Featured Image block, rebuilt.
 *
 * Core keeps `DimensionsTool` and the three controls it is made of inside its
 * own bundle - one behind `privateApis`, the rest not exported at all - so a
 * block outside core that wants the same panel has to draw it itself.
 */

/**
 * The three ways an image can fill a box of proportions it does not have.
 *
 * Core's own set, help included: two of them keep the picture, `fill` stretches
 * it, and saying so is what the help is for.
 */
export const SCALE_OPTIONS = [
	{
		value: 'cover',
		label: _x(
			'Cover',
			'Scale option for Image dimension control',
			'visual-portfolio'
		),
		help: __(
			'Image is scaled and cropped to fill the entire space without being distorted.',
			'visual-portfolio'
		),
	},
	{
		value: 'contain',
		label: _x(
			'Contain',
			'Scale option for Image dimension control',
			'visual-portfolio'
		),
		help: __(
			'Image is scaled to fill the space without clipping nor distorting.',
			'visual-portfolio'
		),
	},
	{
		value: 'fill',
		label: _x(
			'Fill',
			'Scale option for Image dimension control',
			'visual-portfolio'
		),
		help: __(
			'Image will be stretched and distorted to completely fill the space.',
			'visual-portfolio'
		),
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
		// A width and a height are a ratio the list cannot hold. Selectable it
		// is not - it is the pair that made it, and the pair that undoes it.
		{
			label: _x(
				'Custom',
				'Aspect ratio option for dimensions control',
				'visual-portfolio'
			),
			value: 'custom',
			disabled: true,
			hidden: true,
		},
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
 * Width and Height, the pair core puts side by side under the aspect ratio.
 *
 * @param {Object}   props                Component props.
 * @param {string}   props.panelId        `ToolsPanel` id of the block.
 * @param {Object}   props.value          Current `{ width, height }`.
 * @param {Function} props.onChange       Called with the new `{ width, height }`.
 * @param {Function} props.resetAllFilter Attributes the panel's "Reset all" writes.
 * @return {Element} The controls.
 */
export function WidthHeightTool({
	panelId,
	value = {},
	onChange,
	resetAllFilter,
}) {
	const [availableUnits] = useSettings('spacing.units');
	const units = useCustomUnits({
		availableUnits: availableUnits || ['px', '%', 'vw', 'em', 'rem'],
	});

	// `auto` is a stored width that stands for no width at all, so the field it
	// belongs to shows its placeholder instead.
	const width = 'auto' === value.width ? '' : (value.width ?? '');
	const height = 'auto' === value.height ? '' : (value.height ?? '');

	const onDimensionChange = (dimension) => (next) =>
		onChange({ ...value, [dimension]: next || undefined });

	return (
		<>
			<ToolsPanelItem
				style={{ gridColumn: 'span 1' }}
				label={__('Width', 'visual-portfolio')}
				isShownByDefault
				hasValue={() => '' !== width}
				onDeselect={onDimensionChange('width')}
				resetAllFilter={resetAllFilter}
				panelId={panelId}
			>
				<UnitControl
					label={__('Width', 'visual-portfolio')}
					placeholder={__('Auto', 'visual-portfolio')}
					labelPosition="top"
					units={units}
					min={0}
					value={width}
					onChange={onDimensionChange('width')}
				/>
			</ToolsPanelItem>
			<ToolsPanelItem
				style={{ gridColumn: 'span 1' }}
				label={__('Height', 'visual-portfolio')}
				isShownByDefault
				hasValue={() => '' !== height}
				onDeselect={onDimensionChange('height')}
				resetAllFilter={resetAllFilter}
				panelId={panelId}
			>
				<UnitControl
					label={__('Height', 'visual-portfolio')}
					placeholder={__('Auto', 'visual-portfolio')}
					labelPosition="top"
					units={units}
					min={0}
					value={height}
					onChange={onDimensionChange('height')}
				/>
			</ToolsPanelItem>
		</>
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

/**
 * The three controls together, with the interplay core gives them.
 *
 * A ratio and a width and height pair are the same statement made twice, so
 * each one clears the other, and the scale is only offered once one of them has
 * given the picture a box to fill.
 *
 * @param {Object}   props                    Component props.
 * @param {string}   props.panelId            `ToolsPanel` id of the block.
 * @param {Object}   props.value              Current `{ aspectRatio, width, height, scale }`.
 * @param {Function} props.onChange           Called with all four, ready for `setAttributes`.
 * @param {Array}    props.scaleOptions       Value, label and help of every scale.
 * @param {string}   props.defaultAspectRatio Ratio the block starts with.
 * @param {string}   props.defaultScale       Scale the block starts with.
 * @return {Element} The controls.
 */
export function DimensionsTool({
	panelId,
	value = {},
	onChange,
	scaleOptions = SCALE_OPTIONS,
	defaultAspectRatio = '',
	defaultScale = 'cover',
}) {
	const width = !value.width || 'auto' === value.width ? null : value.width;
	const height =
		!value.height || 'auto' === value.height ? null : value.height;
	const aspectRatio =
		!value.aspectRatio || 'auto' === value.aspectRatio
			? null
			: value.aspectRatio;

	// What a control puts back when the other one stops clearing it, so that
	// going through "no ratio" and back does not lose what was chosen before.
	const [lastScale, setLastScale] = useState(value.scale || null);
	const [lastAspectRatio, setLastAspectRatio] = useState(aspectRatio);

	const keptScale = () => {
		if (!lastScale) {
			setLastScale(defaultScale);
		}

		return lastScale || defaultScale;
	};

	const setDimensions = (next) =>
		onChange({
			aspectRatio: next.aspectRatio || defaultAspectRatio,
			// A height on its own leaves the width to the ratio rather than to
			// the column the item sits in.
			width:
				!next.width && next.height ? 'auto' : next.width || undefined,
			height: next.height || undefined,
			scale: next.scale || defaultScale,
		});

	const resetAllFilter = () => ({
		aspectRatio: defaultAspectRatio,
		width: undefined,
		height: undefined,
		scale: defaultScale,
	});

	return (
		<>
			<AspectRatioTool
				panelId={panelId}
				value={width && height ? 'custom' : (aspectRatio ?? '')}
				defaultValue={defaultAspectRatio}
				resetAllFilter={resetAllFilter}
				onChange={(next) => {
					setLastAspectRatio(next || null);
					setDimensions({
						...value,
						aspectRatio: next,
						// A pair that is already saying what the ratio says.
						height: width && height ? null : value.height,
						scale: next ? keptScale() : null,
					});
				}}
			/>
			<WidthHeightTool
				panelId={panelId}
				value={{ width, height }}
				resetAllFilter={resetAllFilter}
				onChange={({ width: nextWidth, height: nextHeight }) =>
					setDimensions({
						...value,
						width: nextWidth,
						height: nextHeight,
						aspectRatio:
							nextWidth && nextHeight ? null : lastAspectRatio,
						// One side of a picture is not a box, so nothing is
						// left for the scale to fill.
						scale:
							!lastAspectRatio && !!nextWidth !== !!nextHeight
								? null
								: keptScale(),
					})
				}
			/>
			{!!(aspectRatio || (width && height)) && (
				<ScaleTool
					panelId={panelId}
					value={lastScale}
					defaultValue={defaultScale}
					options={scaleOptions}
					resetAllFilter={resetAllFilter}
					onChange={(next) => {
						setLastScale(next);
						setDimensions({ ...value, scale: next });
					}}
				/>
			)}
		</>
	);
}
