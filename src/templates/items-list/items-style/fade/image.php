<?php
/**
 * Item image template.
 *
 * @var $args
 * @var $opts
 * @package visual-portfolio
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
            <a href="<?php echo esc_url( $args['url'] ); ?>">
                <?php echo wp_kses_post( $args['image'] ); ?>
            </a>
            <?php
        } else {
            echo wp_kses_post( $args['image'] );
        }
        ?>
    </div>
</div>
