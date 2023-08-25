<?php
/**
 * Item meta date template.
 *
 * @var $args
 * @var $opts
 *
 * @package visual-portfolio
 */

// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

if ( ! $opts['show_date'] ) {
    return;
}

?>

<div class="vp-portfolio__item-meta-part vp-portfolio__item-meta-date">
    <span class="vp-portfolio__item-meta-part-icon">
        <span class="vp-screen-reader-text">
            <?php echo esc_html__( 'Date', 'visual-portfolio' ); ?>
        </span>
        <?php visual_portfolio()->include_template( 'icons/calendar' ); ?>
    </span>
    <span class="vp-portfolio__item-meta-part-text">
        <?php echo esc_html( $args['published'] ); ?>
    </span>
</div>
