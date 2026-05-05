import './style.scss';

import {
	__experimentalToggleGroupControl,
	__experimentalToggleGroupControlOption,
	ToggleGroupControl as __stableToggleGroupControl,
	ToggleGroupControlOption as __stableToggleGroupControlOption,
} from '@wordpress/components';
import { Fragment, useState } from '@wordpress/element';

const ToggleGroupControl =
	__stableToggleGroupControl || __experimentalToggleGroupControl;
const ToggleGroupControlOption =
	__stableToggleGroupControlOption || __experimentalToggleGroupControlOption;

/**
 * Normalize options prop: object { value: label } or array of { value, label }.
 *
 * @param {Object|Array<{value: *, label: string}>} options Options source.
 * @return {Array<{value: string, label: string}>} Pairs with string values for ToggleGroupControl.
 */
function normalizeToggleGroupButtonOptions( options ) {
	if ( ! options ) {
		return [];
	}
	if ( Array.isArray( options ) ) {
		return options.map( ( item ) => ( {
			value: String( item.value ),
			label: item.label,
		} ) );
	}
	return Object.keys( options ).map( ( key ) => ( {
		value: String( key ),
		label: options[ key ],
	} ) );
}

/**
 * Segmented control for a small set of exclusive choices (replaces legacy Button rows).
 *
 * @param {Object}       props                     Component props.
 * @param {*}            props.value               Selected value (compared as string).
 * @param {Function}     props.onChange            Called with the selected option value as string.
 * @param {Object|Array} props.options             Object map or array of { value, label }.
 * @param {string}       props.label               Accessible label for the control.
 * @param {boolean}      props.hideLabelFromVision When true, label is visually hidden.
 * @param {string}       props.className           Extra class on the wrapper.
 * @return {JSX.Element} Toggle group field.
 */
export function ToggleGroupButtonsControl( props ) {
	const {
		value,
		onChange,
		options,
		label,
		hideLabelFromVision = false,
		className = '',
		isBlock = true,
		...restProps
	} = props;

	const pairs = normalizeToggleGroupButtonOptions( options );

	return (
		<div
			className={ `vpf-component-toggle-group-buttons ${ className }`.trim() }
		>
			<ToggleGroupControl
				label={ label }
				hideLabelFromVision={ hideLabelFromVision }
				value={ value === undefined || value === null ? '' : String( value ) }
				onChange={ onChange }
				isBlock={ isBlock }
				__next40pxDefaultSize
				__nextHasNoMarginBottom
				{ ...restProps }
			>
				{ pairs.map( ( { value: optionValue, label: optionLabel } ) => (
					<ToggleGroupControlOption
						key={ optionValue }
						value={ optionValue }
						label={ optionLabel }
					/>
				) ) }
			</ToggleGroupControl>
		</div>
	);
}

/**
 * Component Class
 *
 * @param props
 */
export default function ToggleGroupCustomControl( props ) {
	const { children, options } = props;

	const [ collapsed, setCollapsed ] = useState( options[ 0 ].category );

	return (
		<div className="vpf-component-toggle-group-control">
			<ToggleGroupControl
				className="vpf-component-toggle-group-control-toggle"
				value={ collapsed }
				onChange={ ( val ) => {
					setCollapsed( val );
				} }
				isBlock
				__next40pxDefaultSize
				__nextHasNoMarginBottom
			>
				{ options.map( ( option ) => {
					return (
						<ToggleGroupControlOption
							key={ option.category }
							value={ option.category }
							label={ option.title }
						/>
					);
				} ) }
			</ToggleGroupControl>

			{ options.map( ( option ) => {
				if ( collapsed === option.category ) {
					return (
						<Fragment key={ option.category }>
							{ children( option ) }
						</Fragment>
					);
				}

				return null;
			} ) }
		</div>
	);
}
