<?php
/**
 * The bootstrap file for PHPUnit tests for the Safe SVG plugin.
 * Starts up WP_Mock and requires the files needed for testing.
 *
 * @package Visual Portfolio
 */

define( 'TEST_PLUGIN_DIR', dirname( __DIR__ ) . '/' );
define( 'TEST_PLUGIN_DIST_DIR', TEST_PLUGIN_DIR . 'dist/visual-portfolio/');

// First we need to load the composer autoloader so we can use WP Mock.
require_once TEST_PLUGIN_DIR . '/vendor/autoload.php';

// Register undefined functions.
require_once dirname( __FILE__ ) . '/_missing-wp-functions.php';

// Now call the bootstrap method of WP Mock.
WP_Mock::bootstrap();

require TEST_PLUGIN_DIST_DIR . 'class-visual-portfolio.php';
