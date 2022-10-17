<?php
/**
 * Preview pagination template.
 *
 * @var $args
 * @package @@plugin_name
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
                <div class="vp-portfolio vp-portfolio__ready">
                    <div class="vp-portfolio__layout-elements vp-portfolio__layout-elements-bottom vp-portfolio__layout-elements-align-<?php echo esc_attr( $args['options']['align'] ); ?>">
                        <?php
                            // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped
                            Visual_Portfolio_Get::pagination( $args['options'] );
                        ?>
                    </div>
                </div>
            </div>
        </div>

        <?php do_action( 'vpf_after_preview_output' ); ?>

        <?php wp_footer(); ?>
    </body>
</html>
