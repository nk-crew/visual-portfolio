<?php
/**
 * Item image template.
 *
 * @var $args
 * @var $opts
 * @package visual-portfolio
 */

?>

<div class="vp-portfolio__item-img-wrap">
    <div class="vp-portfolio__item-img">
        <?php
        if ( $args['url'] ) {
            ?>
            <a href="<?php echo esc_url( $args['url'] ); ?>">
                <?php echo $args['image']; ?>
            </a>
            <?php
        } else {
            echo $args['image'];
        }
        ?>
    </div>
</div>
