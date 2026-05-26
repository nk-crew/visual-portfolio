<?php
/**
 * Plugin uninstall cleanup.
 *
 * @package visual-portfolio
 */

if ( ! defined( 'WP_UNINSTALL_PLUGIN' ) ) {
	exit;
}

require_once __DIR__ . '/classes/class-custom-post-type.php';

Visual_Portfolio_Custom_Post_Type::remove_roles_and_caps();
