const micromatch = require( 'micromatch' );

function excludeVendor( lint ) {
    return ( filenames ) => {
        return `${ lint } ${ micromatch( filenames, [ '!src/**/vendor/**/*', '!src/**/vendors/**/*' ] ).join( ' ' ) }`;
    };
}

module.exports = {
    'src/**/*.php': excludeVendor( 'composer run-script phpcs' ),
    'src/**/*.css': excludeVendor( 'stylelint' ),
    'src/**/*.scss': excludeVendor( 'stylelint --syntax scss' ),
    'src/**/*.{js,jsx}': excludeVendor( 'eslint' ),
};
