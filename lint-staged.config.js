// eslint-disable-next-line import/no-extraneous-dependencies
const micromatch = require( 'micromatch' );

function excludeVendor( lint ) {
	return ( filenames ) => {
		const files = micromatch( filenames, [
			'!**/.*',
			'!**/vendor/**/*',
			'!**/build/**/*',
			'!**/dist/**/*',
      '!**/templates/**/*',
		] );

		if ( files && files.length ) {
			return `${ lint } ${ files.join( ' ' ) }`;
		}

		return [];
	};
}

module.exports = {
	'src/**/*.php': excludeVendor( 'composer run-script lint' ),
	'src/**/*.{css,scss}': excludeVendor( 'wp-scripts lint-style' ),
	'src/**/*.{js,jsx}': excludeVendor( 'wp-scripts lint-js' ),
};
