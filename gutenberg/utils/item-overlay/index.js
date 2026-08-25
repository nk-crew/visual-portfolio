/**
 * WordPress dependencies
 */
import {
	RangeControl,
	__experimentalToolsPanelItem as ToolsPanelItem,
} from '@wordpress/components';
/**
 * External dependencies
 */
import classnames from 'classnames/dedupe';

/**
 * The attributes one overlay is stored under.
 *
 * An item block paints one overlay on its picture; a cover paints a second one
 * for its hover state. Both are the same overlay under different names, so the
 * names are what the helpers below are parameterised by.
 */
export const OVERLAY_ATTRIBUTES = {
	color: 'overlayColor',
	customColor: 'customOverlayColor',
	gradient: 'gradient',
	customGradient: 'customGradient',
	dimRatio: 'dimRatio',
};

export const HOVER_OVERLAY_ATTRIBUTES = {
	color: 'hoverOverlayColor',
	customColor: 'customHoverOverlayColor',
	gradient: 'hoverGradient',
	customGradient: 'customHoverGradient',
	dimRatio: 'hoverDimRatio',
};

/**
 * One overlay, read off the block attributes.
 *
 * The shape the render callback normalises to as well, so the two sides of the
 * editor boundary describe an overlay the same way.
 *
 * @param {Object} attributes - block attributes.
 * @param {Object} names      - attribute names of this overlay.
 * @return {Object} overlay values.
 */
export function getOverlayValues(attributes, names) {
	return {
		color: attributes[names.color],
		customColor: attributes[names.customColor],
		gradient: attributes[names.gradient],
		customGradient: attributes[names.customGradient],
		dimRatio: attributes[names.dimRatio],
	};
}

/**
 * Whether an overlay has anything to paint.
 *
 * @param {Object} overlay - overlay values.
 * @return {boolean} True when it is drawn.
 */
export function hasOverlay(overlay) {
	return (
		!!overlay.dimRatio &&
		!!(
			overlay.color ||
			overlay.customColor ||
			overlay.gradient ||
			overlay.customGradient
		)
	);
}

/**
 * One overlay above the picture.
 *
 * The class names are the ones core uses for the same job, so a theme that
 * styles cover overlays styles these too. The hover overlay carries its opacity
 * as a custom property instead: it is the value the stylesheet animates to, and
 * a class cannot be read back at hover time.
 *
 * @param {Object}  props           - component props.
 * @param {string}  props.className - overlay class of the block that owns it.
 * @param {Object}  props.overlay   - overlay values.
 * @param {boolean} props.isHover   - whether this is the overlay of the hover state.
 * @return {Element} component.
 */
export function ItemOverlay({ className, overlay, isHover = false }) {
	const styles = {};

	if (overlay.gradient || overlay.customGradient) {
		styles.background = overlay.gradient
			? `var(--wp--preset--gradient--${overlay.gradient})`
			: overlay.customGradient;
	} else if (overlay.color || overlay.customColor) {
		styles.backgroundColor = overlay.color
			? `var(--wp--preset--color--${overlay.color})`
			: overlay.customColor;
	}

	if (isHover) {
		styles['--vp-hover-overlay-opacity'] = overlay.dimRatio / 100;
	}

	return (
		<span
			className={classnames(className, {
				[`${className}--hover`]: isHover,
				'has-background-dim': !isHover,
				[`has-background-dim-${overlay.dimRatio}`]: !isHover,
				'has-background-gradient':
					overlay.gradient || overlay.customGradient,
			})}
			style={styles}
			aria-hidden="true"
		/>
	);
}

/**
 * One entry of the overlay colour dropdown.
 *
 * A colour of the palette is stored as its slug and anything else as the value
 * itself, which is how core stores the background of its own Cover block.
 *
 * @param {Object}   props                       - settings props.
 * @param {string}   props.label                 - label of the entry.
 * @param {Object}   props.attributes            - block attributes.
 * @param {Object}   props.names                 - attribute names of this overlay.
 * @param {Function} props.setAttributes         - attribute setter of the block.
 * @param {Object}   props.colorGradientSettings - palettes of the theme.
 * @return {Object} `ColorGradientSettingsDropdown` setting.
 */
export function getOverlaySetting({
	label,
	attributes,
	names,
	setAttributes,
	colorGradientSettings,
}) {
	const overlay = getOverlayValues(attributes, names);

	return {
		label,
		colorValue: overlay.color
			? `var(--wp--preset--color--${overlay.color})`
			: overlay.customColor,
		gradientValue: overlay.gradient
			? `var(--wp--preset--gradient--${overlay.gradient})`
			: overlay.customGradient,
		onColorChange: (value) => {
			const slug = colorGradientSettings.colors?.find(
				(color) => color.color === value
			)?.slug;

			setAttributes({
				[names.color]: slug,
				[names.customColor]: slug ? undefined : value,
			});
		},
		onGradientChange: (value) => {
			const slug = colorGradientSettings.gradients?.find(
				(item) => item.gradient === value
			)?.slug;

			setAttributes({
				[names.gradient]: slug,
				[names.customGradient]: slug ? undefined : value,
			});
		},
		resetAllFilter: () => ({
			[names.color]: undefined,
			[names.customColor]: undefined,
			[names.gradient]: undefined,
			[names.customGradient]: undefined,
		}),
		isShownByDefault: true,
	};
}

/**
 * How far an overlay dims the picture.
 *
 * @param {Object}   props               - component props.
 * @param {string}   props.label         - label of the control.
 * @param {Object}   props.attributes    - block attributes.
 * @param {Object}   props.names         - attribute names of this overlay.
 * @param {number}   props.defaultValue  - opacity a reset writes back.
 * @param {Function} props.setAttributes - attribute setter of the block.
 * @param {string}   props.panelId       - `ToolsPanel` id of the block.
 * @return {Element} component.
 */
export function OverlayOpacityItem({
	label,
	attributes,
	names,
	defaultValue,
	setAttributes,
	panelId,
}) {
	const value = attributes[names.dimRatio];

	return (
		<ToolsPanelItem
			label={label}
			isShownByDefault
			hasValue={() => value !== defaultValue}
			onDeselect={() => setAttributes({ [names.dimRatio]: defaultValue })}
			resetAllFilter={() => ({ [names.dimRatio]: defaultValue })}
			panelId={panelId}
		>
			<RangeControl
				label={label}
				value={value}
				onChange={(next) => setAttributes({ [names.dimRatio]: next })}
				min={0}
				max={100}
				step={10}
			/>
		</ToolsPanelItem>
	);
}
