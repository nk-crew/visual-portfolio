/**
 * External Dependencies
 */
const path = require('path');

const cssnano = require('cssnano');
const glob = require('glob');
const DependencyExtractionWebpackPlugin = require('@wordpress/dependency-extraction-webpack-plugin');
const defaultConfig = require('@wordpress/scripts/config/webpack.config');
const FileManagerPlugin = require('filemanager-webpack-plugin');
const RemoveEmptyScriptsPlugin = require('webpack-remove-empty-scripts');
const RtlCssPlugin = require('rtlcss-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');

const isProduction = process.env.NODE_ENV === 'production';
const isQuietBuild = process.env.VP_QUIET === '1';

// Some hosts run Apache mod_substitute with the default 1MB line limit on
// responses. Minified bundles can exceed that as a single line and break
// the block editor script on those servers.
const MAX_MINIFIED_LINE_LENGTH = 500000;
const GUTENBERG_INDEX_ENTRY = 'gutenberg/index';

const JS_ENTRY_PATTERNS = [
	'./assets/js/**/*.js',
	'./assets/admin/js/**/*.js',
	'./gutenberg/**/view.js',
	'./gutenberg/index.js',
	'./gutenberg/custom-post-meta.js',
	'./gutenberg/layouts-editor.js',
];

// Interactivity API stores are ES modules, and webpack emits one format per
// compilation - these entries build in a second, module-output one.
//
// Listed one by one rather than globbed: `JS_ENTRY_PATTERNS` already sweeps up
// every `view.js` as a classic script, and a block that wants a module has to
// say so here. Miss the line and the file still builds - as a classic script
// `wp_register_script_module()` cannot load.
const JS_MODULE_ENTRY_PATTERNS = [
	'./gutenberg/blocks/loop/view.js',
	'./gutenberg/blocks/item-cover/view.js',
	'./gutenberg/blocks/item-template/view.js',
	'./gutenberg/popup/view.js',
];

