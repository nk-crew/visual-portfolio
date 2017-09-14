<?php
/**
 * Item image template.
 *
 * @var $args
 * @package visual-portfolio
 */

?>

<div class="vp-portfolio__item-img">
    <div class="vp-portfolio__item-img-wrap">
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
