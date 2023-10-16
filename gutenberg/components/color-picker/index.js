import './style.scss';

import classnames from 'classnames/dedupe';

import { __experimentalUseMultipleOriginColorsAndGradients as useMultipleOriginColorsAndGradients } from '@wordpress/block-editor';
import {
	Button,
	ColorPalette,
	Dropdown,
	GradientPicker,
	TabPanel,
} from '@wordpress/components';
import { useSelect } from '@wordpress/data';

function useColors() {
	// New way to get colors and gradients.
	if (
		useMultipleOriginColorsAndGradients &&
		useMultipleOriginColorsAndGradients()
	) {
		const colorsData = useMultipleOriginColorsAndGradients();
		return {
			colors: colorsData.colors,
			gradients: colorsData.gradients,
		};
	}

	// Old way.
	const { colors, gradients } = useSelect((select) => {
		const settings = select('core/block-editor').getSettings();

		const themeColors = [];
		const themeGradients = [];

		if (settings.colors && settings.colors.length) {
			themeColors.push({ name: 'Theme', colors: settings.colors });
		}
		if (settings.gradients && settings.gradients.length) {
			themeGradients.push({
				name: 'Theme',
				gradients: settings.gradients,
			});
		}

		return {
			colors: themeColors,
			gradients: themeGradients,
		};
	});

	return { colors, gradients };
}

/**
 * Component Class
 *
 * @param props
 */
export default function ColorPicker(props) {
	const {
		label,
		value,
		onChange,
		alpha = false,
		gradient = false,
		afterDropdownContent,
	} = props;
	const { colors, gradients } = useColors();

	const isGradient = value && value.match(/gradient/);
	const colorValue = isGradient ? undefined : value;
	const gradientValue = isGradient ? value : undefined;

	const tabs = {
		solid: (
			<ColorPalette
				colors={colors}
				value={colorValue}
				enableAlpha={alpha}
				onChange={(val) => {
					onChange(val);
				}}
				__experimentalHasMultipleOrigins
				__experimentalIsRenderedInSidebar
			/>
		),
		gradient: (
			<GradientPicker
				__nextHasNoMargin
				value={gradientValue}
				onChange={(val) => {
					onChange(val);
				}}
				gradients={gradients}
			/>
		),
	};

	return (
		<Dropdown
			className="vpf-component-color-picker__dropdown"
			contentClassName="vpf-component-color-picker__dropdown-content"
			popoverProps={{
				placement: 'left-start',
				offset: 36,
				shift: true,
			}}
			renderToggle={({ isOpen, onToggle }) => (
				<Button
					className={classnames(
						'vpf-component-color-toggle',
						isOpen ? 'vpf-component-color-toggle-active' : ''
					)}
					onClick={onToggle}
				>
					<span
						className="vpf-component-color-toggle-indicator"
						style={{ background: value || '' }}
					/>
					<span className="vpf-component-color-toggle-label">
						{label}
					</span>
				</Button>
			)}
			renderContent={() => (
				<div className="vpf-component-color-picker">
					{gradient ? (
						<TabPanel
							tabs={[
								{
									name: 'solid',
									title: 'Solid',
								},
								{
									name: 'gradient',
									title: 'Gradient',
								},
							]}
							initialTabName={isGradient ? 'gradient' : 'solid'}
						>
							{(tab) => {
								return tabs[tab.name];
							}}
						</TabPanel>
					) : (
						tabs.solid
					)}
					{afterDropdownContent || ''}
				</div>
			)}
		/>
	);
}
