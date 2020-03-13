<?php
/**
 * Item meta template.
 *
 * @var $args
 * @var $opts
 * @package @@plugin_name
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

// phpcs:ignore
$show_meta = $opts['show_title'] && $args['title'] ||
    $opts['show_date'] ||
    $opts['show_excerpt'] && $args['excerpt'] ||
    $opts['show_categories'] && $args['categories'] && ! empty( $args['categories'] );

?>

<figcaption class="vp-portfolio__item-overlay vp-portfolio__item-align-<?php echo esc_attr( $opts['align'] ); ?>">
    <?php if ( $show_meta ) : ?>
        <div class="vp-portfolio__item-meta">
            <?php

            // Show Categories.
            if ( $opts['show_categories'] && $args['categories'] && ! empty( $args['categories'] ) ) {
                ?>
                <ul class="vp-portfolio__item-meta-categories">
                    <?php
                    // phpcs:ignore
                    $count = $opts['categories_count'];

                    // phpcs:ignore
                    foreach ( $args['categories'] as $category ) {
                        if ( ! $count ) {
                            break;
                        }
                        ?>
                        <li class="vp-portfolio__item-meta-category">
                            <a href="<?php echo esc_html( $category['url'] ); ?>">
                                <?php echo esc_html( $category['label'] ); ?>
                            </a>
                        </li>
                        <?php
                        $count--;
                    }
                    ?>
                </ul>
                <?php
            }

            // Show Date.
            if ( $opts['show_date'] ) {
                ?>
                <div class="vp-portfolio__item-meta-date">
                    <?php echo esc_html( $args['published'] ); ?>
                </div>
                <?php
            }

            // Show Title.
            if ( $opts['show_title'] && $args['title'] ) {
                ?>
                <h2 class="vp-portfolio__item-meta-title">
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
                            ?>
                        >
                            <?php echo esc_html( $args['title'] ); ?>
                        </a>
                        <?php
                    } else {
                        echo esc_html( $args['title'] );
                    }
                    ?>
                </h2>
                <?php
            }

            // Show Excerpt.
            if ( $opts['show_excerpt'] && $args['excerpt'] ) {
                ?>
                <div class="vp-portfolio__item-meta-excerpt">
                    <?php echo esc_html( $args['excerpt'] ); ?>
                </div>
                <?php
            }
            ?>
        </div>
    <?php endif; ?>
</figcaption>
