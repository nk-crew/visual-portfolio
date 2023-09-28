<?php
/**
 * Errors template.
 *
 * @var $args
 * @package @@plugin_name
 */

if ( ! defined( 'ABSPATH' ) ) {
	exit;
}

?>

<div class="vp-error">
	<?php echo esc_html( $args['error'] ); ?>
</div>
