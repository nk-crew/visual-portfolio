import classnames from 'classnames/dedupe';

import { BaseControl, TextControl } from '@wordpress/components';
import { useSelect } from '@wordpress/data';
import { addFilter } from '@wordpress/hooks';

import getControlNameClassName from '../../../utils/get-control-name-class-name';
import {
	getAltPlaceholder,
	getItemAltValue,
	hasItemAltOverride,
} from '../utils/image-alt';

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
		[ img.id ]
	);

	const value = hasItemAltOverride( img ) ? getItemAltValue( img ) : '';
	const placeholder = getAltPlaceholder( imgData );

	return (
		<BaseControl
			id={ `vpf-control-group-${ fullName }` }
			label={ data.label }
			help={ data.description || null }
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
				placeholder={ placeholder }
				onChange={ ( val ) => {
					onChange( {
						alt: val,
					} );
				} }
				__next40pxDefaultSize
				__nextHasNoMarginBottom
			/>
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
