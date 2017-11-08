<?php
/**
 * Default pagination template.
 *
 * @var $args
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

?>

<ul class="<?php echo esc_attr( $args['class'] ); ?> vp-pagination__style-default" data-vp-pagination-type="<?php echo esc_attr( $args['type'] ); ?>">
    <?php
    foreach ( $args['items'] as $item ) {
        ?>
        <li class="<?php echo esc_attr( $item['class'] ); ?>">
            <?php if ( $item['url'] ) : ?>
                <a href="<?php echo esc_url( $item['url'] ); ?>">
                    <?php if ( $item['is_prev_arrow'] ) : ?>
                        <span class="fa fa-angle-left"></span>
                    <?php elseif ( $item['is_next_arrow'] ) : ?>
                        <span class="fa fa-angle-right"></span>
                    <?php else : ?>
                        <?php echo esc_html( $item['label'] ); ?>
                    <?php endif; ?>
                </a>
            <?php else : ?>
                <span><?php echo esc_html( $item['label'] ); ?></span>
            <?php endif; ?>
        </li>
        <?php
    }
    ?>
</ul>
