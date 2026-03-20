export default function getControlNameClassName( controlName ) {
	if ( ! controlName ) {
		return '';
	}

	const pathParts = controlName
		.toString()
		.split( /[\[\].]+/ )
		.filter( Boolean )
		.filter( ( part ) => ! /^\d+$/.test( part ) );

	return `vpf-control-wrap-name-${ pathParts
		.join( '-' )
		.toLowerCase()
		.replace( /[^a-z0-9_-]+/g, '-' )
		.replace( /-+/g, '-' )
		.replace( /^-|-$/g, '' ) }`;
}
