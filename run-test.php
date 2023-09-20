<?php
/**
 * This file is required to run tests on a virtual docker machine, since files from the vendor folder are required to run.
 * Since only src files are copied to the dist folder when building the project, the vendor remains in its place, and the tests do not run.
 * Plugin Name:  Visual Portfolio, Posts & Image Gallery
 * Description:  Modern gallery and portfolio plugin with advanced layouts editor. Clean and powerful gallery styles with enormous settings in the Gutenberg block.
 * Version:      3.1.3
 * Author:       Visual Portfolio Team
 * Author URI:   https://visualportfolio.co/?utm_source=wordpress.org&utm_medium=readme&utm_campaign=byline
 * License:      GPLv2 or later
 * License URI:  https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain:  visual-portfolio
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

if ( ! class_exists( 'Visual_Portfolio' ) ) :
    require_once dirname( __FILE__ ) . '/class-visual-portfolio.php';
endif;
