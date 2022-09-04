<?php
/**
 * Define some missing WP functions.
 *
 * @package Visual Portfolio
 */

function plugin_basename( $file ) {
    return 'visual-portfolio/class-visual-portfolio.php';
}
function is_admin() {
    return false;
}
function plugin_dir_path( $file ) {
    return TEST_PLUGIN_DIST_DIR;
}
function plugin_dir_url( $file ) {
    return TEST_PLUGIN_DIST_DIR;
}
function get_option( $name, $default = '' ) {
    return '';
}
function get_template() {
    return 'sample_template_name';
}
function wp_allowed_protocols() {
    return array( 'http', 'https', 'ftp', 'ftps', 'mailto', 'news', 'irc', 'irc6', 'ircs', 'gopher', 'nntp', 'feed', 'telnet', 'mms', 'rtsp', 'sms', 'svn', 'tel', 'fax', 'xmpp', 'webcal', 'urn' );
}
function register_activation_hook( $file, $cb ) {
    // Nothing to do there.
}
function register_deactivation_hook( $file, $cb ) {
    // Nothing to do there.
}
function load_plugin_textdomain( $name, $second, $path ) {
    // Nothing to do there.
}
function add_shortcode( $name, $cb ) {
    // Nothing to do there.
}

class WP_REST_Controller {}
