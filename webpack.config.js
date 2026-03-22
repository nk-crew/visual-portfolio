/**
 * External Dependencies
 */
const path = require( 'path' );

const glob = require( 'glob' );
const defaultConfig = require( '@wordpress/scripts/config/webpack.config' );
const FileManagerPlugin = require( 'filemanager-webpack-plugin' );
const RemoveEmptyScriptsPlugin = require( 'webpack-remove-empty-scripts' );
const RtlCssPlugin = require( 'rtlcss-webpack-plugin' );

const isProduction = process.env.NODE_ENV === 'production';
const isQuietBuild = process.env.VP_QUIET === '1';

const JS_ENTRY_PATTERNS = [
	'./assets/js/**/*.js',
	'./assets/admin/js/**/*.js',
	'./gutenberg/**/view.js',
	'./gutenberg/index.js',
	'./gutenberg/custom-post-meta.js',
	'./gutenberg/layouts-editor.js',
];

const CSS_ENTRY_PATTERNS = [
	'./assets/css/**/*.scss',
	'./assets/admin/css/**/*.scss',
	'./templates/**/style.scss',
	'./gutenberg/blocks/**/style.scss',
	'./gutenberg/blocks/**/editor.scss',
];

const WATCH_IGNORED = [
	'**/templates/**/*.css',
	'**/templates/**/*.css.map',
	'**/templates/**/*.js',
	'**/templates/**/*.js.map',
	'**/templates/**/*.asset.php',
	'**/vendor/**',
];

const QUIET_BUILD_WARNING_PATTERNS = [
	/Deprecation Warning/i,
	/Sass @import rules are deprecated/i,
];

const vendorFiles = [
	{
		source: 'node_modules/@fancyapps/fancybox/dist/jquery.fancybox.min.js',
		destination: 'assets/vendor/fancybox/dist/jquery.fancybox.min.js',
	},
	{
		source: 'node_modules/@fancyapps/fancybox/dist/jquery.fancybox.min.css',
		destination: 'assets/vendor/fancybox/dist/jquery.fancybox.min.css',
	},
	{
		source: 'node_modules/flickr-justified-gallery/dist/fjGallery.min.js',
		destination:
			'assets/vendor/flickr-justified-gallery/dist/fjGallery.min.js',
	},
	{
		source: 'node_modules/flickr-justified-gallery/dist/fjGallery.min.js.map',
		destination:
			'assets/vendor/flickr-justified-gallery/dist/fjGallery.min.js.map',
	},
	{
		source: 'node_modules/flickr-justified-gallery/dist/fjGallery.css',
		destination:
			'assets/vendor/flickr-justified-gallery/dist/fjGallery.css',
	},
	{
		source: 'node_modules/iframe-resizer/js/iframeResizer.contentWindow.min.js',
		destination:
			'assets/vendor/iframe-resizer/js/iframeResizer.contentWindow.min.js',
	},
	{
		source: 'node_modules/iframe-resizer/js/iframeResizer.contentWindow.map',
		destination:
			'assets/vendor/iframe-resizer/js/iframeResizer.contentWindow.map',
	},
	{
		source: 'node_modules/iframe-resizer/js/iframeResizer.min.js',
		destination: 'assets/vendor/iframe-resizer/js/iframeResizer.min.js',
	},
	{
		source: 'node_modules/iframe-resizer/js/iframeResizer.map',
		destination: 'assets/vendor/iframe-resizer/js/iframeResizer.map',
	},
	{
		source: 'node_modules/isotope-layout/dist/isotope.pkgd.min.js',
		destination: 'assets/vendor/isotope-layout/dist/isotope.pkgd.min.js',
	},
	{
		source: 'node_modules/lazysizes/lazysizes.min.js',
		destination: 'assets/vendor/lazysizes/lazysizes.min.js',
	},
	{
		source: 'node_modules/photoswipe/dist/photoswipe.min.js',
		destination: 'assets/vendor/photoswipe/dist/photoswipe.min.js',
	},
	{
		source: 'node_modules/photoswipe/dist/photoswipe-ui-default.min.js',
		destination:
			'assets/vendor/photoswipe/dist/photoswipe-ui-default.min.js',
	},
	{
		source: 'node_modules/photoswipe/dist/photoswipe.css',
		destination: 'assets/vendor/photoswipe/dist/photoswipe.css',
	},
	{
		source: 'node_modules/photoswipe/dist/default-skin/default-skin.css',
		destination:
			'assets/vendor/photoswipe/dist/default-skin/default-skin.css',
	},
	{
		source: 'node_modules/photoswipe/dist/default-skin/default-skin.png',
		destination:
			'assets/vendor/photoswipe/dist/default-skin/default-skin.png',
	},
	{
		source: 'node_modules/photoswipe/dist/default-skin/default-skin.svg',
		destination:
			'assets/vendor/photoswipe/dist/default-skin/default-skin.svg',
	},
	{
		source: 'node_modules/photoswipe/dist/default-skin/preloader.gif',
		destination: 'assets/vendor/photoswipe/dist/default-skin/preloader.gif',
	},
	{
		source: 'node_modules/simplebar/dist/simplebar.min.js',
		destination: 'assets/vendor/simplebar/dist/simplebar.min.js',
	},
	{
		source: 'node_modules/simplebar/dist/simplebar.min.css',
		destination: 'assets/vendor/simplebar/dist/simplebar.min.css',
	},
	{
		source: 'node_modules/swiper/swiper-bundle.min.js',
		destination: 'assets/vendor/swiper/swiper-bundle.min.js',
	},
	{
		source: 'node_modules/swiper/swiper-bundle.min.js.map',
		destination: 'assets/vendor/swiper/swiper-bundle.min.js.map',
	},
	{
		source: 'node_modules/swiper/swiper-bundle.min.css',
		destination: 'assets/vendor/swiper/swiper-bundle.min.css',
	},
	{
		source: 'assets/admin/images',
		destination: 'build/assets/admin/images',
	},
	{
		source: 'assets/images',
		destination: 'build/assets/images',
	},
];

