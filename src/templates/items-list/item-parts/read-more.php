<?php
/**
 * Item read more template.
 *
 * @var $args
 * @var $opts
 *
 * @package visual-portfolio
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

if ( ! $opts['show_read_more'] || ! $opts['read_more_label'] ) {
    return;
}

?>

<a class="vp-portfolio__item-meta-read-more" href="<?php echo esc_url( $opts['read_more_url'] ); ?>">
    <?php echo esc_html( $opts['read_more_label'] ); ?>
</a>
