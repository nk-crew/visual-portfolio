const EMPTY_ALT_PLACEHOLDER = '-';

export function hasItemAltOverride( img ) {
	return (
		Object.prototype.hasOwnProperty.call( img || {}, 'alt' ) &&
		'' !== String( img.alt || '' ).trim()
	);
}

export function getItemAltValue( img ) {
	return hasItemAltOverride( img ) ? String( img.alt ).trim() : '';
}

export function getAttachmentAltText( imgData ) {
	return imgData?.alt_text || '';
}

export function getEffectiveAltText( img, imgData ) {
	return getItemAltValue( img ) || getAttachmentAltText( imgData );
}

export function getAltPlaceholder( imgData ) {
	return getAttachmentAltText( imgData ) || EMPTY_ALT_PLACEHOLDER;
}