function normalizePath( filePath ) {
	return filePath.split( path.win32.sep ).join( path.posix.sep );
}

function createEntries( patterns, extension, shouldInclude = () => true ) {
	return glob.sync( patterns, { nodir: true } ).reduce( ( entries, entry ) => {
		if ( ! shouldInclude( entry ) ) {
			return entries;
		}

		const name = entry.slice( 0, -extension.length );

		entries[ name ] = path.resolve( process.cwd(), entry );

		return entries;
	}, {} );
}

function shouldIncludeScssEntry( entry ) {
	return ! path.basename( entry ).startsWith( '_' );
}

function isPlainCssRule( rule ) {
	return rule.test instanceof RegExp && rule.test.test( 'file.css' );
}

function isSvgRule( rule ) {
	return rule.test instanceof RegExp && rule.test.test( 'file.svg' );
}

function disableCssLoaderUrls( rules ) {
	return rules.map( ( rule ) => {
		if ( ! isPlainCssRule( rule ) || ! Array.isArray( rule.use ) ) {
			return rule;
		}

		return {
			...rule,
			use: rule.use.map( ( loader ) => {
				if (
					'string' === typeof loader ||
					! loader.loader ||
					! loader.loader.includes( 'css-loader' )
				) {
					return loader;
				}

				return {
					...loader,
					options: {
						...loader.options,
						url: false,
					},
				};
			} ),
		};
	} );
}

function createSvgRules() {
	return [
		{
			test: /\.svg$/,
			issuer: /\.(j|t)sx?$/,
			type: 'javascript/auto',
			use: [
				{
					loader: '@svgr/webpack',
					options: {
						svgoConfig: {
							plugins: [
								{
									name: 'preset-default',
									params: {
										overrides: {
											removeViewBox: false,
										},
									},
								},
							],
						},
					},
				},
				{
					loader: 'url-loader',
				},
			],
		},
		{
			test: /\.svg$/,
			issuer: /\.(pc|sc|sa|c)ss$/,
			type: 'asset/inline',
		},
	];
}

function transformDevServerProxy( proxy, fallbackTarget ) {
	if (
		! proxy ||
		Array.isArray( proxy ) ||
		'object' !== typeof proxy
	) {
		return proxy;
	}

	return Object.entries( proxy ).map( ( [ context, options ] ) => ( {
		context: [ context ],
		target: options.target || options.router || fallbackTarget,
		...options,
	} ) );
}

function shouldIgnorePerformanceHint( assetFilename ) {
	return ! assetFilename.startsWith( 'gutenberg/' );
}

function isTemplateStyleChunk( normalizedChunkName, cacheGroupKey ) {
	return (
		'style' === cacheGroupKey &&
		( normalizedChunkName.includes( 'templates/' ) ||
			normalizedChunkName.includes( 'admin/css/' ) ||
			normalizedChunkName.includes( 'gutenberg/' ) )
	);
}

