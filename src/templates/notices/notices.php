<?php
/**
 * Notices template.
 *
 * @var $args
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

?>

<div class="vp-notice">
    <?php echo esc_html( $args['notice'] ); ?>
</div>
