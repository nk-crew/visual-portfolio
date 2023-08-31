/**
 * External Dependencies
 */
const { basename, dirname, resolve } = require('path');

const glob = require('glob');
const defaultConfig = require('@wordpress/scripts/config/webpack.config');
const RemoveEmptyScriptsPlugin = require('webpack-remove-empty-scripts');
const RtlCssPlugin = require('rtlcss-webpack-plugin');
const isProduction = process.env.NODE_ENV === 'production';

// Prepare JS for assets.
const entryAssetsJs = glob
	.sync('./src/assets/js/**.js')
	.reduce(function (entries, entry) {
		const matchForRename = /js\/([\w\d-]+).js$/g.exec(entry);
		if (
			matchForRename !== null &&
			typeof matchForRename[1] !== 'undefined'
		) {
			entries[`asset-${matchForRename[1]}-script`] = resolve(
				process.cwd(),
				entry
			);
		}

		return entries;
	}, {});

const entryAssetsAdminJs = glob
.sync('./src/assets/admin/js/**.js')
.reduce(function (entries, entry) {
  const matchForRename = /js\/([\w\d-]+).js$/g.exec(entry);
  if (
    matchForRename !== null &&
    typeof matchForRename[1] !== 'undefined'
  ) {
    entries[`asset-admin-${matchForRename[1]}`] = resolve(
      process.cwd(),
      entry
    );
  }

  return entries;
}, {});
const rootDir = './src';

const vendorFiles = [
  './src/assets/vendor/**/*.js',
  //'./src/assets/vendor/**/*.js.map',
  './node_modules/@fancyapps/*fancybox/dist/jquery.fancybox.min.js',
  './node_modules/@fancyapps/*fancybox/dist/jquery.fancybox.min.css',
  './node_modules/*flickr-justified-gallery/dist/fjGallery.min.js',
  //'./node_modules/*flickr-justified-gallery/dist/fjGallery.min.js.map',
  './node_modules/*flickr-justified-gallery/dist/fjGallery.css',
  './node_modules/*iframe-resizer/js/iframeResizer.contentWindow.min.js',
  //'./node_modules/*iframe-resizer/js/iframeResizer.contentWindow.map',
  './node_modules/*iframe-resizer/js/iframeResizer.min.js',
  //'./node_modules/*iframe-resizer/js/iframeResizer.map',
  './node_modules/*isotope-layout/dist/isotope.pkgd.min.js',
  './node_modules/*lazysizes/lazysizes.min.js',
  './node_modules/*photoswipe/dist/photoswipe.min.js',
  './node_modules/*photoswipe/dist/photoswipe-ui-default.min.js',
  './node_modules/*photoswipe/dist/photoswipe.css',
  './node_modules/*photoswipe/dist/default-skin/default-skin.css',
  './node_modules/*photoswipe/dist/default-skin/default-skin.png',
  //'./node_modules/*photoswipe/dist/default-skin/default-skin.svg',
  './node_modules/*photoswipe/dist/default-skin/preloader.gif',
  './node_modules/*simplebar/dist/simplebar.min.js',
  './node_modules/*simplebar/dist/simplebar.min.css',
  './node_modules/*swiper/swiper-bundle.min.js',
  //'./node_modules/*swiper/swiper-bundle.min.js.map',
  './node_modules/*swiper/swiper-bundle.min.css',
];

const entryAssetsVendors = glob
.sync(vendorFiles)
.reduce(function (entries, entry) {
  const patternEnd = ['.min.js.map', '.pkgd.min.js', '.min.js', '.js.map','.min.css', '.map', '.js', '.css', '.png', '.svg', '.gif'];
  for (const item of patternEnd) {
    const matchForRename = new RegExp(`([\\w\\d-]+)${item}$`, 'g').exec(entry);
    if (
      matchForRename !== null &&
      typeof matchForRename[1] !== 'undefined'
    ) {
      let endingName = item === '.min.js' || item === '.js' || '.pkgd.min.js' ? '-script' : '';
      endingName = item === '.min.css' || item === '.css' ? '-style' : endingName;
      entries[`asset-vendor-${matchForRename[1]}${endingName}`] = resolve(
        process.cwd(),
        entry
      );
      break;
    }
  }

  return entries;
}, {});

const entryAssetsCss = glob
.sync('./src/assets/css/**.scss')
.reduce(function (entries, entry) {
  const matchForRename = /css\/([\w\d-]+).scss$/g.exec(entry);
  if (
    matchForRename !== null &&
    typeof matchForRename[1] !== 'undefined'
  ) {
    entries[`asset-${matchForRename[1]}`] = resolve(
      process.cwd(),
      entry
    );
  }

  return entries;
}, {});

const entryTemplatesCss = glob
.sync(
  [
    './src/templates/**/style.scss',
    './src/templates/**/**/style.scss',
    './src/templates/**/**/**/style.scss',
    './src/templates/**/index.scss',
    './src/templates/**/**/index.scss',
    './src/templates/**/**/**/index.scss',
  ]
)
.reduce(function (entries, entry) {
  const template = entry.replace('src/', '').replace('.scss', '');
  entries[template] = resolve(
    process.cwd(),
    entry
  );
  return entries;
}, {});

const newConfig = {
  ...defaultConfig,
  ...
  {
    entry: {
      // JS.
      'gutenberg-index': resolve(process.cwd(), 'src/gutenberg', 'index.js'),
      'custom-post-meta': resolve(process.cwd(), 'src/gutenberg', 'custom-post-meta.js'),
      'layouts-editor-script': resolve(process.cwd(), 'src/gutenberg', 'layouts-editor.js'),
      // Assets JS.
      ...entryAssetsJs,
      // Assets Admin JS.
      ...entryAssetsAdminJs,
      // Assets Vendors.
      ...entryAssetsVendors,
      'asset-plugin-jetpack': resolve(process.cwd(), 'src/assets/js/3rd', 'plugin-jetpack.js'),
      // SCSS.
      'gutenberg': resolve(process.cwd(), 'src/gutenberg', 'style.scss'),
      'layouts-editor-style': resolve(process.cwd(), 'src/gutenberg', 'layouts-editor.scss'),
      // Assets.
      ...entryAssetsCss,
      // Templates.
      ...entryTemplatesCss,
      // Admin Assets.
      'asset-admin-elementor': resolve(process.cwd(), 'src/assets/admin/css', 'elementor.scss'),
      'asset-admin': resolve(process.cwd(), 'src/assets/admin/css', 'style.scss'),
    },

    // Display minimum info in terminal.
    stats: 'minimal',
  },
  plugins: [
    ...defaultConfig.plugins,
    new RtlCssPlugin({
      filename: `[name]-rtl.css`,
    }),
  ],
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
					name( _, chunks, cacheGroupKey ) {
						const chunkName = chunks[ 0 ].name;
            let cssOutput = `${ dirname(
							chunkName
						) }/${ cacheGroupKey }-${ basename( chunkName ) }`;

            if ( chunkName.indexOf('templates/') > -1 && cacheGroupKey === 'style') {
              cssOutput = `${ dirname(
                chunkName
              ) }/${ basename( chunkName ) }`;
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

module.exports = newConfig;
