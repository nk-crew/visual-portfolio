<?php
/**
 * Item image template.
 *
 * @var $args
 * @var $opts
 * @package @@plugin_name
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

?>

<div class="vp-portfolio__item-img-wrap">
    <div class="vp-portfolio__item-img">
        <?php
        if ( $args['url'] ) {
            ?>
            <a href="<?php echo esc_url( $args['url'] ); ?>"
                <?php
                if ( isset( $args['url_target'] ) && $args['url_target'] ) :
                    ?>
                    target="<?php echo esc_attr( $args['url_target'] ); ?>"
                    <?php
                endif;
                if ( isset( $args['url_rel'] ) && $args['url_rel'] ) :
                    ?>
                    rel="<?php echo esc_attr( $args['url_rel'] ); ?>"
                    <?php
                endif;
                ?>
            >
                <?php echo wp_kses( $args['image'], $args['image_allowed_html'] ); ?>

                <div class="vp-portfolio__item-img-overlay"></div>
            </a>
            <?php
        } else {
            echo wp_kses( $args['image'], $args['image_allowed_html'] );
        }
        ?>
    </div>
</div>
