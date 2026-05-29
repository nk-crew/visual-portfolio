import classnames from 'classnames/dedupe';

import { BaseControl, TextControl } from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { useEffect } from '@wordpress/element';
import { addFilter } from '@wordpress/hooks';
import { __ } from '@wordpress/i18n';

import getControlNameClassName from '../../../utils/get-control-name-class-name';

function hasOwnAltValue( img ) {
	return Object.prototype.hasOwnProperty.call( img || {}, 'alt' );
}

function RenderImageAltControl( props ) {
	const { data, img, onChange, index, fullName, className } = props;

	const { imgData } = useSelect(
		( select ) => {
			const { getEntityRecord } = select( 'core' );

			return {
				imgData: img.id
					? getEntityRecord( 'postType', 'attachment', img.id )
					: null,
			};
		},
		[ img ]
	);

	const value = hasOwnAltValue( img ) ? img.alt : imgData?.alt_text || '';
	const help = hasOwnAltValue( img )
		? data.description
		: __(
				'Initial value is loaded from Media Library. Changes affect only this gallery item.',
				'visual-portfolio'
		  );

	useEffect( () => {
		if ( ! hasOwnAltValue( img ) && imgData?.alt_text ) {
			onChange( {
				alt: imgData.alt_text,
			} );
		}
	}, [ img, imgData?.alt_text, onChange ] );

	return (
		<BaseControl
			id={ `vpf-control-group-${ fullName }` }
			label={ data.label }
			className={ classnames(
				'vpf-control-wrap',
				'vpf-control-wrap-text',
				getControlNameClassName( fullName ),
				className
			) }
			__nextHasNoMarginBottom
		>
			<TextControl
				key={ `${
					img.id || img.imgThumbnailUrl || img.imgUrl
				}-${ index }-alt` }
				value={ value }
				onChange={ ( val ) => {
					onChange( {
						alt: val,
					} );
				} }
				__next40pxDefaultSize
				__nextHasNoMarginBottom
			/>
			<p className="components-base-control__help">{ help }</p>
		</BaseControl>
	);
}

addFilter(
	'vpf.editor.gallery-controls-render',
	'vpf/editor/gallery-controls-render/image-alt',
	( control, data, props, controlData ) => {
		const { img, onChange } = props;
		const { name, index, fullName } = controlData;

		if ( 'alt' === name ) {
			control = (
				<RenderImageAltControl
					{ ...{
						data,
						img,
						onChange,
						index,
						fullName,
						className: control?.props?.className,
					} }
				/>
			);
		}

		return control;
	}
);