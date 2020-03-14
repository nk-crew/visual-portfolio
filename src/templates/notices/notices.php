<?php
/**
 * Notices template.
 *
 * @var $args
 * @package @@plugin_name
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

?>

<div class="vp-notice">
    <?php echo esc_html( $args['notice'] ); ?>
</div>
