var gulp      = require('gulp'),
    json      = require('json-file'),
    data      = json.read('./package.json').data,
    rename    = require('gulp-rename'),
    lineec    = require('gulp-line-ending-corrector'),
    autoprefixer = require('gulp-autoprefixer'),
    replace   = require('gulp-replace'),
    wp_pot    = require('gulp-wp-pot'),
    sort      = require('gulp-sort'),
    runSequence  = require('gulp-run-sequence'),
    cache     = require('gulp-cached'),
    del       = require('del'),
    sass      = require('gulp-sass'),
    uglify    = require('gulp-uglify');

var src = 'src';
var dist = 'dist/' + data.name;

// clean dist folder
gulp.task('clean', function() {
    return del([dist]);
});


/**
 * Copy to Dist
 */
gulp.task('copy_to_dist', function () {
    // copy files to the dist folder
    return gulp.src(src + '/**/*')
        .pipe(cache('copy_to_dist'))
        .pipe(gulp.dest(dist));
});


/**
 * Compile SCSS files
 */
gulp.task('sass', function () {
    return gulp.src([dist + '/**/*.scss', '!' + dist + '/assets/vendor/**/*'])
        .pipe(cache('sass'))
        .pipe(sass({
            outputStyle: 'compressed'
        }).on('error', sass.logError))
        .pipe(autoprefixer({
            browsers: ['last 3 version', '> 1%']
        }))
        .pipe(gulp.dest(dist));
});
gulp.task('sass-clean', function () {
    return del(dist + '/assets/**/*.scss');
});


/**
 * Compile JS files
 */
gulp.task('js', function () {
    return gulp.src([dist + '/assets/**/*.js', '!' + dist + '/assets/vendor/**/*'])
        .pipe(cache('js'))
        .pipe(uglify({
            output: {
                comments: /^!/
            }
        }))
        .pipe(gulp.dest(dist + '/assets'));
});


/**
 * Consistent Line Endings for non UNIX systems
 */
gulp.task('correct_lines_ending', function () {
    // copy files to the dist folder
    return gulp.src([dist + '/**/*.js', dist + '/**/*.css'])
        .pipe(cache('correct_lines_ending'))
        .pipe(lineec())
        .pipe(gulp.dest(dist));
});


/**
 * Update textdomain
 */
gulp.task('update_text_domain', function () {
    // copy files to the dist folder
    return gulp.src(dist + '/**/*.php')
        .pipe(cache('update_text_domain'))
        .pipe(replace(new RegExp('(?!\')' + data.text_domain_define + '(?!\')', 'g'), '\'' + data.text_domain + '\''))
        .pipe(gulp.dest(dist));
});


/**
 * Remove unused constant
 */
gulp.task('remove_unused_constant', function () {
    // copy files to the dist folder
    return gulp.src(dist + '/*.php')
        .pipe(replace("define( '" + data.text_domain_define + "', '" + data.text_domain + "' );\n", ''))
        .pipe(gulp.dest(dist));
});


/**
 * WP POT Translation File Generator.
 */
gulp.task('translate', function () {
    return gulp.src(dist + '/**/*.php')
        .pipe(sort())
        .pipe(wp_pot( {
            domain        : data.text_domain,
            destFile      : data.name + '.pot',
            package       : data.title,
            lastTranslator: data.author,
            team          : data.author
        }))
        .pipe(gulp.dest(dist + '/languages'));
});


/**
 * Main Build Task
 */
gulp.task('build', function(cb) {
    runSequence('clean', 'copy_to_dist', 'sass', 'sass-clean', 'js', 'correct_lines_ending', 'update_text_domain', 'remove_unused_constant', 'translate', cb);
});
gulp.task('watch_build', function(cb) {
    runSequence('copy_to_dist', 'sass', 'correct_lines_ending', 'update_text_domain', 'remove_unused_constant', 'translate', cb);
});


// watch for changes and run build task
gulp.task('watch', ['build'], function() {
    gulp.watch(src + '/**/*', ['watch_build']);
});

gulp.task('default', ['build']);