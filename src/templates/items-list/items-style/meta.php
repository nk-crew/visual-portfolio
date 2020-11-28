<?php
/**
 * Item meta template.
 *
 * @var $args
 * @var $opts
 *
 * @package @@plugin_name
 */

// phpcs:disable WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedVariableFound

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

$inline_meta = $opts['show_author'] && $args['author'] ||
    $opts['show_date'] ||
    $opts['show_comments_count'] && '' !== $args['comments_count'] ||
    $opts['show_views_count'] && $args['views_count'] ||
    $opts['show_reading_time'] && $args['reading_time'];

$show_meta = $inline_meta ||
    $opts['show_title'] && $args['title'] ||
    $opts['show_excerpt'] && $args['excerpt'] ||
    $opts['show_categories'] && $args['categories'] && ! empty( $args['categories'] );

$templates_data = array(
    'args'        => $args,
    'opts'        => $opts,
    'allow_links' => true,
);

?>

<figcaption class="vp-portfolio__item-overlay vp-portfolio__item-align-<?php echo esc_attr( $opts['align'] ); ?>">
    <?php if ( $show_meta ) : ?>
        <div class="vp-portfolio__item-meta">
            <?php
            // Categories.
            visual_portfolio()->include_template( 'items-list/item-parts/meta-categories', $templates_data );

            // Title.
            visual_portfolio()->include_template( 'items-list/item-parts/title', $templates_data );

            // Inline Meta.
            visual_portfolio()->include_template( 'items-list/item-parts/inline-meta', $templates_data );

            // Excerpt.
            visual_portfolio()->include_template( 'items-list/item-parts/excerpt', $templates_data );

            // Read More.
            visual_portfolio()->include_template( 'items-list/item-parts/read-more', $templates_data );
            ?>
        </div>
    <?php endif; ?>
</figcaption>
