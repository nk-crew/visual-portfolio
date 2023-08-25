<?php
/**
 * Preview template.
 *
 * @var $args
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
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
            <div id="vp_preview" class="<?php echo esc_attr( $args['class_name'] ); ?>">
                <?php
                    // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
                    echo Visual_Portfolio_Get::get( $args['options'] );
                ?>
            </div>
        </div>

        <?php do_action( 'vpf_after_preview_output' ); ?>

        <?php wp_footer(); ?>
    </body>
</html>