function getStyleChunkName( _, chunks, cacheGroupKey ) {
	if ( ! chunks.length ) {
		return cacheGroupKey;
	}

	const selectedChunk = chunks[ chunks.length > 1 ? 1 : 0 ];
	const chunkName = selectedChunk.name;

	if ( chunks.length > 1 ) {
		const combinedChunkName = chunks
			.map( ( chunk ) => path.basename( chunk.name ) )
			.sort()
			.join( '-' );

		return `${ path.dirname(
			chunkName
		) }/${ cacheGroupKey }-${ combinedChunkName }`;
	}

	if (
		'style' === cacheGroupKey &&
		chunkName.includes( 'layouts-editor' )
	) {
		return `${ path.dirname( chunkName ) }/${ cacheGroupKey }-${ path.basename(
			chunkName
		) }`;
	}

	const normalizedChunkName = normalizePath( chunkName );

	if ( isTemplateStyleChunk( normalizedChunkName, cacheGroupKey ) ) {
		return `${ path.dirname( chunkName ) }/${ path.basename( chunkName ) }`;
	}

	return `${ path.dirname( chunkName ) }/${ cacheGroupKey }-${ path.basename(
		chunkName
	) }`;
}

function shouldIgnoreQuietWarning( warning ) {
	return QUIET_BUILD_WARNING_PATTERNS.some( ( pattern ) =>
		pattern.test( warning?.message || '' )
	);
}

const entryAssetsJs = createEntries( JS_ENTRY_PATTERNS, '.js' );
const entryAssetsCss = createEntries(
	CSS_ENTRY_PATTERNS,
	'.scss',
	shouldIncludeScssEntry
);

const defaultRules = disableCssLoaderUrls( defaultConfig.module.rules )
	.filter( ( rule ) => ! isSvgRule( rule ) )
	.concat( createSvgRules() );

const splitChunks = defaultConfig.optimization?.splitChunks || {};
const cacheGroups = splitChunks.cacheGroups || {};

const newConfig = {
	...defaultConfig,
	entry: {
		...entryAssetsJs,
		...entryAssetsCss,
	},
	infrastructureLogging: isQuietBuild
		? {
			...( defaultConfig.infrastructureLogging || {} ),
			level: 'error',
		}
		: defaultConfig.infrastructureLogging,
	stats: 'minimal',
	performance: {
		assetFilter: shouldIgnorePerformanceHint,
	},
	module: {
		...defaultConfig.module,
		rules: defaultRules,
	},
	plugins: [
		...defaultConfig.plugins,
		new RtlCssPlugin( {
			filename: '[name]-rtl.css',
		} ),
		new FileManagerPlugin( {
			events: {
				onEnd: {
					copy: [
						{
							source: 'build/templates',
							destination: 'templates',
							options: {
								flat: false,
								preserveTimestamps: true,
								overwrite: true,
								force: true,
							},
						},
						...vendorFiles,
					],
					delete: [
						'build/templates',
						'templates/**/*.css.map',
						'templates/**/*.js',
						'templates/**/*.js.map',
						'templates/**/*.asset.php',
					],
				},
			},
			runOnceInWatchMode: false,
			runTasksInSeries: true,
		} ),
	].filter( Boolean ),
	ignoreWarnings: isQuietBuild ? [ shouldIgnoreQuietWarning ] : undefined,
	watchOptions: {
		ignored: WATCH_IGNORED,
	},
	optimization: {
		...defaultConfig.optimization,
		splitChunks: {
			...splitChunks,
			cacheGroups: {
				...cacheGroups,
				style: {
					type: 'css/mini-extract',
					test( module ) {
						const resource = module.nameForCondition?.();

						if ( ! resource ) {
							return false;
						}

						const normalizedResource = normalizePath( resource );

						if ( normalizedResource.includes( '/gutenberg/components/' ) ) {
							return false;
						}

						return /[\\/]style(\.module)?\.(sc|sa|c)ss$/.test(
							resource
						);
					},
					chunks: 'all',
					enforce: true,
					name: getStyleChunkName,
				},
			},
		},
	},
};

if ( isProduction ) {
	newConfig.plugins = [
		new RemoveEmptyScriptsPlugin(),
		...newConfig.plugins,
	];
}

if ( ! isProduction ) {
	const devServerHost = newConfig.devServer?.host || 'localhost';
	const devServerPort = newConfig.devServer?.port || 8887;
	const devServerProtocol =
		newConfig.devServer?.server === 'https' ? 'https' : 'http';
	const fallbackTarget = `${ devServerProtocol }://${ devServerHost }:${ devServerPort }`;

	newConfig.devServer = {
		...newConfig.devServer,
		allowedHosts: 'all',
		proxy: transformDevServerProxy(
			newConfig.devServer?.proxy,
			fallbackTarget
		),
	};

	// Fix HMR is not working with multiple entries.
	// @thanks https://github.com/webpack/webpack-dev-server/issues/2792#issuecomment-806983882
	newConfig.optimization.runtimeChunk = 'single';
}

module.exports = newConfig;
