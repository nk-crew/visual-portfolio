/**
 * Babel Configuration for WordPress JSX Runtime Backward Compatibility
 *
 * WORDPRESS BACKWARD COMPATIBILITY SUPPORT (6.2 - 6.5)
 *
 * This babel configuration addresses JSX runtime compatibility issues across WordPress versions:
 *
 * PROBLEM:
 * - WordPress 6.6+ includes react-jsx-runtime in core (/wp-includes/js/dist/react-jsx-runtime.min.js)
 * - WordPress 6.2-6.5 support modern JSX but lack the react-jsx-runtime file
 * - Modern webpack builds with @wordpress/scripts automatically add 'react-jsx-runtime' to dependencies
 * - This causes script loading errors on WordPress < 6.6 due to missing react-jsx-runtime.js
 *
 * SOLUTION:
 * - Configure babel to handle JSX transformation appropriately for older WordPress versions
 * - Provides compatibility layer without requiring webpack polyfill complexity
 * - Ensures modern JSX code works across WordPress 6.2+ installations
 *
 * SUPPORTED VERSIONS:
 * - WordPress 6.6+: Uses core JSX runtime (automatic)
 * - WordPress 6.2-6.5: Uses this babel configuration for compatibility
 * - WordPress < 6.2: Legacy JSX transform (not supported)
 */
module.exports = {
	presets: ['@babel/preset-env'],
	plugins: [
		[
			'@babel/plugin-transform-react-jsx',
			{
				pragma: 'wp.element.createElement',
				pragmaFrag: 'wp.element.Fragment',
			},
		],
		['@babel/plugin-proposal-object-rest-spread'],
	],
};
