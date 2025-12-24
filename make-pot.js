/**
 * Build Jed-compatible JSON from a `.pot` file.
 *
 * Why this exists:
 * - The plugin ships/uses `languages/visual-portfolio.json` (Jed locale data) for Gutenberg/JS i18n.
 * - `npm run build:prod` runs `make-pot` (generate `.pot`) and then `make-json` (convert `.pot` -> Jed JSON).
 *
 * Why we replaced `po2json` with this script:
 * - `po2json` pulled in vulnerable/legacy transitive dependencies (surfaced by `npm audit`).
 * - This script keeps the same output format needed by WordPress/Jed while using a smaller, maintained parser
 *   (`gettext-parser`) and avoiding that vulnerable dependency chain.
 */

const fs = require( 'fs' );
const gettextParser = require( 'gettext-parser' );

function getArgValue( args, name ) {
	const prefix = `--${ name }=`;
	const found = args.find( ( a ) => a.startsWith( prefix ) );
	return found ? found.slice( prefix.length ) : null;
}

function hasFlag( args, flag ) {
	return args.includes( `--${ flag }` );
}

function buildJedJsonFromPot( potBuffer, domain ) {
	const po = gettextParser.po.parse( potBuffer );
	const usedDomain = domain || po.headers?.domain || 'messages';

	const localeData = {
		[ usedDomain ]: {
			'': {
				domain: usedDomain,
			},
		},
	};

	for ( const [ context, messages ] of Object.entries(
		po.translations || {}
	) ) {
		for ( const [ msgid, message ] of Object.entries( messages || {} ) ) {
			if ( msgid === '' ) {
				continue;
			}

			const key = context ? `${ context }\u0004${ msgid }` : msgid;

			if ( Array.isArray( message.msgstr ) ) {
				localeData[ usedDomain ][ key ] = message.msgstr;
			} else {
				localeData[ usedDomain ][ key ] = [ '' ];
			}
		}
	}

	return {
		domain: usedDomain,
		locale_data: localeData,
	};
}

function main() {
	const args = process.argv.slice( 2 );
	const input = args[ 0 ];
	const output = args[ 1 ];

	if ( ! input || ! output ) {
		process.stderr.write(
			'Usage: node make-pot.js <input.pot> <output.json> --domain=visual-portfolio [--pretty]\n'
		);
		process.exit( 1 );
	}

	const domain = getArgValue( args, 'domain' );
	const pretty = hasFlag( args, 'pretty' );

	const pot = fs.readFileSync( input );
	const result = buildJedJsonFromPot( pot, domain );

	const json = JSON.stringify( result, null, pretty ? 3 : 0 );
	fs.writeFileSync( output, `${ json }\n` );
}

main();
