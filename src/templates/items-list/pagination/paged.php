<?php
/**
 * Default pagination template.
 *
 * @var $args
 * @package visual-portfolio
 */

?>

<ul class="<?php echo esc_attr( $args['class'] ); ?> vp-pagination__style-default" data-vp-pagination-type="<?php echo esc_attr( $args['type'] ); ?>">
    <?php
    foreach ( $args['items'] as $item ) {
        ?>
        <li class="<?php echo esc_attr( $item['class'] ); ?>">
            <?php if ( $item['url'] ) : ?>
                <a href="<?php echo esc_url( $item['url'] ); ?>"><?php echo esc_html( $item['label'] ); ?></a>
            <?php else : ?>
                <span><?php echo esc_html( $item['label'] ); ?></span>
            <?php endif; ?>
        </li>
        <?php
    }
    ?>
</ul>
