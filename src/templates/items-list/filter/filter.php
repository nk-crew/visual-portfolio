<?php
/**
 * Default filter template.
 *
 * @var $args
 * @package visual-portfolio
 */

?>

<ul class="<?php echo esc_attr( $args['class'] ); ?> vp-filter__style-default">
    <?php
    foreach ( $args['items'] as $item ) {
        ?>
        <li class="<?php echo esc_attr( $item['class'] ); ?>">
            <a href="<?php echo esc_url( $item['url'] ); ?>" data-vp-filter="<?php echo esc_attr( $item['filter'] ); ?>"><?php echo esc_html( $item['label'] ); ?></a>
        </li>
        <?php
    }
    ?>
</ul>
