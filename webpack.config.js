/**
 * External Dependencies
 */
const path = require('path');

const glob = require('glob');
const defaultConfig = require('@wordpress/scripts/config/webpack.config');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const RemoveEmptyScriptsPlugin = require('webpack-remove-empty-scripts');
const RtlCssPlugin = require('rtlcss-webpack-plugin');
const isProduction = process.env.NODE_ENV === 'production';
const FileManagerPlugin = require('filemanager-webpack-plugin');

const { getWordPressSrcDirectory } = require('@wordpress/scripts/utils');

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

defaultConfig.module.rules[2].use[1].options.url = false;

// Prepare JS for assets.
const entryAssetsJs = glob
	.sync([
		'./assets/js/**.js',
		'./assets/admin/js/**.js',
		'./assets/js/3rd/plugin-jetpack.js',
		'./gutenberg/**/view.js',
		'./gutenberg/index.js',
		'./gutenberg/custom-post-meta.js',
		'./gutenberg/layouts-editor.js',
	])
	.reduce(function (entries, entry) {
		const name = entry.replace('.js', '');
		entries[name] = path.resolve(process.cwd(), entry);
		return entries;
	}, {});

// Prepare CSS for assets.
const entryAssetsCss = glob
	.sync([
		'./assets/css/**.scss',
		'./assets/admin/css/**.scss',
		'./templates/**/style.scss',
		'./templates/**/**/style.scss',
		'./templates/**/**/**/style.scss',
		'./gutenberg/blocks/**/style.scss',
		'./gutenberg/blocks/**/editor.scss',
	])
	.filter((entry) => {
		const filename = path.basename(entry);

		// Exclude file names started with _
		return !/^_/.test(filename);
	})
	.reduce(function (entries, entry) {
		const name = entry.replace('.scss', '');

		entries[name] = path.resolve(process.cwd(), entry);

		return entries;
	}, {});

const newConfig = {
	...defaultConfig,
	entry: {
		// Assets JS.
		...entryAssetsJs,
		// Assets CSS.
		...entryAssetsCss,
	},

	// Display minimum info in terminal.
	stats: 'minimal',

	performance: {
		// Disable performance hints in console about too large chunks for Gutenberg assets.
		assetFilter(assetFilename) {
			return !assetFilename.startsWith('gutenberg/');
		},
	},

	module: {
		...defaultConfig.module,
		rules: [...defaultConfig.module.rules],
	},
	plugins: [
		...defaultConfig.plugins,
		new RtlCssPlugin({
			filename: `[name]-rtl.css`,
		}),
		new CopyWebpackPlugin({
			patterns: [
				{
					from: '**/block.json',
					context: getWordPressSrcDirectory(),
					noErrorOnMissing: true,
					transform(content, absoluteFrom) {
						const convertExtension = (p) => {
							return p.replace(/\.(j|t)sx?$/, '.js');
						};

						if (path.basename(absoluteFrom) === 'block.json') {
							const blockJson = JSON.parse(content.toString());
							['viewScript', 'script', 'editorScript'].forEach(
								(key) => {
									if (Array.isArray(blockJson[key])) {
										blockJson[key] =
											blockJson[key].map(
												convertExtension
											);
									} else if (
										typeof blockJson[key] === 'string'
									) {
										blockJson[key] = convertExtension(
											blockJson[key]
										);
									}
								}
							);

							return JSON.stringify(blockJson, null, 2);
						}

						return content;
					},
				},
			],
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
	watchOptions: {
		ignored: [
			'**/templates/**/*.css',
			'**/templates/**/*.css.map',
			'**/templates/**/*.js',
			'**/templates/**/*.js.map',
			'**/templates/**/*.asset.php',
			'**/vendor/**',
		],
	},
	optimization: {
		...defaultConfig.optimization,
		splitChunks: {
			cacheGroups: {
				...defaultConfig.optimization.splitChunks.cacheGroups,
				style: {
					type: 'css/mini-extract',
					test: /[\\/]style(\.module)?\.(sc|sa|c)ss$/,
					chunks: 'all',
					enforce: true,
					name(_, chunks, cacheGroupKey) {
						const chunkName =
							chunks[chunks.length > 1 ? 1 : 0].name;
						let cssOutput = `${path.dirname(
							chunkName
						)}/${cacheGroupKey}-${path.basename(chunkName)}`;
						const foundingChunk = chunkName
							.split(path.win32.sep)
							.join(path.posix.sep);

						if (
							(foundingChunk.indexOf('templates/') > -1 ||
								foundingChunk.indexOf('admin/css/') > -1 ||
								foundingChunk.indexOf('gutenberg/') > -1) &&
							cacheGroupKey === 'style'
						) {
							cssOutput = `${path.dirname(
								chunkName
							)}/${path.basename(chunkName)}`;
						}

						if (
							chunkName.indexOf('layouts-editor') > -1 &&
							cacheGroupKey === 'style'
						) {
							cssOutput = `${path.dirname(
								chunkName
							)}/${cacheGroupKey}-${path.basename(chunkName)}`;
						}
						return cssOutput;
					},
				},
			},
		},
	},
};

// Production only.
if (isProduction) {
	// Remove JS files created for styles
	// to prevent enqueue it on production.
	newConfig.plugins = [new RemoveEmptyScriptsPlugin(), ...newConfig.plugins];
}

// Development only.
if (!isProduction) {
	newConfig.devServer = {
		...newConfig.devServer,
		// Support for dev server on all domains.
		allowedHosts: 'all',
	};

	// Fix HMR is not working with multiple entries.
	// @thanks https://github.com/webpack/webpack-dev-server/issues/2792#issuecomment-806983882
	newConfig.optimization.runtimeChunk = 'single';
}

newConfig.module.rules = newConfig.module.rules.map((rule) => {
	if (/svg/.test(rule.test)) {
		return { ...rule, exclude: /\.svg$/i };
	}

	return rule;
});

newConfig.module.rules.push({
	test: /\.svg$/,
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
});

module.exports = newConfig;
