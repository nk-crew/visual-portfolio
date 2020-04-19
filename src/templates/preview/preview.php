<?php
/**
 * Preview template.
 *
 * @var $args
 * @package @@plugin_name
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// phpcs:ignore
$class_name = 'vp-preview-wrapper';

// preview type.
// phpcs:ignore
$type = isset( $_GET['vp_preview_type'] ) ? esc_attr( wp_unslash( $_GET['vp_preview_type'] ) ) : false;

if ( $type ) {
    // phpcs:ignore
    $class_name .= ' vp-preview-type-' . $type;
}

?><!DOCTYPE html>
<html <?php language_attributes(); ?> style="margin-top: 0 !important;">
    <head>
        <meta name="viewport" content="width=device-width">

        <?php wp_head(); ?>
    </head>

    <body <?php body_class( 'vp-preview-body' ); ?>>
        <?php do_action( 'vpf_before_preview_output' ); ?>

        <div class="entry-content">
            <div id="vp_preview" class="<?php echo esc_attr( $class_name ); ?>">
                <?php
                    // phpcs:ignore
                    echo Visual_Portfolio_Get::get( array( 'id' => $args['id'] ) );
                ?>
            </div>
        </div>

        <?php do_action( 'vpf_after_preview_output' ); ?>

        <?php wp_footer(); ?>
    </body>
</html>