const CSS_ENTRY_PATTERNS = [
	'./assets/css/**/*.scss',
	'./assets/admin/css/**/*.scss',
	'./templates/**/style.scss',
	'./gutenberg/blocks/**/style.scss',
	'./gutenberg/blocks/**/editor.scss',
	'./gutenberg/popup/style.scss',
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
	// PhotoSwipe 5 is the lightbox of the Gallery Loop family, and lives beside
	// the 4 above rather than replacing it: that one belongs to the legacy
	// gallery, is loaded as a classic script and is driven by jQuery.
	{
		source: 'node_modules/photoswipe-5/dist/photoswipe.esm.min.js',
		destination: 'assets/vendor/photoswipe-5/photoswipe.esm.min.js',
	},
	{
		source: 'node_modules/photoswipe-5/dist/photoswipe.css',
		destination: 'assets/vendor/photoswipe-5/photoswipe.css',
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

function normalizePath(filePath) {
	return filePath.split(path.win32.sep).join(path.posix.sep);
}

function createEntries(patterns, extension, shouldInclude = () => true) {
	return glob.sync(patterns, { nodir: true }).reduce((entries, entry) => {
		if (!shouldInclude(entry)) {
			return entries;
		}

		const name = entry.slice(0, -extension.length);

		entries[name] = path.resolve(process.cwd(), entry);

		return entries;
	}, {});
}

function shouldIncludeScssEntry(entry) {
	return !path.basename(entry).startsWith('_');
}

function isSvgRule(rule) {
	return rule.test instanceof RegExp && rule.test.test('file.svg');
}

function disableCssLoaderUrls(rules) {
	return rules.map((rule) => {
		if (!Array.isArray(rule.use)) {
			return rule;
		}

		function isCssLoader(loader) {
			return (
				'object' === typeof loader &&
				!!loader.loader &&
				/(^|[\\/])css-loader[\\/]dist[\\/]cjs\.js$/.test(loader.loader)
			);
		}

		const hasCssLoader = rule.use.some((loader) => isCssLoader(loader));

		if (!hasCssLoader) {
			return rule;
		}

		return {
			...rule,
			use: rule.use.map((loader) => {
				if ('string' === typeof loader || !isCssLoader(loader)) {
					return loader;
				}

				return {
					...loader,
					options: {
						...loader.options,
						url: false,
					},
				};
			}),
		};
	});
}

function patchPostCssLoaderOptions(rules) {
	if (!isProduction) {
		return rules;
	}

	// Keep WordPress' default PostCSS pipeline, but replace cssnano with a
	// version that does not run SVGO on inline CSS SVGs. Without this override,
	// production builds rewrite data:image/svg+xml URLs and break icons such as
	// the Visual Portfolio logo in the WordPress admin menu.
	return rules.map((rule) => {
		if (!Array.isArray(rule.use)) {
			return rule;
		}

		return {
			...rule,
			use: rule.use.map((loader) => {
				if (
					'string' === typeof loader ||
					!loader.loader ||
					!loader.loader.includes('postcss-loader') ||
					!loader.options?.postcssOptions
				) {
					return loader;
				}

				const postcssOptions = loader.options.postcssOptions;
				const plugins = Array.isArray(postcssOptions.plugins)
					? postcssOptions.plugins.filter(
							(plugin) =>
								!(
									plugin &&
									'object' === typeof plugin &&
									Array.isArray(plugin.plugins) &&
									plugin.version
								)
						)
					: [];

				return {
					...loader,
					options: {
						...loader.options,
						postcssOptions: {
							...postcssOptions,
							plugins: [
								...plugins,
								cssnano({
									preset: [
										'default',
										{
											discardComments: {
												removeAll: true,
											},
											svgo: false,
										},
									],
								}),
							],
						},
					},
				};
			}),
		};
	});
}

function retargetBabelForModules(rules) {
	// A script module is only ever fetched by a browser that supports
	// `<script type="module">`, and the project Babel config targets far below
	// that. Down there generators become regenerator calls, which the
	// Interactivity API rejects - it dispatches actions by recognising a real
	// `GeneratorFunction`.
	return rules.map((rule) => {
		if (!Array.isArray(rule.use)) {
			return rule;
		}

		return {
			...rule,
			use: rule.use.map((loader) => {
				if (
					'string' === typeof loader ||
					!loader.loader ||
					!loader.loader.includes('babel-loader')
				) {
					return loader;
				}

				return {
					...loader,
					options: {
						...loader.options,
						babelrc: false,
						configFile: false,
						presets: [
							[
								require.resolve('@babel/preset-env'),
								{
									bugfixes: true,
									modules: false,
									targets: { esmodules: true },
								},
							],
						],
					},
				};
			}),
		};
	});
}

function createSvgRules() {
	return [
		{
			test: /\.svg$/,
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
	];
}

function transformDevServerProxy(proxy, fallbackTarget) {
	if (!proxy || Array.isArray(proxy) || 'object' !== typeof proxy) {
		return proxy;
	}

	return Object.entries(proxy).map(([context, options]) => ({
		context: [context],
		target: options.target || options.router || fallbackTarget,
		...options,
	}));
}

function shouldIgnorePerformanceHint(assetFilename) {
	return !assetFilename.startsWith('gutenberg/');
}

function isTemplateStyleChunk(normalizedChunkName, cacheGroupKey) {
	return (
		'style' === cacheGroupKey &&
		(normalizedChunkName.includes('templates/') ||
			normalizedChunkName.includes('admin/css/') ||
			normalizedChunkName.includes('gutenberg/'))
	);
}

function getStyleChunkName(_, chunks, cacheGroupKey) {
	if (!chunks.length) {
		return cacheGroupKey;
	}

	const selectedChunk = chunks[chunks.length > 1 ? 1 : 0];
	const chunkName = selectedChunk.name;

	if (chunks.length > 1) {
		const combinedChunkName = chunks
			.map((chunk) => path.basename(chunk.name))
			.sort()
			.join('-');

		return `${path.dirname(
			chunkName
		)}/${cacheGroupKey}-${combinedChunkName}`;
	}

	if ('style' === cacheGroupKey && chunkName.includes('layouts-editor')) {
		return `${path.dirname(chunkName)}/${cacheGroupKey}-${path.basename(
			chunkName
		)}`;
	}

	const normalizedChunkName = normalizePath(chunkName);

	if (isTemplateStyleChunk(normalizedChunkName, cacheGroupKey)) {
		return `${path.dirname(chunkName)}/${path.basename(chunkName)}`;
	}

	return `${path.dirname(chunkName)}/${cacheGroupKey}-${path.basename(
		chunkName
	)}`;
}

function shouldIgnoreQuietWarning(warning) {
	return QUIET_BUILD_WARNING_PATTERNS.some((pattern) =>
		pattern.test(warning?.message || '')
	);
}

function isGutenbergIndexChunk(chunk) {
	return chunk.name === GUTENBERG_INDEX_ENTRY;
}

function createProductionMinimizers() {
	return [
		new TerserPlugin({
			parallel: true,
			terserOptions: {
				format: {
					comments: /translators:/i,
					max_line_len: MAX_MINIFIED_LINE_LENGTH,
				},
				compress: {
					passes: 2,
				},
				mangle: {
					reserved: ['__', '_n', '_nx', '_x'],
				},
			},
			extractComments: false,
		}),
	];
}

function wrapLongMinifiedLines(source, maxLineLength) {
	return source
		.split('\n')
		.map((line) => {
			if (line.length <= maxLineLength) {
				return line;
			}

			const parts = [];
			let start = 0;

			while (line.length - start > maxLineLength) {
				const windowEnd = start + maxLineLength;
				const lastSemi = line.lastIndexOf(';', windowEnd - 1);

				if (lastSemi >= start) {
					parts.push(line.slice(start, lastSemi + 1));
					start = lastSemi + 1;
					continue;
				}

				// No semicolon in the window: break at the next one, or hard-split.
				const nextSemi = line.indexOf(';', windowEnd);

				if (nextSemi === -1) {
					parts.push(line.slice(start, windowEnd));
					start = windowEnd;
				} else {
					parts.push(line.slice(start, nextSemi + 1));
					start = nextSemi + 1;
				}
			}

			if (start < line.length) {
				parts.push(line.slice(start));
			}

			return parts.join('\n');
		})
		.join('\n');
}

class WrapLongMinifiedLinesPlugin {
	constructor(options = {}) {
		this.maxLineLength = options.maxLineLength || MAX_MINIFIED_LINE_LENGTH;
		this.test = options.test || /\.js$/;
		// Run after file-loader / asset modules have emitted Ace workers.
		this.stageName = options.stageName || 'PROCESS_ASSETS_STAGE_REPORT';
	}

	apply(compiler) {
		compiler.hooks.thisCompilation.tap(
			'WrapLongMinifiedLinesPlugin',
			(compilation) => {
				const stage =
					compilation[this.stageName] ??
					compilation.PROCESS_ASSETS_STAGE_REPORT;

				compilation.hooks.processAssets.tap(
					{
						name: 'WrapLongMinifiedLinesPlugin',
						stage,
					},
					(assets) => {
						const { RawSource } = compiler.webpack.sources;

						Object.keys(assets).forEach((assetName) => {
							if (!this.test.test(assetName)) {
								return;
							}

							const source = assets[assetName]
								.source()
								.toString();
							const hasLongLine = source
								.split('\n')
								.some(
									(line) => line.length > this.maxLineLength
								);

							if (!hasLongLine) {
								return;
							}

							compilation.updateAsset(
								assetName,
								new RawSource(
									wrapLongMinifiedLines(
										source,
										this.maxLineLength
									)
								)
							);
						});
					}
				);
			}
		);
	}
}

const entryAssetsJsModule = createEntries(JS_MODULE_ENTRY_PATTERNS, '.js');
const moduleEntryNames = Object.keys(entryAssetsJsModule);

const entryAssetsJs = createEntries(
	JS_ENTRY_PATTERNS,
	'.js',
	(entry) => !moduleEntryNames.includes(entry.slice(0, -'.js'.length))
);
const entryAssetsCss = createEntries(
	CSS_ENTRY_PATTERNS,
	'.scss',
	shouldIncludeScssEntry
);

// Both compilations write into `build/`, so the one that cleans it has to leave
// the other one's output alone - and only that, so a source map left behind by
// a watch build is still swept up.
const moduleOutputFiles = moduleEntryNames.flatMap((name) => [
	`${name}.js`,
	`${name}.asset.php`,
]);

function shouldKeepOnClean(asset) {
	return /^(fonts|images)\//.test(asset) || moduleOutputFiles.includes(asset);
}

const defaultRules = patchPostCssLoaderOptions(
	disableCssLoaderUrls(defaultConfig.module.rules)
)
	.filter((rule) => !isSvgRule(rule))
	.concat(createSvgRules());

const splitChunks = defaultConfig.optimization?.splitChunks || {};
const cacheGroups = splitChunks.cacheGroups || {};

const newConfig = {
	...defaultConfig,
	entry: {
		...entryAssetsJs,
		...entryAssetsCss,
	},
	output: {
		...defaultConfig.output,
		clean: {
			keep: shouldKeepOnClean,
		},
	},
	infrastructureLogging: isQuietBuild
		? {
				...(defaultConfig.infrastructureLogging || {}),
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
		new RtlCssPlugin({
			filename: '[name]-rtl.css',
		}),
		new FileManagerPlugin({
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
		}),
	].filter(Boolean),
	ignoreWarnings: isQuietBuild ? [shouldIgnoreQuietWarning] : undefined,
	watchOptions: {
		ignored: WATCH_IGNORED,
	},
	optimization: {
		...defaultConfig.optimization,
		...(isProduction ? { minimizer: createProductionMinimizers() } : {}),
		splitChunks: {
			...splitChunks,
			cacheGroups: {
				...cacheGroups,
				gutenbergEditorVendor: {
					test: /[\\/]node_modules[\\/](ace-builds|react-ace|gutenberg-react-select-styles)[\\/]/,
					name: 'gutenberg/editor-vendor',
					chunks: isGutenbergIndexChunk,
					enforce: true,
					priority: 20,
				},
				style: {
					type: 'css/mini-extract',
					test(module) {
						const resource = module.nameForCondition?.();

						if (!resource) {
							return false;
						}

						const normalizedResource = normalizePath(resource);

						if (
							normalizedResource.includes(
								'/gutenberg/components/'
							)
						) {
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

if (isProduction) {
	newConfig.plugins = [
		new RemoveEmptyScriptsPlugin(),
		new WrapLongMinifiedLinesPlugin({
			test: /gutenberg\/.*\.js$/,
		}),
		...newConfig.plugins,
	];
}

if (!isProduction) {
	const devServerHost = newConfig.devServer?.host || 'localhost';
	const devServerPort = newConfig.devServer?.port || 8887;
	const devServerProtocol =
		newConfig.devServer?.server === 'https' ? 'https' : 'http';
	const fallbackTarget = `${devServerProtocol}://${devServerHost}:${devServerPort}`;

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

const moduleConfig = {
	...defaultConfig,
	entry: entryAssetsJsModule,
	experiments: {
		...defaultConfig.experiments,
		outputModule: true,
	},
	output: {
		...defaultConfig.output,
		module: true,
		chunkFormat: 'module',
		environment: {
			...defaultConfig.output.environment,
			module: true,
		},
		library: {
			...defaultConfig.output.library,
			type: 'module',
		},
		// The script compilation cleans `build/`, see `shouldKeepOnClean()`.
		clean: false,
	},
	infrastructureLogging: newConfig.infrastructureLogging,
	stats: 'minimal',
	performance: {
		assetFilter: shouldIgnorePerformanceHint,
	},
	module: {
		...defaultConfig.module,
		rules: retargetBabelForModules(defaultRules),
	},
	// A fresh extraction plugin instead of the shared one: it reads the output
	// format from the compiler it is applied to, so the script compilation's
	// instance would externalize `@wordpress/*` as globals instead of imports.
	plugins: [new DependencyExtractionWebpackPlugin()],
	ignoreWarnings: isQuietBuild ? [shouldIgnoreQuietWarning] : undefined,
	watchOptions: {
		ignored: WATCH_IGNORED,
	},
	optimization: {
		...defaultConfig.optimization,
		...(isProduction ? { minimizer: createProductionMinimizers() } : {}),
		// A script module cannot import a shared webpack runtime chunk.
		runtimeChunk: false,
	},
	// Keeps the dev server from injecting its classic client entry and the HMR
	// plugin into a module build; watching and rebuilding still happen.
	devServer: false,
};

module.exports = [newConfig, moduleConfig];
