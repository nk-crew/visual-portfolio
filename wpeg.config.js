/* eslint-disable import/no-extraneous-dependencies */
const path = require( 'path' );

const pkg = require( 'json-file' ).read( './package.json' ).data;

const cfg = {};

// Build Paths.
cfg.name = 'visual-portfolio';
cfg.src = './src';
cfg.dist_root = './dist';
cfg.dist = '{dist_root}/{name}';

// Browser sync.
cfg.browser_sync = {
    proxy: '{name}.local',
    host: '{name}.local',
    open: 'external',
    ghostMode: false,
};

// Template variables that will be automatically replaced.
cfg.template_files_src = '{src}/**/*.{md,php,js,css}';
cfg.template_files_variables = {
    text_domain: pkg.name,
    plugin_version: pkg.version,
    plugin_name: pkg.name,
    plugin_title: pkg.title,
    plugin_author: pkg.author,
};

// Copy files.
cfg.copy_files_src = [
    '{src}/**/*',
    '!{src}/**/*.{js,jsx,scss}',
    '{src}/**/vendor/**/*.{js,jsx,scss}',
    './node_modules/@fancyapps/*fancybox/dist/jquery.fancybox.min.js',
    './node_modules/@fancyapps/*fancybox/dist/jquery.fancybox.min.css',
    './node_modules/*flickr-justified-gallery/dist/fjGallery.min.js',
    './node_modules/*flickr-justified-gallery/dist/fjGallery.min.js.map',
    './node_modules/*flickr-justified-gallery/dist/fjGallery.css',
    './node_modules/*ie11-custom-properties/ie11CustomProperties.js',
    './node_modules/*isotope-layout/dist/isotope.pkgd.min.js',
    './node_modules/*lazysizes/lazysizes.min.js',
    './node_modules/*object-fit-images/dist/ofi.min.js',
    './node_modules/*photoswipe/dist/photoswipe.min.js',
    './node_modules/*photoswipe/dist/photoswipe-ui-default.min.js',
    './node_modules/*photoswipe/dist/photoswipe.css',
    './node_modules/*photoswipe/dist/default-skin/default-skin.css',
    './node_modules/*photoswipe/dist/default-skin/default-skin.png',
    './node_modules/*photoswipe/dist/default-skin/default-skin.svg',
    './node_modules/*photoswipe/dist/default-skin/preloader.gif',
    './node_modules/*simplebar/dist/simplebar.min.js',
    './node_modules/*simplebar/dist/simplebar.min.css',
    './node_modules/*swiper/swiper-bundle.js',
    './node_modules/*swiper/swiper-bundle.js.map',
    './node_modules/*swiper/swiper-bundle.min.css',
];

cfg.copy_files_dist = ( file ) => {
    let destPath = `${ cfg.dist_root }/${ cfg.name }`;
    const filePath = path.relative( process.cwd(), file.path );

    if ( filePath && /^node_modules/g.test( filePath ) ) {
        destPath += '/assets/vendor';
    }

    return destPath;
};

// Compile SCSS files.
cfg.compile_scss_files_src = [
    '{src}/*assets/**/*.scss',
    '{src}/*gutenberg/*.scss',
    '{src}/*templates/**/*.scss',
    '!{src}/**/vendor/**/*',
];
cfg.compile_scss_files_rtl = true;

// Compile JS files.
cfg.compile_js_files_src = [
    '{src}/*assets/**/*.js',
    '{src}/*gutenberg/*.js',
    '!{src}/**/vendor/**/*',
];

// Correct line endings files.
cfg.correct_line_endings_files_src = '{dist}/**/*.{js,css}';

// Translate PHP files.
cfg.translate_php_files_src = '{dist}/**/*.php';
cfg.translate_php_files_dist = `{dist}/languages/${ cfg.template_files_variables.plugin_name }.pot`;
cfg.translate_php_options = {
    domain: cfg.template_files_variables.text_domain,
    package: cfg.template_files_variables.plugin_title,
    lastTranslator: cfg.template_files_variables.plugin_author,
    team: cfg.template_files_variables.plugin_author,
};

// ZIP files.
cfg.zip_files = [
    {
        src: '{dist}/**/*',
        src_opts: {
            base: '{dist_root}',
        },
        dist: '{dist_root}/{name}.zip',
    },
];

// Watch files.
cfg.watch_files = [
    '{src}/**/*',
    '!{src}/**/*.{jsx,js,scss}',
];

cfg.watch_js_files = [
    '{src}/**/*.js',
    '{src}/gutenberg/**/*',
    '!{src}/gutenberg/**/*.scss',
    '!{src}/*vendor/**/*',
];

cfg.watch_scss_files = '{src}/**/*.scss';

module.exports = cfg;
