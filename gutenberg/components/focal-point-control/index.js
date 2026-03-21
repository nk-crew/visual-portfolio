import './style.scss';

import classnames from 'classnames/dedupe';

import {
	__experimentalUnitControl,
	Button,
	PanelRow,
	UnitControl as __stableUnitControl,
} from '@wordpress/components';
import { useState } from '@wordpress/element';
import { __ } from '@wordpress/i18n';

const UnitControl = __stableUnitControl || __experimentalUnitControl;

function maybeParseNumber( value ) {
	const parsedValue = parseFloat( value );

	return Number.isNaN( parsedValue ) ? null : parsedValue;
}

export function normalizeFocalPointValue( value ) {
	if ( ! value ) {
		return {
			x: 0.5,
			y: 0.5,
		};
	}

	const x = maybeParseNumber( value.x );
	const y = maybeParseNumber( value.y );

	if ( null === x || null === y ) {
		return {
			x: 0.5,
			y: 0.5,
		};
	}

	return {
		x,
		y,
	};
}

export function hasCustomFocalPointValue( value ) {
	const normalizedValue = normalizeFocalPointValue( value );

	return normalizedValue.x !== 0.5 || normalizedValue.y !== 0.5;
}

function getUpdatedAxisValue( focalPoint, axis, nextValue ) {
	const parsedValue = maybeParseNumber( nextValue );

	return {
		...focalPoint,
		[ axis ]: null === parsedValue ? 0.5 : parsedValue / 100,
	};
}

/**
 * Reusable focal point control used across Free and Pro editor UIs.
 *
 * @param {Object} props Component props.
 * @return {JSX.Element} Component output.
 */
export default function FocalPointControl( props ) {
	const {
		value,
		onChange,
		description,
		label = __( 'Image focal point', 'visual-portfolio' ),
		collapsible = true,
		defaultExpanded,
		className = '',
	} = props;
	const focalPoint = normalizeFocalPointValue( value );
	const initialIsOpen =
		typeof defaultExpanded === 'boolean'
			? defaultExpanded
			: hasCustomFocalPointValue( value );
	const [ isOpen, setIsOpen ] = useState( initialIsOpen );

	const content = (
		<>
			{ description ? (
				<PanelRow>
					<p className="description">{ description }</p>
				</PanelRow>
			) : null }

			<PanelRow>
				<UnitControl
					label={ __( 'Left', 'visual-portfolio' ) }
					value={ `${ 100 * focalPoint.x }%` }
					onChange={ ( nextValue ) => {
						onChange(
							getUpdatedAxisValue(
								focalPoint,
								'x',
								nextValue
							)
						);
					} }
					min={ 0 }
					max={ 100 }
					step={ 1 }
					units={ [ { value: '%', label: '%' } ] }
					__next40pxDefaultSize
					__nextHasNoMarginBottom
				/>
				<UnitControl
					label={ __( 'Top', 'visual-portfolio' ) }
					value={ `${ 100 * focalPoint.y }%` }
					onChange={ ( nextValue ) => {
						onChange(
							getUpdatedAxisValue(
								focalPoint,
								'y',
								nextValue
							)
						);
					} }
					min={ 0 }
					max={ 100 }
					step={ 1 }
					units={ [ { value: '%', label: '%' } ] }
					__next40pxDefaultSize
					__nextHasNoMarginBottom
				/>
			</PanelRow>
		</>
	);

	if ( ! collapsible ) {
		return (
			<div
				className={ classnames(
					'vpf-component-focal-point-control',
					className
				) }
			>
				{ content }
			</div>
		);
	}

	return (
		<div
			className={ classnames(
				'vpf-component-focal-point-control',
				className
			) }
		>
			<Button
				className="vpf-component-focal-point-control__toggle"
				onClick={ () => setIsOpen( ! isOpen ) }
				aria-expanded={ isOpen }
			>
				<span>{ label }</span>
				<svg
					viewBox="0 0 24 24"
					xmlns="http://www.w3.org/2000/svg"
					width="24"
					height="24"
					className="components-panel__arrow"
					aria-hidden="true"
					focusable="false"
				>
					<path d="M17.5 11.6L12 16l-5.5-4.4.9-1.2L12 14l4.5-3.6 1 1.2z" />
				</svg>
			</Button>
			{ isOpen ? (
				<div className="vpf-component-focal-point-control__content">
					{ content }
				</div>
			) : null }
		</div>
	);
}
