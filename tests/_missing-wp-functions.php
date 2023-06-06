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
function add_option( $name, $value ) {
    return false;
}
function update_option( $name, $value ) {
    return false;
}
function wp_insert_post( $args ) {
    return false;
}
function is_wp_error( $arg ) {
    return $arg ? false : true;
}
function get_queried_object_id() {
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
function get_the_ID() {
    return null;
}
function get_post_meta( $post_id, $key, $single ) {
    return false;
}
function remove_query_arg( $key, $query = false ) {
    preg_match('/' . $key . '=(.+)/', $query, $matches);
    if ( isset( $matches ) && ! empty( $matches ) ) {
        $query    = str_replace( '?' . $matches[0], '', $query );
        $query    = str_replace( '&' . $matches[0], '', $query );
    }
    return $query;
}
function wp_parse_args( $args, $defaults = array() ) {
    if ( is_array( $args ) ) {
		$parsed_args =& $args;
	}

	if ( is_array( $defaults ) && $defaults ) {
		return array_merge( $defaults, $parsed_args );
	}
	return $parsed_args;
}
function untrailingslashit( $value ) {
	return rtrim( $value, '/\\' );
}

class WP_REST_Controller {}
